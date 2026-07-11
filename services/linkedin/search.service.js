// import { randomDelay } from "../../helpers/delay.helper.js";
// import { humanClick } from "../../helpers/human-click.helper.js";
// import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

// export async function searchLinkedIn(page, keyword, maxPages = 3) {
//   console.log(`\n🔍 Searching LinkedIn for: "${keyword}"`);

//   const results = [];

//   for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
//     const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}&page=${pageNum}`;

//     try {
//       await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
//       await randomDelay(4000, 7000);
//       await behaveLikeHuman(page);

//       const pageResults = await page.evaluate(() => {
//         const items = document.querySelectorAll(".entity-result__item, .reusable-search__result-container");
//         const found = [];

//         items.forEach((item) => {
//           const nameEl = item.querySelector(".entity-result__title-text a span span:first-child, .entity-result__title-text a");
//           const headlineEl = item.querySelector(".entity-result__primary-subtitle");
//           const locationEl = item.querySelector(".entity-result__secondary-subtitle");
//           const linkEl = item.querySelector(".entity-result__title-text a, a[href*='/in/']");

//           const name = nameEl ? (nameEl.textContent || "").trim() : "";
//           const headline = headlineEl ? (headlineEl.textContent || "").trim() : "";
//           const location = locationEl ? (locationEl.textContent || "").trim() : "";
//           const profileUrl = linkEl ? linkEl.getAttribute("href") : "";

//           if (name && profileUrl && profileUrl.includes("/in/")) {
//             found.push({
//               name,
//               headline,
//               location,
//               profileUrl: profileUrl.split("?")[0],
//             });
//           }
//         });

//         return found;
//       });

//       console.log(`   📄 Page ${pageNum}: Found ${pageResults.length} results`);
//       results.push(...pageResults);

//       if (pageResults.length === 0) break;

//       await randomDelay(3000, 6000);
//     } catch (err) {
//       console.log(`   ⚠️  Error on page ${pageNum}: ${err.message}`);
//       break;
//     }
//   }

//   console.log(`   ✅ Total results: ${results.length}`);
//   return results;
// }

import { randomDelay, random } from "../../helpers/delay.helper.js";
import { humanClick, humanTypeText, humanMove } from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";
import { safeGoto } from "../browser/navigation.service.js";

/**
 * Human-like search: Types keyword in search bar → Clicks People filter → Scrapes results
 */
export async function searchLinkedIn(page, keyword, maxPages = 3) {
  console.log(`\n🔍 Searching LinkedIn for: "${keyword}"`);

  const results = [];

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Navigate to LinkedIn homepage/feed first (like a human)
    // ═══════════════════════════════════════════════════════════
    console.log(`   🏠 Going to LinkedIn feed first...`);
    await safeGoto(page, "https://www.linkedin.com/feed/");
    await randomDelay(3000, 5000);
    await behaveLikeHuman(page);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Find and click the search bar (top of page)
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔎 Locating search bar...`);

    // Wait for search bar to be visible
    let searchBarCoords = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.waitForTimeout(1000);

      searchBarCoords = await page.evaluate(() => {
        // LinkedIn search bar selectors (try multiple)
        const selectors = [
          'input[aria-label="Search"]',
          'input[placeholder="Search"]',
          'input.search-global-typeahead__input',
          'input[role="combobox"]',
          '[data-view-name="search-global-typeahead-input"] input',
        ];

        for (const sel of selectors) {
          const el = document.querySelector(sel);
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
        }
        return null;
      });

      if (searchBarCoords) break;
    }

    if (!searchBarCoords) {
      console.log(`   ❌ Search bar not found`);
      return [];
    }

    console.log(`   ✅ Search bar found at (${searchBarCoords.x}, ${searchBarCoords.y})`);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Click search bar like a human
    // ═══════════════════════════════════════════════════════════
    console.log(`   🖱️  Clicking search bar...`);
    await humanClick(page, searchBarCoords.x, searchBarCoords.y);
    await randomDelay(800, 1500);

    // Focus the search bar via JS as backup
    await page.evaluate(() => {
      const el = document.querySelector('[data-search-bar="true"]');
      if (el) el.focus();
    });
    await randomDelay(500, 1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Clear any existing text and type keyword like human
    // ═══════════════════════════════════════════════════════════
    console.log(`   ⌨️  Typing keyword: "${keyword}"`);

    // Clear existing text
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(300, 600);

    // Type character by character like human (with typos)
    await humanTypeText(page, keyword);
    await randomDelay(1500, 2500);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Press Enter to search
    // ═══════════════════════════════════════════════════════════
    console.log(`   ↵ Pressing Enter to search...`);
    await page.keyboard.press("Enter");
    await randomDelay(4000, 6000);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Click "People" filter (if not already selected)
    // ═══════════════════════════════════════════════════════════
    console.log(`   👥 Applying "People" filter...`);

    const peopleFilterClicked = await clickPeopleFilter(page);
    if (peopleFilterClicked) {
      await randomDelay(3000, 5000);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Scrape results from multiple pages
    // ═══════════════════════════════════════════════════════════
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`\n   📄 Scraping page ${pageNum}/${maxPages}...`);

      // Human-like scroll to load all results
      await humanScrollThroughResults(page);
      await randomDelay(2000, 4000);

      const pageResults = await extractResultsFromPage(page);
      console.log(`   ✅ Found ${pageResults.length} results on page ${pageNum}`);

      results.push(...pageResults);

      if (pageResults.length === 0) {
        console.log(`   ℹ️  No more results, stopping`);
        break;
      }

      // Move to next page (if not last)
      if (pageNum < maxPages) {
        const nextPageLoaded = await clickNextPage(page);
        if (!nextPageLoaded) {
          console.log(`   ℹ️  No next page available`);
          break;
        }
        await randomDelay(4000, 7000);
      }
    }
  } catch (err) {
    console.log(`   ❌ Search error: ${err.message}`);
  }

  // Remove duplicates by profileUrl
  const uniqueResults = Array.from(
    new Map(results.map((r) => [r.profileUrl, r])).values(),
  );

  console.log(`\n   ✅ Total unique results: ${uniqueResults.length}`);
  return uniqueResults;
}

// ═════════════════════════════════════════════════════════════════
// HELPER: Click "People" filter tab
// ═════════════════════════════════════════════════════════════════
async function clickPeopleFilter(page) {
  const filterCoords = await page.evaluate(() => {
    // Find "People" filter button
    const buttons = [
      ...document.querySelectorAll("button"),
      ...document.querySelectorAll("a"),
    ];

    for (const btn of buttons) {
      const text = (btn.textContent || "").trim();
      const rect = btn.getBoundingClientRect();
      if (text === "People" && rect.width > 0 && rect.height > 0) {
        // Make sure it's in the filter bar area (top of page)
        if (rect.y < 300) {
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    return null;
  });

  if (!filterCoords) {
    console.log(`   ℹ️  People filter not found (maybe already applied)`);
    return false;
  }

  console.log(`   🖱️  Clicking People filter at (${filterCoords.x}, ${filterCoords.y})`);
  await humanClick(page, filterCoords.x, filterCoords.y);
  await randomDelay(2000, 3500);
  return true;
}

// ═════════════════════════════════════════════════════════════════
// HELPER: Human-like scrolling to load all results
// ═════════════════════════════════════════════════════════════════
async function humanScrollThroughResults(page) {
  console.log(`   📜 Scrolling through results like a human...`);

  const scrolls = 4 + Math.floor(random(0, 4));
  for (let i = 0; i < scrolls; i++) {
    const scrollAmount = random(400, 800);
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);

    // Random mouse movement during scroll
    if (Math.random() > 0.5) {
      await humanMove(
        page,
        Math.floor(random(200, 1000)),
        Math.floor(random(300, 700)),
      );
    }

    await randomDelay(800, 2000);
  }

  // Scroll back up a bit (humans do this)
  await page.evaluate(() => window.scrollBy(0, -300));
  await randomDelay(1000, 2000);
}

// ═════════════════════════════════════════════════════════════════
// HELPER: Extract search results from current page
// ═════════════════════════════════════════════════════════════════
async function extractResultsFromPage(page) {
  return await page.evaluate(() => {
    const results = [];

    // Try multiple selectors for result cards
    const cardSelectors = [
      "li.reusable-search__result-container",
      ".entity-result__item",
      "[data-view-name='search-entity-result-universal-template']",
      ".search-results-container li",
    ];

    let cards = [];
    for (const sel of cardSelectors) {
      cards = document.querySelectorAll(sel);
      if (cards.length > 0) break;
    }

    cards.forEach((card) => {
      // Extract profile link
      const linkEl = card.querySelector('a[href*="/in/"]');
      if (!linkEl) return;

      let profileUrl = linkEl.getAttribute("href") || "";
      if (!profileUrl.includes("/in/")) return;

      // Clean URL (remove query params)
      profileUrl = profileUrl.split("?")[0];
      if (!profileUrl.startsWith("http")) {
        profileUrl = "https://www.linkedin.com" + profileUrl;
      }

      // Extract name
      const nameSelectors = [
        ".entity-result__title-text a span span:first-child",
        ".entity-result__title-text span[aria-hidden='true']",
        ".entity-result__title-text a span",
        ".entity-result__title-text",
      ];

      let name = "";
      for (const sel of nameSelectors) {
        const el = card.querySelector(sel);
        if (el) {
          name = (el.textContent || "").trim();
          if (name && !name.includes("View") && !name.includes("profile")) {
            break;
          }
        }
      }

      // Extract headline/title
      const headlineSelectors = [
        ".entity-result__primary-subtitle",
        ".entity-result__summary",
        ".t-14.t-black.t-normal",
      ];

      let headline = "";
      for (const sel of headlineSelectors) {
        const el = card.querySelector(sel);
        if (el) {
          headline = (el.textContent || "").trim();
          if (headline) break;
        }
      }

      // Extract location
      const locationSelectors = [
        ".entity-result__secondary-subtitle",
        ".t-14.t-normal:not(.t-black)",
      ];

      let location = "";
      for (const sel of locationSelectors) {
        const el = card.querySelector(sel);
        if (el) {
          location = (el.textContent || "").trim();
          if (location) break;
        }
      }

      // Extract distance (1st, 2nd, 3rd)
      let distance = "";
      const distanceEl = card.querySelector(".entity-result__badge-text, .distance-badge");
      if (distanceEl) {
        const dText = (distanceEl.textContent || "").trim();
        const match = dText.match(/(1st|2nd|3rd)/i);
        if (match) distance = match[1];
      }

      if (name && profileUrl) {
        results.push({
          name,
          headline,
          location,
          distance,
          profileUrl,
        });
      }
    });

    return results;
  });
}

// ═════════════════════════════════════════════════════════════════
// HELPER: Click "Next" page button
// ═════════════════════════════════════════════════════════════════
async function clickNextPage(page) {
  // Scroll to bottom first
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await randomDelay(1500, 2500);

  const nextCoords = await page.evaluate(() => {
    const selectors = [
      'button[aria-label="Next"]',
      'button.artdeco-pagination__button--next',
      'button:has-text("Next")',
    ];

    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        // Check if disabled
        if (btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true") {
          return null;
        }
        const rect = btn.getBoundingClientRect();
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

  if (!nextCoords) {
    console.log(`   ℹ️  No "Next" button (last page)`);
    return false;
  }

  console.log(`   🖱️  Clicking Next page...`);
  await humanClick(page, nextCoords.x, nextCoords.y);
  await randomDelay(4000, 6000);
  return true;
}