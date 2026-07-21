import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import {
  dismissPremiumModal,
  detectPremiumModalType,
} from "./premium.service.js";
import { safeGoto } from "../browser/navigation.service.js";

/**
 * Reply to a SPECIFIC conversation using its inbox index
 * This ensures we reply to the CORRECT thread, not any random one matching the name
 *
 * The convoIndex is set by scanInbox() as data-inbox-index attribute
 */
export async function replyToConversationByIndex(
  page,
  convoIndex,
  replyText,
  actuallySend = false,
) {
  console.log(`\n💬 Opening conversation at index ${convoIndex}`);

  try {
    // First ensure we're on the messaging page
    const currentUrl = page.url();
    if (!currentUrl.includes("/messaging")) {
      await safeGoto(page, "https://www.linkedin.com/messaging/");
      await randomDelay(3000, 5000);

      // Re-scan inbox to re-tag conversations (needed because URL changed)
      await page.evaluate(() => {
        const selectors = [
          ".msg-conversation-listitem",
          ".msg-conversation-card",
          'li[data-view-name="conversation-list-item"]',
        ];
        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          if (items.length > 0) break;
        }
        items.forEach((item, index) => {
          item.setAttribute("data-inbox-index", String(index));
        });
      });
      await randomDelay(1000, 2000);
    }

    // Find the specific conversation by index
    const convoInfo = await page.evaluate((idx) => {
      const item = document.querySelector(`[data-inbox-index="${idx}"]`);
      if (!item) return { found: false };

      const rect = item.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { found: false };

      // Get name for verification
      let name = "";
      const nameEl = item.querySelector(
        ".msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3 span",
      );
      if (nameEl) name = (nameEl.textContent || "").trim();

      item.scrollIntoView({ block: "center", behavior: "smooth" });

      return {
        found: true,
        name,
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    }, convoIndex);

    if (!convoInfo.found) {
      console.log(`   ❌ Conversation at index ${convoIndex} not found`);
      return { success: false, reason: "conversation_not_found" };
    }

    console.log(`   ✅ Found conversation: ${convoInfo.name}`);
    await randomDelay(1500, 2500);

    // Refresh coords after scroll
    const freshCoords = await page.evaluate((idx) => {
      const item = document.querySelector(`[data-inbox-index="${idx}"]`);
      if (!item) return null;
      const rect = item.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    }, convoIndex);

    const clickCoords = freshCoords || convoInfo;

    console.log(
      `   🖱️  Clicking conversation at (${clickCoords.x}, ${clickCoords.y})...`,
    );
    await humanMove(page, clickCoords.x, clickCoords.y);
    await randomDelay(400, 800);
    await humanClick(page, clickCoords.x, clickCoords.y);
    await randomDelay(3000, 5000);

    // ═══ Wait for composer ═══
    console.log(`   ⏳ Waiting for message composer...`);
    let composerReady = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const ready = await page.evaluate(() => {
        const el = document.querySelector(".msg-form__contenteditable");
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 30 && rect.height > 15;
      });
      if (ready) {
        composerReady = true;
        break;
      }
    }

    if (!composerReady) {
      const modalType = await detectPremiumModalType(page);
      if (modalType === "inmail_limit" || modalType === "generic") {
        console.log(`   💎 Premium block during composer wait (${modalType})`);
        await dismissPremiumModal(page);
        return { success: false, reason: "premium_required" };
      }
      return { success: false, reason: "composer_not_ready" };
    }

    console.log(`   ✅ Composer ready`);

    // ═══ Verify we opened the RIGHT conversation ═══
    const openedConvoInfo = await page.evaluate(() => {
      // Get header name of currently open conversation
      const headerName =
        document
          .querySelector(".msg-thread__link-to-profile")
          ?.textContent?.trim() ||
        document.querySelector(".msg-title-bar__title")?.textContent?.trim() ||
        document
          .querySelector("h2.msg-entity-lockup__entity-title")
          ?.textContent?.trim() ||
        "";
      return { headerName };
    });

    console.log(
      `   🔍 Opened conversation with: "${openedConvoInfo.headerName}"`,
    );

    // Verify name matches expected
    if (openedConvoInfo.headerName && convoInfo.name) {
      const openedFirstName = openedConvoInfo.headerName
        .split(" ")[0]
        .toLowerCase();
      const expectedFirstName = convoInfo.name.split(" ")[0].toLowerCase();
      if (
        !openedFirstName.includes(expectedFirstName) &&
        !expectedFirstName.includes(openedFirstName)
      ) {
        console.log(
          `   ⚠️  WARNING: Opened conversation with different person!`,
        );
        console.log(`      Expected: ${convoInfo.name}`);
        console.log(`      Opened: ${openedConvoInfo.headerName}`);
        return { success: false, reason: "wrong_conversation_opened" };
      }
    }

    // ═══ Click composer + type ═══
    const composerCoords = await page.evaluate(() => {
      const el = document.querySelector(".msg-form__contenteditable");
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    if (!composerCoords)
      return { success: false, reason: "composer_coords_not_found" };

    await humanClick(page, composerCoords.x, composerCoords.y);
    await randomDelay(800, 1500);

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

    console.log(`   ⌨️  Typing reply (${replyText.length} chars)...`);
    await humanTypeText(page, replyText);
    await randomDelay(1500, 2500);

    if (!actuallySend) {
      console.log(`   ⚠️  Safe mode — typed but NOT sent`);
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      return { success: true, action: "typed_only" };
    }

    // ═══ Find and click send button ═══
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
      // Trigger React state update
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await page.waitForTimeout(300);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }

    await humanClick(page, sendCoords.x, sendCoords.y);
    await randomDelay(3000, 5000);

    // Import at top: import { detectPremiumModalType, dismissPremiumModal } from "./premium.service.js";
    // (Update your existing import statement)

    // Only fail if it's ACTUALLY a premium block (not "Verify" popup or other benign dialogs)
    const modalType = await detectPremiumModalType(page);
    if (modalType === "inmail_limit" || modalType === "notes_limit") {
      console.log(`   💎 Premium block detected (${modalType}) — dismissing`);
      await dismissPremiumModal(page);
      return { success: false, reason: "premium_required" };
    }

    // Dismiss any other benign dialog that might have appeared (verify popup, etc.)
    if (modalType === "generic") {
      console.log(`   ℹ️  Non-critical dialog detected — dismissing`);
      await dismissPremiumModal(page);
    }

    // Verify message actually sent by checking composer is now empty
    const composerCleared = await page.evaluate(() => {
      const el = document.querySelector(".msg-form__contenteditable");
      if (!el) return true;
      const text = (el.textContent || "").trim();
      return text.length === 0;
    });

    if (!composerCleared) {
      console.log(`   ⚠️  Composer still has text — send may have failed`);
      return { success: false, reason: "composer_not_cleared" };
    }

    console.log(`   ✅ Reply SENT`);
    return { success: true, action: "reply_sent" };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}

/**
 * LEGACY: Open by name — kept for backward compatibility
 * Only use for manual outreach, NOT for AI replies (name-matching is unreliable)
 */
export async function openConversationAndReply(
  page,
  leadName,
  replyText,
  actuallySend = false,
) {
  console.log(`\n⚠️  Using legacy name-based reply for ${leadName}`);

  try {
    await safeGoto(page, "https://www.linkedin.com/messaging/");
    await randomDelay(3000, 5000);

    const clicked = await page.evaluate((name) => {
      const items = document.querySelectorAll(
        ".msg-conversation-listitem, .msg-conversation-card",
      );
      for (const item of items) {
        const nameEl = item.querySelector(
          ".msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3 span",
        );
        if (nameEl) {
          const foundName = (nameEl.textContent || "").trim();
          if (foundName.toLowerCase().includes(name.toLowerCase())) {
            const rect = item.getBoundingClientRect();
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

    if (!clicked.found)
      return { success: false, reason: "conversation_not_found" };

    await humanClick(page, clicked.x, clicked.y);
    await randomDelay(3000, 5000);

    // Rest is same as replyToConversationByIndex — but with less safety
    // Keeping for legacy but recommend using replyToConversationByIndex
    return { success: false, reason: "use_replyToConversationByIndex_instead" };
  } catch (err) {
    return { success: false, reason: "error", error: err.message };
  }
}
