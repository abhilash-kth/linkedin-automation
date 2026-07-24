import {
  launchBrowser,
  closeBrowser,
} from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { checkAcceptance } from "../services/linkedin/acceptance-checker.service.js";
import {
  getPendingAcceptanceLeads,
  updateLeadStatus,
} from "../services/database/lead-db.service.js";
import { updateLeadInSheet } from "../services/integrations/google-sheets.service.js";
import { attemptSendMessage } from "../services/linkedin/message.service.js";
import {
  safeGoto,
  closeMessagingOverlays,
} from "../services/browser/navigation.service.js";
import {
  behaveLikeHuman,
  randomDelay,
} from "../helpers/human-behavior.helper.js";
import { callAI } from "../services/ai/claude.service.js";
import { connectDB } from "../services/database/mongodb.service.js";

async function generateWarmMessage(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const prompt = `Write a warm LinkedIn message to ${firstName} who just accepted our connection request.

Person: ${firstName}, ${lead.title || "Professional"}
Their work context: ${(lead.postContent || "").substring(0, 200)}

Rules:
- Start with "Hi ${firstName}," or "Thanks for connecting, ${firstName}!"
- Reference their work in ONE sentence
- Ask ONE casual open-ended question about their work
- Under 200 characters
- Sound human and warm — NOT salesy
- Do NOT pitch services

Write ONLY the message. No prefixes.`;

  const result = await callAI(prompt, { maxTokens: 200, temperature: 0.8 });
  if (!result.success) return null;
  let msg = (result.text || "").trim().replace(/^["']|["']$/g, "");
  if (msg.length < 30 || msg.length > 280) return null;
  return msg;
}

export async function checkAllAcceptances(accountId, actuallySend = true) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  ACCEPTANCE CHECK + WARM MESSAGE — ${accountId.padEnd(21)}║`);
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();
  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    const leads = await getPendingAcceptanceLeads(accountId);
    console.log(
      `📊 Found ${leads.length} pending connection requests to check\n`,
    );

    let acceptedCount = 0;
    let warmSent = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      console.log(`\n━━━ [${i + 1}/${leads.length}] ${lead.name} ━━━`);

      const result = await checkAcceptance(page, lead.profileUrl);

      if (result.accepted) {
        acceptedCount++;
        console.log(`   🎉 ACCEPTED!`);

        // Update DB
        await updateLeadStatus(lead.profileUrl, "accepted", {
          connectionAcceptedAt: new Date(),
          connectionRetryAfter: null,
          connectionLimitHitAt: null,
        });

        // Update Sheet
        try {
          await updateLeadInSheet(lead.profileUrl, {
            V: "accepted",
            W: new Date().toISOString().split("T")[0],
            AO: "accepted",
          });
        } catch {}

        // ── Send warm message IMMEDIATELY (same session) ──
        if (actuallySend && !lead.warmingMessage) {
          console.log(`   🤖 Generating warm welcome message...`);
          const warmMsg = await generateWarmMessage(lead);

          if (warmMsg) {
            console.log(`   📝 Message: "${warmMsg.substring(0, 80)}..."`);

            // Navigate to profile to open message
            await randomDelay(2000, 4000);
            await closeMessagingOverlays(page);
            await behaveLikeHuman(page);

            const msgResult = await attemptSendMessage(
              page,
              warmMsg,
              "",
              true,
              accountId,
            );

            if (msgResult.success && msgResult.action === "message_sent") {
              warmSent++;
              console.log(`   ✅ Warm message sent!`);

              await updateLeadStatus(lead.profileUrl, "message_sent", {
                warmingMessage: warmMsg,
                messageSentAt: new Date(),
              });

              try {
                await updateLeadInSheet(lead.profileUrl, {
                  X: "Yes",
                  Y: warmMsg.substring(0, 300),
                  Z: new Date().toISOString().split("T")[0],
                  AO: "message_sent",
                });
              } catch {}
            } else {
              console.log(`   ⚠️  Warm message failed: ${msgResult.reason}`);
            }
          } else {
            console.log(`   ⚠️  Warm message generation failed`);
          }
        } else if (lead.warmingMessage) {
          console.log(`   ℹ️  Warm message already sent previously`);
        }
      } else {
        console.log(`   ⏳ Still pending (${result.reason})`);
      }

      // Human delay between profile checks
      await randomDelay(8000, 15000);
    }

    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  ACCEPTANCE CHECK COMPLETE                                 ║`,
    );
    console.log(`║  🎉 New acceptances: ${String(acceptedCount).padEnd(37)}║`);
    console.log(`║  💬 Warm messages sent: ${String(warmSent).padEnd(34)}║`);
    console.log(
      `║  ⏳ Still pending: ${String(leads.length - acceptedCount).padEnd(39)}║`,
    );
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
