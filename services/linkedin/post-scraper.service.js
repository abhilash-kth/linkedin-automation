import { randomDelay } from "../../helpers/delay.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

export async function scrapePersonPosts(page, profileUrl) {
  console.log(`   📰 Scraping posts for: ${profileUrl}`);

  const postsUrl = profileUrl.endsWith("/")
    ? profileUrl + "recent-activity/all/"
    : profileUrl + "/recent-activity/all/";

  try {
    await page.goto(postsUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await randomDelay(4000, 6000);
    await behaveLikeHuman(page);

    const posts = await page.evaluate(() => {
      const postEls = document.querySelectorAll(
        '.feed-shared-update-v2, [data-urn*="activity"]',
      );
      const found = [];

      postEls.forEach((post, index) => {
        if (index >= 5) return; // Max 5 recent posts

        const contentEl = post.querySelector(
          ".feed-shared-update-v2__description, .update-components-text",
        );
        const timeEl = post.querySelector("time, .update-components-actor__sub-description");
        const likeEl = post.querySelector(".social-details-social-counts__reactions-count");
        const commentEl = post.querySelector(".social-details-social-counts__comments");

        const content = contentEl ? (contentEl.textContent || "").trim() : "";
        const time = timeEl ? (timeEl.textContent || "").trim() : "";
        const likes = likeEl ? parseInt((likeEl.textContent || "0").replace(/\D/g, "")) || 0 : 0;
        const comments = commentEl ? parseInt((commentEl.textContent || "0").replace(/\D/g, "")) || 0 : 0;

        if (content.length > 20) {
          found.push({
            content: content.substring(0, 2000),
            time,
            likes,
            comments,
          });
        }
      });

      return found;
    });

    console.log(`   ✅ Scraped ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.log(`   ⚠️  Post scraping failed: ${err.message}`);
    return [];
  }
}