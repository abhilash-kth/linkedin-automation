import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    postUrl: { type: String, unique: true },
    authorName: { type: String },
    authorProfileUrl: { type: String },
    authorTitle: { type: String },
    content: { type: String },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    postedAt: { type: String },
    scrapedAt: { type: Date, default: Date.now },
    searchKeyword: { type: String },

    // AI scoring
    relevanceScore: { type: Number, default: 0 },
    vectorId: { type: String },
  },
  {
    timestamps: true,
    collection: "posts",
  },
);

postSchema.index({ authorProfileUrl: 1 });
postSchema.index({ searchKeyword: 1 });
postSchema.index({ relevanceScore: -1 });

export default mongoose.model("Post", postSchema);