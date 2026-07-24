// import cron from "node-cron";
// import config from "../config/config.js";
// import { connectDB } from "../services/database/mongodb.service.js";
// import { taskQueue } from "../services/scheduler/task-queue.service.js";
// import { existsSync, readFileSync, writeFileSync } from "fs";

// // ═══════════════════════════════════════════════════════════════
// // CONSTANTS — defined first so all functions can use them
// // ═══════════════════════════════════════════════════════════════
// const ACCOUNT_ID = process.env.ACCOUNT_ID || "account_1";
// const ACTUALLY_SEND = process.env.ACTUALLY_SEND === "true";
// const ACTUALLY_COMMENT = process.env.ACTUALLY_COMMENT === "true";
// const TZ = "Asia/Kolkata";

// const STATE_FILE = "./data/scheduler-state.json";

// // ═══════════════════════════════════════════════════════════════
// // MISSED TASK DETECTION
// // If PC was asleep/off, run missed critical tasks on wakeup
// // ═══════════════════════════════════════════════════════════════
// async function checkMissedTasks() {
//   if (!existsSync(STATE_FILE)) {
//     saveState();
//     return;
//   }

//   try {
//     const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
//     const lastRun = new Date(state.lastRun);
//     const now = new Date();
//     const hoursDiff = (now - lastRun) / (1000 * 60 * 60);

//     console.log(
//       `\n🕰️  Last scheduler activity: ${lastRun.toLocaleString("en-IN", { timeZone: TZ })}`,
//     );
//     console.log(`   Gap since last run: ${hoursDiff.toFixed(1)} hours`);

//     // If gap > 4 hours during business hours, run missed tasks
//     if (hoursDiff > 4) {
//       const currentHour = now.getHours();
//       if (currentHour >= 10 && currentHour <= 18) {
//         console.log(`\n⚠️  Large gap detected — running catchup tasks...`);

//         // Run session check
//         setTimeout(async () => {
//           console.log(`\n🔔 [CATCHUP] Running SESSION_CHECK...`);
//           const { autoLogin } =
//             await import("../controllers/auth.controller.js");
//           await taskQueue.enqueue(
//             "CATCHUP_SESSION_CHECK",
//             async () => {
//               await autoLogin(ACCOUNT_ID);
//             },
//             { priority: 10 },
//           );
//         }, 5000);

//         // Run inbox check
//         setTimeout(async () => {
//           console.log(`\n🔔 [CATCHUP] Running AI_REPLY...`);
//           const { processAIReplies } =
//             await import("../controllers/ai-reply.controller.js");
//           await taskQueue.enqueue(
//             "CATCHUP_AI_REPLY",
//             async () => {
//               await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
//             },
//             { priority: 9, skipIfBusy: true },
//           );
//         }, 300000); // 5 min later
//       }
//     }
//   } catch (err) {
//     console.log(`   ⚠️  State check failed: ${err.message}`);
//   }

//   saveState();
// }

// function saveState() {
//   try {
//     writeFileSync(
//       STATE_FILE,
//       JSON.stringify(
//         {
//           lastRun: new Date().toISOString(),
//           version: "2.0.0",
//         },
//         null,
//         2,
//       ),
//     );
//   } catch {}
// }

// // Save state every 5 minutes to track activity
// setInterval(saveState, 5 * 60 * 1000);

// // Check on startup
// await checkMissedTasks();

// console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
// console.log(`║  🚀 KRISCENT LINKEDIN AUTOMATION                           ║`);
// console.log(`║  Office Hours: 10:30 AM - 6:30 PM IST                      ║`);
// console.log(
//   `║  Started: ${new Date().toLocaleString("en-IN", { timeZone: TZ }).padEnd(48)}║`,
// );
// console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

// console.log(`📊 Configuration:`);
// console.log(`   Account:       ${ACCOUNT_ID}`);
// console.log(`   Timezone:      ${TZ}`);
// console.log(
//   `   Comments:      ${ACTUALLY_COMMENT ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
// );
// console.log(
//   `   Connections:   ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
// );
// console.log(
//   `   Messages:      ${ACTUALLY_SEND ? "✅ LIVE" : "🔒 SAFE (dry run)"}`,
// );
// console.log(`   Daily limit:   ${config.maxMessagesPerDay} messages`);
// console.log(``);

// await connectDB();
// console.log(`✅ MongoDB connected`);
// console.log(``);

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Schedule task via cron + task queue
// // ═══════════════════════════════════════════════════════════════
// function scheduleTask(
//   cronPattern,
//   name,
//   importFn,
//   priority = 5,
//   skipIfBusy = false,
// ) {
//   cron.schedule(
//     cronPattern,
//     async () => {
//       const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
//       console.log(`\n🔔 [${now}] Cron triggered: ${name}`);
//       await taskQueue.enqueue(name, importFn, { priority, skipIfBusy });
//     },
//     { timezone: TZ },
//   );
// }

// // ═══════════════════════════════════════════════════════════════
// // PRIORITY LEVELS (higher = runs first when queued together)
// // 10 = SESSION_CHECK (critical, must run first)
// // 9  = AI_REPLY (user is waiting for response)
// // 8  = COMMENT_REPLIES (author engaged with our comment)
// // 7  = ACCEPTANCE_CHECK (know status changes)
// // 6  = WARMING_MESSAGES (freshly accepted, strike iron hot)
// // 5  = CONNECTIONS (build pipeline)
// // 4  = CONTACT_EXTRACTION (enrich data)
// // 3  = DISCOVERY (longest task, lowest priority — fills queue)
// // ═══════════════════════════════════════════════════════════════

// // ═══════════════════════════════════════════════════════════════
// // 🕥 10:30 AM (Mon-Sat) — SESSION CHECK
// // Verify LinkedIn login is valid before day starts
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "30 10 * * 1-6",
//   "SESSION_CHECK",
//   async () => {
//     const { autoLogin } = await import("../controllers/auth.controller.js");
//     await autoLogin(ACCOUNT_ID);
//   },
//   10,
//   true,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕥 10:45 AM (Mon-Sat) — MORNING DISCOVERY + COMMENT
// // Catches overnight posts from US/EU + fresh Indian morning posts
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "45 10 * * 1-6",
//   "MORNING_DISCOVERY",
//   async () => {
//     const { discoverLeads } =
//       await import("../controllers/discovery.controller.js");
//     await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
//   },
//   3,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕧 12:30 PM (Mon-Sat) — MORNING CONNECTIONS
// // Send connection requests to morning's high-scoring leads
// // Also: accepts incoming invites + extracts contact info
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "30 12 * * 1-6",
//   "MORNING_CONNECTIONS",
//   async () => {
//     const { sendConnectionBatch } =
//       await import("../controllers/connection-batch.controller.js");
//     await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   5,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕐 1:30 PM (Mon-Sat) — COMMENT REPLIES (morning check)
// // Check if post authors replied to our morning comments
// // Also handles when other users mention us in comments
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "30 13 * * 1-6",
//   "COMMENT_REPLIES_MORNING",
//   async () => {
//     const { processCommentReplies } =
//       await import("../controllers/comment-reply.controller.js");
//     await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   8,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕑 2:00 PM (Mon-Sat) — CHECK ACCEPTANCES
// // See who accepted our previous connection requests
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "0 14 * * 1-6",
//   "ACCEPTANCE_CHECK",
//   async () => {
//     const { checkAllAcceptances } =
//       await import("../controllers/acceptance-check.controller.js");
//     await checkAllAcceptances(ACCOUNT_ID);
//   },
//   7,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕝 2:30 PM (Mon-Sat) — WARMING MESSAGES
// // Send warm intro to newly accepted connections
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "30 14 * * 1-6",
//   "WARMING_MESSAGES",
//   async () => {
//     const { sendWarmingMessages } =
//       await import("../controllers/warming-message.controller.js");
//     await sendWarmingMessages(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   6,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕒 3:00 PM (Mon-Sat) — AI REPLY PROCESSOR (afternoon)
// // Check inbox, analyze conversations, send AI replies
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "0 15 * * 1-6",
//   "AI_REPLY_AFTERNOON",
//   async () => {
//     const { processAIReplies } =
//       await import("../controllers/ai-reply.controller.js");
//     await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   9,
//   true,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕓 4:00 PM (Mon-Sat) — EVENING DISCOVERY + COMMENT
// // Catches Indian founder posts + late US morning posts
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "0 16 * * 1-6",
//   "EVENING_DISCOVERY",
//   async () => {
//     const { discoverLeads } =
//       await import("../controllers/discovery.controller.js");
//     await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
//   },
//   3,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕠 5:30 PM (Mon-Sat) — EVENING CONNECTIONS
// // Send more connection requests based on evening discoveries
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "30 17 * * 1-6",
//   "EVENING_CONNECTIONS",
//   async () => {
//     const { sendConnectionBatch } =
//       await import("../controllers/connection-batch.controller.js");
//     await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   5,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕕 6:00 PM (Mon-Sat) — COMMENT REPLIES (evening check)
// // Second check for author replies + mentions
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "0 18 * * 1-6",
//   "COMMENT_REPLIES_EVENING",
//   async () => {
//     const { processCommentReplies } =
//       await import("../controllers/comment-reply.controller.js");
//     await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   8,
// );

// // ═══════════════════════════════════════════════════════════════
// // 🕡 6:15 PM (Mon-Sat) — FINAL AI REPLY CHECK
// // One last inbox check before end of day
// // ═══════════════════════════════════════════════════════════════
// scheduleTask(
//   "15 18 * * 1-6",
//   "AI_REPLY_FINAL",
//   async () => {
//     const { processAIReplies } =
//       await import("../controllers/ai-reply.controller.js");
//     await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
//   },
//   9,
//   true,
// );

// // ═══════════════════════════════════════════════════════════════
// // 💤 6:30 PM — END OF WORKDAY LOG
// // ═══════════════════════════════════════════════════════════════
// cron.schedule(
//   "30 18 * * 1-6",
//   () => {
//     console.log(
//       `\n╔═══════════════════════════════════════════════════════════╗`,
//     );
//     console.log(
//       `║  🌙 END OF WORKDAY — ${new Date().toLocaleTimeString("en-IN", { timeZone: TZ }).padEnd(37)}║`,
//     );
//     console.log(
//       `╚═══════════════════════════════════════════════════════════╝`,
//     );
//     const status = taskQueue.getStatus();
//     console.log(`\n📊 Today's Stats:`);
//     console.log(`   ✅ Tasks completed: ${status.stats.completed}`);
//     console.log(`   ❌ Tasks failed: ${status.stats.failed}`);
//     console.log(`   ⏭️  Tasks skipped: ${status.stats.skipped}`);
//     console.log(
//       `   ⏱️  Total runtime: ${Math.floor(status.stats.totalRuntimeMin)} min`,
//     );
//     console.log(``);
//     console.log(`   💤 Automation paused until tomorrow 10:30 AM`);
//     console.log(
//       `   📊 Review Google Sheet for hot leads to respond personally`,
//     );
//     console.log(``);
//   },
//   { timezone: TZ },
// );

// // ═══════════════════════════════════════════════════════════════
// // SCHEDULE SUMMARY
// // ═══════════════════════════════════════════════════════════════
// console.log(`📅 DAILY SCHEDULE (Mon-Sat, Timezone: ${TZ}):`);
// console.log(``);
// console.log(`   ┌─── MORNING ────────────────────────┐`);
// console.log(`   │  10:30 AM  🔐 Session check        │`);
// console.log(`   │  10:45 AM  🔍 Discovery + Comments │`);
// console.log(`   │  12:30 PM  📨 Send connections     │`);
// console.log(`   └────────────────────────────────────┘`);
// console.log(``);
// console.log(`   ┌─── AFTERNOON ──────────────────────┐`);
// console.log(`   │  01:30 PM  💬 Comment replies      │`);
// console.log(`   │  02:00 PM  ✅ Check acceptances    │`);
// console.log(`   │  02:30 PM  🤝 Warming messages     │`);
// console.log(`   │  03:00 PM  💬 AI reply processor   │`);
// console.log(`   └────────────────────────────────────┘`);
// console.log(``);
// console.log(`   ┌─── EVENING ────────────────────────┐`);
// console.log(`   │  04:00 PM  🔍 Discovery + Comments │`);
// console.log(`   │  05:30 PM  📨 Send connections     │`);
// console.log(`   │  06:00 PM  💬 Comment replies      │`);
// console.log(`   │  06:15 PM  💬 Final reply check    │`);
// console.log(`   │  06:30 PM  💤 End of workday       │`);
// console.log(`   └────────────────────────────────────┘`);
// console.log(``);
// console.log(`   ⚡ ONE task runs at a time (sequential — safe from IP ban)`);
// console.log(`   ⚡ 1-3 min cooldown between tasks`);
// console.log(`   ⚡ Sunday = no activity (respects human patterns)`);
// console.log(
//   `   ⚡ Connection batch also handles: contact info + incoming invites`,
// );
// console.log(``);
// console.log(`✅ Scheduler running 24/7 via PM2`);
// console.log(`   Press Ctrl+C to stop manually\n`);

// // ═══════════════════════════════════════════════════════════════
// // HEALTH MONITORING (every 10 min)
// // ═══════════════════════════════════════════════════════════════
// setInterval(
//   () => {
//     const status = taskQueue.getStatus();
//     const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });

//     if (status.isRunning) {
//       console.log(
//         `\n💓 [${now}] ACTIVE: "${status.currentTask}" | Queue: ${status.queueSize}`,
//       );
//     }
//   },
//   10 * 60 * 1000,
// );

// // ═══════════════════════════════════════════════════════════════
// // DAILY STATS RESET (midnight)
// // ═══════════════════════════════════════════════════════════════
// cron.schedule(
//   "0 0 * * *",
//   () => {
//     const now = new Date().toLocaleString("en-IN", { timeZone: TZ });
//     console.log(`\n🌅 [${now}] New day starting — daily counters reset\n`);
//     taskQueue.resetStats();
//   },
//   { timezone: TZ },
// );

// // ═══════════════════════════════════════════════════════════════
// // ERROR HANDLING
// // ═══════════════════════════════════════════════════════════════
// process.on("SIGINT", () => {
//   console.log(`\n\n🛑 Scheduler stopped manually`);
//   console.log(
//     `📊 Final stats:`,
//     JSON.stringify(taskQueue.getStatus().stats, null, 2),
//   );
//   process.exit(0);
// });

// process.on("SIGTERM", () => {
//   console.log(`\n\n🛑 Scheduler received SIGTERM (PM2 restart)`);
//   console.log(
//     `📊 Final stats:`,
//     JSON.stringify(taskQueue.getStatus().stats, null, 2),
//   );
//   process.exit(0);
// });

// process.on("uncaughtException", (err) => {
//   console.error(`\n💥 Uncaught exception:`, err.message);
//   console.error(err.stack);
//   console.log(
//     `⚠️  Scheduler continues running (PM2 will handle restart if needed)`,
//   );
// });

// process.on("unhandledRejection", (err) => {
//   console.error(`\n💥 Unhandled rejection:`, err);
// });

// import cron from "node-cron";
// import config from "../config/config.js";
// import { connectDB } from "../services/database/mongodb.service.js";
// import { taskQueue } from "../services/scheduler/task-queue.service.js";
// import { existsSync, readFileSync, writeFileSync } from "fs";

// const ACCOUNT_ID = process.env.ACCOUNT_ID || "account_1";
// const ACTUALLY_SEND = process.env.ACTUALLY_SEND === "true";
// const ACTUALLY_COMMENT = process.env.ACTUALLY_COMMENT === "true";
// const TZ = "Asia/Kolkata";
// const STATE_FILE = "./data/scheduler-state.json";

// async function checkMissedTasks() {
//   if (!existsSync(STATE_FILE)) { saveState(); return; }
//   try {
//     const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
//     const lastRun = new Date(state.lastRun);
//     const now = new Date();
//     const hoursDiff = (now - lastRun) / (1000 * 60 * 60);

//     console.log(`\n🕰️  Last activity: ${lastRun.toLocaleString("en-IN", { timeZone: TZ })}`);
//     console.log(`   Gap: ${hoursDiff.toFixed(1)} hours`);

//     if (hoursDiff > 4) {
//       const currentHour = now.getHours();
//       if (currentHour >= 10 && currentHour <= 19) {
//         console.log(`\n⚠️  Large gap — running catchup...`);
//         setTimeout(async () => {
//           const { autoLogin } = await import("../controllers/auth.controller.js");
//           await taskQueue.enqueue("CATCHUP_SESSION", async () => {
//             await autoLogin(ACCOUNT_ID);
//           }, { priority: 10 });
//         }, 5000);
//         setTimeout(async () => {
//           const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
//           await taskQueue.enqueue("CATCHUP_AI_REPLY", async () => {
//             await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
//           }, { priority: 9, skipIfBusy: true });
//         }, 300000);
//       }
//     }
//   } catch (err) {
//     console.log(`   ⚠️  State check failed: ${err.message}`);
//   }
//   saveState();
// }

// function saveState() {
//   try {
//     writeFileSync(STATE_FILE, JSON.stringify({ lastRun: new Date().toISOString(), version: "2.0.0" }, null, 2));
//   } catch {}
// }

// setInterval(saveState, 5 * 60 * 1000);
// await checkMissedTasks();

// console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
// console.log(`║  🚀 KRISCENT LINKEDIN AUTOMATION                           ║`);
// console.log(`║  Office Hours: 10:30 AM - 7:00 PM IST                      ║`);
// console.log(`║  Started: ${new Date().toLocaleString("en-IN", { timeZone: TZ }).padEnd(48)}║`);
// console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

// await connectDB();

// function scheduleTask(cronPattern, name, importFn, priority = 5, skipIfBusy = false) {
//   cron.schedule(cronPattern, async () => {
//     const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
//     console.log(`\n🔔 [${now}] Cron triggered: ${name}`);
//     await taskQueue.enqueue(name, importFn, { priority, skipIfBusy });
//   }, { timezone: TZ });
// }

// // ═══════════════════════════════════════════════════════════════
// // SCHEDULE (Mon-Sat, IST)
// // ═══════════════════════════════════════════════════════════════

// // 10:30 AM — Session Check (5 min)
// scheduleTask("30 10 * * 1-6", "SESSION_CHECK", async () => {
//   const { autoLogin } = await import("../controllers/auth.controller.js");
//   await autoLogin(ACCOUNT_ID);
// }, 10, true);

// // 10:45 AM — Morning Discovery + Comment (60-90 min)
// scheduleTask("45 10 * * 1-6", "MORNING_DISCOVERY", async () => {
//   const { discoverLeads } = await import("../controllers/discovery.controller.js");
//   await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
// }, 3);

// // 12:30 PM — Morning Connections (30-45 min)
// scheduleTask("30 12 * * 1-6", "MORNING_CONNECTIONS", async () => {
//   const { sendConnectionBatch } = await import("../controllers/connection-batch.controller.js");
//   await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
// }, 5);

// // 1:30 PM — Comment Replies Morning (20-30 min)
// scheduleTask("30 13 * * 1-6", "COMMENT_REPLIES_MORNING", async () => {
//   const { processCommentReplies } = await import("../controllers/comment-reply.controller.js");
//   await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
// }, 8);

// // 2:00 PM — Acceptance Check + Warm Messages (30-40 min)
// scheduleTask("0 14 * * 1-6", "ACCEPTANCE_AND_WARM", async () => {
//   const { checkAllAcceptances } = await import("../controllers/acceptance-check.controller.js");
//   await checkAllAcceptances(ACCOUNT_ID, ACTUALLY_SEND);
// }, 7);

// // 3:00 PM — AI Reply Processor (30-45 min)
// scheduleTask("0 15 * * 1-6", "AI_REPLY_AFTERNOON", async () => {
//   const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
//   await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
// }, 9, true);

// // 4:00 PM — Evening Discovery + Comment (60-90 min)
// scheduleTask("0 16 * * 1-6", "EVENING_DISCOVERY", async () => {
//   const { discoverLeads } = await import("../controllers/discovery.controller.js");
//   await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
// }, 3);

// // 5:30 PM — Evening Connections (30-45 min)
// scheduleTask("30 17 * * 1-6", "EVENING_CONNECTIONS", async () => {
//   const { sendConnectionBatch } = await import("../controllers/connection-batch.controller.js");
//   await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
// }, 5);

// // 6:00 PM — Comment Replies Evening (20-30 min)
// scheduleTask("0 18 * * 1-6", "COMMENT_REPLIES_EVENING", async () => {
//   const { processCommentReplies } = await import("../controllers/comment-reply.controller.js");
//   await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
// }, 8);

// // 6:30 PM — Final AI Reply Check (20-30 min)
// scheduleTask("30 18 * * 1-6", "AI_REPLY_FINAL", async () => {
//   const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
//   await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
// }, 9, true);

// // 7:00 PM — End of Day
// cron.schedule("0 19 * * 1-6", () => {
//   console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
//   console.log(`║  🌙 END OF WORKDAY — ${new Date().toLocaleTimeString("en-IN", { timeZone: TZ }).padEnd(37)}║`);
//   console.log(`╚═══════════════════════════════════════════════════════════╝`);
//   const status = taskQueue.getStatus();
//   console.log(`\n📊 Today's Stats:`);
//   console.log(`   ✅ Tasks completed: ${status.stats.completed}`);
//   console.log(`   ❌ Tasks failed: ${status.stats.failed}`);
//   console.log(`   ⏭️  Tasks skipped: ${status.stats.skipped}`);
//   console.log(`   ⏱️  Total runtime: ${Math.floor(status.stats.totalRuntimeMin)} min`);
//   console.log(`\n   💤 Automation paused until tomorrow 10:30 AM`);
// }, { timezone: TZ });

// // Daily stats reset at midnight
// cron.schedule("0 0 * * *", () => {
//   console.log(`\n🌅 New day — resetting daily counters\n`);
//   taskQueue.resetStats();
// }, { timezone: TZ });

// // Schedule summary
// console.log(`📅 DAILY SCHEDULE (Mon-Sat, IST):`);
// console.log(`   10:30 AM  🔐 Session check`);
// console.log(`   10:45 AM  🔍 Discovery + Comments + Contact + Connect + InMail`);
// console.log(`   12:30 PM  📨 Send connections`);
// console.log(`   01:30 PM  💬 Comment replies`);
// console.log(`   02:00 PM  ✅ Acceptance check + Warm messages`);
// console.log(`   03:00 PM  💬 AI reply processor`);
// console.log(`   04:00 PM  🔍 Evening discovery`);
// console.log(`   05:30 PM  📨 Evening connections`);
// console.log(`   06:00 PM  💬 Evening comment replies`);
// console.log(`   06:30 PM  💬 Final AI reply check`);
// console.log(`   07:00 PM  💤 End of workday\n`);
// console.log(`✅ Scheduler running\n`);

// // Health monitoring
// setInterval(() => {
//   const status = taskQueue.getStatus();
//   if (status.isRunning) {
//     const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
//     console.log(`\n💓 [${now}] ACTIVE: "${status.currentTask}" | Queue: ${status.queueSize}`);
//   }
// }, 10 * 60 * 1000);

// process.on("SIGINT", () => {
//   console.log(`\n🛑 Scheduler stopped`);
//   process.exit(0);
// });

// process.on("SIGTERM", () => {
//   console.log(`\n🛑 Scheduler SIGTERM`);
//   process.exit(0);
// });

// process.on("uncaughtException", (err) => {
//   console.error(`\n💥 Uncaught:`, err.message);
// });

// process.on("unhandledRejection", (err) => {
//   console.error(`\n💥 Unhandled:`, err);
// });

// server/scheduler/scheduler.js
import cron from "node-cron";
import config from "../config/config.js";
import { connectDB } from "../services/database/mongodb.service.js";
import { taskQueue } from "../services/scheduler/task-queue.service.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const ACCOUNT_ID = process.env.ACCOUNT_ID || "account_1";
const ACTUALLY_SEND = process.env.ACTUALLY_SEND === "true";
const ACTUALLY_COMMENT = process.env.ACTUALLY_COMMENT === "true";
const TZ = config.timezone || "Asia/Kolkata";
const STATE_FILE = "./data/scheduler-state.json";

// Work hours (from config or defaults)
const WORK_START_HOUR = 10;  // 10:30 AM
const WORK_END_HOUR = 18;    // 6:30 PM

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT — track last activity for missed task detection
// ═══════════════════════════════════════════════════════════════
function saveState() {
  try {
    // Ensure data directory exists
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastRun: new Date().toISOString(),
          version: "2.0.0",
          accountId: ACCOUNT_ID,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.log(`   ⚠️  Failed to save state: ${err.message}`);
  }
}

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

    // If PC was off/asleep >4 hours during business hours → run catchup
    if (hoursDiff > 4) {
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday
      
      // Only catchup during work hours Mon-Sat
      if (currentDay >= 1 && currentDay <= 6 && 
          currentHour >= WORK_START_HOUR && currentHour <= WORK_END_HOUR) {
        console.log(`\n⚠️  Large gap detected — running catchup tasks...`);

        // Catchup 1: Session check (immediate)
        setTimeout(async () => {
          console.log(`\n🔔 [CATCHUP] Enqueueing SESSION_CHECK...`);
          const { autoLogin } = await import("../controllers/auth.controller.js");
          taskQueue.enqueue(
            "CATCHUP_SESSION_CHECK",
            async () => {
              await autoLogin(ACCOUNT_ID);
            },
            { priority: 10 },
          );
        }, 5000);

        // Catchup 2: AI replies (5 min later)
        setTimeout(async () => {
          console.log(`\n🔔 [CATCHUP] Enqueueing AI_REPLY...`);
          const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
          taskQueue.enqueue(
            "CATCHUP_AI_REPLY",
            async () => {
              await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
            },
            { priority: 9, skipIfBusy: true },
          );
        }, 300000);
      } else {
        console.log(`   ⏭️  Outside work hours — no catchup`);
      }
    }
  } catch (err) {
    console.log(`   ⚠️  State check failed: ${err.message}`);
  }

  saveState();
}

// Save state every 5 minutes to track activity
setInterval(saveState, 5 * 60 * 1000);

// Check for missed tasks on startup
await checkMissedTasks();

// ═══════════════════════════════════════════════════════════════
// STARTUP BANNER
// ═══════════════════════════════════════════════════════════════
console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🚀 KRISCENT LINKEDIN AUTOMATION                           ║`);
console.log(`║  Office Hours: 10:30 AM - 6:30 PM IST (Mon-Sat)            ║`);
console.log(
  `║  Started: ${new Date().toLocaleString("en-IN", { timeZone: TZ }).padEnd(48)}║`,
);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

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

// ═══════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════
await connectDB();
console.log(`✅ MongoDB connected\n`);

// ═══════════════════════════════════════════════════════════════
// HELPER: Schedule task with duplicate protection
// ═══════════════════════════════════════════════════════════════
function scheduleTask(cronPattern, name, importFn, priority = 5, skipIfBusy = false) {
  cron.schedule(
    cronPattern,
    async () => {
      const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });
      
      // Duplicate protection: skip if same task already queued or running
      const status = taskQueue.getStatus();
      const alreadyQueued = status.queuedTasks.some(t => t.name === name);
      const alreadyRunning = status.currentTask === name;
      
      if (alreadyQueued || alreadyRunning) {
        console.log(`\n⏭️  [${now}] ${name} already queued/running — skipping cron trigger`);
        return;
      }
      
      console.log(`\n🔔 [${now}] Cron triggered: ${name}`);
      taskQueue.enqueue(name, importFn, { priority, skipIfBusy });
    },
    { timezone: TZ },
  );
}

// ═══════════════════════════════════════════════════════════════
// PRIORITY LEVELS
// 10 = SESSION_CHECK   (critical login validation)
// 9  = AI_REPLY        (user is waiting for response)
// 8  = COMMENT_REPLIES (author engaged with our comment)
// 7  = ACCEPTANCE      (connection status changes)
// 6  = WARMING         (freshly accepted, strike iron hot)
// 5  = CONNECTIONS     (build pipeline)
// 4  = CONTACT         (enrich data)
// 3  = DISCOVERY       (longest task, lowest priority)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 🕥 10:30 AM (Mon-Sat) — SESSION CHECK (3-5 min)
// Verify LinkedIn login is valid before day starts
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 🕥 10:45 AM (Mon-Sat) — MORNING DISCOVERY + COMMENT (60-90 min)
// Catches overnight posts from US/EU + fresh Indian morning posts
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "45 10 * * 1-6",
  "MORNING_DISCOVERY",
  async () => {
    const { discoverLeads } = await import("../controllers/discovery.controller.js");
    await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
  },
  3,
);

// ─────────────────────────────────────────────────────────────
// 🕧 12:30 PM (Mon-Sat) — MORNING CONNECTIONS (30-45 min)
// Send connection requests + accept incoming invites + extract contacts
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "30 12 * * 1-6",
  "MORNING_CONNECTIONS",
  async () => {
    const { sendConnectionBatch } = await import("../controllers/connection-batch.controller.js");
    await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
  },
  5,
);

// ─────────────────────────────────────────────────────────────
// 🕐 1:30 PM (Mon-Sat) — COMMENT REPLIES MORNING (20-30 min)
// Check if post authors replied to our morning comments
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "30 13 * * 1-6",
  "COMMENT_REPLIES_MORNING",
  async () => {
    const { processCommentReplies } = await import("../controllers/comment-reply.controller.js");
    await processCommentReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  8,
);

// ─────────────────────────────────────────────────────────────
// 🕑 2:15 PM (Mon-Sat) — ACCEPTANCE CHECK + WARM MESSAGES (30-40 min)
// Check who accepted + immediately send warm intro
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "15 14 * * 1-6",
  "ACCEPTANCE_AND_WARM",
  async () => {
    const { checkAllAcceptances } = await import("../controllers/acceptance-check.controller.js");
    await checkAllAcceptances(ACCOUNT_ID, ACTUALLY_SEND);
  },
  7,
);

// ─────────────────────────────────────────────────────────────
// 🕒 3:00 PM (Mon-Sat) — AI REPLY PROCESSOR (30-45 min)
// Check inbox, analyze conversations, send AI replies
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "0 15 * * 1-6",
  "AI_REPLY_AFTERNOON",
  async () => {
    const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
    await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  9,
  true,
);

// ─────────────────────────────────────────────────────────────
// 🕓 4:00 PM (Mon-Sat) — EVENING DISCOVERY + COMMENT (60-75 min)
// Catches Indian founder posts + late US morning posts
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "0 16 * * 1-6",
  "EVENING_DISCOVERY",
  async () => {
    const { discoverLeads } = await import("../controllers/discovery.controller.js");
    await discoverLeads(ACCOUNT_ID, ACTUALLY_COMMENT);
  },
  3,
);

// ─────────────────────────────────────────────────────────────
// 🕠 5:15 PM (Mon-Sat) — EVENING CONNECTIONS (30-40 min)
// Send more connection requests based on evening discoveries
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "15 17 * * 1-6",
  "EVENING_CONNECTIONS",
  async () => {
    const { sendConnectionBatch } = await import("../controllers/connection-batch.controller.js");
    await sendConnectionBatch(ACCOUNT_ID, ACTUALLY_SEND);
  },
  5,
);

// ─────────────────────────────────────────────────────────────
// 🕕 6:00 PM (Mon-Sat) — FINAL AI REPLY CHECK (20-25 min)
// Last inbox check before end of day
// ─────────────────────────────────────────────────────────────
scheduleTask(
  "0 18 * * 1-6",
  "AI_REPLY_FINAL",
  async () => {
    const { processAIReplies } = await import("../controllers/ai-reply.controller.js");
    await processAIReplies(ACCOUNT_ID, ACTUALLY_SEND);
  },
  9,
  true,
);

// ─────────────────────────────────────────────────────────────
// 💤 6:30 PM (Mon-Sat) — END OF WORKDAY LOG
// ─────────────────────────────────────────────────────────────
cron.schedule(
  "30 18 * * 1-6",
  () => {
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(
      `║  🌙 END OF WORKDAY — ${new Date().toLocaleTimeString("en-IN", { timeZone: TZ }).padEnd(37)}║`,
    );
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    
    const status = taskQueue.getStatus();
    console.log(`\n📊 Today's Stats:`);
    console.log(`   ✅ Tasks completed: ${status.stats.completed}`);
    console.log(`   ❌ Tasks failed: ${status.stats.failed}`);
    console.log(`   ⏭️  Tasks skipped: ${status.stats.skipped}`);
    console.log(`   ⏱️  Total runtime: ${Math.floor(status.stats.totalRuntimeMin)} min`);
    console.log(``);
    console.log(`   💤 Automation paused until tomorrow 10:30 AM`);
    console.log(`   📊 Review Google Sheet for hot leads to respond personally`);
    console.log(``);
  },
  { timezone: TZ },
);

// ─────────────────────────────────────────────────────────────
// 🌅 12:00 AM — DAILY STATS RESET
// ─────────────────────────────────────────────────────────────
cron.schedule(
  "0 0 * * *",
  () => {
    const now = new Date().toLocaleString("en-IN", { timeZone: TZ });
    console.log(`\n🌅 [${now}] New day starting — daily counters reset\n`);
    taskQueue.resetStats();
  },
  { timezone: TZ },
);

// ═══════════════════════════════════════════════════════════════
// SCHEDULE SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`📅 DAILY SCHEDULE (Mon-Sat, Timezone: ${TZ}):`);
console.log(``);
console.log(`   ┌─── MORNING ─────────────────────────────────┐`);
console.log(`   │  10:30 AM  🔐 Session check      (~5 min)   │`);
console.log(`   │  10:45 AM  🔍 Discovery + Comments (60-90m) │`);
console.log(`   │  12:30 PM  📨 Send connections   (30-45m)   │`);
console.log(`   └─────────────────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── AFTERNOON ───────────────────────────────┐`);
console.log(`   │  01:30 PM  💬 Comment replies    (20-30m)   │`);
console.log(`   │  02:15 PM  ✅ Acceptance + Warm  (30-40m)   │`);
console.log(`   │  03:00 PM  💬 AI reply processor (30-45m)   │`);
console.log(`   └─────────────────────────────────────────────┘`);
console.log(``);
console.log(`   ┌─── EVENING ─────────────────────────────────┐`);
console.log(`   │  04:00 PM  🔍 Evening discovery  (60-75m)   │`);
console.log(`   │  05:15 PM  📨 Evening connections (30-40m)  │`);
console.log(`   │  06:00 PM  💬 Final AI reply     (20-25m)   │`);
console.log(`   │  06:30 PM  💤 End of workday                │`);
console.log(`   └─────────────────────────────────────────────┘`);
console.log(``);
console.log(`   ⚡ ONE task at a time (sequential — safe from IP ban)`);
console.log(`   ⚡ 1-3 min cooldown between tasks`);
console.log(`   ⚡ Duplicate protection: skips if already queued/running`);
console.log(`   ⚡ Sunday = OFF (respects human patterns)`);
console.log(`   ⚡ Connection batch handles: contact info + incoming invites`);
console.log(``);
console.log(`✅ Scheduler running 24/7 via PM2`);
console.log(`   Press Ctrl+C to stop manually\n`);

// ═══════════════════════════════════════════════════════════════
// HEALTH MONITORING — logs active task every 10 min
// ═══════════════════════════════════════════════════════════════
setInterval(
  () => {
    const status = taskQueue.getStatus();
    const now = new Date().toLocaleTimeString("en-IN", { timeZone: TZ });

    if (status.isRunning) {
      console.log(
        `\n💓 [${now}] ACTIVE: "${status.currentTask}" | Queue: ${status.queueSize}`,
      );
      
      if (status.queueSize > 0) {
        console.log(`   Queued tasks:`);
        status.queuedTasks.forEach((t, i) => {
          console.log(`     ${i + 1}. ${t.name} (priority: ${t.priority}, waiting: ${t.waitedSec}s)`);
        });
      }
    }
  },
  10 * 60 * 1000, // every 10 min
);

// ═══════════════════════════════════════════════════════════════
// PROCESS SIGNALS
// ═══════════════════════════════════════════════════════════════
process.on("SIGINT", () => {
  console.log(`\n\n🛑 Scheduler stopped manually (Ctrl+C)`);
  console.log(
    `📊 Final stats:`,
    JSON.stringify(taskQueue.getStatus().stats, null, 2),
  );
  saveState();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(`\n\n🛑 Scheduler received SIGTERM (PM2 restart)`);
  console.log(
    `📊 Final stats:`,
    JSON.stringify(taskQueue.getStatus().stats, null, 2),
  );
  saveState();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(`\n💥 Uncaught exception:`, err.message);
  console.error(err.stack);
  console.log(`⚠️  Scheduler continues (PM2 will restart if needed)`);
});

process.on("unhandledRejection", (err) => {
  console.error(`\n💥 Unhandled rejection:`, err);
});