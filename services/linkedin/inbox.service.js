import { randomDelay } from "../../helpers/delay.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

export async function scanInbox(page) {
  console.log(`\n🔍 Scanning inbox...`);

  await page.goto("https://www.linkedin.com/messaging/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await randomDelay(4000, 6000);
  await behaveLikeHuman(page);

  const conversations = await page.evaluate(() => {
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

    const results = [];
    items.forEach((item, index) => {
      const nameSelectors = [
        ".msg-conversation-listitem__participant-names",
        ".msg-conversation-card__participant-names",
        "h3 span",
      ];

      let name = "";
      for (const sel of nameSelectors) {
        const el = item.querySelector(sel);
        if (el) {
          name = (el.textContent || "").trim();
          if (name) break;
        }
      }

      const previewSelectors = [
        ".msg-conversation-card__message-snippet",
        ".msg-conversation-listitem__message-snippet",
      ];

      let preview = "";
      for (const sel of previewSelectors) {
        const el = item.querySelector(sel);
        if (el) {
          preview = (el.textContent || "").trim();
          if (preview) break;
        }
      }

      const isUnread =
        item.classList.contains("msg-conversation-listitem--unread") ||
        item.classList.contains("msg-conversation-card--unread") ||
        item.querySelector(".notification-badge--show") !== null;

      const timeEl = item.querySelector("time");
      const time = timeEl ? timeEl.textContent.trim() : "";

      if (name) {
        item.setAttribute("data-inbox-index", String(index));
        results.push({ index, name, preview: preview.substring(0, 200), time, unread: isUnread });
      }
    });

    return results;
  });

  const unread = conversations.filter((c) => c.unread);
  console.log(`   📥 Total: ${conversations.length} | 📬 Unread: ${unread.length}`);

  return { all: conversations, unread };
}

export async function getFullConversation(page, convoIndex) {
  const convoLocator = page.locator(`[data-inbox-index="${convoIndex}"]`).first();
  if ((await convoLocator.count()) === 0) return null;

  await convoLocator.click({ force: true });
  await randomDelay(3000, 5000);

  const messages = await page.evaluate(() => {
    const messageEls = document.querySelectorAll(".msg-s-event-listitem__body, .msg-s-message-list-content .msg-s-event-listitem");
    return Array.from(messageEls).map((el) => (el.textContent || "").trim()).filter((t) => t.length > 0);
  });

  return messages;
}