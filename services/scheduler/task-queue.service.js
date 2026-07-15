/**
 * Sequential Task Queue for LinkedIn Automation
 *
 * PURPOSE:
 * Ensures ONLY ONE browser task runs at a time to prevent:
 * - Multiple browsers open concurrently (LinkedIn ban risk)
 * - Cron jobs overlapping (e.g., discovery running while connections start)
 * - Resource contention on the PC
 *
 * USAGE:
 * - Fire-and-forget: enqueue() returns immediately
 * - Tasks run one-by-one in priority order (higher priority first)
 * - Same priority = FIFO (first-in-first-out)
 * - Automatic 1-3 min cooldown between tasks
 *
 * PRIORITY LEVELS:
 * - 10 = Critical (session check)
 * - 9  = High (AI reply, user is waiting)
 * - 8  = High (comment replies to author engagement)
 * - 7  = Medium-High (acceptance check)
 * - 6  = Medium (warming messages)
 * - 5  = Medium (connections — default)
 * - 4  = Medium-Low (contact extraction)
 * - 3  = Low (discovery — longest task)
 */

class TaskQueue {
  constructor() {
    this.queue = [];
    this.isRunning = false;
    this.currentTask = null;
    this.stats = {
      completed: 0,
      failed: 0,
      skipped: 0,
      totalRuntime: 0,
    };
  }

  /**
   * Add task to queue (fire-and-forget)
   *
   * @param {string} taskName - Unique identifier for the task
   * @param {Function} taskFn - Async function to execute
   * @param {Object} options - { priority: number, skipIfBusy: boolean }
   * @returns {Object} - { success, queued, reason }
   */
  enqueue(taskName, taskFn, options = {}) {
    const { priority = 5, skipIfBusy = false } = options;

    // Skip if busy AND skipIfBusy flag is true
    // (Used for tasks that shouldn't stack up, like AI replies)
    if (this.isRunning && skipIfBusy) {
      console.log(
        `\n⚠️  [QUEUE] "${taskName}" SKIPPED — another task running: "${this.currentTask}"`,
      );
      this.stats.skipped++;
      return { success: false, reason: "queue_busy" };
    }

    const task = {
      name: taskName,
      fn: taskFn,
      priority,
      enqueuedAt: new Date(),
    };

    console.log(
      `\n📥 [QUEUE] Added "${taskName}" (priority: ${priority}, queue size: ${this.queue.length + 1})`,
    );

    // Insert by priority (higher priority runs first)
    // Same priority preserves insertion order (FIFO)
    const insertIndex = this.queue.findIndex((t) => t.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    // Start processing (fire-and-forget)
    if (!this.isRunning) {
      this._processQueue().catch((err) => {
        console.error(`[QUEUE] Processor error:`, err);
        this.isRunning = false;
      });
    } else {
      console.log(`   ⏳ Waiting behind: ${this.currentTask}`);
    }

    return { success: true, queued: true };
  }

  /**
   * Internal: Process all queued tasks sequentially
   * Runs one at a time with cooldowns between
   */
  async _processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.currentTask = task.name;

      const startTime = Date.now();
      const waitedMs = startTime - task.enqueuedAt.getTime();

      console.log(`\n${"═".repeat(63)}`);
      console.log(`🚀 [QUEUE] Starting: "${task.name}"`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Waited in queue: ${Math.floor(waitedMs / 1000)}s`);
      console.log(`   Remaining in queue: ${this.queue.length}`);
      console.log("═".repeat(63));

      try {
        await task.fn();
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        this.stats.completed++;
        this.stats.totalRuntime += runtime;

        console.log(
          `\n✅ [QUEUE] Completed: "${task.name}" (${runtime}s = ${Math.floor(runtime / 60)} min)`,
        );
      } catch (err) {
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        this.stats.failed++;
        console.error(`\n❌ [QUEUE] Failed: "${task.name}" (${runtime}s)`);
        console.error(`   Error: ${err.message}`);
        if (err.stack) console.error(err.stack);
      }

      this.currentTask = null;

      // Cooldown between tasks (only if more tasks pending)
      if (this.queue.length > 0) {
        const cooldownSec = 60 + Math.floor(Math.random() * 120); // 1-3 min
        console.log(
          `\n💤 [QUEUE] Cooling down ${cooldownSec}s before next task...`,
        );
        console.log(`   Next: "${this.queue[0].name}"`);
        await new Promise((r) => setTimeout(r, cooldownSec * 1000));
      }
    }

    this.isRunning = false;

    console.log(`\n📊 [QUEUE] Queue empty. Session stats:`);
    console.log(`   ✅ Completed: ${this.stats.completed}`);
    console.log(`   ❌ Failed: ${this.stats.failed}`);
    console.log(`   ⏭️  Skipped: ${this.stats.skipped}`);
    console.log(
      `   ⏱️  Total runtime: ${Math.floor(this.stats.totalRuntime / 60)} min\n`,
    );
  }

  /**
   * Get current queue status
   * Used for monitoring + health checks
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      queueSize: this.queue.length,
      queuedTasks: this.queue.map((t) => ({
        name: t.name,
        priority: t.priority,
        waitedSec: Math.floor((Date.now() - t.enqueuedAt.getTime()) / 1000),
      })),
      stats: {
        completed: this.stats.completed,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
        totalRuntimeMin: Math.floor(this.stats.totalRuntime / 60),
      },
    };
  }

  /**
   * Clear the queue (emergency stop)
   * Doesn't stop currently running task
   */
  clearQueue() {
    const removed = this.queue.length;
    this.queue = [];
    console.log(`\n🛑 [QUEUE] Cleared ${removed} pending tasks`);
    return removed;
  }

  /**
   * Reset statistics (called at midnight for daily reset)
   */
  resetStats() {
    console.log(`\n🔄 [QUEUE] Resetting daily stats`);
    console.log(`   Previous: ${this.stats.completed} completed, ${this.stats.failed} failed`);
    this.stats = {
      completed: 0,
      failed: 0,
      skipped: 0,
      totalRuntime: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Singleton instance — same queue shared across all imports
// ═══════════════════════════════════════════════════════════════
export const taskQueue = new TaskQueue();