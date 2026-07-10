import { autoLogin } from "../controllers/auth.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: node scripts/run-login.js <accountId>");
  process.exit(1);
}

autoLogin(args[0]);