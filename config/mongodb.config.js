import dotenv from "dotenv";
dotenv.config();

export default {
  uri: process.env.MONGODB_URI || "mongodb://localhost:27017/linkedin_automation",
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
  collections: {
    leads: "leads",
    conversations: "conversations",
    messages: "messages",
    posts: "posts",
    aiAnalyses: "ai_analyses",
    outreachHistory: "outreach_history",
    accounts: "accounts",
  },
};