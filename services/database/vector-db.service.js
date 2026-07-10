// Placeholder — implement when Qdrant is set up
import vectorConfig from "../../config/vector-db.config.js";

export async function storeVector(collection, id, vector, metadata) {
  if (!vectorConfig.enabled) {
    return null;
  }
  // TODO: Implement Qdrant upsert
  console.log(`   ⚠️  Vector DB not configured`);
  return null;
}

export async function searchSimilar(collection, queryVector, limit = 5) {
  if (!vectorConfig.enabled) return [];
  // TODO: Implement Qdrant search
  return [];
}