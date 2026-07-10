// Runs on GitHub Actions — Analyzes new replies with AI
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Conversation from "../models/Conversation.model.js";
import { analyzeReply } from "../services/ai/reply-analyzer.service.js";
import { generateReply } from "../services/ai/reply-generator.service.js";

async function main() {
  console.log(`\n🧠 AI REPLY ANALYSIS JOB — ${new Date().toISOString()}\n`);

  await connectDB();

  // Find conversations where THEIR last message is newer than OUR last message
  const convos = await Conversation.find({
    lastTheirMessageAt: { $exists: true },
  }).limit(30);

  const needsReply = convos.filter((c) => {
    if (!c.lastOurMessageAt) return true;
    return new Date(c.lastTheirMessageAt) > new Date(c.lastOurMessageAt);
  });

  console.log(`📊 Found ${needsReply.length} conversations needing analysis\n`);

  let analyzed = 0;

  for (const convo of needsReply) {
    try {
      const history = convo.messages
        .map((m) => `${m.sender === "us" ? "Us" : "Them"}: ${m.text}`)
        .join("\n\n");

      const leadInfo = { name: convo.leadName };

      // Analyze
      const analysis = await analyzeReply(history, leadInfo);
      convo.lastAnalysis = analysis;
      convo.interested = analysis.interested;
      convo.sentiment = analysis.sentiment;

      // Generate reply draft (stored in DB, sent later by PC)
      if (!analysis.isDeclining) {
        const replyText = await generateReply(history, leadInfo, analysis);
        if (replyText) {
          // Store as a pending message
          convo.messages.push({
            sender: "us",
            text: replyText,
            timestamp: new Date(),
            isAIGenerated: true,
            aiModel: "openrouter",
          });
          convo.status = "replied"; // Will be picked up by PC to send
        }
      }

      await convo.save();
      analyzed++;

      console.log(`   ✅ ${convo.leadName}: ${analysis.interested} / ${analysis.sentiment}`);

      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`   ❌ ${convo.leadName}: ${err.message}`);
    }
  }

  console.log(`\n✅ Analyzed ${analyzed}/${needsReply.length} conversations\n`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});