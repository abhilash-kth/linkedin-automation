export function getLeadScoringPrompt(leadProfile, ourProduct) {
  return `You are a lead scoring assistant for a B2B SaaS startup.

Our Product: ${ourProduct}

Evaluate this LinkedIn lead and give a conversion score from 0-100.

Lead Profile:
- Name: ${leadProfile.name}
- Title: ${leadProfile.title || "N/A"}
- Company: ${leadProfile.company || "N/A"}
- Location: ${leadProfile.location || "N/A"}
- About: ${leadProfile.about || "N/A"}
- Recent Post: ${leadProfile.recentPost || "N/A"}

Score Criteria:
- Industry relevance (0-30)
- Decision-maker level (0-25)
- Company size fit (0-20)
- Engagement signals (0-15)
- Location fit (0-10)

Respond ONLY in this JSON format:
{
  "score": <number 0-100>,
  "reasons": ["reason1", "reason2", "reason3"],
  "category": "hot" | "warm" | "cold",
  "suggestedAction": "connect" | "inmail" | "skip"
}`;
}

export default getLeadScoringPrompt;