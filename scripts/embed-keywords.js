import { readFile } from "fs/promises";
import { upsertKeywordVector } from "../services/database/vector-db.service.js";
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import { loadEmbedder } from "../services/ai/embedding.service.js";

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  EMBED KEYWORDS TO MONGODB                                 ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await connectDB();

  console.log(`🧠 Loading Xenova model...`);
  await loadEmbedder();

  console.log(`\n📖 Reading data/keywords.json...`);
  const data = await readFile("./data/keywords.json", "utf-8");
  const keywordsData = JSON.parse(data);

  let keywords = [];
  if (typeof keywordsData[0] === "string") {
    keywords = keywordsData.map((k) => ({ keyword: k, category: "general" }));
  } else {
    keywords = keywordsData;
  }

  console.log(`✅ Found ${keywords.length} keywords\n`);

  let saved = 0;
  for (let i = 0; i < keywords.length; i++) {
    const k = keywords[i];
    try {
      console.log(`${i + 1}/${keywords.length}: "${k.keyword}"`);
      await upsertKeywordVector(k.keyword, k.category || "general");
      saved++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  EMBEDDING COMPLETE                                        ║`);
  console.log(`║  ✅ Saved: ${String(saved).padEnd(48)}║`);
  console.log(`║  ❌ Failed: ${String(keywords.length - saved).padEnd(47)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});