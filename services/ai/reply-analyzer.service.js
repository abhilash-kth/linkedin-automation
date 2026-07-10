import { callAI, parseAIJson } from "./claude.service.js";
import { getReplyAnalysisPrompt } from "../../config/prompts/reply-analysis.prompt.js";

export async function analyzeReply(conversationHistory, leadInfo) {
  console.log(`   🧠 Analyzing reply from ${leadInfo.name}...`);

  const prompt = getReplyAnalysisPrompt(conversationHistory, leadInfo);
  const aiResponse = await callAI(prompt);

  if (!aiResponse.success) {
    console.log(`   ⚠️  Analysis failed: ${aiResponse.reason}`);
    return {
      interested: "unknown",
      sentiment: "neutral",
      hasQuestion: false,
      wantsMoreInfo: false,
      isDeclining: false,
      shouldSendAttachment: false,
      attachmentType: "none",
      suggestedReplyTone: "professional",
      keyTopics: [],
    };
  }

  const parsed = await parseAIJson(aiResponse);
  if (parsed) {
    console.log(`   ✅ Interest: ${parsed.interested}, Sentiment: ${parsed.sentiment}`);
    return parsed;
  }

  return {
    interested: "unknown",
    sentiment: "neutral",
    hasQuestion: false,
    wantsMoreInfo: false,
    isDeclining: false,
    shouldSendAttachment: false,
    attachmentType: "none",
    suggestedReplyTone: "professional",
    keyTopics: [],
  };
}