// import { humanClick } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";

// export async function dismissPremiumModal(page) {
//   const found = await page.evaluate(() => {
//     const modalSelectors = [
//       ".modal-upsell",
//       '[aria-labelledby="modal-upsell-header"]',
//       ".artdeco-modal--layer-default",
//       '[role="dialog"]',
//     ];

//     for (const sel of modalSelectors) {
//       const modals = document.querySelectorAll(sel);
//       for (const modal of modals) {
//         const rect = modal.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         const text = (modal.textContent || "").toLowerCase();
//         if (
//           text.includes("try premium") ||
//           text.includes("out of free") ||
//           text.includes("custom notes") ||
//           (text.includes("inmail credit") && text.includes("upgrade")) ||
//           (text.includes("premium") && text.includes("upgrade"))
//         ) {
//           return true;
//         }
//       }
//     }
//     return false;
//   });

//   if (found) {
//     console.log(`   ⚠️  Premium modal detected — dismissing...`);
//     const dismissCoords = await page.evaluate(() => {
//       const selectors = [
//         'button[aria-label="Dismiss"]',
//         'button[data-test-modal-close-btn]',
//         ".artdeco-modal__dismiss",
//         'button[aria-label*="Close" i]',
//       ];
//       for (const sel of selectors) {
//         const btn = document.querySelector(sel);
//         if (btn) {
//           const rect = btn.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }
//       }
//       return null;
//     });

//     if (dismissCoords) {
//       await humanClick(page, dismissCoords.x, dismissCoords.y);
//     } else {
//       await page.keyboard.press("Escape");
//     }
//     await randomDelay(2000, 3500);
//     return true;
//   }
//   return false;
// }

import { humanClick } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import SELECTORS from "../../config/selectors.js";

// ═══════════════════════════════════════════════════════════════════
// Detect what TYPE of premium modal is open
// Returns: 'notes_limit' | 'inmail_limit' | 'generic' | null
// ═══════════════════════════════════════════════════════════════════
export async function detectPremiumModalType(page) {
  try {
    return await page.evaluate(
      ({ modalSels, notesLimit, inMailLimit, textPatterns }) => {
        const modalSelector = modalSels.join(", ");
        const modals = document.querySelectorAll(modalSelector);

        for (const modal of modals) {
          const rect = modal.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const text = (modal.textContent || "").toLowerCase();

          // ── Check for notes limit popup (highest priority) ──
          if (text.includes(notesLimit.headerText)) {
            return "notes_limit";
          }
          for (const pattern of notesLimit.bodyTextPatterns) {
            if (text.includes(pattern.toLowerCase())) {
              return "notes_limit";
            }
          }

          // ── Check for InMail limit popup ──
          if (text.includes(inMailLimit.headerText)) {
            return "inmail_limit";
          }
          for (const pattern of inMailLimit.bodyTextPatterns) {
            if (text.includes(pattern.toLowerCase())) {
              return "inmail_limit";
            }
          }

          // ── Check for generic premium modal ──
          for (const pattern of textPatterns) {
            if (text.includes(pattern.toLowerCase())) {
              return "generic";
            }
          }
        }

        return null;
      },
      {
        modalSels: SELECTORS.premium.modal,
        notesLimit: SELECTORS.premium.notesLimitPopup,
        inMailLimit: SELECTORS.premium.inMailLimitPopup,
        textPatterns: SELECTORS.premium.modalTextPatterns,
      },
    );
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Check if ANY premium modal is currently open
// ═══════════════════════════════════════════════════════════════════
export async function isPremiumModalOpen(page) {
  const type = await detectPremiumModalType(page);
  return type !== null;
}

// ═══════════════════════════════════════════════════════════════════
// Dismiss the premium modal
// Returns: { dismissed: bool, type: 'notes_limit'|'inmail_limit'|'generic'|null }
// ═══════════════════════════════════════════════════════════════════
export async function dismissPremiumModal(page) {
  const type = await detectPremiumModalType(page);

  if (!type) {
    return { dismissed: false, type: null };
  }

  console.log(`   💎 Premium modal detected (type: ${type}) — dismissing...`);

  // Find dismiss button coords
  const dismissCoords = await page.evaluate((selectors) => {
    const selectorList = selectors.join(", ");
    const btns = document.querySelectorAll(selectorList);

    // Prefer the button inside a visible modal
    for (const btn of btns) {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Verify it's inside a modal
      const modal = btn.closest(
        '[role="dialog"], .artdeco-modal, .modal-upsell, [data-test-modal]',
      );
      if (!modal) continue;

      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    }

    return null;
  }, SELECTORS.premium.dismissButton);

  if (dismissCoords) {
    await humanClick(page, dismissCoords.x, dismissCoords.y);
    await randomDelay(1500, 2500);
  } else {
    // Fallback: Escape key
    await page.keyboard.press("Escape").catch(() => {});
    await randomDelay(1500, 2500);
  }

  // Verify dismissal
  const stillOpen = await isPremiumModalOpen(page);
  if (stillOpen) {
    console.log(`   ⚠️  Modal still open — trying Escape again`);
    await page.keyboard.press("Escape").catch(() => {});
    await randomDelay(1000, 2000);
  }

  return { dismissed: true, type };
}

// ═══════════════════════════════════════════════════════════════════
// Detect the "Verify in 2 minutes" success popup
// This popup CONFIRMS the invitation was sent successfully
// ═══════════════════════════════════════════════════════════════════
export async function detectVerifyPopup(page) {
  try {
    return await page.evaluate(
      ({ container, textPatterns, successText }) => {
        const dialog = document.querySelector(container);
        if (!dialog) return false;

        const rect = dialog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const text = (dialog.textContent || "").toLowerCase();

        // Check for success text or verify patterns
        if (text.includes(successText.toLowerCase())) return true;
        for (const pattern of textPatterns) {
          if (text.includes(pattern.toLowerCase())) return true;
        }

        return false;
      },
      {
        container: SELECTORS.verifyPopup.container,
        textPatterns: SELECTORS.verifyPopup.textPatterns,
        successText: SELECTORS.verifyPopup.successText,
      },
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Dismiss the "Verify in 2 minutes" popup by clicking "Not now"
// ═══════════════════════════════════════════════════════════════════
export async function dismissVerifyPopup(page) {
  const detected = await detectVerifyPopup(page);
  if (!detected) return false;

  console.log(`   ✅ "Verify in 2 minutes" popup detected (invitation was sent)`);
  console.log(`   🖱️  Clicking "Not now" to dismiss...`);

  const notNowCoords = await page.evaluate(
    ({ container, dismissText }) => {
      const dialog = document.querySelector(container);
      if (!dialog) return null;

      // Find button with text "Not now"
      const buttons = dialog.querySelectorAll("button");
      for (const btn of buttons) {
        const text = (btn.textContent || "").trim();
        if (text === dismissText) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return null;
    },
    {
      container: SELECTORS.verifyPopup.container,
      dismissText: SELECTORS.verifyPopup.dismissButtonText,
    },
  );

  if (notNowCoords) {
    await humanClick(page, notNowCoords.x, notNowCoords.y);
    await randomDelay(1500, 2500);
    console.log(`   ✅ "Not now" clicked`);
    return true;
  }

  // Fallback: Escape
  console.log(`   🔄 "Not now" button not found — pressing Escape`);
  await page.keyboard.press("Escape").catch(() => {});
  await randomDelay(1500, 2500);
  return true;
}