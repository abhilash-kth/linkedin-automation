import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import {
  dismissPremiumModal,
  detectPremiumModalType,
  detectVerifyPopup,
  dismissVerifyPopup,
} from "./premium.service.js";
import SELECTORS from "../../config/selectors.js";

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
function isPageAlive(page) {
  try {
    return page && !page.isClosed();
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECT: Weekly limit reached
// ═══════════════════════════════════════════════════════════════
async function isWeeklyLimitReached(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(() => {
      const limitPhrases = [
        "reached the weekly limit",
        "weekly limit for connection",
        "weekly invitation limit",
        "was not sent because you have reached",
        "try again next week",
        "reached your weekly invitation",
      ];

      const bodyText = (document.body.innerText || "").toLowerCase();
      for (const phrase of limitPhrases) {
        if (bodyText.includes(phrase)) return true;
      }

      const toasts = document.querySelectorAll(
        '.artdeco-toast-item, [role="alert"], .Toastify__toast, .artdeco-toast',
      );
      for (const toast of toasts) {
        const rect = toast.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (toast.textContent || "").toLowerCase();
        for (const phrase of limitPhrases) {
          if (text.includes(phrase)) return true;
        }
        if (text.includes("weekly limit") || text.includes("was not sent"))
          return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Check if invite dialog is open
// ═══════════════════════════════════════════════════════════════
async function isInviteDialogOpen(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(
      ({ dialogSels, addNoteBtn, sendWithoutBtn }) => {
        for (const sel of dialogSels) {
          const el = document.querySelector(sel);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return true;
          }
        }
        const addNote = document.querySelector(addNoteBtn);
        if (addNote) {
          const rect = addNote.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }
        const sendWithout = document.querySelector(sendWithoutBtn);
        if (sendWithout) {
          const rect = sendWithout.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }
        return false;
      },
      {
        dialogSels: SELECTORS.inviteFlow.dialogContainer,
        addNoteBtn: SELECTORS.inviteFlow.addNoteButton,
        sendWithoutBtn: SELECTORS.inviteFlow.sendWithoutNoteButton,
      },
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Wait for invite dialog
// ═══════════════════════════════════════════════════════════════
async function waitForInviteDialog(page, maxSec = 15) {
  console.log(`   ⏳ Waiting for invite dialog (${maxSec}s max)...`);
  const iterations = maxSec * 5;
  for (let i = 0; i < iterations; i++) {
    if (!isPageAlive(page)) return false;
    await page.waitForTimeout(200);
    if (await isInviteDialogOpen(page)) {
      console.log(`   ✅ Dialog ready`);
      return true;
    }
    if (i > 0 && i % 15 === 0) {
      console.log(
        `   ⏳ Still waiting... (${Math.floor((i * 200) / 1000)}s elapsed)`,
      );
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Wait for note textarea
// ═══════════════════════════════════════════════════════════════
async function waitForNoteTextarea(page, maxSec = 10) {
  console.log(`   ⏳ Waiting for note textarea...`);
  for (let i = 0; i < maxSec * 2; i++) {
    if (!isPageAlive(page)) return false;
    await page.waitForTimeout(500);
    const hasTextarea = await page.evaluate((selector) => {
      const ta = document.querySelector(selector);
      if (!ta) return false;
      const rect = ta.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, SELECTORS.inviteFlow.noteTextarea);

    if (hasTextarea) {
      console.log(`   ✅ Textarea ready`);
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Check if already pending
// ═══════════════════════════════════════════════════════════════
async function isAlreadyPending(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(
      ({ keySel, ariaSel, buttonText, bounds }) => {
        const byKey = document.querySelector(keySel);
        if (byKey) {
          const rect = byKey.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }

        const byAria = document.querySelector(ariaSel);
        if (byAria) return true;

        const allBtns = document.querySelectorAll("button, a");
        for (const btn of allBtns) {
          const text = (btn.textContent || "").trim();
          const rect = btn.getBoundingClientRect();
          if (text === buttonText && rect.width > 0 && rect.height > 0) {
            if (
              rect.x < bounds.maxX &&
              rect.y > bounds.minY &&
              rect.y < bounds.maxY
            )
              return true;
          }
        }
        return false;
      },
      {
        keySel: SELECTORS.profile.pendingByComponentKey,
        ariaSel: SELECTORS.profile.pendingAriaPattern,
        buttonText: SELECTORS.profile.pendingButtonText,
        bounds: SELECTORS.profile.buttonAreaBounds,
      },
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Click "Add a note"
// ═══════════════════════════════════════════════════════════════
async function clickAddNote(page) {
  console.log(`   🖱️  Clicking "Add a note"...`);
  if (!isPageAlive(page)) return false;
  try {
    const btn = page.locator(SELECTORS.inviteFlow.addNoteButton).first();
    if ((await btn.count()) > 0) {
      const box = await btn.boundingBox().catch(() => null);
      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await humanMove(page, x, y);
        await randomDelay(300, 600);
        await humanClick(page, x, y);
        await randomDelay(1500, 2500);
        return true;
      }
      await btn.click({ force: true, timeout: 5000 });
      await randomDelay(1500, 2500);
      return true;
    }
    return false;
  } catch (err) {
    console.log(`   ⚠️  Add note error: ${err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Click "Send without a note"
// ═══════════════════════════════════════════════════════════════
async function clickSendWithoutNote(page) {
  console.log(`   🖱️  Clicking "Send without a note"...`);
  if (!isPageAlive(page)) return false;
  try {
    const btn = page
      .locator(SELECTORS.inviteFlow.sendWithoutNoteButton)
      .first();
    if ((await btn.count()) > 0) {
      const isDisabled = await btn.isDisabled().catch(() => false);
      if (!isDisabled) {
        const box = await btn.boundingBox().catch(() => null);
        if (box) {
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          await humanMove(page, x, y);
          await randomDelay(300, 600);
          await humanClick(page, x, y);
          await randomDelay(500, 1000);
          return true;
        }
        await btn.click({ force: true, timeout: 5000 });
        await randomDelay(500, 1000);
        return true;
      }
    }
    return false;
  } catch (err) {
    console.log(`   ⚠️  Send without note error: ${err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Click "Send" (after typing note)
// ═══════════════════════════════════════════════════════════════
async function clickSendInvitation(page) {
  console.log(`   🖱️  Clicking "Send"...`);
  if (!isPageAlive(page)) return false;

  const sendButtonSelectors = SELECTORS.inviteFlow.sendInvitationButton;
  const joinedSelector = sendButtonSelectors.join(", ");

  console.log(`   ⏳ Waiting for Send button to enable...`);
  for (let i = 0; i < 20; i++) {
    if (!isPageAlive(page)) return false;
    await page.waitForTimeout(300);
    const enabled = await page.evaluate((selector) => {
      const btns = document.querySelectorAll(selector);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          !btn.hasAttribute("disabled") &&
          btn.getAttribute("aria-disabled") !== "true"
        )
          return true;
      }
      return false;
    }, joinedSelector);
    if (enabled) {
      console.log(`   ✅ Send button enabled`);
      break;
    }
  }

  for (const sel of sendButtonSelectors) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0) {
        const isVisible = await btn.isVisible().catch(() => false);
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isVisible && !isDisabled) {
          const box = await btn.boundingBox().catch(() => null);
          if (box) {
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            await humanMove(page, x, y);
            await randomDelay(400, 800);
            await humanClick(page, x, y);
            await randomDelay(500, 1000);
            return true;
          }
          await btn.click({ force: true, timeout: 5000 });
          await randomDelay(500, 1000);
          return true;
        }
      }
    } catch {}
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
// FIND AND CLICK CONNECT
// ═══════════════════════════════════════════════════════════════
async function findAndClickConnect(page) {
  console.log(`\n   ━━━ STEP 1: Locate Connect ━━━`);

  // Try top-level Connect anchor first
  const topLevelHref = await page.evaluate(
    ({ connectSel, bounds }) => {
      const anchors = document.querySelectorAll(connectSel);
      for (const el of anchors) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (
          rect.x > bounds.maxX ||
          rect.y < bounds.minY ||
          rect.y > bounds.maxY
        )
          continue;
        if (el.closest('[role="menu"]')) continue;
        const href = el.getAttribute("href");
        if (href && href.includes("/preload/custom-invite/")) {
          return href;
        }
      }
      return null;
    },
    {
      connectSel: SELECTORS.profile.connectAnchor,
      bounds: SELECTORS.profile.buttonAreaBounds,
    },
  );

  if (topLevelHref) {
    console.log(`   ✅ Connect at TOP LEVEL — href: ${topLevelHref}`);
    return await navigateToConnectUrl(page, topLevelHref);
  }

  console.log(`   ℹ️  Connect NOT at top level — opening More menu`);

  const moreCoords = await findMoreButton(page);
  if (!moreCoords) {
    return { clicked: false, reason: "no_more_menu" };
  }

  console.log(`   🖱️  Clicking More at (${moreCoords.x}, ${moreCoords.y})`);
  await humanMove(page, moreCoords.x, moreCoords.y);
  await randomDelay(400, 800);
  await humanClick(page, moreCoords.x, moreCoords.y);
  await randomDelay(1500, 2500);

  console.log(`   ⏳ Waiting for Connect in dropdown...`);
  let dropdownHref = null;

  for (let i = 0; i < 30; i++) {
    if (!isPageAlive(page)) break;
    await page.waitForTimeout(400);

    dropdownHref = await page.evaluate((dropdownSel) => {
      const anchor = document.querySelector(dropdownSel);
      if (!anchor) return null;
      const rect = anchor.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const href = anchor.getAttribute("href");
      return href && href.includes("/preload/custom-invite/") ? href : null;
    }, SELECTORS.moreDropdown.connectInDropdown);

    if (dropdownHref) break;
  }

  if (!dropdownHref) {
    try {
      await page.keyboard.press("Escape");
    } catch {}
    return { clicked: false, reason: "connect_not_in_dropdown" };
  }

  console.log(`   ✅ Connect found in dropdown — href: ${dropdownHref}`);
  return await navigateToConnectUrl(page, dropdownHref);
}

// ═══════════════════════════════════════════════════════════════
// Navigate to custom-invite URL
// ═══════════════════════════════════════════════════════════════
async function navigateToConnectUrl(page, href) {
  const fullUrl = href.startsWith("/")
    ? "https://www.linkedin.com" + href
    : href;

  console.log(`   🔗 Navigating to: ${fullUrl}`);
  try {
    await safeGoto(page, fullUrl);
    await randomDelay(3000, 5000);
    return { clicked: true, href: fullUrl };
  } catch (err) {
    return { clicked: false, reason: "navigation_failed" };
  }
}

// ═══════════════════════════════════════════════════════════════
// Find More button (modern + legacy)
// ═══════════════════════════════════════════════════════════════
async function findMoreButton(page) {
  return await page.evaluate(
    ({ ariaSelectors, buttonText, expandAttr, bounds }) => {
      // Strategy 1: aria-label
      for (const ariaSel of ariaSelectors) {
        const btns = document.querySelectorAll(ariaSel);
        for (const btn of btns) {
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (
            rect.x > bounds.maxX ||
            rect.y < bounds.minY ||
            rect.y > bounds.maxY
          )
            continue;
          btn.setAttribute("data-more-target", "true");
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }

      // Strategy 2: text-based (modern LinkedIn)
      const allBtns = document.querySelectorAll("button");
      for (const btn of allBtns) {
        const text = (btn.textContent || "").trim();
        if (text !== buttonText) continue;
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (
          rect.x > bounds.maxX ||
          rect.y < bounds.minY ||
          rect.y > bounds.maxY
        )
          continue;
        if (btn.closest("nav, header, .global-nav")) continue;
        if (!btn.hasAttribute(expandAttr)) continue;
        btn.setAttribute("data-more-target", "true");
        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      }
      return null;
    },
    {
      ariaSelectors: SELECTORS.profile.moreButton.ariaSelectors,
      buttonText: SELECTORS.profile.moreButton.buttonText,
      expandAttr: SELECTORS.profile.moreButton.expandableAttr,
      bounds: SELECTORS.profile.buttonAreaBounds,
    },
  );
}

// ═══════════════════════════════════════════════════════════════
// Try to send WITH note
// ═══════════════════════════════════════════════════════════════
async function sendWithNote(page, personalNote) {
  console.log(`\n   ━━━ Trying to send WITH note ━━━`);

  const hasAddNoteBtn = await page
    .evaluate((sel) => {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
      }
      return false;
    }, SELECTORS.inviteFlow.addNoteButton)
    .catch(() => false);

  if (!hasAddNoteBtn) {
    console.log(`   ℹ️  No "Add a note" button — cannot send with note`);
    return { success: false, hadNote: false, notesLimitHit: false };
  }

  const addNoteClicked = await clickAddNote(page);
  if (!addNoteClicked) {
    return { success: false, hadNote: false, notesLimitHit: false };
  }

  // Wait, then check for notes limit popup
  await randomDelay(1500, 2500);
  const modalType = await detectPremiumModalType(page);
  if (modalType === "notes_limit" || modalType === "generic") {
    console.log(
      `   🚨 NOTES LIMIT popup detected after clicking "Add a note"!`,
    );
    return { success: false, hadNote: false, notesLimitHit: true };
  }

  const textareaReady = await waitForNoteTextarea(page, 10);
  if (!textareaReady) {
    console.log(`   ⚠️  Textarea didn't appear`);
    return { success: false, hadNote: false, notesLimitHit: false };
  }

  try {
    const noteField = page.locator(SELECTORS.inviteFlow.noteTextarea).first();
    console.log(`   📝 Typing note (${personalNote.length} chars)...`);
    await noteField.click();
    await randomDelay(500, 1000);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(300, 500);
    await humanTypeText(page, personalNote);
    await randomDelay(1500, 2500);
    console.log(`   ✅ Note typed`);
  } catch (err) {
    console.log(`   ⚠️  Typing failed: ${err.message}`);
    return { success: false, hadNote: false, notesLimitHit: false };
  }

  const sendClicked = await clickSendInvitation(page);
  if (!sendClicked) {
    return { success: false, hadNote: true, notesLimitHit: false };
  }

  // Check for notes limit AFTER Send click too
  await randomDelay(1500, 2500);
  const postSendModal = await detectPremiumModalType(page);
  if (postSendModal === "notes_limit" || postSendModal === "generic") {
    console.log(`   🚨 NOTES LIMIT popup after Send click!`);
    return { success: false, hadNote: true, notesLimitHit: true };
  }

  return { success: true, hadNote: true, notesLimitHit: false };
}

// ═══════════════════════════════════════════════════════════════
// Watch for send result
// ═══════════════════════════════════════════════════════════════
async function watchForSendResult(page, maxSec = 15) {
  console.log(`   🔍 Watching for result (${maxSec}s, polls every 300ms)...`);

  const iterations = Math.floor((maxSec * 1000) / 300);

  for (let i = 0; i < iterations; i++) {
    if (!isPageAlive(page)) return { sent: false, weeklyLimitHit: false };
    await page.waitForTimeout(300);

    if (await isWeeklyLimitReached(page)) {
      console.log(`   🚨 WEEKLY LIMIT toast detected — invitation BLOCKED`);
      return { sent: false, weeklyLimitHit: true };
    }

    if (await detectVerifyPopup(page)) {
      console.log(`   ✅ "Verify" popup appeared — Invitation was SENT!`);
      await dismissVerifyPopup(page);
      return { sent: true, weeklyLimitHit: false, viaVerifyPopup: true };
    }

    const result = await page.evaluate((pendingSel) => {
      const bodyText = (document.body.innerText || "").toLowerCase();
      const hasSuccessToast =
        (bodyText.includes("invitation sent") ||
          bodyText.includes("request sent")) &&
        !bodyText.includes("not sent") &&
        !bodyText.includes("was not");

      const nowPending = !!document.querySelector(pendingSel);

      const hasErrorText =
        bodyText.includes("was not sent") ||
        bodyText.includes("try again next week") ||
        bodyText.includes("weekly limit") ||
        bodyText.includes("reached the weekly");

      return { hasSuccessToast, nowPending, hasErrorText };
    }, SELECTORS.profile.pendingByComponentKey);

    if (result.hasErrorText) {
      return { sent: false, weeklyLimitHit: true };
    }
    if (result.nowPending) {
      console.log(`   ✅ Pending button appeared — SUCCESS`);
      return { sent: true, weeklyLimitHit: false };
    }
    if (result.hasSuccessToast) {
      console.log(`   ✅ Success toast — SUCCESS`);
      return { sent: true, weeklyLimitHit: false };
    }
  }

  console.log(`   ⚠️  Timeout: no confirmation`);
  await page.waitForTimeout(2000);
  if (await isWeeklyLimitReached(page)) {
    return { sent: false, weeklyLimitHit: true };
  }

  return { sent: false, weeklyLimitHit: false, needsProfileCheck: true };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: sendConnectionRequest
// ═══════════════════════════════════════════════════════════════
export async function sendConnectionRequest(
  page,
  personalNote = "",
  profileUrl = "",
) {
  console.log(`\n📨 Sending connection request (pure human flow)...`);

  if (!isPageAlive(page)) {
    return { success: false, reason: "page_closed" };
  }

  try {
    if (await isAlreadyPending(page)) {
      console.log(`   ⏳ Already pending — skip`);
      return {
        success: true,
        hadNote: false,
        alreadyPending: true,
        verified: true,
      };
    }

    // ═══ STEP 1: Find and click Connect ═══
    const connectResult = await findAndClickConnect(page);
    if (!connectResult.clicked) {
      return { success: false, reason: connectResult.reason };
    }

    // Handle any premium modal
    let modalCheck = await detectPremiumModalType(page);
    if (modalCheck === "generic" || modalCheck === "inmail_limit") {
      console.log(`   💎 Premium modal appeared — dismissing`);
      await dismissPremiumModal(page);
      await randomDelay(2000, 3000);
    }

    // Wait for invite dialog
    let dialogAppeared = await isInviteDialogOpen(page);
    if (!dialogAppeared) {
      dialogAppeared = await waitForInviteDialog(page, 15);
    }

    if (!dialogAppeared) {
      if (await isAlreadyPending(page)) {
        return {
          success: true,
          hadNote: false,
          alreadyPending: true,
          verified: true,
        };
      }
      return { success: false, reason: "dialog_never_appeared" };
    }

    // ═══ STEP 2: Try with note first ═══
    let noteAdded = false;
    let sentWithoutNote = false;
    let sendClicked = false;
    let notesLimitHit = false;

    if (personalNote && personalNote.length > 0) {
      const noteResult = await sendWithNote(page, personalNote);

      if (noteResult.notesLimitHit) {
        // ═══ NOTES LIMIT HIT — fallback to "Send without a note" ═══
        notesLimitHit = true;
        console.log(
          `\n   ━━━ NOTES LIMIT HIT — falling back to "Send without note" ━━━`,
        );

        // Step 1: Dismiss the premium popup
        console.log(`   🚪 Dismissing premium popup...`);
        await dismissPremiumModal(page);
        await randomDelay(2000, 3000);

        // Step 2: CRITICAL — Navigate BACK to profile page first
        if (!profileUrl) {
          console.log(`   ⚠️  No profileUrl provided — cannot navigate back`);
          return {
            success: false,
            reason: "notes_limit_no_profile_url",
            notesLimitHit: true,
          };
        }

        console.log(`   🌐 Navigating back to profile: ${profileUrl}`);
        const navBack = await safeGoto(page, profileUrl);
        if (!navBack) {
          return {
            success: false,
            reason: "notes_limit_nav_back_failed",
            notesLimitHit: true,
          };
        }
        await randomDelay(3000, 5000);

        // Step 3: Re-click Connect (on profile page now)
        console.log(`   🔄 Re-clicking Connect to reopen invite dialog...`);
        const retryConnect = await findAndClickConnect(page);
        if (!retryConnect.clicked) {
          console.log(`   ❌ Re-click failed: ${retryConnect.reason}`);
          return {
            success: false,
            reason: "notes_limit_and_retry_failed",
            notesLimitHit: true,
          };
        }

        // Step 4: Handle any premium modal
        modalCheck = await detectPremiumModalType(page);
        if (modalCheck === "generic") {
          await dismissPremiumModal(page);
          await randomDelay(2000, 3000);
        }

        // Step 5: Wait for invite dialog
        const retryDialogOpen = await waitForInviteDialog(page, 15);
        if (!retryDialogOpen) {
          console.log(`   ⚠️  Invite dialog didn't open on retry`);
          return {
            success: false,
            reason: "notes_limit_dialog_never_appeared_on_retry",
            notesLimitHit: true,
          };
        }
        await randomDelay(1000, 2000);

        // Step 6: Click "Send without a note"
        console.log(`   → Falling back to "Send without a note"`);
        sendClicked = await clickSendWithoutNote(page);
        if (sendClicked) {
          sentWithoutNote = true;
          noteAdded = false;
          console.log(`   ✅ Sent without note (after notes limit fallback)`);
        } else {
          return {
            success: false,
            reason: "send_without_note_failed_after_notes_limit",
            notesLimitHit: true,
          };
        }
      } else if (noteResult.success) {
        sendClicked = true;
        noteAdded = true;
      }
    }

    // If no note OR previous attempts failed → send without note
    if (!sendClicked) {
      console.log(`   → Sending without note (no personal note provided)`);
      sendClicked = await clickSendWithoutNote(page);
      if (sendClicked) {
        sentWithoutNote = true;
        noteAdded = false;
      }
    }

    if (!sendClicked) {
      return { success: false, reason: "send_failed" };
    }

    // ═══ STEP 3: Watch for result ═══
    console.log(`\n   ━━━ Watching for send result ━━━`);
    const result = await watchForSendResult(page, 15);

    if (result.weeklyLimitHit) {
      return {
        success: false,
        reason: "weekly_limit_reached",
        weeklyLimitHit: true,
        hadNote: noteAdded,
      };
    }

    // ── If notes-limit fallback OR verify failed → ALWAYS check profile ──
    const shouldForceProfileCheck = notesLimitHit || result.needsProfileCheck;

    if (result.sent && !shouldForceProfileCheck) {
      console.log(`   ✅ Connection sent successfully!`);
      if (result.viaVerifyPopup) {
        console.log(`   ℹ️  Confirmed via "Verify in 2 minutes" popup`);
      }
      return {
        success: true,
        hadNote: noteAdded,
        sentWithoutNote,
        notesLimitHit,
        verified: true,
      };
    }

    // Profile check to verify Pending
    if (profileUrl) {
      console.log(`\n   🔄 Navigating to profile to verify Pending status...`);
      try {
        await safeGoto(page, profileUrl);
        await randomDelay(3000, 5000);

        if (await isAlreadyPending(page)) {
          console.log(`   ✅ VERIFIED Pending on profile — SUCCESS`);
          return {
            success: true,
            hadNote: noteAdded,
            sentWithoutNote,
            notesLimitHit,
            verified: true,
          };
        }

        if (await isWeeklyLimitReached(page)) {
          console.log(`   🚨 WEEKLY LIMIT (found on profile refresh)`);
          return {
            success: false,
            reason: "weekly_limit_reached",
            weeklyLimitHit: true,
            hadNote: noteAdded,
          };
        }

        console.log(
          `   ⚠️  No Pending state found — LinkedIn silently dropped`,
        );
        return {
          success: false,
          reason: "silently_dropped",
          hadNote: noteAdded,
          sentWithoutNote,
        };
      } catch (err) {
        console.log(`   ⚠️  Profile check error: ${err.message}`);
      }
    }

    return {
      success: false,
      reason: "unclear_result",
      hadNote: noteAdded,
      sentWithoutNote,
    };
  } catch (err) {
    console.log(`   ❌ Connection error: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// INCOMING INVITATION CHECK
// ═══════════════════════════════════════════════════════════════
export async function checkIncomingInvitation(page, targetPersonName = "") {
  console.log(`   🔍 Checking for incoming invitation...`);
  if (!isPageAlive(page)) return { hasIncoming: false };

  try {
    const result = await page.evaluate(
      ({ personName, acceptBtnSel }) => {
        const targetFirstName = personName.split(" ")[0].toLowerCase();
        const acceptBtns = document.querySelectorAll(acceptBtnSel);

        for (const btn of acceptBtns) {
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.y < 100 || rect.y > window.innerHeight - 100) continue;
          if (rect.x < 100 || rect.x > 1100) continue;

          const ariaLabel = (
            btn.getAttribute("aria-label") || ""
          ).toLowerCase();
          if (
            personName &&
            targetFirstName &&
            !ariaLabel.includes(targetFirstName)
          )
            continue;

          let parent = btn.parentElement;
          let hasIgnoreNearby = false;
          for (let i = 0; i < 6; i++) {
            if (!parent) break;
            const ignoreBtns = parent.querySelectorAll("button");
            for (const b of ignoreBtns) {
              const btnText = (b.textContent || "").trim().toLowerCase();
              const btnAria = (
                b.getAttribute("aria-label") || ""
              ).toLowerCase();
              if (btnText === "ignore" || btnAria.includes("ignore")) {
                const iRect = b.getBoundingClientRect();
                if (iRect.width > 0 && iRect.height > 0 && iRect.y > 100) {
                  hasIgnoreNearby = true;
                  break;
                }
              }
            }
            if (hasIgnoreNearby) break;
            parent = parent.parentElement;
          }

          if (!hasIgnoreNearby) continue;

          btn.setAttribute("data-accept-btn", "true");
          return {
            hasIncoming: true,
            ariaLabel: btn.getAttribute("aria-label"),
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }

        return { hasIncoming: false };
      },
      {
        personName: targetPersonName,
        acceptBtnSel: SELECTORS.profile.incomingAcceptButton,
      },
    );

    if (result.hasIncoming) {
      console.log(`   💌 Incoming: "${result.ariaLabel}"`);
    } else {
      console.log(`   ℹ️  No incoming invitation`);
    }
    return result;
  } catch (err) {
    return { hasIncoming: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCEPT INCOMING INVITATION
// ═══════════════════════════════════════════════════════════════
export async function acceptIncomingInvitation(page, acceptCoords) {
  console.log(`   ✅ Accepting incoming invitation...`);
  if (!isPageAlive(page)) return { success: false, reason: "page_closed" };

  try {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (btn) btn.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await randomDelay(1500, 2500);

    const freshCoords = await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    const coords = freshCoords || acceptCoords;
    await humanClick(page, coords.x, coords.y);
    await randomDelay(3000, 5000);

    const accepted = await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (!btn) return true;
      const rect = btn.getBoundingClientRect();
      return rect.width === 0 || rect.height === 0;
    });

    await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (btn) btn.removeAttribute("data-accept-btn");
    });

    if (accepted) {
      console.log(`   ✅ Invitation ACCEPTED!`);
      return { success: true };
    }
    return { success: false, reason: "not_confirmed" };
  } catch (err) {
    return { success: false, reason: "error", error: err.message };
  }
}
