import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { dismissPremiumModal } from "./premium.service.js";
import { safeGoto } from "../browser/navigation.service.js";

/**
 * Opens a specific conversation and sends a reply
 * Used for AI-generated replies to existing conversations
 */
export async function openConversationAndReply(page, leadName, replyText, actuallySend = false) {
  console.log(`\n💬 Opening conversation with: ${leadName}`);

  try {
    // Navigate to messaging
    await safeGoto(page, "https://www.linkedin.com/messaging/");
    await randomDelay(3000, 5000);

    // Find and click the conversation
    const clicked = await page.evaluate((name) => {
      const items = document.querySelectorAll(
        ".msg-conversation-listitem, .msg-conversation-card, li[data-view-name='conversation-list-item']"
      );

      for (const item of items) {
        const nameEl = item.querySelector(
          ".msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3 span"
        );
        if (nameEl) {
          const foundName = (nameEl.textContent || "").trim();
          if (foundName.toLowerCase().includes(name.toLowerCase())) {
            const rect = item.getBoundingClientRect();
            item.setAttribute("data-open-convo", "true");
            return {
              found: true,
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return { found: false };
    }, leadName);

    if (!clicked.found) {
      console.log(`   ❌ Conversation not found for: ${leadName}`);
      return { success: false, reason: "conversation_not_found" };
    }

    await humanClick(page, clicked.x, clicked.y);
    await randomDelay(3000, 5000);

    // Wait for composer
    console.log(`   ⏳ Waiting for composer...`);
    let composerReady = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const ready = await page.evaluate(() => {
        const el = document.querySelector(".msg-form__contenteditable");
        return el && el.getBoundingClientRect().width > 0;
      });
      if (ready) {
        composerReady = true;
        break;
      }
    }

    if (!composerReady) {
      await dismissPremiumModal(page);
      return { success: false, reason: "composer_not_ready" };
    }

    console.log(`   ✅ Composer ready`);

    // Click composer
    const composerCoords = await page.evaluate(() => {
      const el = document.querySelector(".msg-form__contenteditable");
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    if (!composerCoords) return { success: false, reason: "composer_coords_not_found" };

    await humanClick(page, composerCoords.x, composerCoords.y);
    await randomDelay(800, 1500);

    // Focus and clear
    await page.evaluate(() => {
      const el = document.querySelector(".msg-form__contenteditable");
      if (el) {
        el.focus();
        el.click();
      }
    });
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(400, 800);

    // Type the reply
    console.log(`   ⌨️  Typing reply (${replyText.length} chars)...`);
    await humanTypeText(page, replyText);
    await randomDelay(1500, 2500);

    if (!actuallySend) {
      console.log(`   ⚠️  Safe mode — typed but NOT sent`);
      return { success: true, action: "typed_only" };
    }

    // Find and click send
    const sendCoords = await page.evaluate(() => {
      const selectors = [
        "button.msg-form__send-btn",
        "button.msg-form__send-button",
        'button[aria-label="Send message"]',
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              disabled: btn.hasAttribute("disabled"),
            };
          }
        }
      }
      return null;
    });

    if (!sendCoords) return { success: false, reason: "send_button_not_found" };

    if (sendCoords.disabled) {
      // Trigger React
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await page.waitForTimeout(300);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }

    await humanClick(page, sendCoords.x, sendCoords.y);
    await randomDelay(3000, 5000);

    // Check for premium modal
    if (await dismissPremiumModal(page)) {
      return { success: false, reason: "premium_required" };
    }

    console.log(`   ✅ Reply SENT to ${leadName}`);
    return { success: true, action: "reply_sent" };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}