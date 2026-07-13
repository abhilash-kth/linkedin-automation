import { generateEmbedding, cosineSimilarity, scoreToPercent } from "./embedding.service.js";

/**
 * Score a post against ALL requirement embeddings
 * Returns:
 * - topScore: highest similarity across all requirements (0-100)
 * - topMatches: top 3 matches with labels & scores
 * - allScores: all similarities keyed by requirement label
 */
export async function classifyPost(postContent, requirementEmbeddings) {
  if (!postContent || postContent.length < 30) {
    return { topScore: 0, topMatches: [], allScores: {} };
  }

  const postVector = await generateEmbedding(postContent);
  if (!postVector) {
    return { topScore: 0, topMatches: [], allScores: {} };
  }

  const scores = [];
  const allScores = {};

  for (const req of requirementEmbeddings) {
    const similarity = cosineSimilarity(postVector, req.vector);
    const percent = scoreToPercent(similarity);
    scores.push({
      id: req.id,
      label: req.label,
      similarity,
      percent,
    });
    allScores[req.label] = percent;
  }

  // Sort by highest similarity
  scores.sort((a, b) => b.similarity - a.similarity);

  return {
    topScore: scores[0]?.percent || 0,
    topSimilarity: scores[0]?.similarity || 0,
    topLabel: scores[0]?.label || "",
    topMatches: scores.slice(0, 3).map((s) => ({
      label: s.label,
      score: s.percent,
    })),
    allScores,
  };
}