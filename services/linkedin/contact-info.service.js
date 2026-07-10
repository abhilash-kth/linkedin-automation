import { randomDelay } from "../../helpers/delay.helper.js";
import { humanClick } from "../../helpers/human-click.helper.js";
import { extractEmails, extractPhones } from "../../helpers/text-parser.helper.js";

export async function extractContactInfo(page) {
  console.log(`   📇 Extracting contact info...`);

  // Find and click "Contact info" link
  const contactLink = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="contact-info"]');
    for (const link of links) {
      const rect = link.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      }
    }
    return null;
  });

  if (!contactLink) {
    console.log(`   ⚠️  Contact info link not found`);
    return { email: null, phone: null, website: null };
  }

  await humanClick(page, contactLink.x, contactLink.y);
  await randomDelay(2000, 3500);

  // Extract data from modal
  const info = await page.evaluate(() => {
    const result = { email: null, phone: null, website: null };

    // Email
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    for (const el of emailLinks) {
      const href = el.getAttribute("href");
      if (href) {
        result.email = href.replace("mailto:", "").trim();
        break;
      }
    }

    // Phone — look for phone section
    const sections = document.querySelectorAll("section");
    sections.forEach((section) => {
      const header = section.querySelector("h3, h4");
      const headerText = header ? (header.textContent || "").toLowerCase() : "";
      if (headerText.includes("phone")) {
        const spans = section.querySelectorAll("span");
        spans.forEach((span) => {
          const text = (span.textContent || "").trim();
          if (text.match(/[\d\+\-\(\)]{10,}/)) {
            result.phone = text;
          }
        });
      }
    });

    // Website
    const websiteLinks = document.querySelectorAll('a[href*="http"]');
    websiteLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.includes("linkedin.com") && href.startsWith("http")) {
        result.website = href;
      }
    });

    return result;
  });

  // Close modal
  await page.keyboard.press("Escape");
  await randomDelay(1000, 2000);

  console.log(`   📧 Email: ${info.email || "N/A"}`);
  console.log(`   📱 Phone: ${info.phone || "N/A"}`);
  console.log(`   🌐 Website: ${info.website || "N/A"}`);

  return info;
}