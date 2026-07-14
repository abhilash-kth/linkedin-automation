import Lead from "../../models/Lead.model.js";
import { connectDB } from "./mongodb.service.js";

export async function hasCommentedOnPost(postUrl) {
  await connectDB();
  const lead = await Lead.findOne({
    postUrl: postUrl,
    status: { $in: ["commented", "connection_sent", "accepted", "message_sent"] },
  });
  return !!lead;
}

export async function checkLeadExists(profileUrl) {
  await connectDB();
  const lead = await Lead.findOne({ profileUrl });

  if (!lead) return { exists: false, lead: null, daysSinceLastAction: null };

  const lastAction = lead.lastProcessedAt || lead.updatedAt || lead.createdAt;
  const daysSince = Math.floor((Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24));

  return { exists: true, lead, daysSinceLastAction: daysSince };
}

export async function shouldSkipLead(profileUrl, minDaysSince = 7) {
  const { exists, daysSinceLastAction } = await checkLeadExists(profileUrl);
  if (!exists) return false;
  return daysSinceLastAction < minDaysSince;
}

// Keep all your existing exports
export async function upsertLead(leadData) {
  await connectDB();
  const lead = await Lead.findOneAndUpdate(
    { profileUrl: leadData.profileUrl },
    { $set: leadData },
    { upsert: true, returnDocument: 'after' },
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
    { returnDocument: 'after' },
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
    status: { $in: ["connection_sent", "connection_and_message_sent", "pending_acceptance"] },
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
