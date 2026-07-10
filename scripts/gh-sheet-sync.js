// Runs on GitHub Actions — Syncs MongoDB → Google Sheets
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import { appendToSheet, writeSheet, readSheet } from "../services/integrations/google-sheets.service.js";

async function main() {
  console.log(`\n📊 SHEET SYNC JOB — ${new Date().toISOString()}\n`);

  await connectDB();

  const leads = await Lead.find({}).sort({ createdAt: -1 }).limit(500);
  console.log(`📊 Syncing ${leads.length} leads to Google Sheets...\n`);

  // Prepare header row
  const headers = [
    "Name", "Profile URL", "Title", "Company", "Location",
    "Email", "Phone", "Score", "Category", "Status",
    "Source", "Discovered", "Last Action", "Connection Note", "Message",
  ];

  const rows = leads.map((l) => [
    l.name || "",
    l.profileUrl || "",
    l.title || "",
    l.company || "",
    l.location || "",
    l.email || "",
    l.phone || "",
    l.conversionScore || 0,
    l.scoreCategory || "unscored",
    l.status || "pending",
    l.discoveredFrom || "manual",
    l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
    l.lastProcessedAt ? new Date(l.lastProcessedAt).toISOString().split("T")[0] : "",
    (l.connectionNote || "").substring(0, 200),
    (l.message || "").substring(0, 200),
  ]);

  // Clear existing data and write fresh
  await writeSheet("Leads", "A1:O1", [headers]);
  if (rows.length > 0) {
    await writeSheet("Leads", `A2:O${rows.length + 1}`, rows);
  }

  console.log(`✅ Synced ${rows.length} leads to sheet\n`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});