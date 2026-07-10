import { callAI, parseAIJson } from "./claude.service.js";
import { getLeadScoringPrompt } from "../../config/prompts/lead-scoring.prompt.js";
import AIAnalysis from "../../models/AIAnalysis.model.js";

const OUR_PRODUCT =
  "Groomics — an AI platform for the beauty & wellness industry. We help salons, spas, and beauty businesses modernize operations with AI-powered booking, CRM, and marketing tools.";

export async function scoreLead(leadProfile) {
  console.log(`   🎯 Scoring lead: ${leadProfile.name}...`);

  const prompt = getLeadScoringPrompt(leadProfile, OUR_PRODUCT);
  const startTime = Date.now();

  const aiResponse = await callAI(prompt);
  const latencyMs = Date.now() - startTime;

  if (!aiResponse.success) {
    console.log(`   ⚠️  AI scoring failed: ${aiResponse.reason}`);
    return { score: 0, category: "unscored", reasons: [] };
  }

  const parsed = await parseAIJson(aiResponse);

  // Log to DB
  try {
    await AIAnalysis.create({
      type: "lead_scoring",
      prompt: prompt.substring(0, 500),
      response: aiResponse.text,
      parsedResult: parsed,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      latencyMs,
      success: !!parsed,
    });
  } catch {}

  if (parsed) {
    console.log(`   ✅ Score: ${parsed.score} (${parsed.category})`);
    return parsed;
  }

  return { score: 0, category: "unscored", reasons: ["AI response parsing failed"] };
}