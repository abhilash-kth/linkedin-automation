// Runs on GitHub Actions — Backup MongoDB to JSON
import { connectDB, disconnectDB } from "../services/database/mongodb.service.js";
import Lead from "../models/Lead.model.js";
import Conversation from "../models/Conversation.model.js";
import Post from "../models/Post.model.js";
import { writeFile, mkdir } from "fs/promises";

async function main() {
  console.log(`\n💾 MONGODB BACKUP JOB — ${new Date().toISOString()}\n`);

  await connectDB();

  await mkdir("./backups", { recursive: true });
  const timestamp = new Date().toISOString().split("T")[0];

  // Backup Leads
  const leads = await Lead.find({}).lean();
  await writeFile(
    `./backups/leads-${timestamp}.json`,
    JSON.stringify(leads, null, 2),
  );
  console.log(`   ✅ Backed up ${leads.length} leads`);

  // Backup Conversations
  const convos = await Conversation.find({}).lean();
  await writeFile(
    `./backups/conversations-${timestamp}.json`,
    JSON.stringify(convos, null, 2),
  );
  console.log(`   ✅ Backed up ${convos.length} conversations`);

  // Backup Posts
  const posts = await Post.find({}).lean();
  await writeFile(
    `./backups/posts-${timestamp}.json`,
    JSON.stringify(posts, null, 2),
  );
  console.log(`   ✅ Backed up ${posts.length} posts`);

  console.log(`\n✅ Backup complete: ./backups/*-${timestamp}.json\n`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Fatal: ${err.message}`);
  process.exit(1);
});