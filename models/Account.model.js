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
  },
  {
    timestamps: true,
    collection: "accounts",
  },
);

export default mongoose.model("Account", accountSchema);