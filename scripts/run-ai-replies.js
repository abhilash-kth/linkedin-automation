import { processAIReplies } from "../controllers/ai-reply.controller.js";
import { connectDB } from "../services/database/mongodb.service.js";

const args = process.argv.slice(2);
const accountId = args[0] || "account_1";
const actuallySend = args.includes("--send");

console.log(`\n🤖 AI Reply Processor (send: ${actuallySend})\n`);

await connectDB();
await processAIReplies(accountId, actuallySend);
process.exit(0);