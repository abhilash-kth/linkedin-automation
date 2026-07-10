import dotenv from "dotenv";
dotenv.config();

export default {
  // OpenRouter (free tier) — switch to Claude later
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
    maxTokens: 1024,
    temperature: 0.7,
  },

  // Claude (for later — paid)
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
  },

  // OpenAI (for embeddings — paid)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    embeddingModel: "text-embedding-3-small",
  },

  // Which provider to use
  activeProvider: process.env.AI_PROVIDER || "openrouter", // "openrouter" | "claude" | "openai"
};