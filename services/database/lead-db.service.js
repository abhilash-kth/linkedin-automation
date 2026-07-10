import Lead from "../../models/Lead.model.js";
import { connectDB } from "./mongodb.service.js";

export async function upsertLead(leadData) {
  await connectDB();

  const lead = await Lead.findOneAndUpdate(
    { profileUrl: leadData.profileUrl },
    { $set: leadData },
    { upsert: true, new: true },
  );
  return lead;
}

export async function getLeadByUrl(profileUrl) {
  await connectDB();
  return await Lead.findOne({ profileUrl });
}

export async function getLeadsByStatus(status, accountId = null) {
  await connectDB();
  const filter = { status };
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
    { new: true },
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