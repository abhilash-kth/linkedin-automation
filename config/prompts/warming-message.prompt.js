export function getWarmingMessagePrompt(leadInfo, ourProduct) {
  return `You are writing a brief warming message on LinkedIn after someone accepted your connection request.

Our Services: Kriscent — SaaS & AI product development agency for founders and startups.

Lead Info:
- Name: ${leadInfo.name}
- Title: ${leadInfo.title || "N/A"}
- Company: ${leadInfo.company || "N/A"}
- Connection Note We Sent: ${leadInfo.connectionNote || "N/A"}

Rules:
1. Keep it under 100 words
2. Thank them for connecting (brief)
3. Reference what they do (if we know)
4. Don't pitch services immediately
5. Ask a soft, curious question about their work
6. Sound human and warm — like a real founder reaching out
7. Use their first name

Example:
"Hi Rahul, thanks for connecting! I noticed you're building [X] at [Y]. Curious — what's been the biggest tech challenge you've faced while scaling? Always fascinated by founder journeys."

Generate ONLY the message text. No quotes, no explanation.`;
}

export default getWarmingMessagePrompt;