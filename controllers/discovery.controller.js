import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import {
  searchPostsByKeyword,
  scrollToAndExpandPost,
} from "../services/linkedin/post-scraper.service.js";
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
import { appendToSheet } from "../services/integrations/google-sheets.service.js";
import { randomDelay } from "../helpers/human-behavior.helper.js";

const SIMILARITY_THRESHOLD_PERCENT = 55; // 55% top match required
const MIN_DAYS_BETWEEN_LEAD_ACTIONS = 7;

export async function discoverLeads(accountId, actuallyComment = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  DISCOVERY (v4 - Multi-Embedding Classification)           ║`);
  console.log(`║  Account: ${accountId.padEnd(48)}║`);
  console.log(`║  Threshold: ${String(SIMILARITY_THRESHOLD_PERCENT).padEnd(3)}% top match                                    ║`);
  console.log(`║  Mode: ${(actuallyComment ? "REAL COMMENTS" : "SAFE (typed only)").padEnd(51)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  console.log(`🧠 Preloading Xenova model...`);
  await loadEmbedder();

  console.log(`\n📚 Loading discovery keywords...`);
  const keywordVectors = await getAllKeywordVectors();
  if (keywordVectors.length === 0) {
    console.log(`\n❌ No keywords. Run: node scripts/embed-keywords.js\n`);
    return;
  }
  console.log(`✅ ${keywordVectors.length} keywords loaded`);

  console.log(`\n🎯 Loading requirement embeddings (ideal customer profiles)...`);
  const requirementEmbeddings = await getAllRequirementEmbeddings();
  if (requirementEmbeddings.length === 0) {
    console.log(`\n❌ No requirements. Run: node scripts/embed-requirements.js\n`);
    return;
  }
  console.log(`✅ ${requirementEmbeddings.length} requirement embeddings loaded`);
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

    for (let kIdx = 0; kIdx < keywordVectors.length; kIdx++) {
      const kw = keywordVectors[kIdx];

      console.log(`\n${"═".repeat(63)}`);
      console.log(`🔑 KEYWORD ${kIdx + 1}/${keywordVectors.length}: "${kw.keyword}"`);
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
          const classification = await classifyPost(contentToScore, requirementEmbeddings);

          console.log(`   📊 Classification:`);
          classification.topMatches.forEach((m, i) => {
            const badge = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            console.log(`      ${badge} ${m.label}: ${m.score}%`);
          });

          const topScore = classification.topScore;

          if (topScore < SIMILARITY_THRESHOLD_PERCENT) {
            console.log(`   ⏭️  Top score ${topScore}% < ${SIMILARITY_THRESHOLD_PERCENT}% — skip`);
            await randomDelay(2000, 4000);
            continue;
          }

          console.log(`   ✅ MATCH — ${classification.topLabel} @ ${topScore}%`);
          stats.highScorePosts++;

          // Category
          const category =
            topScore >= 75 ? "hot" :
            topScore >= 65 ? "warm" : "cold";
          stats.scoreDistribution[category]++;

          // ── 3. Duplicate lead check ──
          if (await shouldSkipLead(post.authorProfileUrl, MIN_DAYS_BETWEEN_LEAD_ACTIONS)) {
            console.log(`   ⚠️  Lead processed within ${MIN_DAYS_BETWEEN_LEAD_ACTIONS} days — skip`);
            stats.skippedDuplicate++;
            continue;
          }

          // ── 4. Copy post URL ──
          const postUrl = await copyPostLink(page, post.index);

          // ── 5. Duplicate post check ──
          if (postUrl && (await hasCommentedOnPost(postUrl))) {
            console.log(`   ⚠️  Already commented on this post — skip`);
            stats.skippedAlreadyCommented++;
            await randomDelay(2000, 4000);
            continue;
          }

          // ── 6. Generate AI comment ──
          const commentText = await generateComment(contentToScore, post.authorName);
          if (!commentText) {
            console.log(`   ⚠️  Comment generation failed — skip`);
            continue;
          }

          // ── 7. Post comment inline ──
          const commentResult = await commentOnPost(
            page,
            post.index,
            commentText,
            actuallyComment,
          );

          if (commentResult.success && actuallyComment) {
            incrementCommentCount();
            stats.newComments++;
          }

          // ── 8. Save lead ──
          const leadData = {
            name: post.authorName,
            profileUrl: post.authorProfileUrl,
            title: post.authorHeadline || "",
            location: "",
            email: null,
            phone: null,
            website: null,
            discoveredFrom: "post",
            searchKeyword: kw.keyword,
            postContent: contentToScore.substring(0, 2000),
            postUrl: postUrl || "",
            postTime: post.postTime || "",
            conversionScore: topScore,
            scoreCategory: category,
            scoreReasons: classification.topMatches.map(
              (m) => `${m.label}: ${m.score}%`,
            ),
            accountId,
            status:
              commentResult.success && actuallyComment
                ? "commented"
                : "discovered",
            lastProcessedAt: new Date(),
            aiAnalysis: {
              generatedComment: commentText,
              topMatch: classification.topLabel,
              topScore: topScore,
              allScores: classification.allScores,
              searchKeyword: kw.keyword,
            },
          };

          await upsertLead(leadData);
          console.log(`   💾 Saved to MongoDB`);

          await pushLeadToSheet(leadData, commentText, classification);
          console.log(`   📊 Pushed to Google Sheets`);

          stats.leadsSaved++;

          // Cooldown
          const cooldownMs = 45000 + Math.floor(Math.random() * 60000);
          console.log(`\n   ⏰ Cooling ${Math.floor(cooldownMs / 1000)}s...`);
          await new Promise((r) => setTimeout(r, cooldownMs));
        } catch (err) {
          console.log(`   ❌ Post error: ${err.message}`);
        }
      }

      console.log(`\n⏰ Cooling before next keyword...`);
      await randomDelay(30000, 60000);
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  DISCOVERY COMPLETE                                        ║`);
    console.log(`║  🔑 Keywords: ${String(keywordVectors.length).padEnd(44)}║`);
    console.log(`║  📊 Posts scanned: ${String(stats.postsScanned).padEnd(39)}║`);
    console.log(`║  🎯 High-score matches: ${String(stats.highScorePosts).padEnd(34)}║`);
    console.log(`║  🔥 Hot: ${String(stats.scoreDistribution.hot).padEnd(49)}║`);
    console.log(`║  🌤️  Warm: ${String(stats.scoreDistribution.warm).padEnd(48)}║`);
    console.log(`║  ❄️  Cold: ${String(stats.scoreDistribution.cold).padEnd(48)}║`);
    console.log(`║  💬 New comments: ${String(stats.newComments).padEnd(40)}║`);
    console.log(`║  ⏭️  Skipped (commented): ${String(stats.skippedAlreadyCommented).padEnd(33)}║`);
    console.log(`║  ⏭️  Skipped (duplicate): ${String(stats.skippedDuplicate).padEnd(33)}║`);
    console.log(`║  💾 Leads saved: ${String(stats.leadsSaved).padEnd(41)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error(`\n❌ Fatal: ${err.message}`);
    console.error(err.stack);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

async function pushLeadToSheet(lead, commentText, classification) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();
  const commented = lead.status === "commented";

  // Build match summary for notes column
  const matchSummary = classification.topMatches
    .map((m) => `${m.label}: ${m.score}%`)
    .join(" | ");

  const row = [
    today,                                          // A  Date Discovered
    lead.name || "",                                // B  Name
    lead.profileUrl || "",                          // C  Profile URL
    (lead.title || "").substring(0, 300),           // D  Headline
    lead.location || "",                            // E  Location
    lead.email || "",                               // F  Email
    lead.phone || "",                               // G  Phone
    lead.website || "",                             // H  Website
    lead.conversionScore || 0,                      // I  Score (%)
    lead.scoreCategory || "",                       // J  Category
    lead.searchKeyword || "",                       // K  Keyword
    lead.discoveredFrom || "post",                  // L  Source
    (lead.postContent || "").substring(0, 1000),    // M  Post Content
    lead.postUrl || "",                             // N  Post URL
    lead.postTime || "",                            // O  Post Time
    commented ? "Yes" : "No",                       // P  Comment Posted
    commentText || "",                              // Q  Our Comment Text
    commented ? today : "",                         // R  Comment Date
    "No",                                           // S  Connection Sent
    "",                                             // T  Connection Note
    "",                                             // U  Connection Date
    "pending",                                      // V  Connection Status
    "",                                             // W  Accepted Date
    "No",                                           // X  Warming Msg Sent
    "",                                             // Y  Warming Msg Text
    "",                                             // Z  Warming Date
    "No",                                           // AA InMail Sent
    "",                                             // AB InMail Text
    "",                                             // AC InMail Date
    "No",                                           // AD Replied
    "",                                             // AE First Reply Date
    0,                                              // AF Total Replies
    "",                                             // AG Last Reply Preview
    "",                                             // AH AI Interest Level
    "",                                             // AI AI Sentiment
    "",                                             // AJ Follow-up Needed
    "No",                                           // AK Follow-up 1 Sent
    "",                                             // AL Follow-up 1 Date
    "No",                                           // AM Follow-up 2 Sent
    "",                                             // AN Follow-up 2 Date
    lead.status || "discovered",                    // AO Final Status
    "No",                                           // AP Meeting Scheduled
    "",                                             // AQ Meeting Date
    matchSummary,                                   // AR Notes (top matches)
    lead.accountId || "account_1",                  // AS Account Used
    nowIso,                                         // AT Last Updated
  ];

  await appendToSheet("Leads", [row]);
}