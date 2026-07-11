import dotenv from "dotenv";
dotenv.config();

console.log({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKeyExists: !!process.env.GOOGLE_PRIVATE_KEY,
  privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length,
});
// Handle private key - convert literal \n to actual newlines
let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

// Remove wrapping quotes if present
privateKey = privateKey.replace(/^["']|["']$/g, "");

// Convert literal \n to real newlines
privateKey = privateKey.replace(/\\n/g, "\n");

export default {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || "",
  credentials: {
    client_email: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim(),
    private_key: privateKey,
  },
  sheets: {
    leads: "Leads",
    outreach: "Outreach Log",
    conversations: "Conversations",
    analytics: "Analytics",
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
};