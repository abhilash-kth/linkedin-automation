import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { safeGoto, closeMessagingOverlays } from "../services/browser/navigation.service.js";
import {
  searchPostsByKeyword,
  expandPost,
} from "../services/linkedin/post-scraper.service.js";
import {
  copyPostLink,
  commentOnPost,
} from "../services/linkedin/post-commenter.service.js";
import { extractContactInfo } from "../services/linkedin/contact-info.service.js";
import {
  generateEmbedding,
  cosineSimilarity,
  scoreToPercent,
  loadEmbedder,
} from "../services/ai/embedding.service.js";
import {
  generateComment,
  canComment,
  incrementCommentCount,
  getRemainingComments,
} from "../services/ai/comment-generator.service.js";
import { getAllKeywordVectors } from "../services/database/vector-db.service.js";
import { upsertLead } from "../services/database/lead-db.service.js";
import { appendToSheet } from "../services/integrations/google-sheets.service.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";

const SIMILARITY_THRESHOLD = 0.50;

/**
 * Complete discovery flow:
 * 1. Search posts by keyword
 * 2. Score posts using vector similarity
 * 3. Comment on high-scoring posts (navigates to full post page)
 * 4. Navigate BACK to search after each post
 * 5. Extract contact info from profile
 * 6. Save to MongoDB + Google Sheets
 */
export async function discoverLeads(accountId, actuallyComment = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  VECTOR-BASED LEAD DISCOVERY                               ║`);
  console.log(`║  Account: ${accountId.padEnd(48)}║`);
  console.log(`║  Threshold: ${(SIMILARITY_THRESHOLD * 100).toFixed(0)}%                                             ║`);
  console.log(`║  Comment mode: ${(actuallyComment ? "REAL" : "SAFE (typed only)").padEnd(43)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  // Preload Xenova model
  console.log(`🧠 Preloading Xenova model...`);
  await loadEmbedder();

  // Get keywords from DB
  console.log(`\n📚 Loading keyword vectors from DB...`);
  const keywordVectors = await getAllKeywordVectors();

  if (keywordVectors.length === 0) {
    console.log(`\n❌ No keywords in DB. Run: bun run embed-keywords\n`);
    return;
  }

  console.log(`✅ Loaded ${keywordVectors.length} keyword vectors`);
  keywordVectors.forEach((k, i) => console.log(`   ${i + 1}. ${k.keyword}`));

  const { context, page } = await launchBrowser(accountId);

  let totalPostsScanned = 0;
  let totalHighScorePosts = 0;
  let totalCommented = 0;
  let totalLeadsSaved = 0;

  try {
    if (!(await checkSession(page))) {
      console.log(`\n❌ Session expired. Run: bun run manual-login ${accountId}`);
      await closeBrowser(context);
      return;
    }

    // Loop through each keyword
    for (let kIdx = 0; kIdx < keywordVectors.length; kIdx++) {
      const kw = keywordVectors[kIdx];
      console.log(`\n${"═".repeat(63)}`);
      console.log(`🔑 KEYWORD ${kIdx + 1}/${keywordVectors.length}: "${kw.keyword}"`);
      console.log("═".repeat(63));

      // Check daily comment limit
      if (!canComment()) {
        console.log(`\n⛔ Daily comment limit reached (20/day). Stopping.\n`);
        break;
      }
      console.log(`💬 Comments remaining today: ${getRemainingComments()}\n`);

      // Search posts
      const posts = await searchPostsByKeyword(page, kw.keyword);
      totalPostsScanned += posts.length;

      if (posts.length === 0) {
        console.log(`   ⚠️  No posts found\n`);
        continue;
      }

      // Score each post
      console.log(`\n📊 Scoring ${posts.length} posts...\n`);
      const scoredPosts = [];

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];

        // Try to expand post first (for full content)
        let fullContent = post.content;
        if (post.hasExpandButton) {
          const expanded = await expandPost(page, post.index);
          if (expanded) fullContent = expanded;
        }

        // Generate embedding
        const postVector = await generateEmbedding(fullContent);
        if (!postVector) continue;

        // Calculate similarity
        const score = cosineSimilarity(kw.vector, postVector);
        const scorePercent = scoreToPercent(score);

        scoredPosts.push({ ...post, content: fullContent, score, scorePercent });

        const icon = score >= SIMILARITY_THRESHOLD ? "✅" : "❌";
        console.log(`   ${icon} [${scorePercent}%] ${post.authorName.substring(0, 25).padEnd(25)} | ${fullContent.substring(0, 50).replace(/\n/g, " ")}...`);
      }

      // Filter to high-scoring posts
      const highScorePosts = scoredPosts.filter((p) => p.score >= SIMILARITY_THRESHOLD);
      totalHighScorePosts += highScorePosts.length;

      console.log(`\n🎯 High-scoring posts: ${highScorePosts.length}/${scoredPosts.length}`);

      if (highScorePosts.length === 0) {
        console.log(`   ℹ️  No posts above ${SIMILARITY_THRESHOLD * 100}% threshold\n`);
        continue;
      }

      // Process each high-scoring post
      for (let pIdx = 0; pIdx < highScorePosts.length; pIdx++) {
        // Check comment limit before each
        if (!canComment()) {
          console.log(`\n⛔ Daily comment limit reached during processing\n`);
          break;
        }

        const post = highScorePosts[pIdx];
        console.log(`\n${"─".repeat(63)}`);
        console.log(`📌 [${pIdx + 1}/${highScorePosts.length}] ${post.authorName} (${post.scorePercent}%)`);
        console.log("─".repeat(63));

        try {
          // ═══════════════════════════════════════════════════════════
          // STEP 0: If we already navigated away, go back to search results
          // ═══════════════════════════════════════════════════════════
          const currentUrl = page.url();
          if (!currentUrl.includes("/search/results/content/")) {
            console.log(`   🔄 Navigating back to search results...`);
            const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(kw.keyword)}`;
            await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
            await randomDelay(4000, 6000);

            // Scroll down to reload posts
            console.log(`   📜 Scrolling to reload posts...`);
            for (let i = 0; i < 4; i++) {
              await page.evaluate(() => window.scrollBy(0, 600));
              await randomDelay(1500, 2500);
            }

            // Re-tag posts with data-post-index since we reloaded
            await page.evaluate(() => {
              const containers = document.querySelectorAll('[role="listitem"]');
              containers.forEach((container, idx) => {
                container.setAttribute("data-post-index", String(idx));
              });
            });
            await randomDelay(1500, 2500);

            // Find the current post's new index by matching author URL
            const newIndex = await page.evaluate((authorUrl) => {
              const containers = document.querySelectorAll('[data-post-index]');
              for (const container of containers) {
                const link = container.querySelector('a[href*="/in/"]');
                if (link) {
                  const href = link.getAttribute("href").split("?")[0];
                  const fullUrl = href.startsWith("http") ? href : "https://www.linkedin.com" + href;
                  if (fullUrl === authorUrl || authorUrl.includes(href)) {
                    return parseInt(container.getAttribute("data-post-index"));
                  }
                }
              }
              return null;
            }, post.authorProfileUrl);

            if (newIndex !== null && newIndex !== undefined) {
              console.log(`   ✅ Re-found post at new index: ${newIndex}`);
              post.index = newIndex;
            } else {
              console.log(`   ⚠️  Couldn't re-find post on search page`);
            }
          }

          // ═══════════════════════════════════════════════════════════
          // STEP 1: Copy post link (from search page)
          // ═══════════════════════════════════════════════════════════
          const postUrl = await copyPostLink(page, post.index);

          // ═══════════════════════════════════════════════════════════
          // STEP 2: Generate AI comment
          // ═══════════════════════════════════════════════════════════
          const commentText = await generateComment(post.content, post.authorName);
          if (!commentText) {
            console.log(`   ⚠️  Skipping — couldn't generate comment`);
            continue;
          }

          // ═══════════════════════════════════════════════════════════
          // STEP 3: Post the comment (navigates to full post page)
          // ═══════════════════════════════════════════════════════════
          const commentResult = await commentOnPost(page, post.index, commentText, actuallyComment, postUrl);
          if (commentResult.success && actuallyComment) {
            incrementCommentCount();
            totalCommented++;
          }

          // ═══════════════════════════════════════════════════════════
          // STEP 4: Visit profile & extract contact info
          // ═══════════════════════════════════════════════════════════
          console.log(`\n   👤 Visiting profile: ${post.authorProfileUrl}`);
          await randomDelay(3000, 5000);

          const contactInfo = await extractContactInfo(page, post.authorProfileUrl);

          // ═══════════════════════════════════════════════════════════
          // STEP 5: Save to MongoDB
          // ═══════════════════════════════════════════════════════════
          const leadData = {
            name: post.authorName,
            profileUrl: post.authorProfileUrl,
            title: post.authorHeadline,
            location: contactInfo.location || "",
            email: contactInfo.email,
            phone: contactInfo.phone,
            website: contactInfo.website,
            discoveredFrom: "post",
            searchKeyword: kw.keyword,
            postContent: post.content,
            postUrl: postUrl,
            postTime: post.postTime,
            conversionScore: post.scorePercent,
            scoreCategory:
              post.scorePercent >= 75 ? "hot" :
              post.scorePercent >= 60 ? "warm" : "cold",
            scoreReasons: [
              `Post matched "${kw.keyword}" with ${post.scorePercent}% similarity`,
            ],
            accountId,
            status: commentResult.success && actuallyComment ? "commented" : "discovered",
            aiAnalysis: {
              generatedComment: commentText,
              similarityScore: post.score,
              matchedKeyword: kw.keyword,
            },
          };

          await upsertLead(leadData);
          console.log(`   💾 Saved to MongoDB`);

          // ═══════════════════════════════════════════════════════════
          // STEP 6: Push to Google Sheets
          // ═══════════════════════════════════════════════════════════
          await pushLeadToSheet(leadData, commentText);
          console.log(`   📊 Pushed to Google Sheets`);

          totalLeadsSaved++;

          // Long delay between profile visits (safety)
          const cooldown = 60000 + Math.floor(Math.random() * 120000); // 1-3 minutes
          console.log(`\n   ⏰ Cooling down ${Math.floor(cooldown / 1000)}s before next post...`);
          await new Promise((r) => setTimeout(r, cooldown));
        } catch (err) {
          console.log(`   ❌ Error: ${err.message}`);
        }
      }

      // Delay between keywords (longer)
      console.log(`\n⏰ Cooling down before next keyword...`);
      await randomDelay(30000, 60000);
    }

    // Summary
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  DISCOVERY COMPLETE                                        ║`);
    console.log(`║  🔑 Keywords: ${String(keywordVectors.length).padEnd(44)}║`);
    console.log(`║  📊 Posts scanned: ${String(totalPostsScanned).padEnd(39)}║`);
    console.log(`║  🎯 High-score matches: ${String(totalHighScorePosts).padEnd(34)}║`);
    console.log(`║  💬 Comments posted: ${String(totalCommented).padEnd(37)}║`);
    console.log(`║  💾 Leads saved: ${String(totalLeadsSaved).padEnd(41)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error(`\n❌ Fatal: ${err.message}`);
    console.error(err.stack);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

/**
 * Push lead to Google Sheets (46 columns)
 */
async function pushLeadToSheet(lead, commentText) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();

  const row = [
    // ── Discovery Data (A-H) ──
    today,                                          // A: Date Discovered
    lead.name || "",                                // B: Name
    lead.profileUrl || "",                          // C: Profile URL
    (lead.title || "").substring(0, 300),           // D: Headline
    lead.location || "",                            // E: Location
    lead.email || "",                               // F: Email
    lead.phone || "",                               // G: Phone
    lead.website || "",                             // H: Website

    // ── Scoring (I-L) ──
    lead.conversionScore || 0,                      // I: Score (%)
    lead.scoreCategory || "",                       // J: Category
    lead.searchKeyword || "",                       // K: Keyword
    lead.discoveredFrom || "post",                  // L: Source

    // ── Post Info (M-O) ──
    (lead.postContent || "").substring(0, 1000),    // M: Post Content
    lead.postUrl || "",                             // N: Post URL
    lead.postTime || "",                            // O: Post Time

    // ── Comment Actions (P-R) ──
    lead.status === "commented" ? "Yes" : "No",     // P: Comment Posted
    commentText || "",                              // Q: Our Comment Text
    lead.status === "commented" ? today : "",       // R: Comment Date

    // ── Connection (S-U) — Empty on discovery ──
    "No",                                           // S: Connection Sent
    "",                                             // T: Connection Note
    "",                                             // U: Connection Date

    // ── Acceptance (V-W) ──
    "pending",                                      // V: Connection Status
    "",                                             // W: Accepted Date

    // ── Warming Message (X-Z) ──
    "No",                                           // X: Warming Message Sent
    "",                                             // Y: Warming Message Text
    "",                                             // Z: Warming Date

    // ── InMail (AA-AC) ──
    "No",                                           // AA: InMail Sent
    "",                                             // AB: InMail Text
    "",                                             // AC: InMail Date

    // ── Reply Tracking (AD-AG) ──
    "No",                                           // AD: Replied
    "",                                             // AE: First Reply Date
    0,                                              // AF: Total Replies
    "",                                             // AG: Last Reply Preview

    // ── AI Analysis (AH-AJ) ──
    "",                                             // AH: AI Interest Level
    "",                                             // AI: AI Sentiment
    "",                                             // AJ: Follow-up Needed

    // ── Follow-ups (AK-AN) ──
    "No",                                           // AK: Follow-up 1 Sent
    "",                                             // AL: Follow-up 1 Date
    "No",                                           // AM: Follow-up 2 Sent
    "",                                             // AN: Follow-up 2 Date

    // ── Final Status (AO-AR) ──
    lead.status || "discovered",                    // AO: Final Status
    "No",                                           // AP: Meeting Scheduled
    "",                                             // AQ: Meeting Date
    "",                                             // AR: Notes

    // ── Metadata (AS-AT) ──
    lead.accountId || "account_1",                  // AS: Account Used
    nowIso,                                         // AT: Last Updated
  ];

  await appendToSheet("Leads", [row]);
}