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
  canComment,
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
import { randomDelay } from "../helpers/human-behavior.helper.js";
import {
  getCommentBlockStatus,
  setCommentBlock,
  printBlockBanner,
} from "../helpers/comment-limit-tracker.helper.js";

const SIMILARITY_THRESHOLD_PERCENT = 40;
const MIN_DAYS_BETWEEN_LEAD_ACTIONS = 7;

// ═══ COMMENT SAFETY CONFIG ═══
// LinkedIn blocks accounts that comment too aggressively.
// Keep these SAFE to avoid the 48-hour block.
const COMMENT_COOLDOWN_MIN_SEC = 180; // 3 minutes minimum between posts
const COMMENT_COOLDOWN_MAX_SEC = 300; // 5 minutes maximum
const KEYWORD_COOLDOWN_MIN_SEC = 120; // 2 minutes between keywords
const KEYWORD_COOLDOWN_MAX_SEC = 240; // 4 minutes between keywords

export async function discoverLeads(accountId, actuallyComment = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  DISCOVERY (v4 - Multi-Embedding Classification)           ║`);
  console.log(`║  Account: ${accountId.padEnd(48)}║`);
  console.log(
    `║  Threshold: ${String(SIMILARITY_THRESHOLD_PERCENT).padEnd(3)}% top match                                    ║`,
  );
  console.log(
    `║  Mode: ${(actuallyComment ? "REAL COMMENTS" : "SAFE (typed only)").padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  // ═══ STEP 0: Check if commenting is blocked for this account ═══
  if (actuallyComment) {
    const blockStatus = await getCommentBlockStatus(accountId);
    if (blockStatus.blocked) {
      printBlockBanner(
        accountId,
        blockStatus.hoursRemaining,
        blockStatus.blockedUntil,
      );
      console.log(`⏸️  Discovery mode: DISABLED (comment block active)`);
      console.log(`   Reason: ${blockStatus.reason}`);
      console.log(
        `   Blocked at: ${new Date(blockStatus.blockedAt).toLocaleString("en-US")}`,
      );
      console.log(
        `\n💡 To manually unblock (only if you're SURE LinkedIn cleared it):`,
      );
      console.log(
        `   Delete: data/comment-block-state.json OR remove the "${accountId}" entry\n`,
      );
      return;
    }
    console.log(`✅ Comment block status: OK (not blocked)\n`);
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

  console.log(
    `\n🎯 Loading requirement embeddings (ideal customer profiles)...`,
  );
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
  requirementEmbeddings.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.label}`);
  });
  console.log(``);

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

    let commentBlocked = false; // set to true if rate limit hits mid-run

    for (let kIdx = 0; kIdx < keywordVectors.length; kIdx++) {
      if (commentBlocked) break;

      const kw = keywordVectors[kIdx];

      console.log(`\n${"═".repeat(63)}`);
      console.log(
        `🔑 KEYWORD ${kIdx + 1}/${keywordVectors.length}: "${kw.keyword}"`,
      );
      console.log("═".repeat(63));

      if (!canComment()) {
        console.log(`\n⛔ Daily comment limit reached\n`);
        break;
      }
      console.log(`💬 Comments remaining today: ${getRemainingComments()}\n`);

      const posts = await searchPostsByKeyword(page, kw.keyword);
      stats.postsScanned += posts.length;

      if (posts.length === 0) {
        console.log(`   ⚠️  No posts found\n`);
        continue;
      }

      for (let pIdx = 0; pIdx < posts.length; pIdx++) {
        if (commentBlocked) break;

        if (!canComment()) {
          console.log(`\n⛔ Daily limit reached\n`);
          break;
        }

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

          // ── 1. Expand + read post ──
          const fullContent = await scrollToAndExpandPost(page, post.index);
          const contentToScore = fullContent || post.content;

          if (!contentToScore || contentToScore.length < 30) {
            console.log(`   ⚠️  Content too short — skipping`);
            continue;
          }

          // ── 2. Multi-embedding classification ──
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
              `   ⏭️  Top score ${topScore}% < ${SIMILARITY_THRESHOLD_PERCENT}% — skip`,
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

          // ── 3. Duplicate lead check ──
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

          // ═══════════════════════════════════════════════════════
          // STEP 4: Copy post URL
          // ═══════════════════════════════════════════════════════
          console.log(`\n🔗 STEP 4: Copy post URL`);
          const rawPostUrl = await copyPostLink(page, post.index);

          if (!rawPostUrl) {
            console.log(`   ⚠️  Failed to copy URL — skipping post`);
            continue;
          }

          // ═══════════════════════════════════════════════════════
          // STEP 5: Duplicate post check
          // ═══════════════════════════════════════════════════════
          if (await hasCommentedOnPost(rawPostUrl)) {
            console.log(`   ⚠️  Already commented on this post — skip`);
            stats.skippedAlreadyCommented++;
            await randomDelay(2000, 4000);
            continue;
          }

          // ═══════════════════════════════════════════════════════
          // STEP 6: Generate AI comment
          // ═══════════════════════════════════════════════════════
          console.log(`\n✍️  STEP 5: Generate AI comment`);
          const commentText = await generateComment(
            contentToScore,
            post.authorName,
          );

          if (!commentText) {
            console.log(`   ⚠️  Comment generation failed — skipping`);
            continue;
          }

          // ═══════════════════════════════════════════════════════
          // STEP 7: Post comment INLINE
          // ═══════════════════════════════════════════════════════
          console.log(`\n💬 STEP 6: Post comment inline`);
          const commentResult = await commentOnPost(
            page,
            post.index,
            commentText,
            actuallyComment,
          );

          // ═══ CRITICAL: Handle rate-limit signal ═══
          if (commentResult.stopAllComments) {
            console.log(``);
            console.log(
              `╔═══════════════════════════════════════════════════════════╗`,
            );
            console.log(
              `║  🛑🛑🛑  COMMENT RATE LIMIT HIT  🛑🛑🛑                     ║`,
            );
            console.log(
              `║  Comment did NOT appear in DOM after posting                ║`,
            );
            console.log(
              `║  LinkedIn silently blocked our comment                      ║`,
            );
            console.log(
              `║                                                            ║`,
            );
            console.log(
              `║  🔒 Setting 48-hour block to protect account                ║`,
            );
            console.log(
              `║  📊 Comments made this run: ${String(stats.newComments).padEnd(30)}║`,
            );
            console.log(
              `╚═══════════════════════════════════════════════════════════╝`,
            );
            console.log(``);

            const blockResult = await setCommentBlock(
              accountId,
              "comment_not_visible_in_dom",
            );
            if (blockResult) {
              console.log(
                `   ✅ Block set until: ${blockResult.blockedUntil.toLocaleString("en-US")}`,
              );
              console.log(
                `   ⏸️  Next comment allowed after ${blockResult.hoursRemaining} hours\n`,
              );
            }

            // Still save lead as "discovered" (comment blocked but lead is valid)
            const leadDataNoComment = {
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
              postUrl: rawPostUrl || "",
              postTime: post.postTime || "",
              conversionScore: topScore,
              scoreCategory: category,
              scoreReasons: classification.topMatches.map(
                (m) => `${m.label}: ${m.score}%`,
              ),
              accountId,
              status: "discovered",
              commentPosted: false,        
              commentText: null,
              commentedAt: null,
              lastProcessedAt: new Date(),
              aiAnalysis: {
                generatedComment: null,
                topMatch: classification.topLabel,
                topScore: topScore,
                allScores: classification.allScores,
                searchKeyword: kw.keyword,
                blockedReason: "comment_rate_limit",
              },
            };

            await upsertLead(leadDataNoComment);
            console.log(`   💾 Saved lead as 'discovered' (comment blocked)`);

            try {
              await pushLeadToSheet(leadDataNoComment, null, classification);
            } catch {}

            commentBlocked = true;
            break; // exit posts loop, then keywords loop will also exit
          }

          if (commentResult.success && actuallyComment) {
            incrementCommentCount();
            stats.newComments++;
          }

          // ═══════════════════════════════════════════════════════
          // STEP 8: Resolve URL AFTER commenting
          // ═══════════════════════════════════════════════════════
          let cleanPostUrl = rawPostUrl;
          if (
            rawPostUrl &&
            !rawPostUrl.includes("/feed/update/urn:li:activity:")
          ) {
            console.log(`\n🔗 STEP 7: Resolving URL in background tab...`);

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

          // ═══════════════════════════════════════════════════════
          // STEP 9: Save lead to MongoDB
          // ═══════════════════════════════════════════════════════
          const wasCommented = commentResult.success && actuallyComment;

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

            // ── FIX: These 3 fields now exist in schema and buildLeadRow reads them ──
            commentPosted: wasCommented, // NEW — was missing from schema
            commentText: wasCommented ? commentText : null, // NEW — was missing from schema
            commentedAt: wasCommented ? new Date() : null, // NOW IN SCHEMA

            lastProcessedAt: new Date(),
            aiAnalysis: {
              generatedComment: wasCommented ? commentText : null,
              topMatch: classification.topLabel,
              topScore: topScore,
              allScores: classification.allScores,
              searchKeyword: kw.keyword,
            },
          };

          await upsertLead(leadData);
          console.log(`   💾 Saved to MongoDB (status: ${leadData.status})`);

          await pushLeadToSheet(
            leadData,
            wasCommented ? commentText : null,
            classification,
          );
          console.log(`   📊 Pushed to Google Sheets`);

          stats.leadsSaved++;

          // Cooldown (LONGER to avoid LinkedIn rate limiting)
          const cooldownMs =
            COMMENT_COOLDOWN_MIN_SEC * 1000 +
            Math.floor(
              Math.random() *
                (COMMENT_COOLDOWN_MAX_SEC - COMMENT_COOLDOWN_MIN_SEC) *
                1000,
            );
          console.log(
            `\n   ⏰ Cooling ${Math.floor(cooldownMs / 1000)}s (${Math.floor(cooldownMs / 60000)}m) before next post...`,
          );
          await new Promise((r) => setTimeout(r, cooldownMs));
        } catch (err) {
          console.log(`   ❌ Post error: ${err.message}`);
        }
      }

      // Break out of keyword loop if we hit the block
      if (commentBlocked) {
        console.log(`\n🛑 Stopping — comment block was set\n`);
        break;
      }

      // Longer cooldown between keywords
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

    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  DISCOVERY COMPLETE                                        ║`,
    );
    console.log(`║  🔑 Keywords: ${String(keywordVectors.length).padEnd(44)}║`);
    console.log(
      `║  📊 Posts scanned: ${String(stats.postsScanned).padEnd(39)}║`,
    );
    console.log(
      `║  🎯 High-score matches: ${String(stats.highScorePosts).padEnd(34)}║`,
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
    console.log(`║  💬 New comments: ${String(stats.newComments).padEnd(40)}║`);
    console.log(
      `║  ⏭️  Skipped (commented): ${String(stats.skippedAlreadyCommented).padEnd(33)}║`,
    );
    console.log(
      `║  ⏭️  Skipped (duplicate): ${String(stats.skippedDuplicate).padEnd(33)}║`,
    );
    console.log(`║  💾 Leads saved: ${String(stats.leadsSaved).padEnd(41)}║`);
    if (commentBlocked) {
      console.log(
        `║                                                            ║`,
      );
      console.log(
        `║  🚫 COMMENT BLOCK SET — Wait 48 hours or switch account     ║`,
      );
    }
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
