import { smartOutreach } from "./outreach.controller.js";
import config from "../config/config.js";
import { readFile, writeFile } from "fs/promises";
import { random } from "../helpers/delay.helper.js";

async function loadLeads(filePath) {
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Could not read ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

async function saveLeads(filePath, leads) {
  await writeFile(filePath, JSON.stringify(leads, null, 2));
}

export async function processBatch(accountId, leadsFile, actuallySend = false) {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  BATCH OUTREACH — ${accountId.padEnd(40)}║`);
  console.log(`║  Leads: ${leadsFile.padEnd(49)}║`);
  console.log(`║  Send: ${(actuallySend ? "YES" : "NO").padEnd(51)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  const leads = await loadLeads(leadsFile);

  const todayCount = leads.filter((l) => {
    if (!l.processedAt) return false;
    return new Date(l.processedAt).toDateString() === new Date().toDateString();
  }).length;

  console.log(`📊 Total: ${leads.length} | Processed today: ${todayCount} | Limit: ${config.maxMessagesPerDay}\n`);

  const remainingToday = config.maxMessagesPerDay - todayCount;
  if (remainingToday <= 0) {
    console.log(`⚠️  Daily limit reached.`);
    return;
  }

  const pending = leads;
  const toProcess = pending.slice(0, remainingToday);
  console.log(`📤 Processing ${toProcess.length} leads\n`);

  let success = 0;
  let fail = 0;
  let connections = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const lead = toProcess[i];
    console.log(`\n━━━ Lead ${i + 1}/${toProcess.length}: ${lead.name || "Unknown"} ━━━`);

    const result = await smartOutreach(accountId, lead.profileUrl, lead.message, {
      actuallySend,
      skipBusinessHours: true,
      connectionNote: lead.connectionNote || "",
      subject: lead.subject || "Quick hello",
    });

    lead.processedAt = new Date().toISOString();
    lead.lastResult = result.message;

    if (result.success) {
      if (result.action === "message_sent" || result.action === "connection_and_message_sent") {
        lead.status = result.action === "connection_and_message_sent" ? "connection_and_message_sent" : "sent";
        lead.sentAt = new Date().toISOString();
        success++;
        if (result.action === "connection_and_message_sent") connections++;
      } else if (result.action === "connection_sent") {
        lead.status = "pending_acceptance";
        lead.connectionSentAt = new Date().toISOString();
        connections++;
      } else if (result.action === "typed_only") {
        lead.status = "typed_only";
      }
    } else {
      fail++;
      lead.lastError = result.reason;
      lead.status = result.reason === "no_actions_available" ? "failed_permanent" : "failed_retry";
    }

    await saveLeads(leadsFile, leads);

    if (i < toProcess.length - 1) {
      const delay = Math.floor(5 + Math.random() * 25);
      console.log(`\n⏰ Next in ${delay}s...`);
      await new Promise((r) => setTimeout(r, delay * 1000));
    }
  }

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  BATCH COMPLETE                                            ║`);
  console.log(`║  ✅ Sent: ${String(success).padEnd(48)}║`);
  console.log(`║  📨 Connections: ${String(connections).padEnd(41)}║`);
  console.log(`║  ❌ Failed: ${String(fail).padEnd(47)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
}