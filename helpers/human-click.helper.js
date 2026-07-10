import { random, randomDelay } from "./delay.helper.js";

export async function humanMove(page, x, y) {
  const steps = 8 + Math.floor(Math.random() * 7);
  await page.mouse.move(x, y, { steps });
}

export async function humanClick(page, x, y) {
  const offsetX = -5 + Math.random() * 10;
  const offsetY = -5 + Math.random() * 10;
  await humanMove(page, x + offsetX, y + offsetY);
  await page.waitForTimeout(100 + Math.random() * 200);
  await page.mouse.click(x, y, { delay: 50 + Math.random() * 100 });
}

export async function humanTypeText(page, text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    await page.keyboard.type(char, { delay: 0 });
    await page.waitForTimeout(50 + Math.random() * 90);

    if (Math.random() < 0.04 && i > 10) {
      await page.waitForTimeout(300 + Math.random() * 700);
    }

    if (Math.random() < 0.02 && i > 5) {
      const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await page.keyboard.type(wrongChar, { delay: 0 });
      await page.waitForTimeout(200 + Math.random() * 250);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(150 + Math.random() * 100);
    }
  }
}