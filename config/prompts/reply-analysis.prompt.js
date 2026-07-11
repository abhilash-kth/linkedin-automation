export function getReplyAnalysisPrompt(conversationHistory, leadInfo) {
  return `You are analyzing a LinkedIn conversation for Kriscent (SaaS/AI development agency).

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}

Conversation History:
${conversationHistory}

Analyze the LATEST reply and determine:
1. Are they interested in dev/AI services? (yes/no/maybe)
2. What is their sentiment? (positive/negative/neutral)
3. Do they mention a specific tech need?
4. Are they asking for pricing/portfolio/case studies?
5. Are they declining?
6. Should we send a pitch deck?
7. Is this a hot lead worth pursuing?

Respond ONLY in this JSON format:
{
  "interested": "yes" | "no" | "maybe",
  "sentiment": "positive" | "negative" | "neutral",
  "hasQuestion": true | false,
  "wantsMoreInfo": true | false,
  "isDeclining": true | false,
  "mentionsSpecificNeed": true | false,
  "specificNeed": "MVP" | "AI integration" | "hiring" | "consulting" | "other" | "none",
  "shouldSendAttachment": true | false,
  "attachmentType": "pitch_deck" | "case_studies" | "portfolio" | "none",
  "suggestedReplyTone": "enthusiastic" | "professional" | "consultative" | "grateful",
  "hotLeadScore": <number 0-100>,
  "keyTopics": ["topic1", "topic2"]
}`;
}

export default getReplyAnalysisPrompt;