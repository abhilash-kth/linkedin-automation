import { randomDelay } from "../../helpers/delay.helper.js";
import { humanClick } from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

export async function searchLinkedIn(page, keyword, maxPages = 3) {
  console.log(`\n🔍 Searching LinkedIn for: "${keyword}"`);

  const results = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}&page=${pageNum}`;

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await randomDelay(4000, 7000);
      await behaveLikeHuman(page);

      const pageResults = await page.evaluate(() => {
        const items = document.querySelectorAll(".entity-result__item, .reusable-search__result-container");
        const found = [];

        items.forEach((item) => {
          const nameEl = item.querySelector(".entity-result__title-text a span span:first-child, .entity-result__title-text a");
          const headlineEl = item.querySelector(".entity-result__primary-subtitle");
          const locationEl = item.querySelector(".entity-result__secondary-subtitle");
          const linkEl = item.querySelector(".entity-result__title-text a, a[href*='/in/']");

          const name = nameEl ? (nameEl.textContent || "").trim() : "";
          const headline = headlineEl ? (headlineEl.textContent || "").trim() : "";
          const location = locationEl ? (locationEl.textContent || "").trim() : "";
          const profileUrl = linkEl ? linkEl.getAttribute("href") : "";

          if (name && profileUrl && profileUrl.includes("/in/")) {
            found.push({
              name,
              headline,
              location,
              profileUrl: profileUrl.split("?")[0],
            });
          }
        });

        return found;
      });

      console.log(`   📄 Page ${pageNum}: Found ${pageResults.length} results`);
      results.push(...pageResults);

      if (pageResults.length === 0) break;

      await randomDelay(3000, 6000);
    } catch (err) {
      console.log(`   ⚠️  Error on page ${pageNum}: ${err.message}`);
      break;
    }
  }

  console.log(`   ✅ Total results: ${results.length}`);
  return results;
}