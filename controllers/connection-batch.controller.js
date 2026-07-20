// import {
//   launchBrowser,
//   closeBrowser,
// } from "../services/browser/browser.service.js";
// import { checkSession } from "../services/browser/session.service.js";
// import {
//   safeGoto,
//   closeMessagingOverlays,
//   humanRefreshPage,
// } from "../services/browser/navigation.service.js";
// import { detectProfileStatus } from "../services/linkedin/profile.service.js";
// import {
//   sendConnectionRequest,
//   checkIncomingInvitation,
//   acceptIncomingInvitation,
// } from "../services/linkedin/connection.service.js";
// import { attemptSendMessage } from "../services/linkedin/message.service.js";
// import { extractContactInfo } from "../services/linkedin/contact-info.service.js";
// import {
//   getLeadsByStatus,
//   updateLeadStatus,
//   markConnectionLimitHit,
//   markInMailSentAsFallback,
//   isConnectionBlocked,
//   isAccountConnectionLimitHit,
//   getConnectionUnblockDate,
//   getBlockedLeadsForRetry,
// } from "../services/database/lead-db.service.js";
// import { updateLeadInSheet } from "../services/integrations/google-sheets.service.js";
// import { callAI } from "../services/ai/claude.service.js";
// import { connectDB } from "../services/database/mongodb.service.js";
// import {
//   behaveLikeHuman,
//   randomDelay,
// } from "../helpers/human-behavior.helper.js";
// import Lead from "../models/Lead.model.js";

// // ═══════════════════════════════════════════════════════════════
// // LIMITS
// // ═══════════════════════════════════════════════════════════════
// const MAX_CONNECTIONS_PER_RUN = 20;
// const MAX_CONNECTIONS_PER_DAY = 20;
// const MAX_MESSAGES_PER_DAY = 15;
// const COOLDOWN_MIN_SEC = 30;
// const COOLDOWN_MAX_SEC = 75;
// const CONNECTION_BLOCK_DAYS = 7;

// // ═══════════════════════════════════════════════════════════════
// // HELPERS
// // ═══════════════════════════════════════════════════════════════
// async function closeExtraTabs(context, mainPage) {
//   try {
//     const pages = context.pages();
//     for (const p of pages) {
//       if (p !== mainPage && !p.isClosed()) {
//         console.log(`   🗑️  Closing extra tab: ${p.url().substring(0, 60)}`);
//         await p.close();
//       }
//     }
//   } catch {}
// }

// async function countTodayConnections(accountId) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   return await Lead.countDocuments({
//     accountId,
//     connectionSentAt: { $gte: today },
//   });
// }

// async function countTodayMessages(accountId) {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   return await Lead.countDocuments({
//     accountId,
//     messageSentAt: { $gte: today },
//   });
// }

// function hasContactInfo(lead) {
//   return !!(lead.email || lead.phone || lead.website);
// }

// function formatDate(date) {
//   if (!date) return "N/A";
//   return new Date(date).toLocaleDateString("en-US", {
//     weekday: "short",
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// function formatDateTime(date) {
//   if (!date) return "N/A";
//   return new Date(date).toLocaleString("en-US", {
//     weekday: "short",
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     timeZoneName: "short",
//   });
// }

// function daysUntil(date) {
//   if (!date) return 0;
//   const diff = new Date(date).getTime() - Date.now();
//   return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
// }

// function hoursUntil(date) {
//   if (!date) return 0;
//   const diff = new Date(date).getTime() - Date.now();
//   return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
// }

// // ═══════════════════════════════════════════════════════════════
// // PROMINENT BANNER PRINTS FOR ACCOUNT STATUS
// // ═══════════════════════════════════════════════════════════════
// function printAccountBlockedBanner(accountId, unblockDate) {
//   const days = daysUntil(unblockDate);
//   const hours = hoursUntil(unblockDate);

//   console.log(``);
//   console.log(`╔═══════════════════════════════════════════════════════════╗`);
//   console.log(`║  🚨  ACCOUNT WEEKLY CONNECTION LIMIT ACTIVE  🚨            ║`);
//   console.log(`╠═══════════════════════════════════════════════════════════╣`);
//   console.log(`║                                                            ║`);
//   console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
//   console.log(`║  🚫 STATUS:  CONNECTION REQUESTS BLOCKED                   ║`);
//   console.log(`║                                                            ║`);
//   console.log(`║  📅 Unblocks: ${formatDate(unblockDate).padEnd(45)}║`);
//   console.log(
//     `║  ⏳ Time remaining: ${(days + " days (" + hours + " hours)").padEnd(38)}║`,
//   );
//   console.log(`║                                                            ║`);
//   console.log(
//     `║  ✉️  Continuing with InMail-only mode                       ║`,
//   );
//   console.log(`║                                                            ║`);
//   console.log(`║  💡 TIP: Switch to a different account in .env             ║`);
//   console.log(`║     to send new connection requests immediately.           ║`);
//   console.log(`║                                                            ║`);
//   console.log(`║     Steps:                                                 ║`);
//   console.log(`║     1. Stop PM2:      pm2 stop linkedin-scheduler          ║`);
//   console.log(`║     2. Edit .env:     ACCOUNT_ID=account_2                 ║`);
//   console.log(`║     3. Restart PM2:   pm2 restart linkedin-scheduler       ║`);
//   console.log(`║                                                            ║`);
//   console.log(`╚═══════════════════════════════════════════════════════════╝`);
//   console.log(``);
// }

// function printLimitJustHitBanner(accountId, retryDate) {
//   console.log(``);
//   console.log(`╔═══════════════════════════════════════════════════════════╗`);
//   console.log(`║  🚨🚨🚨  WEEKLY LIMIT JUST HIT  🚨🚨🚨                    ║`);
//   console.log(`╠═══════════════════════════════════════════════════════════╣`);
//   console.log(`║                                                            ║`);
//   console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
//   console.log(`║  ⚠️  LinkedIn silently dropped the connection request      ║`);
//   console.log(`║  🔒 Marking account as connection-blocked for 7 days       ║`);
//   console.log(`║                                                            ║`);
//   console.log(
//     `║  📅 Retry allowed after: ${formatDate(retryDate).padEnd(34)}║`,
//   );
//   console.log(`║                                                            ║`);
//   console.log(
//     `║  ✉️  Switching to InMail-only mode for remaining leads      ║`,
//   );
//   console.log(`║                                                            ║`);
//   console.log(`║  💡 To keep sending connections NOW, switch account:       ║`);
//   console.log(`║     pm2 stop linkedin-scheduler                            ║`);
//   console.log(`║     [Edit .env: change ACCOUNT_ID to another account]      ║`);
//   console.log(`║     pm2 restart linkedin-scheduler                         ║`);
//   console.log(`║                                                            ║`);
//   console.log(`╚═══════════════════════════════════════════════════════════╝`);
//   console.log(``);
// }

// // ═══════════════════════════════════════════════════════════════
// // LIMIT-HIT REASONS
// // ═══════════════════════════════════════════════════════════════
// const LIMIT_HIT_REASONS = new Set([
//   "silently_dropped",
//   "connection_silently_dropped",
//   "weekly_limit_reached",
//   "daily_limit_reached",
//   "limit_reached",
//   "connect_button_not_found",
// ]);

// function isLimitHitReason(reason) {
//   if (!reason) return false;
//   const r = reason.toLowerCase();
//   return (
//     LIMIT_HIT_REASONS.has(r) ||
//     r.includes("limit") ||
//     r.includes("silently") ||
//     r.includes("dropped")
//   );
// }

// // ═══════════════════════════════════════════════════════════════
// // AI GENERATORS (unchanged)
// // ═══════════════════════════════════════════════════════════════
// async function generateConnectionNote(lead) {
//   const firstName = (lead.name || "").split(" ")[0];
//   const postSnippet = (lead.postContent || "").substring(0, 250).trim();
//   const prompt = `Write a warm LinkedIn connection request to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it in the note.

// CONTEXT:
// Person's name: ${firstName}
// Their role: ${lead.title || "Professional"}
// Their recent post: ${postSnippet}

// The note should:
// - Start with "Hi ${firstName}," or "Hey ${firstName},"
// - Reference their work in ONE brief sentence
// - Express genuine interest to connect
// - Be under 250 characters
// - Sound like a real founder wrote it
// - NOT pitch services
// - NOT mention any company name

// Write ONLY the note. No prefixes, no explanations.

// Good example:
// Hi Sarah, saw your post on AI adoption — really thoughtful take. Would love to connect and exchange notes on what's working. Cheers!

// Your note:`;

//   return await callAIWithValidation(
//     prompt,
//     firstName,
//     40,
//     280,
//     "connection note",
//   );
// }

// async function generateWarmMessage(lead) {
//   const firstName = (lead.name || "").split(" ")[0];
//   const postSnippet = (lead.postContent || "").substring(0, 200).trim();
//   const prompt = `Write a warm LinkedIn message to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it.

// CONTEXT:
// Person's name: ${firstName}
// Their role: ${lead.title || "Professional"}
// Their recent post: ${postSnippet}

// It should:
// - Start with "Hi ${firstName}," or "Thanks for connecting, ${firstName},"
// - Reference their work in ONE sentence
// - Ask ONE casual open-ended question about their work
// - Be under 250 characters
// - Sound like a real human founder
// - NOT pitch services or mention any company

// Write ONLY the message. No prefixes.

// Good example:
// Hi Sarah, thanks for connecting! Loved your AI adoption post. Curious — what's been the biggest surprise in the past 6 months of building?

// Your message:`;

//   return await callAIWithValidation(prompt, firstName, 40, 300, "warm message");
// }

// async function generateInMailSubject(lead) {
//   const firstName = (lead.name || "").split(" ")[0];
//   const postSnippet = (lead.postContent || "").substring(0, 200).trim();
//   const topMatch = lead.aiAnalysis?.topMatch || lead.scoreReasons?.[0] || "";
//   const prompt = `Write a LinkedIn InMail SUBJECT line for outreach to ${firstName}. CONTEXT is for you only.

// CONTEXT:
// Person: ${firstName}, ${lead.title || "Professional"}
// Their recent post topic: ${postSnippet.substring(0, 150)}
// Why they're relevant: ${topMatch}
// Our angle: Partnership, collaboration, or helping with their tech needs

// The subject should:
// - Be 3-8 words
// - Reference their work or challenge naturally
// - Sound like a peer reaching out, not a salesperson
// - NOT use "Quick hello" or generic phrases
// - NOT use ALL CAPS or exclamation marks
// - Feel personal and specific

// Write ONLY the subject line. No quotes, no prefixes.

// Good examples:
// Your take on MVP scaling
// Curious about your AI stack
// Fellow founder — quick question
// Loved your React Native post

// Your subject:`;

//   for (let attempt = 1; attempt <= 3; attempt++) {
//     const result = await callAI(prompt, { maxTokens: 60, temperature: 0.8 });
//     if (!result.success) {
//       if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
//       continue;
//     }

//     let subject = (result.text || "").trim();
//     subject = subject.replace(/^["']|["']$/g, "");
//     subject = subject.replace(/^Subject:\s*/i, "");
//     subject = subject.replace(/^Your subject:\s*/i, "");
//     subject = subject.split("\n")[0].trim();

//     const badPatterns = [
//       /^write/i,
//       /^good example/i,
//       /^here/i,
//       /context:/i,
//       /^the subject/i,
//       /^example/i,
//       /partnership opportunity/i,
//     ];
//     if (badPatterns.some((p) => p.test(subject))) {
//       if (attempt < 3) continue;
//       return "Quick hello";
//     }

//     if (subject.length < 5 || subject.length > 60) {
//       if (attempt < 3) continue;
//     }

//     return subject;
//   }

//   return "Quick hello";
// }

// async function generateInMailMessage(lead) {
//   const firstName = (lead.name || "").split(" ")[0];
//   const postSnippet = (lead.postContent || "").substring(0, 250).trim();
//   const topMatch = lead.aiAnalysis?.topMatch || "";
//   const prompt = `Write a LinkedIn InMail message to ${firstName}. CONTEXT is for you only.

// CONTEXT:
// Person: ${firstName}, ${lead.title || "Professional"}
// Their recent post: ${postSnippet}
// Why relevant: ${topMatch}
// Our business: Kriscent — software development agency (SaaS, AI, MVPs)
// Our approach: Genuine outreach, offer partnership or help, not pushy sales

// Write a message from you to ${firstName}. It should:
// - Start with "Hi ${firstName},"
// - Reference their post/work in ONE specific sentence
// - Briefly mention what you do (software dev / AI / SaaS) — casually, not sales-y
// - Suggest ONE thing: quick chat, share insights, explore collab, or offer help
// - End with a soft CTA like "open to a quick chat?" or "would love to hear more"
// - Be under 500 characters
// - Sound human, warm, and confident

// Write ONLY the message. No prefixes, no meta-commentary.

// Good example:
// Hi Sarah, loved your post on scaling AI infrastructure — we've been solving similar problems for founders at Kriscent. Would love to swap notes on what's working. Open to a quick 15-min chat this week?

// Your message:`;

//   return await callAIWithValidation(
//     prompt,
//     firstName,
//     100,
//     500,
//     "InMail message",
//   );
// }

// async function callAIWithValidation(
//   prompt,
//   firstName,
//   minLen,
//   maxLen,
//   purpose,
// ) {
//   for (let attempt = 1; attempt <= 3; attempt++) {
//     const result = await callAI(prompt, { maxTokens: 400, temperature: 0.7 });
//     if (!result.success) {
//       if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
//       continue;
//     }

//     let msg = (result.text || "").trim();
//     msg = msg.replace(/^["']|["']$/g, "");
//     msg = msg.replace(
//       /^(Message|Note|Response|Subject|Your (message|note|subject|response)):\s*/i,
//       "",
//     );
//     msg = msg.replace(/^Here'?s.?\:\s*/i, "");

//     const badPatterns = [
//       /we need to/i,
//       /you just connected/i,
//       /your task/i,
//       /must start with/i,
//       /the message should/i,
//       /below is context/i,
//       /under \d+ characters/i,
//       /warm follow-up/i,
//       /^context:/i,
//       /^rules:/i,
//       /^write/i,
//       /^you are/i,
//       /good example/i,
//       /example:/i,
//       /now write/i,
//       /^person's/i,
//       /the note should/i,
//       /the subject/i,
//     ];
//     if (badPatterns.some((p) => p.test(msg))) {
//       console.log(`   ⚠️  Attempt ${attempt}/3: ${purpose} — AI leaked prompt`);
//       if (attempt < 3) {
//         await new Promise((r) => setTimeout(r, 2000));
//         continue;
//       }
//       return null;
//     }

//     if (purpose !== "InMail subject") {
//       const lowerMsg = msg.toLowerCase();
//       const lowerName = firstName.toLowerCase();
//       const validStarts = [
//         `hi ${lowerName},`,
//         `hey ${lowerName},`,
//         `hello ${lowerName},`,
//         `thanks for connecting, ${lowerName},`,
//         `thanks for connecting ${lowerName},`,
//         lowerName + ",",
//       ];
//       if (!validStarts.some((s) => lowerMsg.startsWith(s))) {
//         console.log(
//           `   ⚠️  Attempt ${attempt}/3: ${purpose} — doesn't start with "${firstName}"`,
//         );
//         if (attempt < 3) continue;
//       }
//     }

//     if (msg.length < minLen || msg.length > maxLen + 50) {
//       console.log(
//         `   ⚠️  Attempt ${attempt}/3: ${purpose} — bad length (${msg.length})`,
//       );
//       if (attempt < 3) continue;
//     }

//     return msg.substring(0, maxLen);
//   }

//   console.log(`   ❌ ${purpose}: Failed after 3 attempts`);
//   return null;
// }

// // ═══════════════════════════════════════════════════════════════
// // INMAIL SENDER
// // ═══════════════════════════════════════════════════════════════
// // async function sendInMailToLead(page, lead, context, stats, reason) {
// //   console.log(`\n💎 STEP 5: Try InMail`);
// //   console.log(`   📍 Reason: ${reason}`);

// //   try {
// //     console.log(`   🌐 Navigating back to profile...`);
// //     const navOk = await safeGoto(page, lead.profileUrl);
// //     if (!navOk) {
// //       console.log(`   ❌ Navigation failed for InMail`);
// //       return false;
// //     }

// //     await closeMessagingOverlays(page);
// //     if (context) await closeExtraTabs(context, page);

// //     await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
// //     await randomDelay(2000, 3000);

// //     await behaveLikeHuman(page);
// //     await randomDelay(2000, 3000);

// //     const freshStatus = await detectProfileStatus(page);
// //     console.log(
// //       `   🔍 Fresh status — Message: ${freshStatus.hasMessage}, 1st: ${freshStatus.isFirstDegree}`,
// //     );

// //     if (!freshStatus.hasMessage) {
// //       console.log(`   ⚠️  No Message button — InMail not available`);
// //       return false;
// //     }

// //     console.log(`   🤖 Generating InMail subject...`);
// //     const inMailSubject = await generateInMailSubject(lead);
// //     console.log(`   📝 Subject: "${inMailSubject}"`);

// //     console.log(`   🤖 Generating InMail message...`);
// //     const inMailMsg = await generateInMailMessage(lead);

// //     if (!inMailMsg) {
// //       console.log(`   ❌ InMail message generation failed`);
// //       return false;
// //     }

// //     console.log(`   📝 Message: "${inMailMsg.substring(0, 80)}..."`);

// //     const msgResult = await attemptSendMessage(
// //       page,
// //       inMailMsg,
// //       inMailSubject,
// //       true,
// //       lead.accountId || "",
// //     );

// //     if (msgResult.success && msgResult.action === "message_sent") {
// //       stats.inmail++;
// //       stats.messaged++;
// //       console.log(`   ✅ InMail sent successfully!`);

// //       await markInMailSentAsFallback(lead.profileUrl, inMailMsg, inMailSubject);

// //       try {
// //         await updateLeadInSheet(lead.profileUrl, {
// //           AA: "Yes",
// //           AB: inMailMsg,
// //           AC: new Date().toISOString().split("T")[0],
// //           AO: "message_sent",
// //         });
// //       } catch {}

// //       return true;
// //     } else if (msgResult.reason === "premium_required_for_inmail") {
// //       console.log(`   💎 Premium required for InMail`);
// //       return false;
// //     } else if (msgResult.reason === "wrong_recipient") {
// //       console.log(
// //         `   ⚠️  Wrong recipient detected — skipping to protect account`,
// //       );
// //       return false;
// //     } else {
// //       console.log(`   ⚠️  InMail failed: ${msgResult.reason}`);
// //       return false;
// //     }
// //   } catch (err) {
// //     console.log(`   ⚠️  InMail attempt error: ${err.message}`);
// //     return false;
// //   }
// // }

// async function sendInMailToLead(page, lead, context, stats, reason) {
//   console.log(`\n💎 STEP 5: Try InMail`);
//   console.log(`   📍 Reason: ${reason}`);

//   try {
//     // ── SKIP if already messaged ──
//     if (lead.messageSentAt || lead.warmingMessage) {
//       console.log(`   ✅ Already messaged this lead — skipping InMail`);
//       return false;
//     }

//     console.log(`   🌐 Navigating to profile to extract compose URL...`);
//     const navOk = await safeGoto(page, lead.profileUrl);
//     if (!navOk) {
//       console.log(`   ❌ Navigation failed for InMail`);
//       return false;
//     }

//     await closeMessagingOverlays(page);
//     if (context) await closeExtraTabs(context, page);

//     await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
//     await randomDelay(2000, 3000);

//     await behaveLikeHuman(page);
//     await randomDelay(2000, 3000);

//     // Verify Message button exists on profile
//     const freshStatus = await detectProfileStatus(page);
//     console.log(
//       `   🔍 Fresh status — Message: ${freshStatus.hasMessage}, 1st: ${freshStatus.isFirstDegree}`,
//     );

//     if (!freshStatus.hasMessage) {
//       console.log(`   ⚠️  No Message button — InMail not available`);
//       return false;
//     }

//     // Generate content BEFORE navigating away from profile
//     console.log(`   🤖 Generating InMail subject...`);
//     const inMailSubject = await generateInMailSubject(lead);
//     console.log(`   📝 Subject: "${inMailSubject}"`);

//     console.log(`   🤖 Generating InMail message...`);
//     const inMailMsg = await generateInMailMessage(lead);

//     if (!inMailMsg) {
//       console.log(`   ❌ InMail message generation failed`);
//       return false;
//     }

//     console.log(`   📝 Message: "${inMailMsg.substring(0, 80)}..."`);

//     // Now attemptSendMessage will extract compose URL from current profile page
//     // and navigate directly to it
//     const msgResult = await attemptSendMessage(
//       page,
//       inMailMsg,
//       inMailSubject,
//       true,
//       lead.accountId || "",
//     );

//     if (msgResult.success && msgResult.action === "message_sent") {
//       stats.inmail++;
//       stats.messaged++;
//       console.log(`   ✅ InMail sent successfully!`);

//       await markInMailSentAsFallback(lead.profileUrl, inMailMsg, inMailSubject);

//       try {
//         await updateLeadInSheet(lead.profileUrl, {
//           AA: "Yes",
//           AB: inMailMsg,
//           AC: new Date().toISOString().split("T")[0],
//           AO: "message_sent",
//         });
//       } catch {}

//       return true;
//     } else if (msgResult.reason === "premium_required_for_inmail") {
//       console.log(`   💎 Premium required for InMail`);
//       return false;
//     } else if (msgResult.reason === "wrong_recipient") {
//       console.log(`   ⚠️  Wrong recipient — skipping to protect account`);
//       return false;
//     } else {
//       console.log(`   ⚠️  InMail failed: ${msgResult.reason}`);
//       return false;
//     }
//   } catch (err) {
//     console.log(`   ⚠️  InMail attempt error: ${err.message}`);
//     return false;
//   }
// }
// // ═══════════════════════════════════════════════════════════════
// // MAIN BATCH FUNCTION
// // ═══════════════════════════════════════════════════════════════
// export async function sendConnectionBatch(accountId, actuallySend = false) {
//   console.log(
//     `\n╔═══════════════════════════════════════════════════════════╗`,
//   );
//   console.log(`║ CONNECTION BATCH — ${accountId.padEnd(38)}║`);
//   console.log(
//     `║ Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`,
//   );
//   console.log(
//     `║ Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).padEnd(51)}║`,
//   );
//   console.log(
//     `╚═══════════════════════════════════════════════════════════╝\n`,
//   );

//   await connectDB();

//   // ── STEP 1: Check account-level weekly connection limit ──
//   const accountLimitHit = await isAccountConnectionLimitHit(accountId);
//   const unblockDate = accountLimitHit
//     ? await getConnectionUnblockDate(accountId)
//     : null;

//   if (accountLimitHit) {
//     // BIG PROMINENT BANNER
//     printAccountBlockedBanner(accountId, unblockDate);
//   } else {
//     console.log(
//       `✅ Account "${accountId}" is NOT blocked — can send connection requests`,
//     );
//   }

//   const todayConnections = await countTodayConnections(accountId);
//   const todayMessages = await countTodayMessages(accountId);
//   const connectionsRemaining = MAX_CONNECTIONS_PER_DAY - todayConnections;
//   const messagesRemaining = MAX_MESSAGES_PER_DAY - todayMessages;

//   console.log(`\n📊 TODAY'S ACTIVITY for ${accountId}:`);
//   console.log(
//     `   📨 Connections: ${todayConnections}/${MAX_CONNECTIONS_PER_DAY} (${connectionsRemaining} left)`,
//   );
//   console.log(
//     `   💌 Messages: ${todayMessages}/${MAX_MESSAGES_PER_DAY} (${messagesRemaining} left)\n`,
//   );

//   // Build lead list
//   const commentedLeads = await getLeadsByStatus("commented", accountId);
//   const discoveredLeads = await getLeadsByStatus("discovered", accountId);
//   const retryLeads = await getBlockedLeadsForRetry(accountId);

//   console.log(`📊 LEADS FOR ${accountId}:`);
//   console.log(`   Commented: ${commentedLeads.length}`);
//   console.log(`   Discovered: ${discoveredLeads.length}`);
//   console.log(
//     `   Connection retry ready (7+ days passed): ${retryLeads.length}`,
//   );

//   const seen = new Set();
//   const allLeads = [];

//   for (const lead of [...retryLeads, ...commentedLeads, ...discoveredLeads]) {
//     if (!seen.has(lead.profileUrl)) {
//       seen.add(lead.profileUrl);
//       allLeads.push(lead);
//     }
//   }

//   const retryUrls = new Set(retryLeads.map((l) => l.profileUrl));
//   allLeads.sort((a, b) => {
//     const aRetry = retryUrls.has(a.profileUrl) ? 1 : 0;
//     const bRetry = retryUrls.has(b.profileUrl) ? 1 : 0;
//     if (aRetry !== bRetry) return bRetry - aRetry;
//     return (b.conversionScore || 0) - (a.conversionScore || 0);
//   });

//   console.log(`   Total unique: ${allLeads.length}\n`);

//   const limit = accountLimitHit
//     ? allLeads.length
//     : Math.min(MAX_CONNECTIONS_PER_RUN, connectionsRemaining);

//   const toProcess = allLeads.slice(0, limit);
//   console.log(`📤 WILL PROCESS: ${toProcess.length} leads`);
//   if (accountLimitHit) {
//     console.log(`   Mode: 💎 InMail only (connections blocked)\n`);
//   } else {
//     console.log(`   Mode: 📨 Connection + 💎 InMail\n`);
//   }

//   if (toProcess.length === 0) {
//     console.log(`   ℹ️  No leads ready for this account\n`);
//     return;
//   }

//   const { context, page } = await launchBrowser(accountId);
//   let stats = {
//     contactExtracted: 0,
//     accepted: 0,
//     connected: 0,
//     messaged: 0,
//     inmail: 0,
//     skipped: 0,
//     failed: 0,
//     connectionRetried: 0,
//     weeklyLimitHit: accountLimitHit,
//     limitJustHit: false, // true if hit DURING this run
//   };

//   try {
//     if (!(await checkSession(page))) {
//       console.log(`❌ Session expired for ${accountId}`);
//       console.log(`   💡 Delete profiles/${accountId} folder and re-login`);
//       return;
//     }

//     for (let i = 0; i < toProcess.length; i++) {
//       const lead = toProcess[i];
//       lead.accountId = accountId;
//       let messageSentThisLead = false;
//       const isRetryLead = retryUrls.has(lead.profileUrl);

//       console.log(`\n${"━".repeat(63)}`);
//       console.log(
//         `[${i + 1}/${toProcess.length}] ${lead.name} (${lead.conversionScore}% ${lead.scoreCategory})`,
//       );
//       console.log(`📍 ${lead.profileUrl}`);
//       console.log(`🔑 Account: ${accountId}`);

//       if (isRetryLead) {
//         console.log(`   🔄 CONNECTION RETRY LEAD — 7 days have passed`);
//       }

//       const leadBlocked = await isConnectionBlocked(lead.profileUrl);
//       if (leadBlocked && !isRetryLead) {
//         const lead_db = await Lead.findOne(
//           { profileUrl: lead.profileUrl },
//           { connectionRetryAfter: 1 },
//         );
//         console.log(
//           `   🚫 This lead's connection blocked until: ${formatDate(lead_db?.connectionRetryAfter)}`,
//         );
//       }

//       console.log(`${"━".repeat(63)}`);

//       try {
//         if (page.isClosed()) {
//           console.log(`❌ Page closed — aborting`);
//           break;
//         }

//         if (!(await safeGoto(page, lead.profileUrl))) {
//           console.log(`❌ Navigation failed`);
//           stats.failed++;
//           continue;
//         }

//         // ── SKIP if we already sent a message to this lead ──
//         if (lead.messageSentAt || lead.warmingMessage) {
//           console.log(
//             `   ✅ Already messaged this lead on ${formatDate(lead.messageSentAt)}`,
//           );
//           console.log(`   ⏭️  Skipping to next lead`);
//           stats.skipped++;
//           await coolDown();
//           continue;
//         }

//         await closeExtraTabs(context, page);
//         await closeMessagingOverlays(page);
//         await behaveLikeHuman(page);
//         await randomDelay(2000, 4000);

//         // ══ STEP 1: Browse profile + contact info ══
//         console.log(`\n📇 STEP 1: Browse profile like a human`);

//         console.log(`   📜 Scrolling to read profile...`);
//         for (let s = 0; s < 3; s++) {
//           await page.evaluate(() =>
//             window.scrollBy({ top: 200, behavior: "smooth" }),
//           );
//           await randomDelay(1000, 2000);
//         }

//         await page.evaluate(() =>
//           window.scrollTo({ top: 0, behavior: "smooth" }),
//         );
//         await randomDelay(1500, 2500);

//         console.log(`   🖱️  Clicking "Contact info" to check details...`);
//         const contactInfo = await extractContactInfo(page, lead.profileUrl);

//         const updates = {};
//         const sheetUpdates = {};
//         let newInfoFound = false;

//         if (contactInfo.email && contactInfo.email !== lead.email) {
//           updates.email = contactInfo.email;
//           sheetUpdates.F = contactInfo.email;
//           newInfoFound = true;
//           console.log(`   📧 New email found: ${contactInfo.email}`);
//         }
//         if (contactInfo.phone && contactInfo.phone !== lead.phone) {
//           updates.phone = contactInfo.phone;
//           sheetUpdates.G = contactInfo.phone;
//           newInfoFound = true;
//           console.log(`   📱 New phone found: ${contactInfo.phone}`);
//         }
//         if (contactInfo.website && contactInfo.website !== lead.website) {
//           updates.website = contactInfo.website;
//           sheetUpdates.H = contactInfo.website;
//           newInfoFound = true;
//           console.log(`   🌐 New website found: ${contactInfo.website}`);
//         }
//         if (contactInfo.location && contactInfo.location !== lead.location) {
//           updates.location = contactInfo.location;
//           sheetUpdates.E = contactInfo.location;
//           newInfoFound = true;
//           console.log(`   📍 New location found: ${contactInfo.location}`);
//         }

//         if (newInfoFound) {
//           await updateLeadStatus(lead.profileUrl, lead.status, updates);
//           try {
//             await updateLeadInSheet(lead.profileUrl, sheetUpdates);
//           } catch {}
//           stats.contactExtracted++;
//           Object.assign(lead, updates);
//           console.log(`   💾 Updated DB + Sheet with new contact info`);
//         } else if (hasContactInfo(lead)) {
//           console.log(`   ✅ Contact info already up-to-date`);
//           if (lead.email) console.log(`      📧 ${lead.email}`);
//         } else {
//           console.log(`   ℹ️  No contact info available`);
//         }

//         await randomDelay(3000, 5000);

//         for (let s = 0; s < 2; s++) {
//           await page.evaluate(() =>
//             window.scrollBy({
//               top: 300 + Math.random() * 200,
//               behavior: "smooth",
//             }),
//           );
//           await randomDelay(1500, 2500);
//         }

//         await page.evaluate(() =>
//           window.scrollTo({ top: 0, behavior: "smooth" }),
//         );
//         await randomDelay(2000, 3500);

//         // ══ STEP 2: Check incoming invitation ══
//         console.log(`\n💌 STEP 2: Check for incoming invitation`);
//         const incoming = await checkIncomingInvitation(page, lead.name);

//         if (incoming.hasIncoming) {
//           console.log(`   💌 THEY sent us an invitation!`);

//           if (!actuallySend) {
//             console.log(`   ⚠️  Safe mode — would ACCEPT + MESSAGE`);
//             stats.skipped++;
//             await coolDown();
//             continue;
//           }

//           const acceptResult = await acceptIncomingInvitation(page, {
//             x: incoming.x,
//             y: incoming.y,
//           });

//           if (acceptResult.success) {
//             stats.accepted++;
//             await updateLeadStatus(lead.profileUrl, "accepted", {
//               connectionAcceptedAt: new Date(),
//               connectionRetryAfter: null,
//               connectionLimitHitAt: null,
//             });
//             try {
//               await updateLeadInSheet(lead.profileUrl, {
//                 V: "accepted",
//                 W: new Date().toISOString().split("T")[0],
//                 AO: "accepted",
//               });
//             } catch {}

//             await randomDelay(3000, 5000);
//             await humanRefreshPage(page);
//             await closeMessagingOverlays(page);
//             await randomDelay(3000, 5000);

//             if (messagesRemaining > stats.messaged) {
//               console.log(`   🤖 Generating warm message...`);
//               const warmMsg = await generateWarmMessage(lead);
//               if (warmMsg) {
//                 console.log(`   📝 Message: "${warmMsg.substring(0, 80)}..."`);
//                 const msgResult = await attemptSendMessage(
//                   page,
//                   warmMsg,
//                   "",
//                   true,
//                   accountId,
//                 );
//                 if (msgResult.success && msgResult.action === "message_sent") {
//                   console.log(`   ✅ Warm message sent!`);
//                   stats.messaged++;
//                   messageSentThisLead = true;
//                   await updateLeadStatus(lead.profileUrl, "message_sent", {
//                     warmingMessage: warmMsg,
//                     messageSentAt: new Date(),
//                   });
//                   try {
//                     await updateLeadInSheet(lead.profileUrl, {
//                       X: "Yes",
//                       Y: warmMsg,
//                       Z: new Date().toISOString().split("T")[0],
//                       AO: "message_sent",
//                     });
//                   } catch {}
//                 }
//               }
//             }
//           } else {
//             console.log(`   ❌ Accept failed: ${acceptResult.reason}`);
//             stats.failed++;
//           }

//           await coolDown();
//           continue;
//         }

//         // ══ STEP 3: Check profile status ══
//         console.log(`\n🔎 STEP 3: Check profile status`);
//         const status = await detectProfileStatus(page);

//         if (status.isFirstDegree) {
//           console.log(`   ✅ Already 1st degree`);
//           await updateLeadStatus(lead.profileUrl, "accepted", {
//             connectionAcceptedAt: new Date(),
//             connectionRetryAfter: null,
//             connectionLimitHitAt: null,
//           });

//           if (
//             actuallySend &&
//             status.hasMessage &&
//             messagesRemaining > stats.messaged
//           ) {
//             console.log(`   🤖 Generating warm message for 1st degree...`);
//             const warmMsg = await generateWarmMessage(lead);
//             if (warmMsg) {
//               console.log(`   📝 "${warmMsg.substring(0, 80)}..."`);
//               const msgResult = await attemptSendMessage(
//                 page,
//                 warmMsg,
//                 "",
//                 true,
//                 accountId,
//               );
//               if (msgResult.success && msgResult.action === "message_sent") {
//                 stats.messaged++;
//                 messageSentThisLead = true;
//                 await updateLeadStatus(lead.profileUrl, "message_sent", {
//                   warmingMessage: warmMsg,
//                   messageSentAt: new Date(),
//                 });
//                 try {
//                   await updateLeadInSheet(lead.profileUrl, {
//                     V: "accepted",
//                     W: new Date().toISOString().split("T")[0],
//                     X: "Yes",
//                     Y: warmMsg,
//                     Z: new Date().toISOString().split("T")[0],
//                     AO: "message_sent",
//                   });
//                 } catch {}
//                 console.log(`   ✅ Message sent!`);
//               }
//             }
//           } else {
//             try {
//               await updateLeadInSheet(lead.profileUrl, {
//                 V: "accepted",
//                 W: new Date().toISOString().split("T")[0],
//                 AO: "accepted",
//               });
//             } catch {}
//           }

//           await coolDown();
//           continue;
//         }

//         if (status.hasPending) {
//           console.log(`   ⏳ Already pending — skip`);
//           await updateLeadStatus(lead.profileUrl, "pending_acceptance");
//           stats.skipped++;
//           continue;
//         }

//         // ══ STEP 4: Decide — Connect or InMail only ══
//         const currentSent = todayConnections + stats.connected;

//         // ── CASE A: Account or lead blocked → InMail only ──
//         if (stats.weeklyLimitHit || leadBlocked) {
//           console.log(`\n📨 STEP 4: Connection blocked — InMail only mode`);

//           if (stats.weeklyLimitHit) {
//             console.log(`   🚫 Account "${accountId}" weekly limit active`);
//             const currentUnblock = await getConnectionUnblockDate(accountId);
//             console.log(`   📅 Unblocks: ${formatDate(currentUnblock)}`);
//           } else {
//             const lead_db = await Lead.findOne(
//               { profileUrl: lead.profileUrl },
//               { connectionRetryAfter: 1 },
//             );
//             console.log(
//               `   🚫 Lead-specific block until: ${formatDate(lead_db?.connectionRetryAfter)}`,
//             );
//           }

//           if (!actuallySend) {
//             console.log(`   ⚠️  Safe mode — would send InMail`);
//             stats.skipped++;
//             await coolDown();
//             continue;
//           }

//           if (!status.hasMessage) {
//             console.log(`   ⚠️  No Message button — cannot send InMail`);
//             stats.skipped++;
//             await coolDown();
//             continue;
//           }

//           if (messagesRemaining <= stats.messaged) {
//             console.log(
//               `   ⛔ Daily message limit reached (${MAX_MESSAGES_PER_DAY})`,
//             );
//             stats.skipped++;
//             await coolDown();
//             continue;
//           }

//           const sent = await sendInMailToLead(
//             page,
//             lead,
//             context,
//             stats,
//             stats.weeklyLimitHit ? "weekly_limit_active" : "lead_blocked",
//           );
//           if (sent) messageSentThisLead = true;

//           await coolDown();
//           continue;
//         }

//         // ── CASE B: No connect options ──
//         if (!status.hasConnect && !status.hasMore && !status.hasMessage) {
//           console.log(`   ⚠️  No connection options available`);
//           stats.skipped++;
//           continue;
//         }

//         // ── CASE C: No connect but Message available (3rd degree) ──
//         if (!status.hasConnect && !status.hasMore && status.hasMessage) {
//           console.log(`   ℹ️  No Connect button — going straight to InMail`);

//           if (!actuallySend) {
//             console.log(`   ⚠️  Safe mode — would send InMail`);
//             stats.skipped++;
//             await coolDown();
//             continue;
//           }

//           if (messagesRemaining > stats.messaged) {
//             const sent = await sendInMailToLead(
//               page,
//               lead,
//               context,
//               stats,
//               "no_connect_button",
//             );
//             if (sent) messageSentThisLead = true;
//           } else {
//             console.log(`   ⛔ Daily message limit — skip InMail`);
//             stats.skipped++;
//           }

//           await coolDown();
//           continue;
//         }

//         // ── CASE D: Daily connection limit reached ──
//         if (currentSent >= MAX_CONNECTIONS_PER_DAY) {
//           console.log(`   ⛔ Daily connection limit reached during batch`);

//           if (
//             actuallySend &&
//             status.hasMessage &&
//             messagesRemaining > stats.messaged
//           ) {
//             console.log(`   💎 Trying InMail instead...`);
//             const sent = await sendInMailToLead(
//               page,
//               lead,
//               context,
//               stats,
//               "daily_limit_reached",
//             );
//             if (sent) messageSentThisLead = true;
//           }

//           break;
//         }

//         // ── CASE E: Normal — attempt connection ──
//         console.log(
//           `\n📨 STEP 4: Send connection request (day: ${currentSent + 1}/${MAX_CONNECTIONS_PER_DAY})`,
//         );
//         console.log(`   🔑 Using account: ${accountId}`);

//         if (isRetryLead) {
//           console.log(
//             `   🔄 This is a RETRY (connection was blocked 7+ days ago)`,
//           );
//         }

//         console.log(`   🤖 Generating AI note...`);
//         const connectionNote = await generateConnectionNote(lead);

//         if (connectionNote) {
//           console.log(`   📝 Note: "${connectionNote.substring(0, 80)}..."`);
//         } else {
//           console.log(`   ⚠️  AI failed — sending without note`);
//         }

//         if (!actuallySend) {
//           console.log(`   ⚠️  Safe mode — NOT sending`);
//           stats.skipped++;
//           await randomDelay(3000, 5000);
//           continue;
//         }

//         console.log(`   📨 Sending connection request...`);
//         const connResult = await sendConnectionRequest(
//           page,
//           connectionNote || "",
//           lead.profileUrl,
//         );

//         // ── Connection SUCCEEDED ──
//         if (connResult.success) {
//           console.log(
//             `   ✅ Connection sent! (Note: ${connResult.hadNote ? "yes" : "no"})`,
//           );
//           stats.connected++;

//           if (isRetryLead) stats.connectionRetried++;

//           await updateLeadStatus(lead.profileUrl, "connection_sent", {
//             connectionNote: connectionNote || "",
//             connectionSentAt: new Date(),
//             connectionRetryAfter: null,
//             connectionLimitHitAt: null,
//             inMailSentAsFallback: false,
//           });

//           try {
//             await updateLeadInSheet(lead.profileUrl, {
//               S: "Yes",
//               T: connectionNote || "",
//               U: new Date().toISOString().split("T")[0],
//               V: "pending",
//               AO: isRetryLead ? "connection_retried" : "connection_sent",
//             });
//           } catch {}

//           if (!messageSentThisLead && messagesRemaining > stats.messaged) {
//             await randomDelay(3000, 5000);
//             if (!page.isClosed()) {
//               const afterStatus = await detectProfileStatus(page);
//               if (afterStatus.hasMessage && !afterStatus.isFirstDegree) {
//                 console.log(`\n💎 STEP 5: Check InMail availability`);
//                 const sent = await sendInMailToLead(
//                   page,
//                   lead,
//                   context,
//                   stats,
//                   "post_connection",
//                 );
//                 if (sent) messageSentThisLead = true;
//               } else {
//                 console.log(
//                   `   ℹ️  No Message button yet — waiting for acceptance`,
//                 );
//               }
//             }
//           }

//           await coolDown();
//           continue;
//         }

//         // ── Connection FAILED ──
//         console.log(`   ❌ Connection failed: ${connResult.reason}`);

//         if (isLimitHitReason(connResult.reason)) {
//           // Mark THIS lead as blocked
//           await markConnectionLimitHit(lead.profileUrl);

//           // Set account-level flag
//           stats.weeklyLimitHit = true;
//           stats.limitJustHit = true;

//           const retryDate = new Date();
//           retryDate.setDate(retryDate.getDate() + CONNECTION_BLOCK_DAYS);

//           // BIG BANNER — this is critical info
//           printLimitJustHitBanner(accountId, retryDate);

//           // Try InMail as fallback
//           console.log(`   ✉️  Attempting InMail as fallback for this lead...`);

//           if (actuallySend && messagesRemaining > stats.messaged) {
//             const currentStatus = await detectProfileStatus(page);

//             if (currentStatus.hasMessage) {
//               const sent = await sendInMailToLead(
//                 page,
//                 lead,
//                 context,
//                 stats,
//                 connResult.reason,
//               );
//               if (sent) {
//                 messageSentThisLead = true;
//                 await coolDown();
//                 continue;
//               }
//             } else {
//               console.log(`   ⚠️  No Message button for InMail fallback`);
//             }
//           }

//           stats.failed++;
//           await coolDown();
//           continue;
//         }

//         stats.failed++;
//         await updateLeadStatus(lead.profileUrl, lead.status, {
//           lastError: connResult.reason,
//           retryCount: (lead.retryCount || 0) + 1,
//         });
//         await coolDown();
//       } catch (err) {
//         console.log(`❌ Error processing lead: ${err.message}`);
//         stats.failed++;
//         if (
//           err.message.includes("browser has been closed") ||
//           err.message.includes("Target page")
//         ) {
//           console.log(`💥 Browser died — stopping`);
//           break;
//         }
//       }
//     }

//     // ── Final Summary ──
//     const finalConnections = await countTodayConnections(accountId);
//     const finalMessages = await countTodayMessages(accountId);
//     const finalUnblockDate = await getConnectionUnblockDate(accountId);

//     console.log(
//       `\n╔═══════════════════════════════════════════════════════════╗`,
//     );
//     console.log(
//       `║  CONNECTION BATCH COMPLETE                                 ║`,
//     );
//     console.log(`║  Account: ${accountId.padEnd(48)}║`);
//     console.log(
//       `║  Ended:   ${new Date().toLocaleString("en-US").padEnd(48)}║`,
//     );
//     console.log(
//       `║                                                            ║`,
//     );
//     console.log(
//       `║  📇 Contact extracted:    ${String(stats.contactExtracted).padEnd(33)}║`,
//     );
//     console.log(
//       `║  💌 Accepted incoming:    ${String(stats.accepted).padEnd(33)}║`,
//     );
//     console.log(
//       `║  ✅ New connections:      ${String(stats.connected).padEnd(33)}║`,
//     );
//     console.log(
//       `║  🔄 Connection retries:   ${String(stats.connectionRetried).padEnd(33)}║`,
//     );
//     console.log(
//       `║  💬 Messages sent:        ${String(stats.messaged).padEnd(33)}║`,
//     );
//     console.log(
//       `║  💎 InMails sent:         ${String(stats.inmail).padEnd(33)}║`,
//     );
//     console.log(
//       `║  ⏭️  Skipped:              ${String(stats.skipped).padEnd(33)}║`,
//     );
//     console.log(
//       `║  ❌ Failed:               ${String(stats.failed).padEnd(33)}║`,
//     );
//     console.log(
//       `║                                                            ║`,
//     );
//     console.log(
//       `║  📊 TODAY'S TOTALS:                                        ║`,
//     );
//     console.log(
//       `║     Connections: ${String(finalConnections).padEnd(5)}/ ${MAX_CONNECTIONS_PER_DAY}                                   ║`,
//     );
//     console.log(
//       `║     Messages:    ${String(finalMessages).padEnd(5)}/ ${MAX_MESSAGES_PER_DAY}                                   ║`,
//     );
//     console.log(
//       `╚═══════════════════════════════════════════════════════════╝\n`,
//     );

//     // ── Show account status banner AGAIN at end (so it's the last thing you see) ──
//     if (stats.weeklyLimitHit || finalUnblockDate) {
//       printAccountBlockedBanner(accountId, finalUnblockDate);
//     }
//   } catch (err) {
//     console.error(`❌ Fatal: ${err.message}`);
//   } finally {
//     await closeBrowser(context);
//     console.log(`🔒 Browser closed\n`);
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // COOLDOWN
// // ═══════════════════════════════════════════════════════════════
// async function coolDown() {
//   const cd =
//     (COOLDOWN_MIN_SEC +
//       Math.floor(Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC))) *
//     1000;
//   console.log(`\n⏰ Cooling ${Math.floor(cd / 1000)}s before next profile...`);
//   await new Promise((r) => setTimeout(r, cd));
// }

/////////////////////////////////////////////////////////////////

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
  markConnectionLimitHit,
  markInMailSentAsFallback,
  isConnectionBlocked,
  isAccountConnectionLimitHit,
  getConnectionUnblockDate,
  getBlockedLeadsForRetry,
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
// LIMITS
// ═══════════════════════════════════════════════════════════════
const MAX_CONNECTIONS_PER_RUN = 20;
const MAX_CONNECTIONS_PER_DAY = 20;
const MAX_MESSAGES_PER_DAY = 15;
const COOLDOWN_MIN_SEC = 30;
const COOLDOWN_MAX_SEC = 75;
const CONNECTION_BLOCK_DAYS = 7;

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

function formatDate(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date) {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function hoursUntil(date) {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

// ═══════════════════════════════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════════════════════════════
function printAccountBlockedBanner(accountId, unblockDate) {
  const days = daysUntil(unblockDate);
  const hours = hoursUntil(unblockDate);
  console.log(``);
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🚨  ACCOUNT WEEKLY CONNECTION LIMIT ACTIVE  🚨            ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
  console.log(`║  🚫 STATUS:  CONNECTION REQUESTS BLOCKED                   ║`);
  console.log(`║  📅 Unblocks: ${formatDate(unblockDate).padEnd(45)}║`);
  console.log(
    `║  ⏳ Time remaining: ${(days + " days (" + hours + " hours)").padEnd(38)}║`,
  );
  console.log(
    `║  ✉️  Continuing with InMail-only mode                       ║`,
  );
  console.log(`║  💡 TIP: Switch to a different account in .env             ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(``);
}

function printLimitJustHitBanner(accountId, retryDate) {
  console.log(``);
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🚨🚨🚨  WEEKLY LIMIT JUST HIT  🚨🚨🚨                    ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
  console.log(`║  ⚠️  LinkedIn silently dropped the connection request      ║`);
  console.log(`║  🔒 Marking account as connection-blocked for 7 days       ║`);
  console.log(
    `║  📅 Retry allowed after: ${formatDate(retryDate).padEnd(34)}║`,
  );
  console.log(
    `║  ✉️  Switching to InMail-only mode                          ║`,
  );
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(``);
}

function printInMailLimitBanner(accountId) {
  console.log(``);
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  💎  INMAIL LIMIT HIT (Free tier exhausted)  💎           ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║  🔴 ACCOUNT: ${accountId.padEnd(46)}║`);
  console.log(`║  🚫 No more InMail credits available                       ║`);
  console.log(`║  💾 Will save profile + contact info only                  ║`);
  console.log(
    `║  ⏭️  Skipping message send for remaining leads              ║`,
  );
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(``);
}

// ═══════════════════════════════════════════════════════════════
// LIMIT-HIT REASONS
// ═══════════════════════════════════════════════════════════════
const LIMIT_HIT_REASONS = new Set([
  "silently_dropped",
  "connection_silently_dropped",
  "weekly_limit_reached",
  "daily_limit_reached",
  "limit_reached",
  "connect_button_not_found",
]);

function isLimitHitReason(reason) {
  if (!reason) return false;
  const r = reason.toLowerCase();
  return (
    LIMIT_HIT_REASONS.has(r) ||
    r.includes("limit") ||
    r.includes("silently") ||
    r.includes("dropped")
  );
}

// ═══════════════════════════════════════════════════════════════
// AI GENERATORS (unchanged)
// ═══════════════════════════════════════════════════════════════
async function generateConnectionNote(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 250).trim();
  const prompt = `Write a warm LinkedIn connection request to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it in the note.

CONTEXT:
Person's name: ${firstName}
Their role: ${lead.title || "Professional"}
Their recent post: ${postSnippet}

The note should:
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

async function generateWarmMessage(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 200).trim();
  const prompt = `Write a warm LinkedIn message to ${firstName}. Below is CONTEXT ONLY — do NOT repeat any of it.

CONTEXT:
Person's name: ${firstName}
Their role: ${lead.title || "Professional"}
Their recent post: ${postSnippet}

It should:
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

async function generateInMailSubject(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 200).trim();
  const topMatch = lead.aiAnalysis?.topMatch || lead.scoreReasons?.[0] || "";
  const prompt = `Write a LinkedIn InMail SUBJECT line for outreach to ${firstName}. CONTEXT is for you only.

CONTEXT:
Person: ${firstName}, ${lead.title || "Professional"}
Their recent post topic: ${postSnippet.substring(0, 150)}
Why they're relevant: ${topMatch}
Our angle: Partnership, collaboration, or helping with their tech needs

The subject should:
- Be 3-8 words
- Reference their work or challenge naturally
- Sound like a peer reaching out, not a salesperson
- NOT use "Quick hello" or generic phrases
- NOT use ALL CAPS or exclamation marks
- Feel personal and specific

Write ONLY the subject line. No quotes, no prefixes.

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
    subject = subject.split("\n")[0].trim();
    const badPatterns = [/^write/i, /^good example/i, /^here/i, /context:/i];
    if (badPatterns.some((p) => p.test(subject))) {
      if (attempt < 3) continue;
      return "Quick hello";
    }
    if (subject.length < 5 || subject.length > 60) {
      if (attempt < 3) continue;
    }
    return subject;
  }
  return "Quick hello";
}

async function generateInMailMessage(lead) {
  const firstName = (lead.name || "").split(" ")[0];
  const postSnippet = (lead.postContent || "").substring(0, 250).trim();
  const topMatch = lead.aiAnalysis?.topMatch || "";
  const prompt = `Write a LinkedIn InMail message to ${firstName}. CONTEXT is for you only.

CONTEXT:
Person: ${firstName}, ${lead.title || "Professional"}
Their recent post: ${postSnippet}
Why relevant: ${topMatch}
Our business: Kriscent — software development agency (SaaS, AI, MVPs)
Our approach: Genuine outreach, offer partnership or help, not pushy sales

Write a message from you to ${firstName}. It should:
- Start with "Hi ${firstName},"
- Reference their post/work in ONE specific sentence
- Briefly mention what you do (software dev / AI / SaaS) — casually
- Suggest ONE thing: quick chat, share insights, explore collab
- End with a soft CTA
- Be under 500 characters

Write ONLY the message. No prefixes.

Your message:`;

  return await callAIWithValidation(
    prompt,
    firstName,
    100,
    500,
    "InMail message",
  );
}

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
    msg = msg.replace(/^["']|["']$/g, "");
    msg = msg.replace(
      /^(Message|Note|Response|Subject|Your (message|note|subject|response)):\s*/i,
      "",
    );
    msg = msg.replace(/^Here'?s.?\:\s*/i, "");
    const badPatterns = [
      /we need to/i,
      /you just connected/i,
      /your task/i,
      /must start with/i,
      /the message should/i,
      /below is context/i,
      /under \d+ characters/i,
      /^context:/i,
      /^write/i,
      /^you are/i,
      /good example/i,
      /example:/i,
    ];
    if (badPatterns.some((p) => p.test(msg))) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return null;
    }
    if (purpose !== "InMail subject") {
      const lowerMsg = msg.toLowerCase();
      const lowerName = firstName.toLowerCase();
      const validStarts = [
        `hi ${lowerName},`,
        `hey ${lowerName},`,
        `hello ${lowerName},`,
        `thanks for connecting, ${lowerName},`,
        `thanks for connecting ${lowerName},`,
        lowerName + ",",
      ];
      if (!validStarts.some((s) => lowerMsg.startsWith(s))) {
        if (attempt < 3) continue;
      }
    }
    if (msg.length < minLen || msg.length > maxLen + 50) {
      if (attempt < 3) continue;
    }
    return msg.substring(0, maxLen);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SAVE LEAD (for skip cases — contact info collected but no action)
// ═══════════════════════════════════════════════════════════════
async function saveLeadWithoutAction(lead, reason) {
  console.log(`   💾 Saving lead info to DB + Sheet (reason: ${reason})`);
  try {
    await updateLeadStatus(lead.profileUrl, "skipped", {
      lastError: reason,
      skippedReason: reason,
      skippedAt: new Date(),
    });

    await updateLeadInSheet(lead.profileUrl, {
      AO: `skipped: ${reason}`,
    });
  } catch (err) {
    console.log(`   ⚠️  Save error: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// INMAIL SENDER
// ═══════════════════════════════════════════════════════════════
async function sendInMailToLead(page, lead, context, stats, reason) {
  console.log(`\n💎 STEP 5: Try InMail`);
  console.log(`   📍 Reason: ${reason}`);

   if (!page || page.isClosed()) {
    console.log(`   ⚠️  Page is closed — cannot send InMail`);
    return { sent: false, reason: "page_closed" };
  }

  try {
    if (lead.messageSentAt || lead.warmingMessage) {
      console.log(`   ✅ Already messaged this lead — skipping InMail`);
      return { sent: false, reason: "already_messaged" };
    }

    console.log(`   🌐 Navigating to profile to extract compose URL...`);
    const navOk = await safeGoto(page, lead.profileUrl);
    if (!navOk) {
      console.log(`   ❌ Navigation failed for InMail`);
      return { sent: false, reason: "nav_failed" };
    }

    await closeMessagingOverlays(page);
    if (context) await closeExtraTabs(context, page);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await randomDelay(2000, 3000);

    await behaveLikeHuman(page);
    await randomDelay(2000, 3000);

    const freshStatus = await detectProfileStatus(page);
    console.log(
      `   🔍 Fresh status — Message: ${freshStatus.hasMessage}, 1st: ${freshStatus.isFirstDegree}`,
    );

    if (!freshStatus.hasMessage) {
      console.log(`   ⚠️  No Message button — InMail not available`);
      return { sent: false, reason: "no_message_button" };
    }

    console.log(`   🤖 Generating InMail subject...`);
    const inMailSubject = await generateInMailSubject(lead);
    console.log(`   📝 Subject: "${inMailSubject}"`);

    console.log(`   🤖 Generating InMail message...`);
    const inMailMsg = await generateInMailMessage(lead);

    if (!inMailMsg) {
      console.log(`   ❌ InMail message generation failed`);
      return { sent: false, reason: "generation_failed" };
    }

    console.log(`   📝 Message: "${inMailMsg.substring(0, 80)}..."`);

    const msgResult = await attemptSendMessage(
      page,
      inMailMsg,
      inMailSubject,
      true,
      lead.accountId || "",
    );

    if (msgResult.success && msgResult.action === "message_sent") {
      stats.inmail++;
      stats.messaged++;
      console.log(`   ✅ InMail sent successfully!`);

      await markInMailSentAsFallback(lead.profileUrl, inMailMsg, inMailSubject);

      try {
        await updateLeadInSheet(lead.profileUrl, {
          AA: "Yes",
          AB: inMailMsg,
          AC: new Date().toISOString().split("T")[0],
          AO: "message_sent",
        });
      } catch {}

      return { sent: true, reason: "message_sent" };
    } else if (msgResult.reason === "premium_required_for_inmail") {
      console.log(`   💎 Premium required for InMail`);
      return { sent: false, reason: "premium_required" };
    } else if (msgResult.reason === "wrong_recipient") {
      console.log(`   ⚠️  Wrong recipient — skipping to protect account`);
      return { sent: false, reason: "wrong_recipient" };
    } else {
      console.log(`   ⚠️  InMail failed: ${msgResult.reason}`);
      return { sent: false, reason: msgResult.reason };
    }
  } catch (err) {
    console.log(`   ⚠️  InMail attempt error: ${err.message}`);
    return { sent: false, reason: "error" };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN BATCH FUNCTION
// ═══════════════════════════════════════════════════════════════
export async function sendConnectionBatch(accountId, actuallySend = false) {
  console.log(
    `\n╔═══════════════════════════════════════════════════════════╗`,
  );
  console.log(`║ CONNECTION BATCH — ${accountId.padEnd(38)}║`);
  console.log(
    `║ Mode: ${(actuallySend ? "REAL SEND" : "SAFE (dry run)").padEnd(51)}║`,
  );
  console.log(
    `║ Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).padEnd(51)}║`,
  );
  console.log(
    `╚═══════════════════════════════════════════════════════════╝\n`,
  );

  await connectDB();

  const accountLimitHit = await isAccountConnectionLimitHit(accountId);
  const unblockDate = accountLimitHit
    ? await getConnectionUnblockDate(accountId)
    : null;

  if (accountLimitHit) {
    printAccountBlockedBanner(accountId, unblockDate);
  } else {
    console.log(
      `✅ Account "${accountId}" is NOT blocked — can send connection requests`,
    );
  }

  const todayConnections = await countTodayConnections(accountId);
  const todayMessages = await countTodayMessages(accountId);
  const connectionsRemaining = MAX_CONNECTIONS_PER_DAY - todayConnections;
  const messagesRemaining = MAX_MESSAGES_PER_DAY - todayMessages;

  console.log(`\n📊 TODAY'S ACTIVITY for ${accountId}:`);
  console.log(
    `   📨 Connections: ${todayConnections}/${MAX_CONNECTIONS_PER_DAY} (${connectionsRemaining} left)`,
  );
  console.log(
    `   💌 Messages: ${todayMessages}/${MAX_MESSAGES_PER_DAY} (${messagesRemaining} left)\n`,
  );

  const commentedLeads = await getLeadsByStatus("commented", accountId);
  const discoveredLeads = await getLeadsByStatus("discovered", accountId);
  const retryLeads = await getBlockedLeadsForRetry(accountId);

  console.log(`📊 LEADS FOR ${accountId}:`);
  console.log(`   Commented: ${commentedLeads.length}`);
  console.log(`   Discovered: ${discoveredLeads.length}`);
  console.log(
    `   Connection retry ready (7+ days passed): ${retryLeads.length}`,
  );

  const seen = new Set();
  const allLeads = [];
  for (const lead of [...retryLeads, ...commentedLeads, ...discoveredLeads]) {
    if (!seen.has(lead.profileUrl)) {
      seen.add(lead.profileUrl);
      allLeads.push(lead);
    }
  }

  const retryUrls = new Set(retryLeads.map((l) => l.profileUrl));
  allLeads.sort((a, b) => {
    const aRetry = retryUrls.has(a.profileUrl) ? 1 : 0;
    const bRetry = retryUrls.has(b.profileUrl) ? 1 : 0;
    if (aRetry !== bRetry) return bRetry - aRetry;
    return (b.conversionScore || 0) - (a.conversionScore || 0);
  });

  console.log(`   Total unique: ${allLeads.length}\n`);

  const limit = accountLimitHit
    ? allLeads.length
    : Math.min(MAX_CONNECTIONS_PER_RUN, connectionsRemaining);

  const toProcess = allLeads.slice(0, limit);
  console.log(`📤 WILL PROCESS: ${toProcess.length} leads`);
  console.log(
    accountLimitHit
      ? `   Mode: 💎 InMail only (connections blocked)\n`
      : `   Mode: 📨 Connection + 💎 InMail\n`,
  );

  if (toProcess.length === 0) {
    console.log(`   ℹ️  No leads ready for this account\n`);
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
    connectionRetried: 0,
    contactOnlySaved: 0, // NEW: leads where only contact info was saved
    weeklyLimitHit: accountLimitHit,
    limitJustHit: false,
    inMailLimitHit: false, // NEW: true if InMail limit detected during run
  };

  try {
    if (!(await checkSession(page))) {
      console.log(`❌ Session expired for ${accountId}`);
      console.log(`   💡 Delete profiles/${accountId} folder and re-login`);
      return;
    }

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      lead.accountId = accountId;
      let messageSentThisLead = false;
      const isRetryLead = retryUrls.has(lead.profileUrl);

      console.log(`\n${"━".repeat(63)}`);
      console.log(
        `[${i + 1}/${toProcess.length}] ${lead.name} (${lead.conversionScore}% ${lead.scoreCategory})`,
      );
      console.log(`📍 ${lead.profileUrl}`);
      console.log(`🔑 Account: ${accountId}`);

      if (isRetryLead)
        console.log(`   🔄 CONNECTION RETRY LEAD — 7 days have passed`);

      const leadBlocked = await isConnectionBlocked(lead.profileUrl);
      if (leadBlocked && !isRetryLead) {
        const lead_db = await Lead.findOne(
          { profileUrl: lead.profileUrl },
          { connectionRetryAfter: 1 },
        );
        console.log(
          `   🚫 This lead's connection blocked until: ${formatDate(lead_db?.connectionRetryAfter)}`,
        );
      }

      console.log(`${"━".repeat(63)}`);

      try {
        if (page.isClosed()) {
          console.log(`❌ Page closed — aborting`);
          break;
        }

        if (!(await safeGoto(page, lead.profileUrl))) {
          console.log(`❌ Navigation failed`);
          stats.failed++;
          continue;
        }

        // Skip if already messaged
        if (lead.messageSentAt || lead.warmingMessage) {
          console.log(
            `   ✅ Already messaged this lead on ${formatDate(lead.messageSentAt)}`,
          );
          console.log(`   ⏭️  Skipping to next lead`);
          stats.skipped++;
          await coolDown();
          continue;
        }

        await closeExtraTabs(context, page);
        await closeMessagingOverlays(page);
        await behaveLikeHuman(page);
        await randomDelay(2000, 4000);

        // ══ STEP 1: Browse profile + contact info ══
        // ══ STEP 1: Browse profile + contact info ══
        console.log(`\n📇 STEP 1: Browse profile like a human`);
        console.log(`   📜 Scrolling to read profile...`);
        for (let s = 0; s < 3; s++) {
          await page.evaluate(() =>
            window.scrollBy({ top: 200, behavior: "smooth" }),
          );
          await randomDelay(1000, 2000);
        }
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "smooth" }),
        );
        await randomDelay(1500, 2500);

        console.log(`   🖱️  Clicking "Contact info" to check details...`);
        const contactInfo = await extractContactInfo(page, lead.profileUrl);

        const updates = {};
        const sheetUpdates = {};
        let newInfoFound = false;

        // ── NEW: Save headline (column D in sheet) ──
        if (contactInfo.headline && contactInfo.headline !== lead.headline) {
          updates.headline = contactInfo.headline;
          sheetUpdates.D = contactInfo.headline;
          newInfoFound = true;
          console.log(
            `   💼 New headline: ${contactInfo.headline.substring(0, 60)}`,
          );
        }

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
          console.log(`   💾 Updated DB + Sheet with new info`);
        } else if (hasContactInfo(lead)) {
          console.log(`   ✅ Contact info already up-to-date`);
          if (lead.email) console.log(`      📧 ${lead.email}`);
        } else {
          console.log(`   ℹ️  No contact info available`);
        }

        await randomDelay(3000, 5000);
        for (let s = 0; s < 2; s++) {
          await page.evaluate(() =>
            window.scrollBy({
              top: 300 + Math.random() * 200,
              behavior: "smooth",
            }),
          );
          await randomDelay(1500, 2500);
        }
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "smooth" }),
        );
        await randomDelay(2000, 3500);

        // ══ STEP 2: Check incoming invitation ══
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
              connectionRetryAfter: null,
              connectionLimitHitAt: null,
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

            if (messagesRemaining > stats.messaged && !stats.inMailLimitHit) {
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
                } else if (msgResult.reason === "premium_required_for_inmail") {
                  stats.inMailLimitHit = true;
                  printInMailLimitBanner(accountId);
                }
              }
            }
          } else {
            console.log(`   ❌ Accept failed: ${acceptResult.reason}`);
            stats.failed++;
          }

          await coolDown();
          continue;
        }

        // ══ STEP 3: Check profile status ══
        console.log(`\n🔎 STEP 3: Check profile status`);
        const status = await detectProfileStatus(page);

        if (status.isFirstDegree) {
          console.log(`   ✅ Already 1st degree`);
          await updateLeadStatus(lead.profileUrl, "accepted", {
            connectionAcceptedAt: new Date(),
            connectionRetryAfter: null,
            connectionLimitHitAt: null,
          });

          if (
            actuallySend &&
            status.hasMessage &&
            messagesRemaining > stats.messaged &&
            !stats.inMailLimitHit
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
              } else if (msgResult.reason === "premium_required_for_inmail") {
                stats.inMailLimitHit = true;
                printInMailLimitBanner(accountId);
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

        if (status.hasPending) {
          console.log(`   ⏳ Already pending — skip`);
          await updateLeadStatus(lead.profileUrl, "pending_acceptance");
          stats.skipped++;
          continue;
        }

        // ══ STEP 4: Decide — Connect or InMail only ══
        const currentSent = todayConnections + stats.connected;

        // ── CASE A: Account blocked / lead blocked → InMail only ──
        if (stats.weeklyLimitHit || leadBlocked) {
          console.log(`\n📨 STEP 4: Connection blocked — InMail only mode`);

          if (stats.weeklyLimitHit) {
            console.log(`   🚫 Account "${accountId}" weekly limit active`);
          } else {
            const lead_db = await Lead.findOne(
              { profileUrl: lead.profileUrl },
              { connectionRetryAfter: 1 },
            );
            console.log(
              `   🚫 Lead-specific block until: ${formatDate(lead_db?.connectionRetryAfter)}`,
            );
          }

          if (!actuallySend) {
            console.log(`   ⚠️  Safe mode — would send InMail`);
            stats.skipped++;
            await coolDown();
            continue;
          }

          // ── If InMail limit ALSO hit → just save contact info + skip ──
          if (stats.inMailLimitHit) {
            console.log(
              `   💎 InMail limit already hit — saving contact info only`,
            );
            await saveLeadWithoutAction(lead, "both_limits_hit");
            stats.contactOnlySaved++;
            await coolDown();
            continue;
          }

          if (!status.hasMessage) {
            console.log(`   ⚠️  No Message button — cannot send InMail`);
            await saveLeadWithoutAction(lead, "no_message_button");
            stats.skipped++;
            await coolDown();
            continue;
          }

          if (messagesRemaining <= stats.messaged) {
            console.log(
              `   ⛔ Daily message limit reached (${MAX_MESSAGES_PER_DAY})`,
            );
            stats.skipped++;
            await coolDown();
            continue;
          }

          const inMailResult = await sendInMailToLead(
            page,
            lead,
            context,
            stats,
            stats.weeklyLimitHit ? "weekly_limit_active" : "lead_blocked",
          );

          if (inMailResult.sent) {
            messageSentThisLead = true;
          } else if (inMailResult.reason === "premium_required") {
            // InMail limit just detected
            stats.inMailLimitHit = true;
            printInMailLimitBanner(accountId);
            await saveLeadWithoutAction(lead, "inmail_premium_required");
            stats.contactOnlySaved++;
          }

          await coolDown();
          continue;
        }

        // ── CASE B: No connect options at all ──
        if (!status.hasConnect && !status.hasMore && !status.hasMessage) {
          console.log(`   ⚠️  No connection options available`);
          await saveLeadWithoutAction(lead, "no_options_available");
          stats.skipped++;
          continue;
        }

        // ── CASE C: No connect but Message available (3rd degree) ──
        if (!status.hasConnect && !status.hasMore && status.hasMessage) {
          console.log(`   ℹ️  No Connect button — going straight to InMail`);

          if (!actuallySend) {
            console.log(`   ⚠️  Safe mode — would send InMail`);
            stats.skipped++;
            await coolDown();
            continue;
          }

          if (stats.inMailLimitHit) {
            console.log(`   💎 InMail limit hit — saving contact only`);
            await saveLeadWithoutAction(lead, "inmail_limit_hit");
            stats.contactOnlySaved++;
            await coolDown();
            continue;
          }

          if (messagesRemaining > stats.messaged) {
            const inMailResult = await sendInMailToLead(
              page,
              lead,
              context,
              stats,
              "no_connect_button",
            );
            if (inMailResult.sent) {
              messageSentThisLead = true;
            } else if (inMailResult.reason === "premium_required") {
              stats.inMailLimitHit = true;
              printInMailLimitBanner(accountId);
              await saveLeadWithoutAction(lead, "inmail_premium_required");
              stats.contactOnlySaved++;
            }
          } else {
            console.log(`   ⛔ Daily message limit — skip InMail`);
            stats.skipped++;
          }

          await coolDown();
          continue;
        }

        // ── CASE D: Daily connection limit reached ──
        if (currentSent >= MAX_CONNECTIONS_PER_DAY) {
          console.log(`   ⛔ Daily connection limit reached during batch`);

          if (
            actuallySend &&
            status.hasMessage &&
            messagesRemaining > stats.messaged &&
            !stats.inMailLimitHit
          ) {
            console.log(`   💎 Trying InMail instead...`);
            const inMailResult = await sendInMailToLead(
              page,
              lead,
              context,
              stats,
              "daily_limit_reached",
            );
            if (inMailResult.sent) messageSentThisLead = true;
            else if (inMailResult.reason === "premium_required") {
              stats.inMailLimitHit = true;
              printInMailLimitBanner(accountId);
            }
          }

          break;
        }

        // ── CASE E: Normal — attempt connection ──
        console.log(
          `\n📨 STEP 4: Send connection request (day: ${currentSent + 1}/${MAX_CONNECTIONS_PER_DAY})`,
        );
        console.log(`   🔑 Using account: ${accountId}`);

        if (isRetryLead)
          console.log(
            `   🔄 This is a RETRY (connection was blocked 7+ days ago)`,
          );

        console.log(`   🤖 Generating AI note...`);
        const connectionNote = await generateConnectionNote(lead);

        if (connectionNote) {
          console.log(`   📝 Note: "${connectionNote.substring(0, 80)}..."`);
        } else {
          console.log(`   ⚠️  AI failed — sending without note`);
        }

        if (!actuallySend) {
          console.log(`   ⚠️  Safe mode — NOT sending`);
          stats.skipped++;
          await randomDelay(3000, 5000);
          continue;
        }

        console.log(`   📨 Sending connection request...`);
        const connResult = await sendConnectionRequest(
          page,
          connectionNote || "",
          lead.profileUrl,
        );

        // ── Connection SUCCEEDED ──
        if (connResult.success) {
          console.log(
            `   ✅ Connection sent! (Note: ${connResult.hadNote ? "yes" : "no"})`,
          );
          if (connResult.notesLimitHit) {
            console.log(
              `   ℹ️  (Fell back to "Send without note" due to notes limit)`,
            );
          }
          stats.connected++;
          if (isRetryLead) stats.connectionRetried++;

          await updateLeadStatus(lead.profileUrl, "connection_sent", {
            connectionNote: connectionNote || "",
            connectionSentAt: new Date(),
            connectionRetryAfter: null,
            connectionLimitHitAt: null,
            inMailSentAsFallback: false,
          });

          try {
            await updateLeadInSheet(lead.profileUrl, {
              S: "Yes",
              T: connectionNote || "",
              U: new Date().toISOString().split("T")[0],
              V: "pending",
              AO: isRetryLead ? "connection_retried" : "connection_sent",
            });
          } catch {}

          // Try InMail as follow-up (once)
          if (
            !messageSentThisLead &&
            messagesRemaining > stats.messaged &&
            !stats.inMailLimitHit
          ) {
            await randomDelay(3000, 5000);
            if (!page.isClosed()) {
              const afterStatus = await detectProfileStatus(page);
              if (afterStatus.hasMessage && !afterStatus.isFirstDegree) {
                console.log(`\n💎 STEP 5: Check InMail availability`);
                const inMailResult = await sendInMailToLead(
                  page,
                  lead,
                  context,
                  stats,
                  "post_connection",
                );
                if (inMailResult.sent) {
                  messageSentThisLead = true;
                } else if (inMailResult.reason === "premium_required") {
                  stats.inMailLimitHit = true;
                  printInMailLimitBanner(accountId);
                }
              } else {
                console.log(
                  `   ℹ️  No Message button yet — waiting for acceptance`,
                );
              }
            }
          }

          await coolDown();
          continue;
        }

        // ── Connection FAILED ──
        console.log(`   ❌ Connection failed: ${connResult.reason}`);

        if (isLimitHitReason(connResult.reason)) {
          await markConnectionLimitHit(lead.profileUrl);
          stats.weeklyLimitHit = true;
          stats.limitJustHit = true;

          const retryDate = new Date();
          retryDate.setDate(retryDate.getDate() + CONNECTION_BLOCK_DAYS);
          printLimitJustHitBanner(accountId, retryDate);

          console.log(`   ✉️  Attempting InMail as fallback for this lead...`);

          if (
            actuallySend &&
            messagesRemaining > stats.messaged &&
            !stats.inMailLimitHit
          ) {
            const currentStatus = await detectProfileStatus(page);
            if (currentStatus.hasMessage) {
              const inMailResult = await sendInMailToLead(
                page,
                lead,
                context,
                stats,
                connResult.reason,
              );
              if (inMailResult.sent) {
                messageSentThisLead = true;
                await coolDown();
                continue;
              } else if (inMailResult.reason === "premium_required") {
                stats.inMailLimitHit = true;
                printInMailLimitBanner(accountId);
                await saveLeadWithoutAction(lead, "both_limits_hit");
                stats.contactOnlySaved++;
              }
            } else {
              console.log(`   ⚠️  No Message button for InMail fallback`);
            }
          } else if (stats.inMailLimitHit) {
            await saveLeadWithoutAction(lead, "both_limits_hit");
            stats.contactOnlySaved++;
          }

          stats.failed++;
          await coolDown();
          continue;
        }

        stats.failed++;
        await updateLeadStatus(lead.profileUrl, lead.status, {
          lastError: connResult.reason,
          retryCount: (lead.retryCount || 0) + 1,
        });
        await coolDown();
      } catch (err) {
        console.log(`❌ Error processing lead: ${err.message}`);
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

    // ── Final Summary ──
    const finalConnections = await countTodayConnections(accountId);
    const finalMessages = await countTodayMessages(accountId);
    const finalUnblockDate = await getConnectionUnblockDate(accountId);

    console.log(
      `\n╔═══════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  CONNECTION BATCH COMPLETE                                 ║`,
    );
    console.log(`║  Account: ${accountId.padEnd(48)}║`);
    console.log(
      `║  Ended:   ${new Date().toLocaleString("en-US").padEnd(48)}║`,
    );
    console.log(
      `║                                                            ║`,
    );
    console.log(
      `║  📇 Contact extracted:    ${String(stats.contactExtracted).padEnd(33)}║`,
    );
    console.log(
      `║  💌 Accepted incoming:    ${String(stats.accepted).padEnd(33)}║`,
    );
    console.log(
      `║  ✅ New connections:      ${String(stats.connected).padEnd(33)}║`,
    );
    console.log(
      `║  🔄 Connection retries:   ${String(stats.connectionRetried).padEnd(33)}║`,
    );
    console.log(
      `║  💬 Messages sent:        ${String(stats.messaged).padEnd(33)}║`,
    );
    console.log(
      `║  💎 InMails sent:         ${String(stats.inmail).padEnd(33)}║`,
    );
    console.log(
      `║  💾 Contact-only saves:   ${String(stats.contactOnlySaved).padEnd(33)}║`,
    );
    console.log(
      `║  ⏭️  Skipped:              ${String(stats.skipped).padEnd(33)}║`,
    );
    console.log(
      `║  ❌ Failed:               ${String(stats.failed).padEnd(33)}║`,
    );
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
      `║     Messages:    ${String(finalMessages).padEnd(5)}/ ${MAX_MESSAGES_PER_DAY}                                   ║`,
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`,
    );

    if (stats.weeklyLimitHit || finalUnblockDate) {
      printAccountBlockedBanner(accountId, finalUnblockDate);
    }

    if (stats.inMailLimitHit) {
      printInMailLimitBanner(accountId);
    }
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
  } finally {
    await closeBrowser(context);
    console.log(`🔒 Browser closed\n`);
  }
}

// ═══════════════════════════════════════════════════════════════
// COOLDOWN
// ═══════════════════════════════════════════════════════════════
async function coolDown() {
  const cd =
    (COOLDOWN_MIN_SEC +
      Math.floor(Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC))) *
    1000;
  console.log(`\n⏰ Cooling ${Math.floor(cd / 1000)}s before next profile...`);
  await new Promise((r) => setTimeout(r, cd));
}
