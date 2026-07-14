import dotenv from "dotenv";
dotenv.config();

export default {
  // OpenRouter with fallback models
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    // Try these models in order — if one is rate-limited, try next
    models: [
      "meta-llama/llama-3.1-8b-instruct:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "google/gemma-2-9b-it:free",
      "mistralai/mistral-7b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free",
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "qwen/qwen-2-7b-instruct:free",
      "openchat/openchat-7b:free",
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },

  // Groq (FREE unlimited-ish — 30 req/min)
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.1-8b-instant",
      "llama-3.2-3b-preview",
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
    ],
    maxTokens: 1024,
    temperature: 0.7,
  },

  // Claude (paid)
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
  },

  // Which providers to try in order
  providerFallbackOrder: [
    process.env.AI_PROVIDER || "openrouter",
    "groq",
  ],
};