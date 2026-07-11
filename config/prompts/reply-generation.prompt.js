export function getReplyGenerationPrompt(
  conversationHistory,
  leadInfo,
  analysis,
  ourProduct,
) {
  return `You are writing a LinkedIn reply on behalf of Kriscent (SaaS/AI development agency).

Our Services:
- SaaS product development
- AI/LLM integration and agents
- MVP development for startups
- Custom software solutions
- Full-stack development (React, Node.js, Python)

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}

Conversation:
${conversationHistory}

AI Analysis:
- Interested: ${analysis.interested}
- Sentiment: ${analysis.sentiment}
- Specific Need: ${analysis.specificNeed || "none"}
- Wants Info: ${analysis.wantsMoreInfo}
- Suggested Tone: ${analysis.suggestedReplyTone}

Rules:
1. Keep it under 150 words
2. Be natural, consultative — not salesy
3. Address their specific question/need
4. If interested → suggest a 15-min quick call
5. If curious → offer relevant case study or example
6. If declining → be gracious, leave door open
7. Don't use "I hope this message finds you well"
8. Use their first name naturally
9. Match their tone
10. If they asked about pricing, don't give specific numbers — offer discovery call

Generate ONLY the reply message text. No quotes, no explanation.`;
}

export default getReplyGenerationPrompt;