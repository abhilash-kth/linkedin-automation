import fs from "fs/promises";
import path from "path";

const BLOCK_FILE = "./data/comment-block-state.json";
const BLOCK_DURATION_HOURS = 48;

/**
 * Check if commenting is currently blocked for an account
 */
export async function getCommentBlockStatus(accountId) {
  try {
    const raw = await fs.readFile(BLOCK_FILE, "utf-8").catch(() => "{}");
    const state = JSON.parse(raw || "{}");
    const entry = state[accountId];

    if (!entry || !entry.blockedUntil) {
      return { blocked: false };
    }

    const blockedUntil = new Date(entry.blockedUntil);
    const now = new Date();

    if (now >= blockedUntil) {
      // Block expired — clean up
      delete state[accountId];
      await saveState(state);
      return { blocked: false };
    }

    const hoursRemaining = Math.ceil((blockedUntil - now) / (1000 * 60 * 60));

    return {
      blocked: true,
      blockedUntil,
      hoursRemaining,
      blockedAt: entry.blockedAt,
      reason: entry.reason,
    };
  } catch (err) {
    return { blocked: false };
  }
}

/**
 * Block commenting for an account for 48 hours
 */
export async function setCommentBlock(accountId, reason = "rate_limit") {
  try {
    const raw = await fs.readFile(BLOCK_FILE, "utf-8").catch(() => "{}");
    const state = JSON.parse(raw || "{}");

    const blockedUntil = new Date();
    blockedUntil.setHours(blockedUntil.getHours() + BLOCK_DURATION_HOURS);

    state[accountId] = {
      blockedAt: new Date().toISOString(),
      blockedUntil: blockedUntil.toISOString(),
      reason,
    };

    await saveState(state);

    return { blockedUntil, hoursRemaining: BLOCK_DURATION_HOURS };
  } catch (err) {
    console.log(`   ⚠️  Failed to save block state: ${err.message}`);
    return null;
  }
}

/**
 * Manually clear block for an account
 */
export async function clearCommentBlock(accountId) {
  try {
    const raw = await fs.readFile(BLOCK_FILE, "utf-8").catch(() => "{}");
    const state = JSON.parse(raw || "{}");
    delete state[accountId];
    await saveState(state);
    return true;
  } catch {
    return false;
  }
}

async function saveState(state) {
  try {
    await fs.mkdir(path.dirname(BLOCK_FILE), { recursive: true });
    await fs.writeFile(BLOCK_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.log(`   ⚠️  Failed to write block state: ${err.message}`);
  }
}

/**
 * Print block status banner
 */
export function printBlockBanner(accountId, hoursRemaining, blockedUntil) {
  const days = Math.ceil(hoursRemaining / 24);
  console.log(``);
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🚫  COMMENT RATE LIMIT ACTIVE  🚫                          ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
  console.log(`║  🚫 STATUS: COMMENTS BLOCKED                                ║`);
  console.log(`║  📅 Unblocks: ${new Date(blockedUntil).toLocaleString("en-US").padEnd(45)}║`);
  console.log(
    `║  ⏳ Time remaining: ${(hoursRemaining + " hours (" + days + " days)").padEnd(38)}║`,
  );
  console.log(`║                                                            ║`);
  console.log(`║  💡 LinkedIn blocked our comment automation                 ║`);
  console.log(`║     Wait ${String(hoursRemaining).padEnd(3)} hrs OR switch to another account         ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(``);
}