import { pipeline } from "@xenova/transformers";

let embedder = null;
let modelLoading = null;

/**
 * Load Xenova sentence transformer model
 * Downloads ~30MB first run, cached forever after
 */
export async function loadEmbedder() {
  if (embedder) return embedder;
  if (modelLoading) return await modelLoading;

  console.log(`🧠 Loading Xenova model (first run downloads ~30MB)...`);

  modelLoading = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true,
  });

  embedder = await modelLoading;
  console.log(`✅ Xenova model loaded successfully`);
  return embedder;
}

/**
 * Generate embedding vector (384 dimensions)
 */
export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  try {
    const model = await loadEmbedder();
    const cleanText = text.substring(0, 2000).replace(/\s+/g, " ").trim();

    const output = await model(cleanText, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  } catch (err) {
    console.log(`   ❌ Embedding failed: ${err.message}`);
    return null;
  }
}

/**
 * Cosine similarity between two vectors (-1 to 1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Convert 0-1 score to 0-100 percentage
 */
export function scoreToPercent(score) {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}