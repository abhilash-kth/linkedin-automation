import { callAI } from "./claude.service.js";
import { getReplyGenerationPrompt } from "../../config/prompts/reply-generation.prompt.js";

const OUR_PRODUCT =
  "Groomics — an AI platform for the beauty & wellness industry.";

export async function generateReply(conversationHistory, leadInfo, analysis) {
  console.log(`   ✍️  Generating reply for ${leadInfo.name}...`);

  const prompt = getReplyGenerationPrompt(
    conversationHistory,
    leadInfo,
    analysis,
    OUR_PRODUCT,
  );

  const aiResponse = await callAI(prompt, { maxTokens: 512, temperature: 0.8 });

  if (!aiResponse.success) {
    console.log(`   ⚠️  Reply generation failed: ${aiResponse.reason}`);
    return null;
  }

  const replyText = (aiResponse.text || "").trim();
  console.log(`   ✅ Generated reply (${replyText.length} chars)`);

  return replyText;
}