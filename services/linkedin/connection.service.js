import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { dismissPremiumModal } from "./premium.service.js";

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

    const isAlreadyPending = async () => {
      return await page.evaluate(() => {
        const bodyText = (document.body.innerText || "").toLowerCase();
        return bodyText.includes("pending") || bodyText.includes("invitation sent");
      });
    };

    // Step 1: Click Connect
    console.log(`\n   ━━━ STEP 1: Click Connect ━━━`);
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
        const ck = el.getAttribute("componentkey") || "";
        if ((aria.includes("invite") && aria.includes("connect")) || ck.includes("ConnectButton")) {
          el.setAttribute("data-outreach-btn-live", "connect");
          return { found: true, type: "direct", x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
        }
      }

      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        if (aria === "more actions" || aria === "more") {
          el.setAttribute("data-outreach-btn-live", "more");
          return { found: true, type: "more", x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
        }
      }
      return { found: false };
    });

    if (!detected.found) return { success: false, reason: "connect_button_not_found" };

    console.log(`   📍 ${detected.type} button at (${detected.x}, ${detected.y})`);
    await humanClick(page, detected.x, detected.y);
    await randomDelay(1500, 2000);

    if (detected.type === "more") {
      let dropdownReady = false;
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(500);
        const has = await page.evaluate(() => {
          const el = document.querySelector('a[href*="/preload/custom-invite/"]');
          return el && el.getBoundingClientRect().width > 0;
        });
        if (has) { dropdownReady = true; break; }
      }
      if (!dropdownReady) return { success: false, reason: "dropdown_not_appeared" };

      const connectInfo = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/preload/custom-invite/"]');
        if (!link) return null;
        return { href: link.getAttribute("href") };
      });
      if (!connectInfo) return { success: false, reason: "connect_link_not_found" };

      const fullUrl = connectInfo.href.startsWith("/")
        ? "https://www.linkedin.com" + connectInfo.href : connectInfo.href;
      await safeGoto(page, fullUrl);
    } else {
      if (!(await isDialogOpen()) && profileUrl) {
        const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
        if (vanityMatch) {
          await safeGoto(page, `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`);
        }
      }
    }

    await dismissPremiumModal(page);

    // Wait for dialog
    let dialogReady = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      if (await isDialogOpen()) { dialogReady = true; break; }
    }
    if (!dialogReady) {
      if (await isAlreadyPending()) return { success: true, hadNote: false };
      return { success: false, reason: "dialog_never_appeared" };
    }

    // Step 2: Try adding note
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
        }
      }

      if (!skipNote) {
        const noteField = page.locator('textarea[name="message"], #custom-message, textarea').first();
        if ((await noteField.count()) > 0 && (await noteField.isVisible().catch(() => false))) {
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

    // Step 3: Click Send
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
        await dismissPremiumModal(page);
        sent = true;
        console.log(`   ✅ Connection sent! ${noteAdded ? "(WITH note)" : "(no note)"}`);
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