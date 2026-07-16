// import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { safeGoto } from "../browser/navigation.service.js";
// import { dismissPremiumModal } from "./premium.service.js";

// async function verifyConnectionSent(page) {
//   console.log(`   🔍 Verifying send status...`);
//   const startUrl = page.url();

//   for (let attempt = 1; attempt <= 15; attempt++) {
//     await page.waitForTimeout(1000);
//     const state = await page.evaluate((oldUrl) => {
//       const currentUrl = window.location.href;
//       const urlChanged = currentUrl !== oldUrl;
//       const bodyText = (document.body.innerText || "").toLowerCase();
//       const hasPending =
//         bodyText.includes("pending") ||
//         bodyText.includes("invitation sent") ||
//         bodyText.includes("request sent");
//       const sendButtons = document.querySelectorAll("button");
//       let sendVisible = false;
//       for (const btn of sendButtons) {
//         const text = (btn.textContent || "").trim();
//         const rect = btn.getBoundingClientRect();
//         if (
//           (text === "Send" ||
//             text === "Send invitation" ||
//             text === "Send without a note") &&
//           rect.width > 0 &&
//           rect.height > 0
//         ) {
//           sendVisible = true;
//           break;
//         }
//       }
//       const toast = document.querySelector(
//         '.artdeco-toast-item, [role="alert"], .Toastify__toast',
//       );
//       const hasToast = toast && toast.getBoundingClientRect().width > 0;
//       const leftInvitePage =
//         !currentUrl.includes("/preload/custom-invite/") &&
//         !currentUrl.includes("/mynetwork/invite-connect/");
//       return {
//         currentUrl,
//         urlChanged,
//         hasPending,
//         sendVisible,
//         hasToast,
//         leftInvitePage,
//       };
//     }, startUrl);

//     if (state.hasPending) return true;
//     if (state.hasToast) return true;
//     if (state.leftInvitePage && state.currentUrl !== startUrl) return true;
//     if (!state.sendVisible && attempt > 3) return true;
//   }
//   return false;
// }

// // export async function sendConnectionRequest(page, personalNote = "", profileUrl = "") {
// //   console.log(`\n📨 Sending connection request...`);

// //   try {
// //     const isDialogOpen = async () => {
// //       return await page.evaluate(() => {
// //         const btns = document.querySelectorAll("button");
// //         for (const btn of btns) {
// //           const text = (btn.textContent || "").trim();
// //           const rect = btn.getBoundingClientRect();
// //           if (
// //             (text === "Send" || text === "Send invitation" ||
// //              text === "Send without a note" || text === "Add a note") &&
// //             rect.width > 0 && rect.height > 0
// //           ) return true;
// //         }
// //         return false;
// //       });
// //     };

// //     const clickConnectButton = async () => {
// //       const detected = await page.evaluate(() => {
// //         const allEls = [
// //           ...document.querySelectorAll("a[aria-label]"),
// //           ...document.querySelectorAll("button[aria-label]"),
// //         ];

// //         for (const el of allEls) {
// //           const rect = el.getBoundingClientRect();
// //           if (rect.width === 0 || rect.height === 0) continue;
// //           if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
// //           const aria = (el.getAttribute("aria-label") || "").toLowerCase();
// //           const componentkey = el.getAttribute("componentkey") || "";
// //           if ((aria.includes("invite") && aria.includes("connect")) ||
// //               componentkey.includes("ConnectButton")) {
// //             el.setAttribute("data-outreach-btn-live", "connect");
// //             return {
// //               found: true, type: "direct",
// //               x: Math.floor(rect.x + rect.width / 2),
// //               y: Math.floor(rect.y + rect.height / 2),
// //             };
// //           }
// //         }

// //         for (const el of allEls) {
// //           const rect = el.getBoundingClientRect();
// //           if (rect.width === 0 || rect.height === 0) continue;
// //           if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
// //           const aria = (el.getAttribute("aria-label") || "").toLowerCase();
// //           if (aria === "more actions" || aria === "more") {
// //             el.setAttribute("data-outreach-btn-live", "more");
// //             return {
// //               found: true, type: "more",
// //               x: Math.floor(rect.x + rect.width / 2),
// //               y: Math.floor(rect.y + rect.height / 2),
// //             };
// //           }
// //         }
// //         return { found: false };
// //       });

// //       if (!detected.found) return false;
// //       console.log(`   📍 ${detected.type} button at (${detected.x}, ${detected.y})`);

// //       await page.evaluate(() => {
// //         const el = document.querySelector("[data-outreach-btn-live]");
// //         if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
// //       });
// //       await randomDelay(1000, 1500);

// //       await humanClick(page, detected.x, detected.y);
// //       await randomDelay(1500, 2000);

// //       if (detected.type === "direct") {
// //         let dialogOpened = await isDialogOpen();
// //         if (!dialogOpened) {
// //           try {
// //             const locator = page.locator('[data-outreach-btn-live="connect"]').first();
// //             await locator.click({ force: true, timeout: 5000 });
// //             await randomDelay(1500, 2000);
// //           } catch {}
// //           dialogOpened = await isDialogOpen();
// //         }

// //         if (!dialogOpened && profileUrl) {
// //           const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
// //           if (vanityMatch) {
// //             const inviteUrl = `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`;
// //             console.log(`   🔗 Navigating to invite URL: ${inviteUrl}`);
// //             await safeGoto(page, inviteUrl);
// //           }
// //         }
// //       } else if (detected.type === "more") {
// //         let expanded = await page.evaluate(() => {
// //           const el = document.querySelector('[data-outreach-btn-live="more"]');
// //           return el ? el.getAttribute("aria-expanded") : null;
// //         });

// //         if (expanded !== "true") {
// //           try {
// //             const locator = page.locator('[data-outreach-btn-live="more"]').first();
// //             await locator.click({ force: true, timeout: 5000 });
// //             await randomDelay(1000, 1500);
// //           } catch {}
// //         }

// //         console.log(`   ⏳ Waiting for dropdown...`);
// //         let dropdownReady = false;
// //         for (let i = 0; i < 15; i++) {
// //           await page.waitForTimeout(500);
// //           const has = await page.evaluate(() => {
// //             const el = document.querySelector(
// //               'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
// //             );
// //             return el && el.getBoundingClientRect().width > 0;
// //           });
// //           if (has) { dropdownReady = true; break; }
// //         }

// //         if (!dropdownReady) return false;
// //         console.log(`   ✅ Dropdown appeared`);

// //         const connectInfo = await page.evaluate(() => {
// //           const link = document.querySelector(
// //             'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
// //           );
// //           if (!link) return null;
// //           return { href: link.getAttribute("href") };
// //         });

// //         if (!connectInfo) return false;
// //         const fullUrl = connectInfo.href.startsWith("/")
// //           ? "https://www.linkedin.com" + connectInfo.href : connectInfo.href;
// //         console.log(`   🔗 Navigating to invite URL: ${fullUrl}`);
// //         await safeGoto(page, fullUrl);
// //       }
// //       return true;
// //     };

// //     const waitForInviteDialog = async () => {
// //       console.log(`   ⏳ Waiting for invitation dialog...`);
// //       for (let i = 0; i < 20; i++) {
// //         await page.waitForTimeout(500);
// //         const state = await page.evaluate(() => {
// //           const buttons = document.querySelectorAll("button");
// //           for (const btn of buttons) {
// //             const text = (btn.textContent || "").trim();
// //             const rect = btn.getBoundingClientRect();
// //             if (
// //               (text === "Send" || text === "Send invitation" ||
// //                text === "Send without a note" || text === "Send now") &&
// //               rect.width > 0 && rect.height > 0
// //             ) return { found: true, text };
// //           }
// //           return { found: false };
// //         });
// //         if (state.found) {
// //           console.log(`   ✅ Dialog ready — "${state.text}" visible`);
// //           return true;
// //         }
// //       }
// //       return false;
// //     };

// //     const isAlreadyPending = async () => {
// //       return await page.evaluate(() => {
// //         const bodyText = (document.body.innerText || "").toLowerCase();
// //         return bodyText.includes("pending") || bodyText.includes("invitation sent");
// //       });
// //     };

// //     // STEP 1: Click Connect
// //     console.log(`\n   ━━━ STEP 1: Click Connect ━━━`);
// //     const firstClick = await clickConnectButton();
// //     if (!firstClick) return { success: false, reason: "connect_button_not_found" };

// //     const immediatePremium = await dismissPremiumModal(page);
// //     if (immediatePremium) {
// //       await randomDelay(2000, 3000);
// //       const currentUrl = page.url();
// //       if (currentUrl.includes("/preload/custom-invite/") ||
// //           currentUrl.includes("/mynetwork/invite-connect/")) {
// //         await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
// //         await randomDelay(3000, 5000);
// //       }
// //     }

// //     const dialogAppeared = await waitForInviteDialog();
// //     if (!dialogAppeared) {
// //       if (await isAlreadyPending()) return { success: true, hadNote: false };
// //       return { success: false, reason: "dialog_never_appeared" };
// //     }

// //     // STEP 2: Try adding note
// //     let noteAdded = false;
// //     let skipNote = false;

// //     const hasAddNoteBtn = await page.evaluate(() => {
// //       const btns = document.querySelectorAll("button");
// //       for (const btn of btns) {
// //         const text = (btn.textContent || "").trim();
// //         const rect = btn.getBoundingClientRect();
// //         if (text === "Add a note" && rect.width > 0 && rect.height > 0) return true;
// //       }
// //       return false;
// //     });

// //     if (!hasAddNoteBtn) skipNote = true;

// //     if (personalNote && personalNote.length > 0 && hasAddNoteBtn && !skipNote) {
// //       console.log(`\n   ━━━ STEP 2: Adding note ━━━`);
// //       const noteCoords = await page.evaluate(() => {
// //         const btns = document.querySelectorAll("button");
// //         for (const btn of btns) {
// //           if ((btn.textContent || "").trim() === "Add a note") {
// //             const rect = btn.getBoundingClientRect();
// //             if (rect.width > 0) return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
// //           }
// //         }
// //         return null;
// //       });

// //       if (noteCoords) {
// //         await humanClick(page, noteCoords.x, noteCoords.y);
// //         await randomDelay(2000, 3000);

// //         if (await dismissPremiumModal(page)) {
// //           skipNote = true;
// //           await randomDelay(2000, 3000);
// //           if (!(await isDialogOpen())) {
// //             const currentUrl = page.url();
// //             if (currentUrl.includes("/preload/custom-invite/") ||
// //                 currentUrl.includes("/mynetwork/invite-connect/")) {
// //               await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
// //               await randomDelay(4000, 6000);
// //               await waitForInviteDialog();
// //             } else if (profileUrl) {
// //               const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
// //               if (vanityMatch) {
// //                 await safeGoto(page, `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`);
// //                 await waitForInviteDialog();
// //               }
// //             }
// //           }
// //         }
// //       }

// //       if (!skipNote) {
// //         const noteField = page.locator('textarea[name="message"], #custom-message, textarea').first();
// //         if ((await noteField.count()) > 0 && (await noteField.isVisible().catch(() => false))) {
// //           console.log(`   📝 Typing personal note...`);
// //           await noteField.click();
// //           await randomDelay(500, 1000);
// //           await page.keyboard.press("Control+a");
// //           await page.keyboard.press("Delete");
// //           await randomDelay(300, 500);
// //           await humanTypeText(page, personalNote);
// //           await randomDelay(1500, 2500);
// //           noteAdded = true;
// //           console.log(`   ✅ Note typed`);
// //         }
// //       }
// //     }

// //     // STEP 3: Click Send
// //     console.log(`\n   ━━━ STEP 3: Click Send ━━━`);
// //     const sendSelectors = skipNote
// //       ? ['button:has-text("Send without a note")', 'button:has-text("Send")']
// //       : ['button:has-text("Send invitation")', 'button:has-text("Send")'];

// //     let sent = false;
// //     for (const sel of sendSelectors) {
// //       const btn = page.locator(sel).first();
// //       if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
// //         await btn.click({ force: true });
// //         await randomDelay(2500, 4000);

// //         if (await dismissPremiumModal(page)) {
// //           noteAdded = false;
// //           await randomDelay(2000, 3000);
// //           const currentUrl = page.url();
// //           if (currentUrl.includes("/preload/custom-invite/") ||
// //               currentUrl.includes("/mynetwork/invite-connect/")) {
// //             await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
// //             await randomDelay(3000, 5000);
// //             await waitForInviteDialog();
// //           }
// //           const swn = page.locator('button:has-text("Send without a note")').first();
// //           if ((await swn.count()) > 0) {
// //             await swn.click({ force: true });
// //             await randomDelay(2500, 4000);
// //           }
// //         }

// //         const confirmed = await verifyConnectionSent(page);
// //         if (confirmed) {
// //           console.log(`   ✅ Connection sent! ${noteAdded ? "(WITH note)" : "(no note)"}`);
// //         }
// //         sent = true;
// //         break;
// //       }
// //     }

// //     if (!sent) {
// //       if (await isAlreadyPending()) return { success: true, hadNote: noteAdded };
// //       return { success: false, reason: "send_button_not_found" };
// //     }

// //     return { success: true, hadNote: noteAdded };
// //   } catch (err) {
// //     console.log(`   ❌ Error: ${err.message}`);
// //     return { success: false, reason: "error", error: err.message };
// //   }
// // }

// /**
//  * Check if THIS profile has an incoming invitation from them TO us
//  * (They already sent US a connection request)
//  *
//  * Returns: { hasIncoming: bool, acceptCoords: {x,y} | null }
//  */
// /**
//  * Check if THIS profile has an incoming invitation from them TO us
//  *
//  * STRICT CHECKS:
//  * 1. Must be in main profile area (y > 100 && y < 800)
//  * 2. Must NOT be in top nav or notifications dropdown
//  * 3. Must have "Ignore" button nearby (invitation cards have both)
//  * 4. aria-label must contain the person's name (not our name)
//  */
// export async function checkIncomingInvitation(page, targetPersonName = "") {
//   console.log(`   🔍 Checking for incoming invitation...`);

//   try {
//     const result = await page.evaluate((personName) => {
//       const targetFirstName = personName.split(" ")[0].toLowerCase();

//       // Selector: Accept buttons with aria-label
//       const acceptBtns = document.querySelectorAll(
//         'button[aria-label*="Accept" i][aria-label*="request to connect" i]',
//       );

//       for (const btn of acceptBtns) {
//         const rect = btn.getBoundingClientRect();

//         // Must be visible
//         if (rect.width === 0 || rect.height === 0) continue;

//         // ═══ STRICT FILTER 1: NOT in top nav ═══
//         // Top nav is roughly y=0-80
//         if (rect.y < 100) {
//           console.log(`Skipping button at y=${rect.y} (top nav area)`);
//           continue;
//         }

//         // ═══ STRICT FILTER 2: NOT in bottom overlay ═══
//         if (rect.y > window.innerHeight - 100) continue;

//         // ═══ STRICT FILTER 3: Must be in main profile area ═══
//         // Main content typically x=200-1000
//         if (rect.x < 100 || rect.x > 1100) continue;

//         // ═══ STRICT FILTER 4: aria-label must match target person (if provided) ═══
//         const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
//         if (
//           personName &&
//           targetFirstName &&
//           !ariaLabel.includes(targetFirstName)
//         ) {
//           console.log(
//             `Skipping button — aria "${ariaLabel}" doesn't match target "${targetFirstName}"`,
//           );
//           continue;
//         }

//         // ═══ STRICT FILTER 5: Must have "Ignore" button in same parent ═══
//         // Real invitation cards have BOTH Accept and Ignore buttons
//         let parent = btn.parentElement;
//         let hasIgnoreNearby = false;
//         for (let i = 0; i < 6; i++) {
//           if (!parent) break;
//           const ignoreBtns = parent.querySelectorAll("button");
//           for (const b of ignoreBtns) {
//             const btnText = (b.textContent || "").trim().toLowerCase();
//             const btnAria = (b.getAttribute("aria-label") || "").toLowerCase();
//             if (btnText === "ignore" || btnAria.includes("ignore")) {
//               const iRect = b.getBoundingClientRect();
//               // Ignore button must ALSO be in main area (not in dropdown)
//               if (iRect.width > 0 && iRect.height > 0 && iRect.y > 100) {
//                 hasIgnoreNearby = true;
//                 break;
//               }
//             }
//           }
//           if (hasIgnoreNearby) break;
//           parent = parent.parentElement;
//         }

//         if (!hasIgnoreNearby) {
//           console.log(
//             `Skipping button at (${rect.x}, ${rect.y}) — no Ignore button nearby`,
//           );
//           continue;
//         }

//         // ═══ ALL CHECKS PASSED — this is a real incoming invitation ═══
//         btn.setAttribute("data-accept-btn", "true");
//         return {
//           hasIncoming: true,
//           ariaLabel: btn.getAttribute("aria-label"),
//           x: Math.floor(rect.x + rect.width / 2),
//           y: Math.floor(rect.y + rect.height / 2),
//           rawY: Math.floor(rect.y),
//         };
//       }

//       return { hasIncoming: false };
//     }, targetPersonName);

//     if (result.hasIncoming) {
//       console.log(
//         `   💌 REAL incoming invitation found: "${result.ariaLabel}"`,
//       );
//       console.log(`   📍 Accept button at (${result.x}, ${result.y})`);
//     } else {
//       console.log(`   ℹ️  No incoming invitation on this profile`);
//     }

//     return result;
//   } catch (err) {
//     console.log(`   ⚠️  Incoming check failed: ${err.message}`);
//     return { hasIncoming: false };
//   }
// }

// /**
//  * Click the Accept button for incoming invitation
//  */
// export async function acceptIncomingInvitation(page, acceptCoords) {
//   console.log(`   ✅ Accepting incoming invitation...`);

//   try {
//     // Scroll button into view
//     await page.evaluate(() => {
//       const btn = document.querySelector('[data-accept-btn="true"]');
//       if (btn) btn.scrollIntoView({ block: "center", behavior: "smooth" });
//     });
//     await randomDelay(1500, 2500);

//     // Refresh coords after scroll
//     const freshCoords = await page.evaluate(() => {
//       const btn = document.querySelector('[data-accept-btn="true"]');
//       if (!btn) return null;
//       const rect = btn.getBoundingClientRect();
//       return {
//         x: Math.floor(rect.x + rect.width / 2),
//         y: Math.floor(rect.y + rect.height / 2),
//       };
//     });

//     const coords = freshCoords || acceptCoords;

//     // Human click
//     await humanClick(page, coords.x, coords.y);
//     await randomDelay(3000, 5000);

//     // Verify: Accept button should be gone
//     const accepted = await page.evaluate(() => {
//       const btn = document.querySelector('[data-accept-btn="true"]');
//       if (!btn) return true;
//       const rect = btn.getBoundingClientRect();
//       return rect.width === 0 || rect.height === 0;
//     });

//     // Cleanup tag
//     await page.evaluate(() => {
//       const btn = document.querySelector('[data-accept-btn="true"]');
//       if (btn) btn.removeAttribute("data-accept-btn");
//     });

//     if (accepted) {
//       console.log(`   ✅ Invitation ACCEPTED!`);
//       return { success: true };
//     } else {
//       console.log(`   ⚠️  Accept clicked but button still visible`);
//       return { success: false, reason: "not_confirmed" };
//     }
//   } catch (err) {
//     console.log(`   ❌ Accept error: ${err.message}`);
//     return { success: false, reason: "error", error: err.message };
//   }
// }

// export async function sendConnectionRequest(
//   page,
//   personalNote = "",
//   profileUrl = "",
// ) {
//   console.log(`\n📨 Sending connection request...`);

//   try {
//     // Helper: check if browser/page still alive
//     const isPageAlive = () => {
//       try {
//         return !page.isClosed();
//       } catch {
//         return false;
//       }
//     };

//     if (!isPageAlive()) {
//       return { success: false, reason: "page_closed_before_start" };
//     }

//     const isDialogOpen = async () => {
//       if (!isPageAlive()) return false;
//       try {
//         return await page.evaluate(() => {
//           const btns = document.querySelectorAll("button");
//           for (const btn of btns) {
//             const text = (btn.textContent || "").trim();
//             const rect = btn.getBoundingClientRect();
//             if (
//               (text === "Send" ||
//                 text === "Send invitation" ||
//                 text === "Send without a note" ||
//                 text === "Add a note") &&
//               rect.width > 0 &&
//               rect.height > 0
//             )
//               return true;
//           }
//           return false;
//         });
//       } catch {
//         return false;
//       }
//     };

//     const clickConnectButton = async () => {
//       if (!isPageAlive()) return false;
//       const detected = await page.evaluate(() => {
//         const allEls = [
//           ...document.querySelectorAll("a[aria-label]"),
//           ...document.querySelectorAll("button[aria-label]"),
//         ];

//         for (const el of allEls) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width === 0 || rect.height === 0) continue;
//           if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//           const aria = (el.getAttribute("aria-label") || "").toLowerCase();
//           const componentkey = el.getAttribute("componentkey") || "";
//           if (
//             (aria.includes("invite") && aria.includes("connect")) ||
//             componentkey.includes("ConnectButton")
//           ) {
//             el.setAttribute("data-outreach-btn-live", "connect");
//             return {
//               found: true,
//               type: "direct",
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }

//         for (const el of allEls) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width === 0 || rect.height === 0) continue;
//           if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//           const aria = (el.getAttribute("aria-label") || "").toLowerCase();
//           if (aria === "more actions" || aria === "more") {
//             el.setAttribute("data-outreach-btn-live", "more");
//             return {
//               found: true,
//               type: "more",
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }
//         return { found: false };
//       });

//       if (!detected.found) return false;
//       console.log(
//         `   📍 ${detected.type} button at (${detected.x}, ${detected.y})`,
//       );

//       await page.evaluate(() => {
//         const el = document.querySelector("[data-outreach-btn-live]");
//         if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//       });
//       await randomDelay(1000, 1500);

//       await humanClick(page, detected.x, detected.y);
//       await randomDelay(1500, 2000);

//       if (detected.type === "direct") {
//         let dialogOpened = await isDialogOpen();
//         if (!dialogOpened) {
//           try {
//             const locator = page
//               .locator('[data-outreach-btn-live="connect"]')
//               .first();
//             await locator.click({ force: true, timeout: 5000 });
//             await randomDelay(1500, 2000);
//           } catch {}
//           dialogOpened = await isDialogOpen();
//         }

//         if (!dialogOpened && profileUrl) {
//           const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
//           if (vanityMatch) {
//             const inviteUrl = `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`;
//             console.log(`   🔗 Navigating to invite URL: ${inviteUrl}`);
//             await safeGoto(page, inviteUrl);
//           }
//         }
//       } else if (detected.type === "more") {
//         let expanded = await page.evaluate(() => {
//           const el = document.querySelector('[data-outreach-btn-live="more"]');
//           return el ? el.getAttribute("aria-expanded") : null;
//         });

//         if (expanded !== "true") {
//           try {
//             const locator = page
//               .locator('[data-outreach-btn-live="more"]')
//               .first();
//             await locator.click({ force: true, timeout: 5000 });
//             await randomDelay(1500, 2500);
//           } catch {}
//         }

//         console.log(`   ⏳ Waiting for dropdown to render...`);

//         let dropdownReady = false;
//         let connectData = null;

//         // Check every 300ms for 20 seconds (fast polling to catch dropdown before it closes)
//         for (let i = 0; i < 66; i++) {
//           if (!isPageAlive()) return false;
//           await page.waitForTimeout(300);

//           connectData = await page.evaluate(() => {
//             // PRIMARY: componentkey (most unique to Connect button)
//             const connectByComponentKey = document.querySelector(
//               'a[componentkey*="ConnectButton"], a[componentkey*="connect"]',
//             );
//             if (connectByComponentKey) {
//               const rect = connectByComponentKey.getBoundingClientRect();
//               const href = connectByComponentKey.getAttribute("href");
//               if (rect.width > 0 && rect.height > 0 && href) {
//                 return {
//                   found: true,
//                   method: "componentkey",
//                   href: href,
//                   x: Math.floor(rect.x + rect.width / 2),
//                   y: Math.floor(rect.y + rect.height / 2),
//                 };
//               }
//             }

//             // SECONDARY: href with invite pattern
//             const inviteLinks = document.querySelectorAll(
//               'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
//             );
//             for (const link of inviteLinks) {
//               const rect = link.getBoundingClientRect();
//               if (rect.width > 0 && rect.height > 0) {
//                 return {
//                   found: true,
//                   method: "href_pattern",
//                   href: link.getAttribute("href"),
//                   x: Math.floor(rect.x + rect.width / 2),
//                   y: Math.floor(rect.y + rect.height / 2),
//                 };
//               }
//             }

//             // TERTIARY: aria-label match
//             const ariaMatch = document.querySelector(
//               '[aria-label*="Invite" i][aria-label*="to connect" i]',
//             );
//             if (ariaMatch) {
//               const link = ariaMatch.closest("a") || ariaMatch;
//               const rect = link.getBoundingClientRect();
//               const href = link.getAttribute("href");
//               if (rect.width > 0 && rect.height > 0 && href) {
//                 return {
//                   found: true,
//                   method: "aria_label",
//                   href: href,
//                   x: Math.floor(rect.x + rect.width / 2),
//                   y: Math.floor(rect.y + rect.height / 2),
//                 };
//               }
//             }

//             // QUATERNARY: menuitem with text "Connect"
//             const menuItems = document.querySelectorAll('a[role="menuitem"]');
//             for (const item of menuItems) {
//               const text = (item.textContent || "").trim();
//               const href = item.getAttribute("href");
//               if (text === "Connect" && href) {
//                 const rect = item.getBoundingClientRect();
//                 if (rect.width > 0 && rect.height > 0) {
//                   return {
//                     found: true,
//                     method: "menuitem_text",
//                     href: href,
//                     x: Math.floor(rect.x + rect.width / 2),
//                     y: Math.floor(rect.y + rect.height / 2),
//                   };
//                 }
//               }
//             }

//             return { found: false };
//           });

//           if (connectData && connectData.found) {
//             dropdownReady = true;
//             console.log(
//               `   ✅ Connect found in dropdown (${connectData.method})`,
//             );
//             console.log(`      href: ${connectData.href}`);
//             break;
//           }

//           // If dropdown was closed (button not expanded anymore), re-click it
//           if (i > 0 && i % 20 === 0) {
//             const stillExpanded = await page.evaluate(() => {
//               const el = document.querySelector(
//                 '[data-outreach-btn-live="more"]',
//               );
//               return el ? el.getAttribute("aria-expanded") === "true" : false;
//             });

//             if (!stillExpanded) {
//               console.log(
//                 `   🔄 Dropdown closed — re-clicking More button (attempt ${i / 20})`,
//               );
//               try {
//                 const locator = page
//                   .locator('[data-outreach-btn-live="more"]')
//                   .first();
//                 await locator.click({ force: true, timeout: 5000 });
//                 await randomDelay(1500, 2500);
//               } catch {}
//             } else {
//               console.log(
//                 `   ⏳ Still searching... (${Math.floor(i / 3)}s elapsed)`,
//               );
//             }
//           }
//         }

//         if (!dropdownReady) {
//           console.log(
//             `   ⚠️  Connect option not available in dropdown after 20s`,
//           );
//           try {
//             await page.keyboard.press("Escape");
//           } catch {}
//           await randomDelay(1000, 2000);
//           return false;
//         }

//         // Navigate to invite URL directly (most reliable)
//         const fullUrl = connectData.href.startsWith("/")
//           ? "https://www.linkedin.com" + connectData.href
//           : connectData.href;
//         console.log(`   🔗 Navigating to invite URL: ${fullUrl}`);
//         await safeGoto(page, fullUrl);
//       }
//       // } else if (detected.type === "more") {
//       //   let expanded = await page.evaluate(() => {
//       //     const el = document.querySelector('[data-outreach-btn-live="more"]');
//       //     return el ? el.getAttribute("aria-expanded") : null;
//       //   });

//       //   if (expanded !== "true") {
//       //     try {
//       //       const locator = page.locator('[data-outreach-btn-live="more"]').first();
//       //       await locator.click({ force: true, timeout: 5000 });
//       //       await randomDelay(1000, 1500);
//       //     } catch {}
//       //   }

//       //   console.log(`   ⏳ Waiting for dropdown...`);
//       //   let dropdownReady = false;
//       //   for (let i = 0; i < 15; i++) {
//       //     if (!isPageAlive()) return false;
//       //     await page.waitForTimeout(500);
//       //     const has = await page.evaluate(() => {
//       //       const el = document.querySelector(
//       //         'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
//       //       );
//       //       return el && el.getBoundingClientRect().width > 0;
//       //     });
//       //     if (has) { dropdownReady = true; break; }
//       //   }

//       //   if (!dropdownReady) return false;
//       //   console.log(`   ✅ Dropdown appeared`);

//       //   const connectInfo = await page.evaluate(() => {
//       //     const link = document.querySelector(
//       //       'a[href*="/preload/custom-invite/"], a[href*="/mynetwork/invite-connect/"]',
//       //     );
//       //     if (!link) return null;
//       //     return { href: link.getAttribute("href") };
//       //   });

//       //   if (!connectInfo) return false;
//       //   const fullUrl = connectInfo.href.startsWith("/")
//       //     ? "https://www.linkedin.com" + connectInfo.href : connectInfo.href;
//       //   console.log(`   🔗 Navigating to invite URL: ${fullUrl}`);
//       //   await safeGoto(page, fullUrl);
//       // }
//       return true;
//     };

//     const waitForInviteDialog = async () => {
//       console.log(`   ⏳ Waiting for invitation dialog...`);
//       for (let i = 0; i < 20; i++) {
//         if (!isPageAlive()) return false;
//         await page.waitForTimeout(500);
//         const state = await page
//           .evaluate(() => {
//             const buttons = document.querySelectorAll("button");
//             for (const btn of buttons) {
//               const text = (btn.textContent || "").trim();
//               const rect = btn.getBoundingClientRect();
//               if (
//                 (text === "Send" ||
//                   text === "Send invitation" ||
//                   text === "Send without a note" ||
//                   text === "Send now") &&
//                 rect.width > 0 &&
//                 rect.height > 0
//               )
//                 return { found: true, text };
//             }
//             return { found: false };
//           })
//           .catch(() => ({ found: false }));

//         if (state.found) {
//           console.log(`   ✅ Dialog ready — "${state.text}" visible`);
//           return true;
//         }
//       }
//       return false;
//     };

//     const isAlreadyPending = async () => {
//       if (!isPageAlive()) return false;
//       try {
//         return await page.evaluate(() => {
//           const bodyText = (document.body.innerText || "").toLowerCase();
//           return (
//             bodyText.includes("pending") || bodyText.includes("invitation sent")
//           );
//         });
//       } catch {
//         return false;
//       }
//     };

//     // STEP 1: Click Connect
//     console.log(`\n   ━━━ STEP 1: Click Connect ━━━`);
//     const firstClick = await clickConnectButton();
//     if (!firstClick)
//       return { success: false, reason: "connect_button_not_found" };

//     if (!isPageAlive())
//       return { success: false, reason: "page_closed_after_click" };

//     const immediatePremium = await dismissPremiumModal(page);
//     if (immediatePremium) {
//       await randomDelay(2000, 3000);
//       if (isPageAlive()) {
//         const currentUrl = page.url();
//         if (
//           currentUrl.includes("/preload/custom-invite/") ||
//           currentUrl.includes("/mynetwork/invite-connect/")
//         ) {
//           try {
//             await page.reload({
//               waitUntil: "domcontentloaded",
//               timeout: 60000,
//             });
//             await randomDelay(3000, 5000);
//           } catch {}
//         }
//       }
//     }

//     const dialogAppeared = await waitForInviteDialog();
//     if (!dialogAppeared) {
//       if (await isAlreadyPending()) return { success: true, hadNote: false };
//       return { success: false, reason: "dialog_never_appeared" };
//     }

//     // STEP 2: Try adding note (with safety checks)
//     let noteAdded = false;
//     let skipNote = false;

//     if (!isPageAlive())
//       return { success: false, reason: "page_closed_before_note" };

//     const hasAddNoteBtn = await page
//       .evaluate(() => {
//         const btns = document.querySelectorAll("button");
//         for (const btn of btns) {
//           const text = (btn.textContent || "").trim();
//           const rect = btn.getBoundingClientRect();
//           if (text === "Add a note" && rect.width > 0 && rect.height > 0)
//             return true;
//         }
//         return false;
//       })
//       .catch(() => false);

//     if (!hasAddNoteBtn) skipNote = true;

//     if (personalNote && personalNote.length > 0 && hasAddNoteBtn && !skipNote) {
//       console.log(`\n   ━━━ STEP 2: Adding note ━━━`);
//       const noteCoords = await page
//         .evaluate(() => {
//           const btns = document.querySelectorAll("button");
//           for (const btn of btns) {
//             if ((btn.textContent || "").trim() === "Add a note") {
//               const rect = btn.getBoundingClientRect();
//               if (rect.width > 0)
//                 return {
//                   x: Math.floor(rect.x + rect.width / 2),
//                   y: Math.floor(rect.y + rect.height / 2),
//                 };
//             }
//           }
//           return null;
//         })
//         .catch(() => null);

//       if (noteCoords && isPageAlive()) {
//         await humanClick(page, noteCoords.x, noteCoords.y);
//         await randomDelay(2000, 3000);

//         if (isPageAlive() && (await dismissPremiumModal(page))) {
//           skipNote = true;
//           await randomDelay(2000, 3000);
//           if (isPageAlive() && !(await isDialogOpen())) {
//             const currentUrl = page.url();
//             if (
//               currentUrl.includes("/preload/custom-invite/") ||
//               currentUrl.includes("/mynetwork/invite-connect/")
//             ) {
//               try {
//                 await page.reload({
//                   waitUntil: "domcontentloaded",
//                   timeout: 60000,
//                 });
//                 await randomDelay(4000, 6000);
//                 await waitForInviteDialog();
//               } catch {}
//             } else if (profileUrl) {
//               const vanityMatch = profileUrl.match(/\/in\/([^\/\?]+)/);
//               if (vanityMatch) {
//                 await safeGoto(
//                   page,
//                   `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`,
//                 );
//                 await waitForInviteDialog();
//               }
//             }
//           }
//         }
//       }

//       if (!skipNote && isPageAlive()) {
//         try {
//           const noteField = page
//             .locator('textarea[name="message"], #custom-message, textarea')
//             .first();
//           const fieldExists = (await noteField.count()) > 0;
//           const fieldVisible =
//             fieldExists && (await noteField.isVisible().catch(() => false));

//           if (fieldVisible) {
//             console.log(`   📝 Typing personal note...`);
//             await noteField.click();
//             await randomDelay(500, 1000);

//             // Safe keyboard operations with try/catch
//             try {
//               await page.keyboard.press("Control+a");
//               await page.keyboard.press("Delete");
//               await randomDelay(300, 500);
//               await humanTypeText(page, personalNote);
//               await randomDelay(1500, 2500);
//               noteAdded = true;
//               console.log(`   ✅ Note typed`);
//             } catch (typeErr) {
//               console.log(`   ⚠️  Note typing failed: ${typeErr.message}`);
//               noteAdded = false;
//             }
//           }
//         } catch (noteErr) {
//           console.log(`   ⚠️  Note field access failed: ${noteErr.message}`);
//         }
//       }
//     }

//     if (!isPageAlive())
//       return { success: false, reason: "page_closed_before_send" };

//     // STEP 3: Click Send
//     console.log(`\n   ━━━ STEP 3: Click Send ━━━`);
//     const sendSelectors = noteAdded
//       ? ['button:has-text("Send invitation")', 'button:has-text("Send")']
//       : [
//           'button:has-text("Send without a note")',
//           'button:has-text("Send invitation")',
//           'button:has-text("Send")',
//         ];

//     let sent = false;
//     for (const sel of sendSelectors) {
//       if (!isPageAlive()) break;

//       try {
//         const btn = page.locator(sel).first();
//         if (
//           (await btn.count()) > 0 &&
//           (await btn.isVisible().catch(() => false))
//         ) {
//           await btn.click({ force: true });
//           await randomDelay(2500, 4000);

//           if (isPageAlive() && (await dismissPremiumModal(page))) {
//             noteAdded = false;
//             await randomDelay(2000, 3000);
//             if (isPageAlive()) {
//               const currentUrl = page.url();
//               if (
//                 currentUrl.includes("/preload/custom-invite/") ||
//                 currentUrl.includes("/mynetwork/invite-connect/")
//               ) {
//                 try {
//                   await page.reload({
//                     waitUntil: "domcontentloaded",
//                     timeout: 60000,
//                   });
//                   await randomDelay(3000, 5000);
//                   await waitForInviteDialog();
//                 } catch {}
//               }
//               const swn = page
//                 .locator('button:has-text("Send without a note")')
//                 .first();
//               if ((await swn.count()) > 0) {
//                 await swn.click({ force: true });
//                 await randomDelay(2500, 4000);
//               }
//             }
//           }

//           const confirmed = await verifyConnectionSent(page);
//           if (confirmed) {
//             console.log(
//               `   ✅ Connection sent! ${noteAdded ? "(WITH note)" : "(no note)"}`,
//             );
//           }
//           sent = true;
//           break;
//         }
//       } catch (btnErr) {
//         console.log(`   ⚠️  Send button attempt failed: ${btnErr.message}`);
//       }
//     }

//     if (!sent) {
//       if (await isAlreadyPending())
//         return { success: true, hadNote: noteAdded };
//       return { success: false, reason: "send_button_not_found" };
//     }

//     return { success: true, hadNote: noteAdded };
//   } catch (err) {
//     console.log(`   ❌ Error: ${err.message}`);
//     return { success: false, reason: "error", error: err.message };
//   }
// }

import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { dismissPremiumModal } from "./premium.service.js";

// ═══════════════════════════════════════════════════════════════
// PAGE ALIVE CHECK
// ═══════════════════════════════════════════════════════════════
function isPageAlive(page) {
  try {
    return page && !page.isClosed();
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ⚡ NEW: Detect "Weekly limit reached" error message
// ═══════════════════════════════════════════════════════════════
async function isWeeklyLimitReached(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(() => {
      const bodyText = (document.body.innerText || "").toLowerCase();
      return (
        bodyText.includes("reached the weekly limit") ||
        bodyText.includes("weekly limit for connection") ||
        bodyText.includes("weekly invitation limit") ||
        (bodyText.includes("weekly limit") && bodyText.includes("invitation"))
      );
    });
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Detect Premium modal
// ═══════════════════════════════════════════════════════════════
async function isPremiumModalOpen(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(() => {
      const modals = document.querySelectorAll(
        '[role="dialog"], .artdeco-modal, .modal-upsell',
      );
      for (const m of modals) {
        const rect = m.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (m.classList.contains("send-invite")) continue;
        const text = (m.textContent || "").toLowerCase();
        if (
          text.includes("try premium") ||
          text.includes("upgrade to premium") ||
          text.includes("out of free") ||
          text.includes("inmail credit") ||
          (text.includes("premium") && text.includes("upgrade"))
        ) {
          return true;
        }
      }
      return false;
    });
  } catch {
    return false;
  }
}

async function isInviteDialogOpen(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(() => {
      const modal = document.querySelector(
        ".send-invite, [aria-labelledby='send-invite-modal']",
      );
      if (modal) {
        const rect = modal.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
      }

      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const text = (btn.textContent || "").trim();
        const aria = (btn.getAttribute("aria-label") || "").trim();
        const rect = btn.getBoundingClientRect();
        if (
          (text === "Send" ||
            text === "Send invitation" ||
            text === "Send without a note" ||
            text === "Add a note" ||
            aria === "Send invitation" ||
            aria === "Send without a note" ||
            aria === "Add a note") &&
          rect.width > 0 &&
          rect.height > 0
        )
          return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

async function waitForInviteDialog(page, maxSec = 15) {
  console.log(`   ⏳ Waiting for invite dialog (${maxSec}s max)...`);
  for (let i = 0; i < maxSec * 2; i++) {
    if (!isPageAlive(page)) return false;
    await page.waitForTimeout(500);

    if (await isInviteDialogOpen(page)) {
      console.log(`   ✅ Dialog ready`);
      return true;
    }
  }
  return false;
}

async function isAlreadyPending(page) {
  if (!isPageAlive(page)) return false;
  try {
    return await page.evaluate(() => {
      const pendingByKey = document.querySelector(
        '[componentkey*="_pending"], [componentkey*=":pending"]',
      );
      if (pendingByKey) {
        const rect = pendingByKey.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
      }

      const pendingByAria = document.querySelector(
        '[aria-label*="Pending" i][aria-label*="withdraw" i]',
      );
      if (pendingByAria) return true;

      const allBtns = document.querySelectorAll("button, a");
      for (const btn of allBtns) {
        const text = (btn.textContent || "").trim();
        const rect = btn.getBoundingClientRect();
        if (text === "Pending" && rect.width > 0 && rect.height > 0) {
          if (rect.x < 800 && rect.y > 300 && rect.y < 850) return true;
        }
      }
      return false;
    });
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// LIGHT VERIFICATION (no navigation) + Weekly limit detection
// ═══════════════════════════════════════════════════════════════
async function verifyConnectionSent(page) {
  console.log(`   🔍 Verifying send (light check)...`);
  if (!isPageAlive(page)) return { sent: false, weeklyLimitHit: false };

  const startUrl = page.url();

  for (let attempt = 1; attempt <= 15; attempt++) {
    if (!isPageAlive(page)) return { sent: false, weeklyLimitHit: false };
    await page.waitForTimeout(1000);

    // Check for weekly limit error FIRST
    if (await isWeeklyLimitReached(page)) {
      console.log(
        `   🚨 WEEKLY LIMIT REACHED — LinkedIn blocked the invitation`,
      );
      return { sent: false, weeklyLimitHit: true };
    }

    const state = await page.evaluate((oldUrl) => {
      const currentUrl = window.location.href;
      const bodyText = (document.body.innerText || "").toLowerCase();
      const hasPending =
        bodyText.includes("pending") ||
        bodyText.includes("invitation sent") ||
        bodyText.includes("request sent");

      const sendButtons = document.querySelectorAll("button");
      let sendVisible = false;
      for (const btn of sendButtons) {
        const text = (btn.textContent || "").trim();
        const aria = (btn.getAttribute("aria-label") || "").trim();
        const rect = btn.getBoundingClientRect();
        if (
          (text === "Send" ||
            text === "Send invitation" ||
            text === "Send without a note" ||
            aria === "Send invitation" ||
            aria === "Send without a note") &&
          rect.width > 0 &&
          rect.height > 0
        ) {
          sendVisible = true;
          break;
        }
      }

      const toast = document.querySelector(
        '.artdeco-toast-item, [role="alert"], .Toastify__toast',
      );
      const hasToast = toast && toast.getBoundingClientRect().width > 0;

      const leftInvitePage =
        !currentUrl.includes("/preload/custom-invite/") &&
        !currentUrl.includes("/mynetwork/invite-connect/");

      return { currentUrl, hasPending, sendVisible, hasToast, leftInvitePage };
    }, startUrl);

    if (state.hasPending) {
      console.log(`   ✅ Body shows "pending" — sent`);
      return { sent: true, weeklyLimitHit: false };
    }
    if (state.hasToast) {
      // Toast could be either success OR the weekly limit error — recheck
      await page.waitForTimeout(500);
      if (await isWeeklyLimitReached(page)) {
        console.log(`   🚨 WEEKLY LIMIT REACHED (via toast)`);
        return { sent: false, weeklyLimitHit: true };
      }
      console.log(`   ✅ Toast notification — sent`);
      return { sent: true, weeklyLimitHit: false };
    }
    if (state.leftInvitePage && state.currentUrl !== startUrl) {
      console.log(`   ✅ Left invite page — sent`);
      return { sent: true, weeklyLimitHit: false };
    }
    if (!state.sendVisible && attempt > 3) {
      console.log(`   ✅ Send button gone (${attempt}s) — sent`);
      return { sent: true, weeklyLimitHit: false };
    }
  }

  return { sent: false, weeklyLimitHit: false };
}

async function clickSendWithoutNote(page) {
  console.log(`   🖱️  Clicking "Send without a note"...`);
  if (!isPageAlive(page)) return false;

  try {
    const btn = page
      .locator('button[aria-label="Send without a note"]')
      .first();
    if ((await btn.count()) > 0) {
      const isDisabled = await btn.isDisabled().catch(() => false);
      if (!isDisabled) {
        await btn.click({ force: true, timeout: 5000 });
        await randomDelay(2500, 4000);
        return true;
      }
    }

    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const text = (btn.textContent || "").trim();
        const aria = (btn.getAttribute("aria-label") || "").trim();
        const rect = btn.getBoundingClientRect();
        if (
          (text === "Send without a note" || aria === "Send without a note") &&
          rect.width > 0 &&
          rect.height > 0 &&
          !btn.hasAttribute("disabled")
        ) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      await randomDelay(2500, 4000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function clickSendWithNote(page) {
  console.log(`   🖱️  Clicking "Send invitation"...`);
  if (!isPageAlive(page)) return false;

  console.log(`   ⏳ Waiting for Send button to enable...`);
  for (let i = 0; i < 20; i++) {
    if (!isPageAlive(page)) return false;
    await page.waitForTimeout(300);
    const enabled = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const aria = (btn.getAttribute("aria-label") || "").toLowerCase();
        if (
          aria === "send invitation" ||
          aria === "send now" ||
          aria === "send"
        ) {
          const rect = btn.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            !btn.hasAttribute("disabled") &&
            btn.getAttribute("aria-disabled") !== "true"
          ) {
            return true;
          }
        }
      }
      return false;
    });
    if (enabled) {
      console.log(`   ✅ Send button enabled`);
      break;
    }
  }

  const ariaLabels = [
    'button[aria-label="Send invitation"]',
    'button[aria-label="Send now"]',
    'button[aria-label="Send"]',
  ];

  for (const sel of ariaLabels) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) > 0) {
        const isVisible = await btn.isVisible().catch(() => false);
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isVisible && !isDisabled) {
          console.log(`   ✅ Found via ${sel}`);
          await btn.scrollIntoViewIfNeeded().catch(() => {});
          await randomDelay(400, 800);
          await btn.click({ force: true, timeout: 5000 });
          await randomDelay(2500, 4000);
          return true;
        }
      }
    } catch {}
  }

  console.log(`   🔄 Coordinate click fallback...`);
  const coords = await page.evaluate(() => {
    const candidates = [];
    const btns = document.querySelectorAll("button");
    for (const btn of btns) {
      const text = (btn.textContent || "").trim();
      const aria = (btn.getAttribute("aria-label") || "").trim();
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (btn.hasAttribute("disabled")) continue;
      if (btn.getAttribute("aria-disabled") === "true") continue;
      if (aria.toLowerCase().includes("without a note")) continue;
      if (aria.toLowerCase().includes("dismiss")) continue;
      if (aria.toLowerCase().includes("cancel")) continue;

      const isSend =
        aria === "Send invitation" ||
        aria === "Send now" ||
        aria === "Send" ||
        text === "Send" ||
        text === "Send invitation";

      if (isSend) {
        const inDialog = !!btn.closest(
          ".send-invite, [role='dialog'], .artdeco-modal",
        );
        candidates.push({
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
          text,
          aria,
          priority: inDialog ? 1 : 2,
        });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0];
  });

  if (coords) {
    console.log(`   ✅ Coord click: "${coords.aria || coords.text}"`);
    await humanMove(page, coords.x, coords.y);
    await randomDelay(400, 800);
    await humanClick(page, coords.x, coords.y);
    await randomDelay(2500, 4000);
    return true;
  }

  return false;
}

async function navigateToInviteUrl(page, hrefOrProfileUrl) {
  if (!isPageAlive(page)) return false;

  let inviteUrl = "";
  if (
    hrefOrProfileUrl &&
    hrefOrProfileUrl.includes("/preload/custom-invite/")
  ) {
    inviteUrl = hrefOrProfileUrl.startsWith("/")
      ? "https://www.linkedin.com" + hrefOrProfileUrl
      : hrefOrProfileUrl;
  } else if (hrefOrProfileUrl) {
    const vanityMatch = hrefOrProfileUrl.match(/\/in\/([^\/\?]+)/);
    if (vanityMatch) {
      inviteUrl = `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityMatch[1]}`;
    }
  }

  if (!inviteUrl) return false;

  console.log(`   🔗 Navigating to invite URL: ${inviteUrl}`);
  const navOk = await safeGoto(page, inviteUrl);
  if (!navOk) return false;

  await randomDelay(3000, 5000);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: sendConnectionRequest
// ═══════════════════════════════════════════════════════════════
export async function sendConnectionRequest(
  page,
  personalNote = "",
  profileUrl = "",
) {
  console.log(`\n📨 Sending connection request (human-like flow)...`);

  if (!isPageAlive(page)) {
    return { success: false, reason: "page_closed" };
  }

  try {
    if (await isAlreadyPending(page)) {
      console.log(`   ⏳ Already pending — skip`);
      return {
        success: true,
        hadNote: false,
        alreadyPending: true,
        verified: true,
      };
    }

    console.log(`\n   ━━━ STEP 1: Locating Connect button ━━━`);

    const topLevelConnect = await page.evaluate(() => {
      const allEls = [
        ...document.querySelectorAll("a[aria-label]"),
        ...document.querySelectorAll("button[aria-label]"),
      ];
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        const componentkey = el.getAttribute("componentkey") || "";
        if (
          (aria.includes("invite") && aria.includes("connect")) ||
          componentkey.includes("ConnectButton")
        ) {
          const href = el.getAttribute("href") || "";
          el.setAttribute("data-connect-target", "top-level");
          return {
            found: true,
            href,
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
      return { found: false };
    });

    let dialogAppeared = false;
    let connectHref = "";

    if (topLevelConnect.found) {
      console.log(`   ✅ Connect at TOP LEVEL`);
      connectHref = topLevelConnect.href;

      await page.evaluate(() => {
        const el = document.querySelector('[data-connect-target="top-level"]');
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      await randomDelay(1000, 1800);
      await humanMove(page, topLevelConnect.x, topLevelConnect.y);
      await randomDelay(400, 800);
      await humanClick(page, topLevelConnect.x, topLevelConnect.y);
      await randomDelay(2000, 3500);

      if (await isPremiumModalOpen(page)) {
        await dismissPremiumModal(page);
        await randomDelay(2000, 3000);
      }

      dialogAppeared = await waitForInviteDialog(page, 5);

      if (!dialogAppeared && connectHref) {
        console.log(`   🔄 Fallback: direct URL`);
        const navOk = await navigateToInviteUrl(
          page,
          connectHref || profileUrl,
        );
        if (navOk) {
          if (await isPremiumModalOpen(page)) {
            await dismissPremiumModal(page);
            await randomDelay(2000, 3000);
          }
          dialogAppeared = await waitForInviteDialog(page, 10);
        }
      }
    } else {
      console.log(`   ℹ️  Connect NOT at top level — opening More...`);

      const moreCoords = await page.evaluate(() => {
        const btns = document.querySelectorAll('button[aria-label="More"]');
        for (const btn of btns) {
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
          btn.setAttribute("data-more-target", "true");
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
        return null;
      });

      if (!moreCoords) {
        return { success: false, reason: "connect_button_not_found" };
      }

      console.log(`   🖱️  Clicking More`);
      await humanMove(page, moreCoords.x, moreCoords.y);
      await randomDelay(400, 800);
      await humanClick(page, moreCoords.x, moreCoords.y);
      await randomDelay(1500, 2500);

      console.log(`   ⏳ Waiting for Connect in dropdown...`);
      let connectInDropdown = null;
      for (let i = 0; i < 30; i++) {
        if (!isPageAlive(page)) break;
        await page.waitForTimeout(400);

        connectInDropdown = await page.evaluate(() => {
          const connectByKey = document.querySelector(
            'a[componentkey*="ConnectButton"][componentkey*="_connect"], ' +
              'a[componentkey*="ConnectButton"][href*="/preload/custom-invite/"]',
          );
          if (connectByKey) {
            const rect = connectByKey.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              connectByKey.setAttribute("data-connect-target", "dropdown");
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
                href: connectByKey.getAttribute("href"),
              };
            }
          }

          const ariaMatch = document.querySelector(
            'a[aria-label*="Invite" i][aria-label*="to connect" i]',
          );
          if (ariaMatch) {
            const link = ariaMatch.closest("a") || ariaMatch;
            const rect = link.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              link.setAttribute("data-connect-target", "dropdown");
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
                href: link.getAttribute("href"),
              };
            }
          }

          const menuItems = document.querySelectorAll('a[role="menuitem"]');
          for (const item of menuItems) {
            const text = (item.textContent || "").trim();
            if (text === "Connect" || text.startsWith("Connect")) {
              const rect = item.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                item.setAttribute("data-connect-target", "dropdown");
                return {
                  x: Math.floor(rect.x + rect.width / 2),
                  y: Math.floor(rect.y + rect.height / 2),
                  href: item.getAttribute("href"),
                };
              }
            }
          }
          return null;
        });

        if (connectInDropdown) break;

        if (i > 0 && i % 8 === 0) {
          const stillOpen = await page.evaluate(() => {
            const btn = document.querySelector('[data-more-target="true"]');
            return btn && btn.getAttribute("aria-expanded") === "true";
          });
          if (!stillOpen) {
            try {
              await page
                .locator('[data-more-target="true"]')
                .first()
                .click({ force: true });
              await randomDelay(1000, 2000);
            } catch {}
          }
        }
      }

      if (!connectInDropdown) {
        try {
          await page.keyboard.press("Escape");
        } catch {}
        return { success: false, reason: "connect_not_in_dropdown" };
      }

      connectHref = connectInDropdown.href;

      await humanMove(page, connectInDropdown.x, connectInDropdown.y);
      await randomDelay(400, 800);
      await humanClick(page, connectInDropdown.x, connectInDropdown.y);
      await randomDelay(2000, 3500);

      if (await isPremiumModalOpen(page)) {
        await dismissPremiumModal(page);
        await randomDelay(2000, 3000);
      }

      dialogAppeared = await waitForInviteDialog(page, 5);

      if (!dialogAppeared) {
        try {
          await page
            .locator('[data-connect-target="dropdown"]')
            .first()
            .click({ force: true, timeout: 5000 });
          await randomDelay(2500, 4000);
          if (await isPremiumModalOpen(page)) {
            await dismissPremiumModal(page);
            await randomDelay(2000, 3000);
          }
          dialogAppeared = await waitForInviteDialog(page, 5);
        } catch {}
      }

      if (!dialogAppeared && connectHref) {
        const navOk = await navigateToInviteUrl(page, connectHref);
        if (navOk) {
          if (await isPremiumModalOpen(page)) {
            await dismissPremiumModal(page);
            await randomDelay(2000, 3000);
          }
          dialogAppeared = await waitForInviteDialog(page, 10);
        }
      }
    }

    if (!dialogAppeared) {
      if (await isAlreadyPending(page)) {
        return {
          success: true,
          hadNote: false,
          alreadyPending: true,
          verified: true,
        };
      }
      return { success: false, reason: "dialog_never_appeared" };
    }

    console.log(`\n   ━━━ STEP 2: Try with note ━━━`);

    let noteAdded = false;
    let sentWithoutNote = false;
    let sendClickedWithNote = false;

    const hasAddNoteBtn = await page
      .evaluate(() => {
        const btns = document.querySelectorAll(
          'button[aria-label="Add a note"]',
        );
        for (const btn of btns) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
        }
        return false;
      })
      .catch(() => false);

    if (personalNote && personalNote.length > 0 && hasAddNoteBtn) {
      const addNoteClicked = await page.evaluate(() => {
        const btns = document.querySelectorAll(
          'button[aria-label="Add a note"]',
        );
        for (const btn of btns) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (addNoteClicked) {
        await randomDelay(2000, 3500);

        try {
          const noteField = page
            .locator('textarea[name="message"], #custom-message')
            .first();
          const fieldVisible =
            (await noteField.count()) > 0 &&
            (await noteField.isVisible().catch(() => false));

          if (fieldVisible) {
            console.log(`   📝 Typing note (${personalNote.length} chars)...`);
            await noteField.click();
            await randomDelay(500, 1000);
            try {
              await page.keyboard.press("Control+a");
              await page.keyboard.press("Delete");
              await randomDelay(300, 500);
              await humanTypeText(page, personalNote);
              await randomDelay(1500, 2500);
              noteAdded = true;
              console.log(`   ✅ Note typed`);
            } catch (typeErr) {
              console.log(`   ⚠️  Typing failed: ${typeErr.message}`);
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Note field error: ${err.message}`);
        }

        if (noteAdded) {
          sendClickedWithNote = await clickSendWithNote(page);

          if (await isPremiumModalOpen(page)) {
            await dismissPremiumModal(page);
            await randomDelay(2000, 3000);
            sendClickedWithNote = false;
            noteAdded = false;
          }
        }
      }
    }

    // ═══ STEP 3: Verify + check weekly limit ═══
    if (sendClickedWithNote) {
      console.log(`\n   ━━━ STEP 3: Verify ━━━`);
      const result = await verifyConnectionSent(page);

      if (result.weeklyLimitHit) {
        return {
          success: false,
          reason: "weekly_limit_reached",
          weeklyLimitHit: true,
        };
      }

      if (result.sent) {
        console.log(`   ✅ Connection sent WITH note!`);
        return {
          success: true,
          hadNote: true,
          sentWithoutNote: false,
          verified: true,
        };
      }

      console.log(`   ⚠️  Send unclear — treating as sent`);
      return {
        success: true,
        hadNote: true,
        sentWithoutNote: false,
        verified: false,
      };
    }

    // ═══ STEP 4: Send without note ═══
    console.log(`\n   ━━━ STEP 4: Send without note ━━━`);

    if (!(await isInviteDialogOpen(page))) {
      const navOk = await navigateToInviteUrl(page, connectHref || profileUrl);
      if (!navOk) return { success: false, reason: "dialog_lost" };
      if (await isPremiumModalOpen(page)) {
        await dismissPremiumModal(page);
        await randomDelay(2000, 3000);
      }
      if (!(await waitForInviteDialog(page, 10))) {
        return { success: false, reason: "dialog_never_reappeared" };
      }
    }

    const sent = await clickSendWithoutNote(page);
    if (!sent) {
      return { success: false, reason: "send_without_note_failed" };
    }
    sentWithoutNote = true;

    const result2 = await verifyConnectionSent(page);
    if (result2.weeklyLimitHit) {
      return {
        success: false,
        reason: "weekly_limit_reached",
        weeklyLimitHit: true,
      };
    }
    if (result2.sent) {
      console.log(`   ✅ Connection sent without note!`);
      return {
        success: true,
        hadNote: false,
        sentWithoutNote: true,
        verified: true,
      };
    }

    return {
      success: true,
      hadNote: false,
      sentWithoutNote: true,
      verified: false,
    };
  } catch (err) {
    console.log(`   ❌ Connection error: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// INCOMING INVITATION CHECK
// ═══════════════════════════════════════════════════════════════
export async function checkIncomingInvitation(page, targetPersonName = "") {
  console.log(`   🔍 Checking for incoming invitation...`);

  if (!isPageAlive(page)) return { hasIncoming: false };

  try {
    const result = await page.evaluate((personName) => {
      const targetFirstName = personName.split(" ")[0].toLowerCase();
      const acceptBtns = document.querySelectorAll(
        'button[aria-label*="Accept" i][aria-label*="request to connect" i]',
      );

      for (const btn of acceptBtns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.y < 100) continue;
        if (rect.y > window.innerHeight - 100) continue;
        if (rect.x < 100 || rect.x > 1100) continue;

        const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
        if (
          personName &&
          targetFirstName &&
          !ariaLabel.includes(targetFirstName)
        )
          continue;

        let parent = btn.parentElement;
        let hasIgnoreNearby = false;
        for (let i = 0; i < 6; i++) {
          if (!parent) break;
          const ignoreBtns = parent.querySelectorAll("button");
          for (const b of ignoreBtns) {
            const btnText = (b.textContent || "").trim().toLowerCase();
            const btnAria = (b.getAttribute("aria-label") || "").toLowerCase();
            if (btnText === "ignore" || btnAria.includes("ignore")) {
              const iRect = b.getBoundingClientRect();
              if (iRect.width > 0 && iRect.height > 0 && iRect.y > 100) {
                hasIgnoreNearby = true;
                break;
              }
            }
          }
          if (hasIgnoreNearby) break;
          parent = parent.parentElement;
        }

        if (!hasIgnoreNearby) continue;

        btn.setAttribute("data-accept-btn", "true");
        return {
          hasIncoming: true,
          ariaLabel: btn.getAttribute("aria-label"),
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      }

      return { hasIncoming: false };
    }, targetPersonName);

    if (result.hasIncoming) {
      console.log(`   💌 Incoming: "${result.ariaLabel}"`);
    } else {
      console.log(`   ℹ️  No incoming invitation`);
    }

    return result;
  } catch (err) {
    return { hasIncoming: false };
  }
}

export async function acceptIncomingInvitation(page, acceptCoords) {
  console.log(`   ✅ Accepting incoming invitation...`);

  if (!isPageAlive(page)) return { success: false, reason: "page_closed" };

  try {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (btn) btn.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await randomDelay(1500, 2500);

    const freshCoords = await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    const coords = freshCoords || acceptCoords;
    await humanClick(page, coords.x, coords.y);
    await randomDelay(3000, 5000);

    const accepted = await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (!btn) return true;
      const rect = btn.getBoundingClientRect();
      return rect.width === 0 || rect.height === 0;
    });

    await page.evaluate(() => {
      const btn = document.querySelector('[data-accept-btn="true"]');
      if (btn) btn.removeAttribute("data-accept-btn");
    });

    if (accepted) {
      console.log(`   ✅ Invitation ACCEPTED!`);
      return { success: true };
    }
    return { success: false, reason: "not_confirmed" };
  } catch (err) {
    return { success: false, reason: "error", error: err.message };
  }
}
