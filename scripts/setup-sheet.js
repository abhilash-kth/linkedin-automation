/**
 * Run ONCE to setup Google Sheets headers for the Leads tab.
 * 
 * Usage:
 *   node scripts/setup-sheet.js
 * 
 * This will create/reset the header row (A1:AT1) with 46 columns
 * matching the schema used by discovery.controller.js
 */
import { setupLeadsSheetHeaders } from "../services/integrations/google-sheets.service.js";

console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  GOOGLE SHEETS — HEADER SETUP                              ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

try {
  console.log(`📋 Writing headers to "Leads" sheet (A1:AT1)...\n`);
  const success = await setupLeadsSheetHeaders();

  if (success) {
    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  ✅ HEADERS CREATED SUCCESSFULLY                           ║`);
    console.log(`║  46 columns from A (Date Discovered) to AT (Last Updated)  ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } else {
    console.log(`\n❌ Setup failed — check Google Sheets credentials\n`);
  }
} catch (err) {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}

process.exit(0);