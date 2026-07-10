export function getReplyGenerationPrompt(
  conversationHistory,
  leadInfo,
  analysis,
  ourProduct,
) {
  return `You are writing a LinkedIn reply message on behalf of a startup founder.

Our Product: ${ourProduct}

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}

Conversation So Far:
${conversationHistory}

AI Analysis of Their Reply:
- Interested: ${analysis.interested}
- Sentiment: ${analysis.sentiment}
- Has Question: ${analysis.hasQuestion}
- Wants More Info: ${analysis.wantsMoreInfo}
- Suggested Tone: ${analysis.suggestedReplyTone}
- Key Topics: ${(analysis.keyTopics || []).join(", ")}

Rules:
1. Keep it under 150 words
2. Be natural, not salesy
3. Address their specific question/concern if any
4. If they're interested, suggest a quick call
5. If they're declining, be gracious and leave door open
6. Don't use "I hope this message finds you well"
7. Use their first name
8. Match the tone they used

Generate ONLY the reply message text. No quotes, no explanation.`;
}

export default getReplyGenerationPrompt;