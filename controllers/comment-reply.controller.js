// import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
// import { checkSession } from "../services/browser/session.service.js";
// import { checkAuthorReplyOnPost } from "../services/linkedin/comment-checker.service.js";
// import { replyToSpecificComment } from "../services/linkedin/post-commenter.service.js";
// import { resolvePostUrl } from "../services/linkedin/post-url-resolver.service.js";
// import { generateCommentReply } from "../services/ai/comment-reply-generator.service.js";
// import {
//   getOrCreateThread,
//   addReplyToThread,
//   markThreadChecked,
// } from "../services/database/comment-thread.service.js";
// import { updateLeadStatus, upsertLead } from "../services/database/lead-db.service.js";
// import { updateLeadInSheet, appendToSheet, buildLeadRow } from "../services/integrations/google-sheets.service.js";
// import { connectDB } from "../services/database/mongodb.service.js";
// import { randomDelay } from "../helpers/delay.helper.js";
// import Lead from "../models/Lead.model.js";
// import PostCommentThread from "../models/PostCommentThread.model.js";

// const MAX_REPLIES_PER_RUN = 5;
// const MAX_POSTS_TO_CHECK = 15;
// const COOLDOWN_MIN_SEC = 45;
// const COOLDOWN_MAX_SEC = 120;
// const OUR_NAME = "Abhilash Chaurasiya"; // Your LinkedIn display name

// export async function processCommentReplies(accountId, actuallySend = false) {
//   console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
//   console.log(`║  COMMENT REPLY PROCESSOR — ${accountId.padEnd(31)}║`);
//   console.log(`║  Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`);
//   console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

//   await connectDB();

//   const commentedLeads = await Lead.find({
//     accountId,
//     postUrl: { $exists: true, $ne: "" },
//     status: {
//       $in: [
//         "commented", "connection_sent", "connection_and_message_sent",
//         "accepted", "message_sent", "replied", "interested", "pending_acceptance",
//       ],
//     },
//   })
//     .sort({ createdAt: -1 })
//     .limit(MAX_POSTS_TO_CHECK);

//   console.log(`📊 Found ${commentedLeads.length} leads with commented posts to check\n`);

//   if (commentedLeads.length === 0) {
//     console.log(`   ℹ️  No commented posts to check\n`);
//     return;
//   }

//   const { context, page } = await launchBrowser(accountId);

//   const stats = {
//     checked: 0,
//     authorReplied: 0,
//     mentionsFound: 0,
//     repliedToAuthor: 0,
//     repliedToMentions: 0,
//     newLeadsFromMentions: 0,
//     skipped: 0,
//     failed: 0,
//     alreadyResponded: 0,
//     noReply: 0,
//     urlResolved: 0,
//   };

//   try {
//     if (!(await checkSession(page))) {
//       console.log(`❌ Session expired`);
//       return;
//     }

//     let repliesSent = 0;

//     for (let i = 0; i < commentedLeads.length; i++) {
//       if (repliesSent >= MAX_REPLIES_PER_RUN) {
//         console.log(`\n⛔ Reached max replies per run (${MAX_REPLIES_PER_RUN})`);
//         break;
//       }

//       const lead = commentedLeads[i];

//       console.log(`\n${"━".repeat(63)}`);
//       console.log(`[${i + 1}/${commentedLeads.length}] ${lead.name}`);
//       console.log(`📍 Post: ${(lead.postUrl || "").substring(0, 80)}`);
//       console.log(`${"━".repeat(63)}`);

//       try {
//         if (page.isClosed()) {
//           console.log(`❌ Page closed — aborting`);
//           break;
//         }

//         // ═══════════════════════════════════════════════════════
//         // STEP 1: Resolve post URL to proper /feed/update/ format
//         // ═══════════════════════════════════════════════════════
//         let cleanPostUrl = lead.postUrl;

//         // If URL is already resolved (contains /feed/update/), skip resolution
//         if (!lead.postUrl.includes("/feed/update/urn:li:activity:")) {
//           console.log(`\n🔗 STEP 1: Resolving post URL...`);
//           cleanPostUrl = await resolvePostUrl(page, lead.postUrl);

//           if (cleanPostUrl && cleanPostUrl !== lead.postUrl) {
//             // Save clean URL to DB
//             await updateLeadStatus(lead.profileUrl, lead.status, {
//               postUrl: cleanPostUrl,
//             });
//             // Update sheet
//             try {
//               await updateLeadInSheet(lead.profileUrl, {
//                 N: cleanPostUrl,
//               });
//             } catch {}
//             stats.urlResolved++;
//             console.log(`   💾 Saved clean URL to DB + Sheet`);
//             lead.postUrl = cleanPostUrl;
//           }
//         } else {
//           console.log(`\n🔗 STEP 1: URL already in correct format`);
//           // Navigate to it
//           await page.goto(cleanPostUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
//           await randomDelay(3000, 5000);
//         }

//         // ═══════════════════════════════════════════════════════
//         // STEP 2: Check for author reply + mentions
//         // ═══════════════════════════════════════════════════════
//         stats.checked++;

//         const commentInfo = await checkAuthorReplyOnPost(
//           page,
//           cleanPostUrl,
//           lead.name,
//           OUR_NAME,
//         );

//         if (commentInfo.error) {
//           console.log(`   ⚠️  Error checking: ${commentInfo.error}`);
//           stats.failed++;
//           continue;
//         }

//         // Get or create thread record
//         const thread = await getOrCreateThread(
//           lead._id,
//           lead.profileUrl,
//           lead.name,
//           cleanPostUrl,
//           lead.postContent,
//           commentInfo.ourCommentText || lead.aiAnalysis?.generatedComment || "",
//           accountId,
//         );

//         let didReplyThisRound = false;

//         // ═══════════════════════════════════════════════════════
//         // SCENARIO 1: Author replied to our comment
//         // ═══════════════════════════════════════════════════════
//         if (commentInfo.authorReplied) {
//           stats.authorReplied++;
//           console.log(`\n💌 SCENARIO 1: Author (${lead.name}) replied to our comment`);

//           // Check if we already responded to this reply
//           const alreadyResponded = thread.replies.some(
//             (r) => r.sender === "them" && r.text.trim() === commentInfo.authorReplyText.trim(),
//           ) && thread.replies.some(
//             (r) => r.sender === "us" && r.timestamp > thread.lastAuthorReplyAt,
//           );

//           if (alreadyResponded) {
//             console.log(`   ✅ Already responded to this reply — skip`);
//             stats.alreadyResponded++;
//           } else {
//             // Save author reply to thread
//             const alreadyLogged = thread.replies.some(
//               (r) => r.sender === "them" && r.text.trim() === commentInfo.authorReplyText.trim(),
//             );
//             if (!alreadyLogged) {
//               await addReplyToThread(thread._id, "them", commentInfo.authorReplyText, false);
//             }

//             // Generate AI reply
//             console.log(`\n🤖 Generating AI reply to author...`);
//             const replyText = await generateCommentReply(
//               lead.postContent || "",
//               commentInfo.ourCommentText || "",
//               commentInfo.authorReplyText,
//               lead.name,
//             );

//             if (!replyText) {
//               console.log(`   ⚠️  AI reply generation failed`);
//               stats.failed++;
//             } else {
//               console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

//               if (!actuallySend) {
//                 console.log(`   ⚠️  Safe mode — NOT posting`);
//                 stats.skipped++;
//               } else {
//                 const replyResult = await replyToSpecificComment(
//                   page, lead.name, replyText, true, commentInfo.authorReplyId,
//                 );

//                 if (replyResult.success) {
//                   stats.repliedToAuthor++;
//                   repliesSent++;
//                   didReplyThisRound = true;
//                   console.log(`   ✅ Replied to ${lead.name}!`);

//                   await addReplyToThread(thread._id, "us", replyText, true);
//                   await updateLeadStatus(lead.profileUrl, lead.status, {
//                     aiAnalysis: {
//                       ...(lead.aiAnalysis || {}),
//                       lastCommentReplyAt: new Date(),
//                       commentReplyText: replyText,
//                     },
//                   });

//                   try {
//                     await updateLeadInSheet(lead.profileUrl, {
//                       AR: `Comment reply to author: ${replyText.substring(0, 100)}`,
//                     });
//                   } catch {}
//                 } else {
//                   console.log(`   ❌ Reply failed: ${replyResult.reason}`);
//                   stats.failed++;
//                 }
//               }
//             }
//           }
//         }

//         // ═══════════════════════════════════════════════════════
//         // SCENARIO 2: Other users mentioned us in their comments
//         // ═══════════════════════════════════════════════════════
//         if (commentInfo.mentions && commentInfo.mentions.length > 0) {
//           console.log(`\n💬 SCENARIO 2: ${commentInfo.mentions.length} user(s) mentioned us`);
//           stats.mentionsFound += commentInfo.mentions.length;

//           for (const mention of commentInfo.mentions) {
//             if (repliesSent >= MAX_REPLIES_PER_RUN) break;

//             console.log(`\n   👤 Processing mention from: ${mention.userName}`);
//             console.log(`   💬 Their comment: "${mention.commentText.substring(0, 100)}..."`);

//             // Check if we already replied to this specific comment
//             const alreadyRepliedToMention = thread.replies.some(
//               (r) => r.sender === "us" &&
//                      r.text.includes(mention.userName.split(" ")[0]) &&
//                      r.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
//             );

//             if (alreadyRepliedToMention) {
//               console.log(`   ✅ Already replied to this mention — skip`);
//               continue;
//             }

//             // Save as new lead if not exists
//             if (mention.userProfileUrl) {
//               const existingMentionLead = await Lead.findOne({
//                 profileUrl: mention.userProfileUrl,
//               });

//               if (!existingMentionLead) {
//                 console.log(`   💾 Saving new lead: ${mention.userName}`);

//                 const newLead = await upsertLead({
//                   name: mention.userName,
//                   profileUrl: mention.userProfileUrl,
//                   title: mention.userTitle || "",
//                   discoveredFrom: "comment_mention",
//                   searchKeyword: `Mentioned us on ${lead.name}'s post`,
//                   postContent: lead.postContent || "",
//                   postUrl: cleanPostUrl,
//                   conversionScore: 65, // Warm — they engaged with us
//                   scoreCategory: "warm",
//                   scoreReasons: [`Mentioned us in comment on ${lead.name}'s post`],
//                   accountId,
//                   status: "discovered",
//                   aiAnalysis: {
//                     mentionSource: lead.profileUrl,
//                     mentionText: mention.commentText.substring(0, 500),
//                   },
//                 });

//                 stats.newLeadsFromMentions++;

//                 // Push to sheet
//                 try {
//                   const row = buildLeadRow({
//                     ...newLead.toObject(),
//                     aiAnalysis: {
//                       ...newLead.aiAnalysis,
//                       generatedComment: `Mentioned us in comment on ${lead.name}'s post`,
//                     },
//                   });
//                   await appendToSheet("Leads", [row]);
//                   console.log(`   📊 Added to Google Sheet`);
//                 } catch (err) {
//                   console.log(`   ⚠️  Sheet append failed: ${err.message}`);
//                 }
//               } else {
//                 console.log(`   ℹ️  Lead already exists in DB`);
//               }
//             }

//             // Generate reply to mentioner
//             console.log(`   🤖 Generating reply to ${mention.userName}...`);
//             const replyText = await generateCommentReply(
//               lead.postContent || "",
//               commentInfo.ourCommentText || "",
//               mention.commentText,
//               mention.userName,
//             );

//             if (!replyText) {
//               console.log(`   ⚠️  AI reply generation failed`);
//               continue;
//             }

//             console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

//             if (!actuallySend) {
//               console.log(`   ⚠️  Safe mode — NOT posting`);
//               stats.skipped++;
//               continue;
//             }

//             // Post reply to mentioner's comment
//             const replyResult = await replyToSpecificComment(
//               page, mention.userName, replyText, true,mention.commentId,
//             );

//             if (replyResult.success) {
//               stats.repliedToMentions++;
//               repliesSent++;
//               didReplyThisRound = true;
//               console.log(`   ✅ Replied to ${mention.userName}!`);

//               await addReplyToThread(thread._id, "us", replyText, true);
//             } else {
//               console.log(`   ❌ Reply failed: ${replyResult.reason}`);
//               stats.failed++;
//             }

//             // Cooldown between multiple replies on same post
//             await randomDelay(15000, 25000);
//           }
//         }

//         // ═══════════════════════════════════════════════════════
//         // No action needed
//         // ═══════════════════════════════════════════════════════
//         if (!commentInfo.authorReplied && commentInfo.mentions.length === 0) {
//           console.log(`   ℹ️  No author reply, no mentions — skip`);
//           await markThreadChecked(thread._id);
//           stats.noReply++;
//         }

//         // Cooldown between posts
//         if (didReplyThisRound) {
//           const cd = COOLDOWN_MIN_SEC + Math.floor(Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC));
//           console.log(`\n⏰ Cooling ${cd}s before next post...`);
//           await new Promise((r) => setTimeout(r, cd * 1000));
//         } else {
//           await randomDelay(10000, 20000);
//         }
//       } catch (err) {
//         console.log(`   ❌ Error: ${err.message}`);
//         stats.failed++;
//         if (err.message.includes("browser has been closed")) {
//           console.log(`   💥 Browser died — stopping`);
//           break;
//         }
//       }
//     }

//     console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
//     console.log(`║  COMMENT REPLY PROCESSOR COMPLETE                          ║`);
//     console.log(`║                                                            ║`);
//     console.log(`║  📥 Posts checked: ${String(stats.checked).padEnd(39)}║`);
//     console.log(`║  🔗 URLs resolved: ${String(stats.urlResolved).padEnd(39)}║`);
//     console.log(`║  💌 Author replied: ${String(stats.authorReplied).padEnd(38)}║`);
//     console.log(`║  💬 Mentions found: ${String(stats.mentionsFound).padEnd(38)}║`);
//     console.log(`║  ✅ Replied to authors: ${String(stats.repliedToAuthor).padEnd(34)}║`);
//     console.log(`║  ✅ Replied to mentions: ${String(stats.repliedToMentions).padEnd(33)}║`);
//     console.log(`║  🆕 New leads from mentions: ${String(stats.newLeadsFromMentions).padEnd(29)}║`);
//     console.log(`║  ✅ Already responded: ${String(stats.alreadyResponded).padEnd(35)}║`);
//     console.log(`║  ℹ️  No reply yet: ${String(stats.noReply).padEnd(39)}║`);
//     console.log(`║  ⏭️  Skipped: ${String(stats.skipped).padEnd(44)}║`);
//     console.log(`║  ❌ Failed: ${String(stats.failed).padEnd(47)}║`);
//     console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
//   } catch (err) {
//     console.error(`❌ Fatal: ${err.message}`);
//     console.error(err.stack);
//   } finally {
//     await closeBrowser(context);
//     console.log(`🔒 Browser closed\n`);
//   }
// }

import {
  launchBrowser,
  closeBrowser,
} from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { checkAuthorReplyOnPost } from "../services/linkedin/comment-checker.service.js";
import { replyToSpecificComment } from "../services/linkedin/post-commenter.service.js";
import { resolvePostUrl } from "../services/linkedin/post-url-resolver.service.js";
import {
  generateCommentReply,
  qualifyCommenterAsLead,
} from "../services/ai/comment-reply-generator.service.js";
import {
  getOrCreateThread,
  addReplyToThread,
  markThreadChecked,
} from "../services/database/comment-thread.service.js";
import {
  updateLeadStatus,
  upsertLead,
} from "../services/database/lead-db.service.js";
import {
  updateLeadInSheet,
  appendToSheet,
  buildLeadRow,
} from "../services/integrations/google-sheets.service.js";
import { connectDB } from "../services/database/mongodb.service.js";
import { randomDelay } from "../helpers/delay.helper.js";
import Lead from "../models/Lead.model.js";

const MAX_REPLIES_PER_RUN = 5;
const MAX_POSTS_TO_CHECK = 15;
const COOLDOWN_MIN_SEC = 45;
const COOLDOWN_MAX_SEC = 120;
const OUR_NAME = "Abhilash Chaurasiya";

export async function processCommentReplies(accountId, actuallySend = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  COMMENT REPLY PROCESSOR — ${accountId.padEnd(31)}║`);
  console.log(
    `║  Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();

  const commentedLeads = await Lead.find({
    accountId,
    postUrl: { $exists: true, $ne: "" },
    status: {
      $in: [
        "commented",
        "connection_sent",
        "connection_and_message_sent",
        "accepted",
        "message_sent",
        "replied",
        "interested",
        "pending_acceptance",
      ],
    },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_POSTS_TO_CHECK);

  console.log(
    `📊 Found ${commentedLeads.length} leads with commented posts to check\n`,
  );

  if (commentedLeads.length === 0) {
    console.log(`   ℹ️  No commented posts to check\n`);
    return;
  }

  const { context, page } = await launchBrowser(accountId);

  const stats = {
    checked: 0,
    urlResolved: 0,
    authorReplies: 0,
    authorMentions: 0,
    thirdPartyEngagements: 0,
    repliesToAuthor: 0,
    repliesToAuthorMentions: 0,
    repliesToThirdParty: 0,
    newLeadsFromMentions: 0,
    leadsQualified: 0,
    leadsNotQualified: 0,
    skipped: 0,
    failed: 0,
    alreadyResponded: 0,
    noEngagement: 0,
  };

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    let repliesSent = 0;

    for (let i = 0; i < commentedLeads.length; i++) {
      if (repliesSent >= MAX_REPLIES_PER_RUN) {
        console.log(
          `\n⛔ Reached max replies per run (${MAX_REPLIES_PER_RUN})`,
        );
        break;
      }

      const lead = commentedLeads[i];

      console.log(`\n${"━".repeat(63)}`);
      console.log(`[${i + 1}/${commentedLeads.length}] ${lead.name}`);
      console.log(`📍 Post: ${(lead.postUrl || "").substring(0, 80)}`);
      console.log(`${"━".repeat(63)}`);

      try {
        if (page.isClosed()) {
          console.log(`❌ Page closed — aborting`);
          break;
        }

        // ═══ STEP 1: Resolve post URL ═══
        let cleanPostUrl = lead.postUrl;
        if (!lead.postUrl.includes("/feed/update/urn:li:activity:")) {
          console.log(`\n🔗 STEP 1: Resolving post URL...`);
          cleanPostUrl = await resolvePostUrl(page, lead.postUrl);
          if (cleanPostUrl && cleanPostUrl !== lead.postUrl) {
            await updateLeadStatus(lead.profileUrl, lead.status, {
              postUrl: cleanPostUrl,
            });
            try {
              await updateLeadInSheet(lead.profileUrl, { N: cleanPostUrl });
            } catch {}
            stats.urlResolved++;
            lead.postUrl = cleanPostUrl;
          }
        } else {
          console.log(`\n🔗 STEP 1: URL already in correct format`);
          await page.goto(cleanPostUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await randomDelay(3000, 5000);
        }

        // ═══ STEP 2: Analyze comments ═══
        stats.checked++;
        const commentInfo = await checkAuthorReplyOnPost(
          page,
          cleanPostUrl,
          lead.name,
          OUR_NAME,
        );

        if (commentInfo.error) {
          console.log(`   ⚠️  Error checking: ${commentInfo.error}`);
          stats.failed++;
          continue;
        }

        // ═══ CRITICAL: Skip if our comment isn't found ═══
        // Without our comment, we don't have context for a reply
        // This prevents replying to wrong comments (e.g., if LinkedIn hid our comment)
        if (!commentInfo.ourCommentFound) {
          console.log(
            `   ⚠️  Our comment not found on this post — skipping to avoid wrong reply`,
          );
          stats.skipped++;
          await randomDelay(5000, 10000);
          continue;
        }

        // Get or create thread record
        const thread = await getOrCreateThread(
          lead._id,
          lead.profileUrl,
          lead.name,
          cleanPostUrl,
          lead.postContent,
          commentInfo.ourCommentText || lead.aiAnalysis?.generatedComment || "",
          accountId,
        );

        let didReplyThisRound = false;

        // ═══════════════════════════════════════════════════════
        // SCENARIO A: Author replied UNDER our comment (priority 1)
        // ═══════════════════════════════════════════════════════
        if (commentInfo.authorReplied) {
          stats.authorReplies++;
          console.log(
            `\n💌 SCENARIO A: Author (${lead.name}) replied to our comment`,
          );

          const alreadyResponded =
            thread.replies.some(
              (r) =>
                r.sender === "them" &&
                r.text.trim() === commentInfo.authorReplyText.trim(),
            ) &&
            thread.replies.some(
              (r) =>
                r.sender === "us" && r.timestamp > thread.lastAuthorReplyAt,
            );

          if (alreadyResponded) {
            console.log(`   ✅ Already responded — skip`);
            stats.alreadyResponded++;
          } else {
            const alreadyLogged = thread.replies.some(
              (r) =>
                r.sender === "them" &&
                r.text.trim() === commentInfo.authorReplyText.trim(),
            );
            if (!alreadyLogged) {
              await addReplyToThread(
                thread._id,
                "them",
                commentInfo.authorReplyText,
                false,
              );
            }

            console.log(
              `\n🤖 Generating reply to author (tone: author_engagement)...`,
            );
            const replyText = await generateCommentReply({
              postContent: lead.postContent || "",
              postAuthor: lead.name,
              fullThread: commentInfo.fullThread,
              targetComment: {
                text: commentInfo.authorReplyText,
                commentId: commentInfo.authorReplyId,
              },
              targetName: lead.name,
              tone: "author_engagement",
              ourName: OUR_NAME,
            });

            if (!replyText) {
              console.log(`   ⚠️  AI failed`);
              stats.failed++;
            } else {
              console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

              if (!actuallySend) {
                console.log(`   ⚠️  Safe mode — NOT posting`);
                stats.skipped++;
              } else {
                const replyResult = await replyToSpecificComment(
                  page,
                  lead.name,
                  replyText,
                  true,
                  commentInfo.authorReplyId,
                );

                if (replyResult.success) {
                  stats.repliesToAuthor++;
                  repliesSent++;
                  didReplyThisRound = true;
                  console.log(`   ✅ Replied to ${lead.name}!`);

                  await addReplyToThread(thread._id, "us", replyText, true);
                  await updateLeadStatus(lead.profileUrl, lead.status, {
                    aiAnalysis: {
                      ...(lead.aiAnalysis || {}),
                      lastCommentReplyAt: new Date(),
                      commentReplyText: replyText,
                    },
                  });
                  try {
                    await updateLeadInSheet(lead.profileUrl, {
                      AR: `Comment reply to author: ${replyText.substring(0, 100)}`,
                    });
                  } catch {}
                } else {
                  console.log(`   ❌ Reply failed: ${replyResult.reason}`);
                  stats.failed++;
                }
              }
            }
          }
        }

        // ═══════════════════════════════════════════════════════
        // SCENARIO B: Author mentioned us in their comments elsewhere
        // ═══════════════════════════════════════════════════════
        if (
          commentInfo.authorMentions &&
          commentInfo.authorMentions.length > 0
        ) {
          console.log(
            `\n💌 SCENARIO B: Author mentioned us in ${commentInfo.authorMentions.length} comment(s)`,
          );
          stats.authorMentions += commentInfo.authorMentions.length;

          for (const mention of commentInfo.authorMentions) {
            if (repliesSent >= MAX_REPLIES_PER_RUN) break;

            const alreadyReplied = thread.replies.some(
              (r) =>
                r.sender === "us" &&
                r.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                r.metadata?.replyToCommentId === mention.commentId,
            );
            if (alreadyReplied) {
              console.log(
                `   ✅ Already replied to this author mention — skip`,
              );
              continue;
            }

            console.log(
              `\n🤖 Generating reply to author mention (tone: author_engagement)...`,
            );
            const replyText = await generateCommentReply({
              postContent: lead.postContent || "",
              postAuthor: lead.name,
              fullThread: commentInfo.fullThread,
              targetComment: {
                text: mention.text,
                commentId: mention.commentId,
              },
              targetName: lead.name,
              tone: "author_engagement",
              ourName: OUR_NAME,
            });

            if (!replyText) continue;
            console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

            if (!actuallySend) {
              stats.skipped++;
              continue;
            }

            const replyResult = await replyToSpecificComment(
              page,
              lead.name,
              replyText,
              true,
              mention.commentId,
            );

            if (replyResult.success) {
              stats.repliesToAuthorMentions++;
              repliesSent++;
              didReplyThisRound = true;
              console.log(`   ✅ Replied to author mention!`);
              await addReplyToThread(thread._id, "us", replyText, true);
            } else {
              stats.failed++;
            }

            await randomDelay(15000, 25000);
          }
        }

        // ═══════════════════════════════════════════════════════
        // SCENARIO C/D/E: Non-author mentions/replies
        // ═══════════════════════════════════════════════════════
        if (commentInfo.mentions && commentInfo.mentions.length > 0) {
          console.log(
            `\n💬 SCENARIO C/D/E: ${commentInfo.mentions.length} 3rd-party engagement(s)`,
          );
          stats.thirdPartyEngagements += commentInfo.mentions.length;

          for (const mention of commentInfo.mentions) {
            if (repliesSent >= MAX_REPLIES_PER_RUN) break;

            console.log(`\n   👤 Processing: ${mention.userName}`);
            console.log(
              `   📝 Their text: "${mention.commentText.substring(0, 100)}..."`,
            );
            console.log(`   💼 Title: ${mention.userTitle || "N/A"}`);
            console.log(
              `   🔗 Type: ${mention.isReplyToUs ? "reply-to-us" : mention.isReply ? "nested-reply" : "top-level-mention"}`,
            );

            const alreadyRepliedToMention = thread.replies.some(
              (r) =>
                r.sender === "us" &&
                r.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                r.metadata?.replyToCommentId === mention.commentId,
            );
            if (alreadyRepliedToMention) {
              console.log(`   ✅ Already replied — skip`);
              continue;
            }

            // ─── Qualify as lead ───
            console.log(`   🎯 Qualifying as lead...`);
            const qualification = await qualifyCommenterAsLead({
              userName: mention.userName,
              userTitle: mention.userTitle,
              commentText: mention.commentText,
              postContent: lead.postContent || "",
            });

            console.log(
              `   📊 Qualification: ${qualification.category} (${qualification.score}%) — ${qualification.reason}`,
            );

            // ─── Save as lead if qualified ───
            if (qualification.isLead && mention.userProfileUrl) {
              const existingLead = await Lead.findOne({
                profileUrl: mention.userProfileUrl,
              });

              if (!existingLead) {
                console.log(
                  `   💾 Saving as new lead (${qualification.category})`,
                );
                const newLead = await upsertLead({
                  name: mention.userName,
                  profileUrl: mention.userProfileUrl,
                  title: mention.userTitle || "",
                  discoveredFrom: "comment_mention",
                  searchKeyword: `Engaged on ${lead.name}'s post`,
                  postContent: lead.postContent || "",
                  postUrl: cleanPostUrl,
                  conversionScore: qualification.score,
                  scoreCategory: qualification.category,
                  scoreReasons: [qualification.reason],
                  accountId,
                  status: "discovered",
                  aiAnalysis: {
                    mentionSource: lead.profileUrl,
                    mentionText: mention.commentText.substring(0, 500),
                    qualificationReason: qualification.reason,
                  },
                });
                stats.newLeadsFromMentions++;
                stats.leadsQualified++;

                try {
                  const row = buildLeadRow({
                    ...newLead.toObject(),
                    aiAnalysis: {
                      ...newLead.aiAnalysis,
                      generatedComment: `Qualified from comment on ${lead.name}'s post`,
                    },
                  });
                  await appendToSheet("Leads", [row]);
                  console.log(`   📊 Added to Google Sheet`);
                } catch (err) {
                  console.log(`   ⚠️  Sheet append failed: ${err.message}`);
                }
              } else {
                console.log(`   ℹ️  Lead already exists in DB`);
              }
            } else if (!qualification.isLead) {
              stats.leadsNotQualified++;
              console.log(`   ℹ️  Not qualified as lead — will still reply`);
            }

            // ─── Generate reply with appropriate tone ───
            const tone = qualification.isLead
              ? "warm_lead"
              : "friendly_acknowledgment";
            console.log(`   🤖 Generating reply (tone: ${tone})...`);

            const replyText = await generateCommentReply({
              postContent: lead.postContent || "",
              postAuthor: lead.name,
              fullThread: commentInfo.fullThread,
              targetComment: {
                text: mention.commentText,
                commentId: mention.commentId,
              },
              targetName: mention.userName,
              tone,
              ourName: OUR_NAME,
            });

            if (!replyText) {
              console.log(`   ⚠️  AI reply generation failed`);
              continue;
            }

            console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

            if (!actuallySend) {
              console.log(`   ⚠️  Safe mode — NOT posting`);
              stats.skipped++;
              continue;
            }

            const replyResult = await replyToSpecificComment(
              page,
              mention.userName,
              replyText,
              true,
              mention.commentId,
            );

            if (replyResult.success) {
              stats.repliesToThirdParty++;
              repliesSent++;
              didReplyThisRound = true;
              console.log(`   ✅ Replied to ${mention.userName}!`);
              await addReplyToThread(thread._id, "us", replyText, true);
            } else {
              console.log(`   ❌ Reply failed: ${replyResult.reason}`);
              stats.failed++;
            }

            await randomDelay(15000, 25000);
          }
        }

        // ═══════════════════════════════════════════════════════
        // No engagement
        // ═══════════════════════════════════════════════════════
        if (
          !commentInfo.authorReplied &&
          (commentInfo.authorMentions || []).length === 0 &&
          (commentInfo.mentions || []).length === 0
        ) {
          console.log(`   ℹ️  No engagement — skip`);
          await markThreadChecked(thread._id);
          stats.noEngagement++;
        }

        // Cooldown
        if (didReplyThisRound) {
          const cd =
            COOLDOWN_MIN_SEC +
            Math.floor(Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC));
          console.log(`\n⏰ Cooling ${cd}s before next post...`);
          await new Promise((r) => setTimeout(r, cd * 1000));
        } else {
          await randomDelay(10000, 20000);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        stats.failed++;
        if (err.message.includes("browser has been closed")) {
          console.log(`   💥 Browser died — stopping`);
          break;
        }
      }
    }

    // ── Final Summary ──
    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  COMMENT REPLY PROCESSOR COMPLETE                          ║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  📥 Posts checked:              ${String(stats.checked).padEnd(26)}║`,
    );
    console.log(
      `║  🔗 URLs resolved:              ${String(stats.urlResolved).padEnd(26)}║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  💌 Author replied under us:    ${String(stats.authorReplies).padEnd(26)}║`,
    );
    console.log(
      `║  💌 Author mentions elsewhere:  ${String(stats.authorMentions).padEnd(26)}║`,
    );
    console.log(
      `║  💬 3rd-party engagements:      ${String(stats.thirdPartyEngagements).padEnd(26)}║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  ✅ Replied to authors:         ${String(stats.repliesToAuthor).padEnd(26)}║`,
    );
    console.log(
      `║  ✅ Replied to author mentions: ${String(stats.repliesToAuthorMentions).padEnd(26)}║`,
    );
    console.log(
      `║  ✅ Replied to 3rd parties:     ${String(stats.repliesToThirdParty).padEnd(26)}║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  🎯 Leads qualified:            ${String(stats.leadsQualified).padEnd(26)}║`,
    );
    console.log(
      `║  ⏭️  Leads not qualified:       ${String(stats.leadsNotQualified).padEnd(26)}║`,
    );
    console.log(
      `║  🆕 New leads saved:            ${String(stats.newLeadsFromMentions).padEnd(26)}║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  ✅ Already responded:          ${String(stats.alreadyResponded).padEnd(26)}║`,
    );
    console.log(
      `║  ℹ️  No engagement yet:         ${String(stats.noEngagement).padEnd(26)}║`,
    );
    console.log(
      `║  ⏭️  Skipped:                   ${String(stats.skipped).padEnd(26)}║`,
    );
    console.log(
      `║  ❌ Failed:                     ${String(stats.failed).padEnd(26)}║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`,
    );
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
    console.error(err.stack);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}
