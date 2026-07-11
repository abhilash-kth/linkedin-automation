import { randomDelay, random } from "../../helpers/delay.helper.js";
import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";
import { safeGoto } from "../browser/navigation.service.js";

const MAX_POSTS_PER_KEYWORD = 30;
const MAX_SCROLL_ATTEMPTS = 8;

/**
 * Search LinkedIn Posts by keyword with human-like behavior
 * Includes lazy-load handling
 */
export async function searchPostsByKeyword(page, keyword) {
  console.log(`\n🔍 Searching POSTS for: "${keyword}"`);

  try {
    // Navigate to feed first
    console.log(`   🏠 Going to LinkedIn feed...`);
    await safeGoto(page, "https://www.linkedin.com/feed/");
    await randomDelay(3000, 5000);
    await behaveLikeHuman(page);

    // Find search bar
    console.log(`   🔎 Locating search bar...`);
    let searchBarCoords = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.waitForTimeout(1000);
      searchBarCoords = await page.evaluate(() => {
        const el = document.querySelector(
          'input[data-testid="typeahead-input"]',
        );
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            el.setAttribute("data-search-bar", "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
        return null;
      });
      if (searchBarCoords) break;
    }

    if (!searchBarCoords) {
      console.log(`   ❌ Search bar not found`);
      return [];
    }

    // Click search bar
    console.log(`   🖱️  Clicking search bar...`);
    await humanClick(page, searchBarCoords.x, searchBarCoords.y);
    await randomDelay(800, 1500);

    // Focus via JS
    await page.evaluate(() => {
      const el = document.querySelector('[data-search-bar="true"]');
      if (el) el.focus();
    });
    await randomDelay(500, 1000);

    // Clear existing text
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(300, 600);

    // Type keyword like human
    console.log(`   ⌨️  Typing: "${keyword}"`);
    await humanTypeText(page, keyword);
    await randomDelay(1500, 2500);

    // Press Enter
    console.log(`   ↵ Pressing Enter...`);
    await page.keyboard.press("Enter");
    await randomDelay(4000, 6000);

    // Click Posts filter
    console.log(`   📝 Clicking POSTS filter...`);
    const postsFilterClicked = await clickPostsFilter(page);

    if (!postsFilterClicked) {
      console.log(`   🔄 Fallback: Direct URL to posts search`);
      const postsUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}`;
      await safeGoto(page, postsUrl);
      await randomDelay(4000, 6000);
    } else {
      await randomDelay(3000, 5000);
    }

    // Human-like scroll with lazy load handling
    console.log(`   📜 Scrolling to load posts (lazy loading)...`);
    await humanScrollWithLazyLoad(page);

    // Wait for content to settle
    await randomDelay(2000, 3500);

    // Extract post data (without expanding — we'll expand one at a time later)
    console.log(`   📥 Collecting post containers...`);
    const posts = await collectPostContainers(page);
    console.log(`   ✅ Collected ${posts.length} posts`);

    return posts;
  } catch (err) {
    console.log(`   ❌ Search failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// Click Posts filter tab
// ═══════════════════════════════════════════════════════════
async function clickPostsFilter(page) {
  const coords = await page.evaluate(() => {
    const el = document.querySelector('a[aria-label="Filter by Posts"]');
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      }
    }
    return null;
  });

  if (!coords) return false;

  await humanClick(page, coords.x, coords.y);
  await randomDelay(2000, 3500);
  return true;
}

// ═══════════════════════════════════════════════════════════
// Human-like scroll with lazy load detection
// ═══════════════════════════════════════════════════════════
async function humanScrollWithLazyLoad(page) {
  let previousPostCount = 0;
  let failedAttempts = 0;

  for (let attempt = 1; attempt <= MAX_SCROLL_ATTEMPTS; attempt++) {
    // Get current post count
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('[role="listitem"]').length;
    });

    console.log(
      `   📊 Scroll ${attempt}/${MAX_SCROLL_ATTEMPTS}: ${currentCount} posts loaded`,
    );

    if (currentCount >= MAX_POSTS_PER_KEYWORD) {
      console.log(`   ✅ Reached max posts (${MAX_POSTS_PER_KEYWORD})`);
      break;
    }

    // Human-like scroll amount
    const scrollAmount = random(600, 1000);
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);

    // Random mouse movement (like reading)
    if (Math.random() > 0.4) {
      await humanMove(
        page,
        Math.floor(random(200, 1200)),
        Math.floor(random(300, 700)),
      );
    }

    // Wait for lazy load
    await randomDelay(2500, 4500);

    // Check if new posts loaded
    if (currentCount === previousPostCount) {
      failedAttempts++;
      console.log(
        `   ⏳ No new posts loaded, waiting longer... (${failedAttempts}/3)`,
      );
      await randomDelay(4000, 7000);

      if (failedAttempts >= 3) {
        console.log(`   ℹ️  No more posts loading, stopping scroll`);
        break;
      }
    } else {
      failedAttempts = 0;
    }

    previousPostCount = currentCount;
  }

  // Scroll back up a bit (human behavior)
  await page.evaluate(() => window.scrollBy(0, -500));
  await randomDelay(1500, 3000);
}

// ═══════════════════════════════════════════════════════════
// Collect all post container references
// ═══════════════════════════════════════════════════════════
async function collectPostContainers(page) {
  return await page.evaluate(() => {
    const posts = [];
    const containers = document.querySelectorAll('[role="listitem"]');

    containers.forEach((container, index) => {
      // Get author profile link (skip company posts)
      const authorLinks = container.querySelectorAll('a[href*="/in/"]');
      if (authorLinks.length === 0) return;

      const authorLink = authorLinks[0];
      const authorProfileUrl = authorLink.getAttribute("href").split("?")[0];

      if (!authorProfileUrl.includes("/in/")) return;

      const fullProfileUrl = authorProfileUrl.startsWith("http")
        ? authorProfileUrl
        : "https://www.linkedin.com" + authorProfileUrl;

      // ── Get author name ──
      let authorName = "";
      const nameEl = container.querySelector(
        'a[aria-label*="Verified Profile"], a[aria-label*="3rd"], a[aria-label*="2nd"], a[aria-label*="1st"]',
      );
      if (nameEl) {
        const aria = nameEl.getAttribute("aria-label") || "";
        authorName = aria
          .replace(/Verified Profile/gi, "")
          .replace(/\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi, "")
          .trim();
      }

      if (!authorName) {
        const p = container.querySelector('a[href*="/in/"] p span');
        if (p) authorName = (p.textContent || "").trim();
      }

      if (!authorName || authorName.length < 2) return;

      // ── Get author HEADLINE (job title/company - NOT post content) ──
      let authorHeadline = "";
      // The headline is in a specific paragraph BEFORE the post content
      const allParagraphs = container.querySelectorAll("p.e6590096.a303fa94");
      for (const p of allParagraphs) {
        const text = (p.textContent || "").trim();
        // Skip time paragraphs like "2w •" and post content
        if (text.match(/^\d+[wdhm]\s*•/)) continue;
        if (text.length < 5) continue;
        if (text.length > 500) continue; // Post content is usually longer
        // Headline is usually 20-300 chars
        if (text.length >= 5 && text.length <= 300 && !text.startsWith("•")) {
          authorHeadline = text.substring(0, 300);
          break;
        }
      }

      // ── Get post time (e.g. "2w •", "5h •") ──
      // let postTime = "";
      // for (const p of allParagraphs) {
      //   const text = (p.textContent || "").trim();
      //   const match = text.match(/^(\d+[wdhm])\s*•/);
      //   if (match) {
      //     postTime = match[1];
      //     break;
      //   }
      // }

      // ── Get post time (e.g. "2w •", "5h •", "4d •") ──
      let postTime = "";

      // Method 1: Look for componentkey pattern in time paragraphs
      const timeParas = container.querySelectorAll(
        "p.e6590096.a303fa94.e2049567",
      );
      for (const p of timeParas) {
        const text = (p.textContent || "").trim();
        // Match patterns like "4d •", "2w •", "5h •", "30m •"
        const match = text.match(/^(\d+[wdhms])\s*[•·]/);
        if (match) {
          postTime = match[1];
          break;
        }
      }

      // Method 2: Fallback — search all spans for time pattern
      if (!postTime) {
        const allSpans = container.querySelectorAll("span");
        for (const span of allSpans) {
          const text = (span.textContent || "").trim();
          // Match at start of string or after whitespace
          const match = text.match(/^(\d+[wdhms])\s*[•·]/);
          if (match) {
            postTime = match[1];
            break;
          }
        }
      }

      // Method 3: Search all paragraphs
      if (!postTime) {
        for (const p of allParagraphs) {
          const text = (p.textContent || "").trim();
          // Match anywhere in the text
          const match = text.match(/(\d+[wdhms])\s*[•·]/);
          if (match) {
            postTime = match[1];
            break;
          }
        }
      }

      // ── Get post content ──
      let content = "";
      const contentEl = container.querySelector(
        '[data-testid="expandable-text-box"]',
      );
      if (contentEl) {
        content = (contentEl.textContent || "").trim();
      }

      if (!content || content.length < 30) return;

      container.setAttribute("data-post-index", String(index));

      posts.push({
        index,
        authorName,
        authorHeadline,
        authorProfileUrl: fullProfileUrl,
        content,
        postTime,
        hasExpandButton: !!container.querySelector(
          'button[data-testid="expandable-text-button"]',
        ),
      });
    });

    return posts;
  });
}

/**
 * Expand a specific post to get full content
 */
export async function expandPost(page, postIndex) {
  const clicked = await page.evaluate((idx) => {
    const container = document.querySelector(`[data-post-index="${idx}"]`);
    if (!container) return false;

    const moreBtn = container.querySelector(
      'button[data-testid="expandable-text-button"]',
    );
    if (!moreBtn) return false;

    try {
      moreBtn.click();
      return true;
    } catch {
      return false;
    }
  }, postIndex);

  if (clicked) {
    await randomDelay(1000, 2000);
    // Get updated content
    const fullContent = await page.evaluate((idx) => {
      const container = document.querySelector(`[data-post-index="${idx}"]`);
      if (!container) return null;
      const contentEl = container.querySelector(
        '[data-testid="expandable-text-box"]',
      );
      return contentEl ? (contentEl.textContent || "").trim() : null;
    }, postIndex);

    return fullContent;
  }

  return null;
}
