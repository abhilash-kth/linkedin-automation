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
    if (values && values.length > 0 && values[0].length !== 46) {
      console.log(`   ⚠️  Row has ${values[0].length} columns (expected 46)`);
    }
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
 * THE ONE TRUE HEADER LIST — 46 columns A to AT
 */
export const SHEET_HEADERS = [
  "Date Discovered", // A  [0]
  "Name", // B  [1]
  "Profile URL", // C  [2]
  "Headline", // D  [3]
  "Location", // E  [4]
  "Email", // F  [5]
  "Phone", // G  [6]
  "Website", // H  [7]
  "Score (%)", // I  [8]
  "Category", // J  [9]
  "Keyword", // K  [10]
  "Source", // L  [11]
  "Post Content", // M  [12]
  "Post URL", // N  [13]
  "Post Time", // O  [14]
  "Comment Posted", // P  [15]
  "Our Comment Text", // Q  [16]
  "Comment Date", // R  [17]
  "Connection Sent", // S  [18]
  "Connection Note", // T  [19]
  "Connection Date", // U  [20]
  "Connection Status", // V  [21]
  "Accepted Date", // W  [22]
  "Warming Msg Sent", // X  [23]
  "Warming Msg Text", // Y  [24]
  "Warming Date", // Z  [25]
  "InMail Sent", // AA [26]
  "InMail Text", // AB [27]
  "InMail Date", // AC [28]
  "Replied", // AD [29]
  "First Reply Date", // AE [30]
  "Total Replies", // AF [31]
  "Last Reply Preview", // AG [32]
  "AI Interest Level", // AH [33]
  "AI Sentiment", // AI [34]
  "Follow-up Needed", // AJ [35]
  "Follow-up 1 Sent", // AK [36]
  "Follow-up 1 Date", // AL [37]
  "Follow-up 2 Sent", // AM [38]
  "Follow-up 2 Date", // AN [39]
  "Final Status", // AO [40]
  "Meeting Scheduled", // AP [41]
  "Meeting Date", // AQ [42]
  "Notes", // AR [43]
  "Account Used", // AS [44]
  "Last Updated", // AT [45]
];

export async function setupLeadsSheetHeaders() {
  console.log(`📋 Setting ${SHEET_HEADERS.length} column headers (A1:AT1)...`);
  const result = await writeSheet("Leads", "A1:AT1", [SHEET_HEADERS]);
  if (result) {
    console.log(
      `✅ Headers set: A (${SHEET_HEADERS[0]}) → AT (${SHEET_HEADERS[45]})`,
    );
  }
  return result;
}

/**
 * THE ONE TRUE ROW BUILDER — always returns exactly 46 columns
 *
 * ALL BUGS FIXED:
 * 1. Comment Posted (P): was always "No" due to boolean === string bug
 * 2. InMail fields (AA-AC): were hardcoded to "No"/empty — now reads from lead
 * 3. Reply fields (AD-AG): totalReplies was hardcoded 0, preview hardcoded empty
 * 4. AI fields (AH-AI): now reads from dedicated fields, falls back to aiAnalysis
 * 5. Follow-up fields (AJ-AN): were hardcoded — now reads from lead
 * 6. Meeting Date (AQ): was hardcoded empty — now reads from lead
 * 7. connectionStatus: now handles all statuses correctly
 */
export function buildLeadRow(lead) {
  const now = new Date();
  const nowIso = now.toISOString();

  // ── Date Discovered ──
  const dateDiscovered = lead.createdAt
    ? new Date(lead.createdAt).toISOString().split("T")[0]
    : nowIso.split("T")[0];

  // ── FIX 1: Comment Posted ──
  // OLD BUG: wasCommented === "commented" → boolean compared to string → always false
  // NEW: use dedicated commentPosted field OR fallback to status/aiAnalysis check
  const wasCommented =
    lead.commentPosted === true ||
    lead.status === "commented" ||
    !!(
      lead.aiAnalysis?.generatedComment &&
      lead.aiAnalysis.generatedComment.length > 10
    );

  // ── Comment Date ──
  const commentDate =
    wasCommented && lead.commentedAt
      ? new Date(lead.commentedAt).toISOString().split("T")[0]
      : wasCommented && lead.lastProcessedAt
        ? new Date(lead.lastProcessedAt).toISOString().split("T")[0]
        : "";

  // ── Comment Text ──
  // Use dedicated commentText field first, then fall back to aiAnalysis
  const commentText =
    lead.commentText || lead.aiAnalysis?.generatedComment || "";

  // ── Connection fields ──
  const connectionDate = lead.connectionSentAt
    ? new Date(lead.connectionSentAt).toISOString().split("T")[0]
    : "";

  const acceptedDate = lead.connectionAcceptedAt
    ? new Date(lead.connectionAcceptedAt).toISOString().split("T")[0]
    : "";

  // ── FIX 7: connectionStatus — handle ALL statuses ──
  const connectionSentStatuses = [
    "connection_sent",
    "connection_and_message_sent",
    "pending_acceptance",
    "accepted",
    "message_sent",
    "replied",
    "interested",
    "not_interested",
    "meeting_scheduled",
  ];

  const connectionSent = connectionSentStatuses.includes(lead.status);

  const acceptedStatuses = [
    "accepted",
    "message_sent",
    "replied",
    "interested",
    "not_interested",
    "meeting_scheduled",
  ];

  const pendingStatuses = [
    "connection_sent",
    "connection_and_message_sent",
    "pending_acceptance",
  ];

  const connectionStatus = acceptedStatuses.includes(lead.status)
    ? "accepted"
    : pendingStatuses.includes(lead.status)
      ? "pending"
      : "";

  // ── Warming ──
  const warmingDate = lead.messageSentAt
    ? new Date(lead.messageSentAt).toISOString().split("T")[0]
    : "";

  // ── FIX 2: InMail fields — were always hardcoded "No"/empty ──
  const inMailSent = lead.inMailSent === true ? "Yes" : "No";
  const inMailText = lead.inMailText || "";
  const inMailDate = lead.inMailSentAt
    ? new Date(lead.inMailSentAt).toISOString().split("T")[0]
    : "";

  // ── FIX 3: Reply fields ──
  // OLD BUG: totalReplies hardcoded to 0, lastReplyPreview hardcoded to ""
  const replied = [
    "replied",
    "interested",
    "not_interested",
    "meeting_scheduled",
  ].includes(lead.status);

  // firstReplyDate: use dedicated field first, then lastRepliedAt
  const firstReplyDate = lead.firstReplyDate
    ? new Date(lead.firstReplyDate).toISOString().split("T")[0]
    : lead.lastRepliedAt
      ? new Date(lead.lastRepliedAt).toISOString().split("T")[0]
      : "";

  // totalReplies: use dedicated field (was always 0 before)
  const totalReplies = lead.totalReplies || 0;

  // lastReplyPreview: use dedicated field (was always "" before)
  const lastReplyPreview = lead.lastReplyPreview || "";

  // ── FIX 4: AI fields ──
  // OLD BUG: read from aiAnalysis.interested which is for comment analysis
  // NEW: use dedicated aiInterestLevel/aiSentiment fields, fallback to aiAnalysis
  const aiInterestLevel =
    lead.aiInterestLevel || lead.aiAnalysis?.interested || "";

  const aiSentiment = lead.aiSentiment || lead.aiAnalysis?.sentiment || "";

  // ── FIX 5: Follow-up fields — were always hardcoded ──
  const followUpNeeded = lead.followUpNeeded ? "Yes" : "No";
  const followUp1Sent = lead.followUp1Sent ? "Yes" : "No";
  const followUp1Date = lead.followUp1Date
    ? new Date(lead.followUp1Date).toISOString().split("T")[0]
    : "";
  const followUp2Sent = lead.followUp2Sent ? "Yes" : "No";
  const followUp2Date = lead.followUp2Date
    ? new Date(lead.followUp2Date).toISOString().split("T")[0]
    : "";

  // ── FIX 6: Meeting Date — was always hardcoded empty ──
  const meetingScheduled =
    lead.meetingScheduled === true || lead.status === "meeting_scheduled"
      ? "Yes"
      : "No";

  const meetingDate = lead.meetingDate
    ? new Date(lead.meetingDate).toISOString().split("T")[0]
    : "";

  // ── Notes ── top 3 score matches
  let matchSummary = "";
  if (lead.aiAnalysis?.allScores) {
    matchSummary = Object.entries(lead.aiAnalysis.allScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, score]) => `${label}: ${score}%`)
      .join(" | ");
  } else if (lead.scoreReasons && lead.scoreReasons.length > 0) {
    matchSummary = lead.scoreReasons.join(" | ");
  }

  const lastUpdated = lead.updatedAt
    ? new Date(lead.updatedAt).toISOString()
    : nowIso;

  // ── Build row — exactly 46 columns ──
  const row = new Array(46).fill("");

  row[0] = dateDiscovered; // A  Date Discovered
  row[1] = lead.name || ""; // B  Name
  row[2] = lead.profileUrl || ""; // C  Profile URL
  row[3] = (lead.headline || lead.title || "").substring(0, 300);    // D  Headline
  row[4] = lead.location || ""; // E  Location
  row[5] = lead.email || ""; // F  Email
  row[6] = lead.phone || ""; // G  Phone
  row[7] = lead.website || ""; // H  Website
  row[8] = lead.conversionScore || 0; // I  Score (%)
  row[9] = lead.scoreCategory || ""; // J  Category
  row[10] = lead.searchKeyword || ""; // K  Keyword
  row[11] = lead.discoveredFrom || "post"; // L  Source
  row[12] = (lead.postContent || "").substring(0, 1000); // M  Post Content
  row[13] = lead.postUrl || ""; // N  Post URL
  row[14] = lead.postTime || ""; // O  Post Time
  row[15] = wasCommented ? "Yes" : "No"; // P  Comment Posted  ← BUG FIXED
  row[16] = commentText.substring(0, 500); // Q  Our Comment Text
  row[17] = commentDate; // R  Comment Date
  row[18] = connectionSent ? "Yes" : "No"; // S  Connection Sent
  row[19] = lead.connectionNote || ""; // T  Connection Note
  row[20] = connectionDate; // U  Connection Date
  row[21] = connectionStatus; // V  Connection Status ← BUG FIXED
  row[22] = acceptedDate; // W  Accepted Date
  row[23] = lead.warmingMessage ? "Yes" : "No"; // X  Warming Msg Sent
  row[24] = (lead.warmingMessage || "").substring(0, 500); // Y  Warming Msg Text
  row[25] = warmingDate; // Z  Warming Date
  row[26] = inMailSent; // AA InMail Sent      ← BUG FIXED
  row[27] = inMailText.substring(0, 500); // AB InMail Text      ← BUG FIXED
  row[28] = inMailDate; // AC InMail Date      ← BUG FIXED
  row[29] = replied ? "Yes" : "No"; // AD Replied
  row[30] = firstReplyDate; // AE First Reply Date ← BUG FIXED
  row[31] = totalReplies; // AF Total Replies    ← BUG FIXED
  row[32] = lastReplyPreview.substring(0, 200); // AG Last Reply Preview ← BUG FIXED
  row[33] = aiInterestLevel; // AH AI Interest Level ← BUG FIXED
  row[34] = aiSentiment; // AI AI Sentiment     ← BUG FIXED
  row[35] = followUpNeeded; // AJ Follow-up Needed ← BUG FIXED
  row[36] = followUp1Sent; // AK Follow-up 1 Sent ← BUG FIXED
  row[37] = followUp1Date; // AL Follow-up 1 Date ← BUG FIXED
  row[38] = followUp2Sent; // AM Follow-up 2 Sent ← BUG FIXED
  row[39] = followUp2Date; // AN Follow-up 2 Date ← BUG FIXED
  row[40] = lead.status || "discovered"; // AO Final Status
  row[41] = meetingScheduled; // AP Meeting Scheduled ← BUG FIXED
  row[42] = meetingDate; // AQ Meeting Date     ← BUG FIXED
  row[43] = matchSummary.substring(0, 500); // AR Notes
  row[44] = lead.accountId || "account_1"; // AS Account Used
  row[45] = lastUpdated; // AT Last Updated

  return row;
}

export async function findLeadRowByUrl(profileUrl) {
  const rows = await readSheet("Leads", "C:C");
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === profileUrl) {
      return i + 1;
    }
  }
  return null;
}

export async function updateLeadInSheet(profileUrl, updates) {
  const rowNum = await findLeadRowByUrl(profileUrl);
  if (!rowNum) {
    console.log(`   ⚠️  Lead not found in sheet: ${profileUrl}`);
    return false;
  }

  const rows = await readSheet("Leads", `A${rowNum}:AT${rowNum}`);
  if (!rows || rows.length === 0) return false;

  const currentRow = rows[0];
  while (currentRow.length < 46) currentRow.push("");

  const colMap = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    G: 6,
    H: 7,
    I: 8,
    J: 9,
    K: 10,
    L: 11,
    M: 12,
    N: 13,
    O: 14,
    P: 15,
    Q: 16,
    R: 17,
    S: 18,
    T: 19,
    U: 20,
    V: 21,
    W: 22,
    X: 23,
    Y: 24,
    Z: 25,
    AA: 26,
    AB: 27,
    AC: 28,
    AD: 29,
    AE: 30,
    AF: 31,
    AG: 32,
    AH: 33,
    AI: 34,
    AJ: 35,
    AK: 36,
    AL: 37,
    AM: 38,
    AN: 39,
    AO: 40,
    AP: 41,
    AQ: 42,
    AR: 43,
    AS: 44,
    AT: 45,
  };

  for (const [col, value] of Object.entries(updates)) {
    const idx = colMap[col.toUpperCase()];
    if (idx !== undefined && value !== undefined) {
      currentRow[idx] = value;
    }
  }

  return await writeSheet("Leads", `A${rowNum}:AT${rowNum}`, [currentRow]);
}
