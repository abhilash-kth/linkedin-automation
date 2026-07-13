import { humanMove } from "./human-click.helper.js";
import { randomDelay } from "./delay.helper.js";

/**
 * Scroll a specific element into viewport center, then return fresh coordinates
 * This is the CORE fix — every click target must be scrolled into view individually
 */
export async function scrollToElementAndGetCoords(page, selector, options = {}) {
  const { maxAttempts = 3, description = "element" } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Step 1: Scroll element into center
    const exists = await page.evaluate((sel) => {
      const el = typeof sel === "string"
        ? document.querySelector(sel)
        : null;
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    }, selector);

    if (!exists) return null;

    // Step 2: Wait for scroll to settle
    await randomDelay(800, 1500);

    // Step 3: Get FRESH coordinates
    const coords = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const inViewport =
        rect.y >= 50 &&
        rect.y <= window.innerHeight - 50 &&
        rect.x >= 0 &&
        rect.x <= window.innerWidth;

      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
        w: Math.floor(rect.width),
        h: Math.floor(rect.height),
        inViewport,
        rawY: Math.floor(rect.y),
      };
    }, selector);

    if (coords && coords.inViewport) {
      return coords;
    }

    if (attempt < maxAttempts) {
      // Fine-tune scroll
      if (coords) {
        await page.evaluate((rawY) => {
          window.scrollBy({ top: rawY - 350, behavior: "smooth" });
        }, coords.rawY);
        await randomDelay(1000, 1800);
      }
    }
  }

  return null;
}

/**
 * Same but with a data-attribute selector within a post container
 */
export async function scrollPostElementIntoView(page, postIndex, innerSelector) {
  const tag = `__scroll_target_${Date.now()}`;

  // Tag the element
  const tagged = await page.evaluate((data) => {
    const container = document.querySelector(`[data-post-index="${data.idx}"]`);
    if (!container) return false;
    const el = container.querySelector(data.sel);
    if (!el) return false;
    el.setAttribute(data.tag, "true");
    return true;
  }, { idx: postIndex, sel: innerSelector, tag });

  if (!tagged) return null;

  const coords = await scrollToElementAndGetCoords(page, `[${tag}="true"]`);

  // Cleanup tag
  await page.evaluate((t) => {
    const el = document.querySelector(`[${t}="true"]`);
    if (el) el.removeAttribute(t);
  }, tag);

  return coords;
}