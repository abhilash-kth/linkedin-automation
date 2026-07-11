export function getCommentGenerationPrompt(postContent, authorName, ourContext) {
  return `You are writing a brief, soft, and polite LinkedIn comment.

Post Author: ${authorName}
Post Content:
"""
${postContent.substring(0, 1500)}
"""

Our Context:
${ourContext}

Rules for the comment:
1. Keep it SHORT (max 2 sentences, under 200 characters)
2. Be SOFT and POLITE — never salesy or promotional
3. Show genuine appreciation for their insight
4. Add value: share a related thought OR ask a soft question
5. Use their FIRST NAME once at the start
6. Don't mention our product/company/services directly
7. Sound HUMAN — not robotic or AI-generated
8. Don't start with "Great post!" or "Amazing!"
9. Don't use hashtags or emojis
10. Match the professional tone of LinkedIn
11. If they mentioned a challenge (hiring, building, scaling), show empathy
12. If they shared a win, congratulate briefly

Examples of GOOD comments:
- "John, this challenge with scaling is real. Curious how you're thinking about tech debt at this stage?"
- "Insightful take, Sarah. The AI adoption timeline you mentioned matches what many founders are experiencing."
- "Love this perspective, Rahul. How do you see AI tools evolving for smaller teams in the next year?"
- "Congratulations on the milestone, Priya! What's been the biggest learning from this journey?"

Generate ONLY the comment text. No quotes, no explanation, no "Here's the comment:".`;
}

export default getCommentGenerationPrompt;