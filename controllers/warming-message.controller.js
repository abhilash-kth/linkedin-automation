import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { safeGoto, closeMessagingOverlays } from "../services/browser/navigation.service.js";
import { attemptSendMessage } from "../services/linkedin/message.service.js";
import { getAcceptedLeads, updateLeadStatus } from "../services/database/lead-db.service.js";
import { getOrCreateConversation, addMessage } from "../services/database/conversation.service.js";
import { callAI } from "../services/ai/claude.service.js";
import { getWarmingMessagePrompt } from "../config/prompts/warming-message.prompt.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";

const OUR_PRODUCT = "Groomics — an AI platform for the beauty & wellness industry.";

/**
 * Send warming messages to newly accepted connections
 */
export async function sendWarmingMessages(accountId, actuallySend = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  WARMING MESSAGES — ${accountId.padEnd(38)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    // Get accepted leads who haven't received warming message yet
    const leads = await getAcceptedLeads(accountId);
    const needsWarming = leads.filter(
      (l) => !l.warmingMessage || l.warmingMessage.trim().length === 0,
    );

    console.log(`📊 ${needsWarming.length} accepted leads need warming messages\n`);

    let sent = 0;

    for (let i = 0; i < needsWarming.length; i++) {
      const lead = needsWarming[i];
      console.log(`\n━━━ [${i + 1}/${needsWarming.length}] ${lead.name} ━━━`);

      // Generate warming message with AI
      console.log(`   🤖 Generating warming message...`);
      const prompt = getWarmingMessagePrompt(
        {
          name: lead.name,
          title: lead.title,
          company: lead.company,
          connectionNote: lead.connectionNote,
        },
        OUR_PRODUCT,
      );

      const aiResponse = await callAI(prompt, { maxTokens: 300, temperature: 0.8 });

      if (!aiResponse.success) {
        console.log(`   ⚠️  AI failed: ${aiResponse.reason}`);
        continue;
      }

      const warmingMsg = (aiResponse.text || "").trim();
      if (!warmingMsg || warmingMsg.length < 20) {
        console.log(`   ⚠️  AI returned empty/invalid message`);
        continue;
      }

      console.log(`   📝 Message: "${warmingMsg.substring(0, 80)}..."`);

      // Navigate to profile
      if (!(await safeGoto(page, lead.profileUrl))) continue;
      await closeMessagingOverlays(page);
      await behaveLikeHuman(page);

      // Send message
      const msgResult = await attemptSendMessage(page, warmingMsg, "", actuallySend, accountId);

      if (msgResult.success) {
        // Update lead
        await updateLeadStatus(lead.profileUrl, "message_sent", {
          warmingMessage: warmingMsg,
          messageSentAt: new Date(),
        });

        // Log in conversation
        try {
          const convo = await getOrCreateConversation(
            lead._id,
            lead.profileUrl,
            lead.name,
            accountId,
          );
          await addMessage(convo._id, "us", warmingMsg, true);
        } catch {}

        sent++;
        console.log(`   ✅ Warming message sent!`);
      } else {
        console.log(`   ❌ Failed: ${msgResult.reason}`);
      }

      // Human delay
      await randomDelay(30000, 90000); // 30s - 1.5min between messages
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  WARMING COMPLETE                                          ║`);
    console.log(`║  ✅ Sent: ${String(sent).padEnd(48)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}