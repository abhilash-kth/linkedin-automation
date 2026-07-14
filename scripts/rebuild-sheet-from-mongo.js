/**
 * RECOVERY SCRIPT
 * Rebuilds the entire Leads sheet from MongoDB data
 * 
 * Use this to restore data after sync overwrote your sheet
 * 
 * Usage: node scripts/rebuild-sheet-from-mongo.js
 */
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import {
  writeSheet,
  setupLeadsSheetHeaders,
  buildLeadRow,
} from "../services/integrations/google-sheets.service.js";

async function main() {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  REBUILD SHEET FROM MONGODB                                ║`);
  console.log(`║  Restores all 46 columns from database                     ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  await connectDB();

  // Step 1: Set headers
  console.log(`\n📋 Step 1: Setting up headers (A1:AT1)...`);
  await setupLeadsSheetHeaders();

  // Step 2: Fetch all leads
  console.log(`\n📥 Step 2: Fetching leads from MongoDB...`);
  const leads = await Lead.find({}).sort({ createdAt: -1 }).lean();
  console.log(`   ✅ Found ${leads.length} leads`);

  if (leads.length === 0) {
    console.log(`\n⚠️  No leads in database\n`);
    await disconnectDB();
    process.exit(0);
  }

  // Step 3: Build rows
  console.log(`\n🔨 Step 3: Building ${leads.length} rows (46 columns each)...`);
  const rows = leads.map((l, i) => {
    const row = buildLeadRow(l);
    if (row.length !== 46) {
      console.log(`   ⚠️  Lead ${i + 1} (${l.name}) has ${row.length} columns`);
    }
    return row;
  });

  // Step 4: Write to sheet
  console.log(`\n✍️  Step 4: Writing to Google Sheets (A2:AT${rows.length + 1})...`);
  const success = await writeSheet("Leads", `A2:AT${rows.length + 1}`, rows);

  if (success) {
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  ✅ REBUILD COMPLETE                                       ║`);
    console.log(`║  Total leads restored: ${String(rows.length).padEnd(35)}║`);
    console.log(`║  All 46 columns populated from MongoDB                     ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } else {
    console.log(`\n❌ Rebuild failed\n`);
  }

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});