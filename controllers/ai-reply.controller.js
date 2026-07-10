import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { scanInbox, getFullConversation } from "../services/linkedin/inbox.service.js";
import { openConversationAndReply } from "../services/linkedin/reply-sender.service.js";
import { analyzeReply } from "../services/ai/reply-analyzer.service.js";
import { generateReply } from "../services/ai/reply-generator.service.js";
import {
  getOrCreateConversation,
  addMessage,
  getConversationHistory,
} from "../services/database/conversation.service.js";
import { getLeadByUrl, updateLeadStatus } from "../services/database/lead-db.service.js";
import { randomDelay } from "../helpers/delay.helper.js";

export async function processAIReplies(accountId, actuallySend = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  AI REPLY PROCESSOR — ${accountId.padEnd(36)}║`);
  console.log(`║  Actually send: ${(actuallySend ? "YES" : "NO").padEnd(41)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    const { unread } = await scanInbox(page);

    if (unread.length === 0) {
      console.log(`📭 No unread messages to process\n`);
      return;
    }

    let processed = 0;
    let sent = 0;

    for (let i = 0; i < unread.length; i++) {
      const convo = unread[i];
      console.log(`\n━━━ [${i + 1}/${unread.length}] From: ${convo.name} ━━━`);

      try {
        const messages = await getFullConversation(page, convo.index);
        if (!messages || messages.length === 0) continue;

        const lastMessage = messages[messages.length - 1];
        console.log(`   💬 Last msg: "${lastMessage.substring(0, 100)}"`);

        // Store in conversation DB
        let leadDoc = null;
        try {
          leadDoc = await getLeadByUrl(`https://www.linkedin.com/in/${convo.name.replace(/\s/g, "").toLowerCase()}/`);
        } catch {}

        if (leadDoc) {
          const convoDoc = await getOrCreateConversation(
            leadDoc._id,
            leadDoc.profileUrl,
            leadDoc.name,
            accountId,
          );
          await addMessage(convoDoc._id, "them", lastMessage);
        }

        // Analyze reply
        const history = messages.join("\n\n");
        const leadInfo = { name: convo.name };
        const analysis = await analyzeReply(history, leadInfo);

        // If declining, skip
        if (analysis.isDeclining) {
          console.log(`   🛑 Lead declining — no reply`);
          if (leadDoc) await updateLeadStatus(leadDoc.profileUrl, "not_interested");
          continue;
        }

        // Generate reply
        const replyText = await generateReply(history, leadInfo, analysis);
        if (!replyText || replyText.length < 10) {
          console.log(`   ⚠️  Reply generation failed`);
          continue;
        }

        console.log(`   📝 Generated: "${replyText.substring(0, 80)}..."`);
        processed++;

        // Send reply on LinkedIn
        const sendResult = await openConversationAndReply(
          page,
          convo.name,
          replyText,
          actuallySend,
        );

        if (sendResult.success && actuallySend) {
          sent++;

          // Save AI reply to DB
          if (leadDoc) {
            const convoDoc = await getOrCreateConversation(
              leadDoc._id,
              leadDoc.profileUrl,
              leadDoc.name,
              accountId,
            );
            await addMessage(convoDoc._id, "us", replyText, true);

            // Update lead status based on analysis
            if (analysis.interested === "yes") {
              await updateLeadStatus(leadDoc.profileUrl, "interested");
            } else if (analysis.interested === "maybe") {
              await updateLeadStatus(leadDoc.profileUrl, "replied");
            }
          }

          console.log(`   ✅ Reply SENT to ${convo.name}`);
        } else if (sendResult.success) {
          console.log(`   ✅ Reply typed (safe mode)`);
        } else {
          console.log(`   ❌ Send failed: ${sendResult.reason}`);
        }

        // Human delay
        await randomDelay(30000, 90000);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  AI REPLIES COMPLETE                                       ║`);
    console.log(`║  🤖 Processed: ${String(processed).padEnd(43)}║`);
    console.log(`║  ✅ Sent: ${String(sent).padEnd(48)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}