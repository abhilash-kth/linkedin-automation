import { google } from "googleapis";
import sheetsConfig from "../../config/google-sheets.config.js";

let sheetsClient = null;

async function getClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: sheetsConfig.credentials.client_email,
      private_key: sheetsConfig.credentials.private_key,
    },
    scopes: sheetsConfig.scopes,
  });

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: "v4", auth: authClient });
  return sheetsClient;
}

export async function readSheet(sheetName, range = "A:AT") {
  const client = await getClient();
  if (!client) return [];
  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    return response.data.values || [];
  } catch (err) {
    console.log(`   ❌ Sheet read error: ${err.message}`);
    return [];
  }
}

export async function writeSheet(sheetName, range, values) {
  const client = await getClient();
  if (!client) return false;
  try {
    await client.spreadsheets.values.update({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return true;
  } catch (err) {
    console.log(`   ❌ Sheet write error: ${err.message}`);
    return false;
  }
}

export async function appendToSheet(sheetName, values) {
  const client = await getClient();
  if (!client) return false;
  try {
    await client.spreadsheets.values.append({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: `${sheetName}!A:AT`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
    return true;
  } catch (err) {
    console.log(`   ❌ Sheet append error: ${err.message}`);
    return false;
  }
}

export async function updateSheetRow(sheetName, row, values) {
  return await writeSheet(sheetName, `A${row}:AT${row}`, [values]);
}

/**
 * Setup Leads sheet with exactly 46 columns (A to AT)
 * Run this ONCE to create/reset headers
 */
export async function setupLeadsSheetHeaders() {
  const headers = [
    // ── Discovery ──
    "Date Discovered",      // A
    "Name",                 // B
    "Profile URL",          // C
    "Headline",             // D
    "Location",             // E
    "Email",                // F
    "Phone",                // G
    "Website",              // H

    // ── Scoring ──
    "Score (%)",            // I
    "Category",             // J  hot/warm/cold
    "Keyword",              // K
    "Source",               // L  post/search/manual

    // ── Post Info ──
    "Post Content",         // M
    "Post URL",             // N
    "Post Time",            // O

    // ── Comment ──
    "Comment Posted",       // P  Yes/No
    "Our Comment Text",     // Q
    "Comment Date",         // R

    // ── Connection ──
    "Connection Sent",      // S  Yes/No
    "Connection Note",      // T
    "Connection Date",      // U

    // ── Acceptance ──
    "Connection Status",    // V  pending/accepted/rejected
    "Accepted Date",        // W

    // ── Warming Message ──
    "Warming Msg Sent",     // X  Yes/No
    "Warming Msg Text",     // Y
    "Warming Date",         // Z

    // ── InMail ──
    "InMail Sent",          // AA  Yes/No
    "InMail Text",          // AB
    "InMail Date",          // AC

    // ── Reply Tracking ──
    "Replied",              // AD  Yes/No
    "First Reply Date",     // AE
    "Total Replies",        // AF
    "Last Reply Preview",   // AG

    // ── AI Analysis ──
    "AI Interest Level",    // AH  yes/no/maybe
    "AI Sentiment",         // AI  positive/negative/neutral
    "Follow-up Needed",     // AJ  Yes/No

    // ── Follow-ups ──
    "Follow-up 1 Sent",     // AK  Yes/No
    "Follow-up 1 Date",     // AL
    "Follow-up 2 Sent",     // AM  Yes/No
    "Follow-up 2 Date",     // AN

    // ── Final Status ──
    "Final Status",         // AO  discovered/commented/connected/interested/meeting/closed
    "Meeting Scheduled",    // AP  Yes/No
    "Meeting Date",         // AQ
    "Notes",                // AR

    // ── Meta ──
    "Account Used",         // AS
    "Last Updated",         // AT
  ];

  console.log(`📋 Setting up Leads sheet headers (${headers.length} columns)...`);
  const result = await writeSheet("Leads", "A1:AT1", [headers]);
  if (result) {
    console.log(`✅ Headers set (A to AT = 46 columns)`);
  }
  return result;
}

/**
 * Find the sheet row number for a lead by Profile URL (column C)
 */
export async function findLeadRowByUrl(profileUrl) {
  const rows = await readSheet("Leads", "C:C");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === profileUrl) {
      return i + 1; // 1-indexed sheet row
    }
  }
  return null;
}

/**
 * Update specific columns for an existing lead row
 */
export async function updateLeadInSheet(profileUrl, updates) {
  const rowNum = await findLeadRowByUrl(profileUrl);
  if (!rowNum) {
    console.log(`   ⚠️  Lead not found in sheet: ${profileUrl}`);
    return false;
  }

  // Read current row
  const rows = await readSheet("Leads", `A${rowNum}:AT${rowNum}`);
  if (!rows || rows.length === 0) return false;

  const currentRow = rows[0];
  // Pad to 46 columns
  while (currentRow.length < 46) currentRow.push("");

  // Apply updates (column letters mapped to 0-based index)
  const colMap = {
    A: 0,  B: 1,  C: 2,  D: 3,  E: 4,  F: 5,  G: 6,  H: 7,
    I: 8,  J: 9,  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15,
    Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23,
    Y: 24, Z: 25, AA: 26, AB: 27, AC: 28, AD: 29, AE: 30,
    AF: 31, AG: 32, AH: 33, AI: 34, AJ: 35, AK: 36, AL: 37,
    AM: 38, AN: 39, AO: 40, AP: 41, AQ: 42, AR: 43, AS: 44, AT: 45,
  };

  for (const [col, value] of Object.entries(updates)) {
    const idx = colMap[col.toUpperCase()];
    if (idx !== undefined) {
      currentRow[idx] = value;
    }
  }

  return await writeSheet("Leads", `A${rowNum}:AT${rowNum}`, [currentRow]);
}