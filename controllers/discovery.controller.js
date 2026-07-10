import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { searchLinkedIn } from "../services/linkedin/search.service.js";
import { scrapePersonPosts } from "../services/linkedin/post-scraper.service.js";
import { extractContactInfo } from "../services/linkedin/contact-info.service.js";
import { scoreLead } from "../services/ai/scoring.service.js";
import { upsertLead } from "../services/database/lead-db.service.js";
import { appendToSheet } from "../services/integrations/google-sheets.service.js";
import { safeGoto, closeMessagingOverlays } from "../services/browser/navigation.service.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";

export async function discoverLeads(accountId, keywords, maxPages = 2) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  LEAD DISCOVERY — ${accountId.padEnd(39)}║`);
  console.log(`║  Keywords: ${keywords.join(", ").substring(0, 47).padEnd(47)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    let totalDiscovered = 0;

    for (const keyword of keywords) {
      console.log(`\n🔍 Processing keyword: "${keyword}"`);

      const searchResults = await searchLinkedIn(page, keyword, maxPages);

      for (let i = 0; i < searchResults.length; i++) {
        const person = searchResults[i];
        console.log(`\n   📌 [${i + 1}/${searchResults.length}] ${person.name}`);

        try {
          // Visit profile
          if (!(await safeGoto(page, person.profileUrl))) continue;
          await closeMessagingOverlays(page);
          await behaveLikeHuman(page);

          // Get contact info
          const contactInfo = await extractContactInfo(page);

          // Get recent posts
          const posts = await scrapePersonPosts(page, person.profileUrl);
          const recentPost = posts.length > 0 ? posts[0].content : "";

          // Score with AI
          const leadProfile = {
            name: person.name,
            title: person.headline,
            company: "",
            location: person.location,
            about: "",
            recentPost,
          };

          const scoring = await scoreLead(leadProfile);

          // Save to MongoDB
          const leadData = {
            name: person.name,
            profileUrl: person.profileUrl,
            title: person.headline,
            location: person.location,
            email: contactInfo.email,
            phone: contactInfo.phone,
            website: contactInfo.website,
            discoveredFrom: "search",
            searchKeyword: keyword,
            postContent: recentPost.substring(0, 1000),
            conversionScore: scoring.score || 0,
            scoreCategory: scoring.category || "unscored",
            scoreReasons: scoring.reasons || [],
            accountId,
            status: "pending",
          };

          await upsertLead(leadData);

          // Push to Google Sheets
          await appendToSheet("Leads", [
            [
              person.name,
              person.profileUrl,
              person.headline || "",
              person.location || "",
              contactInfo.email || "",
              contactInfo.phone || "",
              scoring.score || 0,
              scoring.category || "unscored",
              keyword,
              new Date().toISOString(),
            ],
          ]);

          totalDiscovered++;
          console.log(`   ✅ Saved: ${person.name} (Score: ${scoring.score})`);

          // Human delay
          await randomDelay(5000, 10000);
        } catch (err) {
          console.log(`   ❌ Error processing ${person.name}: ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Discovery complete! Total: ${totalDiscovered} leads`);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}