export function getReplyOnCommentPrompt(postContent, authorName, authorReply, ourPreviousComment, ourContext) {
  return `You are writing a REPLY on a LinkedIn comment.

Context: You previously commented on ${authorName}'s post. Now they replied to your comment, and you need to respond.

Original Post by ${authorName}:
"""
${postContent.substring(0, 1000)}
"""

Your Previous Comment:
"""
${ourPreviousComment || "No previous comment recorded"}
"""

${authorName}'s Reply to You:
"""
${authorReply}
"""

Our Business Context:
${ourContext}

Rules for the reply:
1. Keep it SHORT (max 2 sentences, under 200 characters)
2. Be CONVERSATIONAL and natural
3. Continue the conversation thread naturally
4. If they asked a question, answer briefly
5. If they showed interest, subtly suggest connecting/DM
6. Use their FIRST NAME once
7. Don't be salesy
8. Don't repeat what you said before

Examples of GOOD replies:
- "Absolutely, Rahul. We've helped similar founders navigate this. Would love to share more if you're open — DM anytime."
- "Great question, Sarah! We usually see 3-4 weeks for a solid MVP. Happy to walk you through our process."
- "Thanks for sharing, John. That aligns with our experience too. Let's stay connected."

Generate ONLY the reply text. No quotes, no explanation.`;
}

export default getReplyOnCommentPrompt;