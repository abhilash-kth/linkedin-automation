// import mongoose from "mongoose";

// const leadSchema = new mongoose.Schema(
//   {
//     // ── Basic Info ──
//     name: { type: String, required: true },
//     firstName: { type: String },
//     lastName: { type: String },
//     profileUrl: { type: String, required: true, unique: true },
//     vanityName: { type: String },

//     // ── Professional Info ──
//     title: { type: String },
//     company: { type: String },
//     location: { type: String },
//     about: { type: String },
//     headline: { type: String },

//     // ── Contact Info ──
//     email: { type: String },
//     phone: { type: String },
//     website: { type: String },

//     // ── Discovery Info ──
//     discoveredFrom: {
//       type: String,
//       enum: ["search", "post", "manual", "sheet"],
//       default: "manual",
//     },
//     searchKeyword: { type: String },
//     postContent: { type: String },
//     postUrl: { type: String },

//     // ── Scoring ──
//     conversionScore: { type: Number, default: 0, min: 0, max: 100 },
//     scoreCategory: {
//       type: String,
//       enum: ["hot", "warm", "cold", "unscored"],
//       default: "unscored",
//     },
//     scoreReasons: [{ type: String }],

//     // ── Outreach Status ──
//     status: {
//       type: String,
//       enum: [
//         "pending",
//         "connection_sent",
//         "connection_and_message_sent",
//         "pending_acceptance",
//         "accepted",
//         "message_sent",
//         "replied",
//         "interested",
//         "not_interested",
//         "meeting_scheduled",
//         "failed_retry",
//         "failed_permanent",
//         "skipped",
//       ],
//       default: "pending",
//     },

//     // ── Messages ──
//     connectionNote: { type: String },
//     message: { type: String },
//     subject: { type: String },
//     warmingMessage: { type: String },

//     // ── Timestamps ──
//     connectionSentAt: { type: Date },
//     connectionAcceptedAt: { type: Date },
//     messageSentAt: { type: Date },
//     lastRepliedAt: { type: Date },
//     lastProcessedAt: { type: Date },

//     // ── Error Tracking ──
//     lastError: { type: String },
//     retryCount: { type: Number, default: 0 },
//     maxRetries: { type: Number, default: 3 },

//     // ── Account ──
//     accountId: { type: String, default: "account_1" },

//     // ── Google Sheet Row ──
//     sheetRow: { type: Number },
//     sheetSynced: { type: Boolean, default: false },

//     // ── AI ──
//     aiAnalysis: { type: mongoose.Schema.Types.Mixed },
//     vectorId: { type: String },
//   },
//   {
//     timestamps: true,
//     collection: "leads",
//   },
// );

// // Indexes

// leadSchema.index({ status: 1 });
// leadSchema.index({ accountId: 1, status: 1 });
// leadSchema.index({ conversionScore: -1 });
// leadSchema.index({ createdAt: -1 });

// export default mongoose.model("Lead", leadSchema);

import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // ── Basic Info ──
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    profileUrl: { type: String, required: true, unique: true },
    vanityName: { type: String },

    // ── Professional Info ──
    title: { type: String },
    company: { type: String },
    location: { type: String },
    about: { type: String },
    headline: { type: String },

    // ── Contact Info ──
    email: { type: String },
    phone: { type: String },
    website: { type: String },

    // ── Discovery Info ──
    discoveredFrom: {
      type: String,
      enum: ["search", "post", "manual", "sheet"],
      default: "manual",
    },
    searchKeyword: { type: String },
    postContent: { type: String },
    postUrl: { type: String },

    // ── Scoring ──
    conversionScore: { type: Number, default: 0, min: 0, max: 100 },
    scoreCategory: {
      type: String,
      enum: ["hot", "warm", "cold", "unscored"],
      default: "unscored",
    },
    scoreReasons: [{ type: String }],

    // ── Outreach Status ──
    status: {
      type: String,
      enum: [
        "pending",
        "discovered",
        "commented",
        "connection_sent",
        "connection_and_message_sent",
        "pending_acceptance",
        "accepted",
        "message_sent",
        "replied",
        "interested",
        "not_interested",
        "meeting_scheduled",
        "failed_retry",
        "failed_permanent",
        "skipped",
      ],
      default: "pending",
    },

    // ── Messages ──
    connectionNote: { type: String },
    message: { type: String },
    subject: { type: String },
    warmingMessage: { type: String },

    // ── Timestamps ──
    connectionSentAt: { type: Date },
    connectionAcceptedAt: { type: Date },
    messageSentAt: { type: Date },
    lastRepliedAt: { type: Date },
    lastProcessedAt: { type: Date },

    // ── Weekly Connection Limit Tracking ──
    // Set when LinkedIn silently drops a connection = weekly limit hit
    connectionLimitHitAt: { type: Date, default: null },
    // How many times we've hit the limit for this lead
    connectionLimitHitCount: { type: Number, default: 0 },
    // When we're allowed to retry the connection again
    connectionRetryAfter: { type: Date, default: null },
    // InMail was sent as fallback when connection was blocked
    inMailSentAsFallback: { type: Boolean, default: false },

    // ── Error Tracking ──
    lastError: { type: String },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },

    // ── Account ──
    accountId: { type: String, default: "account_1" },

    // ── Google Sheet Row ──
    sheetRow: { type: Number },
    sheetSynced: { type: Boolean, default: false },

    // ── AI ──
    aiAnalysis: { type: mongoose.Schema.Types.Mixed },
    vectorId: { type: String },
    skippedReason: { type: String },
    skippedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "leads",
  },
  
);

// Indexes
leadSchema.index({ status: 1 });
leadSchema.index({ accountId: 1, status: 1 });
leadSchema.index({ conversionScore: -1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ connectionRetryAfter: 1 }); // for weekly retry queries

export default mongoose.model("Lead", leadSchema);