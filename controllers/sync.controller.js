import { readSheet, updateSheetRow, appendToSheet } from "../services/integrations/google-sheets.service.js";
import { upsertLead, getLeadsByStatus } from "../services/database/lead-db.service.js";

export async function syncFromSheet() {
  console.log(`\n📊 Syncing FROM Google Sheets → MongoDB...\n`);

  const rows = await readSheet("Leads");
  if (rows.length <= 1) {
    console.log(`   ℹ️  No data in sheet`);
    return;
  }

  const headers = rows[0];
  let synced = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lead = {};
    headers.forEach((h, idx) => {
      lead[h.toLowerCase().replace(/\s+/g, "_")] = row[idx] || "";
    });

    if (lead.profile_url || lead.profileurl) {
      await upsertLead({
        name: lead.name || "",
        profileUrl: lead.profile_url || lead.profileurl || "",
        title: lead.title || lead.headline || "",
        email: lead.email || "",
        phone: lead.phone || "",
        status: lead.status || "pending",
        sheetRow: i + 1,
      });
      synced++;
    }
  }

  console.log(`   ✅ Synced ${synced} leads from sheet`);
}

export async function syncToSheet() {
  console.log(`\n📊 Syncing FROM MongoDB → Google Sheets...\n`);

  const allLeads = await getLeadsByStatus(null);

  for (const lead of allLeads) {
    if (lead.sheetRow) {
      await updateSheetRow("Leads", lead.sheetRow, [
        lead.name,
        lead.profileUrl,
        lead.title || "",
        lead.location || "",
        lead.email || "",
        lead.phone || "",
        lead.conversionScore || 0,
        lead.scoreCategory || "",
        lead.status || "",
        lead.lastProcessedAt ? new Date(lead.lastProcessedAt).toISOString() : "",
      ]);
    }
  }

  console.log(`   ✅ Updated ${allLeads.length} leads in sheet`);
}