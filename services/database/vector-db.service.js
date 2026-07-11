import KeywordVector from "../../models/KeywordVector.model.js";
import { connectDB } from "./mongodb.service.js";
import { generateEmbedding } from "../ai/embedding.service.js";

export async function upsertKeywordVector(keyword, category = "general") {
  await connectDB();

  console.log(`   🧠 Generating embedding for: "${keyword}"`);
  const vector = await generateEmbedding(keyword);
  if (!vector) throw new Error(`Failed to generate embedding for "${keyword}"`);

  const result = await KeywordVector.findOneAndUpdate(
    { keyword: keyword.trim() },
    { $set: { vector, dimensions: vector.length, category, active: true } },
    { upsert: true, new: true },
  );

  console.log(`   ✅ Saved vector for "${keyword}" (${vector.length} dims)`);
  return result;
}

export async function getAllKeywordVectors() {
  await connectDB();
  const keywords = await KeywordVector.find({ active: true }).lean();
  return keywords.map((k) => ({
    keyword: k.keyword,
    vector: k.vector,
    category: k.category,
  }));
}

export async function getKeywordVector(keyword) {
  await connectDB();
  const kw = await KeywordVector.findOne({ keyword: keyword.trim(), active: true }).lean();
  return kw ? { keyword: kw.keyword, vector: kw.vector, category: kw.category } : null;
}

export async function deleteKeywordVector(keyword) {
  await connectDB();
  await KeywordVector.deleteOne({ keyword: keyword.trim() });
}