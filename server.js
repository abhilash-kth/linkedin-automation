import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./services/database/mongodb.service.js";

const app = express();
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Leads API (basic)
app.get("/api/leads", async (req, res) => {
  try {
    const { getLeadsByStatus } = await import("./services/database/lead-db.service.js");
    const leads = await getLeadsByStatus(req.query.status || null);
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 LinkedIn Automation API running on port ${PORT}\n`);
    });
  } catch (err) {
    console.error(`❌ Server start failed: ${err.message}`);
    // Server can still work without MongoDB for file-based operations
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT} (without MongoDB)\n`);
    });
  }
}

start();