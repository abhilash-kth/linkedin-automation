/**
 * Sequential Task Queue
 * Ensures ONLY ONE browser task runs at a time
 * Prevents IP bans from concurrent LinkedIn access
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
   * Add task to queue
   * If a task is already running, this one waits
   */
  async enqueue(taskName, taskFn, options = {}) {
    const { priority = 5, skipIfBusy = false } = options;

    // If already busy and skipIfBusy is true, skip this run
    if (this.isRunning && skipIfBusy) {
      console.log(`\n⚠️  [QUEUE] "${taskName}" SKIPPED — another task running: "${this.currentTask}"`);
      this.stats.skipped++;
      return { success: false, reason: "queue_busy" };
    }

    const task = {
      name: taskName,
      fn: taskFn,
      priority,
      enqueuedAt: new Date(),
    };

    console.log(`\n📥 [QUEUE] Added "${taskName}" (queue size: ${this.queue.length + 1})`);

    // Insert by priority (higher priority first)
    const insertIndex = this.queue.findIndex((t) => t.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    // Start processing if idle
    if (!this.isRunning) {
      return await this._processQueue();
    } else {
      console.log(`   ⏳ Waiting behind: ${this.currentTask}`);
      return { success: true, queued: true };
    }
  }

  /**
   * Process tasks one by one
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
      console.log(`   Waited in queue: ${Math.floor(waitedMs / 1000)}s`);
      console.log(`   Remaining in queue: ${this.queue.length}`);
      console.log("═".repeat(63));

      try {
        await task.fn();
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        this.stats.completed++;
        this.stats.totalRuntime += runtime;

        console.log(`\n✅ [QUEUE] Completed: "${task.name}" (${runtime}s)`);
      } catch (err) {
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        this.stats.failed++;
        console.error(`\n❌ [QUEUE] Failed: "${task.name}" (${runtime}s)`);
        console.error(`   Error: ${err.message}`);
      }

      this.currentTask = null;

      // Cooldown between tasks (safety buffer)
      if (this.queue.length > 0) {
        const cooldownSec = 60 + Math.floor(Math.random() * 120); // 1-3 min
        console.log(`\n💤 [QUEUE] Cooling down ${cooldownSec}s before next task...`);
        console.log(`   Next: "${this.queue[0].name}"`);
        await new Promise((r) => setTimeout(r, cooldownSec * 1000));
      }
    }

    this.isRunning = false;
    console.log(`\n📊 [QUEUE] All tasks done. Stats:`);
    console.log(`   ✅ Completed: ${this.stats.completed}`);
    console.log(`   ❌ Failed: ${this.stats.failed}`);
    console.log(`   ⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`   ⏱️  Total runtime: ${Math.floor(this.stats.totalRuntime / 60)} min\n`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      queueSize: this.queue.length,
      queuedTasks: this.queue.map((t) => t.name),
      stats: this.stats,
    };
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();