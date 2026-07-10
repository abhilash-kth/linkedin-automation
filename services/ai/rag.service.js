// Placeholder for RAG — skip for now
// Will query vector DB for relevant context before AI calls

export async function getRelevantContext(query, collection = "posts") {
  // TODO: Integrate with Qdrant when ready
  console.log(`   ⚠️  RAG service not configured yet`);
  return [];
}