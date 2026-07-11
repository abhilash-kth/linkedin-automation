import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { humanClick } from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

/**
 * Extract complete profile info + click Contact info button to open modal
 */
export async function extractContactInfo(page, profileUrl) {
  console.log(`   📇 Extracting profile & contact info...`);

  const result = {
    location: null,
    about: null,
    company: null,
    email: null,
    phone: null,
    website: null,
    twitter: null,
    birthday: null,
    linkedIn: profileUrl,
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Visit main profile page
    // ═══════════════════════════════════════════════════════════
    console.log(`   🌐 Loading profile page...`);
    const navOk = await safeGoto(page, profileUrl);
    if (!navOk) return result;

    await randomDelay(3000, 5000);
    await behaveLikeHuman(page);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Extract location, about, company
    // ═══════════════════════════════════════════════════════════
    const profileInfo = await page.evaluate(() => {
      const data = { location: null, about: null, company: null };

      // Location
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

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Find and click "Contact info" link
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔎 Looking for "Contact info" button...`);

    const contactBtnCoords = await page.evaluate(() => {
      // Find contact info link/button
      const links = document.querySelectorAll('a[href*="/overlay/contact-info/"], a[href*="contact-info"]');
      for (const link of links) {
        const text = (link.textContent || "").trim().toLowerCase();
        if (text.includes("contact info") || text === "contact info") {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }

      // Fallback: look for any element with "Contact info" text
      const allLinks = document.querySelectorAll('a, button');
      for (const el of allLinks) {
        const text = (el.textContent || "").trim().toLowerCase();
        if (text === "contact info") {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return null;
    });

    if (!contactBtnCoords) {
      console.log(`   ⚠️  Contact info button not found (may not be a 1st connection)`);
      return result;
    }

    console.log(`   🖱️  Clicking "Contact info" button at (${contactBtnCoords.x}, ${contactBtnCoords.y})...`);

    // Scroll button into view first
    await page.evaluate((coords) => {
      const el = document.elementFromPoint(coords.x, coords.y);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, contactBtnCoords);
    await randomDelay(1500, 2500);

    // Click the button (human-like)
    await humanClick(page, contactBtnCoords.x, contactBtnCoords.y);
    await randomDelay(3000, 5000);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Wait for modal/dialog to open
    // ═══════════════════════════════════════════════════════════
    console.log(`   ⏳ Waiting for contact info dialog...`);

    let modalReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);

      const has = await page.evaluate(() => {
        // Check for contact info container
        const container = document.querySelector('[componentkey*="ContactInfoDetailSection"], [role="dialog"]');
        return !!container;
      });

      if (has) {
        modalReady = true;
        break;
      }
    }

    if (!modalReady) {
      console.log(`   ⚠️  Contact info dialog didn't open`);
      return result;
    }

    console.log(`   ✅ Dialog opened, extracting info...`);
    await randomDelay(1500, 2500);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Extract contact fields from modal
    // ═══════════════════════════════════════════════════════════
    const info = await page.evaluate(() => {
      const data = { email: null, phone: null, website: null, twitter: null, birthday: null };

      // Find contact info container
      const container =
        document.querySelector('[componentkey*="ContactInfoDetailSection"]') ||
        document.querySelector('[role="dialog"]') ||
        document.body;

      // ── Email ──
      const emailLinks = container.querySelectorAll('a[href^="mailto:"]');
      for (const el of emailLinks) {
        const href = el.getAttribute("href") || "";
        if (href) {
          data.email = href.replace("mailto:", "").trim();
          break;
        }
      }

      // ── Iterate sections by label ──
      const sections = container.querySelectorAll('[componentkey]');
      sections.forEach((section) => {
        const label = section.querySelector('p.e6590096, h3, h4');
        if (!label) return;

        const labelText = (label.textContent || "").toLowerCase().trim();

        // ── Website section ──
        if (labelText === "website" && !data.website) {
          const websites = [];
          const links = section.querySelectorAll('a[href*="/safety/go/"], a[href^="http"]:not([href*="linkedin.com"])');
          for (const el of links) {
            const href = el.getAttribute("href") || "";
            const text = (el.textContent || "").trim();

            if (href.includes("/safety/go/")) {
              const urlMatch = href.match(/url=([^&]+)/);
              if (urlMatch) {
                let originalUrl = decodeURIComponent(urlMatch[1]);
                originalUrl = originalUrl.replace(/%2E/gi, ".").replace(/%3A/gi, ":").replace(/%2F/gi, "/");
                if (!originalUrl.startsWith("http")) {
                  originalUrl = "http://" + originalUrl;
                }
                websites.push(originalUrl);
              }
            } else if (text.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
              let url = text.split(" ")[0];
              if (!url.startsWith("http")) url = "http://" + url;
              websites.push(url);
            }
          }
          if (websites.length > 0) {
            data.website = websites.slice(0, 3).join(" | ");
          }
        }

        // ── Phone section ──
        if (labelText === "phone" && !data.phone) {
          const values = section.querySelectorAll('p, span, a');
          for (const v of values) {
            const t = (v.textContent || "").trim();
            if (t !== "Phone" && t.length >= 8) {
              const cleaned = t.replace(/[\s\-\(\)]/g, "");
              if (/^\+?\d{10,15}$/.test(cleaned)) {
                data.phone = t;
                break;
              }
            }
          }
        }

        // ── Birthday ──
        if (labelText === "birthday" && !data.birthday) {
          const values = section.querySelectorAll('p');
          for (const v of values) {
            const t = (v.textContent || "").trim();
            if (t !== "Birthday" && t.length > 3 && t.length < 50) {
              data.birthday = t;
              break;
            }
          }
        }
      });

      // ── Twitter (search across whole container) ──
      const twitterLinks = container.querySelectorAll('a[href*="twitter.com"], a[href*="x.com"]');
      for (const el of twitterLinks) {
        data.twitter = el.getAttribute("href");
        break;
      }

      return data;
    });

    Object.assign(result, info);

    // Close modal
    console.log(`   🖱️  Closing dialog...`);
    await page.keyboard.press("Escape");
    await randomDelay(2000, 3000);

    console.log(`   📧 Email: ${result.email || "N/A"}`);
    console.log(`   📱 Phone: ${result.phone || "N/A"}`);
    console.log(`   🌐 Website: ${result.website || "N/A"}`);
    if (result.birthday) console.log(`   🎂 Birthday: ${result.birthday}`);
  } catch (err) {
    console.log(`   ⚠️  Extraction failed: ${err.message}`);
  }

  return result;
}