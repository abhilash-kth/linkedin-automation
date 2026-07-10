import { humanClick } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";

export async function dismissPremiumModal(page) {
  const found = await page.evaluate(() => {
    const modalSelectors = [
      ".modal-upsell",
      '[aria-labelledby="modal-upsell-header"]',
      ".artdeco-modal--layer-default",
      '[role="dialog"]',
    ];

    for (const sel of modalSelectors) {
      const modals = document.querySelectorAll(sel);
      for (const modal of modals) {
        const rect = modal.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (modal.textContent || "").toLowerCase();
        if (
          text.includes("try premium") ||
          text.includes("out of free") ||
          text.includes("custom notes") ||
          (text.includes("inmail credit") && text.includes("upgrade")) ||
          (text.includes("premium") && text.includes("upgrade"))
        ) {
          return true;
        }
      }
    }
    return false;
  });

  if (found) {
    console.log(`   ⚠️  Premium modal detected — dismissing...`);
    const dismissCoords = await page.evaluate(() => {
      const selectors = [
        'button[aria-label="Dismiss"]',
        'button[data-test-modal-close-btn]',
        ".artdeco-modal__dismiss",
        'button[aria-label*="Close" i]',
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
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
    });

    if (dismissCoords) {
      await humanClick(page, dismissCoords.x, dismissCoords.y);
    } else {
      await page.keyboard.press("Escape");
    }
    await randomDelay(2000, 3500);
    return true;
  }
  return false;
}