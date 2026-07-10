import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { checkAcceptance } from "../services/linkedin/acceptance-checker.service.js";
import { getPendingAcceptanceLeads, updateLeadStatus } from "../services/database/lead-db.service.js";
import { randomDelay } from "../helpers/delay.helper.js";

/**
 * Check all pending connection requests to see who accepted
 */
export async function checkAllAcceptances(accountId) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  ACCEPTANCE CHECK — ${accountId.padEnd(38)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    const leads = await getPendingAcceptanceLeads(accountId);
    console.log(`📊 Found ${leads.length} pending connection requests to check\n`);

    let acceptedCount = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      console.log(`\n━━━ [${i + 1}/${leads.length}] ${lead.name} ━━━`);

      const result = await checkAcceptance(page, lead.profileUrl);

      if (result.accepted) {
        await updateLeadStatus(lead.profileUrl, "accepted", {
          connectionAcceptedAt: new Date(),
        });
        acceptedCount++;
        console.log(`   🎉 Marked as ACCEPTED`);
      }

      // Human delay between checks
      await randomDelay(5000, 12000);
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  ACCEPTANCE CHECK COMPLETE                                 ║`);
    console.log(`║  🎉 New acceptances: ${String(acceptedCount).padEnd(37)}║`);
    console.log(`║  ⏳ Still pending: ${String(leads.length - acceptedCount).padEnd(39)}║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}