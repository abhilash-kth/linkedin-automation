import { randomDelay } from "../../helpers/delay.helper.js";

export async function checkSession(page) {
  console.log(`🔍 Checking session...`);
  try {
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch {}
  await randomDelay(4000, 6000);

  const url = page.url();
  if (
    url.includes("/login") ||
    url.includes("/authwall") ||
    url.includes("/checkpoint") ||
    url.includes("/challenge")
  ) {
    console.log(`   ❌ Session invalid`);
    return false;
  }

  if (url.includes("/feed")) {
    console.log(`   ✅ Session valid`);
    return true;
  }
  return false;
}