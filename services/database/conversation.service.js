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

  const update = {
    $push: {
      messages: {
        sender,
        text,
        timestamp: new Date(),
        isAIGenerated,
      },
    },
    $set: {
      lastMessageAt: new Date(),
      ...(sender === "us"
        ? { lastOurMessageAt: new Date() }
        : { lastTheirMessageAt: new Date() }),
    },
  };

  return await Conversation.findByIdAndUpdate(conversationId, update, { new: true });
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
    status: { $in: ["active", "replied"] },
  })
    .sort({ lastTheirMessageAt: -1 })
    .limit(50);
}