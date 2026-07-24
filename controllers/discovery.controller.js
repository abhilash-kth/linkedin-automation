import {
  launchBrowser,
  closeBrowser,
} from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import {
  appendToSheet,
  buildLeadRow,
} from "../services/integrations/google-sheets.service.js";
import {
  searchPostsByKeyword,
  scrollToAndExpandPost,
} from "../services/linkedin/post-scraper.service.js";
import { resolvePostUrl } from "../services/linkedin/post-url-resolver.service.js";
import {
  copyPostLink,
  commentOnPost,
} from "../services/linkedin/post-commenter.service.js";
import { loadEmbedder } from "../services/ai/embedding.service.js";
import { classifyPost } from "../services/ai/lead-classifier.service.js";
import {
  generateComment,
  canCommentGlobal,
  incrementCommentCount,
  getRemainingComments,
} from "../services/ai/comment-generator.service.js";
import { getAllKeywordVectors } from "../services/database/vector-db.service.js";
import { getAllRequirementEmbeddings } from "../services/database/requirement-db.service.js";
import {
  upsertLead,
  hasCommentedOnPost,
  shouldSkipLead,
} from "../services/database/lead-db.service.js";
import {
  getCommentBlockStatus,
  setCommentBlock,
  printBlockBanner,
} from "../helpers/comment-limit-tracker.helper.js";
import { randomDelay } from "../helpers/human-behavior.helper.js";
import { connectDB } from "../services/database/mongodb.service.js";

const SIMILARITY_THRESHOLD_PERCENT = 40;
const MIN_DAYS_BETWEEN_LEAD_ACTIONS = 7;

const COMMENT_COOLDOWN_MIN_SEC = 180;
const COMMENT_COOLDOWN_MAX_SEC = 300;
const KEYWORD_COOLDOWN_MIN_SEC = 120;
const KEYWORD_COOLDOWN_MAX_SEC = 240;

// Delay between posts when NOT commenting (still saving lead)
const NO_COMMENT_POST_DELAY_MIN = 15000;
const NO_COMMENT_POST_DELAY_MAX = 30000;

export async function discoverLeads(accountId, actuallyComment = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  DISCOVERY — Account: ${accountId.padEnd(36)}║`);
  console.log(
    `║  Mode: ${(actuallyComment ? "REAL COMMENTS" : "SAFE (typed only)").padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();

  // ═══ STEP 0: Check comment block ═══
  let commentingAllowed = actuallyComment;
  if (actuallyComment) {
    const commentStatus = await canCommentGlobal(accountId);
    if (!commentStatus.allowed) {
      if (commentStatus.reason === "blocked_48h") {
        printBlockBanner(
          accountId,
          commentStatus.hoursRemaining,
          commentStatus.blockedUntil,
        );
        console.log(
          `⏸️  Commenting DISABLED — but discovery continues (save leads only)`,
        );
      } else {
        console.log(
          `⛔ Daily comment limit reached (${getRemainingComments()} remaining)`,
        );
      }
      commentingAllowed = false;
    } else {
      console.log(
        `✅ Comment status: OK (${commentStatus.remaining} remaining today)\n`,
      );
    }
  }

  console.log(`🧠 Preloading Xenova model...`);
  await loadEmbedder();

  console.log(`\n📚 Loading discovery keywords...`);
  const keywordVectors = await getAllKeywordVectors();
  if (keywordVectors.length === 0) {
    console.log(`\n❌ No keywords. Run: node scripts/embed-keywords.js\n`);
    return;
  }
  console.log(`✅ ${keywordVectors.length} keywords loaded`);

  console.log(`\n🎯 Loading requirement embeddings...`);
  const requirementEmbeddings = await getAllRequirementEmbeddings();
  if (requirementEmbeddings.length === 0) {
    console.log(
      `\n❌ No requirements. Run: node scripts/embed-requirements.js\n`,
    );
    return;
  }
  console.log(
    `✅ ${requirementEmbeddings.length} requirement embeddings loaded`,
  );
  requirementEmbeddings.forEach((r, i) =>
    console.log(`   ${i + 1}. ${r.label}`),
  );

  const { context, page } = await launchBrowser(accountId);

  const stats = {
    postsScanned: 0,
    highScorePosts: 0,
    skippedAlreadyCommented: 0,
    skippedDuplicate: 0,
    newComments: 0,
    leadsSaved: 0,
    scoreDistribution: { hot: 0, warm: 0, cold: 0 },
  };

  try {
    if (!(await checkSession(page))) {
      console.log(`\n❌ Session expired\n`);
      await closeBrowser(context);
      return;
    }

    for (let kIdx = 0; kIdx < keywordVectors.length; kIdx++) {
      const kw = keywordVectors[kIdx];

      console.log(`\n${"═".repeat(63)}`);
      console.log(
        `🔑 KEYWORD ${kIdx + 1}/${keywordVectors.length}: "${kw.keyword}"`,
      );
      console.log("═".repeat(63));

      const posts = await searchPostsByKeyword(page, kw.keyword);
      stats.postsScanned += posts.length;

      if (posts.length === 0) {
        console.log(`   ⚠️  No posts found\n`);
        continue;
      }

      console.log(`   📊 Found ${posts.length} posts — processing each...\n`);

      for (let pIdx = 0; pIdx < posts.length; pIdx++) {
        const post = posts[pIdx];

        console.log(`\n${"─".repeat(63)}`);
        console.log(`📌 POST ${pIdx + 1}/${posts.length}: ${post.authorName}`);
        console.log("─".repeat(63));

        try {
          if (
            post.authorProfileUrl.includes("/me") ||
            post.authorProfileUrl.includes("/mynetwork")
          ) {
            console.log(`   ⏭️  Own profile — skip`);
            continue;
          }

          // ── 1. Human: scroll to post, simulate reading ──
          const fullContent = await scrollToAndExpandPost(page, post.index);
          const contentToScore = fullContent || post.content;

          if (!contentToScore || contentToScore.length < 30) {
            console.log(`   ⚠️  Content too short — skipping`);
            continue;
          }

          // ── 2. Score the post ──
          const classification = await classifyPost(
            contentToScore,
            requirementEmbeddings,
          );

          console.log(`   📊 Classification:`);
          classification.topMatches.forEach((m, i) => {
            const badge = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            console.log(`      ${badge} ${m.label}: ${m.score}%`);
          });

          const topScore = classification.topScore;

          if (topScore < SIMILARITY_THRESHOLD_PERCENT) {
            console.log(
              `   ⏭️  Score ${topScore}% < ${SIMILARITY_THRESHOLD_PERCENT}% — skip`,
            );
            await randomDelay(2000, 4000);
            continue;
          }

          console.log(
            `   ✅ MATCH — ${classification.topLabel} @ ${topScore}%`,
          );
          stats.highScorePosts++;

          const category =
            topScore >= 75 ? "hot" : topScore >= 65 ? "warm" : "cold";
          stats.scoreDistribution[category]++;

          // ── 3. Duplicate check ──
          if (
            await shouldSkipLead(
              post.authorProfileUrl,
              MIN_DAYS_BETWEEN_LEAD_ACTIONS,
            )
          ) {
            console.log(
              `   ⚠️  Lead processed within ${MIN_DAYS_BETWEEN_LEAD_ACTIONS} days — skip`,
            );
            stats.skippedDuplicate++;
            continue;
          }

          // ── 4. Copy post link ──
          console.log(`\n🔗 STEP 4: Copy post link`);
          const rawPostUrl = await copyPostLink(page, post.index);

          if (!rawPostUrl) {
            console.log(`   ⚠️  Failed to copy URL — skipping`);
            continue;
          }

          // ── 5. Duplicate post check ──
          if (await hasCommentedOnPost(rawPostUrl)) {
            console.log(`   ⚠️  Already commented on this post — skip`);
            stats.skippedAlreadyCommented++;
            await randomDelay(2000, 4000);
            continue;
          }

          // ── 6. Comment (if allowed) ──
          let commentText = null;
          let wasCommented = false;
          let commentBlockedThisRun = false;

          if (commentingAllowed) {
            const commentCheck = await canCommentGlobal(accountId);
            if (!commentCheck.allowed) {
              console.log(
                `   ⛔ Comment limit hit — saving lead without comment`,
              );
              commentingAllowed = false;
            } else {
              console.log(`\n✍️  STEP 5: Generate AI comment`);
              commentText = await generateComment(
                contentToScore,
                post.authorName,
              );

              if (commentText) {
                console.log(`\n💬 STEP 6: Post comment inline`);
                const commentResult = await commentOnPost(
                  page,
                  post.index,
                  commentText,
                  true,
                );

                if (commentResult.stopAllComments) {
                  console.log(`\n🛑 COMMENT RATE LIMIT — setting 48h block`);
                  const blockResult = await setCommentBlock(
                    accountId,
                    "comment_not_visible_in_dom",
                  );
                  if (blockResult) {
                    console.log(
                      `   ✅ Block set until: ${blockResult.blockedUntil.toLocaleString("en-US")}`,
                    );
                  }
                  commentingAllowed = false;
                  commentBlockedThisRun = true;
                  commentText = null;
                } else if (commentResult.success) {
                  incrementCommentCount();
                  wasCommented = true;
                  stats.newComments++;
                  console.log(`   ✅ Comment posted!`);
                }
              }
            }
          } else {
            console.log(`   ⏸️  Commenting disabled — saving lead only`);
          }

          // ── 7. Resolve URL ──
          let cleanPostUrl = rawPostUrl;
          if (
            rawPostUrl &&
            !rawPostUrl.includes("/feed/update/urn:li:activity:")
          ) {
            console.log(`\n🔗 STEP 7: Resolving URL...`);
            const resolverPage = await context.newPage();
            try {
              cleanPostUrl = await resolvePostUrl(resolverPage, rawPostUrl);
              console.log(`   ✅ Clean URL: ${cleanPostUrl.substring(0, 80)}`);
            } catch (err) {
              console.log(`   ⚠️  URL resolution failed: ${err.message}`);
              cleanPostUrl = rawPostUrl;
            } finally {
              try {
                await resolverPage.close();
              } catch {}
            }
          }

          // ── 8. Save lead to MongoDB ──
          const leadData = {
            name: post.authorName,
            profileUrl: post.authorProfileUrl,
            title: post.authorHeadline || "",
            headline: post.authorHeadline || "",
            location: "",
            email: null,
            phone: null,
            website: null,
            discoveredFrom: "post",
            searchKeyword: kw.keyword,
            postContent: contentToScore.substring(0, 2000),
            postUrl: cleanPostUrl || rawPostUrl || "",
            postTime: post.postTime || "",
            conversionScore: topScore,
            scoreCategory: category,
            scoreReasons: classification.topMatches.map(
              (m) => `${m.label}: ${m.score}%`,
            ),
            accountId,
            status: wasCommented ? "commented" : "discovered",
            commentPosted: wasCommented,
            commentText: wasCommented ? commentText : null,
            commentedAt: wasCommented ? new Date() : null,
            lastProcessedAt: new Date(),
            aiAnalysis: {
              generatedComment: wasCommented ? commentText : null,
              topMatch: classification.topLabel,
              topScore,
              allScores: classification.allScores,
              searchKeyword: kw.keyword,
              ...(commentBlockedThisRun && {
                blockedReason: "comment_rate_limit",
              }),
            },
          };

          await upsertLead(leadData);
          console.log(`   💾 Saved to MongoDB (status: ${leadData.status})`);

          // ── 9. Push to Google Sheet ──
          await pushLeadToSheet(
            leadData,
            wasCommented ? commentText : null,
            classification,
          );
          console.log(`   📊 Pushed to Google Sheets`);
          stats.leadsSaved++;

          // ── 10. Cooldown before next post ──
          if (wasCommented) {
            // Longer cooldown after commenting to avoid rate limit
            const cooldownMs =
              COMMENT_COOLDOWN_MIN_SEC * 1000 +
              Math.floor(
                Math.random() *
                  (COMMENT_COOLDOWN_MAX_SEC - COMMENT_COOLDOWN_MIN_SEC) *
                  1000,
              );
            console.log(
              `\n   ⏰ Cooling ${Math.floor(cooldownMs / 1000)}s (${Math.floor(cooldownMs / 60)}m) before next post...`,
            );
            await new Promise((r) => setTimeout(r, cooldownMs));
          } else {
            // Shorter delay when only saving lead
            const shortDelay =
              NO_COMMENT_POST_DELAY_MIN +
              Math.floor(
                Math.random() *
                  (NO_COMMENT_POST_DELAY_MAX - NO_COMMENT_POST_DELAY_MIN),
              );
            console.log(
              `\n   ⏰ Short delay ${Math.floor(shortDelay / 1000)}s before next post...`,
            );
            await new Promise((r) => setTimeout(r, shortDelay));
          }
        } catch (err) {
          console.log(`   ❌ Post error: ${err.message}`);
        }
      }

      // ── Cooldown between keywords ──
      const keywordCooldownMs =
        KEYWORD_COOLDOWN_MIN_SEC * 1000 +
        Math.floor(
          Math.random() *
            (KEYWORD_COOLDOWN_MAX_SEC - KEYWORD_COOLDOWN_MIN_SEC) *
            1000,
        );
      console.log(
        `\n⏰ Cooling ${Math.floor(keywordCooldownMs / 1000)}s before next keyword...`,
      );
      await new Promise((r) => setTimeout(r, keywordCooldownMs));
    }

    // ── Final Summary ──
    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  DISCOVERY COMPLETE                                        ║`,
    );
    console.log(
      `║  📊 Posts scanned:    ${String(stats.postsScanned).padEnd(36)}║`,
    );
    console.log(
      `║  🎯 High-score:       ${String(stats.highScorePosts).padEnd(36)}║`,
    );
    console.log(
      `║  🔥 Hot: ${String(stats.scoreDistribution.hot).padEnd(49)}║`,
    );
    console.log(
      `║  🌤️  Warm: ${String(stats.scoreDistribution.warm).padEnd(48)}║`,
    );
    console.log(
      `║  ❄️  Cold: ${String(stats.scoreDistribution.cold).padEnd(48)}║`,
    );
    console.log(
      `║  💬 New comments:     ${String(stats.newComments).padEnd(36)}║`,
    );
    console.log(
      `║  ⏭️  Skipped (comm):  ${String(stats.skippedAlreadyCommented).padEnd(36)}║`,
    );
    console.log(
      `║  ⏭️  Skipped (dup):   ${String(stats.skippedDuplicate).padEnd(36)}║`,
    );
    console.log(
      `║  💾 Leads saved:      ${String(stats.leadsSaved).padEnd(36)}║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`,
    );
  } catch (err) {
    console.error(`\n❌ Fatal: ${err.message}`);
    console.error(err.stack);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

async function pushLeadToSheet(lead, commentText, classification) {
  const enrichedLead = {
    ...(lead.toObject ? lead.toObject() : lead),
    aiAnalysis: {
      ...(lead.aiAnalysis || {}),
      generatedComment: commentText,
      allScores: classification.allScores,
    },
    createdAt: lead.createdAt || new Date(),
    updatedAt: new Date(),
  };

  const row = buildLeadRow(enrichedLead);
  await appendToSheet("Leads", [row]);
}
