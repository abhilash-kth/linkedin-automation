import { smartOutreach } from "../controllers/outreach.controller.js";

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('❌ Usage: node scripts/run-single.js <accountId> <profileUrl> "<message>" [--send] [--force]');
  process.exit(1);
}

const [accountId, profileUrl, ...rest] = args;
const actuallySend = rest.includes("--send");
const skipBusinessHours = rest.includes("--force");
const messageText = rest.filter((x) => !x.startsWith("--")).join(" ");

smartOutreach(accountId, profileUrl, messageText, { actuallySend, skipBusinessHours });