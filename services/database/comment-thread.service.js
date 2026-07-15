import PostCommentThread from "../../models/PostCommentThread.model.js";
import { connectDB } from "./mongodb.service.js";

export async function getOrCreateThread(leadId, leadProfileUrl, leadName, postUrl, postContent, ourComment, accountId) {
  await connectDB();

  let thread = await PostCommentThread.findOne({ postUrl });
  if (!thread) {
    thread = await PostCommentThread.create({
      leadId,
      leadProfileUrl,
      leadName,
      postUrl,
      postContent: postContent?.substring(0, 2000),
      ourComment,
      ourCommentAt: new Date(),
      accountId,
      status: "commented",
      replies: [],
    });
  }
  return thread;
}

export async function addReplyToThread(threadId, sender, text, isAIGenerated = false) {
  await connectDB();
  const now = new Date();

  const update = {
    $push: {
      replies: {
        sender,
        text,
        timestamp: now,
        isAIGenerated,
      },
    },
    $set: {
      lastCheckedAt: now,
      ...(sender === "us"
        ? { lastOurReplyAt: now, status: "we_replied_back" }
        : { lastAuthorReplyAt: now, status: "author_replied" }),
    },
  };

  return await PostCommentThread.findByIdAndUpdate(threadId, update, {
    returnDocument: "after",
  });
}

/**
 * Get all threads where we commented but haven't checked for author reply yet
 * OR author has replied and we haven't responded back
 */
export async function getThreadsNeedingCheck(accountId, maxAgeDays = 14) {
  await connectDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  return await PostCommentThread.find({
    accountId,
    createdAt: { $gte: cutoff },
    status: { $in: ["commented", "author_replied"] },
  }).sort({ lastCheckedAt: 1, createdAt: -1 });
}

/**
 * Mark thread as checked
 */
export async function markThreadChecked(threadId) {
  await connectDB();
  return await PostCommentThread.findByIdAndUpdate(threadId, {
    $set: { lastCheckedAt: new Date() },
  });
}