import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { scanInbox, getFullConversation } from "../services/linkedin/inbox.service.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";
import { readFile, writeFile } from "fs/promises";

async function loadLeads(filePath) {
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch { return []; }
}

async function saveLeads(filePath, leads) {
  await writeFile(filePath, JSON.stringify(leads, null, 2));
}

export async function checkInbox(accountId, leadsFile, autoReplyText = null, actuallySend = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  INBOX MONITOR — ${accountId.padEnd(40)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    const { all, unread } = await scanInbox(page);

    if (unread.length === 0) {
      console.log(`📭 No unread messages\n`);
      await closeBrowser(context);
      return;
    }

    const leads = await loadLeads(leadsFile);
    let repliedCount = 0;

    for (let i = 0; i < unread.length; i++) {
      const convo = unread[i];
      console.log(`\n📨 [${i + 1}/${unread.length}] From: ${convo.name}`);

      try {
        const messages = await getFullConversation(page, convo.index);

        const matchingLead = leads.find(
          (l) => l.name && convo.name.toLowerCase().includes(l.name.toLowerCase()),
        );

        if (matchingLead) {
          console.log(`   ✅ Matched lead: ${matchingLead.name}`);
          matchingLead.status = "replied";
          matchingLead.repliedAt = new Date().toISOString();
          repliedCount++;
        }

        await randomDelay(3000, 6000);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    if (repliedCount > 0) {
      await saveLeads(leadsFile, leads);
      console.log(`\n💾 Updated ${repliedCount} leads`);
    }

    await page.waitForTimeout(10000);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}