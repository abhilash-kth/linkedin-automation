import { readFile } from "fs/promises";
import { upsertRequirement } from "../services/database/requirement-db.service.js";
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import { loadEmbedder } from "../services/ai/embedding.service.js";

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  EMBED REQUIREMENTS (Ideal Customer References)            ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await connectDB();

  console.log(`🧠 Loading Xenova model...`);
  await loadEmbedder();

  console.log(`\n📖 Reading data/requirements.json...`);
  const data = await readFile("./data/requirements.json", "utf-8");
  const requirements = JSON.parse(data);

  console.log(`✅ Found ${requirements.length} requirements\n`);

  let saved = 0;
  for (let i = 0; i < requirements.length; i++) {
    const r = requirements[i];
    try {
      console.log(`${i + 1}/${requirements.length}: "${r.label}"`);
      await upsertRequirement(r.id, r.label, r.text);
      saved++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  REQUIREMENTS EMBEDDED                                     ║`);
  console.log(`║  ✅ Saved: ${String(saved).padEnd(48)}║`);
  console.log(`║  ❌ Failed: ${String(requirements.length - saved).padEnd(47)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});