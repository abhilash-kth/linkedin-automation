import cron from "node-cron";
import config from "../config/config.js";

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🕐 LINKEDIN AUTOMATION — PC SCHEDULER                     ║`);
console.log(`║  Runs BROWSER-BASED tasks on your PC                       ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

const ACCOUNT_ID = "account_1";
const LEADS_FILE = "./data/leads.json";
const ACTUALLY_SEND = process.env.NODE_ENV === "production";

// ── 9:00 AM — Session check + Login refresh ──────────────────────────
cron.schedule("0 9 * * 1-5", async () => {
  console.log(`\n⏰ [9:00 AM] Session check...`);
  try {
    const { autoLogin } = await import("../controllers/auth.controller.js");
    await autoLogin(ACCOUNT_ID);
  } catch (err) {
    console.error(`❌ Login check failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── 10:00 AM — Discover new leads ────────────────────────────────────
cron.schedule("0 10 * * 1-5", async () => {
  console.log(`\n⏰ [10:00 AM] Discovering leads...`);
  try {
    const { discoverLeads } = await import("../controllers/discovery.controller.js");
    const { readFile } = await import("fs/promises");
    let keywords;
    try {
      const data = await readFile("./data/keywords.json", "utf-8");
      keywords = JSON.parse(data);
    } catch {
      keywords = ["beauty salon founder", "spa owner", "wellness startup"];
    }
    await discoverLeads(ACCOUNT_ID, keywords.slice(0, 2), 2);
  } catch (err) {
    console.error(`❌ Discovery failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── 11:00 AM — First outreach batch ──────────────────────────────────
cron.schedule("0 11 * * 1-5", async () => {
  console.log(`\n⏰ [11:00 AM] Morning outreach batch...`);
  try {
    const { processBatch } = await import("../controllers/batch.controller.js");
    await processBatch(ACCOUNT_ID, LEADS_FILE, ACTUALLY_SEND);
  } catch (err) {
    console.error(`❌ Batch failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── Every 30 min from 9 AM - 6 PM — Check inbox ──────────────────────
cron.schedule("*/30 9-18 * * 1-5", async () => {
  console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Inbox check...`);
  try {
    const { checkInbox } = await import("../controllers/monitor.controller.js");
    await checkInbox(ACCOUNT_ID, LEADS_FILE);
  } catch (err) {
    console.error(`❌ Inbox check failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── Every 45 min from 10 AM - 5 PM — Process AI replies ─────────────
cron.schedule("15,45 10-17 * * 1-5", async () => {
  console.log(`\n⏰ [${new Date().toLocaleTimeString()}] AI reply processing...`);
  try {
    const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
    await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
  } catch (err) {
    console.error(`❌ AI reply failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── 2:00 PM — Afternoon outreach batch ───────────────────────────────
cron.schedule("0 14 * * 1-5", async () => {
  console.log(`\n⏰ [2:00 PM] Afternoon outreach batch...`);
  try {
    const { processBatch } = await import("../controllers/batch.controller.js");
    await processBatch(ACCOUNT_ID, LEADS_FILE, ACTUALLY_SEND);
  } catch (err) {
    console.error(`❌ Batch failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── 4:00 PM — Check acceptances ──────────────────────────────────────
cron.schedule("0 16 * * 1-5", async () => {
  console.log(`\n⏰ [4:00 PM] Checking acceptances...`);
  try {
    const { checkAllAcceptances } = await import("../controllers/acceptance-check.controller.js");
    await checkAllAcceptances(ACCOUNT_ID);
  } catch (err) {
    console.error(`❌ Acceptance check failed: ${err.message}`);
  }
}, { timezone: config.timezone });

// ── 4:30 PM — Send warming messages ──────────────────────────────────
cron.schedule("30 16 * * 1-5", async () => {
  console.log(`\n⏰ [4:30 PM] Sending warming messages...`);
  try {
    const { sendWarmingMessages } = await import("../controllers/warming-message.controller.js");
    await sendWarmingMessages(ACCOUNT_ID, ACTUALLY_SEND);
  } catch (err) {
    console.error(`❌ Warming messages failed: ${err.message}`);
  }
}, { timezone: config.timezone });

console.log(`📅 SCHEDULED JOBS (Timezone: ${config.timezone}):`);
console.log(`   9:00 AM   → Session check`);
console.log(`   10:00 AM  → Lead discovery`);
console.log(`   11:00 AM  → Morning outreach batch`);
console.log(`   Every 30m → Inbox check (9AM-6PM)`);
console.log(`   Every 45m → AI reply processing (10AM-5PM)`);
console.log(`   2:00 PM   → Afternoon outreach batch`);
console.log(`   4:00 PM   → Check acceptances`);
console.log(`   4:30 PM   → Send warming messages\n`);
console.log(`✅ Scheduler running. Press Ctrl+C to stop.\n`);

// Keep process alive
process.on("SIGINT", () => {
  console.log(`\n🛑 Scheduler stopped by user\n`);
  process.exit(0);
});