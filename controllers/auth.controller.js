import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

import dotenv from "dotenv";
dotenv.config();

import config from "../config/config.js";
import { randomDelay } from "../helpers/human-behavior.helper.js";
import { mkdir } from "fs/promises";

async function humanTypeLogin(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector);
  await randomDelay(400, 800);

  for (const char of text) {
    await page.keyboard.type(char, { delay: 80 + Math.random() * 120 });
    if (Math.random() < 0.02) {
      await page.keyboard.type(
        String.fromCharCode(97 + ((Math.random() * 26) | 0)),
      );
      await randomDelay(150, 300);
      await page.keyboard.press("Backspace");
    }
  }
}

export async function autoLogin(accountId) {
  const account = config.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);
  if (!account.email || !account.password)
    throw new Error(`Credentials missing for ${accountId}`);

  const profileDir = `${config.paths.profiles}/${accountId}`;
  await mkdir(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: {
      width: 1380 + Math.floor(Math.random() * 80),
      height: 820 + Math.floor(Math.random() * 60),
    },
    userAgent: account.userAgent,
    locale: "en-US",
    timezoneId: config.timezone,
    bypassCSP: true,
    ignoreHTTPSErrors: true,
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Check if already logged in
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await randomDelay(2000, 3500);

    if ((await page.locator("nav.global-nav").count()) > 0) {
      console.log(`✅ ${accountId} already logged in`);
      await context.close();
      return;
    }

    console.log(`🔐 Logging in as ${accountId}...`);
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });
    await randomDelay(2000, 4000);

    await humanTypeLogin(page, "#username", account.email);
    await randomDelay(800, 2000);
    await humanTypeLogin(page, "#password", account.password);
    await randomDelay(1200, 2800);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/feed/**", { timeout: 30000 });
    await randomDelay(3000, 5500);

    console.log(`✅ Logged in as ${accountId}`);
  } catch (err) {
    console.error(`❌ Login error: ${err.message}`);
  } finally {
    await context.close();
    console.log(`🔒 Browser closed`);
  }
}

// export async function manualLogin(accountId) {
//   const account = config.accounts.find((a) => a.id === accountId);
//   if (!account) throw new Error(`Account "${accountId}" not found`);

//   const profileDir = `${config.paths.profiles}/${accountId}`;
//   await mkdir(profileDir, { recursive: true });

//   console.log(`\n🚀 Opening browser for manual login...`);

//   const context = await chromium.launchPersistentContext(profileDir, {
//     headless: false,
//     viewport: { width: 1400, height: 900 },
//     userAgent: account.userAgent,
//     locale: "en-US",
//     timezoneId: config.timezone,
//     args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
//   });

//   const page = context.pages()[0] || (await context.newPage());

//   await page.addInitScript(() => {
//     Object.defineProperty(navigator, "webdriver", { get: () => undefined });
//   });

//   await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
//   console.log(`\n👇 Please login manually in the browser window\n`);

//   let attempts = 0;
//   while (attempts < 200) {
//     if (page.url().includes("/feed")) {
//       console.log(`\n✅ Logged in! Session saved.`);
//       await page.waitForTimeout(10000);
//       await context.close();
//       console.log(`🔒 Browser closed\n`);
//       return;
//     }
//     await page.waitForTimeout(3000);
//     attempts++;
//     if (attempts % 10 === 0) console.log(`   ⏳ Waiting... (${attempts * 3}s)`);
//   }

//   console.log(`\n⚠️  Timeout — closing`);
//   await context.close();
// }

export async function manualLogin(accountId) {
  try {
    console.log("🚀 Starting manual login...");

    const account = config.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Account "${accountId}" not found`);
    }

    const profileDir = `${config.paths.profiles}/${accountId}`;
    await mkdir(profileDir, { recursive: true });

    console.log("📁 Profile:", profileDir);

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1400, height: 900 },
      locale: "en-US",
      timezoneId: config.timezone || "Asia/Kolkata",
      userAgent: account.userAgent,
      ignoreHTTPSErrors: true,
      args: [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-first-run",
      ],
    });

    console.log("✅ Browser launched");

    let page;

    if (context.pages().length > 0) {
      page = context.pages()[0];
    } else {
      page = await context.newPage();
    }

    console.log("✅ Page created");

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    console.log("🌍 Opening LinkedIn...");

    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "load",
      timeout: 60000,
    });

    console.log("✅ LinkedIn opened");

    console.log("\n=======================================");
    console.log("Login manually in the browser.");
    console.log("When LinkedIn opens the feed,");
    console.log("the session will be saved automatically.");
    console.log("=======================================\n");

    while (true) {
      await page.waitForTimeout(3000);

      const url = page.url();

      console.log("Current URL:", url);

      if (url.includes("/feed")) {
        console.log("\n✅ Login detected!");
        console.log("💾 Saving session...");

        await page.waitForTimeout(5000);

        await context.close();

        console.log("✅ Session saved successfully.");
        return;
      }
    }
  } catch (err) {
    console.error("\n❌ Manual Login Error");
    console.error(err);

    if (err.stack) {
      console.error(err.stack);
    }
  }
}
