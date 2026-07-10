// Runs on GitHub Actions — Generates daily report
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import Conversation from "../models/Conversation.model.js";
import { appendToSheet } from "../services/integrations/google-sheets.service.js";

async function main() {
  console.log(`\n📈 DAILY REPORT JOB — ${new Date().toISOString()}\n`);

  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = {
    date: today.toISOString().split("T")[0],
    newLeads: await Lead.countDocuments({ createdAt: { $gte: today } }),
    connectionsSent: await Lead.countDocuments({
      connectionSentAt: { $gte: today },
    }),
    messagesSent: await Lead.countDocuments({
      messageSentAt: { $gte: today },
    }),
    acceptances: await Lead.countDocuments({
      connectionAcceptedAt: { $gte: today },
    }),
    replies: await Lead.countDocuments({
      lastRepliedAt: { $gte: today },
    }),
    interested: await Lead.countDocuments({ status: "interested" }),
    meetings: await Lead.countDocuments({ status: "meeting_scheduled" }),
    totalLeads: await Lead.countDocuments({}),
    hotLeads: await Lead.countDocuments({ scoreCategory: "hot" }),
    warmLeads: await Lead.countDocuments({ scoreCategory: "warm" }),
  };

  console.log(`\n📊 DAILY STATS — ${stats.date}`);
  console.log(`   New leads discovered: ${stats.newLeads}`);
  console.log(`   Connections sent: ${stats.connectionsSent}`);
  console.log(`   Messages sent: ${stats.messagesSent}`);
  console.log(`   Acceptances today: ${stats.acceptances}`);
  console.log(`   Replies today: ${stats.replies}`);
  console.log(`   Interested leads: ${stats.interested}`);
  console.log(`   Meetings scheduled: ${stats.meetings}`);
  console.log(`   Hot leads: ${stats.hotLeads}`);
  console.log(`   Warm leads: ${stats.warmLeads}`);
  console.log(`   Total leads: ${stats.totalLeads}\n`);

  // Append to Analytics sheet
  await appendToSheet("Analytics", [
    [
      stats.date,
      stats.newLeads,
      stats.connectionsSent,
      stats.messagesSent,
      stats.acceptances,
      stats.replies,
      stats.interested,
      stats.meetings,
      stats.totalLeads,
      stats.hotLeads,
      stats.warmLeads,
    ],
  ]);

  console.log(`✅ Report saved to Google Sheets\n`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});