/**
 * Test FULL automation flow — runs all tasks in strict sequential order
 *
 * Usage:
 *   node scripts/test-full-flow.js account_1 --send --comment
 */
import { taskQueue } from "../services/scheduler/task-queue.service.js";
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";

const accountId = process.argv[2] || "account_1";
const actuallySend = process.argv.includes("--send");
const actuallyComment = process.argv.includes("--comment");

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🧪 FULL FLOW TEST — SEQUENTIAL EXECUTION                  ║`);
console.log(`║  Account: ${accountId.padEnd(48)}║`);
console.log(`║  Send: ${(actuallySend ? "REAL" : "SAFE").padEnd(51)}║`);
console.log(`║  Comment: ${(actuallyComment ? "REAL" : "SAFE").padEnd(48)}║`);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

if (!actuallySend || !actuallyComment) {
  console.log(`⚠️  Running in SAFE mode — no real actions`);
  console.log(`   For real test: node scripts/test-full-flow.js account_1 --send --comment\n`);
}

await connectDB();

// ═══════════════════════════════════════════════════════════════
// Tasks in strict sequential order (use SAME priority to preserve order)
// ═══════════════════════════════════════════════════════════════
const tasks = [
  // {
  //   name: "1_DISCOVERY_AND_COMMENT",
  //   fn: async () => {
  //     const { discoverLeads } = await import("../controllers/discovery.controller.js");
  //     await discoverLeads(accountId, actuallyComment);
  //   },
  // },
  {
    name: "2_CONNECTIONS_AND_CONTACTS",
    fn: async () => {
      const { sendConnectionBatch } = await import(
        "../controllers/connection-batch.controller.js"
      );
      await sendConnectionBatch(accountId, actuallySend);
    },
  },
  {
    name: "3_COMMENT_REPLIES",
    fn: async () => {
      const { processCommentReplies } = await import(
        "../controllers/comment-reply.controller.js"
      );
      await processCommentReplies(accountId, actuallySend);
    },
  },
  {
    name: "4_ACCEPTANCE_CHECK",
    fn: async () => {
      const { checkAllAcceptances } = await import(
        "../controllers/acceptance-check.controller.js"
      );
      await checkAllAcceptances(accountId);
    },
  },
  {
    name: "5_WARMING_MESSAGES",
    fn: async () => {
      const { sendWarmingMessages } = await import(
        "../controllers/warming-message.controller.js"
      );
      await sendWarmingMessages(accountId, actuallySend);
    },
  },
  {
    name: "6_AI_REPLY",
    fn: async () => {
      const { processAIReplies } = await import(
        "../controllers/ai-reply.controller.js"
      );
      await processAIReplies(accountId, actuallySend);
    },
  },
];

console.log(`\n📋 Will run ${tasks.length} tasks in strict sequence:\n`);
tasks.forEach((t, i) => console.log(`   ${i + 1}. ${t.name}`));
console.log(``);

// ═══════════════════════════════════════════════════════════════
// Run tasks ONE BY ONE using AWAIT (not queue-based)
// This guarantees strict sequential execution
// ═══════════════════════════════════════════════════════════════
let stats = {
  completed: 0,
  failed: 0,
  totalRuntime: 0,
};

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];

  console.log(`\n\n${"═".repeat(63)}`);
  console.log(`🚀 [${i + 1}/${tasks.length}] Starting: ${task.name}`);
  console.log(`${"═".repeat(63)}`);

  const startTime = Date.now();

  try {
    await task.fn();
    const runtime = Math.floor((Date.now() - startTime) / 1000);
    stats.completed++;
    stats.totalRuntime += runtime;

    console.log(`\n✅ [${i + 1}/${tasks.length}] Completed: ${task.name} (${runtime}s = ${Math.floor(runtime / 60)} min)`);
  } catch (err) {
    const runtime = Math.floor((Date.now() - startTime) / 1000);
    stats.failed++;
    console.error(`\n❌ [${i + 1}/${tasks.length}] Failed: ${task.name} (${runtime}s)`);
    console.error(`   Error: ${err.message}`);
    console.error(err.stack);
  }

  // Cooldown between tasks (except after last one)
  if (i < tasks.length - 1) {
    const cooldownSec = 60 + Math.floor(Math.random() * 120); // 1-3 min
    console.log(`\n💤 Cooling down ${cooldownSec}s before next task...`);
    console.log(`   Next: ${tasks[i + 1].name}`);

    // Show countdown every 30s
    const cooldownStart = Date.now();
    const cooldownEndTime = cooldownStart + cooldownSec * 1000;
    const countdownInterval = setInterval(() => {
      const remaining = Math.floor((cooldownEndTime - Date.now()) / 1000);
      if (remaining > 0) {
        console.log(`   ⏰ ${remaining}s remaining...`);
      }
    }, 30000);

    await new Promise((r) => setTimeout(r, cooldownSec * 1000));
    clearInterval(countdownInterval);
  }
}

// ═══════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  🎉 ALL TASKS COMPLETED                                    ║`);
console.log(`╠═══════════════════════════════════════════════════════════╣`);
console.log(`║  ✅ Completed: ${String(stats.completed).padEnd(43)}║`);
console.log(`║  ❌ Failed: ${String(stats.failed).padEnd(46)}║`);
console.log(`║  ⏱️  Total runtime: ${String(Math.floor(stats.totalRuntime / 60)).padEnd(38)} min ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

await disconnectDB();
process.exit(0);

// Handle Ctrl+C
process.on("SIGINT", async () => {
  console.log(`\n\n🛑 Stopped manually`);
  console.log(`📊 Progress: ${stats.completed}/${tasks.length} tasks completed`);
  await disconnectDB();
  process.exit(0);
});