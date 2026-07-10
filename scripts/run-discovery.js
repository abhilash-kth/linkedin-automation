import { discoverLeads } from "../controllers/discovery.controller.js";
import { readFile } from "fs/promises";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: node scripts/run-discovery.js <accountId> [keywordsFile]");
  process.exit(1);
}

const accountId = args[0];
const keywordsFile = args[1] || "./data/keywords.json";

let keywords;
try {
  const data = await readFile(keywordsFile, "utf-8");
  keywords = JSON.parse(data);
} catch {
  keywords = ["beauty salon AI", "salon management software", "wellness startup founder"];
}

discoverLeads(accountId, keywords, 2);