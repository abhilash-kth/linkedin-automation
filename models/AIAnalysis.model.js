import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    type: {
      type: String,
      enum: ["lead_scoring", "reply_analysis", "reply_generation", "warming_message"],
    },
    prompt: { type: String },
    response: { type: String },
    parsedResult: { type: mongoose.Schema.Types.Mixed },
    model: { type: String },
    tokensUsed: { type: Number },
    latencyMs: { type: Number },
    success: { type: Boolean },
    error: { type: String },
  },
  {
    timestamps: true,
    collection: "ai_analyses",
  },
);

aiAnalysisSchema.index({ leadId: 1 });
aiAnalysisSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("AIAnalysis", aiAnalysisSchema);