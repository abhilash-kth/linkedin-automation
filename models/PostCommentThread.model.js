import mongoose from "mongoose";

const commentReplySchema = new mongoose.Schema({
  sender: { type: String, enum: ["us", "them"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isAIGenerated: { type: Boolean, default: false },
});

const postCommentThreadSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    leadProfileUrl: { type: String, required: true },
    leadName: { type: String, required: true },
    postUrl: { type: String, required: true },
    postContent: { type: String },
    accountId: { type: String, required: true },

    // Our first comment
    ourComment: { type: String },
    ourCommentAt: { type: Date },

    // Reply thread (author might reply, we reply, etc.)
    replies: [commentReplySchema],

    // Status
    status: {
      type: String,
      enum: ["commented", "author_replied", "we_replied_back", "no_reply", "closed"],
      default: "commented",
    },

    // AI analysis
    lastAnalysis: { type: mongoose.Schema.Types.Mixed },

    lastCheckedAt: { type: Date },
    lastAuthorReplyAt: { type: Date },
    lastOurReplyAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "post_comment_threads",
  },
);

postCommentThreadSchema.index({ leadId: 1 });
postCommentThreadSchema.index({ postUrl: 1 }, { unique: true });
postCommentThreadSchema.index({ accountId: 1, status: 1 });

export default mongoose.model("PostCommentThread", postCommentThreadSchema);