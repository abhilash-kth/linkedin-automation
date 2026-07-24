import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, unique: true },
    email: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastOutreachAt: { type: Date },
    messagesToday: { type: Number, default: 0 },
    messagesTodayDate: { type: String },
    totalMessagesSent: { type: Number, default: 0 },
    totalConnectionsSent: { type: Number, default: 0 },
    sessionValid: { type: Boolean, default: false },

    // ── InMail Block (1 month when free tier exhausted) ──
    inMailBlocked: { type: Boolean, default: false },
    inMailBlockedAt: { type: Date, default: null },
    inMailBlockedUntil: { type: Date, default: null },
    inMailBlockReason: { type: String, default: null },

    // ── Connection Notes Block ──
    notesLimitHit: { type: Boolean, default: false },
    notesLimitHitAt: { type: Date, default: null },

    // ── Weekly Connection Block ──
    connectionLimitHit: { type: Boolean, default: false },
    connectionLimitHitAt: { type: Date, default: null },
    connectionRetryAfter: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "accounts",
  },
);

export default mongoose.model("Account", accountSchema);