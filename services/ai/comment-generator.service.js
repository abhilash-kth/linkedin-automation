import { callAI } from "./claude.service.js";
import { getCommentGenerationPrompt } from "../../config/prompts/comment-generation.prompt.js";

const OUR_CONTEXT = `Kriscent is a software development agency specializing in:
- SaaS product development (web + mobile)
- AI product engineering (LLMs, agents, automation)
- Custom software solutions for startups & SMBs
- MVP development for founders
- Full-stack development (React, Node.js, Python)
- AI integration consulting

We help founders and businesses build, scale, and modernize their tech products.
We value insights from people building startups, hiring tech teams, or exploring AI adoption.`;

// Daily comment counter (in-memory)
let dailyCommentCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_COMMENTS = 20;

export function resetDailyCounter() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyCommentCount = 0;
    lastResetDate = today;
  }
}

export function canComment() {
  resetDailyCounter();
  return dailyCommentCount < MAX_DAILY_COMMENTS;
}

export function getRemainingComments() {
  resetDailyCounter();
  return MAX_DAILY_COMMENTS - dailyCommentCount;
}

export async function generateComment(postContent, authorName) {
  console.log(`   ✍️  Generating AI comment for ${authorName}...`);

  const prompt = getCommentGenerationPrompt(postContent, authorName, OUR_CONTEXT);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const aiResponse = await callAI(prompt, {
      maxTokens: 300,
      temperature: 0.8 + (attempt * 0.05),
    });

    if (!aiResponse.success) {
      console.log(`   ⚠️  Attempt ${attempt}/3 failed: ${aiResponse.reason}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 3000 * attempt));
        continue;
      }
      return null;
    }

    let comment = (aiResponse.text || "").trim();

    // ── Cleanup patterns ──
    comment = comment.replace(/^["']|["']$/g, "");
    comment = comment.replace(/^Comment:\s*/i, "");
    comment = comment.replace(/^Here's.*?:\s*/i, "");
    comment = comment.replace(/^Reply:\s*/i, "");
    comment = comment.replace(/^Response:\s*/i, "");

    // ── Filter out AI leaking its own instructions ──
    const badPatterns = [
      /we need to produce/i,
      /following strict rules/i,
      /the post author/i,
      /generate only/i,
      /he says:/i,
      /she says:/i,
      /the comment should/i,
      /the message should/i,
      /rules for the comment/i,
      /brief.*polite.*linkedin comment/i,
    ];

    let hasBadPattern = false;
    for (const pattern of badPatterns) {
      if (pattern.test(comment)) {
        hasBadPattern = true;
        console.log(`   ⚠️  AI leaked instructions — retrying...`);
        break;
      }
    }

    if (hasBadPattern) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return null;
    }

    // ── Check quality ──
    comment = comment.substring(0, 300).trim();

    if (comment.length < 20) {
      console.log(`   ⚠️  Attempt ${attempt}/3: Comment too short`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      return null;
    }

    // ── Ensure comment starts with author name ──
    if (!comment.toLowerCase().startsWith(authorName.split(" ")[0].toLowerCase())) {
      // Not starting with first name - still OK
    }

    console.log(`   ✅ Generated: "${comment.substring(0, 80)}..."`);
    return comment;
  }

  console.log(`   ❌ Failed to generate valid comment after 3 attempts`);
  return null;
}

export function incrementCommentCount() {
  dailyCommentCount++;
  console.log(
    `   📊 Comments today: ${dailyCommentCount}/${MAX_DAILY_COMMENTS}`,
  );
}
