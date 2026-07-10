export function getReplyAnalysisPrompt(conversationHistory, leadInfo) {
  return `You are an AI assistant analyzing a LinkedIn conversation.

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}

Conversation History:
${conversationHistory}

Analyze the latest reply and determine:
1. Is the person interested? (yes/no/maybe)
2. What is their sentiment? (positive/negative/neutral)
3. Are they asking a question?
4. Do they want more info?
5. Are they declining?
6. Should we send an attachment (pitch deck/brochure)?

Respond ONLY in this JSON format:
{
  "interested": "yes" | "no" | "maybe",
  "sentiment": "positive" | "negative" | "neutral",
  "hasQuestion": true | false,
  "wantsMoreInfo": true | false,
  "isDeclining": true | false,
  "shouldSendAttachment": true | false,
  "attachmentType": "pitch_deck" | "brochure" | "none",
  "suggestedReplyTone": "enthusiastic" | "professional" | "casual" | "grateful",
  "keyTopics": ["topic1", "topic2"]
}`;
}

export default getReplyAnalysisPrompt;