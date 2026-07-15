import { callAI } from "./claude.service.js";

/**
 * Generate a reply to author's response on our LinkedIn comment
 * Context: You commented → they replied → now you reply back
 */
export async function generateCommentReply(postContent, ourComment, authorReply, authorName) {
  const firstName = authorName.split(" ")[0];

  const prompt = `Write a REPLY on a LinkedIn comment thread. CONTEXT is for you only.

CONTEXT:
- Original post by ${firstName}: "${(postContent || "").substring(0, 400)}"
- YOUR earlier comment on their post: "${(ourComment || "").substring(0, 200)}"
- ${firstName}'s reply to your comment: "${(authorReply || "").substring(0, 400)}"

Write your NEXT reply in the comment thread. It should:
- Be SHORT (max 2 sentences, under 200 characters)
- Address ${firstName} by first name
- Continue the conversation naturally
- If they asked a question, answer it briefly
- If they showed interest → subtly suggest connecting or DMing
- Be professional but warm — like a peer, not a salesperson
- NOT be salesy or pitch services directly
- NOT repeat what you already said
- NOT mention "Kriscent" more than once (only if very natural)

Write ONLY the reply text. No quotes, no prefixes.

Good examples:
- "Absolutely, ${firstName}. We've helped similar founders navigate this. Would love to share more — feel free to DM."
- "Great question! We usually see 3-4 weeks for a solid MVP. Happy to walk you through our process."
- "Thanks for sharing, ${firstName}. That aligns with our experience. Let's stay connected!"

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
    ];
    if (badPatterns.some((p) => p.test(reply))) {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return null;
    }

    if (reply.length < 15 || reply.length > 300) {
      if (attempt < 3) continue;
    }

    return reply.substring(0, 250);
  }

  return null;
}