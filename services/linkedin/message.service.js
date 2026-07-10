import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { dismissPremiumModal } from "./premium.service.js";
import { safeGoto } from "../browser/navigation.service.js";

export async function clickMessageButton(page) {
  console.log(`   🔎 Locating Message button on profile...`);

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

      const allEls = [
        ...document.querySelectorAll("button"),
        ...document.querySelectorAll("a"),
      ];
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

    if (found) {
      console.log(`   ✅ Message button tagged`);
      break;
    }

    if (attempt % 5 === 0) {
      console.log(`   ⏳ Still searching... ${attempt}/15s`);
    }
  }

  if (!found) {
    console.log(`   ❌ Message button not found`);
    return false;
  }

  console.log(`   📜 Scrolling into view...`);
  await page.evaluate(() => {
    const el = document.querySelector('[data-outreach-msg-btn="true"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  await randomDelay(1500, 2500);

  const coords = await page.evaluate(() => {
    const el = document.querySelector('[data-outreach-msg-btn="true"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
  });

  if (!coords) return false;

  console.log(`   🖱️  Clicking at (${coords.x}, ${coords.y})...`);

  await page.mouse.move(coords.x, coords.y, { steps: 10 });
  await page.waitForTimeout(300 + Math.random() * 400);
  await page.mouse.click(coords.x, coords.y, { delay: 80 + Math.random() * 100 });
  await randomDelay(2500, 4000);

  let composerOpened = await page.evaluate(() => {
    const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
    return el && el.getBoundingClientRect().width > 0;
  });

  console.log(`   📊 After mouse click: composer opened = ${composerOpened}`);

  if (!composerOpened) {
    console.log(`   🔄 Trying Playwright locator click...`);
    try {
      await page.locator('[data-outreach-msg-btn="true"]').first().click({ force: true, timeout: 5000 });
      await randomDelay(2500, 4000);
      composerOpened = await page.evaluate(() => {
        const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
        return el && el.getBoundingClientRect().width > 0;
      });
      console.log(`   📊 After locator click: composer opened = ${composerOpened}`);
    } catch (err) {
      console.log(`   ⚠️  Locator click failed: ${err.message}`);
    }
  }

  if (!composerOpened) {
    console.log(`   🔄 Trying dispatchEvent...`);
    await page.evaluate(() => {
      const el = document.querySelector('[data-outreach-msg-btn="true"]');
      if (el) {
        const rect = el.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        ["mousedown", "mouseup", "click"].forEach((type) => {
          el.dispatchEvent(new MouseEvent(type, {
            view: window, bubbles: true, cancelable: true,
            clientX: x, clientY: y, button: 0,
          }));
        });
      }
    });
    await randomDelay(2500, 4000);

    composerOpened = await page.evaluate(() => {
      const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
      return el && el.getBoundingClientRect().width > 0;
    });
    console.log(`   📊 After dispatchEvent: composer opened = ${composerOpened}`);
  }

  if (!composerOpened) {
    console.log(`   🔄 Navigating to messaging URL...`);
    const messagingUrl = await page.evaluate(() => {
      const el = document.querySelector('[data-outreach-msg-btn="true"]');
      if (!el) return null;
      if (el.tagName === "A" && el.getAttribute("href")) return el.getAttribute("href");
      let current = el;
      for (let i = 0; i < 5; i++) {
        if (current.parentElement) {
          current = current.parentElement;
          if (current.tagName === "A" && current.getAttribute("href")) return current.getAttribute("href");
        } else break;
      }
      return null;
    });

    if (messagingUrl) {
      const fullUrl = messagingUrl.startsWith("/") ? "https://www.linkedin.com" + messagingUrl : messagingUrl;
      console.log(`   🔗 Navigating to: ${fullUrl}`);
      await safeGoto(page, fullUrl);
      await randomDelay(3000, 5000);
    }
  }

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
      const primary = document.querySelector(".msg-form__contenteditable");
      if (primary) {
        const rect = primary.getBoundingClientRect();
        if (rect.width > 30 && rect.height > 15) {
          return {
            found: true,
            selector: ".msg-form__contenteditable",
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
            w: Math.floor(rect.width),
            h: Math.floor(rect.height),
            hasSubject: !!document.querySelector('input.msg-form__subject, input[name="subject"]'),
          };
        }
      }

      const fallbacks = [
        '[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"][aria-label*="Write" i]',
      ];

      for (const sel of fallbacks) {
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
      console.log(`   📝 Has subject: ${composerInfo.hasSubject}`);
      composerReady = true;
      break;
    }

    if (attempt % 5 === 0) {
      console.log(`   ⏳ Still waiting... ${attempt}/25s`);
      try {
        await page.screenshot({ path: `./profiles/${accountId}/debug-composer-${attempt}.png` });
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
    console.log(`   ✅ Subject filled`);
  }

  // Click composer
  console.log(`   🖱️  Clicking composer...`);
  await humanClick(page, composerInfo.x, composerInfo.y);
  await randomDelay(800, 1500);

  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) { el.focus(); el.click(); }
  }, composerInfo.selector);
  await randomDelay(400, 800);

  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await randomDelay(300, 600);

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

  console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
  await humanTypeText(page, messageText);
  await randomDelay(1500, 2500);

  const typedContent = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? (el.textContent || "").trim().length : 0;
  }, composerInfo.selector);

  console.log(`   📊 Chars typed: ${typedContent}`);

  if (typedContent === 0) {
    console.log(`   ⚠️  JS insertText fallback...`);
    await page.evaluate((data) => {
      const el = document.querySelector(data.sel);
      if (!el) return;
      el.focus();
      try { document.execCommand("insertText", false, data.text); } catch {}
      if ((el.textContent || "").trim().length === 0) {
        el.innerHTML = `<p>${data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, { sel: composerInfo.selector, text: messageText });
    await randomDelay(1000, 1500);
  }

  console.log(`   ✅ Message in composer`);

  const sendState = await page.evaluate(() => {
    const sels = [
      "button.msg-form__send-btn",
      "button.msg-form__send-button",
      'button[aria-label="Send message"]',
    ];
    for (const sel of sels) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            exists: true, selector: sel,
            disabled: btn.hasAttribute("disabled"),
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    return { exists: false };
  });

  console.log(`   📊 Send btn: exists=${sendState.exists}, disabled=${sendState.disabled}`);

  if (actuallySend) {
    if (!sendState.exists) return { success: false, reason: "send_button_missing" };

    if (sendState.disabled) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) { el.focus(); el.click(); }
      }, composerInfo.selector);
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await page.waitForTimeout(400);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }

    console.log(`   🖱️  Clicking send...`);
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

export async function attemptSendMessage(page, messageText, subject, actuallySend, accountId = "debug") {
  console.log(`\n💬 Attempting to send message...`);

  const clicked = await clickMessageButton(page);
  if (!clicked) return { success: false, reason: "no_message_button" };

  await randomDelay(2000, 3500);
  await dismissPremiumModal(page);

  return await sendMessageViaComposer(page, messageText, subject, actuallySend, accountId);
}