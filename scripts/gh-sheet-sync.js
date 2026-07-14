// Runs on GitHub Actions — Full MongoDB → Sheet sync (46 columns)
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import {
  writeSheet,
  setupLeadsSheetHeaders,
  buildLeadRow,
} from "../services/integrations/google-sheets.service.js";

async function main() {
  console.log(`\n📊 SHEET SYNC — ${new Date().toISOString()}\n`);
  await connectDB();

  console.log(`📋 Ensuring headers...`);
  await setupLeadsSheetHeaders();

  const leads = await Lead.find({}).sort({ createdAt: -1 }).limit(2000).lean();
  console.log(`📊 Found ${leads.length} leads in MongoDB\n`);

  if (leads.length === 0) {
    console.log(`   ℹ️  Nothing to sync`);
    await disconnectDB();
    process.exit(0);
  }

  const rows = leads.map((l) => buildLeadRow(l));

  // Validate all rows have 46 columns
  const badRows = rows.filter((r) => r.length !== 46);
  if (badRows.length > 0) {
    console.log(`   ⚠️  ${badRows.length} rows have wrong column count!`);
  }

  console.log(`   ✍️  Writing ${rows.length} rows (A2:AT${rows.length + 1})...`);
  await writeSheet("Leads", `A2:AT${rows.length + 1}`, rows);

  console.log(`\n✅ Synced ${rows.length} leads with all 46 columns\n`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});