import dotenv from "dotenv";
dotenv.config();

export default {
  // Qdrant (self-hosted, free)
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    collections: {
      posts: "linkedin_posts",
      leads: "linkedin_leads",
      pitch: "our_pitch",
      conversations: "chat_history",
    },
    vectorSize: 384, // MiniLM produces 384 dim vectors
  },

  // Set to false to skip vector DB for now
  enabled: process.env.VECTOR_DB_ENABLED === "true" || false,
};