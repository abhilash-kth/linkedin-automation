// Individual message — lightweight version for quick queries
import mongoose from "mongoose";

const messageLogSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    accountId: { type: String },
    sender: { type: String, enum: ["us", "them"] },
    text: { type: String },
    isAIGenerated: { type: Boolean, default: false },
    aiModel: { type: String },
    hasAttachment: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "messages",
  },
);

messageLogSchema.index({ conversationId: 1 });
messageLogSchema.index({ leadId: 1 });
messageLogSchema.index({ createdAt: -1 });

export default mongoose.model("MessageLog", messageLogSchema);