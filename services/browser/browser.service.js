// // import { chromium } from "playwright-extra";
// // import stealth from "puppeteer-extra-plugin-stealth";
// // chromium.use(stealth());

// // import config from "../../config/config.js";
// // import { mkdir } from "fs/promises";

// // export async function launchBrowser(accountId) {
// //   const account = config.accounts.find((a) => a.id === accountId);
// //   if (!account) throw new Error(`Account "${accountId}" not found`);

// //   const profileDir = `./profiles/${accountId}`;
// //   try {
// //     await mkdir(profileDir, { recursive: true });
// //   } catch {}

// //   const context = await chromium.launchPersistentContext(profileDir, {
// //     headless: false,
// //     slowMo: 60,
// //     viewport: { width: 1400, height: 900 },
// //     userAgent: account.userAgent,
// //     locale: "en-US",
// //     timezoneId: config.timezone,
// //     bypassCSP: true,
// //     ignoreHTTPSErrors: true,
// //     args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
// //   });

// //   const page = context.pages()[0] || (await context.newPage());

// //   // Stealth setup
// //   await page.addInitScript(() => {
// //     Object.defineProperty(navigator, "webdriver", { get: () => undefined });
// //     window.chrome = { runtime: {} };
// //     Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
// //     Object.defineProperty(navigator, "languages", {
// //       get: () => ["en-US", "en"],
// //     });
// //   });

// //   return { context, page, account };
// // }

// // export async function closeBrowser(context) {
// //   try {
// //     await context.close();
// //   } catch {}
// // }

// import { chromium } from "playwright-extra";
// import stealth from "puppeteer-extra-plugin-stealth";
// chromium.use(stealth());

// import config from "../../config/config.js";
// import { mkdir } from "fs/promises";

// // export async function launchBrowser(accountId) {
// //   const account = config.accounts.find((a) => a.id === accountId);
// //   if (!account) throw new Error(`Account "${accountId}" not found`);

// //   const profileDir = `./profiles/${accountId}`;
// //   try {
// //     await mkdir(profileDir, { recursive: true });
// //   } catch {}

// //   const context = await chromium.launchPersistentContext(profileDir, {
// //     headless: false,
// //     slowMo: 60,
// //     viewport: { width: 1400, height: 900 },
// //     userAgent: account.userAgent,
// //     locale: "en-US",
// //     timezoneId: config.timezone,
// //     bypassCSP: true,
// //     ignoreHTTPSErrors: true,
// //     permissions: ["clipboard-read", "clipboard-write"], // ← ADDED FOR COMMENT COPY
// //     args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
// //   });

// //   // Grant clipboard permission
// //   try {
// //     await context.grantPermissions(["clipboard-read", "clipboard-write"], {
// //       origin: "https://www.linkedin.com",
// //     });
// //   } catch {}

// //   const page = context.pages()[0] || (await context.newPage());

// //   await page.addInitScript(() => {
// //     Object.defineProperty(navigator, "webdriver", { get: () => undefined });
// //     window.chrome = { runtime: {} };
// //     Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
// //     Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
// //   });

// //   return { context, page, account };
// // }
// export async function launchBrowser(accountId) {
//   const account = config.accounts.find((a) => a.id === accountId);
//   if (!account) throw new Error(`Account "${accountId}" not found`);

//   const profileDir = `./profiles/${accountId}`;
//   try {
//     await mkdir(profileDir, { recursive: true });
//   } catch {}

//   const context = await chromium.launchPersistentContext(profileDir, {
//     headless: false,           // ← MUST be false for LinkedIn (prevents detection)
//     slowMo: 60,
//     viewport: { width: 1400, height: 900 },
//     userAgent: account.userAgent,
//     locale: "en-US",
//     timezoneId: config.timezone,
//     bypassCSP: true,
//     ignoreHTTPSErrors: true,
//     permissions: ["clipboard-read", "clipboard-write"],
//     args: [
//       "--no-sandbox",
//       "--disable-blink-features=AutomationControlled",
//       "--disable-infobars",
//       "--start-maximized",           // ← ADD
//       "--disable-dev-shm-usage",     // ← ADD (better memory)
//       "--disable-gpu",               // ← ADD (prevent GPU issues)
//     ],
//   });

//   try {
//     await context.grantPermissions(["clipboard-read", "clipboard-write"], {
//       origin: "https://www.linkedin.com",
//     });
//   } catch {}

//   const page = context.pages()[0] || (await context.newPage());

//   await page.addInitScript(() => {
//     Object.defineProperty(navigator, "webdriver", { get: () => undefined });
//     window.chrome = { runtime: {} };
//     Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
//     Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
//   });

//   return { context, page, account };
// }

// export async function closeBrowser(context) {
//   try {
//     await context.close();
//   } catch {}
// }

import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

import config from "../../config/config.js";
import SELECTORS from "../../config/selectors.js";
import { mkdir } from "fs/promises";

// ═══════════════════════════════════════════════════════════════════
// Launch browser with LinkedIn-specific stealth + tab blocking
// ═══════════════════════════════════════════════════════════════════
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
    permissions: ["clipboard-read", "clipboard-write"],
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "https://www.linkedin.com",
    });
  } catch {}

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

  // ── AUTO-BLOCK external tabs ──
  // When LinkedIn posts contain external URLs, clicking them opens a new tab.
  // We auto-close these tabs so they don't interfere with automation.
  setupTabBlocker(context);

  return { context, page, account };
}

// ═══════════════════════════════════════════════════════════════════
// Set up automatic blocker for external tabs
// ═══════════════════════════════════════════════════════════════════
export function setupTabBlocker(context) {
  context.on("page", async (newPage) => {
    try {
      // Wait briefly for the URL to load
      await newPage
        .waitForLoadState("domcontentloaded", { timeout: 3000 })
        .catch(() => {});

      const finalUrl = newPage.url();

      // Check if URL is an allowed domain
      const allowed = SELECTORS.externalTabs.allowedDomains;
      const isBlank = finalUrl === SELECTORS.externalTabs.blankUrl;
      const isAllowed = allowed.some((domain) => finalUrl.includes(domain));

      if (!isBlank && !isAllowed) {
        console.log(
          `   🚫 Blocking external tab: ${finalUrl.substring(0, 80)}`,
        );
        await newPage.close().catch(() => {});
      }
    } catch {}
  });
}

// ═══════════════════════════════════════════════════════════════════
// Manually close any extra tabs (call this after risky operations)
// ═══════════════════════════════════════════════════════════════════
export async function closeExtraTabs(page) {
  try {
    const context = page.context();
    const pages = context.pages();
    const allowed = SELECTORS.externalTabs.allowedDomains;

    for (const p of pages) {
      if (p === page || p.isClosed()) continue;

      const url = p.url();
      const isBlank = url === SELECTORS.externalTabs.blankUrl;
      const isAllowed = allowed.some((d) => url.includes(d));

      if (!isBlank && !isAllowed) {
        console.log(`   🗑️  Closing extra tab: ${url.substring(0, 60)}`);
        await p.close().catch(() => {});
      }
    }
  } catch {}
}

export async function closeBrowser(context) {
  try {
    await context.close();
  } catch {}
}