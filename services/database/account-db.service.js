import Account from "../../models/Account.model.js";
import { connectDB } from "./mongodb.service.js";

const INMAIL_BLOCK_DAYS = 30;

/**
 * Get or create account record
 */
export async function getOrCreateAccount(accountId) {
  await connectDB();
  let account = await Account.findOne({ accountId });
  if (!account) {
    account = await Account.create({ accountId });
  }
  return account;
}

/**
 * Check if InMail is blocked for this account
 */
export async function isInMailBlocked(accountId) {
  await connectDB();
  const account = await Account.findOne({ accountId });
  if (!account || !account.inMailBlocked || !account.inMailBlockedUntil) {
    return { blocked: false };
  }

  const now = new Date();
  if (now >= new Date(account.inMailBlockedUntil)) {
    // Block expired — clear it
    await Account.findOneAndUpdate(
      { accountId },
      {
        $set: {
          inMailBlocked: false,
          inMailBlockedAt: null,
          inMailBlockedUntil: null,
          inMailBlockReason: null,
        },
      },
    );
    return { blocked: false };
  }

  const daysRemaining = Math.ceil(
    (new Date(account.inMailBlockedUntil) - now) / (1000 * 60 * 60 * 24),
  );

  return {
    blocked: true,
    blockedUntil: account.inMailBlockedUntil,
    daysRemaining,
    reason: account.inMailBlockReason,
  };
}

/**
 * Set InMail block for 30 days
 */
export async function setInMailBlock(accountId, reason = "premium_required") {
  await connectDB();
  const blockedUntil = new Date();
  blockedUntil.setDate(blockedUntil.getDate() + INMAIL_BLOCK_DAYS);

  await Account.findOneAndUpdate(
    { accountId },
    {
      $set: {
        inMailBlocked: true,
        inMailBlockedAt: new Date(),
        inMailBlockedUntil: blockedUntil,
        inMailBlockReason: reason,
      },
    },
    { upsert: true },
  );

  console.log(
    `   🚫 InMail blocked for ${accountId} until ${blockedUntil.toDateString()} (${INMAIL_BLOCK_DAYS} days)`,
  );
  return { blockedUntil, daysRemaining: INMAIL_BLOCK_DAYS };
}

/**
 * Clear InMail block manually
 */
export async function clearInMailBlock(accountId) {
  await connectDB();
  await Account.findOneAndUpdate(
    { accountId },
    {
      $set: {
        inMailBlocked: false,
        inMailBlockedAt: null,
        inMailBlockedUntil: null,
        inMailBlockReason: null,
      },
    },
  );
  console.log(`   ✅ InMail block cleared for ${accountId}`);
}

/**
 * Mark notes limit hit
 */
export async function markNotesLimitHit(accountId) {
  await connectDB();
  await Account.findOneAndUpdate(
    { accountId },
    { $set: { notesLimitHit: true, notesLimitHitAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Check notes limit
 */
export async function isNotesLimitHit(accountId) {
  await connectDB();
  const account = await Account.findOne({ accountId });
  return account?.notesLimitHit === true;
}

/**
 * Update last activity
 */
export async function updateAccountActivity(accountId) {
  await connectDB();
  await Account.findOneAndUpdate(
    { accountId },
    { $set: { lastOutreachAt: new Date() } },
    { upsert: true },
  );
}