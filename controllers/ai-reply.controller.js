import {
  launchBrowser,
  closeBrowser,
} from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import {
  scanInbox,
  getFullConversation,
  getLastMessageSender,
} from "../services/linkedin/inbox.service.js";
import { replyToConversationByIndex } from "../services/linkedin/reply-sender.service.js";
import { analyzeReply } from "../services/ai/reply-analyzer.service.js";
import { generateReply } from "../services/ai/reply-generator.service.js";
import {
  getOrCreateConversation,
  addMessage,
} from "../services/database/conversation.service.js";
import { updateLeadStatus } from "../services/database/lead-db.service.js";
import { updateLeadInSheet } from "../services/integrations/google-sheets.service.js";
import { connectDB } from "../services/database/mongodb.service.js";
import { randomDelay } from "../helpers/delay.helper.js";
import Lead from "../models/Lead.model.js";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const MAX_REPLIES_PER_RUN = 5;

// Statuses that PROVE we've engaged (they can now reply)
const ENGAGED_STATUSES = [
  "message_sent",
  "connection_and_message_sent",
  "accepted",
  "replied",
  "interested",
];

// Statuses where THEIR reply means they accepted (auto-upgrade)
const AUTO_UPGRADE_STATUSES = [
  "connection_sent",
  "pending_acceptance",
  "commented",
  "discovered",
];

// Statuses that mean STOP replying
const BLOCKED_STATUSES = ["not_interested"];

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════
export async function processAIReplies(accountId, actuallySend = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  AI REPLY PROCESSOR — ${accountId.padEnd(36)}║`);
  console.log(
    `║  Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();

  const { context, page } = await launchBrowser(accountId);

  const stats = {
    scanned: 0,
    needsReply: 0,
    analyzed: 0,
    replied: 0,
    skipped: 0,
    failed: 0,
    notInterested: 0,
    noLeadMatch: 0,
    invalidStatus: 0,
    autoUpgraded: 0,
  };

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    const { all } = await scanInbox(page);
    stats.scanned = all.length;

    if (all.length === 0) {
      console.log(`\n📭 No conversations in inbox\n`);
      return;
    }

    console.log(`\n📊 Analyzing ${all.length} conversations...\n`);

    const needingReply = [];
    const processedThreads = new Set();
    const processedPersons = new Set();

    for (let i = 0; i < all.length; i++) {
      const convo = all[i];

      if (needingReply.length >= MAX_REPLIES_PER_RUN * 2) {
        console.log(`   ℹ️  Reached scan cap — moving to reply phase`);
        break;
      }

      console.log(
        `\n─── [${i + 1}/${all.length}] ${convo.name} ${convo.unread ? "🔴 UNREAD" : ""}`,
      );
      console.log(`   Preview: "${convo.preview.substring(0, 60)}..."`);

      try {
        const messages = await getFullConversation(page, convo.index);
        if (!messages || messages.length === 0) {
          console.log(`   ⚠️  No messages loaded`);
          continue;
        }

        console.log(`   💬 Loaded ${messages.length} messages`);

        const lastSender = getLastMessageSender(messages);
        const lastMsg = messages[messages.length - 1];

        console.log(`   📝 Last from: ${lastSender === "us" ? "US" : "THEM"}`);
        console.log(`   📝 Last text: "${lastMsg.text.substring(0, 80)}..."`);

        const leadDoc = await findLeadByName(convo.name, accountId);

        if (leadDoc) {
          console.log(
            `   ✅ Matched lead: ${leadDoc.name} (${leadDoc.status})`,
          );
          await syncConversationMessages(
            leadDoc,
            accountId,
            convo.name,
            messages,
          );
        } else {
          console.log(`   ⚠️  No lead in DB — skip`);
          stats.noLeadMatch++;
          continue;
        }

        if (lastSender !== "them") {
          console.log(`   ✅ Already replied — skip`);
          continue;
        }

        const threadKey = convo.threadId || leadDoc.profileUrl;
        const personKey = leadDoc.profileUrl;

        if (processedThreads.has(threadKey)) {
          console.log(`   ⚠️  Already queued this thread — skip`);
          continue;
        }
        if (processedPersons.has(personKey)) {
          console.log(
            `   ⚠️  Already queued for ${convo.name} — skip duplicate thread`,
          );
          continue;
        }

        processedThreads.add(threadKey);
        processedPersons.add(personKey);

        needingReply.push({
          convo,
          messages,
          lead: leadDoc,
          lastMessage: lastMsg,
          convoIndex: convo.index,
          threadId: convo.threadId,
        });
        stats.needsReply++;
        console.log(
          `   🎯 NEEDS REPLY (thread: ${(convo.threadId || "unknown").substring(0, 20)})`,
        );

        await randomDelay(2000, 4000);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log(
      `\n\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  Found ${needingReply.length} conversations needing reply${" ".repeat(20)}║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝`,
    );

    if (needingReply.length === 0) {
      console.log(`\n✅ All caught up\n`);
      return;
    }

    const toReply = needingReply.slice(0, MAX_REPLIES_PER_RUN);
    console.log(`\n📤 Processing ${toReply.length} replies\n`);

    for (let i = 0; i < toReply.length; i++) {
      const { convo, messages, lead, lastMessage, convoIndex, threadId } =
        toReply[i];

      console.log(`\n${"━".repeat(63)}`);
      console.log(`[${i + 1}/${toReply.length}] Reply to: ${convo.name}`);
      console.log(`   Convo Index: ${convoIndex}`);
      console.log(`   Thread ID: ${(threadId || "unknown").substring(0, 30)}`);
      console.log(`   Lead Status: ${lead.status}`);
      console.log(`${"━".repeat(63)}`);

      try {
        // ═══ SMART STATUS VALIDATION ═══

        // 1. If lead said "not interested" — respect it
        if (BLOCKED_STATUSES.includes(lead.status)) {
          console.log(
            `   🛑 Lead status "${lead.status}" — respecting their decline`,
          );
          stats.invalidStatus++;
          continue;
        }

        // 2. If status suggests we haven't engaged (e.g., connection_sent, discovered),
        //    but they DID reply → they must have accepted. Auto-upgrade.
        if (AUTO_UPGRADE_STATUSES.includes(lead.status)) {
          console.log(
            `   🔄 Auto-upgrading status: "${lead.status}" → "accepted"`,
          );
          console.log(
            `      Reason: They replied to us, which proves they accepted`,
          );

          await updateLeadStatus(lead.profileUrl, "accepted", {
            connectionAcceptedAt: new Date(),
          });
          try {
            await updateLeadInSheet(lead.profileUrl, {
              V: "accepted",
              W: new Date().toISOString().split("T")[0],
              AO: "accepted",
            });
          } catch {}

          // Update in-memory so we continue processing
          lead.status = "accepted";
          stats.autoUpgraded++;
        }

        // 3. Now check if we can proceed
        if (!ENGAGED_STATUSES.includes(lead.status)) {
          console.log(
            `   ⚠️  Lead status "${lead.status}" — not eligible for AI reply, skip`,
          );
          stats.invalidStatus++;
          continue;
        }

        // ═══ BUILD conversation history ═══
        const history = messages
          .map((m) => `${m.sender === "us" ? "Us" : "Them"}: ${m.text}`)
          .join("\n\n");

        const leadInfo = {
          name: convo.name,
          title: lead.title || "",
          company: lead.company || "",
        };

        // ═══ ANALYZE ═══
        console.log(`\n🧠 Analyzing conversation with AI...`);
        const analysis = await analyzeReply(history, leadInfo);
        stats.analyzed++;

        console.log(`   📊 Analysis:`);
        console.log(`      Interested: ${analysis.interested}`);
        console.log(`      Sentiment: ${analysis.sentiment}`);
        console.log(`      Declining: ${analysis.isDeclining}`);
        console.log(`      Has Question: ${analysis.hasQuestion}`);
        console.log(`      Wants Info: ${analysis.wantsMoreInfo}`);

        // ═══ Handle DECLINE ═══
        if (analysis.isDeclining) {
          console.log(`   🛑 Lead is declining — NOT replying`);
          await updateLeadStatus(lead.profileUrl, "not_interested", {
            lastRepliedAt: new Date(),
          });
          try {
            await updateLeadInSheet(lead.profileUrl, {
              AH: "no",
              AI: "negative",
              AO: "not_interested",
              AG: lastMessage.text.substring(0, 200),
            });
          } catch {}
          stats.notInterested++;
          continue;
        }

        // ═══ Update analysis in DB ═══
        // await updateLeadStatus(lead.profileUrl, lead.status, {
        //   aiAnalysis: {
        //     ...(lead.aiAnalysis || {}),
        //     interested: analysis.interested,
        //     sentiment: analysis.sentiment,
        //     lastAnalyzedAt: new Date(),
        //   },
        // });
        const replyDate = new Date();
        const isFirstReply = !lead.lastRepliedAt && !lead.firstReplyDate;

        await updateLeadStatus(lead.profileUrl, lead.status, {
          // Dedicated fields (not buried in aiAnalysis mixed type)
          aiInterestLevel: analysis.interested, // NEW dedicated field
          aiSentiment: analysis.sentiment, // NEW dedicated field
          lastRepliedAt: replyDate,
          firstReplyDate: isFirstReply ? replyDate : lead.firstReplyDate,
          totalReplies: (lead.totalReplies || 0) + 1, // increment count
          lastReplyPreview: lastMessage.text.substring(0, 200), // save preview
          aiAnalysis: {
            ...(lead.aiAnalysis || {}),
            interested: analysis.interested,
            sentiment: analysis.sentiment,
            lastAnalyzedAt: replyDate,
          },
        });

        try {
          await updateLeadInSheet(lead.profileUrl, {
            AD: "Yes",
            AE: isFirstReply
              ? replyDate.toISOString().split("T")[0]
              : undefined,
            AF: String((lead.totalReplies || 0) + 1), // Total Replies count
            AG: lastMessage.text.substring(0, 200), // Last Reply Preview
            AH: analysis.interested, // AI Interest Level
            AI: analysis.sentiment, // AI Sentiment
            AT: replyDate.toISOString(), // Last Updated
          });
        } catch {}
        try {
          await updateLeadInSheet(lead.profileUrl, {
            AD: "Yes",
            AE: lead.lastRepliedAt
              ? undefined
              : new Date().toISOString().split("T")[0],
            AG: lastMessage.text.substring(0, 200),
            AH: analysis.interested,
            AI: analysis.sentiment,
          });
        } catch {}

        // ═══ GENERATE reply ═══
        console.log(`\n✍️  Generating AI reply...`);
        const replyText = await generateReply(history, leadInfo, analysis);

        if (!replyText || replyText.length < 20) {
          console.log(`   ⚠️  Reply generation failed`);
          stats.failed++;
          continue;
        }

        console.log(`   📝 Reply: "${replyText.substring(0, 100)}..."`);

        if (!actuallySend) {
          console.log(`   ⚠️  Safe mode — NOT sending`);
          stats.skipped++;
          continue;
        }

        // ═══ SEND reply ═══
        console.log(
          `\n📨 Sending reply to conversation index ${convoIndex}...`,
        );
        const sendResult = await replyToConversationByIndex(
          page,
          convoIndex,
          replyText,
          true,
        );

        if (sendResult.success && sendResult.action === "reply_sent") {
          stats.replied++;
          console.log(`   ✅ Reply SENT to ${convo.name}`);

          const convoDoc = await getOrCreateConversation(
            lead._id,
            lead.profileUrl,
            lead.name,
            accountId,
          );
          await addMessage(convoDoc._id, "us", replyText, true);

          if (analysis.interested === "yes") {
            await updateLeadStatus(lead.profileUrl, "interested");
            try {
              await updateLeadInSheet(lead.profileUrl, {
                AO: "interested",
                AJ: "Yes",
              });
            } catch {}
          } else if (analysis.interested === "maybe") {
            await updateLeadStatus(lead.profileUrl, "replied");
            try {
              await updateLeadInSheet(lead.profileUrl, { AO: "replied" });
            } catch {}
          }

          console.log(`   💾 Saved reply to conversation history`);
        } else {
          console.log(`   ❌ Send failed: ${sendResult.reason}`);
          stats.failed++;
        }

        if (i < toReply.length - 1) {
          const cooldown = 60000 + Math.floor(Math.random() * 120000);
          console.log(
            `\n⏰ Cooling ${Math.floor(cooldown / 1000)}s before next reply...`,
          );
          await new Promise((r) => setTimeout(r, cooldown));
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        stats.failed++;
      }
    }

    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  AI REPLY PROCESSOR COMPLETE                               ║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  📥 Conversations scanned: ${String(stats.scanned).padEnd(31)}║`,
    );
    console.log(`║  🎯 Needing reply: ${String(stats.needsReply).padEnd(39)}║`);
    console.log(
      `║  🔄 Auto-upgraded status: ${String(stats.autoUpgraded).padEnd(32)}║`,
    );
    console.log(`║  🧠 Analyzed: ${String(stats.analyzed).padEnd(44)}║`);
    console.log(`║  ✅ Replies sent: ${String(stats.replied).padEnd(40)}║`);
    console.log(
      `║  🛑 Not interested: ${String(stats.notInterested).padEnd(38)}║`,
    );
    console.log(`║  ⏭️  Skipped: ${String(stats.skipped).padEnd(44)}║`);
    console.log(
      `║  🚫 No lead match: ${String(stats.noLeadMatch).padEnd(39)}║`,
    );
    console.log(
      `║  ⚠️  Invalid status: ${String(stats.invalidStatus).padEnd(37)}║`,
    );
    console.log(`║  ❌ Failed: ${String(stats.failed).padEnd(47)}║`);
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`,
    );
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
    console.error(err.stack);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
async function findLeadByName(inboxName, accountId) {
  await connectDB();

  let lead = await Lead.findOne({ name: inboxName, accountId });
  if (lead) return lead;

  lead = await Lead.findOne({
    name: { $regex: `^${escapeRegex(inboxName)}$`, $options: "i" },
    accountId,
  });
  if (lead) return lead;

  const parts = inboxName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    if (firstName.length >= 3 && lastName.length >= 3) {
      lead = await Lead.findOne({
        name: {
          $regex: `${escapeRegex(firstName)}.*${escapeRegex(lastName)}`,
          $options: "i",
        },
        accountId,
      });
      if (lead) return lead;
    }
  }

  const firstName = inboxName.split(" ")[0];
  if (firstName && firstName.length >= 3) {
    lead = await Lead.findOne({
      name: { $regex: `^${escapeRegex(firstName)}`, $options: "i" },
      accountId,
    });
  }

  return lead;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function syncConversationMessages(
  lead,
  accountId,
  leadName,
  inboxMessages,
) {
  if (!lead || !inboxMessages || inboxMessages.length === 0) return;

  const convo = await getOrCreateConversation(
    lead._id,
    lead.profileUrl,
    leadName,
    accountId,
  );

  const existingTexts = new Set(convo.messages.map((m) => m.text.trim()));
  let added = 0;
  for (const msg of inboxMessages) {
    const cleanText = msg.text.trim();
    if (existingTexts.has(cleanText)) continue;
    await addMessage(convo._id, msg.sender, cleanText, false);
    added++;
  }

  if (added > 0) {
    console.log(`   💾 Synced ${added} new messages to conversation history`);
  }
}
