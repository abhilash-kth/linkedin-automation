import { discoverLeads } from "../controllers/discovery.controller.js";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: bun scripts/run-discovery.js <accountId> [--comment]");
  console.error("   Example: bun scripts/run-discovery.js account_1");
  console.error("   With real commenting: bun scripts/run-discovery.js account_1 --comment");
  process.exit(1);
}

const accountId = args[0];
const actuallyComment = args.includes("--comment");

discoverLeads(accountId, actuallyComment).catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});