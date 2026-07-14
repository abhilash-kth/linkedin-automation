import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { humanClick } from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

/**
 * Extract complete contact info by clicking "Contact info" link
 * Based on actual LinkedIn HTML structure
 */
export async function extractContactInfo(page, profileUrl) {
  console.log(`   📇 Extracting contact info...`);

  const result = {
    location: null,
    email: null,
    phone: null,
    website: null,
    twitter: null,
    birthday: null,
    linkedIn: profileUrl,
  };

  try {
    // STEP 1: Navigate to profile (if not already there)
    const currentUrl = page.url();
    if (!currentUrl.includes("/in/") || !currentUrl.includes(profileUrl.match(/\/in\/([^\/\?]+)/)?.[1] || "xxxxx")) {
      console.log(`   🌐 Loading profile page...`);
      const navOk = await safeGoto(page, profileUrl);
      if (!navOk) return result;
      await randomDelay(3000, 5000);
      await behaveLikeHuman(page);
    }

    // STEP 2: Extract location from main profile
    const profileInfo = await page.evaluate(() => {
      const data = { location: null };
      const locationSelectors = [
        ".text-body-small.inline.t-black--light.break-words",
        ".pv-text-details__left-panel .text-body-small",
        ".ph5.pb5 .text-body-small",
        "span.text-body-small:not([class*='visually-hidden'])",
      ];
      for (const sel of locationSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const text = (el.textContent || "").trim();
          if (
            text.length > 3 &&
            text.length < 100 &&
            !text.includes("http") &&
            !text.includes("followers") &&
            !text.includes("connections") &&
            !text.includes("mutual")
          ) {
            if (text.includes(",") || /^[A-Za-z\s,]+$/.test(text)) {
              data.location = text;
              return data;
            }
          }
        }
        if (data.location) break;
      }
      return data;
    });

    Object.assign(result, profileInfo);
    if (result.location) console.log(`   📍 Location: ${result.location}`);

    // STEP 3: Find "Contact info" link
    console.log(`   🔎 Looking for "Contact info" link...`);
    const contactBtnCoords = await page.evaluate(() => {
      // Direct selector matching user's HTML
      const links = document.querySelectorAll(
        'a[href*="/overlay/contact-info/"], a[href*="contact-info"]',
      );
      for (const link of links) {
        const text = (link.textContent || "").trim().toLowerCase();
        if (text === "contact info" || text.includes("contact info")) {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            link.setAttribute("data-contact-link", "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              rawY: Math.floor(rect.y),
            };
          }
        }
      }
      return null;
    });

    if (!contactBtnCoords) {
      console.log(`   ⚠️  Contact info link not found (might not be visible)`);
      return result;
    }

    // Scroll into view
    await page.evaluate(() => {
      const el = document.querySelector('[data-contact-link="true"]');
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await randomDelay(1500, 2500);

    // Get fresh coords
    const freshCoords = await page.evaluate(() => {
      const el = document.querySelector('[data-contact-link="true"]');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    const finalCoords = freshCoords || contactBtnCoords;

    console.log(`   🖱️  Clicking "Contact info" at (${finalCoords.x}, ${finalCoords.y})...`);
    await humanClick(page, finalCoords.x, finalCoords.y);
    await randomDelay(3000, 5000);

    // STEP 4: Wait for dialog
    console.log(`   ⏳ Waiting for contact info dialog...`);
    let modalReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      const has = await page.evaluate(() => {
        // Based on user's HTML: data-testid="dialog-content"
        const dialog = document.querySelector(
          '[data-testid="dialog-content"], [componentkey*="ContactInfoDetailSection"], [role="dialog"]',
        );
        return !!dialog;
      });
      if (has) { modalReady = true; break; }
    }

    if (!modalReady) {
      console.log(`   ⚠️  Dialog didn't open`);
      // Cleanup
      await page.evaluate(() => {
        const el = document.querySelector('[data-contact-link="true"]');
        if (el) el.removeAttribute("data-contact-link");
      });
      return result;
    }

    console.log(`   ✅ Dialog opened, extracting info...`);
    await randomDelay(1500, 2500);

    // STEP 5: Extract fields from dialog
    // Based on your HTML: each field has structure:
    //   <div componentkey="...">
    //     <svg id="envelope-medium" or "linkedin-bug-medium" or "phone-medium" etc>
    //     <div>
    //       <p>Email/Phone/Website/etc</p>
    //       <p><a href="...">value</a></p>
    //     </div>
    //   </div>
    const info = await page.evaluate(() => {
      const data = {
        email: null,
        phone: null,
        website: null,
        twitter: null,
        birthday: null,
      };

      // Find dialog
      const dialog =
        document.querySelector('[data-testid="dialog-content"]') ||
        document.querySelector('[componentkey*="ContactInfoDetailSection"]') ||
        document.querySelector('[role="dialog"]');

      if (!dialog) return data;

      // ── Email (search all mailto: links) ──
      const emailLinks = dialog.querySelectorAll('a[href^="mailto:"]');
      for (const el of emailLinks) {
        const href = el.getAttribute("href") || "";
        if (href) {
          data.email = href.replace("mailto:", "").trim();
          break;
        }
      }

      // ── Fallback: search text nodes for email pattern ──
      if (!data.email) {
        const allText = dialog.innerText || "";
        const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) data.email = emailMatch[0];
      }

      // ── Iterate all sections (identified by componentkey) ──
      const sections = dialog.querySelectorAll('[componentkey]');
      sections.forEach((section) => {
        // Get label text (first <p>)
        const paragraphs = section.querySelectorAll("p");
        if (paragraphs.length === 0) return;

        const labelText = (paragraphs[0].textContent || "").toLowerCase().trim();

        // ── Phone ──
        if (labelText === "phone" || labelText.includes("phone")) {
          if (!data.phone) {
            // Look in subsequent paragraphs / spans for the number
            for (let i = 1; i < paragraphs.length; i++) {
              const text = (paragraphs[i].textContent || "").trim();
              const cleaned = text.replace(/[\s\-\(\)]/g, "");
              if (/^\+?\d{8,15}$/.test(cleaned)) {
                data.phone = text;
                break;
              }
            }
            // Also check spans
            if (!data.phone) {
              const spans = section.querySelectorAll("span");
              for (const span of spans) {
                const text = (span.textContent || "").trim();
                const cleaned = text.replace(/[\s\-\(\)]/g, "");
                if (/^\+?\d{8,15}$/.test(cleaned)) {
                  data.phone = text;
                  break;
                }
              }
            }
          }
        }

        // ── Website ──
        if (labelText === "website" || labelText.includes("website")) {
          if (!data.website) {
            const websites = [];
            const links = section.querySelectorAll('a[href]');
            for (const el of links) {
              const href = el.getAttribute("href") || "";
              const text = (el.textContent || "").trim();

              // Handle LinkedIn safety redirect
              if (href.includes("/safety/go/")) {
                const urlMatch = href.match(/url=([^&]+)/);
                if (urlMatch) {
                  let originalUrl = decodeURIComponent(urlMatch[1]);
                  originalUrl = originalUrl
                    .replace(/%2E/gi, ".")
                    .replace(/%3A/gi, ":")
                    .replace(/%2F/gi, "/");
                  if (!originalUrl.startsWith("http")) {
                    originalUrl = "http://" + originalUrl;
                  }
                  websites.push(originalUrl);
                }
              } else if (
                href.startsWith("http") &&
                !href.includes("linkedin.com") &&
                !href.includes("mailto:")
              ) {
                websites.push(href);
              } else if (text.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
                let url = text.split(" ")[0];
                if (!url.startsWith("http")) url = "http://" + url;
                if (!url.includes("linkedin.com")) websites.push(url);
              }
            }
            if (websites.length > 0) {
              data.website = websites.slice(0, 3).join(" | ");
            }
          }
        }

        // ── Birthday ──
        if (labelText === "birthday" || labelText.includes("birthday")) {
          if (!data.birthday) {
            for (let i = 1; i < paragraphs.length; i++) {
              const text = (paragraphs[i].textContent || "").trim();
              if (text && text.length > 3 && text.length < 50) {
                data.birthday = text;
                break;
              }
            }
          }
        }
      });

      // ── Twitter (global search in dialog) ──
      const twitterLinks = dialog.querySelectorAll(
        'a[href*="twitter.com"], a[href*="x.com"]',
      );
      for (const el of twitterLinks) {
        data.twitter = el.getAttribute("href");
        break;
      }

      return data;
    });

    Object.assign(result, info);

    // STEP 6: Close dialog with Escape
    console.log(`   🖱️  Closing dialog...`);
    await page.keyboard.press("Escape");
    await randomDelay(2000, 3000);

    // Cleanup marker
    await page.evaluate(() => {
      const el = document.querySelector('[data-contact-link="true"]');
      if (el) el.removeAttribute("data-contact-link");
    });

    console.log(`   📧 Email: ${result.email || "N/A"}`);
    console.log(`   📱 Phone: ${result.phone || "N/A"}`);
    console.log(`   🌐 Website: ${result.website || "N/A"}`);
    if (result.twitter) console.log(`   🐦 Twitter: ${result.twitter}`);
    if (result.birthday) console.log(`   🎂 Birthday: ${result.birthday}`);
  } catch (err) {
    console.log(`   ⚠️  Extraction failed: ${err.message}`);
  }

  return result;
}