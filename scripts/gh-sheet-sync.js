// // Runs on GitHub Actions — Full MongoDB → Sheet sync (46 columns)
// import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
// import Lead from "../models/Lead.model.js";
// import {
//   writeSheet,
//   setupLeadsSheetHeaders,
//   buildLeadRow,
// } from "../services/integrations/google-sheets.service.js";

// async function main() {
//   console.log(`\n📊 SHEET SYNC — ${new Date().toISOString()}\n`);
//   await connectDB();

//   console.log(`📋 Ensuring headers...`);
//   await setupLeadsSheetHeaders();

//   const leads = await Lead.find({}).sort({ createdAt: -1 }).limit(2000).lean();
//   console.log(`📊 Found ${leads.length} leads in MongoDB\n`);

//   if (leads.length === 0) {
//     console.log(`   ℹ️  Nothing to sync`);
//     await disconnectDB();
//     process.exit(0);
//   }

//   const rows = leads.map((l) => buildLeadRow(l));

//   // Validate all rows have 46 columns
//   const badRows = rows.filter((r) => r.length !== 46);
//   if (badRows.length > 0) {
//     console.log(`   ⚠️  ${badRows.length} rows have wrong column count!`);
//   }

//   console.log(`   ✍️  Writing ${rows.length} rows (A2:AT${rows.length + 1})...`);
//   await writeSheet("Leads", `A2:AT${rows.length + 1}`, rows);

//   console.log(`\n✅ Synced ${rows.length} leads with all 46 columns\n`);
//   await disconnectDB();
//   process.exit(0);
// }

// main().catch((err) => {
//   console.error(`❌ Fatal: ${err.message}`);
//   console.error(err.stack);
//   process.exit(1);
// });

// Runs on GitHub Actions — Smart MongoDB → Sheet sync
// FIXED: No longer overwrites manually entered data (InMail, Follow-ups etc.)
// STRATEGY: Read existing sheet rows → merge with MongoDB → write back only changed rows

import {
  connectDB,
  disconnectDB,
} from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import Conversation from "../models/Conversation.model.js";
import {
  writeSheet,
  readSheet,
  setupLeadsSheetHeaders,
  buildLeadRow,
  SHEET_HEADERS,
} from "../services/integrations/google-sheets.service.js";

// Columns that should NEVER be overwritten by MongoDB sync
// because they may have been manually edited in the sheet
// or contain data that doesn't live in MongoDB
const PROTECTED_COLS = {
  AA: 26, // InMail Sent    — may be manually entered
  AB: 27, // InMail Text    — may be manually entered
  AC: 28, // InMail Date    — may be manually entered
  AJ: 35, // Follow-up Needed — may be manually set
  AK: 36, // Follow-up 1 Sent — may be manually set
  AL: 37, // Follow-up 1 Date — may be manually set
  AM: 38, // Follow-up 2 Sent — may be manually set
  AN: 39, // Follow-up 2 Date — may be manually set
  AQ: 42, // Meeting Date   — may be manually entered
  AR: 43, // Notes          — may be manually entered
};

// Columns that SHOULD be updated from MongoDB (reflect real automation state)
// These are safe to overwrite because MongoDB is the source of truth
const MONGO_SOURCE_COLS = {
  B:  1,  // Name
  D:  3,  // Headline
  E:  4,  // Location
  F:  5,  // Email
  G:  6,  // Phone
  H:  7,  // Website
  I:  8,  // Score (%)
  J:  9,  // Category
  P:  15, // Comment Posted   ← WAS BUGGY
  Q:  16, // Our Comment Text
  R:  17, // Comment Date
  S:  18, // Connection Sent
  T:  19, // Connection Note
  U:  20, // Connection Date
  V:  21, // Connection Status
  W:  22, // Accepted Date
  X:  23, // Warming Msg Sent
  Y:  24, // Warming Msg Text
  Z:  25, // Warming Date
  AD: 29, // Replied          ← WAS BUGGY (reset to No)
  AE: 30, // First Reply Date ← WAS BUGGY
  AF: 31, // Total Replies    ← WAS HARDCODED 0
  AG: 32, // Last Reply Preview ← WAS HARDCODED empty
  AH: 33, // AI Interest Level ← WAS BUGGY
  AI: 34, // AI Sentiment     ← WAS BUGGY
  AO: 40, // Final Status
  AP: 41, // Meeting Scheduled
  AS: 44, // Account Used
  AT: 45, // Last Updated
};

async function main() {
  console.log(`\n📊 SHEET SYNC — ${new Date().toISOString()}\n`);
  await connectDB();

  console.log(`📋 Ensuring headers...`);
  await setupLeadsSheetHeaders();

  // ── Step 1: Load all leads from MongoDB ──
  const leads = await Lead.find({})
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();
  console.log(`📊 Found ${leads.length} leads in MongoDB\n`);

  if (leads.length === 0) {
    console.log(`   ℹ️  Nothing to sync`);
    await disconnectDB();
    process.exit(0);
  }

  // ── Step 2: Load ALL conversations to enrich reply data ──
  // This fixes: totalReplies=0, lastReplyPreview="", aiInterestLevel=""
  console.log(`💬 Loading conversation data to enrich reply fields...`);
  const allConvos = await Conversation.find({}).lean();
  const convoByProfileUrl = {};
  for (const c of allConvos) {
    convoByProfileUrl[c.leadProfileUrl] = c;
  }
  console.log(`   ✅ Loaded ${allConvos.length} conversations\n`);

  // ── Step 3: Read existing sheet to preserve protected columns ──
  console.log(`📖 Reading existing sheet data...`);
  const existingRows = await readSheet("Leads", "A:AT");

  // Build map of profileUrl → existing row data (row index is 1-based)
  const existingRowByUrl = {};
  for (let i = 1; i < existingRows.length; i++) {
    const row = existingRows[i];
    const url = row[2]; // Column C = Profile URL
    if (url) {
      existingRowByUrl[url] = { data: row, sheetRowIndex: i + 1 }; // +1 because sheet is 1-based
    }
  }
  console.log(
    `   ✅ Found ${Object.keys(existingRowByUrl).length} existing rows in sheet\n`,
  );

  // ── Step 4: Build enriched lead rows ──
  console.log(`🔨 Building enriched rows...`);
  const updates = []; // { sheetRow, rowData }
  const newRows = [];  // leads not yet in sheet

  let enriched = 0;
  let protected_preserved = 0;

  for (const lead of leads) {
    // Enrich lead with conversation data before building row
    const convo = convoByProfileUrl[lead.profileUrl];
    const enrichedLead = enrichLeadWithConversation(lead, convo);

    // Build the MongoDB-sourced row
    const mongoRow = buildLeadRow(enrichedLead);

    const existing = existingRowByUrl[lead.profileUrl];

    if (existing) {
      // Lead EXISTS in sheet — merge, preserving protected columns
      const mergedRow = [...mongoRow]; // start with fresh MongoDB data

      // Restore protected column values from existing sheet row
      const existingData = existing.data;
      while (existingData.length < 46) existingData.push("");

      for (const [, colIdx] of Object.entries(PROTECTED_COLS)) {
        const existingValue = existingData[colIdx];
        // Only preserve if existing sheet value is non-empty
        // (don't preserve empty strings over MongoDB values)
        if (existingValue && existingValue.toString().trim() !== "") {
          mergedRow[colIdx] = existingValue;
          protected_preserved++;
        }
      }

      updates.push({
        sheetRow: existing.sheetRowIndex,
        rowData: mergedRow,
      });
      enriched++;
    } else {
      // Lead is NEW — not yet in sheet, append it
      newRows.push(mongoRow);
    }
  }

  console.log(`   ✅ ${enriched} existing leads to update`);
  console.log(`   ✅ ${newRows.length} new leads to append`);
  console.log(
    `   🔒 ${protected_preserved} protected cell values preserved\n`,
  );

  // ── Step 5: Write updates in batches ──
  // Use batchUpdate to avoid rate limits
  if (updates.length > 0) {
    console.log(`✍️  Writing ${updates.length} row updates...`);

    const BATCH_SIZE = 50;
    let written = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      // Build batch data for writeSheet
      // We write each row individually to its correct sheet row number
      for (const update of batch) {
        await writeSheet(
          "Leads",
          `A${update.sheetRow}:AT${update.sheetRow}`,
          [update.rowData],
        );
        written++;
      }

      console.log(
        `   📝 Batch ${Math.floor(i / BATCH_SIZE) + 1}: wrote ${batch.length} rows (total: ${written})`,
      );

      // Small delay between batches to avoid API rate limit
      if (i + BATCH_SIZE < updates.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log(`   ✅ Updated ${written} existing rows\n`);
  }

  // ── Step 6: Append new leads ──
  if (newRows.length > 0) {
    console.log(`➕ Appending ${newRows.length} new leads...`);

    const { appendToSheet } = await import(
      "../services/integrations/google-sheets.service.js"
    );

    // Append in batches of 100
    const APPEND_BATCH = 100;
    for (let i = 0; i < newRows.length; i += APPEND_BATCH) {
      const batch = newRows.slice(i, i + APPEND_BATCH);
      await appendToSheet("Leads", batch);
      console.log(
        `   📝 Appended batch ${Math.floor(i / APPEND_BATCH) + 1}: ${batch.length} rows`,
      );
      if (i + APPEND_BATCH < newRows.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log(`   ✅ Appended ${newRows.length} new leads\n`);
  }

  console.log(
    `✅ Sync complete — ${enriched} updated, ${newRows.length} new\n`,
  );
  await disconnectDB();
  process.exit(0);
}

/**
 * Enrich a lead with data from its Conversation document
 * This fixes: totalReplies=0, lastReplyPreview="", aiInterestLevel="", aiSentiment=""
 *
 * @param {Object} lead - Lead document (lean)
 * @param {Object|null} convo - Conversation document (lean), or null
 * @returns {Object} enriched lead
 */
function enrichLeadWithConversation(lead, convo) {
  if (!convo) return lead;

  const enriched = { ...lead };

  // Count their messages as "replies"
  const theirMessages = convo.messages.filter((m) => m.sender === "them");
  const replyCount = theirMessages.length;

  if (replyCount > 0) {
    // totalReplies — was always hardcoded 0
    enriched.totalReplies = replyCount;

    // firstReplyDate — use dedicated field if set, else earliest their message
    if (!enriched.firstReplyDate && !enriched.lastRepliedAt) {
      const sorted = [...theirMessages].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
      enriched.firstReplyDate = sorted[0].timestamp;
    }

    // lastReplyPreview — was always hardcoded ""
    const lastTheirMsg = [...theirMessages].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    )[0];
    if (lastTheirMsg && !enriched.lastReplyPreview) {
      enriched.lastReplyPreview = lastTheirMsg.text.substring(0, 200);
    }
  }

  // AI analysis from Conversation — was reading wrong field
  if (!enriched.aiInterestLevel && convo.interested && convo.interested !== "unknown") {
    enriched.aiInterestLevel = convo.interested;
  }
  if (!enriched.aiSentiment && convo.sentiment && convo.sentiment !== "unknown") {
    enriched.aiSentiment = convo.sentiment;
  }

  return enriched;
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});