import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { extractContactInfo } from "../services/linkedin/contact-info.service.js";
import { getAcceptedLeads, updateLeadStatus } from "../services/database/lead-db.service.js";
import { updateLeadInSheet } from "../services/integrations/google-sheets.service.js";
import { behaveLikeHuman, randomDelay } from "../helpers/human-behavior.helper.js";

/**
 * Extract contact info for accepted connections who don't have email/phone yet
 */
export async function extractContactInfoBatch(accountId) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  CONTACT INFO EXTRACTION — ${accountId.padEnd(31)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const { context, page } = await launchBrowser(accountId);

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    // Get accepted leads without contact info
    const leads = await getAcceptedLeads(accountId);
    const needsInfo = leads.filter(
      (l) => !l.email && !l.phone,
    );

    console.log(`📊 Accepted leads: ${leads.length}`);
    console.log(`📊 Need contact info: ${needsInfo.length}\n`);

    let extracted = 0;

    for (let i = 0; i < Math.min(needsInfo.length, 15); i++) {
      const lead = needsInfo[i];
      console.log(`\n━━━ [${i + 1}] ${lead.name} ━━━`);

      try {
        const contactInfo = await extractContactInfo(page, lead.profileUrl);

        const updates = {};
        if (contactInfo.email) {
          updates.email = contactInfo.email;
          console.log(`   📧 Email: ${contactInfo.email}`);
        }
        if (contactInfo.phone) {
          updates.phone = contactInfo.phone;
          console.log(`   📱 Phone: ${contactInfo.phone}`);
        }
        if (contactInfo.website) {
          updates.website = contactInfo.website;
          console.log(`   🌐 Website: ${contactInfo.website}`);
        }
        if (contactInfo.location) {
          updates.location = contactInfo.location;
          console.log(`   📍 Location: ${contactInfo.location}`);
        }

        if (Object.keys(updates).length > 0) {
          await updateLeadStatus(lead.profileUrl, lead.status, updates);

          // Update sheet
          const sheetUpdates = {};
          if (updates.email) sheetUpdates.F = updates.email;
          if (updates.phone) sheetUpdates.G = updates.phone;
          if (updates.website) sheetUpdates.H = updates.website;
          if (updates.location) sheetUpdates.E = updates.location;
          await updateLeadInSheet(lead.profileUrl, sheetUpdates);

          extracted++;
          console.log(`   ✅ Saved`);
        } else {
          console.log(`   ℹ️  No contact info found`);
        }

        await randomDelay(15000, 30000);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }

    console.log(`\n✅ Extracted contact info for ${extracted} leads\n`);
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}