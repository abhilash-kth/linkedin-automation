import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { dismissPremiumModal } from "./premium.service.js";

async function verifyConnectionSent(page) {
  console.log(`   🔍 Verifying send status...`);
  const startUrl = page.url();

  for (let attempt = 1; attempt <= 15; attempt++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate((oldUrl) => {
      const currentUrl = window.location.href;
      const urlChanged = currentUrl !== oldUrl;
      const bodyText = (document.body.innerText || "").toLowerCase();
      const hasPending =
        bodyText.includes("pending") ||
        bodyText.includes("invitation sent") ||
        bodyText.includes("request sent");
      const sendButtons = document.querySelectorAll("button");
      let sendVisible = false;
      for (const btn of sendButtons) {
        const text = (btn.textContent || "").trim();
        const rect = btn.getBoundingClientRect();
        if (
          (text === "Send" || text === "Send invitation" ||
           text === "Send without a note") &&
          rect.width > 0 && rect.height > 0
        ) {
          sendVisible = true;
          break;
        }
      }
      const toast = document.querySelector(
        '.artdeco-toast-item, [role="alert"], .Toastify__toast',
      );
      const hasToast = toast && toast.getBoundingClientRect().width > 0;
      const leftInvitePage =
        !currentUrl.includes("/preload/custom-invite/") &&
        !currentUrl.includes("/mynetwork/invite-connect/");
      return { currentUrl, urlChanged, hasPending, sendVisible, hasToast, leftInvitePage };
    }, startUrl);

    if (state.hasPending) return true;
    if (state.hasToast) return true;
    if (state.leftInvitePage && state.currentUrl !== startUrl) return true;
    if (!state.sendVisible && attempt > 3) return true;
  }
  return false;
}

export async function sendConnectionRequest(page, personalNote = "", profileUrl = "") {
  console.log(`\n📨 Sending connection request...`);

  try {
    const isDialogOpen = async () => {
      return await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const btn of btns) {
          const text = (btn.textContent || "").trim();
          const rect = btn.getBoundingClientRect();
          if (
            (text === "Send" || text === "Send invitation" ||
             text === "Send without a note" || text === "Add a note") &&
            rect.width > 0 && rect.height > 0
          ) return true;
        }
        return false;
      });
    };

    const clickConnectButton = async () => {
      const detected = await page.evaluate(() => {
        const allEls = [
          ...document.querySelectorAll("a[aria-label]"),
          ...document.querySelectorAll("button[aria-label]"),
        ];

        for (const el of allEls) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
          const aria = (el.getAttribute("aria-label") || "").toLowerCase();
          const componentkey = el.getAttribute("componentkey") || "";
          if ((aria.includes("invite") && aria.includes("connect")) ||
              componentkey.includes("ConnectButton")) {
            el.setAttribute("data-outreach-btn-live", "connect");
            return {
              found: true, type: "direct",
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }

        for (const el of allEls) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
          const aria = (el.getAttribute("aria-label") || "").toLowerCase();
          if (aria === "more actions" || aria === "more") {
            el.setAttribute("data-outreach-btn-live", "more");
            return {
              found: true, type: "more",
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
        return { found: false };
      });

      if (!detected.found) return false;
      console.log(`   📍 ${detected.type} button at (${detected.x}, ${detected.y})`);

      await page.evaluate(() => {
        const el = document.querySelector("[data-outreach-btn-live]");
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      await randomDelay(1000, 1500);

      await humanClick(page, detected.x, detected.y);
      await randomDelay(1500, 2000);

      if (detected.type === "direct") {
        let dialogOpened = await isDialogOpen();
        if (!dialogOpened) {
          try {
            const locator = page.locator('[data-outreach-btn-live="connect"]').first();
            await locator.click({ force: true, timeout: 5000 });
            await randomDelay(1500, 2000);
          } catch {}
          dialogOpened = await isDialogOpen();
        }

        if (!dialogOpened && profileUrl) {
          const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
          if (vanityMatch) {
            const inviteUrl = `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`;
            console.log(`   🔗 Navigating to invite URL: ${inviteUrl}`);
            await safeGoto(page, inviteUrl);
          }
        }
      } else if (detected.type === "more") {
        let expanded = await page.evaluate(() => {
          const el = document.querySelector('[data-outreach-btn-live="more"]');
          return el ? el.getAttribute("aria-expanded") : null;
        });

        if (expanded !== "true") {
          try {
            const locator = page.locator('[data-outreach-btn-live="more"]').first();
            await locator.click({ force: true, timeout: 5000 });
            await randomDelay(1000, 1500);
          } catch {}
        }

        console.log(`   ⏳ Waiting for dropdown...`);
        let dropdownReady = false;
        for (let i = 0; i < 15; i++) {
          await page.waitForTimeout(500);
          const has = await page.evaluate(() => {
            const el = document.querySelector(
              'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
            );
            return el && el.getBoundingClientRect().width > 0;
          });
          if (has) { dropdownReady = true; break; }
        }

        if (!dropdownReady) return false;
        console.log(`   ✅ Dropdown appeared`);

        const connectInfo = await page.evaluate(() => {
          const link = document.querySelector(
            'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
          );
          if (!link) return null;
          return { href: link.getAttribute("href") };
        });

        if (!connectInfo) return false;
        const fullUrl = connectInfo.href.startsWith("/")
          ? "https://www.linkedin.com" + connectInfo.href : connectInfo.href;
        console.log(`   🔗 Navigating to invite URL: ${fullUrl}`);
        await safeGoto(page, fullUrl);
      }
      return true;
    };

    const waitForInviteDialog = async () => {
      console.log(`   ⏳ Waiting for invitation dialog...`);
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => {
          const buttons = document.querySelectorAll("button");
          for (const btn of buttons) {
            const text = (btn.textContent || "").trim();
            const rect = btn.getBoundingClientRect();
            if (
              (text === "Send" || text === "Send invitation" ||
               text === "Send without a note" || text === "Send now") &&
              rect.width > 0 && rect.height > 0
            ) return { found: true, text };
          }
          return { found: false };
        });
        if (state.found) {
          console.log(`   ✅ Dialog ready — "${state.text}" visible`);
          return true;
        }
      }
      return false;
    };

    const isAlreadyPending = async () => {
      return await page.evaluate(() => {
        const bodyText = (document.body.innerText || "").toLowerCase();
        return bodyText.includes("pending") || bodyText.includes("invitation sent");
      });
    };

    // STEP 1: Click Connect
    console.log(`\n   ━━━ STEP 1: Click Connect ━━━`);
    const firstClick = await clickConnectButton();
    if (!firstClick) return { success: false, reason: "connect_button_not_found" };

    const immediatePremium = await dismissPremiumModal(page);
    if (immediatePremium) {
      await randomDelay(2000, 3000);
      const currentUrl = page.url();
      if (currentUrl.includes("/preload/custom-invite/") ||
          currentUrl.includes("/mynetwork/invite-connect/")) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
        await randomDelay(3000, 5000);
      }
    }

    const dialogAppeared = await waitForInviteDialog();
    if (!dialogAppeared) {
      if (await isAlreadyPending()) return { success: true, hadNote: false };
      return { success: false, reason: "dialog_never_appeared" };
    }

    // STEP 2: Try adding note
    let noteAdded = false;
    let skipNote = false;

    const hasAddNoteBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const text = (btn.textContent || "").trim();
        const rect = btn.getBoundingClientRect();
        if (text === "Add a note" && rect.width > 0 && rect.height > 0) return true;
      }
      return false;
    });

    if (!hasAddNoteBtn) skipNote = true;

    if (personalNote && personalNote.length > 0 && hasAddNoteBtn && !skipNote) {
      console.log(`\n   ━━━ STEP 2: Adding note ━━━`);
      const noteCoords = await page.evaluate(() => {
        const btns = document.querySelectorAll("button");
        for (const btn of btns) {
          if ((btn.textContent || "").trim() === "Add a note") {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0) return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
          }
        }
        return null;
      });

      if (noteCoords) {
        await humanClick(page, noteCoords.x, noteCoords.y);
        await randomDelay(2000, 3000);

        if (await dismissPremiumModal(page)) {
          skipNote = true;
          await randomDelay(2000, 3000);
          if (!(await isDialogOpen())) {
            const currentUrl = page.url();
            if (currentUrl.includes("/preload/custom-invite/") ||
                currentUrl.includes("/mynetwork/invite-connect/")) {
              await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
              await randomDelay(4000, 6000);
              await waitForInviteDialog();
            } else if (profileUrl) {
              const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
              if (vanityMatch) {
                await safeGoto(page, `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`);
                await waitForInviteDialog();
              }
            }
          }
        }
      }

      if (!skipNote) {
        const noteField = page.locator('textarea[name="message"], #custom-message, textarea').first();
        if ((await noteField.count()) > 0 && (await noteField.isVisible().catch(() => false))) {
          console.log(`   📝 Typing personal note...`);
          await noteField.click();
          await randomDelay(500, 1000);
          await page.keyboard.press("Control+a");
          await page.keyboard.press("Delete");
          await randomDelay(300, 500);
          await humanTypeText(page, personalNote);
          await randomDelay(1500, 2500);
          noteAdded = true;
          console.log(`   ✅ Note typed`);
        }
      }
    }

    // STEP 3: Click Send
    console.log(`\n   ━━━ STEP 3: Click Send ━━━`);
    const sendSelectors = skipNote
      ? ['button:has-text("Send without a note")', 'button:has-text("Send")']
      : ['button:has-text("Send invitation")', 'button:has-text("Send")'];

    let sent = false;
    for (const sel of sendSelectors) {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        await btn.click({ force: true });
        await randomDelay(2500, 4000);

        if (await dismissPremiumModal(page)) {
          noteAdded = false;
          await randomDelay(2000, 3000);
          const currentUrl = page.url();
          if (currentUrl.includes("/preload/custom-invite/") ||
              currentUrl.includes("/mynetwork/invite-connect/")) {
            await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
            await randomDelay(3000, 5000);
            await waitForInviteDialog();
          }
          const swn = page.locator('button:has-text("Send without a note")').first();
          if ((await swn.count()) > 0) {
            await swn.click({ force: true });
            await randomDelay(2500, 4000);
          }
        }

        const confirmed = await verifyConnectionSent(page);
        if (confirmed) {
          console.log(`   ✅ Connection sent! ${noteAdded ? "(WITH note)" : "(no note)"}`);
        }
        sent = true;
        break;
      }
    }

    if (!sent) {
      if (await isAlreadyPending()) return { success: true, hadNote: noteAdded };
      return { success: false, reason: "send_button_not_found" };
    }

    return { success: true, hadNote: noteAdded };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}