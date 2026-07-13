import { randomDelay } from "../../helpers/delay.helper.js";

/**
 * Read all comments on the currently viewed post
 * Returns: {
 *   hasOurComment: boolean,
 *   ourCommentText: string | null,
 *   authorReplied: boolean,
 *   authorReplyText: string | null,
 *   totalComments: number
 * }
 */
export async function readPostComments(page, postIndex, ourProfileUrl = null) {
  console.log(`   💬 Reading existing comments on post...`);

  try {
    // Wait a bit for comments to render
    await randomDelay(2000, 3500);

    const commentInfo = await page.evaluate((idx) => {
      const container = document.querySelector(`[data-post-index="${idx}"]`);
      if (!container) return { totalComments: 0, hasOurComment: false, authorReplied: false };

      // Find all comment articles in this post
      const commentSelectors = [
        'article.comments-comment-entity',
        'article.comments-comment-item',
        '[class*="comments-comment-entity"]',
        '[class*="comment-item"]',
      ];

      let comments = [];
      for (const sel of commentSelectors) {
        const found = container.querySelectorAll(sel);
        if (found.length > 0) {
          comments = Array.from(found);
          break;
        }
      }

      if (comments.length === 0) {
        return { totalComments: 0, hasOurComment: false, authorReplied: false };
      }

      const result = {
        totalComments: comments.length,
        hasOurComment: false,
        ourCommentText: null,
        authorReplied: false,
        authorReplyText: null,
        allComments: [],
      };

      comments.forEach((comment) => {
        // Get commenter's profile URL
        const authorLink = comment.querySelector('a[href*="/in/"]');
        const authorProfileUrl = authorLink ? authorLink.getAttribute("href").split("?")[0] : "";

        // Get comment text
        const textEl = comment.querySelector('.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]');
        const commentText = textEl ? (textEl.textContent || "").trim() : "";

        // Get commenter name
        const nameEl = comment.querySelector('.comments-comment-meta__actor-link, .comments-post-meta__name-text, a.app-aware-link');
        const commenterName = nameEl ? (nameEl.textContent || "").trim().split("\n")[0].trim() : "";

        // Check if it's our comment (by checking class or "You" badge)
        const isOwn = comment.classList.contains("comments-comment-entity--self") ||
                     comment.querySelector('[class*="self"]') !== null;

        // Check if it's author's comment (has "Author" badge)
        const authorBadge = comment.querySelector('.comments-post-meta__badge, [class*="author-badge"]');
        const isAuthor = !!authorBadge;

        result.allComments.push({
          authorName: commenterName,
          authorProfileUrl,
          text: commentText.substring(0, 500),
          isOwn,
          isAuthor,
        });

        if (isOwn) {
          result.hasOurComment = true;
          result.ourCommentText = commentText;
        }

        if (isAuthor && !isOwn) {
          result.authorReplied = true;
          result.authorReplyText = commentText;
        }
      });

      return result;
    }, postIndex);

    console.log(`   📊 Total comments: ${commentInfo.totalComments}`);
    console.log(`   📊 Our comment exists: ${commentInfo.hasOurComment}`);
    console.log(`   📊 Author replied: ${commentInfo.authorReplied}`);

    return commentInfo;
  } catch (err) {
    console.log(`   ⚠️  Comment reading failed: ${err.message}`);
    return {
      totalComments: 0,
      hasOurComment: false,
      authorReplied: false,
    };
  }
}