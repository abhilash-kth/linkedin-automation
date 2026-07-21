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
      enum: ["search", "post", "manual", "sheet", "comment_mention"],
      default: "manual",
    },
    searchKeyword: { type: String },
    postContent: { type: String },
    postUrl: { type: String },
    postTime: { type: String },

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

    // ── Comment Tracking ──
    // These were MISSING — causing Comment Posted to always show "No"
    commentPosted: { type: Boolean, default: false },
    commentText: { type: String },
    commentedAt: { type: Date }, // was referenced but never in schema!

    // ── Comment Reply Tracking ──
    // When post author replies to our comment
    commentReplies: [
      {
        sender: { type: String, enum: ["us", "them"] },
        text: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    lastCommentReplyAt: { type: Date },
    commentReplyCount: { type: Number, default: 0 },

    // ── Messages ──
    connectionNote: { type: String },
    message: { type: String },
    subject: { type: String },
    warmingMessage: { type: String },

    // ── InMail Tracking ──
    // These were MISSING — causing InMail to always show "No"
    inMailSent: { type: Boolean, default: false },
    inMailText: { type: String },
    inMailSentAt: { type: Date },

    // ── Follow-up Tracking ──
    // These were MISSING — always showing "No"
    followUpNeeded: { type: Boolean, default: false },
    followUp1Sent: { type: Boolean, default: false },
    followUp1Date: { type: Date },
    followUp2Sent: { type: Boolean, default: false },
    followUp2Date: { type: Date },

    // ── Meeting Tracking ──
    meetingScheduled: { type: Boolean, default: false },
    meetingDate: { type: Date },

    // ── Reply Tracking ──
    // Proper fields for sheet columns AD-AG
    totalReplies: { type: Number, default: 0 },
    firstReplyDate: { type: Date },
    lastReplyPreview: { type: String },

    // ── AI Reply Analysis ──
    // Proper fields for sheet columns AH-AI
    aiInterestLevel: { type: String, enum: ["yes", "no", "maybe", "unknown"] },
    aiSentiment: {
      type: String,
      enum: ["positive", "negative", "neutral", "unknown"],
    },

    // ── Timestamps ──
    connectionSentAt: { type: Date },
    connectionAcceptedAt: { type: Date },
    messageSentAt: { type: Date },
    lastRepliedAt: { type: Date },
    lastProcessedAt: { type: Date },

    // ── Weekly Connection Limit Tracking ──
    connectionLimitHitAt: { type: Date, default: null },
    connectionLimitHitCount: { type: Number, default: 0 },
    connectionRetryAfter: { type: Date, default: null },
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
leadSchema.index({ connectionRetryAfter: 1 });
leadSchema.index({ postUrl: 1 }); // needed for comment reply lookups
leadSchema.index({ commentedAt: -1 }); // needed for comment reply checks

export default mongoose.model("Lead", leadSchema);
