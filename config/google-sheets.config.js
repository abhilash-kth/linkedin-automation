import dotenv from "dotenv";
dotenv.config();

export default {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || "",
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
  sheets: {
    leads: "Leads",
    outreach: "Outreach Log",
    conversations: "Conversations",
    analytics: "Analytics",
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
};