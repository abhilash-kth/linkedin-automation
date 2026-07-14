import { sendConnectionBatch } from "../controllers/connection-batch.controller.js";

const args = process.argv.slice(2);
const accountId = args[0] || "account_1";
const actuallySend = args.includes("--send");

console.log(`\n🚀 Manual connection batch (send: ${actuallySend})\n`);
await sendConnectionBatch(accountId, actuallySend);
process.exit(0);