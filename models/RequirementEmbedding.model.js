import mongoose from "mongoose";

const requirementEmbeddingSchema = new mongoose.Schema(
  {
    requirementId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    text: { type: String, required: true },
    vector: { type: [Number], required: true },
    dimensions: { type: Number, default: 384 },
    model: { type: String, default: "Xenova/all-MiniLM-L6-v2" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "requirement_embeddings" },
);

requirementEmbeddingSchema.index({ active: 1 });

export default mongoose.model("RequirementEmbedding", requirementEmbeddingSchema);