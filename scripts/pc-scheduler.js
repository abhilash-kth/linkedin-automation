import cron from "node-cron";
import config from "../config/config.js";
import { connectDB } from "../services/database/mongodb.service.js";
import { taskQueue } from "../services/scheduler/task-queue.service.js";

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const STATE_FILE = "./data/scheduler-state.json";

// ═══════════════════════════════════════════════════════════════
// MISSED TASK DETECTION
// If PC was asleep/off, run missed critical tasks on wakeup
// ═══════════════════════════════════════════════════════════════
async function checkMissedTasks() {
  if (!existsSync(STATE_FILE)) {
    saveState();
    return;
  }

  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    const lastRun = new Date(state.lastRun);
    const now = new Date();
    const hoursDiff = (now - lastRun) / (1000 * 60 * 60);

    console.log(
      `\n🕰️  Last scheduler activity: ${lastRun.toLocaleString("en-IN", { timeZone: TZ })}`,
    );
    console.log(`   Gap since last run: ${hoursDiff.toFixed(1)} hours`);

    // If gap > 4 hours during business hours, run missed tasks
    if (hoursDiff > 4) {
      const currentHour = now.getHours();
      if (currentHour >= 10 && currentHour <= 18) {
        console.log(`\n⚠️  Large gap detected — running catchup tasks...`);

        // Run session check
        setTimeout(async () => {
          console.log(`\n🔔 [CATCHUP] Running SESSION_CHECK...`);
          const { autoLogin } =
            await import("../controllers/auth.controller.js");
          await taskQueue.enqueue(
            "CATCHUP_SESSION_CHECK",
            async () => {
              await autoLogin(ACCOUNT_ID);
            },
            { priority: 10 },
          );
        }, 5000);

        // Run inbox check
        setTimeout(async () => {
          console.log(`\n🔔 [CATCHUP] Running AI_REPLY...`);
          const { processAIReplies } =
            await import("../controllers/ai-reply.controller.js");
          await taskQueue.enqueue(
            "CATCHUP_AI_REPLY",
            async () => {
              await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
            },
            { priority: 9, skipIfBusy: true },
          );
        }, 300000); // 5 min later
      }
    }
  } catch (err) {
    console.log(`   ⚠️  State check failed: ${err.message}`);
  }

  saveState();
}

function saveState() {
  try {
    writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastRun: new Date().toISOString(),
          version: "2.0.0",
        },
        null,
        2,
      ),
    );
  } catch {}
}

// Save state every 5 minutes to track activity
setInterval(saveState, 5 * 60 * 1000);

// Check on startup
await checkMissedTasks();

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🚀 KRISCENT LINKEDIN AUTOMATION                           ║`);
console.log(`║  Office Hours: 10:30 AM - 6:30 PM IST                      ║`);
console.log(
  `║  Started: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }).padEnd(48)}║`,
);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

const ACCOUNT_ID = process.env.ACCOUNT_ID || "account_1";
const ACTUALLY_SEND = process.env.ACTUALLY_SEND === "true";
const ACTUALLY_COMMENT = process.env.ACTUALLY_COMMENT === "true";
const TZ = "Asia/Kolkata";

console.log(`📊 Configuration:`);
console.log(`   Account:       ${ACCOUNT_ID}`);
console.log(`   Timezone:      ${TZ}`);
console.log(
  `   Comments:      ${ACTUALLY_COMMENT ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
);
console.log(
  `   Connections:   ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
);
console.log(
  `   Messages:      ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
);
console.log(`   Daily limit:   ${config.maxMessagesPerDay} messages`);
console.log(``);

await connectDB();
console.log(`✅ MongoDB connected`);
console.log(``);

// ═══════════════════════════════════════════════════════════════
// HELPER: Schedule task via cron + task queue
// ═══════════════════════════════════════════════════════════════
function scheduleTask(
  cronPattern,
  name,
  importFn,
  priority = 5,
  skipIfBusy = false,
) {
  cron.schedule(
    cronPattern,
    async () => {
      const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
      console.log(`\n🔔 [${now}] Cron triggered: ${name}`);
      await taskQueue.enqueue(name, importFn, { priority, skipIfBusy });
    },
    { timezone: TZ },
  );
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY LEVELS (higher = runs first when queued together)
// 10 = SESSION_CHECK (critical, must run first)
// 9  = AI_REPLY (user is waiting for response)
// 8  = COMMENT_REPLIES (author engaged with our comment)
// 7  = ACCEPTANCE_CHECK (know status changes)
// 6  = WARMING_MESSAGES (freshly accepted, strike iron hot)
// 5  = CONNECTIONS (build pipeline)
// 4  = CONTACT_EXTRACTION (enrich data)
// 3  = DISCOVERY (longest task, lowest priority — fills queue)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🕥 10:30 AM (Mon-Sat) — SESSION CHECK
// Verify LinkedIn login is valid before day starts
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "30 10 * * 1-6",
  "SESSION_CHECK",
  async () => {
    const { autoLogin } = await import("../controllers/auth.controller.js");
    await autoLogin(ACCOUNT_ID);
  },
  10,
  true,
);

// ═══════════════════════════════════════════════════════════════
// 🕥 10:45 AM (Mon-Sat) — MORNING DISCOVERY + COMMENT
// Catches overnight posts from US/EU + fresh Indian morning posts
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "45 10 * * 1-6",
  "MORNING_DISCOVERY",
  async () => {
    const { discoverLeads } =
      await import("../controllers/discovery.controller.js");
    await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
  },
  3,
);

// ═══════════════════════════════════════════════════════════════
// 🕧 12:30 PM (Mon-Sat) — MORNING CONNECTIONS
// Send connection requests to morning's high-scoring leads
// Also: accepts incoming invites + extracts contact info
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "30 12 * * 1-6",
  "MORNING_CONNECTIONS",
  async () => {
    const { sendConnectionBatch } =
      await import("../controllers/connection-batch.controller.js");
    await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
  },
  5,
);

// ═══════════════════════════════════════════════════════════════
// 🕐 1:30 PM (Mon-Sat) — COMMENT REPLIES (morning check)
// Check if post authors replied to our morning comments
// Also handles when other users mention us in comments
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "30 13 * * 1-6",
  "COMMENT_REPLIES_MORNING",
  async () => {
    const { processCommentReplies } =
      await import("../controllers/comment-reply.controller.js");
    await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  8,
);

// ═══════════════════════════════════════════════════════════════
// 🕑 2:00 PM (Mon-Sat) — CHECK ACCEPTANCES
// See who accepted our previous connection requests
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "0 14 * * 1-6",
  "ACCEPTANCE_CHECK",
  async () => {
    const { checkAllAcceptances } =
      await import("../controllers/acceptance-check.controller.js");
    await checkAllAcceptances(ACCOUNT_ID);
  },
  7,
);

// ═══════════════════════════════════════════════════════════════
// 🕝 2:30 PM (Mon-Sat) — WARMING MESSAGES
// Send warm intro to newly accepted connections
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "30 14 * * 1-6",
  "WARMING_MESSAGES",
  async () => {
    const { sendWarmingMessages } =
      await import("../controllers/warming-message.controller.js");
    await sendWarmingMessages(ACCOUNT_ID, ACTUALLY_SEND);
  },
  6,
);

// ═══════════════════════════════════════════════════════════════
// 🕒 3:00 PM (Mon-Sat) — AI REPLY PROCESSOR (afternoon)
// Check inbox, analyze conversations, send AI replies
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "0 15 * * 1-6",
  "AI_REPLY_AFTERNOON",
  async () => {
    const { processAIReplies } =
      await import("../controllers/ai-reply.controller.js");
    await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  9,
  true,
);

// ═══════════════════════════════════════════════════════════════
// 🕓 4:00 PM (Mon-Sat) — EVENING DISCOVERY + COMMENT
// Catches Indian founder posts + late US morning posts
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "0 16 * * 1-6",
  "EVENING_DISCOVERY",
  async () => {
    const { discoverLeads } =
      await import("../controllers/discovery.controller.js");
    await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
  },
  3,
);

// ═══════════════════════════════════════════════════════════════
// 🕠 5:30 PM (Mon-Sat) — EVENING CONNECTIONS
// Send more connection requests based on evening discoveries
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "30 17 * * 1-6",
  "EVENING_CONNECTIONS",
  async () => {
    const { sendConnectionBatch } =
      await import("../controllers/connection-batch.controller.js");
    await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
  },
  5,
);

// ═══════════════════════════════════════════════════════════════
// 🕕 6:00 PM (Mon-Sat) — COMMENT REPLIES (evening check)
// Second check for author replies + mentions
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "0 18 * * 1-6",
  "COMMENT_REPLIES_EVENING",
  async () => {
    const { processCommentReplies } =
      await import("../controllers/comment-reply.controller.js");
    await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  8,
);

// ═══════════════════════════════════════════════════════════════
// 🕡 6:15 PM (Mon-Sat) — FINAL AI REPLY CHECK
// One last inbox check before end of day
// ═══════════════════════════════════════════════════════════════
scheduleTask(
  "15 18 * * 1-6",
  "AI_REPLY_FINAL",
  async () => {
    const { processAIReplies } =
      await import("../controllers/ai-reply.controller.js");
    await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  9,
  true,
);

// ═══════════════════════════════════════════════════════════════
// 💤 6:30 PM — END OF WORKDAY LOG
// ═══════════════════════════════════════════════════════════════
cron.schedule(
  "30 18 * * 1-6",
  () => {
    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  🌙 END OF WORKDAY — ${new Date().toLocaleTimeString("en-IN", { timeZone: TZ }).padEnd(37)}║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝`,
    );
    const status = taskQueue.getStatus();
    console.log(`\n📊 Today's Stats:`);
    console.log(`   ✅ Tasks completed: ${status.stats.completed}`);
    console.log(`   ❌ Tasks failed: ${status.stats.failed}`);
    console.log(`   ⏭️  Tasks skipped: ${status.stats.skipped}`);
    console.log(
      `   ⏱️  Total runtime: ${Math.floor(status.stats.totalRuntime / 60)} min`,
    );
    console.log(``);
    console.log(`   💤 Automation paused until tomorrow 10:30 AM`);
    console.log(
      `   📊 Review Google Sheet for hot leads to respond personally`,
    );
    console.log(``);
  },
  { timezone: TZ },
);

// ═══════════════════════════════════════════════════════════════
// SCHEDULE SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`📅 DAILY SCHEDULE (Mon-Sat, Timezone: ${TZ}):`);
console.log(``);
console.log(`   ┌─── MORNING ────────────────────────┐`);
console.log(`   │  10:30 AM  🔐 Session check        │`);
console.log(`   │  10:45 AM  🔍 Discovery + Comments │`);
console.log(`   │  12:30 PM  📨 Send connections     │`);
console.log(`   └────────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── AFTERNOON ──────────────────────┐`);
console.log(`   │  01:30 PM  💬 Comment replies      │`);
console.log(`   │  02:00 PM  ✅ Check acceptances    │`);
console.log(`   │  02:30 PM  🤝 Warming messages     │`);
console.log(`   │  03:00 PM  💬 AI reply processor   │`);
console.log(`   └────────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── EVENING ────────────────────────┐`);
console.log(`   │  04:00 PM  🔍 Discovery + Comments │`);
console.log(`   │  05:30 PM  📨 Send connections     │`);
console.log(`   │  06:00 PM  💬 Comment replies      │`);
console.log(`   │  06:15 PM  💬 Final reply check    │`);
console.log(`   │  06:30 PM  💤 End of workday       │`);
console.log(`   └────────────────────────────────────┘`);
console.log(``);
console.log(`   ⚡ ONE task runs at a time (sequential — safe from IP ban)`);
console.log(`   ⚡ 1-3 min cooldown between tasks`);
console.log(`   ⚡ Sunday = no activity (respects human patterns)`);
console.log(
  `   ⚡ Connection batch also handles: contact info + incoming invites`,
);
console.log(``);
console.log(`✅ Scheduler running 24/7 via PM2`);
console.log(`   Press Ctrl+C to stop manually\n`);

// ═══════════════════════════════════════════════════════════════
// HEALTH MONITORING (every 10 min)
// ═══════════════════════════════════════════════════════════════
setInterval(
  () => {
    const status = taskQueue.getStatus();
    const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });

    if (status.isRunning) {
      console.log(
        `\n💓 [${now}] ACTIVE: "${status.currentTask}" | Queue: ${status.queueSize}`,
      );
    }
  },
  10 * 60 * 1000,
);

// ═══════════════════════════════════════════════════════════════
// DAILY STATS RESET (midnight)
// ═══════════════════════════════════════════════════════════════
cron.schedule(
  "0 0 * * *",
  () => {
    const now = new Date().toLocaleString("en-IN", { timeZone: TZ });
    console.log(`\n🌅 [${now}] New day starting — daily counters reset\n`);
    // Task queue stats reset automatically on new day via its internal logic
  },
  { timezone: TZ },
);

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════
process.on("SIGINT", () => {
  console.log(`\n\n🛑 Scheduler stopped manually`);
  console.log(
    `📊 Final stats:`,
    JSON.stringify(taskQueue.getStatus().stats, null, 2),
  );
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(`\n\n🛑 Scheduler received SIGTERM (PM2 restart)`);
  console.log(
    `📊 Final stats:`,
    JSON.stringify(taskQueue.getStatus().stats, null, 2),
  );
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(`\n💥 Uncaught exception:`, err.message);
  console.error(err.stack);
  console.log(
    `⚠️  Scheduler continues running (PM2 will handle restart if needed)`,
  );
});

process.on("unhandledRejection", (err) => {
  console.error(`\n💥 Unhandled rejection:`, err);
});
