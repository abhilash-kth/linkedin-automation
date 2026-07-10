import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

import config from "../../config/config.js";
import { mkdir } from "fs/promises";

export async function launchBrowser(accountId) {
  const account = config.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Account "${accountId}" not found`);

  const profileDir = `./profiles/${accountId}`;
  try {
    await mkdir(profileDir, { recursive: true });
  } catch {}

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 60,
    viewport: { width: 1400, height: 900 },
    userAgent: account.userAgent,
    locale: "en-US",
    timezoneId: config.timezone,
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());

  // Stealth setup
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  return { context, page, account };
}

export async function closeBrowser(context) {
  try {
    await context.close();
  } catch {}
}