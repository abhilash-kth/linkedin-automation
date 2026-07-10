import { scoreLead } from "../services/ai/scoring.service.js";
import { getPendingLeads, updateLeadStatus } from "../services/database/lead-db.service.js";

export async function scoreAllPendingLeads(accountId) {
  console.log(`\n🎯 Scoring all pending leads...\n`);

  const leads = await getPendingLeads(accountId);

  for (const lead of leads) {
    const result = await scoreLead({
      name: lead.name,
      title: lead.title,
      company: lead.company,
      location: lead.location,
      about: lead.about,
      recentPost: lead.postContent,
    });

    await updateLeadStatus(lead.profileUrl, lead.status, {
      conversionScore: result.score,
      scoreCategory: result.category,
      scoreReasons: result.reasons,
    });

    console.log(`   ✅ ${lead.name}: ${result.score} (${result.category})`);
  }

  console.log(`\n✅ Scored ${leads.length} leads`);
}