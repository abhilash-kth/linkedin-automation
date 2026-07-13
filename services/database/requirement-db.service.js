import RequirementEmbedding from "../../models/RequirementEmbedding.model.js";
import { connectDB } from "./mongodb.service.js";
import { generateEmbedding } from "../ai/embedding.service.js";

export async function upsertRequirement(requirementId, label, text) {
  await connectDB();
  console.log(`   🧠 Generating embedding for: "${label}"`);
  const vector = await generateEmbedding(text);
  if (!vector) throw new Error(`Failed to embed "${label}"`);

  const result = await RequirementEmbedding.findOneAndUpdate(
    { requirementId },
    {
      $set: {
        requirementId,
        label,
        text,
        vector,
        dimensions: vector.length,
        active: true,
      },
    },
    { upsert: true, new: true },
  );

  console.log(`   ✅ Saved requirement "${label}" (${vector.length} dims)`);
  return result;
}

export async function getAllRequirementEmbeddings() {
  await connectDB();
  const requirements = await RequirementEmbedding.find({ active: true }).lean();
  return requirements.map((r) => ({
    id: r.requirementId,
    label: r.label,
    vector: r.vector,
  }));
}

export async function deleteRequirement(requirementId) {
  await connectDB();
  await RequirementEmbedding.deleteOne({ requirementId });
}