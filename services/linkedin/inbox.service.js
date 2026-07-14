import { randomDelay } from "../../helpers/delay.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

/**
 * Scan inbox and get ALL conversations
 * Returns: { all, unread, needsReply }
 * needsReply = conversations where THEIR message is the LAST message
 */
export async function scanInbox(page) {
  console.log(`\n🔍 Scanning inbox...`);

  await page.goto("https://www.linkedin.com/messaging/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await randomDelay(4000, 6000);
  await behaveLikeHuman(page);

  // Scroll to load more conversations
  console.log(`   📜 Loading conversations...`);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const list = document.querySelector(
        '.msg-conversations-container__conversations-list, [role="list"]',
      );
      if (list) list.scrollBy(0, 400);
    });
    await randomDelay(1500, 2500);
  }
  await page.evaluate(() => {
    const list = document.querySelector(
      '.msg-conversations-container__conversations-list, [role="list"]',
    );
    if (list) list.scrollTo(0, 0);
  });
  await randomDelay(2000, 3000);

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
      // Get name
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

      // Get preview
      let preview = "";
      const previewSelectors = [
        ".msg-conversation-card__message-snippet",
        ".msg-conversation-listitem__message-snippet",
      ];
      for (const sel of previewSelectors) {
        const el = item.querySelector(sel);
        if (el) {
          preview = (el.textContent || "").trim();
          if (preview) break;
        }
      }

      // Check unread status
      const isUnread =
        item.classList.contains("msg-conversation-listitem--unread") ||
        item.classList.contains("msg-conversation-card--unread") ||
        item.querySelector(".notification-badge--show") !== null;

      // Get time
      const timeEl = item.querySelector("time");
      const time = timeEl ? timeEl.textContent.trim() : "";

      // Get profile URL if available
      const profileLink = item.querySelector('a[href*="/in/"]');
      const profileUrl = profileLink
        ? profileLink.getAttribute("href").split("?")[0]
        : "";

      // Get thread URL (unique identifier per conversation thread)
      const threadLink = item.querySelector('a[href*="/messaging/thread/"]');
      const threadUrl = threadLink ? threadLink.getAttribute("href") : "";

      // Get thread ID (LinkedIn's unique thread identifier)
      let threadId = "";
      if (threadUrl) {
        const match = threadUrl.match(/\/thread\/([^\/\?]+)/);
        if (match) threadId = match[1];
      }

      if (name) {
        item.setAttribute("data-inbox-index", String(index));
        if (threadId) item.setAttribute("data-thread-id", threadId);
        results.push({
          index,
          name,
          preview: preview.substring(0, 200),
          time,
          unread: isUnread,
          profileUrl: profileUrl.startsWith("http")
            ? profileUrl
            : profileUrl
              ? "https://www.linkedin.com" + profileUrl
              : "",
          threadId, // ← Unique per conversation
          threadUrl,
        });
      }
    });

    return results;
  });

  const unread = conversations.filter((c) => c.unread);
  console.log(
    `   📥 Total: ${conversations.length} | 📬 Unread: ${unread.length}`,
  );

  return { all: conversations, unread };
}

/**
 * Open a conversation and get ALL messages
 * Returns: [{sender: "us"|"them", text, timestamp}]
 */
export async function getFullConversation(page, convoIndex) {
  const convoLocator = page
    .locator(`[data-inbox-index="${convoIndex}"]`)
    .first();
  if ((await convoLocator.count()) === 0) return null;

  await convoLocator.click({ force: true });
  await randomDelay(3000, 5000);

  // Scroll up to load older messages
  console.log(`   📜 Loading full history...`);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const list = document.querySelector(
        ".msg-s-message-list, .msg-s-message-list-content",
      );
      if (list) list.scrollTop = 0;
    });
    await randomDelay(1500, 2500);
  }

  // Scroll back to bottom to see latest
  await page.evaluate(() => {
    const list = document.querySelector(
      ".msg-s-message-list, .msg-s-message-list-content",
    );
    if (list) list.scrollTop = list.scrollHeight;
  });
  await randomDelay(1000, 2000);

  const messages = await page.evaluate(() => {
    const results = [];

    // Get message groups (each group has sender info)
    const messageItems = document.querySelectorAll(
      ".msg-s-event-listitem, .msg-s-message-list__event",
    );

    let currentSender = null;
    let currentIsUs = false;

    messageItems.forEach((item) => {
      // Check for sender name in this group
      const senderNameEl = item.querySelector(
        ".msg-s-message-group__profile-link, .msg-s-message-group__name",
      );
      if (senderNameEl) {
        currentSender = (senderNameEl.textContent || "").trim();
        // Check if it's our own message
        currentIsUs =
          item.querySelector(".msg-s-event-listitem--other") === null &&
          item.classList.contains("msg-s-event-listitem--other") === false;
      }

      // Get message body
      const bodyEl = item.querySelector(".msg-s-event-listitem__body");
      if (bodyEl) {
        const text = (bodyEl.textContent || "").trim();
        if (text.length > 0) {
          // Additional detection: look for "You" indicator
          const isFromUs =
            item.querySelector('[data-test-id="self-message"]') !== null ||
            item.closest(".msg-s-event-listitem--other") === null;

          results.push({
            sender: isFromUs ? "us" : "them",
            text,
            senderName: currentSender || (isFromUs ? "You" : "Them"),
          });
        }
      }
    });

    return results;
  });

  return messages;
}

/**
 * Determine who sent the LAST message in a conversation
 * Returns: "us" | "them" | null
 */
export function getLastMessageSender(messages) {
  if (!messages || messages.length === 0) return null;
  return messages[messages.length - 1].sender;
}
