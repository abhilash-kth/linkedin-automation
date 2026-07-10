import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["us", "them"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isAIGenerated: { type: Boolean, default: false },
  aiModel: { type: String },
  hasAttachment: { type: Boolean, default: false },
  attachmentUrl: { type: String },
});

const conversationSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    leadProfileUrl: { type: String, required: true },
    leadName: { type: String, required: true },
    accountId: { type: String, required: true },

    messages: [messageSchema],

    // ── Status ──
    status: {
      type: String,
      enum: ["active", "waiting_reply", "replied", "closed", "archived"],
      default: "active",
    },

    // ── AI Analysis ──
    lastAnalysis: { type: mongoose.Schema.Types.Mixed },
    interested: {
      type: String,
      enum: ["yes", "no", "maybe", "unknown"],
      default: "unknown",
    },
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral", "unknown"],
      default: "unknown",
    },

    // ── Timestamps ──
    lastMessageAt: { type: Date },
    lastOurMessageAt: { type: Date },
    lastTheirMessageAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "conversations",
  },
);

conversationSchema.index({ leadId: 1 });
conversationSchema.index({ leadProfileUrl: 1 });
conversationSchema.index({ accountId: 1, status: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model("Conversation", conversationSchema);