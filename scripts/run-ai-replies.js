import { processAIReplies } from "../controllers/ai-reply.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: node scripts/run-ai-replies.js <accountId>");
  process.exit(1);
}

processAIReplies(args[0]);