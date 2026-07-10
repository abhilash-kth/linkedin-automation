import { randomDelay, random } from "./delay.helper.js";

export async function humanMouseMove(page) {
  const x = Math.floor(random(100, 1100));
  const y = Math.floor(random(100, 700));
  const steps = Math.floor(15 + Math.random() * 20);
  await page.mouse.move(x, y, { steps });
}

export async function humanScroll(page) {
  const scrolls = 2 + Math.floor(random(0, 3));
  for (let i = 0; i < scrolls; i++) {
    const amount = random(180, 750);
    await page.evaluate((y) => window.scrollBy(0, y), amount);
    await humanMouseMove(page);
    await randomDelay(900, 2300);
  }
}

export async function humanType(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector);
  await randomDelay(400, 800);

  const words = text.split(/\s+/);
  for (const word of words) {
    for (const char of word) {
      await page.keyboard.type(char, { delay: random(35, 95) });

      if (Math.random() < 0.04) {
        await page.keyboard.type(
          String.fromCharCode(97 + ((Math.random() * 26) | 0)),
        );
        await randomDelay(120, 280);
        await page.keyboard.press("Backspace");
      }
    }
    await page.keyboard.type(" ");
    await randomDelay(90, 380);
  }
}

export async function behaveLikeHuman(page) {
  await humanScroll(page);
  await randomDelay(1400, 3200);

  for (let i = 0; i < 6; i++) {
    await humanMouseMove(page);
    await randomDelay(450, 1450);
  }
}

export { randomDelay };