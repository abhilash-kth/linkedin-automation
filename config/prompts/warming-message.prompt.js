export function getWarmingMessagePrompt(leadInfo, ourProduct) {
  return `You are writing a brief warming message on LinkedIn after someone accepted your connection request.

Our Product: ${ourProduct}

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}
- Connection Note We Sent: ${leadInfo.connectionNote || "N/A"}

Rules:
1. Keep it under 100 words
2. Thank them for connecting
3. Briefly mention why you connected
4. Don't be pushy — just warm up
5. Use their first name
6. End with a soft open question
7. Sound human, not like a bot

Generate ONLY the message text. No quotes, no explanation.`;
}

export default getWarmingMessagePrompt;