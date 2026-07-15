import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";

/**
 * Convert LinkedIn short URLs and post URLs to proper activity URLs
 *
 * INPUT:  https://lnkd.in/p/gmVB9Ei8
 * OUTPUT: https://www.linkedin.com/feed/update/urn:li:activity:7482687012542803968/
 *
 * INPUT:  https://www.linkedin.com/posts/ankit-sharma_xxx-activity:7482687011007434753-sGLW/
 * OUTPUT: https://www.linkedin.com/feed/update/urn:li:activity:7482687012542803968/
 */
export async function resolvePostUrl(page, originalUrl) {
  if (!originalUrl) return null;

  console.log(`   🔗 Resolving URL: ${originalUrl.substring(0, 80)}`);

  // If already in feed/update format, return as-is
  if (originalUrl.includes("/feed/update/urn:li:activity:")) {
    console.log(`   ✅ Already in correct format`);
    return originalUrl.split("?")[0];
  }

  try {
    // Navigate to the URL
    const navOk = await safeGoto(page, originalUrl);
    if (!navOk) {
      console.log(`   ⚠️  Navigation failed`);
      return originalUrl;
    }

    await randomDelay(3000, 5000);

    // Get the current URL after redirect
    const currentUrl = page.url();
    console.log(`   📍 Redirected to: ${currentUrl.substring(0, 100)}`);

    // Extract activity ID from URL
    // Multiple formats to try:
    // 1. highlightedUpdateUrn=urn%3Ali%3Aactivity%3A1234567890 (URL-encoded)
    // 2. activity:1234567890 in posts URL
    // 3. /feed/update/urn:li:activity:1234567890/
    let activityId = null;

    // Try highlightedUpdateUrn param first
    const highlightMatch = currentUrl.match(/highlightedUpdateUrn=urn%3Ali%3Aactivity%3A(\d+)/);
    if (highlightMatch) {
      activityId = highlightMatch[1];
      console.log(`   🎯 Found activity ID (from highlightedUpdateUrn): ${activityId}`);
    }

    // Try activity: format in URL
    if (!activityId) {
      const activityMatch = currentUrl.match(/activity[:%3A](\d+)/i);
      if (activityMatch) {
        activityId = activityMatch[1];
        console.log(`   🎯 Found activity ID (from URL): ${activityId}`);
      }
    }

    // Try to extract from DOM
    if (!activityId) {
      activityId = await page.evaluate(() => {
        // Look for URN in data attributes or links
        const elements = document.querySelectorAll('[data-urn], [data-activity-urn]');
        for (const el of elements) {
          const urn = el.getAttribute("data-urn") || el.getAttribute("data-activity-urn") || "";
          const match = urn.match(/activity:(\d+)/);
          if (match) return match[1];
        }

        // Look in any link with activity
        const links = document.querySelectorAll('a[href*="activity"]');
        for (const link of links) {
          const href = link.getAttribute("href") || "";
          const match = href.match(/activity[:%3A](\d+)/);
          if (match) return match[1];
        }

        return null;
      });

      if (activityId) {
        console.log(`   🎯 Found activity ID (from DOM): ${activityId}`);
      }
    }

    if (!activityId) {
      console.log(`   ⚠️  Could not extract activity ID — using original URL`);
      return originalUrl;
    }

    // Build the clean activity URL
    const cleanUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    console.log(`   ✅ Resolved to: ${cleanUrl}`);
    return cleanUrl;
  } catch (err) {
    console.log(`   ❌ URL resolution error: ${err.message}`);
    return originalUrl;
  }
}