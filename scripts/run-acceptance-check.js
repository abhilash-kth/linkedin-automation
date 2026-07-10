import { checkAllAcceptances } from "../controllers/acceptance-check.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: bun scripts/run-acceptance-check.js <accountId>");
  process.exit(1);
}

checkAllAcceptances(args[0]);