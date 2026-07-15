import { processCommentReplies } from "../controllers/comment-reply.controller.js";
import { connectDB } from "../services/database/mongodb.service.js";

const args = process.argv.slice(2);
const accountId = args[0] || "account_1";
const actuallySend = args.includes("--send");

console.log(`\n💬 Comment Reply Processor (send: ${actuallySend})\n`);

await connectDB();
await processCommentReplies(accountId, actuallySend);
process.exit(0);