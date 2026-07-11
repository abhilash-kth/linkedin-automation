import { setupLeadsSheetHeaders } from "./services/integrations/google-sheets.service.js";

console.log("\n📊 Setting up Google Sheet with 46 columns...\n");

const result = await setupLeadsSheetHeaders();

if (result) {
  console.log("✅ All 46 headers set successfully!");
  console.log("👉 Open your Google Sheet to verify columns A through AT");
  console.log("\nExpected columns:");
  console.log("  A: Date Discovered");
  console.log("  B: Name");
  console.log("  C: Profile URL");
  console.log("  D: Headline");
  console.log("  E: Location");
  console.log("  F: Email");
  console.log("  G: Phone");
  console.log("  H: Website");
  console.log("  ...");
  console.log("  AT: Last Updated");
} else {
  console.log("❌ Failed to set headers");
  console.log("Check:");
  console.log("  1. GOOGLE_SHEETS_ID in .env");
  console.log("  2. GOOGLE_SERVICE_ACCOUNT_EMAIL in .env");
  console.log("  3. GOOGLE_PRIVATE_KEY in .env");
  console.log("  4. Sheet shared with service account email");
}

process.exit(0);