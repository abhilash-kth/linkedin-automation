// import { randomDelay } from "../../helpers/delay.helper.js";
// import { safeGoto } from "../browser/navigation.service.js";
// import { humanMove } from "../../helpers/human-click.helper.js";

// /**
//  * Open a post URL and analyze all comments
//  *
//  * SCENARIO 1: Post author replied to our comment
//  *   → We reply to author (only replies UNDER our comment count)
//  *
//  * SCENARIO 2: Another user commented and mentioned us (@Abhilash)
//  *   → We reply to that user + save them as new lead
//  *
//  * Returns: {
//  *   ourCommentFound, ourCommentText, ourCommentId,
//  *   authorReplied, authorReplyText, authorReplyId,
//  *   mentions: [{ userName, userProfileUrl, commentText, commentId }],
//  *   totalComments
//  * }
//  */
// export async function checkAuthorReplyOnPost(page, postUrl, authorName, ourName = "Abhilash Chaurasiya") {
//   console.log(`   🔍 Opening post to analyze comments...`);
//   console.log(`      URL: ${postUrl.substring(0, 100)}`);

//   try {
//     const navOk = await safeGoto(page, postUrl);
//     if (!navOk) {
//       return { error: "navigation_failed" };
//     }

//     await randomDelay(4000, 6000);

//     // Scroll to comments section
//     await page.evaluate(() => {
//       const commentSection = document.querySelector(
//         '.comments-comments-list, [class*="comments-list"], section[aria-label*="Comments" i]',
//       );
//       if (commentSection) {
//         commentSection.scrollIntoView({ block: "center", behavior: "smooth" });
//       } else {
//         window.scrollTo(0, document.body.scrollHeight / 2);
//       }
//     });
//     await randomDelay(3000, 5000);

//     // Click "Show more comments" if available
//     for (let i = 0; i < 3; i++) {
//       const clicked = await page.evaluate(() => {
//         const buttons = document.querySelectorAll("button");
//         for (const btn of buttons) {
//           const text = (btn.textContent || "").toLowerCase();
//           if (
//             text.includes("show more comments") ||
//             text.includes("load more") ||
//             text.includes("view more comments") ||
//             text.includes("show previous")
//           ) {
//             btn.click();
//             return true;
//           }
//         }
//         return false;
//       });
//       if (!clicked) break;
//       await randomDelay(2000, 3500);
//     }

//     // Also expand any collapsed reply threads
//     for (let i = 0; i < 3; i++) {
//       const expanded = await page.evaluate(() => {
//         const buttons = document.querySelectorAll("button");
//         for (const btn of buttons) {
//           const text = (btn.textContent || "").toLowerCase();
//           if (
//             text.includes("show more replies") ||
//             text.includes("view more replies") ||
//             text.includes("load more replies") ||
//             text.match(/^\d+ repl(y|ies)$/i)
//           ) {
//             btn.click();
//             return true;
//           }
//         }
//         return false;
//       });
//       if (!expanded) break;
//       await randomDelay(2000, 3000);
//     }

//     // Simulate reading
//     await humanMove(page, 500, 500);
//     await randomDelay(2000, 3000);

//     // Analyze comments
//     const analysis = await page.evaluate((data) => {
//       const { targetAuthorName, ourName } = data;
//       const result = {
//         ourCommentFound: false,
//         ourCommentText: null,
//         ourCommentId: null,
//         authorReplied: false,
//         authorReplyText: null,
//         authorReplyId: null,
//         mentions: [],
//         totalComments: 0,
//         allComments: [],
//       };

//       const targetFirstName = targetAuthorName.split(" ")[0].toLowerCase();
//       const ourFirstName = ourName.split(" ")[0].toLowerCase();

//       // Get only TOP-LEVEL comments (not nested inside replies)
//       const allCommentEls = document.querySelectorAll(
//         "article.comments-comment-entity, [class*='comments-comment-entity']",
//       );

//       // Filter to only top-level (not inside a replies-list)
//       const topLevelCommentEls = Array.from(allCommentEls).filter((el) => {
//         return !el.closest(".comments-replies-list") &&
//                !el.closest("[class*='comments-replies-list']");
//       });

//       result.totalComments = topLevelCommentEls.length;
//       if (topLevelCommentEls.length === 0) return result;

//       topLevelCommentEls.forEach((commentEl) => {
//         // Get comment ID (from data-id attribute)
//         const commentId = commentEl.getAttribute("data-id") || "";

//         // ═══ Get commenter's name and profile URL ═══
//         const profileLink = commentEl.querySelector(
//           ".comments-comment-meta__description-container",
//         );

//         const profileUrl = profileLink
//           ? profileLink.getAttribute("href")?.split("?")[0]
//           : "";

//         // Get name from description title
//         const nameEl = commentEl.querySelector(
//           ".comments-comment-meta__description-title",
//         );
//         const commenterName = nameEl ? (nameEl.textContent || "").trim() : "";

//         if (!commenterName) return;

//         // Get subtitle (their headline)
//         const subtitleEl = commentEl.querySelector(
//           ".comments-comment-meta__description-subtitle",
//         );
//         const commenterTitle = subtitleEl
//           ? (subtitleEl.textContent || "").trim()
//           : "";

//         // ═══ Check if it's OUR comment (has "• You" text) ═══
//         const metaData = commentEl.querySelector(
//           ".comments-comment-meta__description",
//         );
//         const metaText = metaData ? (metaData.textContent || "") : "";
//         const isOwn =
//           metaText.includes("• You") ||
//           metaText.toLowerCase().includes(ourFirstName + " • you") ||
//           commenterName.toLowerCase() === ourName.toLowerCase();

//         // ═══ Check if it's POST AUTHOR (has "Author" badge) ═══
//         const authorBadge = commentEl.querySelector(
//           ".comments-comment-meta__badge",
//         );
//         const isPostAuthor =
//           (authorBadge && (authorBadge.textContent || "").trim().toLowerCase() === "author") ||
//           (!isOwn && commenterName.toLowerCase().includes(targetFirstName));

//         // ═══ Get comment text (only from THIS comment, not nested replies) ═══
//         // Direct child section to avoid grabbing nested comment text
//         const contentSection = commentEl.querySelector(
//           ":scope > .comments-thread-entity .comments-thread-item .comments-comment-entity__content, " +
//           ":scope > * .comments-comment-entity__content",
//         );
//         const textEl = contentSection
//           ? contentSection.querySelector(
//               ".comments-comment-item__main-content .update-components-text, " +
//               ".comments-comment-item__main-content",
//             )
//           : commentEl.querySelector(
//               ".comments-comment-item__main-content .update-components-text, " +
//               ".comments-comment-item__main-content",
//             );
//         const commentText = textEl ? (textEl.textContent || "").trim() : "";

//         if (!commentText) return;

//         // ═══ Check if this comment mentions us ═══
//         const mentions = commentEl.querySelectorAll(
//           ':scope a[href*="/in/"], :scope a.ql-mention',
//         );
//         let mentionsUs = false;
//         for (const mention of mentions) {
//           // Skip mentions inside nested replies
//           if (mention.closest(".comments-replies-list")) continue;

//           const mentionText = (mention.textContent || "").trim().toLowerCase();
//           const mentionHref = (mention.getAttribute("href") || "").toLowerCase();
//           if (
//             mentionText.includes(ourFirstName) ||
//             mentionHref.includes("abhilash") ||
//             mentionText === ourName.toLowerCase()
//           ) {
//             mentionsUs = true;
//             break;
//           }
//         }

//         // Also check text-based mention
//         if (!mentionsUs && commentText.toLowerCase().includes(ourFirstName)) {
//           mentionsUs = true;
//         }

//         result.allComments.push({
//           id: commentId,
//           name: commenterName,
//           title: commenterTitle,
//           profileUrl: profileUrl,
//           text: commentText.substring(0, 500),
//           isOwn,
//           isPostAuthor,
//           mentionsUs,
//         });

//         // ═══ Categorize the comment ═══
//         if (isOwn) {
//           result.ourCommentFound = true;
//           result.ourCommentText = commentText;
//           result.ourCommentId = commentId;
//         } else if (isPostAuthor && !result.authorReplied) {
//           // Post author replied to the POST (not necessarily to us)
//           // We'll prioritize author replies UNDER our comment (see nested check below)
//           result.authorReplied = true;
//           result.authorReplyText = commentText;
//           result.authorReplyId = commentId;
//         } else if (mentionsUs && !isOwn) {
//           // Someone else mentioned us at TOP LEVEL
//           result.mentions.push({
//             commentId,
//             userName: commenterName,
//             userTitle: commenterTitle,
//             userProfileUrl: profileUrl.startsWith("http")
//               ? profileUrl
//               : profileUrl
//               ? "https://www.linkedin.com" + profileUrl
//               : "",
//             commentText: commentText,
//             isReply: false,
//           });
//         }

//         // ═══ Check nested replies (thread replies to our comment) ═══
//         // CRITICAL: This block runs when the current commentEl IS our comment
//         // So any replies here are replies TO US
//         if (isOwn) {
//           const repliesContainer = commentEl.querySelector(
//             ".comments-replies-list, [class*='comments-replies-list']",
//           );

//           if (repliesContainer) {
//             const replyEls = repliesContainer.querySelectorAll(
//               "article.comments-comment-entity, [class*='comment-entity--reply']",
//             );

//             replyEls.forEach((replyEl) => {
//               const replyId = replyEl.getAttribute("data-id") || "";

//               const replyNameEl = replyEl.querySelector(
//                 ".comments-comment-meta__description-title",
//               );
//               const replyName = replyNameEl
//                 ? (replyNameEl.textContent || "").trim()
//                 : "";

//               const replyProfileLink = replyEl.querySelector(
//                 ".comments-comment-meta__description-container",
//               );
//               const replyProfileUrl = replyProfileLink
//                 ? replyProfileLink.getAttribute("href")?.split("?")[0]
//                 : "";

//               const replyTextEl = replyEl.querySelector(
//                 ".comments-comment-item__main-content .update-components-text, " +
//                 ".comments-comment-item__main-content",
//               );
//               const replyText = replyTextEl
//                 ? (replyTextEl.textContent || "").trim()
//                 : "";

//               if (!replyText) return;

//               // Check if reply is from POST AUTHOR
//               const replyAuthorBadge = replyEl.querySelector(
//                 ".comments-comment-meta__badge",
//               );
//               const isReplyFromAuthor =
//                 (replyAuthorBadge && (replyAuthorBadge.textContent || "").trim().toLowerCase() === "author") ||
//                 (replyName && replyName.toLowerCase().includes(targetFirstName));

//               // Check if reply is from us
//               const replyMetaText = replyEl.querySelector(".comments-comment-meta__description");
//               const replyIsOwn =
//                 (replyMetaText && (replyMetaText.textContent || "").includes("• You")) ||
//                 (replyName.toLowerCase() === ourName.toLowerCase());

//               // Check if reply mentions us
//               const replyMentions = replyEl.querySelectorAll('a[href*="/in/"], a.ql-mention');
//               let replyMentionsUs = false;
//               for (const m of replyMentions) {
//                 const mText = (m.textContent || "").toLowerCase();
//                 if (mText.includes(ourFirstName)) {
//                   replyMentionsUs = true;
//                   break;
//                 }
//               }

//               if (isReplyFromAuthor && !replyIsOwn) {
//                 // Post author replied UNDER OUR COMMENT — HIGHEST PRIORITY
//                 // Override any previous authorReplied (this is more specific)
//                 result.authorReplied = true;
//                 result.authorReplyText = replyText;
//                 result.authorReplyId = replyId;
//                 result.authorReplyDataId = replyId;
//                 result.authorReplyIsNested = true; // Flag: reply is under our comment
//               } else if (replyMentionsUs && !replyIsOwn && !isReplyFromAuthor) {
//                 // Someone else mentioned us in a reply UNDER our comment
//                 result.mentions.push({
//                   commentId: replyId,
//                   userName: replyName,
//                   userProfileUrl: replyProfileUrl.startsWith("http")
//                     ? replyProfileUrl
//                     : replyProfileUrl
//                     ? "https://www.linkedin.com" + replyProfileUrl
//                     : "",
//                   commentText: replyText,
//                   isReply: true,
//                   dataId: replyId,
//                 });
//               }
//             });
//           }
//         }
//       });

//       return result;
//     }, { targetAuthorName: authorName, ourName });

//     console.log(`   📊 Total comments: ${analysis.totalComments}`);
//     console.log(`   📊 Our comment found: ${analysis.ourCommentFound}`);
//     console.log(`   📊 Author replied: ${analysis.authorReplied}`);
//     if (analysis.authorReplyIsNested) {
//       console.log(`      ✅ Reply is UNDER our comment (nested)`);
//     }
//     console.log(`   📊 Mentions of us: ${analysis.mentions.length}`);

//     if (analysis.authorReplyText) {
//       console.log(`   📝 Author reply: "${analysis.authorReplyText.substring(0, 80)}..."`);
//       console.log(`   📝 Reply ID: ${analysis.authorReplyId}`);
//     }

//     if (analysis.mentions.length > 0) {
//       analysis.mentions.forEach((m, i) => {
//         console.log(`   💬 Mention ${i + 1}: ${m.userName} ${m.isReply ? "(nested reply)" : "(top-level)"}`);
//         console.log(`      "${m.commentText.substring(0, 60)}..."`);
//       });
//     }

//     return analysis;
//   } catch (err) {
//     console.log(`   ❌ Comment check failed: ${err.message}`);
//     return { error: err.message };
//   }
// }

import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { humanMove } from "../../helpers/human-click.helper.js";
import SELECTORS from "../../config/selectors.js";

/**
 * Open a post URL and analyze all comments
 *
 * SCENARIOS DETECTED:
 * A) Post author replied UNDER our comment → authorReplied
 * B) Post author mentioned us elsewhere → authorMentions[]
 * C/D/E) Non-author mentioned us OR replied to our comment → mentions[]
 *
 * Returns: {
 *   ourCommentFound, ourCommentText, ourCommentId,
 *   authorReplied, authorReplyText, authorReplyId, authorReplyIsNested,
 *   authorMentions: [{ commentId, text, isReply }],
 *   mentions: [{ commentId, userName, userTitle, userProfileUrl,
 *                commentText, isReply, isReplyToUs }],
 *   totalComments,
 *   fullThread: [...]  // for AI context
 * }
 */
export async function checkAuthorReplyOnPost(
  page,
  postUrl,
  authorName,
  ourName = "Abhilash Chaurasiya",
) {
  console.log(`   🔍 Opening post to analyze comments...`);
  console.log(`      URL: ${postUrl.substring(0, 100)}`);

  try {
    const navOk = await safeGoto(page, postUrl);
    if (!navOk) return { error: "navigation_failed" };

    await randomDelay(4000, 6000);

    // Scroll to comments section
    await page.evaluate((sectionSels) => {
      const selector = sectionSels.join(", ");
      const section = document.querySelector(selector);
      if (section) {
        section.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        window.scrollTo(0, document.body.scrollHeight / 2);
      }
    }, SELECTORS.commentChecker.commentsSection);
    await randomDelay(3000, 5000);

    // Click "Show more comments"
    for (let i = 0; i < 3; i++) {
      const clicked = await page.evaluate((texts) => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
          const text = (btn.textContent || "").toLowerCase();
          for (const target of texts) {
            if (text.includes(target)) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      }, SELECTORS.commentChecker.showMoreCommentsTexts);
      if (!clicked) break;
      await randomDelay(2000, 3500);
    }

    // Expand nested reply threads
    for (let i = 0; i < 3; i++) {
      const expanded = await page.evaluate(
        ({ texts, countPattern }) => {
          const buttons = document.querySelectorAll("button");
          const countRegex = new RegExp(countPattern);
          for (const btn of buttons) {
            const text = (btn.textContent || "").toLowerCase();
            for (const target of texts) {
              if (text.includes(target)) {
                btn.click();
                return true;
              }
            }
            if (countRegex.test(text)) {
              btn.click();
              return true;
            }
          }
          return false;
        },
        {
          texts: SELECTORS.commentChecker.showMoreRepliesTexts,
          countPattern: SELECTORS.commentChecker.repliesCountPattern.source,
        },
      );
      if (!expanded) break;
      await randomDelay(2000, 3000);
    }

    await humanMove(page, 500, 500);
    await randomDelay(2000, 3000);

    // Analyze comments
    const analysis = await page.evaluate(
      (data) => {
        const {
          targetAuthorName,
          ourName,
          commentItemSels,
          repliesContainerSels,
          replyEntitySels,
          commentIdAttr,
          authorNameSel,
          authorTitleSel,
          profileLinkSel,
          metaDescSel,
          authorBadgeSel,
          contentSels,
          mentionSels,
          ownMarker,
          authorText,
        } = data;

        const result = {
          ourCommentFound: false,
          ourCommentText: null,
          ourCommentId: null,
          authorReplied: false,
          authorReplyText: null,
          authorReplyId: null,
          authorReplyIsNested: false,
          authorMentions: [],
          mentions: [],
          totalComments: 0,
          fullThread: [],
        };

        const targetFirstName = targetAuthorName.split(" ")[0].toLowerCase();
        const ourFirstName = ourName.split(" ")[0].toLowerCase();
        const ourNameLower = ourName.toLowerCase();

        const commentItemSel = commentItemSels.join(", ");
        const repliesContainerSel = repliesContainerSels.join(", ");
        const replyEntitySel = replyEntitySels.join(", ");
        const contentSel = contentSels.join(", ");
        const mentionSel = mentionSels.join(", ");

        // Helper: check if element mentions us
        function mentionsUs(el, text) {
          const mentions = el.querySelectorAll(mentionSel);
          for (const m of mentions) {
            const mText = (m.textContent || "").trim().toLowerCase();
            const mHref = (m.getAttribute("href") || "").toLowerCase();
            if (
              mText.includes(ourFirstName) ||
              mHref.includes(ourFirstName) ||
              mText === ourNameLower
            ) {
              return true;
            }
          }
          // Text-based fallback
          if (text && text.toLowerCase().includes(ourFirstName)) return true;
          return false;
        }

        // Helper: extract comment data from element
        function extractCommentData(el, isReply = false, isReplyToUs = false) {
          const commentId = el.getAttribute(commentIdAttr) || "";
          const profileLink = el.querySelector(profileLinkSel);
          const profileUrl = profileLink
            ? profileLink.getAttribute("href")?.split("?")[0] || ""
            : "";

          const nameEl = el.querySelector(authorNameSel);
          const name = nameEl ? (nameEl.textContent || "").trim() : "";

          const titleEl = el.querySelector(authorTitleSel);
          const title = titleEl ? (titleEl.textContent || "").trim() : "";

          const metaData = el.querySelector(metaDescSel);
          const metaText = metaData ? metaData.textContent || "" : "";
          const isOwn =
            metaText.includes(ownMarker) || name.toLowerCase() === ourNameLower;

          const badgeEl = el.querySelector(authorBadgeSel);
          const isPostAuthor =
            (badgeEl &&
              (badgeEl.textContent || "").trim().toLowerCase() ===
                authorText) ||
            (!isOwn && name.toLowerCase().includes(targetFirstName));

          const textEl = el.querySelector(contentSel);
          const text = textEl ? (textEl.textContent || "").trim() : "";

          return {
            commentId,
            name,
            title,
            profileUrl: profileUrl.startsWith("http")
              ? profileUrl
              : profileUrl
                ? "https://www.linkedin.com" + profileUrl
                : "",
            text,
            isOwn,
            isPostAuthor,
            isReply,
            isReplyToUs,
            mentionsUs: mentionsUs(el, text),
          };
        }

        // Get top-level comments
        const allCommentEls = document.querySelectorAll(commentItemSel);
        const topLevelCommentEls = Array.from(allCommentEls).filter((el) => {
          for (const containerSel of repliesContainerSels) {
            if (el.closest(containerSel)) return false;
          }
          return true;
        });

        result.totalComments = topLevelCommentEls.length;

        topLevelCommentEls.forEach((commentEl) => {
          const data = extractCommentData(commentEl, false, false);
          if (!data.text) return;

          result.fullThread.push({
            ...data,
            level: 0,
          });

          // Categorize top-level comment
          if (data.isOwn) {
            result.ourCommentFound = true;
            result.ourCommentText = data.text;
            result.ourCommentId = data.commentId;
          } else if (data.isPostAuthor && data.mentionsUs) {
            // SCENARIO B: Author mentioned us in their OWN top-level comment
            const isFromTargetAuthor =
              data.name.toLowerCase().includes(targetFirstName) ||
              targetAuthorName
                .toLowerCase()
                .includes(data.name.toLowerCase().split(" ")[0]);

            if (isFromTargetAuthor) {
              result.authorMentions.push({
                commentId: data.commentId,
                text: data.text,
                isReply: false,
                authorName: data.name,
              });
            }
          } else if (data.mentionsUs && !data.isOwn && !data.isPostAuthor) {
            // SCENARIO C: Non-author mentioned us in top-level comment
            result.mentions.push({
              commentId: data.commentId,
              userName: data.name,
              userTitle: data.title,
              userProfileUrl: data.profileUrl,
              commentText: data.text,
              isReply: false,
              isReplyToUs: false,
            });
          }

          // Check nested replies
          const repliesContainer = commentEl.querySelector(repliesContainerSel);
          if (repliesContainer) {
            const replyEls = repliesContainer.querySelectorAll(replyEntitySel);

            replyEls.forEach((replyEl) => {
              const isNestedUnderOurComment = data.isOwn;
              const replyData = extractCommentData(
                replyEl,
                true,
                isNestedUnderOurComment,
              );
              if (!replyData.text) return;

              result.fullThread.push({
                ...replyData,
                level: 1,
                parentCommentId: data.commentId,
              });

              if (replyData.isOwn) {
                // Our nested reply — ignore
                return;
              }

              if (isNestedUnderOurComment && replyData.isPostAuthor) {
                // SCENARIO A: Author replied UNDER our comment
                // STRICT: verify the reply is FROM the target author (not just any author-badge holder)
                const isFromTargetAuthor =
                  replyData.name.toLowerCase().includes(targetFirstName) ||
                  targetAuthorName
                    .toLowerCase()
                    .includes(replyData.name.toLowerCase().split(" ")[0]);

                if (isFromTargetAuthor) {
                  result.authorReplied = true;
                  result.authorReplyText = replyData.text;
                  result.authorReplyId = replyData.commentId;
                  result.authorReplyIsNested = true;
                  result.authorReplyName = replyData.name; // ← NEW: verify at controller level
                }
              } else if (replyData.isPostAuthor && replyData.mentionsUs) {
                // SCENARIO B: Author mentioned us elsewhere
                const isFromTargetAuthor =
                  replyData.name.toLowerCase().includes(targetFirstName) ||
                  targetAuthorName
                    .toLowerCase()
                    .includes(replyData.name.toLowerCase().split(" ")[0]);

                if (isFromTargetAuthor) {
                  result.authorMentions.push({
                    commentId: replyData.commentId,
                    text: replyData.text,
                    isReply: true,
                    authorName: replyData.name,
                  });
                }
              } else if (
                !replyData.isPostAuthor &&
                (isNestedUnderOurComment || replyData.mentionsUs)
              ) {
                // SCENARIO D/E: Non-author replied to our comment OR mentioned us
                result.mentions.push({
                  commentId: replyData.commentId,
                  userName: replyData.name,
                  userTitle: replyData.title,
                  userProfileUrl: replyData.profileUrl,
                  commentText: replyData.text,
                  isReply: true,
                  isReplyToUs: isNestedUnderOurComment,
                });
              }
            });
          }
        });

        // Fallback: if no nested author reply, but author replied top-level
        // if (!result.authorReplied) {
        //   for (const comment of result.fullThread) {
        //     if (comment.isPostAuthor && !comment.isOwn && comment.level === 0) {
        //       result.authorReplied = true;
        //       result.authorReplyText = comment.text;
        //       result.authorReplyId = comment.commentId;
        //       result.authorReplyIsNested = false;
        //       break;
        //     }
        //   }
        // }

        return result;
      },
      {
        targetAuthorName: authorName,
        ourName,
        commentItemSels: SELECTORS.commentsSection.commentItem,
        repliesContainerSels: SELECTORS.commentChecker.repliesContainer,
        replyEntitySels: SELECTORS.commentChecker.replyEntity,
        commentIdAttr: SELECTORS.commentChecker.commentIdAttr,
        authorNameSel: SELECTORS.commentsSection.commentAuthorName,
        authorTitleSel: SELECTORS.commentsSection.commentAuthorTitle,
        profileLinkSel: SELECTORS.commentsSection.commentAuthorLink,
        metaDescSel: SELECTORS.commentsSection.commentMetaDescription,
        authorBadgeSel: SELECTORS.commentsSection.commentAuthorBadge,
        contentSels: SELECTORS.commentChecker.contentSelector,
        mentionSels: SELECTORS.commentChecker.mentionSelector,
        ownMarker: SELECTORS.commentChecker.ownCommentMarker,
        authorText: SELECTORS.commentChecker.authorBadgeText,
      },
    );

    console.log(`   📊 Total top-level comments: ${analysis.totalComments}`);
    console.log(`   📊 Our comment found: ${analysis.ourCommentFound}`);
    console.log(
      `   📊 Author replied: ${analysis.authorReplied}${analysis.authorReplyIsNested ? " (nested under our comment)" : ""}`,
    );
    console.log(`   📊 Author mentions: ${analysis.authorMentions.length}`);
    console.log(
      `   📊 3rd-party mentions/replies: ${analysis.mentions.length}`,
    );

    if (analysis.mentions.length > 0) {
      analysis.mentions.forEach((m, i) => {
        console.log(
          `      💬 ${i + 1}: ${m.userName} ${m.isReplyToUs ? "(replied to us)" : m.isReply ? "(nested reply)" : "(top-level mention)"}`,
        );
      });
    }

    return analysis;
  } catch (err) {
    console.log(`   ❌ Comment check failed: ${err.message}`);
    return { error: err.message };
  }
}
