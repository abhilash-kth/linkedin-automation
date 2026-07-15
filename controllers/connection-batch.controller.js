import {
  launchBrowser,
  closeBrowser,
} from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import {
  safeGoto,
  closeMessagingOverlays,
  humanRefreshPage,
} from "../services/browser/navigation.service.js";
import { detectProfileStatus } from "../services/linkedin/profile.service.js";
import {
  sendConnectionRequest,
  checkIncomingInvitation,
  acceptIncomingInvitation,
} from "../services/linkedin/connection.service.js";
import { attemptSendMessage } from "../services/linkedin/message.service.js";
import { extractContactInfo } from "../services/linkedin/contact-info.service.js";
import {
  getLeadsByStatus,
  updateLeadStatus,
} from "../services/database/lead-db.service.js";
import { updateLeadInSheet } from "../services/integrations/google-sheets.service.js";
import { callAI } from "../services/ai/claude.service.js";
import { connectDB } from "../services/database/mongodb.service.js";
import {
  behaveLikeHuman,
  randomDelay,
} from "../helpers/human-behavior.helper.js";
import Lead from "../models/Lead.model.js";

// ═══════════════════════════════════════════════════════════════
// DAILY LIMITS
// ═══════════════════════════════════════════════════════════════
const MAX_CONNECTIONS_PER_RUN = 20;
const MAX_CONNECTIONS_PER_DAY = 20;
const MAX_MESSAGES_PER_DAY = 15;
const COOLDOWN_MIN_SEC = 30;
const COOLDOWN_MAX_SEC = 75;

// ═══════════════════════════════════════════════════════════════
// OUR BUSINESS CONTEXT (used in AI prompts)
// ═══════════════════════════════════════════════════════════════
const OUR_BUSINESS = `Kriscent — a software development agency specializing in:
- SaaS product development
- AI product engineering (LLMs, agents, automation)
- Custom software for startups & SMBs
- MVP development
- Full-stack (React, Node.js, Python)`;

const OUR_APPROACH = `We help founders and businesses:
- Build MVPs and scale products
- Integrate AI into workflows
- Partner on tech projects
- Provide fractional CTO services`;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
async function closeExtraTabs(context, mainPage) {
  try {
    const pages = context.pages();
    for (const p of pages) {
      if (p !== mainPage && !p.isClosed()) {
        console.log(`   🗑️  Closing extra tab: ${p.url().substring(0, 60)}`);
        await p.close();
      }
    }
  } catch {}
}

async function countTodayConnections(accountId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return await Lead.countDocuments({
    accountId,
    connectionSentAt: { $gte: today },
  });
}

async function countTodayMessages(accountId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return await Lead.countDocuments({
    accountId,
    messageSentAt: { $gte: today },
  });
}

function hasContactInfo(lead) {
  return !!(lead.email || lead.phone || lead.website);
}

// ═══════════════════════════════════════════════════════════════
// AI GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate connection note (short, warm)
 */
async function generateConnectionNote(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 250).trim();

  const prompt = `Write a warm LinkedIn connection request to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it in the note.

CONTEXT:
- Person's name: ${firstName}
- Their role: ${lead.title || "Professional"}
- Their recent post: ${postSnippet}

Write a note from you to ${firstName}. The note should:
- Start with "Hi ${firstName}," or "Hey ${firstName},"
- Reference their work in ONE brief sentence
- Express genuine interest to connect
- Be under 250 characters
- Sound like a real founder wrote it
- NOT pitch services
- NOT mention any company name

Write ONLY the note. No prefixes, no explanations.

Good example:
Hi Sarah, saw your post on AI adoption — really thoughtful take. Would love to connect and exchange notes on what's working. Cheers!

Your note:`;

  return await callAIWithValidation(
    prompt,
    firstName,
    40,
    280,
    "connection note",
  );
}

/**
 * Generate warm follow-up message (after connection)
 */
async function generateWarmMessage(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 200).trim();

  const prompt = `Write a warm LinkedIn message to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it.

CONTEXT:
- Person's name: ${firstName}
- Their role: ${lead.title || "Professional"}
- Their recent post: ${postSnippet}

Write a message from you to ${firstName}. It should:
- Start with "Hi ${firstName}," or "Thanks for connecting, ${firstName},"
- Reference their work in ONE sentence
- Ask ONE casual open-ended question about their work
- Be under 250 characters
- Sound like a real human founder
- NOT pitch services or mention any company

Write ONLY the message. No prefixes.

Good example:
Hi Sarah, thanks for connecting! Loved your AI adoption post. Curious — what's been the biggest surprise in the past 6 months of building?

Your message:`;

  return await callAIWithValidation(prompt, firstName, 40, 300, "warm message");
}

/**
 * Generate InMail SUBJECT (contextual, not generic "Quick hello")
 */
async function generateInMailSubject(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 200).trim();
  const topMatch = lead.aiAnalysis?.topMatch || lead.scoreReasons?.[0] || "";

  const prompt = `Write a LinkedIn InMail SUBJECT line for outreach to ${firstName}. CONTEXT is for you only.

CONTEXT:
- Person: ${firstName}, ${lead.title || "Professional"}
- Their recent post topic: ${postSnippet.substring(0, 150)}
- Why they're relevant: ${topMatch}
- Our angle: Partnership, collaboration, or helping with their tech needs

The subject should:
- Be 3-8 words
- Reference their work or challenge naturally
- Sound like a peer reaching out, not a salesperson
- NOT use "Quick hello" or generic phrases
- NOT use ALL CAPS or exclamation marks
- Feel personal and specific

Write ONLY the subject line. No quotes, no prefixes.

Good examples:
- Your take on MVP scaling
- Curious about your AI stack
- Fellow founder — quick question
- Loved your React Native post
- Building something similar

Your subject:`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await callAI(prompt, { maxTokens: 60, temperature: 0.8 });
    if (!result.success) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    let subject = (result.text || "").trim();
    subject = subject.replace(/^["']|["']$/g, "");
    subject = subject.replace(/^Subject:\s*/i, "");
    subject = subject.replace(/^Your subject:\s*/i, "");
    subject = subject.split("\n")[0].trim(); // First line only

    // Bad patterns
    const badPatterns = [
      /^write/i,
      /^good example/i,
      /^here/i,
      /context:/i,
      /^the subject/i,
      /^example/i,
      /partnership opportunity/i,
    ];
    if (badPatterns.some((p) => p.test(subject))) {
      if (attempt < 3) continue;
      return "Quick hello"; // Fallback
    }

    // Length check (3-60 chars)
    if (subject.length < 5 || subject.length > 60) {
      if (attempt < 3) continue;
    }

    return subject;
  }

  return "Quick hello"; // Fallback if all attempts fail
}

/**
 * Generate InMail message BODY (partnership/collaboration angle)
 */
async function generateInMailMessage(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 250).trim();
  const topMatch = lead.aiAnalysis?.topMatch || "";

  const prompt = `Write a LinkedIn InMail message to ${firstName}. CONTEXT is for you only.

CONTEXT:
- Person: ${firstName}, ${lead.title || "Professional"}
- Their recent post: ${postSnippet}
- Why relevant: ${topMatch}
- Our business: Kriscent — software development agency (SaaS, AI, MVPs)
- Our approach: Genuine outreach, offer partnership or help, not pushy sales

Write a message from you to ${firstName}. It should:
- Start with "Hi ${firstName},"
- Reference their post/work in ONE specific sentence
- Briefly mention what you do (software dev / AI / SaaS) — casually, not sales-y
- Suggest ONE thing: quick chat, share insights, explore collab, or offer help
- End with a soft CTA like "open to a quick chat?" or "would love to hear more"
- Be under 500 characters
- Sound human, warm, and confident

Write ONLY the message. No prefixes, no meta-commentary.

Good example:
Hi Sarah, loved your post on scaling AI infrastructure — we've been solving similar problems for founders at Kriscent. Would love to swap notes on what's working. Open to a quick 15-min chat this week?

Your message:`;

  return await callAIWithValidation(
    prompt,
    firstName,
    100,
    500,
    "InMail message",
  );
}

/**
 * Unified AI caller with validation (name check, length check, leak detection)
 */
async function callAIWithValidation(
  prompt,
  firstName,
  minLen,
  maxLen,
  purpose,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await callAI(prompt, { maxTokens: 400, temperature: 0.7 });
    if (!result.success) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    let msg = (result.text || "").trim();

    // Cleanup prefixes
    msg = msg.replace(/^["']|["']$/g, "");
    msg = msg.replace(
      /^(Message|Note|Response|Subject|Your (message|note|subject|response)):\s*/i,
      "",
    );
    msg = msg.replace(/^Here'?s.*?:\s*/i, "");

    // Leak detection
    const badPatterns = [
      /we need to/i,
      /you just connected/i,
      /your task/i,
      /must start with/i,
      /the message should/i,
      /below is context/i,
      /under \d+ characters/i,
      /warm follow-up/i,
      /^context:/i,
      /^rules:/i,
      /^write/i,
      /^you are/i,
      /good example/i,
      /example:/i,
      /now write/i,
      /^person's/i,
      /the note should/i,
      /the subject/i,
    ];
    if (badPatterns.some((p) => p.test(msg))) {
      console.log(`   ⚠️  Attempt ${attempt}/3: ${purpose} — AI leaked prompt`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return null;
    }

    // Must start with name (for messages/notes, not subjects)
    if (purpose !== "InMail subject") {
      const lowerMsg = msg.toLowerCase();
      const lowerName = firstName.toLowerCase();
      const validStarts = [
        `hi ${lowerName}`,
        `hey ${lowerName}`,
        `hello ${lowerName}`,
        `thanks for connecting, ${lowerName}`,
        `thanks for connecting ${lowerName}`,
        lowerName + ",",
      ];
      if (!validStarts.some((s) => lowerMsg.startsWith(s))) {
        console.log(
          `   ⚠️  Attempt ${attempt}/3: ${purpose} — doesn't start with "${firstName}"`,
        );
        if (attempt < 3) continue;
      }
    }

    // Length check
    if (msg.length < minLen || msg.length > maxLen + 50) {
      console.log(
        `   ⚠️  Attempt ${attempt}/3: ${purpose} — bad length (${msg.length})`,
      );
      if (attempt < 3) continue;
    }

    return msg.substring(0, maxLen);
  }

  console.log(`   ❌ ${purpose}: Failed after 3 attempts`);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN BATCH FUNCTION
// ═══════════════════════════════════════════════════════════════
export async function sendConnectionBatch(accountId, actuallySend = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║  CONNECTION BATCH — ${accountId.padEnd(38)}║`);
  console.log(
    `║  Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();

  const todayConnections = await countTodayConnections(accountId);
  const todayMessages = await countTodayMessages(accountId);
  const connectionsRemaining = MAX_CONNECTIONS_PER_DAY - todayConnections;
  const messagesRemaining = MAX_MESSAGES_PER_DAY - todayMessages;

  console.log(`📊 TODAY'S ACTIVITY:`);
  console.log(
    `   📨 Connections: ${todayConnections}/${MAX_CONNECTIONS_PER_DAY} (${connectionsRemaining} left)`,
  );
  console.log(
    `   💌 Messages: ${todayMessages}/${MAX_MESSAGES_PER_DAY} (${messagesRemaining} left)\n`,
  );

  if (connectionsRemaining <= 0) {
    console.log(`⛔ Daily connection limit reached\n`);
    return;
  }

  const commentedLeads = await getLeadsByStatus("commented", accountId);
  const discoveredLeads = await getLeadsByStatus("discovered", accountId);
  const allLeads = [...commentedLeads, ...discoveredLeads].sort(
    (a, b) => (b.conversionScore || 0) - (a.conversionScore || 0),
  );

  console.log(
    `📊 LEADS: Commented=${commentedLeads.length}, Discovered=${discoveredLeads.length}, Total=${allLeads.length}\n`,
  );

  const limit = Math.min(MAX_CONNECTIONS_PER_RUN, connectionsRemaining);
  const toProcess = allLeads.slice(0, limit);

  console.log(`📤 WILL PROCESS: ${toProcess.length} leads\n`);

  if (toProcess.length === 0) {
    console.log(`   ℹ️  No leads ready\n`);
    return;
  }

  const { context, page } = await launchBrowser(accountId);
  let stats = {
    contactExtracted: 0,
    accepted: 0,
    connected: 0,
    messaged: 0,
    inmail: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired`);
      return;
    }

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      let messageSentThisLead = false; // ← CRITICAL: track per-lead to prevent double

      console.log(`\n${"━".repeat(63)}`);
      console.log(
        `[${i + 1}/${toProcess.length}] ${lead.name} (${lead.conversionScore}% ${lead.scoreCategory})`,
      );
      console.log(`📍 ${lead.profileUrl}`);
      console.log(`${"━".repeat(63)}`);

      try {
        if (page.isClosed()) {
          console.log(`❌ Page closed — aborting`);
          break;
        }

        // ═══ STEP 1: Navigate ═══
        if (!(await safeGoto(page, lead.profileUrl))) {
          console.log(`❌ Navigation failed`);
          stats.failed++;
          continue;
        }

        await closeExtraTabs(context, page);
        await closeMessagingOverlays(page);
        await behaveLikeHuman(page);
        await randomDelay(2000, 4000);

        // ═══ STEP 2: Extract contact info if missing ═══
        // if (!hasContactInfo(lead)) {
        //   console.log(`\n📇 STEP 1: Extract contact info`);
        //   const contactInfo = await extractContactInfo(page, lead.profileUrl);
        //   const updates = {},
        //     sheetUpdates = {};

        //   if (contactInfo.email) {
        //     updates.email = contactInfo.email;
        //     sheetUpdates.F = contactInfo.email;
        //   }
        //   if (contactInfo.phone) {
        //     updates.phone = contactInfo.phone;
        //     sheetUpdates.G = contactInfo.phone;
        //   }
        //   if (contactInfo.website) {
        //     updates.website = contactInfo.website;
        //     sheetUpdates.H = contactInfo.website;
        //   }
        //   if (contactInfo.location && !lead.location) {
        //     updates.location = contactInfo.location;
        //     sheetUpdates.E = contactInfo.location;
        //   }

        //   if (Object.keys(updates).length > 0) {
        //     await updateLeadStatus(lead.profileUrl, lead.status, updates);
        //     try {
        //       await updateLeadInSheet(lead.profileUrl, sheetUpdates);
        //     } catch {}
        //     stats.contactExtracted++;
        //     Object.assign(lead, updates);
        //   }
        //   await randomDelay(2000, 4000);
        // } else {
        //   console.log(`\n📇 STEP 1: Contact info already in DB`);
        //   if (lead.email) console.log(`   📧 ${lead.email}`);
        // }

        // ═══ STEP 2: HUMAN-LIKE CONTACT INFO BROWSING ═══
        // Always click contact info first (like a real human checking who they're about to connect with)
        // This mimics natural curiosity and helps avoid bot detection
        console.log(`\n📇 STEP 1: Browse profile like a human`);

        // Simulate reading the profile briefly (scroll down slowly)
        console.log(`   📜 Scrolling to read profile...`);
        for (let s = 0; s < 3; s++) {
          await page.evaluate(() =>
            window.scrollBy({ top: 200, behavior: "smooth" }),
          );
          await randomDelay(1000, 2000);
        }

        // Scroll back up to see the "Contact info" link
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "smooth" }),
        );
        await randomDelay(1500, 2500);

        // ALWAYS extract contact info (whether we have it or not — natural human behavior)
        console.log(`   🖱️  Clicking "Contact info" to check details...`);
        const contactInfo = await extractContactInfo(page, lead.profileUrl);

        const updates = {};
        const sheetUpdates = {};
        let newInfoFound = false;

        // Compare with existing data — only update if we found NEW info
        if (contactInfo.email && contactInfo.email !== lead.email) {
          updates.email = contactInfo.email;
          sheetUpdates.F = contactInfo.email;
          newInfoFound = true;
          console.log(`   📧 New email found: ${contactInfo.email}`);
        }
        if (contactInfo.phone && contactInfo.phone !== lead.phone) {
          updates.phone = contactInfo.phone;
          sheetUpdates.G = contactInfo.phone;
          newInfoFound = true;
          console.log(`   📱 New phone found: ${contactInfo.phone}`);
        }
        if (contactInfo.website && contactInfo.website !== lead.website) {
          updates.website = contactInfo.website;
          sheetUpdates.H = contactInfo.website;
          newInfoFound = true;
          console.log(`   🌐 New website found: ${contactInfo.website}`);
        }
        if (contactInfo.location && contactInfo.location !== lead.location) {
          updates.location = contactInfo.location;
          sheetUpdates.E = contactInfo.location;
          newInfoFound = true;
          console.log(`   📍 New location found: ${contactInfo.location}`);
        }

        if (newInfoFound) {
          await updateLeadStatus(lead.profileUrl, lead.status, updates);
          try {
            await updateLeadInSheet(lead.profileUrl, sheetUpdates);
          } catch {}
          stats.contactExtracted++;
          Object.assign(lead, updates);
          console.log(`   💾 Updated DB + Sheet with new contact info`);
        } else if (hasContactInfo(lead)) {
          console.log(`   ✅ Contact info already up-to-date`);
          if (lead.email) console.log(`      📧 ${lead.email}`);
          if (lead.phone) console.log(`      📱 ${lead.phone}`);
          if (lead.website) console.log(`      🌐 ${lead.website}`);
        } else {
          console.log(`   ℹ️  No contact info available on this profile`);
        }

        // Natural pause after viewing contact info (like reading it)
        await randomDelay(3000, 5000);

        // Scroll around a bit more to look "engaged" with the profile
        console.log(`   📜 Scrolling to explore more of profile...`);
        for (let s = 0; s < 2; s++) {
          await page.evaluate(() =>
            window.scrollBy({
              top: 300 + Math.random() * 200,
              behavior: "smooth",
            }),
          );
          await randomDelay(1500, 2500);
        }

        // Scroll back to top for next steps (Connect button is at top)
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "smooth" }),
        );
        await randomDelay(2000, 3500);

        // ═══ STEP 3: Check incoming invitation ═══
        console.log(`\n💌 STEP 2: Check for incoming invitation`);
        const incoming = await checkIncomingInvitation(page, lead.name);

        if (incoming.hasIncoming) {
          console.log(`   💌 THEY sent us an invitation!`);

          if (!actuallySend) {
            console.log(`   ⚠️  Safe mode — would ACCEPT + MESSAGE`);
            stats.skipped++;
            await coolDown();
            continue;
          }

          const acceptResult = await acceptIncomingInvitation(page, {
            x: incoming.x,
            y: incoming.y,
          });

          if (acceptResult.success) {
            stats.accepted++;
            await updateLeadStatus(lead.profileUrl, "accepted", {
              connectionAcceptedAt: new Date(),
            });
            try {
              await updateLeadInSheet(lead.profileUrl, {
                V: "accepted",
                W: new Date().toISOString().split("T")[0],
                AO: "accepted",
              });
            } catch {}

            await randomDelay(3000, 5000);
            await humanRefreshPage(page);
            await closeMessagingOverlays(page);
            await randomDelay(3000, 5000);

            // Send warm message
            if (messagesRemaining > stats.messaged) {
              console.log(`   🤖 Generating warm message...`);
              const warmMsg = await generateWarmMessage(lead);
              if (warmMsg) {
                console.log(`   📝 Message: "${warmMsg.substring(0, 80)}..."`);
                const msgResult = await attemptSendMessage(
                  page,
                  warmMsg,
                  "",
                  true,
                  accountId,
                );
                if (msgResult.success && msgResult.action === "message_sent") {
                  console.log(`   ✅ Warm message sent!`);
                  stats.messaged++;
                  messageSentThisLead = true;
                  await updateLeadStatus(lead.profileUrl, "message_sent", {
                    warmingMessage: warmMsg,
                    messageSentAt: new Date(),
                  });
                  try {
                    await updateLeadInSheet(lead.profileUrl, {
                      X: "Yes",
                      Y: warmMsg,
                      Z: new Date().toISOString().split("T")[0],
                      AO: "message_sent",
                    });
                  } catch {}
                }
              }
            }
          } else {
            console.log(`   ❌ Accept failed: ${acceptResult.reason}`);
            stats.failed++;
          }

          await coolDown();
          continue; // ← IMPORTANT: skip to next lead
        }

        // ═══ STEP 4: Check status ═══
        console.log(`\n🔎 STEP 3: Check profile status`);
        const status = await detectProfileStatus(page);

        // Already 1st degree
        if (status.isFirstDegree) {
          console.log(`   ✅ Already 1st degree`);
          await updateLeadStatus(lead.profileUrl, "accepted", {
            connectionAcceptedAt: new Date(),
          });

          if (
            actuallySend &&
            status.hasMessage &&
            messagesRemaining > stats.messaged
          ) {
            console.log(`   🤖 Generating warm message for 1st degree...`);
            const warmMsg = await generateWarmMessage(lead);
            if (warmMsg) {
              console.log(`   📝 "${warmMsg.substring(0, 80)}..."`);
              const msgResult = await attemptSendMessage(
                page,
                warmMsg,
                "",
                true,
                accountId,
              );
              if (msgResult.success && msgResult.action === "message_sent") {
                stats.messaged++;
                messageSentThisLead = true;
                await updateLeadStatus(lead.profileUrl, "message_sent", {
                  warmingMessage: warmMsg,
                  messageSentAt: new Date(),
                });
                try {
                  await updateLeadInSheet(lead.profileUrl, {
                    V: "accepted",
                    W: new Date().toISOString().split("T")[0],
                    X: "Yes",
                    Y: warmMsg,
                    Z: new Date().toISOString().split("T")[0],
                    AO: "message_sent",
                  });
                } catch {}
                console.log(`   ✅ Message sent!`);
              }
            }
          } else {
            try {
              await updateLeadInSheet(lead.profileUrl, {
                V: "accepted",
                W: new Date().toISOString().split("T")[0],
                AO: "accepted",
              });
            } catch {}
          }

          await coolDown();
          continue;
        }

        // Already pending
        if (status.hasPending) {
          console.log(`   ⏳ Already pending — skip`);
          await updateLeadStatus(lead.profileUrl, "pending_acceptance");
          stats.skipped++;
          continue;
        }

        // No connect available
        if (!status.hasConnect && !status.hasMore) {
          console.log(`   ⚠️  No connection options available`);
          stats.skipped++;
          continue;
        }

        // ═══ STEP 5: Send NEW connection request ═══
        const currentSent = todayConnections + stats.connected;
        if (currentSent >= MAX_CONNECTIONS_PER_DAY) {
          console.log(`   ⛔ Daily limit reached during batch`);
          break;
        }

        console.log(
          `\n📨 STEP 4: Send connection request (${currentSent + 1}/${MAX_CONNECTIONS_PER_DAY} today)`,
        );
        console.log(`   🤖 Generating AI note...`);
        const connectionNote = await generateConnectionNote(lead);

        if (connectionNote) {
          console.log(
            `   📝 Note (${connectionNote.length} chars): "${connectionNote.substring(0, 80)}..."`,
          );
        } else {
          console.log(`   ⚠️  AI failed — sending without note`);
        }

        if (!actuallySend) {
          console.log(`   ⚠️  Safe mode — NOT sending`);
          stats.skipped++;
          await randomDelay(3000, 5000);
          continue;
        }

        // console.log(`   📨 Sending connection request...`);
        // const connResult = await sendConnectionRequest(page, connectionNote || "", lead.profileUrl);

        // if (!connResult.success) {
        //   console.log(`   ❌ Connection failed: ${connResult.reason}`);
        //   stats.failed++;
        //   await updateLeadStatus(lead.profileUrl, lead.status, {
        //     lastError: connResult.reason,
        //     retryCount: (lead.retryCount || 0) + 1,
        //   });
        //   await coolDown();
        //   continue;
        // }

        console.log(`   📨 Sending connection request...`);
        const connResult = await sendConnectionRequest(
          page,
          connectionNote || "",
          lead.profileUrl,
        );

        if (!connResult.success) {
          console.log(`   ❌ Connection failed: ${connResult.reason}`);

          // If Connect isn't available but Message is, try InMail directly
          if (
            connResult.reason === "connect_button_not_found" &&
            status.hasMessage
          ) {
            console.log(
              `   💎 Trying InMail as fallback (Connect not available)...`,
            );

            if (messagesRemaining > stats.messaged) {
              const inMailSubject = await generateInMailSubject(lead);
              const inMailMsg = await generateInMailMessage(lead);

              if (inMailMsg) {
                console.log(`   📝 Subject: "${inMailSubject}"`);
                console.log(
                  `   📝 Message: "${inMailMsg.substring(0, 80)}..."`,
                );

                const msgResult = await attemptSendMessage(
                  page,
                  inMailMsg,
                  inMailSubject,
                  true,
                  accountId,
                );

                if (msgResult.success && msgResult.action === "message_sent") {
                  stats.inmail++;
                  stats.messaged++;
                  console.log(`   ✅ InMail sent (Connect fallback)!`);

                  await updateLeadStatus(lead.profileUrl, "message_sent", {
                    warmingMessage: inMailMsg,
                    messageSentAt: new Date(),
                  });

                  try {
                    await updateLeadInSheet(lead.profileUrl, {
                      AA: "Yes",
                      AB: inMailMsg,
                      AC: new Date().toISOString().split("T")[0],
                      AO: "message_sent",
                    });
                  } catch {}

                  await coolDown();
                  continue;
                }
              }
            }
          }

          stats.failed++;
          await updateLeadStatus(lead.profileUrl, lead.status, {
            lastError: connResult.reason,
            retryCount: (lead.retryCount || 0) + 1,
          });
          await coolDown();
          continue;
        }

        console.log(
          `   ✅ Connection sent! (Note: ${connResult.hadNote ? "yes" : "no"})`,
        );
        stats.connected++;
        await updateLeadStatus(lead.profileUrl, "connection_sent", {
          connectionNote: connectionNote || "",
          connectionSentAt: new Date(),
        });
        try {
          await updateLeadInSheet(lead.profileUrl, {
            S: "Yes",
            T: connectionNote || "",
            U: new Date().toISOString().split("T")[0],
            V: "pending",
            AO: "connection_sent",
          });
        } catch {}

        // ═══ STEP 6: After connect — check InMail (ONLY if not already sent message) ═══
        if (messageSentThisLead) {
          console.log(`   ℹ️  Message already sent — skipping InMail check`);
          await coolDown();
          continue;
        }

        if (messagesRemaining <= stats.messaged) {
          console.log(`   ⛔ Daily message limit reached — skipping InMail`);
          await coolDown();
          continue;
        }

        console.log(`\n💎 STEP 5: Check InMail availability`);
        await randomDelay(3000, 5000);

        if (page.isClosed()) {
          await coolDown();
          continue;
        }

        try {
          console.log(`   🌐 Navigating back to profile...`);
          const navOk = await safeGoto(page, lead.profileUrl);
          if (!navOk) {
            await coolDown();
            continue;
          }

          await closeMessagingOverlays(page);
          await closeExtraTabs(context, page);
          await behaveLikeHuman(page);
          await randomDelay(4000, 6000);

          const afterStatus = await detectProfileStatus(page);

          if (!afterStatus.hasMessage || afterStatus.isFirstDegree) {
            console.log(`   ℹ️  No Message button — waiting for acceptance`);
            await coolDown();
            continue;
          }

          console.log(`   💎 Message button available — sending InMail`);

          // Generate AI subject
          console.log(`   🤖 Generating InMail subject...`);
          const subject = await generateInMailSubject(lead);
          console.log(`   📝 Subject: "${subject}"`);

          // Generate InMail message (partnership-focused)
          console.log(`   🤖 Generating InMail message...`);
          const inMailMsg = await generateInMailMessage(lead);

          if (!inMailMsg) {
            console.log(`   ❌ InMail generation failed — skip`);
            await coolDown();
            continue;
          }

          console.log(`   📝 Message: "${inMailMsg.substring(0, 80)}..."`);

          const msgResult = await attemptSendMessage(
            page,
            inMailMsg,
            subject,
            true,
            accountId,
          );

          if (msgResult.success && msgResult.action === "message_sent") {
            stats.inmail++;
            stats.messaged++;
            messageSentThisLead = true;
            console.log(`   ✅ InMail sent!`);

            await updateLeadStatus(
              lead.profileUrl,
              "connection_and_message_sent",
              {
                warmingMessage: inMailMsg,
                messageSentAt: new Date(),
              },
            );

            try {
              await updateLeadInSheet(lead.profileUrl, {
                AA: "Yes",
                AB: inMailMsg,
                AC: new Date().toISOString().split("T")[0],
                AO: "connection_and_message_sent",
              });
            } catch {}
          } else if (msgResult.reason === "premium_required_for_inmail") {
            console.log(`   💎 Premium required for InMail`);
          } else {
            console.log(`   ⚠️  InMail failed: ${msgResult.reason}`);
          }
        } catch (err) {
          console.log(`   ⚠️  InMail check failed: ${err.message}`);
        }

        await coolDown();
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
        stats.failed++;
        if (
          err.message.includes("browser has been closed") ||
          err.message.includes("Target page")
        ) {
          console.log(`💥 Browser died — stopping`);
          break;
        }
      }
    }

    // Final summary
    const finalConnections = await countTodayConnections(accountId);
    const finalMessages = await countTodayMessages(accountId);

    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  CONNECTION BATCH COMPLETE                                 ║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  📇 Contact extracted: ${String(stats.contactExtracted).padEnd(35)}║`,
    );
    console.log(
      `║  💌 Accepted incoming: ${String(stats.accepted).padEnd(35)}║`,
    );
    console.log(
      `║  ✅ New connections: ${String(stats.connected).padEnd(37)}║`,
    );
    console.log(`║  💬 Messages sent: ${String(stats.messaged).padEnd(39)}║`);
    console.log(`║  💎 InMails sent: ${String(stats.inmail).padEnd(40)}║`);
    console.log(`║  ⏭️  Skipped: ${String(stats.skipped).padEnd(44)}║`);
    console.log(`║  ❌ Failed: ${String(stats.failed).padEnd(47)}║`);
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  📊 TODAY'S TOTALS:                                        ║`,
    );
    console.log(
      `║     Connections: ${String(finalConnections).padEnd(5)}/ ${MAX_CONNECTIONS_PER_DAY}                                   ║`,
    );
    console.log(
      `║     Messages: ${String(finalMessages).padEnd(8)}/ ${MAX_MESSAGES_PER_DAY}                                   ║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`,
    );
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

/**
 * Cooldown between profiles
 */
async function coolDown() {
  const cd =
    (COOLDOWN_MIN_SEC +
      Math.floor(Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC))) *
    1000;
  console.log(`\n⏰ Cooling ${Math.floor(cd / 1000)}s before next profile...`);
  await new Promise((r) => setTimeout(r, cd));
}
