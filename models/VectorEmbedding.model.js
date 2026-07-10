import mongoose from "mongoose";

const vectorEmbeddingSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["post", "lead_profile", "pitch", "conversation"],
    },
    sourceId: { type: String },
    text: { type: String },
    vectorId: { type: String }, // ID in Qdrant/Pinecone
    collectionName: { type: String },
    dimensions: { type: Number },
  },
  {
    timestamps: true,
    collection: "vector_embeddings",
  },
);

vectorEmbeddingSchema.index({ sourceType: 1, sourceId: 1 });

export default mongoose.model("VectorEmbedding", vectorEmbeddingSchema);