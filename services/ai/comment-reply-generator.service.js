import { callAI } from "./claude.service.js";

/**
 * Build a formatted thread transcript for AI context
 */
function buildThreadTranscript(fullThread, ourName) {
  if (!fullThread || fullThread.length === 0) return "(no thread history)";

  const lines = [];
  fullThread.forEach((c, idx) => {
    let label = c.name;
    if (c.isOwn) label = `[US - ${ourName}]`;
    else if (c.isPostAuthor) label = `[POST AUTHOR - ${c.name}]`;
    else label = `[${c.name}]`;

    const indent = c.level > 0 ? "  ↳ " : "";
    const text = (c.text || "").substring(0, 300);
    lines.push(`${idx + 1}. ${indent}${label}: "${text}"`);
  });

  return lines.join("\n");
}

/**
 * Generate contextual reply to a comment thread
 *
 * @param {Object} params
 * @param {string} params.postContent - Original post text
 * @param {string} params.postAuthor - Post author name
 * @param {Array} params.fullThread - Full conversation array
 * @param {Object} params.targetComment - The specific comment we're replying to
 * @param {string} params.targetName - Name of person we're replying to
 * @param {string} params.tone - "author_engagement" | "warm_lead" | "friendly_acknowledgment"
 * @param {string} params.ourName - Our LinkedIn name
 */
export async function generateCommentReply(params) {
  const {
    postContent,
    postAuthor,
    fullThread = [],
    targetComment,
    targetName,
    tone = "friendly_acknowledgment",
    ourName = "Abhilash Chaurasiya",
  } = params;

  const firstName = targetName.split(" ")[0];
  const transcript = buildThreadTranscript(fullThread, ourName);
  const targetText = (targetComment?.text || targetComment?.commentText || "").substring(0, 400);

  // Tone-specific instructions
  const toneInstructions = {
    author_engagement: `
- ${firstName} is the POST AUTHOR — nurture this relationship
- Show genuine interest in their work
- Ask a thoughtful follow-up question OR share brief insight
- If they asked something, answer it briefly and helpfully
- Subtly mention Kriscent ONLY if it flows naturally (max once)
- End with soft invitation to connect/chat if appropriate`,

    warm_lead: `
- ${firstName} shows interest in our services — engage warmly
- Acknowledge what they said
- Offer to help / share more info / suggest a chat
- Mention Kriscent naturally (once) — we do software dev/AI/SaaS/MVPs
- Include soft CTA: "happy to chat", "feel free to DM", "let's connect"
- Don't be pushy or salesy — sound like a helpful peer`,

    friendly_acknowledgment: `
- ${firstName} engaged with us but isn't necessarily a lead
- Be friendly and genuine
- Acknowledge their point briefly
- If they asked something, answer helpfully
- Don't pitch services, don't mention Kriscent
- Keep it short — just a natural human reply`,
  };

  const toneGuidance = toneInstructions[tone] || toneInstructions.friendly_acknowledgment;

  const prompt = `Write a REPLY on a LinkedIn comment thread. CONTEXT is for you only.

═══ POST CONTEXT ═══
POST BY: ${postAuthor}
POST CONTENT: "${(postContent || "").substring(0, 500)}"

═══ FULL CONVERSATION SO FAR ═══
${transcript}

═══ YOUR TASK ═══
The last comment we need to reply to is from ${firstName}:
"${targetText}"

═══ TONE & STYLE ═══
${toneGuidance}

═══ RULES ═══
- Write in first person as ${ourName}
- Address ${firstName} by first name naturally
- SHORT reply: max 2 sentences, under 250 characters
- Sound human, warm, professional
- Don't repeat what was already said in the thread
- Don't use ALL CAPS or excessive punctuation
- Don't say "Great question!" or generic filler

Write ONLY the reply text. No quotes, no prefixes, no explanations.

Your reply:`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await callAI(prompt, { maxTokens: 250, temperature: 0.8 });
    if (!result.success) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    let reply = (result.text || "").trim();
    reply = reply.replace(/^["']|["']$/g, "");
    reply = reply.replace(/^(Reply|Response|Your reply):\s*/i, "");
    reply = reply.replace(/^Here'?s.*?:\s*/i, "");

    const badPatterns = [
      /^you are/i, /your task/i, /below is/i, /rules:/i,
      /context:/i, /^write/i, /good example/i, /^person/i,
      /^post by:/i, /═══/,
    ];
    if (badPatterns.some((p) => p.test(reply))) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return null;
    }

    if (reply.length < 15 || reply.length > 300) {
      if (attempt < 3) continue;
    }

    return reply.substring(0, 250);
  }

  return null;
}

/**
 * Qualify a commenter as a potential lead
 * Returns: { isLead, score (0-100), category, reason }
 */
export async function qualifyCommenterAsLead(params) {
  const {
    userName,
    userTitle,
    commentText,
    postContent,
    ourServices = "Software development agency (SaaS, AI, MVPs, custom software)",
  } = params;

  // Quick rule-based check first (save AI calls)
  const titleLower = (userTitle || "").toLowerCase();
  const commentLower = (commentText || "").toLowerCase();

  const strongTitleKeywords = [
    "founder", "co-founder", "cofounder", "ceo", "cto", "cpo", "cmo",
    "vp engineering", "vp product", "head of product", "head of engineering",
    "product manager", "product lead", "chief",
  ];
  const hasStrongTitle = strongTitleKeywords.some((k) => titleLower.includes(k));

  const interestKeywords = [
    "looking for", "need help", "trying to", "building", "we're working on",
    "our startup", "our company", "considering", "recommend", "suggest",
    "which", "how do", "what's the best", "can anyone", "any tips",
    "hiring", "seeking", "advice",
  ];
  const hasInterestSignal = interestKeywords.some((k) => commentLower.includes(k));

  // AI-based deep qualification
  const prompt = `Analyze this LinkedIn commenter and decide if they're a potential lead for our business.

OUR BUSINESS: ${ourServices}

POST TOPIC: "${(postContent || "").substring(0, 300)}"

COMMENTER PROFILE:
- Name: ${userName}
- Title: ${userTitle || "Unknown"}
- Their comment: "${(commentText || "").substring(0, 400)}"

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "isLead": true or false,
  "score": 0-100,
  "category": "hot" | "warm" | "cold" | "not_qualified",
  "reason": "1-line reason"
}

SCORING GUIDE:
- 85-95 (hot): Founder/CTO/CPO + explicit ask for services/help
- 70-84 (warm): Matching decision-maker title + shows clear interest
- 55-69 (warm): Non-founder but explicit interest in services
- 40-54 (cold): Decision-maker title but only vague/generic engagement
- 0-39 (not_qualified): No interest signals, no matching title, or clearly not a fit

IMPORTANT:
- "isLead" = true only if score >= 40
- If they're a competitor/agency employee → isLead = false
- If they're only saying "thanks" or generic praise → isLead = false
- If they mention their own product/startup → isLead = true (score based on title)`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await callAI(prompt, { maxTokens: 200, temperature: 0.3 });
    if (!result.success) {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    try {
      const text = (result.text || "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.score !== "number") continue;

      // Boost score if rule-based signals are strong
      let finalScore = parsed.score;
      if (hasStrongTitle && hasInterestSignal && finalScore < 70) {
        finalScore = 70;
      } else if (hasStrongTitle && finalScore < 50) {
        finalScore = 50;
      }

      // Determine final category from score
      let category = "not_qualified";
      if (finalScore >= 85) category = "hot";
      else if (finalScore >= 55) category = "warm";
      else if (finalScore >= 40) category = "cold";

      return {
        isLead: finalScore >= 40,
        score: finalScore,
        category,
        reason: parsed.reason || "AI qualification",
      };
    } catch (err) {
      if (attempt < 2) continue;
    }
  }

  // AI failed — fall back to rule-based
  let fallbackScore = 30;
  if (hasStrongTitle && hasInterestSignal) fallbackScore = 70;
  else if (hasStrongTitle) fallbackScore = 50;
  else if (hasInterestSignal) fallbackScore = 55;

  return {
    isLead: fallbackScore >= 40,
    score: fallbackScore,
    category: fallbackScore >= 70 ? "warm" : fallbackScore >= 40 ? "cold" : "not_qualified",
    reason: "Fallback (rule-based)",
  };
}