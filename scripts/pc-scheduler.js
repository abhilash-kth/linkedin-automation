import cron from "node-cron";
import config from "../config/config.js";
import { connectDB } from "../services/database/mongodb.service.js";
import { taskQueue } from "../services/scheduler/task-queue.service.js";

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🚀 KRISCENT LINKEDIN AUTOMATION                           ║`);
console.log(`║  Office Hours: 10:30 AM - 6:30 PM IST                      ║`);
console.log(`║  Started: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }).padEnd(48)}║`);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

const ACCOUNT_ID = process.env.ACCOUNT_ID || "account_1";
const ACTUALLY_SEND = process.env.ACTUALLY_SEND === "true";
const ACTUALLY_COMMENT = process.env.ACTUALLY_COMMENT === "true";
const TZ = "Asia/Kolkata";

console.log(`📊 Configuration:`);
console.log(`   Account:       ${ACCOUNT_ID}`);
console.log(`   Timezone:      ${TZ}`);
console.log(`   Comments:      ${ACTUALLY_COMMENT ? "✅ LIVE" : "🔒 SAFE (dry run)"}`);
console.log(`   Connections:   ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`);
console.log(`   Messages:      ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`);
console.log(`   Daily limit:   ${config.maxMessagesPerDay} messages`);
console.log(``);

await connectDB();
console.log(`✅ MongoDB connected`);
console.log(``);

// ═══════════════════════════════════════════════════════════════
// HELPER: Enqueue with logging
// ═══════════════════════════════════════════════════════════════
function scheduleTask(cronPattern, name, importFn, priority = 5, skipIfBusy = false) {
  cron.schedule(cronPattern, async () => {
    const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
    console.log(`\n🔔 [${now}] Cron triggered: ${name}`);
    await taskQueue.enqueue(name, importFn, { priority, skipIfBusy });
  }, { timezone: TZ });
}

// ═══════════════════════════════════════════════════════════════
// 🕥 10:30 AM (Mon-Sat) — SESSION CHECK
// Verify LinkedIn login still valid before day starts
// ═══════════════════════════════════════════════════════════════
scheduleTask("30 10 * * 1-6", "SESSION_CHECK", async () => {
  const { autoLogin } = await import("../controllers/auth.controller.js");
  await autoLogin(ACCOUNT_ID);
}, 10, true);

// ═══════════════════════════════════════════════════════════════
// 🕥 10:45 AM (Mon-Sat) — MORNING DISCOVERY + COMMENT
// Catches overnight posts from US/EU + fresh Indian morning posts
// ═══════════════════════════════════════════════════════════════
scheduleTask("45 10 * * 1-6", "MORNING_DISCOVERY", async () => {
  const { discoverLeads } = await import("../controllers/discovery.controller.js");
  await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
}, 3);

// ═══════════════════════════════════════════════════════════════
// 🕧 12:30 PM (Mon-Sat) — MORNING CONNECTIONS
// Send connection requests to morning's high-scoring leads
// ═══════════════════════════════════════════════════════════════
scheduleTask("30 12 * * 1-6", "MORNING_CONNECTIONS", async () => {
  const { sendConnectionBatch } = await import(
    "../controllers/connection-batch.controller.js"
  );
  await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
}, 5);

// ═══════════════════════════════════════════════════════════════
// 🕑 2:00 PM (Mon-Sat) — CHECK ACCEPTANCES
// See who accepted our previous connection requests
// ═══════════════════════════════════════════════════════════════
scheduleTask("0 14 * * 1-6", "ACCEPTANCE_CHECK", async () => {
  const { checkAllAcceptances } = await import(
    "../controllers/acceptance-check.controller.js"
  );
  await checkAllAcceptances(ACCOUNT_ID);
}, 7);

// ═══════════════════════════════════════════════════════════════
// 🕝 2:30 PM (Mon-Sat) — WARMING MESSAGES
// Send warm intro to newly accepted connections
// ═══════════════════════════════════════════════════════════════
scheduleTask("30 14 * * 1-6", "WARMING_MESSAGES", async () => {
  const { sendWarmingMessages } = await import(
    "../controllers/warming-message.controller.js"
  );
  await sendWarmingMessages(ACCOUNT_ID, ACTUALLY_SEND);
}, 6);

// ═══════════════════════════════════════════════════════════════
// 🕒 3:00 PM (Mon-Sat) — AI REPLY PROCESSOR
// Check inbox, analyze conversations, send AI replies
// ═══════════════════════════════════════════════════════════════
scheduleTask("0 15 * * 1-6", "AI_REPLY_AFTERNOON", async () => {
  const { processAIReplies } = await import(
    "../controllers/ai-reply.controller.js"
  );
  await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
}, 9, true);

// ═══════════════════════════════════════════════════════════════
// 🕓 4:00 PM (Mon-Sat) — EVENING DISCOVERY + COMMENT
// Catches Indian founder posts + late US morning posts
// Uses different keyword rotation to maximize reach
// ═══════════════════════════════════════════════════════════════
scheduleTask("0 16 * * 1-6", "EVENING_DISCOVERY", async () => {
  const { discoverLeads } = await import("../controllers/discovery.controller.js");
  await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
}, 3);

// ═══════════════════════════════════════════════════════════════
// 🕠 5:30 PM (Mon-Sat) — EVENING CONNECTIONS
// Send more connection requests based on evening discoveries
// ═══════════════════════════════════════════════════════════════
scheduleTask("30 17 * * 1-6", "EVENING_CONNECTIONS", async () => {
  const { sendConnectionBatch } = await import(
    "../controllers/connection-batch.controller.js"
  );
  await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
}, 5);

// ═══════════════════════════════════════════════════════════════
// 🕕 6:00 PM (Mon-Sat) — CONTACT INFO EXTRACTION
// Extract emails/phones from accepted connections
// ═══════════════════════════════════════════════════════════════
scheduleTask("0 18 * * 1-6", "CONTACT_EXTRACTION", async () => {
  const { extractContactInfoBatch } = await import(
    "../controllers/contact-extract.controller.js"
  );
  await extractContactInfoBatch(ACCOUNT_ID);
}, 4);

// ═══════════════════════════════════════════════════════════════
// 🕡 6:15 PM (Mon-Sat) — FINAL AI REPLY CHECK
// One last inbox check before end of day
// ═══════════════════════════════════════════════════════════════
scheduleTask("15 18 * * 1-6", "AI_REPLY_FINAL", async () => {
  const { processAIReplies } = await import(
    "../controllers/ai-reply.controller.js"
  );
  await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
}, 9, true);

// ═══════════════════════════════════════════════════════════════
// 💤 6:30 PM — END OF WORKDAY LOG
// ═══════════════════════════════════════════════════════════════
cron.schedule("30 18 * * 1-6", () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🌙 END OF WORKDAY — ${new Date().toLocaleTimeString("en-IN", { timeZone: TZ }).padEnd(37)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  const status = taskQueue.getStatus();
  console.log(`\n📊 Today's Stats:`);
  console.log(`   ✅ Tasks completed: ${status.stats.completed}`);
  console.log(`   ❌ Tasks failed: ${status.stats.failed}`);
  console.log(`   ⏭️  Tasks skipped: ${status.stats.skipped}`);
  console.log(`   ⏱️  Total runtime: ${Math.floor(status.stats.totalRuntime / 60)} min`);
  console.log(``);
}, { timezone: TZ });

// ═══════════════════════════════════════════════════════════════
// 🎯 SATURDAY LIMITED SCHEDULE (11 AM - 2 PM only)
// Weekend = reduced activity looks natural
// ═══════════════════════════════════════════════════════════════
// Note: The regular schedule above already handles Sat (1-6)
// but Saturday tasks after 3 PM won't run because we override:
// Actually the ranges "1-6" include Saturday, so we don't override
// For real Sunday off, use "1-5" instead of "1-6" in cron patterns

// ═══════════════════════════════════════════════════════════════
// SCHEDULE SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`📅 DAILY SCHEDULE (Mon-Sat, Timezone: ${TZ}):`);
console.log(``);
console.log(`   ┌─── MORNING ────────────────────┐`);
console.log(`   │  10:30 AM  🔐 Session check    │`);
console.log(`   │  10:45 AM  🔍 Discovery + Comment │`);
console.log(`   │  12:30 PM  📨 Send connections │`);
console.log(`   └────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── AFTERNOON ──────────────────┐`);
console.log(`   │  02:00 PM  ✅ Check acceptances│`);
console.log(`   │  02:30 PM  🤝 Warming messages │`);
console.log(`   │  03:00 PM  💬 AI reply processor│`);
console.log(`   └────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── EVENING ────────────────────┐`);
console.log(`   │  04:00 PM  🔍 Discovery + Comment │`);
console.log(`   │  05:30 PM  📨 Send connections │`);
console.log(`   │  06:00 PM  📇 Extract contacts │`);
console.log(`   │  06:15 PM  💬 Final reply check│`);
console.log(`   │  06:30 PM  💤 End of workday   │`);
console.log(`   └────────────────────────────────┘`);
console.log(``);
console.log(`   ⚡ Only ONE task runs at a time (queue-based)`);
console.log(`   ⚡ 1-3 min cooldown between tasks`);
console.log(`   ⚡ Sunday = no activity`);
console.log(``);
console.log(`✅ Scheduler running 24/7 via PM2`);
console.log(`   Press Ctrl+C to stop manually\n`);

// ═══════════════════════════════════════════════════════════════
// HEALTH MONITORING
// ═══════════════════════════════════════════════════════════════
setInterval(() => {
  const status = taskQueue.getStatus();
  const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });

  if (status.isRunning) {
    console.log(`\n💓 [${now}] ACTIVE: "${status.currentTask}" | Queue: ${status.queueSize}`);
  }
}, 10 * 60 * 1000); // Every 10 min

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
process.on("SIGINT", () => {
  console.log(`\n\n🛑 Scheduler stopped manually`);
  console.log(`📊 Final stats:`, JSON.stringify(taskQueue.getStatus().stats, null, 2));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(`\n💥 Uncaught exception:`, err.message);
  console.log(`⚠️  Scheduler continues running (PM2 will handle restart if needed)`);
});

process.on("unhandledRejection", (err) => {
  console.error(`\n💥 Unhandled rejection:`, err);
});