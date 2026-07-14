import Conversation from "../../models/Conversation.model.js";
import { connectDB } from "./mongodb.service.js";

export async function getOrCreateConversation(leadId, leadProfileUrl, leadName, accountId) {
  await connectDB();
  let convo = await Conversation.findOne({ leadProfileUrl, accountId });
  if (!convo) {
    convo = await Conversation.create({
      leadId,
      leadProfileUrl,
      leadName,
      accountId,
      messages: [],
    });
  }
  return convo;
}

export async function addMessage(conversationId, sender, text, isAIGenerated = false) {
  await connectDB();
  const now = new Date();

  const update = {
    $push: {
      messages: {
        sender,
        text,
        timestamp: now,
        isAIGenerated,
      },
    },
    $set: {
      lastMessageAt: now,
      ...(sender === "us"
        ? { lastOurMessageAt: now }
        : { lastTheirMessageAt: now }),
    },
  };

  return await Conversation.findByIdAndUpdate(conversationId, update, { returnDocument: 'after' });
}

/**
 * Bulk sync messages (used when we scrape full history from LinkedIn inbox)
 * Deduplicates by text content
 */
export async function syncMessages(conversationId, messages) {
  await connectDB();
  const convo = await Conversation.findById(conversationId);
  if (!convo) return null;

  const existingTexts = new Set(convo.messages.map((m) => m.text.trim()));
  const newMessages = [];

  for (const msg of messages) {
    const cleanText = msg.text.trim();
    if (existingTexts.has(cleanText)) continue;

    newMessages.push({
      sender: msg.sender,
      text: cleanText,
      timestamp: msg.timestamp || new Date(),
      isAIGenerated: false,
    });
    existingTexts.add(cleanText);
  }

  if (newMessages.length === 0) return convo;

  convo.messages.push(...newMessages);
  convo.lastMessageAt = new Date();

  const lastMsg = newMessages[newMessages.length - 1];
  if (lastMsg.sender === "us") {
    convo.lastOurMessageAt = lastMsg.timestamp;
  } else {
    convo.lastTheirMessageAt = lastMsg.timestamp;
  }

  await convo.save();
  return convo;
}

export async function getConversationHistory(leadProfileUrl, accountId) {
  await connectDB();
  const convo = await Conversation.findOne({ leadProfileUrl, accountId });
  if (!convo) return "";

  return convo.messages
    .map((m) => `${m.sender === "us" ? "Us" : "Them"}: ${m.text}`)
    .join("\n\n");
}

export async function getConversationsNeedingReply(accountId) {
  await connectDB();
  return await Conversation.find({
    accountId,
    lastTheirMessageAt: { $exists: true },
    $or: [
      { lastOurMessageAt: { $exists: false } },
      { $expr: { $gt: ["$lastTheirMessageAt", "$lastOurMessageAt"] } },
    ],
  })
    .sort({ lastTheirMessageAt: -1 })
    .limit(50);
}