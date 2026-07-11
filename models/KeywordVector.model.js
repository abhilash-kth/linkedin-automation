import mongoose from "mongoose";

const keywordVectorSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true, unique: true, trim: true },
    vector: { type: [Number], required: true },
    dimensions: { type: Number, default: 384 },
    model: { type: String, default: "Xenova/all-MiniLM-L6-v2" },
    category: { type: String, default: "general" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "keyword_vectors" },
);

// keywordVectorSchema.index({ keyword: 1 }, { unique: true });
keywordVectorSchema.index({ active: 1 });

export default mongoose.model("KeywordVector", keywordVectorSchema);