import { callAI } from "./claude.service.js";
import { getReplyGenerationPrompt } from "../../config/prompts/reply-generation.prompt.js";

const OUR_PRODUCT = "Kriscent — software development agency (SaaS, AI products, MVPs, custom software).";

export async function generateReply(conversationHistory, leadInfo, analysis) {
  console.log(`   ✍️  Generating reply for ${leadInfo.name}...`);

  const prompt = buildReplyPrompt(conversationHistory, leadInfo, analysis);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const aiResponse = await callAI(prompt, { maxTokens: 400, temperature: 0.75 });

    if (!aiResponse.success) {
      console.log(`   ⚠️  Attempt ${attempt}/3: ${aiResponse.reason}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    let reply = (aiResponse.text || "").trim();
    reply = reply.replace(/^["']|["']$/g, "");
    reply = reply.replace(/^(Reply|Message|Response):\s*/i, "");
    reply = reply.replace(/^Here'?s.*?:\s*/i, "");

    // Leak detection
    const badPatterns = [
      /you are/i, /your task/i, /below is/i, /rules:/i,
      /context:/i, /^write/i, /good example/i, /must start/i,
      /the reply/i, /this reply/i, /conversation history/i,
    ];

    if (badPatterns.some((p) => p.test(reply))) {
      console.log(`   ⚠️  Attempt ${attempt}/3: AI leaked prompt`);
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return null;
    }

    if (reply.length < 30 || reply.length > 800) {
      console.log(`   ⚠️  Attempt ${attempt}/3: Bad length (${reply.length})`);
      if (attempt < 3) continue;
    }

    console.log(`   ✅ Generated reply (${reply.length} chars)`);
    return reply.substring(0, 800);
  }

  return null;
}
function buildReplyPrompt(conversationHistory, leadInfo, analysis) {
  const firstName = leadInfo.name.split(" ")[0];

  // Adjust tone based on analysis
  let toneGuidance = "";
  if (analysis.interested === "yes") {
    toneGuidance = "They're INTERESTED in what we do. Be enthusiastic but professional. Suggest a specific next step: 15-min discovery call, share a case study, or ask about their timeline.";
  } else if (analysis.interested === "maybe") {
    toneGuidance = "They're CURIOUS. Be consultative. Answer their question genuinely, add value, then gently suggest exploring further.";
  } else if (analysis.hasQuestion) {
    toneGuidance = "They asked a specific QUESTION. Answer directly and helpfully first. Then subtly weave in how we can help.";
  } else {
    toneGuidance = "Keep it friendly and open. Build rapport before pitching.";
  }

  // Detect special scenarios
  let scenarioGuidance = "";

  // Check if they're pitching THEIR services (dev looking for work)
  const lastMsg = conversationHistory.split("\n").pop() || "";
  const theyPitchedUs =
    /i can|i offer|my services|i'm available|i work as|freelance|looking for (work|opportunities|clients)|hire me/i.test(lastMsg);

  if (theyPitchedUs) {
    scenarioGuidance = `
IMPORTANT: They appear to be offering THEIR services to us (they're a freelancer/agency).
- Be polite and respectful
- Acknowledge their skills briefly
- Clarify that WE are the service provider (Kriscent — SaaS/AI development agency)
- Say we're not currently hiring but happy to stay connected
- Don't be dismissive — they might refer clients later`;
  }

  // Check if they're sharing valuable insight/thought leadership
  const theySharedContent =
    lastMsg.length > 300 &&
    /the real problem|the solution|our approach|we believe|the industry|the future|the way forward/i.test(lastMsg);

  if (theySharedContent) {
    scenarioGuidance = `
IMPORTANT: They shared a THOUGHTFUL insight/vision (not a direct reply).
- Acknowledge their perspective genuinely
- Add YOUR perspective — briefly agree or add nuance
- Reference how this aligns with what we're building at Kriscent
- Suggest continuing this conversation over a quick call
- Don't just say "great point!" — engage meaningfully`;
  }

  // Check if they're asking for pricing/details
  const theyAskedPricing =
    /pricing|cost|budget|how much|rate|quote|proposal/i.test(lastMsg);

  if (theyAskedPricing) {
    scenarioGuidance = `
IMPORTANT: They asked about PRICING.
- Don't quote specific numbers
- Say pricing depends on scope
- Offer a free 15-min discovery call to understand their needs
- Provide a rough range if useful (e.g., "MVPs typically start at $X-Y")`;
  }

  let ctaGuidance = "";
  if (analysis.wantsMoreInfo) {
    ctaGuidance = "They want more info. Provide 2-3 key points briefly + offer to send full details or hop on a call.";
  } else if (analysis.mentionsSpecificNeed) {
    ctaGuidance = `They mentioned needing: ${analysis.specificNeed || "specific help"}. Address it directly + suggest 15-min chat to explore.`;
  } else {
    ctaGuidance = "End with a soft, natural CTA — either a question or gentle suggestion to chat.";
  }

  return `Write a LinkedIn reply message to ${firstName}. CONTEXT is for you only — do NOT repeat any of it.

CONTEXT:
- Their name: ${firstName}
- Their role: ${leadInfo.title || "Professional"}
- Their company: ${leadInfo.company || "Unknown"}

FULL CONVERSATION SO FAR:
${conversationHistory}

TONE: ${toneGuidance}
${scenarioGuidance}
CTA: ${ctaGuidance}

Your reply should:
- Start with "Hi ${firstName}," or "Thanks ${firstName}," or "${firstName},"
- Be conversational — like texting a colleague
- Directly respond to their LAST message with specific references
- Show you actually READ what they said (mention something specific)
- Be under 500 characters
- Sound like a real founder from Kriscent (SaaS/AI dev agency)
- End with a natural question or CTA

DO NOT:
- Repeat what they said verbatim
- Be overly formal or corporate
- Use phrases like "I hope this message finds you well"
- Mention "Kriscent" more than once
- Ask multiple questions
- Give generic responses like "Great point!"

Write ONLY the reply message. No prefix, no explanation.

Your reply:`;
}