import { randomDelay, random } from "../../helpers/delay.helper.js";

async function humanMove(page, x, y) {
  const steps = 8 + Math.floor(Math.random() * 7);
  await page.mouse.move(x, y, { steps });
}

export async function safeGoto(page, url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   🌐 Navigating (attempt ${attempt}/${maxRetries})...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await randomDelay(3000, 5000);
      return true;
    } catch (err) {
      console.log(`   ⚠️  Nav failed: ${err.message}`);
      if (attempt < maxRetries) await randomDelay(5000, 8000);
    }
  }
  return false;
}

// export async function humanRefreshPage(page) {
//   console.log(`   🔄 Refreshing page like a human...`);
//   await randomDelay(2000, 4000);
//   const x = Math.floor(random(200, 800));
//   const y = Math.floor(random(100, 400));
//   await humanMove(page, x, y);
//   await randomDelay(500, 1200);

//   try {
//     await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
//     await randomDelay(4000, 6000);
//     console.log(`   ✅ Page refreshed`);
//     return true;
//   } catch (err) {
//     console.log(`   ⚠️  Reload failed: ${err.message}`);
//     return false;
//   }
// }
export async function humanRefreshPage(page) {
  console.log(`   🔄 Refreshing page like a human...`);

  // Safety check
  if (page.isClosed()) {
    console.log(`   ⚠️  Page already closed — can't refresh`);
    return false;
  }

  await randomDelay(2000, 4000);

  try {
    const x = Math.floor(random(200, 800));
    const y = Math.floor(random(100, 400));
    await humanMove(page, x, y);
    await randomDelay(500, 1200);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await randomDelay(4000, 6000);
    console.log(`   ✅ Page refreshed`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  Reload failed: ${err.message}`);
    return false;
  }
}

export async function closeMessagingOverlays(page) {
  await page.evaluate(() => {
    const closeButtons = document.querySelectorAll(
      '.msg-overlay-bubble-header__control[aria-label*="Close" i], ' +
        '.msg-overlay-bubble-header button[aria-label*="Close" i]',
    );
    closeButtons.forEach((btn) => {
      try {
        btn.click();
      } catch {}
    });
  });
  await randomDelay(1000, 2000);
}