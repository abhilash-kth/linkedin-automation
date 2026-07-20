import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { humanClick } from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";
import SELECTORS from "../../config/selectors.js";

export async function extractContactInfo(page, profileUrl) {
  console.log(`   📇 Extracting contact info + headline...`);

  const result = {
    location: null,
    headline: null,
    email: null,
    phone: null,
    website: null,
    twitter: null,
    birthday: null,
    linkedIn: profileUrl,
  };

  try {
    // ═══ STEP 1: Navigate to profile if not there ═══
    const currentUrl = page.url();
    const targetVanity = profileUrl.match(/\/in\/([^\/\?]+)/)?.[1] || "xxxxx";
    if (!currentUrl.includes("/in/") || !currentUrl.includes(targetVanity)) {
      console.log(`   🌐 Loading profile page...`);
      const navOk = await safeGoto(page, profileUrl);
      if (!navOk) return result;
      await randomDelay(3000, 5000);
      await behaveLikeHuman(page);
    }

    // ═══ STEP 2: Extract location + headline from profile ═══
    const profileInfo = await page.evaluate(
      ({ locationSels, headlineSels }) => {
        const data = { location: null, headline: null };

        // ── Headline ──
        for (const sel of headlineSels) {
          const el = document.querySelector(sel);
          if (el) {
            const text = (el.textContent || "").trim();
            if (text.length > 5 && text.length < 500) {
              // Skip if it looks like location or generic text
              if (
                !text.toLowerCase().includes("contact info") &&
                !text.toLowerCase().includes("connections") &&
                !text.toLowerCase().includes("followers")
              ) {
                data.headline = text;
                break;
              }
            }
          }
        }

        // ── Location ──
        for (const sel of locationSels) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = (el.textContent || "").trim();
            if (
              text.length > 3 &&
              text.length < 100 &&
              !text.includes("http") &&
              !text.includes("followers") &&
              !text.includes("connections") &&
              !text.includes("mutual") &&
              !text.toLowerCase().includes("contact info")
            ) {
              if (text.includes(",") || /^[A-Za-z\s,]+$/.test(text)) {
                data.location = text;
                break;
              }
            }
          }
          if (data.location) break;
        }

        return data;
      },
      {
        locationSels: SELECTORS.profile.location,
        headlineSels: SELECTORS.profile.headline,
      },
    );

    Object.assign(result, profileInfo);
    if (result.headline)
      console.log(`   💼 Headline: ${result.headline.substring(0, 80)}`);
    if (result.location) console.log(`   📍 Location: ${result.location}`);

    // ═══ STEP 3: Find "Contact info" link ═══
    console.log(`   🔎 Looking for "Contact info" link...`);
    const contactBtnCoords = await findContactInfoLink(page);

    if (!contactBtnCoords) {
      console.log(`   ⚠️  Contact info link not found (might not be visible)`);
      return result;
    }

    await page.evaluate(() => {
      const el = document.querySelector('[data-contact-link="true"]');
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await randomDelay(1500, 2500);

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

    console.log(
      `   🖱️  Clicking "Contact info" at (${finalCoords.x}, ${finalCoords.y})...`,
    );
    await humanClick(page, finalCoords.x, finalCoords.y);
    await randomDelay(3000, 5000);

    // ═══ STEP 4: Wait for dialog ═══
    console.log(`   ⏳ Waiting for contact info dialog...`);
    const modalSelectorJoined = SELECTORS.contactInfo.modalContainer.join(", ");
    let modalReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      const has = await page.evaluate((selector) => {
        const dialog = document.querySelector(selector);
        if (!dialog) return false;
        const rect = dialog.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, modalSelectorJoined);
      if (has) {
        modalReady = true;
        break;
      }
    }

    if (!modalReady) {
      console.log(`   ⚠️  Dialog didn't open`);
      await page.evaluate(() => {
        const el = document.querySelector('[data-contact-link="true"]');
        if (el) el.removeAttribute("data-contact-link");
      });
      return result;
    }

    console.log(`   ✅ Dialog opened, extracting info...`);
    await randomDelay(1500, 2500);

    // ═══ STEP 5: Extract fields ═══
    const info = await page.evaluate(
      ({ modalSels, sectionSel, labels, phonePattern, safetyPattern }) => {
        const data = {
          email: null,
          phone: null,
          website: null,
          twitter: null,
          birthday: null,
        };

        let dialog = null;
        for (const sel of modalSels) {
          dialog = document.querySelector(sel);
          if (dialog) break;
        }
        if (!dialog) return data;

        // Email
        const emailLinks = dialog.querySelectorAll('a[href^="mailto:"]');
        for (const el of emailLinks) {
          const href = el.getAttribute("href") || "";
          if (href) {
            data.email = href.replace("mailto:", "").trim();
            break;
          }
        }
        if (!data.email) {
          const allText = dialog.innerText || "";
          const emailMatch = allText.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
          );
          if (emailMatch) data.email = emailMatch[0];
        }

        const phoneRegex = new RegExp(phonePattern);
        const sections = dialog.querySelectorAll(sectionSel);

        sections.forEach((section) => {
          const paragraphs = section.querySelectorAll("p");
          if (paragraphs.length === 0) return;

          const labelText = (paragraphs[0].textContent || "")
            .toLowerCase()
            .trim();

          if (labelText === labels.phone || labelText.includes(labels.phone)) {
            if (!data.phone) {
              for (let i = 1; i < paragraphs.length; i++) {
                const text = (paragraphs[i].textContent || "").trim();
                const cleaned = text.replace(/[\s\-\(\)]/g, "");
                if (phoneRegex.test(cleaned)) {
                  data.phone = text;
                  break;
                }
              }
              if (!data.phone) {
                const spans = section.querySelectorAll("span");
                for (const span of spans) {
                  const text = (span.textContent || "").trim();
                  const cleaned = text.replace(/[\s\-\(\)]/g, "");
                  if (phoneRegex.test(cleaned)) {
                    data.phone = text;
                    break;
                  }
                }
              }
            }
          }

          if (
            labelText === labels.website ||
            labelText.includes(labels.website)
          ) {
            if (!data.website) {
              const websites = [];
              const links = section.querySelectorAll("a[href]");
              for (const el of links) {
                const href = el.getAttribute("href") || "";
                const text = (el.textContent || "").trim();

                if (href.includes("/safety/go/")) {
                  const safetyRegex = new RegExp(safetyPattern);
                  const urlMatch = href.match(safetyRegex);
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

          if (
            labelText === labels.birthday ||
            labelText.includes(labels.birthday)
          ) {
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

        const twitterLinks = dialog.querySelectorAll(
          'a[href*="twitter.com"], a[href*="x.com"]',
        );
        for (const el of twitterLinks) {
          data.twitter = el.getAttribute("href");
          break;
        }

        return data;
      },
      {
        modalSels: SELECTORS.contactInfo.modalContainer,
        sectionSel: SELECTORS.contactInfo.sectionContainer,
        labels: SELECTORS.contactInfo.labels,
        phonePattern: SELECTORS.contactInfo.phonePattern.source,
        safetyPattern: SELECTORS.contactInfo.safetyRedirectPattern.source,
      },
    );

    Object.assign(result, info);

    // ═══ STEP 6: Close dialog ═══
    console.log(`   🖱️  Closing dialog...`);
    const closed = await page.evaluate((closeSels) => {
      const selector = closeSels.join(", ");
      const dialogs = document.querySelectorAll(
        '[data-testid="dialog-content"], [role="dialog"]',
      );
      for (const dialog of dialogs) {
        const closeBtn = dialog.querySelector(selector);
        if (closeBtn) {
          const rect = closeBtn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            closeBtn.click();
            return true;
          }
        }
      }
      return false;
    }, SELECTORS.contactInfo.closeModal);

    if (!closed) {
      await page.keyboard.press("Escape");
    }
    await randomDelay(2000, 3000);

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

// ═══════════════════════════════════════════════════════════════════
// HELPER: Find Contact info link
// ═══════════════════════════════════════════════════════════════════
async function findContactInfoLink(page) {
  return await page.evaluate(
    ({ triggerLinks, triggerText, tagName }) => {
      // Strategy 1: href-based selectors
      for (const sel of triggerLinks) {
        const links = document.querySelectorAll(sel);
        for (const link of links) {
          const text = (link.textContent || "").trim().toLowerCase();
          if (text === triggerText || text.includes(triggerText)) {
            const rect = link.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              link.setAttribute(tagName, "true");
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
      }

      // Strategy 2: text-based fallback
      const allLinks = document.querySelectorAll("a, button, span");
      for (const link of allLinks) {
        const text = (link.textContent || "").trim().toLowerCase();
        if (text !== triggerText) continue;

        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (link.closest("nav, header, footer, .global-nav")) continue;
        if (rect.x > 900) continue;

        let clickTarget = link;
        if (link.tagName !== "A") {
          const parentAnchor = link.closest("a");
          if (parentAnchor) clickTarget = parentAnchor;
        }

        const finalRect = clickTarget.getBoundingClientRect();
        if (finalRect.width === 0 || finalRect.height === 0) continue;

        clickTarget.setAttribute(tagName, "true");
        return {
          x: Math.floor(finalRect.x + finalRect.width / 2),
          y: Math.floor(finalRect.y + finalRect.height / 2),
        };
      }

      return null;
    },
    {
      triggerLinks: SELECTORS.contactInfo.triggerLink,
      triggerText: SELECTORS.contactInfo.triggerLinkText,
      tagName: SELECTORS.contactInfo.triggerLinkTag,
    },
  );
}