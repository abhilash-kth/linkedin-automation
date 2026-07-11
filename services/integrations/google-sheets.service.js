import { google } from "googleapis";
import sheetsConfig from "../../config/google-sheets.config.js";

let sheetsClient = null;

// async function getClient() {
//   if (sheetsClient) return sheetsClient;
//   if (!sheetsConfig.credentials.client_email || !sheetsConfig.credentials.private_key) {
//     console.log(`   ⚠️  Google Sheets credentials not configured`);
//     return null;
//   }

//   const auth = new google.auth.JWT(
//     sheetsConfig.credentials.client_email,
//     null,
//     sheetsConfig.credentials.private_key,
//     sheetsConfig.scopes,
//   );
//   try {
//   const token = await auth.authorize();
//   console.log("JWT Authorized:", token);
// } catch (e) {
//   console.error("JWT Authorization Error:", e);
//   throw e;
// }

//   sheetsClient = google.sheets({ version: "v4", auth });
//   return sheetsClient;
// }

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

  sheetsClient = google.sheets({
    version: "v4",
    auth: authClient,
  });

  return sheetsClient;
}

export async function readSheet(sheetName, range = "A:Z") {
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
      range: `${sheetName}!A:Z`,
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

/**
 * Setup Leads sheet with proper headers
 */
/**
 * Setup Leads sheet with complete tracking pipeline
 */
export async function setupLeadsSheetHeaders() {
  const headers = [
    // ── Discovery Data ──
    "Date Discovered",       // A
    "Name",                  // B
    "Profile URL",           // C
    "Headline",              // D
    "Location",              // E
    "Email",                 // F
    "Phone",                 // G
    "Website",               // H

    // ── Scoring ──
    "Score (%)",             // I
    "Category",              // J - hot/warm/cold
    "Keyword",               // K
    "Source",                // L - post/search/manual

    // ── Post Info ──
    "Post Content",          // M
    "Post URL",              // N
    "Post Time",             // O

    // ── Our Actions ──
    "Comment Posted",        // P - Yes/No/Failed
    "Our Comment Text",      // Q
    "Comment Date",          // R

    // ── Connection ──
    "Connection Sent",       // S - Yes/No/Failed
    "Connection Note",       // T
    "Connection Date",       // U

    // ── Acceptance ──
    "Connection Status",     // V - pending/accepted/rejected
    "Accepted Date",         // W

    // ── Messaging ──
    "Warming Message Sent",  // X - Yes/No
    "Warming Message Text",  // Y
    "Warming Date",          // Z

    // ── InMail (Premium) ──
    "InMail Sent",           // AA - Yes/No
    "InMail Text",           // AB
    "InMail Date",           // AC

    // ── Reply Tracking ──
    "Replied",               // AD - Yes/No
    "First Reply Date",      // AE
    "Total Replies",         // AF
    "Last Reply Preview",    // AG

    // ── AI Analysis ──
    "AI Interest Level",     // AH - yes/no/maybe
    "AI Sentiment",          // AI - positive/negative/neutral
    "Follow-up Needed",      // AJ - Yes/No

    // ── Follow-ups ──
    "Follow-up 1 Sent",      // AK
    "Follow-up 1 Date",      // AL
    "Follow-up 2 Sent",      // AM
    "Follow-up 2 Date",      // AN

    // ── Final Status ──
    "Final Status",          // AO - discovered/commented/connected/interested/meeting/closed/lost
    "Meeting Scheduled",     // AP - Yes/No
    "Meeting Date",          // AQ
    "Notes",                 // AR

    // ── Metadata ──
    "Account Used",          // AS
    "Last Updated",          // AT
  ];

  return await writeSheet("Leads", "A1:AT1", [headers]);
}

export async function updateSheetRow(sheetName, row, values) {
  return await writeSheet(sheetName, `A${row}:Z${row}`, [values]);
}