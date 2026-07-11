import { launchBrowser, closeBrowser } from "./services/browser/browser.service.js";
import { checkSession } from "./services/browser/session.service.js";
import { searchLinkedIn } from "./services/linkedin/search.service.js";

const KEYWORD = "beauty salon founder India";
const MAX_PAGES = 2;

console.log(`\n🚀 Testing human-like LinkedIn search\n`);

const { context, page } = await launchBrowser("account_1");

try {
  if (!(await checkSession(page))) {
    console.log(`❌ Session expired. Run: bun run manual-login account_1`);
    await closeBrowser(context);
    process.exit(1);
  }

  console.log(`\n🔍 Searching for: "${KEYWORD}"`);
  console.log(`📄 Max pages: ${MAX_PAGES}\n`);

  const results = await searchLinkedIn(page, KEYWORD, MAX_PAGES);

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  SEARCH RESULTS                                            ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  console.log(`Total found: ${results.length}\n`);

  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   Title: ${r.headline}`);
    console.log(`   Location: ${r.location}`);
    console.log(`   Distance: ${r.distance || "unknown"}`);
    console.log(`   URL: ${r.profileUrl}`);
    console.log("");
  });

  console.log(`\n👉 Browser stays open 10 seconds for verification\n`);
  await page.waitForTimeout(10000);
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
} finally {
  await closeBrowser(context);
  console.log(`🔒 Browser closed\n`);
  process.exit(0);
}