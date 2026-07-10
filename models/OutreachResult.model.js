import mongoose from "mongoose";

const outreachResultSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    accountId: { type: String },
    profileUrl: { type: String },
    action: {
      type: String,
      enum: [
        "connection_sent",
        "connection_and_message_sent",
        "message_sent",
        "typed_only",
        "warming_message_sent",
        "ai_reply_sent",
        "failed",
        "skipped",
      ],
    },
    success: { type: Boolean },
    hadNote: { type: Boolean },
    reason: { type: String },
    errorMessage: { type: String },
    duration: { type: Number }, // ms
  },
  {
    timestamps: true,
    collection: "outreach_history",
  },
);

outreachResultSchema.index({ leadId: 1 });
outreachResultSchema.index({ accountId: 1, createdAt: -1 });
outreachResultSchema.index({ action: 1 });

export default mongoose.model("OutreachResult", outreachResultSchema);