import { manualLogin } from "../controllers/auth.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: node scripts/run-manual-login.js <accountId>");
  process.exit(1);
}

manualLogin(args[0]);