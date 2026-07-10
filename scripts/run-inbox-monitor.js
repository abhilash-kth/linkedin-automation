import { checkInbox } from "../controllers/monitor.controller.js";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("❌ Usage: node scripts/run-inbox-monitor.js <accountId> <leadsFile> [--send]");
  process.exit(1);
}

const [accountId, leadsFile, ...rest] = args;
const actuallySend = rest.includes("--send");

checkInbox(accountId, leadsFile, null, actuallySend);