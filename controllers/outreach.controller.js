import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { safeGoto, humanRefreshPage, closeMessagingOverlays } from "../services/browser/navigation.service.js";
import { detectProfileStatus } from "../services/linkedin/profile.service.js";
import { sendConnectionRequest } from "../services/linkedin/connection.service.js";
import { attemptSendMessage } from "../services/linkedin/message.service.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";
import config from "../config/config.js";

export async function smartOutreach(accountId, profileUrl, messageText, options = {}) {
  const {
    actuallySend = false,
    skipBusinessHours = false,
    connectionNote = "",
    subject = "",
  } = options;

  const account = config.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Account "${accountId}" not found`);

  if (!skipBusinessHours) {
    const hour = new Date().getHours();
    if (hour < config.businessHours.start || hour >= config.businessHours.end) {
      return { success: false, reason: "outside_business_hours" };
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`🚀 SMART OUTREACH — ${accountId}`);
  console.log(`📍 Target: ${profileUrl}`);
  console.log(`💬 Message: "${messageText.substring(0, 60)}..."`);
  console.log(`🔒 Send: ${actuallySend ? "YES" : "NO (safe mode)"}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  const { context, page } = await launchBrowser(accountId);
  let finalResult = { success: false };

  try {
    if (!(await checkSession(page))) {
      console.log(`\n❌ Session expired\n`);
      await closeBrowser(context);
      return { success: false, reason: "session_expired" };
    }

    console.log(`\n🌐 Navigating to profile...`);
    if (!(await safeGoto(page, profileUrl))) {
      await closeBrowser(context);
      return { success: false, reason: "profile_navigation_failed" };
    }

    await closeMessagingOverlays(page);
    await behaveLikeHuman(page);
    await randomDelay(2000, 3000);

    const status = await detectProfileStatus(page);

    // CASE 1: PENDING → SEND MESSAGE
    if (status.hasPending) {
      console.log(`\n⏳ Connection pending — trying InMail...`);

      if (!status.hasMessage) {
        finalResult = { success: false, reason: "pending_no_message", message: "Pending — no Message button" };
      } else {
        const msgResult = await attemptSendMessage(page, messageText, subject || "Quick hello", actuallySend, accountId);

        if (msgResult.success) {
          await humanRefreshPage(page);
          await behaveLikeHuman(page);
          finalResult = {
            success: true,
            action: msgResult.action,
            message: actuallySend ? "Pending — InMail sent" : "Pending — typed (safe mode)",
          };
        } else if (msgResult.reason === "premium_required_for_inmail") {
          finalResult = { success: false, reason: "pending_premium_required", message: "Premium required" };
        } else {
          finalResult = { success: false, reason: msgResult.reason, message: `Failed: ${msgResult.reason}` };
        }
      }
    }
    // CASE 2: 1ST DEGREE → MESSAGE
    else if (status.isFirstDegree && status.hasMessage) {
      console.log(`\n✅ 1st degree — messaging directly`);
      const msgResult = await attemptSendMessage(page, messageText, subject, actuallySend, accountId);

      if (msgResult.success) {
        await humanRefreshPage(page);
        await behaveLikeHuman(page);
        finalResult = { success: true, action: msgResult.action, message: actuallySend ? "Sent" : "Typed (safe mode)" };
      } else {
        finalResult = { success: false, reason: msgResult.reason, message: "Message failed" };
      }
    }
    // CASE 3: NOT CONNECTED → CONNECT + MESSAGE
    else if (status.hasConnect || status.hasMore) {
      console.log(`\n📨 Not connected — sending connection request`);
      const connResult = await sendConnectionRequest(page, connectionNote, profileUrl);

      if (connResult.success) {
        console.log(`\n✅ Connection sent! (Note: ${connResult.hadNote})`);

        if (await safeGoto(page, profileUrl)) {
          await closeMessagingOverlays(page);
          await behaveLikeHuman(page);
          await humanRefreshPage(page);
          await closeMessagingOverlays(page);
          await randomDelay(3000, 5000);

          const msgResult = await attemptSendMessage(page, messageText, subject || "Quick hello", actuallySend, accountId);

          if (msgResult.success) {
            await humanRefreshPage(page);
            await behaveLikeHuman(page);
            finalResult = { success: true, action: "connection_and_message_sent", message: "Connection + message sent" };
          } else if (msgResult.reason === "premium_required_for_inmail") {
            finalResult = { success: true, action: "connection_sent", message: "Connection sent (Premium needed for InMail)" };
          } else {
            finalResult = { success: true, action: "connection_sent", message: `Connection sent (message: ${msgResult.reason})` };
          }
        } else {
          finalResult = { success: true, action: "connection_sent", message: "Connection sent (nav failed for message)" };
        }
      } else {
        finalResult = { success: false, reason: connResult.reason, message: "Connection request failed" };
      }
    }
    // CASE 4: NO ACTIONS
    else {
      finalResult = { success: false, reason: "no_actions_available", message: "User disabled messaging/connections" };
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  FINAL RESULT                                              ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(`Status : ${finalResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Action : ${finalResult.action || finalResult.reason}`);
    console.log(`Info   : ${finalResult.message}\n`);

    await page.waitForTimeout(5000);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
    finalResult = { success: false, reason: "error", error: err.message };
    try { await page.screenshot({ path: `./debug/screenshots/error-${accountId}.png`, fullPage: true }); } catch {}
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }

  return finalResult;
}