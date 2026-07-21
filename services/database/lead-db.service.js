// import Lead from "../../models/Lead.model.js";
// import { connectDB } from "./mongodb.service.js";

// export async function hasCommentedOnPost(postUrl) {
//   await connectDB();
//   const lead = await Lead.findOne({
//     postUrl: postUrl,
//     status: { $in: ["commented", "connection_sent", "accepted", "message_sent"] },
//   });
//   return !!lead;
// }

// export async function checkLeadExists(profileUrl) {
//   await connectDB();
//   const lead = await Lead.findOne({ profileUrl });

//   if (!lead) return { exists: false, lead: null, daysSinceLastAction: null };

//   const lastAction = lead.lastProcessedAt || lead.updatedAt || lead.createdAt;
//   const daysSince = Math.floor((Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24));

//   return { exists: true, lead, daysSinceLastAction: daysSince };
// }

// export async function shouldSkipLead(profileUrl, minDaysSince = 7) {
//   const { exists, daysSinceLastAction } = await checkLeadExists(profileUrl);
//   if (!exists) return false;
//   return daysSinceLastAction < minDaysSince;
// }

// // Keep all your existing exports
// export async function upsertLead(leadData) {
//   await connectDB();
//   const lead = await Lead.findOneAndUpdate(
//     { profileUrl: leadData.profileUrl },
//     { $set: leadData },
//     { upsert: true, returnDocument: 'after' },
//   );
//   return lead;
// }

// export async function getLeadByUrl(profileUrl) {
//   await connectDB();
//   return await Lead.findOne({ profileUrl });
// }

// export async function getLeadsByStatus(status, accountId = null) {
//   await connectDB();
//   const filter = status ? { status } : {};
//   if (accountId) filter.accountId = accountId;
//   return await Lead.find(filter).sort({ conversionScore: -1 });
// }

// export async function getPendingLeads(accountId) {
//   await connectDB();
//   return await Lead.find({
//     accountId,
//     status: { $in: ["pending", "failed_retry"] },
//     retryCount: { $lt: 3 },
//   }).sort({ conversionScore: -1 });
// }

// export async function updateLeadStatus(profileUrl, status, extras = {}) {
//   await connectDB();
//   return await Lead.findOneAndUpdate(
//     { profileUrl },
//     {
//       $set: {
//         status,
//         lastProcessedAt: new Date(),
//         ...extras,
//       },
//     },
//     { returnDocument: 'after' },
//   );
// }

// export async function getAcceptedLeads(accountId) {
//   await connectDB();
//   return await Lead.find({ accountId, status: "accepted" });
// }

// export async function getPendingAcceptanceLeads(accountId) {
//   await connectDB();
//   return await Lead.find({
//     accountId,
//     status: { $in: ["connection_sent", "connection_and_message_sent", "pending_acceptance"] },
//   });
// }

// export async function getTodayCount(accountId) {
//   await connectDB();
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   return await Lead.countDocuments({
//     accountId,
//     lastProcessedAt: { $gte: today },
//   });

// }

import Lead from "../../models/Lead.model.js";
import { connectDB } from "./mongodb.service.js";

// ═══════════════════════════════════════════════════════════════
// EXISTING FUNCTIONS (unchanged)
// ═══════════════════════════════════════════════════════════════

export async function hasCommentedOnPost(postUrl) {
  await connectDB();
  const lead = await Lead.findOne({
    postUrl: postUrl,
    status: {
      $in: ["commented", "connection_sent", "accepted", "message_sent"],
    },
  });
  return !!lead;
}

export async function checkLeadExists(profileUrl) {
  await connectDB();
  const lead = await Lead.findOne({ profileUrl });

  if (!lead) return { exists: false, lead: null, daysSinceLastAction: null };

  const lastAction = lead.lastProcessedAt || lead.updatedAt || lead.createdAt;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24),
  );

  return { exists: true, lead, daysSinceLastAction: daysSince };
}

export async function shouldSkipLead(profileUrl, minDaysSince = 7) {
  const { exists, daysSinceLastAction } = await checkLeadExists(profileUrl);
  if (!exists) return false;
  return daysSinceLastAction < minDaysSince;
}

// export async function upsertLead(leadData) {
//   await connectDB();
//   const lead = await Lead.findOneAndUpdate(
//     { profileUrl: leadData.profileUrl },
//     { $set: leadData },
//     { upsert: true, returnDocument: "after" },
//   );
//   return lead;
// }

export async function upsertLead(leadData) {
  await connectDB();

  // Fields that should NEVER be overwritten with empty/null values
  // if a better value already exists in MongoDB
  const PROTECT_IF_EMPTY = [
    "title",
    "headline",
    "email",
    "phone",
    "website",
    "location",
    "company",
    "about",
    "firstName",
    "lastName",
    "vanityName",
  ];

  // Check if lead already exists
  const existing = await Lead.findOne(
    { profileUrl: leadData.profileUrl },
    PROTECT_IF_EMPTY.reduce((acc, f) => ({ ...acc, [f]: 1 }), {}),
  );

  // Build safe $set — skip empty values for protected fields
  const safeSet = { ...leadData };

  if (existing) {
    for (const field of PROTECT_IF_EMPTY) {
      const incomingValue = leadData[field];
      const existingValue = existing[field];

      const incomingEmpty =
        incomingValue === null ||
        incomingValue === undefined ||
        incomingValue === "";

      const existingHasValue =
        existingValue !== null &&
        existingValue !== undefined &&
        existingValue !== "";

      if (incomingEmpty && existingHasValue) {
        delete safeSet[field];
      }
    }
  }

  const lead = await Lead.findOneAndUpdate(
    { profileUrl: leadData.profileUrl },
    { $set: safeSet },
    { upsert: true, returnDocument: "after" },
  );
  return lead;
}

export async function getLeadByUrl(profileUrl) {
  await connectDB();
  return await Lead.findOne({ profileUrl });
}

export async function getLeadsByStatus(status, accountId = null) {
  await connectDB();
  const filter = status ? { status } : {};
  if (accountId) filter.accountId = accountId;
  return await Lead.find(filter).sort({ conversionScore: -1 });
}

export async function getPendingLeads(accountId) {
  await connectDB();
  return await Lead.find({
    accountId,
    status: { $in: ["pending", "failed_retry"] },
    retryCount: { $lt: 3 },
  }).sort({ conversionScore: -1 });
}

export async function updateLeadStatus(profileUrl, status, extras = {}) {
  await connectDB();
  return await Lead.findOneAndUpdate(
    { profileUrl },
    {
      $set: {
        status,
        lastProcessedAt: new Date(),
        ...extras,
      },
    },
    { returnDocument: "after" },
  );
}

export async function getAcceptedLeads(accountId) {
  await connectDB();
  return await Lead.find({ accountId, status: "accepted" });
}

export async function getPendingAcceptanceLeads(accountId) {
  await connectDB();
  return await Lead.find({
    accountId,
    status: {
      $in: [
        "connection_sent",
        "connection_and_message_sent",
        "pending_acceptance",
      ],
    },
  });
}

export async function getTodayCount(accountId) {
  await connectDB();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return await Lead.countDocuments({
    accountId,
    lastProcessedAt: { $gte: today },
  });
}

// ═══════════════════════════════════════════════════════════════
// NEW: WEEKLY CONNECTION LIMIT TRACKING
// ═══════════════════════════════════════════════════════════════

const CONNECTION_RETRY_DAYS = 7; // retry connection after 7 days

/**
 * Mark a lead as "connection limit hit" — connection silently dropped by LinkedIn.
 * Sets connectionRetryAfter = now + 7 days.
 * InMail can still be attempted immediately.
 */
export async function markConnectionLimitHit(profileUrl) {
  await connectDB();

  const retryAfter = new Date();
  retryAfter.setDate(retryAfter.getDate() + CONNECTION_RETRY_DAYS);

  return await Lead.findOneAndUpdate(
    { profileUrl },
    {
      $set: {
        connectionLimitHitAt: new Date(),
        connectionRetryAfter: retryAfter,
        lastProcessedAt: new Date(),
      },
      $inc: {
        connectionLimitHitCount: 1,
      },
    },
    { returnDocument: "after" },
  );
}

/**
 * Mark that InMail was sent as a fallback when connection was blocked.
 */
export async function markInMailSentAsFallback(profileUrl, inMailMsg, inMailSubject) {
  await connectDB();
  return await Lead.findOneAndUpdate(
    { profileUrl },
    {
      $set: {
        inMailSentAsFallback: true,
        warmingMessage: inMailMsg,
        subject: inMailSubject,
        messageSentAt: new Date(),
        status: "message_sent",
        lastProcessedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}

/**
 * Check if a lead's connection is currently blocked by weekly limit.
 * Returns true if we should SKIP connection and go straight to InMail.
 */
export async function isConnectionBlocked(profileUrl) {
  await connectDB();
  const lead = await Lead.findOne({ profileUrl }, {
    connectionRetryAfter: 1,
    connectionLimitHitAt: 1,
  });

  if (!lead || !lead.connectionRetryAfter) return false;

  const now = new Date();
  const isBlocked = now < new Date(lead.connectionRetryAfter);

  return isBlocked;
}

/**
 * Check if account-level weekly limit is hit.
 * LinkedIn allows ~100 connection requests per week.
 * We track how many "silently dropped" events happened in the last 7 days.
 * If >= 1 drop in last 7 days → assume account is at weekly limit.
 */
export async function isAccountConnectionLimitHit(accountId) {
  await connectDB();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Count leads where we hit the limit in the last 7 days
  const recentLimitHits = await Lead.countDocuments({
    accountId,
    connectionLimitHitAt: { $gte: sevenDaysAgo },
  });

  return recentLimitHits > 0;
}

/**
 * Get the earliest connectionRetryAfter date across all blocked leads
 * for an account — tells us when connections can resume.
 */
export async function getConnectionUnblockDate(accountId) {
  await connectDB();

  const now = new Date();
  const blocked = await Lead.findOne(
    {
      accountId,
      connectionRetryAfter: { $gt: now },
    },
    { connectionRetryAfter: 1, connectionLimitHitAt: 1 },
  ).sort({ connectionRetryAfter: 1 }); // earliest first

  if (!blocked) return null;
  return new Date(blocked.connectionRetryAfter);
}

/**
 * Get leads that are ready for connection retry
 * (their connectionRetryAfter date has passed).
 */
export async function getLeadsReadyForConnectionRetry(accountId) {
  await connectDB();

  const now = new Date();
  return await Lead.find({
    accountId,
    connectionRetryAfter: { $lte: now },
    // Only get leads that were blocked but not yet successfully connected
    status: {
      $in: [
        "discovered",
        "commented",
        "pending",
        "message_sent", // InMail sent as fallback — now retry connection
      ],
    },
    inMailSentAsFallback: true, // Only retry leads that got InMail fallback
  }).sort({ conversionScore: -1 });
}

/**
 * Get leads that had connection blocked and InMail sent —
 * these are ready for connection retry after 7 days.
 */
export async function getBlockedLeadsForRetry(accountId) {
  await connectDB();

  const now = new Date();
  return await Lead.find({
    accountId,
    connectionLimitHitAt: { $exists: true, $ne: null },
    connectionRetryAfter: { $lte: now },
    status: { $in: ["message_sent", "discovered", "commented", "pending"] },
  }).sort({ conversionScore: -1 });
}