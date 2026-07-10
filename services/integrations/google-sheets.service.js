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

//   sheetsClient = google.sheets({ version: "v4", auth });
//   return sheetsClient;
// }

async function getClient() {
  if (sheetsClient) return sheetsClient;

  if (
    !sheetsConfig.credentials.client_email ||
    !sheetsConfig.credentials.private_key
  ) {
    console.log("⚠️ Google Sheets credentials not configured");
    return null;
  }

  const auth = new google.auth.JWT({
    email: sheetsConfig.credentials.client_email,
    key: sheetsConfig.credentials.private_key,
    scopes: sheetsConfig.scopes,
  });

  try {
    await auth.getAccessToken();
    console.log("✅ Google JWT authenticated");
  } catch (err) {
    console.error("❌ JWT Authentication Failed");
    console.error(err);
    return null;
  }

  sheetsClient = google.sheets({
    version: "v4",
    auth,
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

export async function updateSheetRow(sheetName, row, values) {
  return await writeSheet(sheetName, `A${row}:Z${row}`, [values]);
}