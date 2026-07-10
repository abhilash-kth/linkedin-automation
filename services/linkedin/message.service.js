import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { dismissPremiumModal } from "./premium.service.js";

export async function clickMessageButton(page) {
  console.log(`   🔎 Locating Message button...`);

  let found = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await page.waitForTimeout(1000);

    found = await page.evaluate(() => {
      const messageLinks = document.querySelectorAll('a[href*="/messaging/compose/"]');
      for (const el of messageLinks) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        el.setAttribute("data-outreach-msg-btn", "true");
        return true;
      }

      const allEls = [...document.querySelectorAll("button"), ...document.querySelectorAll("a")];
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        const text = (el.textContent || "").trim();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        if (text === "Message" || aria === "message" || aria.startsWith("message ")) {
          el.setAttribute("data-outreach-msg-btn", "true");
          return true;
        }
      }
      return false;
    });

    if (found) break;
  }

  if (!found) {
    console.log(`   ❌ Message button not found`);
    return false;
  }

  // Scroll into view
  await page.evaluate(() => {
    const el = document.querySelector('[data-outreach-msg-btn="true"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  await randomDelay(1500, 2500);

  // Get fresh coordinates after scroll
  const coords = await page.evaluate(() => {
    const el = document.querySelector('[data-outreach-msg-btn="true"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
  });

  if (!coords) return false;

  console.log(`   🖱️  Clicking Message at (${coords.x}, ${coords.y})...`);

  // Method 1: Mouse click
  await page.mouse.move(coords.x, coords.y, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.click(coords.x, coords.y, { delay: 80 });
  await randomDelay(2500, 4000);

  // Check if composer opened
  let composerOpened = await page.evaluate(() => {
    const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
    return el && el.getBoundingClientRect().width > 0;
  });

  // Method 2: Playwright click
  if (!composerOpened) {
    try {
      await page.locator('[data-outreach-msg-btn="true"]').first().click({ force: true, timeout: 5000 });
      await randomDelay(2500, 4000);
      composerOpened = await page.evaluate(() => {
        const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
        return el && el.getBoundingClientRect().width > 0;
      });
    } catch {}
  }

  console.log(`   📊 Composer opened: ${composerOpened}`);
  return true;
}

export async function sendMessageViaComposer(page, messageText, subject, actuallySend, accountId = "debug") {
  console.log(`   ⏳ Waiting for composer...`);

  let composerReady = false;
  let composerInfo = null;

  for (let attempt = 1; attempt <= 25; attempt++) {
    await page.waitForTimeout(1000);

    if (attempt === 3 || attempt === 8 || attempt === 15) {
      await dismissPremiumModal(page);
    }

    composerInfo = await page.evaluate(() => {
      const selectors = [
        ".msg-form__contenteditable",
        '[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="Write" i]',
        'div[contenteditable="true"][aria-label*="message" i]',
      ];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 30 && rect.height > 15) {
            return {
              found: true,
              selector: sel,
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              w: Math.floor(rect.width),
              h: Math.floor(rect.height),
              hasSubject: !!document.querySelector('input.msg-form__subject, input[name="subject"]'),
            };
          }
        }
      }
      return { found: false };
    });

    if (composerInfo.found) {
      console.log(`   ✅ Composer ready after ${attempt}s (${composerInfo.w}x${composerInfo.h})`);
      composerReady = true;
      break;
    }

    if (attempt % 5 === 0) {
      console.log(`   ⏳ Still waiting... ${attempt}/25s`);
      try {
        await page.screenshot({ path: `./debug/screenshots/composer-${attempt}.png`, fullPage: false });
      } catch {}
    }
  }

  if (!composerReady) {
    if (await dismissPremiumModal(page)) {
      return { success: false, reason: "premium_required_for_inmail" };
    }
    return { success: false, reason: "composer_never_appeared" };
  }

  await randomDelay(1000, 2000);

  // Fill subject
  if (composerInfo.hasSubject && subject && subject.length > 0) {
    console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
    await page.evaluate(() => {
      const f = document.querySelector('input.msg-form__subject, input[name="subject"]');
      if (f) { f.focus(); f.click(); }
    });
    await randomDelay(500, 900);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await humanTypeText(page, subject);
    await randomDelay(800, 1500);
  }

  // Click textbox
  await page.mouse.move(composerInfo.x, composerInfo.y, { steps: 8 });
  await page.waitForTimeout(200);
  await page.mouse.click(composerInfo.x, composerInfo.y, { delay: 80 });
  await randomDelay(800, 1500);

  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, composerInfo.selector);
  await randomDelay(400, 800);

  // Clear and type
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await randomDelay(300, 600);

  console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
  await humanTypeText(page, messageText);
  await randomDelay(1500, 2500);
  console.log(`   ✅ Message typed`);

  // Find send button
  const sendState = await page.evaluate(() => {
    const sels = [
      "button.msg-form__send-btn",
      "button.msg-form__send-button",
      'button[type="submit"].msg-form__send-btn',
      'button[aria-label="Send message"]',
    ];
    for (const sel of sels) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            exists: true,
            selector: sel,
            disabled: btn.hasAttribute("disabled"),
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    return { exists: false };
  });

  if (actuallySend) {
    if (!sendState.exists) return { success: false, reason: "send_button_missing" };

    if (sendState.disabled) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) { el.focus(); el.click(); }
      }, composerInfo.selector);
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await page.waitForTimeout(300);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }

    await humanClick(page, sendState.x, sendState.y);
    await randomDelay(3000, 5000);

    if (await dismissPremiumModal(page)) {
      return { success: false, reason: "premium_required_for_inmail" };
    }

    console.log(`   ✅ Message SENT!`);
    return { success: true, action: "message_sent" };
  } else {
    console.log(`   ⚠️  Safe mode — typed but NOT sent`);
    return { success: true, action: "typed_only" };
  }
}

export async function attemptSendMessage(page, messageText, subject, actuallySend, accountId) {
  console.log(`\n💬 Attempting to send message...`);

  const clicked = await clickMessageButton(page);
  if (!clicked) return { success: false, reason: "no_message_button" };

  await randomDelay(2000, 3500);
  await dismissPremiumModal(page);

  return await sendMessageViaComposer(page, messageText, subject, actuallySend, accountId);
}