import { sendWarmingMessages } from "../controllers/warming-message.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: bun scripts/run-warming.js <accountId> [--send]");
  process.exit(1);
}

const accountId = args[0];
const actuallySend = args.includes("--send");

sendWarmingMessages(accountId, actuallySend);