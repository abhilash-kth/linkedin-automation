// import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { dismissPremiumModal } from "./premium.service.js";
// import { safeGoto } from "../browser/navigation.service.js";

// export async function clickMessageButton(page) {
//   console.log(`   🔎 Locating Message button on profile...`);

//   let found = false;
//   for (let attempt = 1; attempt <= 15; attempt++) {
//     await page.waitForTimeout(1000);

//     found = await page.evaluate(() => {
//       const messageLinks = document.querySelectorAll(
//         'a[href*="/messaging/compose/"]',
//       );
//       for (const el of messageLinks) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         el.setAttribute("data-outreach-msg-btn", "true");
//         return true;
//       }

//       const allEls = [
//         ...document.querySelectorAll("button"),
//         ...document.querySelectorAll("a"),
//       ];
//       for (const el of allEls) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         const text = (el.textContent || "").trim();
//         const aria = (el.getAttribute("aria-label") || "").toLowerCase();
//         if (
//           text === "Message" ||
//           aria === "message" ||
//           aria.startsWith("message ")
//         ) {
//           el.setAttribute("data-outreach-msg-btn", "true");
//           return true;
//         }
//       }
//       return false;
//     });

//     if (found) {
//       console.log(`   ✅ Message button tagged`);
//       break;
//     }

//     if (attempt % 5 === 0) {
//       console.log(`   ⏳ Still searching... ${attempt}/15s`);
//     }
//   }

//   if (!found) {
//     console.log(`   ❌ Message button not found`);
//     return false;
//   }

//   console.log(`   📜 Scrolling into view...`);
//   await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//   });
//   await randomDelay(1500, 2500);

//   const coords = await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (!el) return null;
//     const rect = el.getBoundingClientRect();
//     return {
//       x: Math.floor(rect.x + rect.width / 2),
//       y: Math.floor(rect.y + rect.height / 2),
//     };
//   });

//   if (!coords) return false;

//   console.log(`   🖱️  Clicking at (${coords.x}, ${coords.y})...`);

//   await page.mouse.move(coords.x, coords.y, { steps: 10 });
//   await page.waitForTimeout(300 + Math.random() * 400);
//   await page.mouse.click(coords.x, coords.y, {
//     delay: 80 + Math.random() * 100,
//   });
//   await randomDelay(2500, 4000);

//   let composerOpened = await page.evaluate(() => {
//     const el = document.querySelector(
//       '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//     );
//     return el && el.getBoundingClientRect().width > 0;
//   });

//   console.log(`   📊 After mouse click: composer opened = ${composerOpened}`);

//   if (!composerOpened) {
//     console.log(`   🔄 Trying Playwright locator click...`);
//     try {
//       await page
//         .locator('[data-outreach-msg-btn="true"]')
//         .first()
//         .click({ force: true, timeout: 5000 });
//       await randomDelay(2500, 4000);
//       composerOpened = await page.evaluate(() => {
//         const el = document.querySelector(
//           '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//         );
//         return el && el.getBoundingClientRect().width > 0;
//       });
//       console.log(
//         `   📊 After locator click: composer opened = ${composerOpened}`,
//       );
//     } catch (err) {
//       console.log(`   ⚠️  Locator click failed: ${err.message}`);
//     }
//   }

//   if (!composerOpened) {
//     console.log(`   🔄 Trying dispatchEvent...`);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-outreach-msg-btn="true"]');
//       if (el) {
//         const rect = el.getBoundingClientRect();
//         const x = rect.x + rect.width / 2;
//         const y = rect.y + rect.height / 2;
//         ["mousedown", "mouseup", "click"].forEach((type) => {
//           el.dispatchEvent(
//             new MouseEvent(type, {
//               view: window,
//               bubbles: true,
//               cancelable: true,
//               clientX: x,
//               clientY: y,
//               button: 0,
//             }),
//           );
//         });
//       }
//     });
//     await randomDelay(2500, 4000);

//     composerOpened = await page.evaluate(() => {
//       const el = document.querySelector(
//         '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//       );
//       return el && el.getBoundingClientRect().width > 0;
//     });
//     console.log(
//       `   📊 After dispatchEvent: composer opened = ${composerOpened}`,
//     );
//   }

//   if (!composerOpened) {
//     console.log(`   🔄 Navigating to messaging URL...`);
//     const messagingUrl = await page.evaluate(() => {
//       const el = document.querySelector('[data-outreach-msg-btn="true"]');
//       if (!el) return null;
//       if (el.tagName === "A" && el.getAttribute("href"))
//         return el.getAttribute("href");
//       let current = el;
//       for (let i = 0; i < 5; i++) {
//         if (current.parentElement) {
//           current = current.parentElement;
//           if (current.tagName === "A" && current.getAttribute("href"))
//             return current.getAttribute("href");
//         } else break;
//       }
//       return null;
//     });

//     if (messagingUrl) {
//       const fullUrl = messagingUrl.startsWith("/")
//         ? "https://www.linkedin.com" + messagingUrl
//         : messagingUrl;
//       console.log(`   🔗 Navigating to: ${fullUrl}`);
//       await safeGoto(page, fullUrl);
//       await randomDelay(3000, 5000);
//     }
//   }

//   return true;
// }

// export async function sendMessageViaComposer(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`   ⏳ Waiting for composer...`);

//   let composerReady = false;
//   let composerInfo = null;

//   for (let attempt = 1; attempt <= 25; attempt++) {
//     await page.waitForTimeout(1000);

//     if (attempt === 3 || attempt === 8 || attempt === 15) {
//       await dismissPremiumModal(page);
//     }

//     composerInfo = await page.evaluate(() => {
//       const primary = document.querySelector(".msg-form__contenteditable");
//       if (primary) {
//         const rect = primary.getBoundingClientRect();
//         if (rect.width > 30 && rect.height > 15) {
//           return {
//             found: true,
//             selector: ".msg-form__contenteditable",
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             w: Math.floor(rect.width),
//             h: Math.floor(rect.height),
//             hasSubject: !!document.querySelector(
//               'input.msg-form__subject, input[name="subject"]',
//             ),
//           };
//         }
//       }

//       const fallbacks = [
//         '[contenteditable="true"][role="textbox"]',
//         'div[contenteditable="true"][aria-label*="message" i]',
//         'div[contenteditable="true"][aria-label*="Write" i]',
//       ];

//       for (const sel of fallbacks) {
//         const els = document.querySelectorAll(sel);
//         for (const el of els) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 30 && rect.height > 15) {
//             return {
//               found: true,
//               selector: sel,
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               hasSubject: !!document.querySelector(
//                 'input.msg-form__subject, input[name="subject"]',
//               ),
//             };
//           }
//         }
//       }
//       return { found: false };
//     });

//     if (composerInfo.found) {
//       console.log(
//         `   ✅ Composer ready after ${attempt}s (${composerInfo.w}x${composerInfo.h})`,
//       );
//       console.log(`   📝 Has subject: ${composerInfo.hasSubject}`);
//       composerReady = true;
//       break;
//     }

//     if (attempt % 5 === 0) {
//       console.log(`   ⏳ Still waiting... ${attempt}/25s`);
//       try {
//         await page.screenshot({
//           path: `./profiles/${accountId}/debug-composer-${attempt}.png`,
//         });
//       } catch {}
//     }
//   }

//   if (!composerReady) {
//     if (await dismissPremiumModal(page)) {
//       return { success: false, reason: "premium_required_for_inmail" };
//     }
//     return { success: false, reason: "composer_never_appeared" };
//   }

//   await randomDelay(1000, 2000);

//   // Fill subject
//   if (composerInfo.hasSubject && subject && subject.length > 0) {
//     console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
//     await page.evaluate(() => {
//       const f = document.querySelector(
//         'input.msg-form__subject, input[name="subject"]',
//       );
//       if (f) {
//         f.focus();
//         f.click();
//       }
//     });
//     await randomDelay(500, 900);
//     await page.keyboard.press("Control+a");
//     await page.keyboard.press("Delete");
//     await humanTypeText(page, subject);
//     await randomDelay(800, 1500);
//     console.log(`   ✅ Subject filled`);
//   }

//   // Click composer
//   console.log(`   🖱️  Clicking composer...`);
//   await humanClick(page, composerInfo.x, composerInfo.y);
//   await randomDelay(800, 1500);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       el.click();
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   await page.keyboard.press("Control+a");
//   await page.keyboard.press("Delete");
//   await randomDelay(300, 600);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       const range = document.createRange();
//       const selection = window.getSelection();
//       range.selectNodeContents(el);
//       range.collapse(false);
//       selection.removeAllRanges();
//       selection.addRange(range);
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
//   await humanTypeText(page, messageText);
//   await randomDelay(1500, 2500);

//   const typedContent = await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     return el ? (el.textContent || "").trim().length : 0;
//   }, composerInfo.selector);

//   console.log(`   📊 Chars typed: ${typedContent}`);

//   if (typedContent === 0) {
//     console.log(`   ⚠️  JS insertText fallback...`);
//     await page.evaluate(
//       (data) => {
//         const el = document.querySelector(data.sel);
//         if (!el) return;
//         el.focus();
//         try {
//           document.execCommand("insertText", false, data.text);
//         } catch {}
//         if ((el.textContent || "").trim().length === 0) {
//           el.innerHTML = `<p>${data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
//           el.dispatchEvent(new Event("input", { bubbles: true }));
//         }
//       },
//       { sel: composerInfo.selector, text: messageText },
//     );
//     await randomDelay(1000, 1500);
//   }

//   console.log(`   ✅ Message in composer`);

//   const sendState = await page.evaluate(() => {
//     const sels = [
//       "button.msg-form__send-btn",
//       "button.msg-form__send-button",
//       'button[aria-label="Send message"]',
//     ];
//     for (const sel of sels) {
//       const btns = document.querySelectorAll(sel);
//       for (const btn of btns) {
//         const rect = btn.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0) {
//           return {
//             exists: true,
//             selector: sel,
//             disabled: btn.hasAttribute("disabled"),
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//           };
//         }
//       }
//     }
//     return { exists: false };
//   });

//   console.log(
//     `   📊 Send btn: exists=${sendState.exists}, disabled=${sendState.disabled}`,
//   );

//   // Check for InMail credit exhaustion popup BEFORE clicking send
//   const inMailBlocked = await page.evaluate(() => {
//     const text = (document.body.innerText || "").toLowerCase();
//     return (
//       text.includes("out of free inmail") ||
//       text.includes("no inmail credits") ||
//       text.includes("upgrade to premium")
//     );
//   });

//   if (inMailBlocked) {
//     console.log(`   💎 Out of InMail credits — skipping send`);
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   if (actuallySend) {
//     if (!sendState.exists)
//       return { success: false, reason: "send_button_missing" };

//     if (sendState.disabled) {
//       await page.evaluate((sel) => {
//         const el = document.querySelector(sel);
//         if (el) {
//           el.focus();
//           el.click();
//         }
//       }, composerInfo.selector);
//       await page.keyboard.press("End");
//       await page.keyboard.type(" ");
//       await page.waitForTimeout(400);
//       await page.keyboard.press("Backspace");
//       await page.waitForTimeout(800);
//     }

//     console.log(`   🖱️  Clicking send...`);
//     await humanClick(page, sendState.x, sendState.y);
//     await randomDelay(3000, 5000);

//     if (await dismissPremiumModal(page)) {
//       return { success: false, reason: "premium_required_for_inmail" };
//     }

//     console.log(`   ✅ Message SENT!`);
//     return { success: true, action: "message_sent" };
//   } else {
//     console.log(`   ⚠️  Safe mode — typed but NOT sent`);
//     return { success: true, action: "typed_only" };
//   }
// }

// export async function attemptSendMessage(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`\n💬 Attempting to send message...`);

//   const clicked = await clickMessageButton(page);
//   if (!clicked) return { success: false, reason: "no_message_button" };

//   await randomDelay(2000, 3500);
//   await dismissPremiumModal(page);

//   return await sendMessageViaComposer(
//     page,
//     messageText,
//     subject,
//     actuallySend,
//     accountId,
//   );
// }

// import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { dismissPremiumModal } from "./premium.service.js";
// import { safeGoto } from "../browser/navigation.service.js";

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Detect Premium/InMail block modal (any variant)
// // ═══════════════════════════════════════════════════════════════
// async function isInMailPremiumBlocked(page) {
//   try {
//     return await page.evaluate(() => {
//       const bodyText = (document.body.innerText || "").toLowerCase();
//       if (
//         bodyText.includes("out of free inmail") ||
//         bodyText.includes("no inmail credits") ||
//         bodyText.includes("upgrade to premium to send") ||
//         bodyText.includes("premium to reach out")
//       ) {
//         return true;
//       }

//       // Check for premium upsell modal
//       const modals = document.querySelectorAll(
//         '[role="dialog"], .artdeco-modal, .modal-upsell',
//       );
//       for (const m of modals) {
//         const rect = m.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         const text = (m.textContent || "").toLowerCase();
//         if (
//           text.includes("try premium") ||
//           text.includes("upgrade to premium") ||
//           text.includes("out of free") ||
//           text.includes("inmail credit") ||
//           (text.includes("premium") && text.includes("upgrade"))
//         ) {
//           return true;
//         }
//       }
//       return false;
//     });
//   } catch {
//     return false;
//   }
// }

// export async function clickMessageButton(page) {
//   console.log(`   🔎 Locating Message button on profile...`);

//   let found = false;
//   for (let attempt = 1; attempt <= 15; attempt++) {
//     await page.waitForTimeout(1000);

//     found = await page.evaluate(() => {
//       const messageLinks = document.querySelectorAll('a[href*="/messaging/compose/"]');
//       for (const el of messageLinks) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         el.setAttribute("data-outreach-msg-btn", "true");
//         return true;
//       }

//       const allEls = [
//         ...document.querySelectorAll("button"),
//         ...document.querySelectorAll("a"),
//       ];
//       for (const el of allEls) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         const text = (el.textContent || "").trim();
//         const aria = (el.getAttribute("aria-label") || "").toLowerCase();
//         if (text === "Message" || aria === "message" || aria.startsWith("message ")) {
//           el.setAttribute("data-outreach-msg-btn", "true");
//           return true;
//         }
//       }
//       return false;
//     });

//     if (found) break;
//     if (attempt % 5 === 0) console.log(`   ⏳ Still searching... ${attempt}/15s`);
//   }

//   if (!found) {
//     console.log(`   ❌ Message button not found`);
//     return false;
//   }

//   console.log(`   📜 Scrolling into view...`);
//   await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//   });
//   await randomDelay(1500, 2500);

//   const coords = await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (!el) return null;
//     const rect = el.getBoundingClientRect();
//     return {
//       x: Math.floor(rect.x + rect.width / 2),
//       y: Math.floor(rect.y + rect.height / 2),
//     };
//   });

//   if (!coords) return false;

//   console.log(`   🖱️  Clicking at (${coords.x}, ${coords.y})...`);
//   await page.mouse.move(coords.x, coords.y, { steps: 10 });
//   await page.waitForTimeout(300 + Math.random() * 400);
//   await page.mouse.click(coords.x, coords.y, { delay: 80 + Math.random() * 100 });
//   await randomDelay(2500, 4000);

//   // ═══ CRITICAL: Check for Premium/InMail block BEFORE anything else ═══
//   if (await isInMailPremiumBlocked(page)) {
//     console.log(`   💎 InMail Premium block detected — dismissing`);
//     await dismissPremiumModal(page);
//     return "premium_blocked";
//   }

//   let composerOpened = await page.evaluate(() => {
//     const el = document.querySelector(
//       '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//     );
//     return el && el.getBoundingClientRect().width > 0;
//   });

//   if (!composerOpened) {
//     console.log(`   🔄 Trying Playwright locator click...`);
//     try {
//       await page
//         .locator('[data-outreach-msg-btn="true"]')
//         .first()
//         .click({ force: true, timeout: 5000 });
//       await randomDelay(2500, 4000);

//       if (await isInMailPremiumBlocked(page)) {
//         console.log(`   💎 InMail Premium block detected — dismissing`);
//         await dismissPremiumModal(page);
//         return "premium_blocked";
//       }

//       composerOpened = await page.evaluate(() => {
//         const el = document.querySelector(
//           '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//         );
//         return el && el.getBoundingClientRect().width > 0;
//       });
//     } catch {}
//   }

//   if (!composerOpened) {
//     console.log(`   🔄 Trying dispatchEvent...`);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-outreach-msg-btn="true"]');
//       if (el) {
//         const rect = el.getBoundingClientRect();
//         const x = rect.x + rect.width / 2;
//         const y = rect.y + rect.height / 2;
//         ["mousedown", "mouseup", "click"].forEach((type) => {
//           el.dispatchEvent(
//             new MouseEvent(type, {
//               view: window,
//               bubbles: true,
//               cancelable: true,
//               clientX: x,
//               clientY: y,
//               button: 0,
//             }),
//           );
//         });
//       }
//     });
//     await randomDelay(2500, 4000);

//     if (await isInMailPremiumBlocked(page)) {
//       console.log(`   💎 InMail Premium block detected — dismissing`);
//       await dismissPremiumModal(page);
//       return "premium_blocked";
//     }

//     composerOpened = await page.evaluate(() => {
//       const el = document.querySelector(
//         '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//       );
//       return el && el.getBoundingClientRect().width > 0;
//     });
//   }

//   // NOTE: We no longer navigate to compose URL directly (that's what caused
//   // the false-positive "message sent" while connection was actually dropped)

//   return composerOpened ? true : false;
// }

// export async function sendMessageViaComposer(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`   ⏳ Waiting for composer...`);

//   let composerReady = false;
//   let composerInfo = null;

//   for (let attempt = 1; attempt <= 25; attempt++) {
//     await page.waitForTimeout(1000);

//     // Check Premium block each iteration
//     if (attempt === 3 || attempt === 8 || attempt === 15) {
//       if (await isInMailPremiumBlocked(page)) {
//         console.log(`   💎 InMail Premium block detected during wait`);
//         await dismissPremiumModal(page);
//         return { success: false, reason: "premium_required_for_inmail" };
//       }
//     }

//     composerInfo = await page.evaluate(() => {
//       const primary = document.querySelector(".msg-form__contenteditable");
//       if (primary) {
//         const rect = primary.getBoundingClientRect();
//         if (rect.width > 30 && rect.height > 15) {
//           return {
//             found: true,
//             selector: ".msg-form__contenteditable",
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             w: Math.floor(rect.width),
//             h: Math.floor(rect.height),
//             hasSubject: !!document.querySelector(
//               'input.msg-form__subject, input[name="subject"]',
//             ),
//           };
//         }
//       }

//       const fallbacks = [
//         '[contenteditable="true"][role="textbox"]',
//         'div[contenteditable="true"][aria-label*="message" i]',
//         'div[contenteditable="true"][aria-label*="Write" i]',
//       ];

//       for (const sel of fallbacks) {
//         const els = document.querySelectorAll(sel);
//         for (const el of els) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 30 && rect.height > 15) {
//             return {
//               found: true,
//               selector: sel,
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               hasSubject: !!document.querySelector(
//                 'input.msg-form__subject, input[name="subject"]',
//               ),
//             };
//           }
//         }
//       }
//       return { found: false };
//     });

//     if (composerInfo.found) {
//       console.log(`   ✅ Composer ready (${composerInfo.w}x${composerInfo.h})`);
//       console.log(`   📝 Has subject: ${composerInfo.hasSubject}`);
//       composerReady = true;
//       break;
//     }
//   }

//   if (!composerReady) {
//     if (await isInMailPremiumBlocked(page)) {
//       await dismissPremiumModal(page);
//       return { success: false, reason: "premium_required_for_inmail" };
//     }
//     return { success: false, reason: "composer_never_appeared" };
//   }

//   await randomDelay(1000, 2000);

//   // Fill subject
//   if (composerInfo.hasSubject && subject && subject.length > 0) {
//     console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
//     await page.evaluate(() => {
//       const f = document.querySelector('input.msg-form__subject, input[name="subject"]');
//       if (f) {
//         f.focus();
//         f.click();
//       }
//     });
//     await randomDelay(500, 900);
//     await page.keyboard.press("Control+a");
//     await page.keyboard.press("Delete");
//     await humanTypeText(page, subject);
//     await randomDelay(800, 1500);
//   }

//   // Click composer
//   console.log(`   🖱️  Clicking composer...`);
//   await humanClick(page, composerInfo.x, composerInfo.y);
//   await randomDelay(800, 1500);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       el.click();
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   await page.keyboard.press("Control+a");
//   await page.keyboard.press("Delete");
//   await randomDelay(300, 600);

//   console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
//   await humanTypeText(page, messageText);
//   await randomDelay(1500, 2500);

//   const typedContent = await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     return el ? (el.textContent || "").trim().length : 0;
//   }, composerInfo.selector);

//   if (typedContent === 0) {
//     await page.evaluate(
//       (data) => {
//         const el = document.querySelector(data.sel);
//         if (!el) return;
//         el.focus();
//         try {
//           document.execCommand("insertText", false, data.text);
//         } catch {}
//         if ((el.textContent || "").trim().length === 0) {
//           el.innerHTML = `<p>${data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
//           el.dispatchEvent(new Event("input", { bubbles: true }));
//         }
//       },
//       { sel: composerInfo.selector, text: messageText },
//     );
//     await randomDelay(1000, 1500);
//   }

//   const sendState = await page.evaluate(() => {
//     const sels = [
//       "button.msg-form__send-btn",
//       "button.msg-form__send-button",
//       'button[aria-label="Send message"]',
//     ];
//     for (const sel of sels) {
//       const btns = document.querySelectorAll(sel);
//       for (const btn of btns) {
//         const rect = btn.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0) {
//           return {
//             exists: true,
//             selector: sel,
//             disabled: btn.hasAttribute("disabled"),
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//           };
//         }
//       }
//     }
//     return { exists: false };
//   });

//   // Final Premium check before sending
//   if (await isInMailPremiumBlocked(page)) {
//     console.log(`   💎 Premium block detected before send`);
//     await dismissPremiumModal(page);
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   if (actuallySend) {
//     if (!sendState.exists) return { success: false, reason: "send_button_missing" };

//     if (sendState.disabled) {
//       await page.evaluate((sel) => {
//         const el = document.querySelector(sel);
//         if (el) {
//           el.focus();
//           el.click();
//         }
//       }, composerInfo.selector);
//       await page.keyboard.press("End");
//       await page.keyboard.type(" ");
//       await page.waitForTimeout(400);
//       await page.keyboard.press("Backspace");
//       await page.waitForTimeout(800);
//     }

//     console.log(`   🖱️  Clicking send...`);
//     await humanClick(page, sendState.x, sendState.y);
//     await randomDelay(3000, 5000);

//     if (await isInMailPremiumBlocked(page)) {
//       await dismissPremiumModal(page);
//       return { success: false, reason: "premium_required_for_inmail" };
//     }

//     console.log(`   ✅ Message SENT!`);
//     return { success: true, action: "message_sent" };
//   } else {
//     return { success: true, action: "typed_only" };
//   }
// }

// export async function attemptSendMessage(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`\n💬 Attempting to send message...`);

//   const clickResult = await clickMessageButton(page);

//   if (clickResult === "premium_blocked") {
//     return { success: false, reason: "premium_required_for_inmail" };
//   }
//   if (!clickResult) {
//     return { success: false, reason: "no_message_button" };
//   }

//   await randomDelay(2000, 3500);

//   if (await isInMailPremiumBlocked(page)) {
//     await dismissPremiumModal(page);
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   return await sendMessageViaComposer(page, messageText, subject, actuallySend, accountId);
// }

/////////////////////////////////////////////////////////////////////////////////////

// import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { dismissPremiumModal } from "./premium.service.js";
// import { safeGoto } from "../browser/navigation.service.js";

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Detect Premium/InMail block modal
// // ═══════════════════════════════════════════════════════════════
// async function isInMailPremiumBlocked(page) {
//   try {
//     return await page.evaluate(() => {
//       const bodyText = (document.body.innerText || "").toLowerCase();
//       if (
//         bodyText.includes("out of free inmail") ||
//         bodyText.includes("no inmail credits") ||
//         bodyText.includes("upgrade to premium to send") ||
//         bodyText.includes("premium to reach out")
//       ) {
//         return true;
//       }
//       const modals = document.querySelectorAll(
//         '[role="dialog"], .artdeco-modal, .modal-upsell',
//       );
//       for (const m of modals) {
//         const rect = m.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         const text = (m.textContent || "").toLowerCase();
//         if (
//           text.includes("try premium") ||
//           text.includes("upgrade to premium") ||
//           text.includes("out of free") ||
//           text.includes("inmail credit") ||
//           (text.includes("premium") && text.includes("upgrade"))
//         ) {
//           return true;
//         }
//       }
//       return false;
//     });
//   } catch {
//     return false;
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Close ALL compose overlays
// // ═══════════════════════════════════════════════════════════════
// async function closeAllComposeOverlays(page) {
//   try {
//     await page.evaluate(() => {
//       const overlays = document.querySelectorAll(
//         '.msg-overlay-conversation-bubble, .msg-overlay-list-bubble, [data-test-id*="message-overlay"]',
//       );

//       for (const overlay of overlays) {
//         const container =
//           overlay.closest(
//             ".msg-overlay-conversation-bubble, .msg-overlay-list-bubble",
//           ) || overlay;

//         const closeBtn = container.querySelector(
//           'button[aria-label*="Close" i], button[data-control-name="overlay.close_conversation_window"], button.msg-overlay-bubble-header__control--close',
//         );
//         if (closeBtn) {
//           try {
//             closeBtn.click();
//           } catch {}
//         }
//       }
//     });
//     await page.waitForTimeout(500);
//   } catch {}
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Check if we ALREADY have a conversation with this person
// // If yes → skip (don't send duplicate)
// // ═══════════════════════════════════════════════════════════════
// async function hasExistingConversation(page, expectedProfileName) {
//   try {
//     return await page.evaluate((expectedName) => {
//       const overlays = document.querySelectorAll(
//         ".msg-overlay-conversation-bubble",
//       );

//       for (const overlay of overlays) {
//         const headerName = overlay.querySelector(
//           ".msg-overlay-bubble-header__title, h2, .msg-overlay-conversation-bubble-header h2",
//         );

//         if (headerName) {
//           const text = (headerName.textContent || "").trim().toLowerCase();
//           const expected = (expectedName || "").trim().toLowerCase();

//           if (expected && text.includes(expected.split(" ")[0])) {
//             // Check if there are existing messages in this thread
//             const messages = overlay.querySelectorAll(
//               '.msg-s-message-list__event, .msg-s-event-listitem, [data-test-id="conversation-message"]',
//             );
//             return {
//               exists: true,
//               hasMessages: messages.length > 0,
//               headerName: text,
//             };
//           }
//         }
//       }
//       return { exists: false };
//     }, expectedProfileName);
//   } catch {
//     return { exists: false };
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Get profile name from page (to verify we're on right profile)
// // ═══════════════════════════════════════════════════════════════
// async function getProfileName(page) {
//   try {
//     return await page.evaluate(() => {
//       const el = document.querySelector(
//         "main h1, main .pv-text-details__left-panel h1, main .text-heading-xlarge",
//       );
//       return el ? el.textContent.trim() : null;
//     });
//   } catch {
//     return null;
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Find PROFILE Message button ONLY (top card, not sidebar)
// // ═══════════════════════════════════════════════════════════════
// async function findProfileMessageButton(page) {
//   return await page.evaluate(() => {
//     // Get the profile's name
//     const profileNameEl = document.querySelector(
//       "main h1, main .pv-text-details__left-panel h1, main .text-heading-xlarge",
//     );
//     const profileName = profileNameEl
//       ? profileNameEl.textContent.trim().toLowerCase()
//       : null;

//     // ── STRICT: Only look inside the TOP profile card ──
//     // The top card is where Connect/Message/Follow buttons live
//     const topCardSelectors = [
//       "main .pv-top-card",
//       "main .pv-top-card-v2-ctas",
//       "main .ph5.pb5",
//       "main section.pv-top-card",
//       "main .pv-top-card-profile-picture ~ div",
//       // Modern layouts
//       'main section[data-view-name="profile-card"]',
//       'main div[class*="pvs-profile-actions"]',
//     ];

//     for (const containerSel of topCardSelectors) {
//       const containers = document.querySelectorAll(containerSel);
//       for (const container of containers) {
//         // Skip if inside navbar/global-nav
//         if (container.closest("nav, header, .global-nav")) continue;
//         // Skip if inside recommendations/sidebar
//         if (
//           container.closest(
//             '.artdeco-card:has(h2:has-text("People you may know")), aside, [data-view-name="profile-card"]:not(:first-child)',
//           )
//         )
//           continue;

//         const btns = container.querySelectorAll("button, a");
//         for (const el of btns) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width === 0 || rect.height === 0) continue;
//           if (rect.y < 80) continue; // below navbar
//           if (rect.x > 900) continue; // main content only

//           // ── CRITICAL: Skip if this element is INSIDE a suggested profile card ──
//           // Suggested profile cards have specific containers
//           const suggestedParent = el.closest(
//             '.pvs-list__item--line-separated, .discover-entity-type-card, [data-test-id*="suggestion"], .artdeco-list__item',
//           );
//           if (suggestedParent) {
//             // Check if the suggested card has a DIFFERENT name than our profile
//             const suggestedNameEl = suggestedParent.querySelector(
//               'span[aria-hidden="true"], .discover-person-card__name, a[href*="/in/"] span',
//             );
//             if (suggestedNameEl) {
//               const suggestedName = suggestedNameEl.textContent
//                 .trim()
//                 .toLowerCase();
//               // If suggested card name is different from our profile name, SKIP
//               if (
//                 profileName &&
//                 suggestedName &&
//                 !suggestedName.includes(profileName.split(" ")[0])
//               ) {
//                 continue; // This button belongs to someone else
//               }
//             }
//           }

//           const text = (el.textContent || "").trim();
//           const aria = (el.getAttribute("aria-label") || "").toLowerCase();

//           if (aria === "messaging") continue;

//           const isMessageButton =
//             text === "Message" ||
//             aria === `message ${profileName}` ||
//             aria.startsWith("message ") ||
//             (text.startsWith("Message") && text.length < 20);

//           if (isMessageButton) {
//             // Extra verification: aria-label should either be exactly "Message"
//             // or "Message [profileName]" — NOT "Message [otherName]"
//             if (aria.startsWith("message ")) {
//               const ariaTarget = aria.replace("message ", "").trim();
//               if (
//                 profileName &&
//                 ariaTarget &&
//                 !ariaTarget.includes(profileName.split(" ")[0])
//               ) {
//                 continue; // aria says message someone else
//               }
//             }

//             const href = el.tagName === "A" ? el.getAttribute("href") : null;
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               href: href,
//               method: "top_card_verified",
//               profileName: profileName,
//               tagName: el.tagName,
//               ariaLabel: aria,
//             };
//           }
//         }
//       }
//     }

//     // Fallback: search entire main but with strict aria-label matching
//     if (profileName) {
//       const firstName = profileName.split(" ")[0];
//       const allEls = document.querySelectorAll("main button, main a");

//       for (const el of allEls) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.y < 80) continue;
//         if (rect.x > 900) continue;
//         if (el.closest("nav, header, .global-nav, aside")) continue;

//         const aria = (el.getAttribute("aria-label") || "").toLowerCase();

//         // Only match aria-label that EXPLICITLY names our profile person
//         if (
//           aria === `message ${profileName}` ||
//           (aria.startsWith("message ") && aria.includes(firstName))
//         ) {
//           const href = el.tagName === "A" ? el.getAttribute("href") : null;
//           return {
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             href: href,
//             method: "aria_name_match",
//             profileName: profileName,
//             ariaLabel: aria,
//           };
//         }
//       }
//     }

//     return null;
//   });
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPER: Verify overlay is for the RIGHT person
// // ═══════════════════════════════════════════════════════════════
// async function verifyOverlayRecipient(page, expectedProfileName) {
//   try {
//     return await page.evaluate((expectedName) => {
//       const overlays = document.querySelectorAll(
//         ".msg-overlay-conversation-bubble",
//       );

//       for (const overlay of overlays) {
//         // Skip if closed/collapsed
//         const rect = overlay.getBoundingClientRect();
//         if (rect.width < 100 || rect.height < 100) continue;

//         const headerName = overlay.querySelector(
//           ".msg-overlay-bubble-header__title, h2, .msg-overlay-conversation-bubble-header h2",
//         );

//         if (headerName) {
//           const text = (headerName.textContent || "").trim().toLowerCase();
//           const expected = (expectedName || "").trim().toLowerCase();

//           if (!expected) {
//             return { matches: null, foundName: text };
//           }

//           const firstName = expected.split(" ")[0];
//           if (text.includes(firstName)) {
//             return { matches: true, foundName: text, expected };
//           }
//           return { matches: false, foundName: text, expected };
//         }
//       }
//       return { matches: null, foundName: null, expected: expectedName };
//     }, expectedProfileName);
//   } catch {
//     return { matches: null };
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // CLICK MESSAGE BUTTON
// // ═══════════════════════════════════════════════════════════════
// export async function clickMessageButton(page) {
//   console.log(`   🔎 Locating PROFILE Message button (strict verification)...`);

//   // Close any pre-existing overlays first
//   await closeAllComposeOverlays(page);
//   await randomDelay(800, 1500);

//   // Scroll to top
//   await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
//   await randomDelay(1500, 2500);

//   // Get profile name first
//   const profileName = await getProfileName(page);
//   console.log(`   👤 Profile page belongs to: "${profileName || "UNKNOWN"}"`);

//   if (!profileName) {
//     console.log(`   ⚠️  Could not detect profile name — proceeding cautiously`);
//   }

//   let coords = null;

//   for (let attempt = 1; attempt <= 10; attempt++) {
//     await page.waitForTimeout(1000);

//     coords = await findProfileMessageButton(page);

//     if (coords) {
//       console.log(
//         `   ✅ Found Message button (${coords.method}) at (${coords.x}, ${coords.y}) on attempt ${attempt}`,
//       );
//       console.log(`   🏷️  Aria-label: "${coords.ariaLabel || "N/A"}"`);
//       break;
//     }

//     if (attempt % 3 === 0) {
//       console.log(`   ⏳ Still searching (${attempt}/10)...`);
//       await page.evaluate(() =>
//         window.scrollBy({ top: 100, behavior: "smooth" }),
//       );
//       await randomDelay(800, 1200);
//       await page.evaluate(() =>
//         window.scrollTo({ top: 0, behavior: "smooth" }),
//       );
//       await randomDelay(800, 1200);
//     }
//   }

//   if (!coords) {
//     console.log(`   ❌ Profile Message button not found (may be in sidebar)`);
//     return false;
//   }

//   // ── Click the button ──
//   console.log(`   📜 Scrolling button into view...`);
//   await page.evaluate((btnCoords) => {
//     window.scrollTo({
//       top: Math.max(0, btnCoords.y - window.innerHeight / 2),
//       behavior: "smooth",
//     });
//   }, coords);
//   await randomDelay(1000, 1500);

//   const freshCoords = await findProfileMessageButton(page);
//   if (freshCoords) {
//     coords = freshCoords;
//     console.log(`   📍 Final coords: (${coords.x}, ${coords.y})`);
//   }

//   console.log(`   🖱️  Clicking at (${coords.x}, ${coords.y})...`);
//   await page.mouse.move(
//     coords.x + (Math.random() * 6 - 3),
//     coords.y + (Math.random() * 6 - 3),
//     { steps: 15 },
//   );
//   await randomDelay(200, 400);
//   await page.mouse.click(coords.x, coords.y, {
//     delay: 80 + Math.random() * 120,
//   });
//   await randomDelay(2500, 4000);

//   if (await isInMailPremiumBlocked(page)) {
//     console.log(`   💎 InMail Premium block — dismissing`);
//     await dismissPremiumModal(page);
//     return "premium_blocked";
//   }

//   // ── After click: VERIFY the correct overlay opened ──
//   let composerOpened = await page.evaluate(() => {
//     const el = document.querySelector(
//       '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
//     );
//     return el && el.getBoundingClientRect().width > 0;
//   });

//   console.log(`   📊 After click: composer opened = ${composerOpened}`);

//   if (composerOpened && profileName) {
//     // CRITICAL: Verify overlay is for the RIGHT person
//     await randomDelay(500, 1000);
//     const verify = await verifyOverlayRecipient(page, profileName);

//     if (verify.matches === false) {
//       console.log(
//         `   ❌ WRONG RECIPIENT! Overlay opened for "${verify.foundName}" but expected "${profileName}"`,
//       );
//       console.log(`   🚫 Closing wrong overlay and aborting`);
//       await closeAllComposeOverlays(page);
//       return "wrong_recipient";
//     } else if (verify.matches === true) {
//       console.log(`   ✅ Verified overlay is for correct recipient`);
//       return true;
//     } else {
//       console.log(`   ℹ️  Overlay recipient unclear (proceeding cautiously)`);
//     }
//   }

//   if (!composerOpened) {
//     console.log(`   ❌ Composer did not open`);
//     return false;
//   }

//   return true;
// }

// // ═══════════════════════════════════════════════════════════════
// // CHECK IF EXISTING CONVERSATION — return "already_messaged" if yes
// // ═══════════════════════════════════════════════════════════════
// async function checkForExistingConversation(page, profileName) {
//   if (!profileName) return { exists: false };

//   const check = await hasExistingConversation(page, profileName);
//   if (check.exists && check.hasMessages) {
//     console.log(
//       `   💬 EXISTING conversation found with "${check.headerName}" — already have messages`,
//     );
//     return { exists: true, hasMessages: true };
//   }
//   return check;
// }

// // ═══════════════════════════════════════════════════════════════
// // SEND MESSAGE VIA COMPOSER
// // ═══════════════════════════════════════════════════════════════
// export async function sendMessageViaComposer(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`   ⏳ Waiting for composer...`);

//   let composerReady = false;
//   let composerInfo = null;

//   for (let attempt = 1; attempt <= 25; attempt++) {
//     await page.waitForTimeout(1000);

//     if (attempt === 3 || attempt === 8 || attempt === 15) {
//       if (await isInMailPremiumBlocked(page)) {
//         console.log(`   💎 Premium block during composer wait`);
//         await dismissPremiumModal(page);
//         return { success: false, reason: "premium_required_for_inmail" };
//       }
//     }

//     composerInfo = await page.evaluate(() => {
//       const primary = document.querySelector(".msg-form__contenteditable");
//       if (primary) {
//         const rect = primary.getBoundingClientRect();
//         if (rect.width > 30 && rect.height > 15) {
//           return {
//             found: true,
//             selector: ".msg-form__contenteditable",
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             w: Math.floor(rect.width),
//             h: Math.floor(rect.height),
//             hasSubject: !!document.querySelector(
//               'input.msg-form__subject, input[name="subject"]',
//             ),
//           };
//         }
//       }

//       const fallbacks = [
//         '[contenteditable="true"][role="textbox"]',
//         'div[contenteditable="true"][aria-label*="message" i]',
//         'div[contenteditable="true"][aria-label*="Write" i]',
//         'div[contenteditable="true"][aria-label*="compose" i]',
//       ];

//       for (const sel of fallbacks) {
//         const els = document.querySelectorAll(sel);
//         for (const el of els) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 30 && rect.height > 15) {
//             return {
//               found: true,
//               selector: sel,
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               hasSubject: !!document.querySelector(
//                 'input.msg-form__subject, input[name="subject"]',
//               ),
//             };
//           }
//         }
//       }
//       return { found: false };
//     });

//     if (composerInfo.found) {
//       console.log(
//         `   ✅ Composer ready after ${attempt}s (${composerInfo.w}x${composerInfo.h})`,
//       );
//       console.log(`   📝 Has subject field: ${composerInfo.hasSubject}`);
//       composerReady = true;
//       break;
//     }

//     if (attempt % 5 === 0) {
//       console.log(`   ⏳ Still waiting for composer... ${attempt}/25s`);
//     }
//   }

//   if (!composerReady) {
//     if (await isInMailPremiumBlocked(page)) {
//       await dismissPremiumModal(page);
//       return { success: false, reason: "premium_required_for_inmail" };
//     }
//     return { success: false, reason: "composer_never_appeared" };
//   }

//   await randomDelay(1000, 2000);

//   if (composerInfo.hasSubject && subject && subject.length > 0) {
//     console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
//     await page.evaluate(() => {
//       const f = document.querySelector(
//         'input.msg-form__subject, input[name="subject"]',
//       );
//       if (f) {
//         f.focus();
//         f.click();
//       }
//     });
//     await randomDelay(500, 900);
//     await page.keyboard.press("Control+a");
//     await page.keyboard.press("Delete");
//     await humanTypeText(page, subject);
//     await randomDelay(800, 1500);
//     console.log(`   ✅ Subject filled`);
//   }

//   console.log(`   🖱️  Clicking composer area...`);
//   await humanClick(page, composerInfo.x, composerInfo.y);
//   await randomDelay(800, 1500);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       el.click();
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   await page.keyboard.press("Control+a");
//   await page.keyboard.press("Delete");
//   await randomDelay(300, 600);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       const range = document.createRange();
//       const selection = window.getSelection();
//       range.selectNodeContents(el);
//       range.collapse(false);
//       selection.removeAllRanges();
//       selection.addRange(range);
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
//   await humanTypeText(page, messageText);
//   await randomDelay(1500, 2500);

//   const typedContent = await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     return el ? (el.textContent || "").trim().length : 0;
//   }, composerInfo.selector);

//   console.log(`   📊 Chars in composer: ${typedContent}`);

//   if (typedContent === 0) {
//     console.log(`   ⚠️  Typing failed — using JS insertText fallback...`);
//     await page.evaluate(
//       (data) => {
//         const el = document.querySelector(data.sel);
//         if (!el) return;
//         el.focus();
//         try {
//           document.execCommand("insertText", false, data.text);
//         } catch {}
//         if ((el.textContent || "").trim().length === 0) {
//           el.innerHTML = `<p>${data.text
//             .replace(/</g, "&lt;")
//             .replace(/>/g, "&gt;")}</p>`;
//           el.dispatchEvent(new Event("input", { bubbles: true }));
//         }
//       },
//       { sel: composerInfo.selector, text: messageText },
//     );
//     await randomDelay(1000, 1500);
//   }

//   console.log(`   ✅ Message in composer`);

//   const sendState = await page.evaluate(() => {
//     const sels = [
//       "button.msg-form__send-btn",
//       "button.msg-form__send-button",
//       'button[aria-label="Send message"]',
//       'button[aria-label="Send"]',
//       'button[type="submit"]',
//     ];
//     for (const sel of sels) {
//       const btns = document.querySelectorAll(sel);
//       for (const btn of btns) {
//         const rect = btn.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0) {
//           return {
//             exists: true,
//             selector: sel,
//             disabled: btn.hasAttribute("disabled"),
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//           };
//         }
//       }
//     }
//     return { exists: false };
//   });

//   console.log(
//     `   📊 Send button: exists=${sendState.exists}, disabled=${sendState.disabled}`,
//   );

//   if (await isInMailPremiumBlocked(page)) {
//     await dismissPremiumModal(page);
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   if (actuallySend) {
//     if (!sendState.exists) {
//       return { success: false, reason: "send_button_missing" };
//     }

//     if (sendState.disabled) {
//       console.log(`   ⚠️  Send disabled — nudging composer...`);
//       await page.evaluate((sel) => {
//         const el = document.querySelector(sel);
//         if (el) {
//           el.focus();
//           el.click();
//         }
//       }, composerInfo.selector);
//       await page.keyboard.press("End");
//       await page.keyboard.type(" ");
//       await page.waitForTimeout(400);
//       await page.keyboard.press("Backspace");
//       await page.waitForTimeout(800);
//     }

//     console.log(`   🖱️  Clicking Send...`);
//     await humanClick(page, sendState.x, sendState.y);
//     await randomDelay(3000, 5000);

//     if (await isInMailPremiumBlocked(page)) {
//       await dismissPremiumModal(page);
//       return { success: false, reason: "premium_required_for_inmail" };
//     }

//     console.log(`   ✅ Message SENT!`);

//     // ── Close ALL overlays after send ──
//     await randomDelay(1500, 2500);
//     await closeAllComposeOverlays(page);
//     await randomDelay(1000, 2000);

//     return { success: true, action: "message_sent" };
//   } else {
//     console.log(`   ⚠️  Safe mode — typed but NOT sent`);
//     return { success: true, action: "typed_only" };
//   }
// }

// // ═══════════════════════════════════════════════════════════════
// // MAIN ENTRY POINT
// // ═══════════════════════════════════════════════════════════════
// export async function attemptSendMessage(
//   page,
//   messageText,
//   subject,
//   actuallySend,
//   accountId = "debug",
// ) {
//   console.log(`\n💬 Attempting to send message...`);

//   // Get profile name for verification
//   const profileName = await getProfileName(page);

//   // ── CHECK: Do we already have an active conversation? ──
//   // If yes, we might be re-messaging — need to be careful
//   // (For InMail specifically, LinkedIn allows only 1 InMail per person)

//   const clickResult = await clickMessageButton(page);

//   if (clickResult === "premium_blocked") {
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   if (clickResult === "wrong_recipient") {
//     console.log(`   ❌ Clicked button opened wrong recipient — aborting`);
//     return { success: false, reason: "wrong_recipient" };
//   }

//   if (!clickResult) {
//     return { success: false, reason: "no_message_button" };
//   }

//   await randomDelay(2000, 3500);

//   if (await isInMailPremiumBlocked(page)) {
//     await dismissPremiumModal(page);
//     return { success: false, reason: "premium_required_for_inmail" };
//   }

//   // ── After composer opens, verify overlay recipient ONE more time ──
//   if (profileName) {
//     const verify = await verifyOverlayRecipient(page, profileName);
//     if (verify.matches === false) {
//       console.log(
//         `   ❌ Composer overlay is for "${verify.foundName}" not "${profileName}"`,
//       );
//       await closeAllComposeOverlays(page);
//       return { success: false, reason: "wrong_recipient" };
//     }
//   }

//   return await sendMessageViaComposer(
//     page,
//     messageText,
//     subject,
//     actuallySend,
//     accountId,
//   );
// }

/////////////////////////////////////////////////////////////////////////////

// import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { dismissPremiumModal } from "./premium.service.js";
// import { safeGoto } from "../browser/navigation.service.js";

// export async function clickMessageButton(page) {
//   console.log(`   🔎 Locating Message button on profile...`);

//   let found = false;
//   for (let attempt = 1; attempt <= 15; attempt++) {
//     await page.waitForTimeout(1000);

//     found = await page.evaluate(() => {
//       const messageLinks = document.querySelectorAll('a[href*="/messaging/compose/"]');
//       for (const el of messageLinks) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         el.setAttribute("data-outreach-msg-btn", "true");
//         return true;
//       }

//       const allEls = [
//         ...document.querySelectorAll("button"),
//         ...document.querySelectorAll("a"),
//       ];
//       for (const el of allEls) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;
//         if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
//         const text = (el.textContent || "").trim();
//         const aria = (el.getAttribute("aria-label") || "").toLowerCase();
//         if (text === "Message" || aria === "message" || aria.startsWith("message ")) {
//           el.setAttribute("data-outreach-msg-btn", "true");
//           return true;
//         }
//       }
//       return false;
//     });

//     if (found) {
//       console.log(`   ✅ Message button tagged`);
//       break;
//     }

//     if (attempt % 5 === 0) {
//       console.log(`   ⏳ Still searching... ${attempt}/15s`);
//     }
//   }

//   if (!found) {
//     console.log(`   ❌ Message button not found`);
//     return false;
//   }

//   console.log(`   📜 Scrolling into view...`);
//   await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//   });
//   await randomDelay(1500, 2500);

//   const coords = await page.evaluate(() => {
//     const el = document.querySelector('[data-outreach-msg-btn="true"]');
//     if (!el) return null;
//     const rect = el.getBoundingClientRect();
//     return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//   });

//   if (!coords) return false;

//   console.log(`   🖱️  Clicking at (${coords.x}, ${coords.y})...`);

//   await page.mouse.move(coords.x, coords.y, { steps: 10 });
//   await page.waitForTimeout(300 + Math.random() * 400);
//   await page.mouse.click(coords.x, coords.y, { delay: 80 + Math.random() * 100 });
//   await randomDelay(2500, 4000);

//   let composerOpened = await page.evaluate(() => {
//     const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
//     return el && el.getBoundingClientRect().width > 0;
//   });

//   console.log(`   📊 After mouse click: composer opened = ${composerOpened}`);

//   if (!composerOpened) {
//     console.log(`   🔄 Trying Playwright locator click...`);
//     try {
//       await page.locator('[data-outreach-msg-btn="true"]').first().click({ force: true, timeout: 5000 });
//       await randomDelay(2500, 4000);
//       composerOpened = await page.evaluate(() => {
//         const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
//         return el && el.getBoundingClientRect().width > 0;
//       });
//       console.log(`   📊 After locator click: composer opened = ${composerOpened}`);
//     } catch (err) {
//       console.log(`   ⚠️  Locator click failed: ${err.message}`);
//     }
//   }

//   if (!composerOpened) {
//     console.log(`   🔄 Trying dispatchEvent...`);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-outreach-msg-btn="true"]');
//       if (el) {
//         const rect = el.getBoundingClientRect();
//         const x = rect.x + rect.width / 2;
//         const y = rect.y + rect.height / 2;
//         ["mousedown", "mouseup", "click"].forEach((type) => {
//           el.dispatchEvent(new MouseEvent(type, {
//             view: window, bubbles: true, cancelable: true,
//             clientX: x, clientY: y, button: 0,
//           }));
//         });
//       }
//     });
//     await randomDelay(2500, 4000);

//     composerOpened = await page.evaluate(() => {
//       const el = document.querySelector('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]');
//       return el && el.getBoundingClientRect().width > 0;
//     });
//     console.log(`   📊 After dispatchEvent: composer opened = ${composerOpened}`);
//   }

//   if (!composerOpened) {
//     console.log(`   🔄 Navigating to messaging URL...`);
//     const messagingUrl = await page.evaluate(() => {
//       const el = document.querySelector('[data-outreach-msg-btn="true"]');
//       if (!el) return null;
//       if (el.tagName === "A" && el.getAttribute("href")) return el.getAttribute("href");
//       let current = el;
//       for (let i = 0; i < 5; i++) {
//         if (current.parentElement) {
//           current = current.parentElement;
//           if (current.tagName === "A" && current.getAttribute("href")) return current.getAttribute("href");
//         } else break;
//       }
//       return null;
//     });

//     if (messagingUrl) {
//       const fullUrl = messagingUrl.startsWith("/") ? "https://www.linkedin.com" + messagingUrl : messagingUrl;
//       console.log(`   🔗 Navigating to: ${fullUrl}`);
//       await safeGoto(page, fullUrl);
//       await randomDelay(3000, 5000);
//     }
//   }

//   return true;
// }

// export async function sendMessageViaComposer(page, messageText, subject, actuallySend, accountId = "debug") {
//   console.log(`   ⏳ Waiting for composer...`);

//   let composerReady = false;
//   let composerInfo = null;

//   for (let attempt = 1; attempt <= 25; attempt++) {
//     await page.waitForTimeout(1000);

//     if (attempt === 3 || attempt === 8 || attempt === 15) {
//       await dismissPremiumModal(page);
//     }

//     composerInfo = await page.evaluate(() => {
//       const primary = document.querySelector(".msg-form__contenteditable");
//       if (primary) {
//         const rect = primary.getBoundingClientRect();
//         if (rect.width > 30 && rect.height > 15) {
//           return {
//             found: true,
//             selector: ".msg-form__contenteditable",
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             w: Math.floor(rect.width),
//             h: Math.floor(rect.height),
//             hasSubject: !!document.querySelector('input.msg-form__subject, input[name="subject"]'),
//           };
//         }
//       }

//       const fallbacks = [
//         '[contenteditable="true"][role="textbox"]',
//         'div[contenteditable="true"][aria-label*="message" i]',
//         'div[contenteditable="true"][aria-label*="Write" i]',
//       ];

//       for (const sel of fallbacks) {
//         const els = document.querySelectorAll(sel);
//         for (const el of els) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 30 && rect.height > 15) {
//             return {
//               found: true,
//               selector: sel,
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               hasSubject: !!document.querySelector('input.msg-form__subject, input[name="subject"]'),
//             };
//           }
//         }
//       }
//       return { found: false };
//     });

//     if (composerInfo.found) {
//       console.log(`   ✅ Composer ready after ${attempt}s (${composerInfo.w}x${composerInfo.h})`);
//       console.log(`   📝 Has subject: ${composerInfo.hasSubject}`);
//       composerReady = true;
//       break;
//     }

//     if (attempt % 5 === 0) {
//       console.log(`   ⏳ Still waiting... ${attempt}/25s`);
//       try {
//         await page.screenshot({ path: `./profiles/${accountId}/debug-composer-${attempt}.png` });
//       } catch {}
//     }
//   }

//   if (!composerReady) {
//     if (await dismissPremiumModal(page)) {
//       return { success: false, reason: "premium_required_for_inmail" };
//     }
//     return { success: false, reason: "composer_never_appeared" };
//   }

//   await randomDelay(1000, 2000);

//   // Fill subject
//   if (composerInfo.hasSubject && subject && subject.length > 0) {
//     console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
//     await page.evaluate(() => {
//       const f = document.querySelector('input.msg-form__subject, input[name="subject"]');
//       if (f) { f.focus(); f.click(); }
//     });
//     await randomDelay(500, 900);
//     await page.keyboard.press("Control+a");
//     await page.keyboard.press("Delete");
//     await humanTypeText(page, subject);
//     await randomDelay(800, 1500);
//     console.log(`   ✅ Subject filled`);
//   }

//   // Click composer
//   console.log(`   🖱️  Clicking composer...`);
//   await humanClick(page, composerInfo.x, composerInfo.y);
//   await randomDelay(800, 1500);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) { el.focus(); el.click(); }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   await page.keyboard.press("Control+a");
//   await page.keyboard.press("Delete");
//   await randomDelay(300, 600);

//   await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     if (el) {
//       el.focus();
//       const range = document.createRange();
//       const selection = window.getSelection();
//       range.selectNodeContents(el);
//       range.collapse(false);
//       selection.removeAllRanges();
//       selection.addRange(range);
//     }
//   }, composerInfo.selector);
//   await randomDelay(400, 800);

//   console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
//   await humanTypeText(page, messageText);
//   await randomDelay(1500, 2500);

//   const typedContent = await page.evaluate((sel) => {
//     const el = document.querySelector(sel);
//     return el ? (el.textContent || "").trim().length : 0;
//   }, composerInfo.selector);

//   console.log(`   📊 Chars typed: ${typedContent}`);

//   if (typedContent === 0) {
//     console.log(`   ⚠️  JS insertText fallback...`);
//     await page.evaluate((data) => {
//       const el = document.querySelector(data.sel);
//       if (!el) return;
//       el.focus();
//       try { document.execCommand("insertText", false, data.text); } catch {}
//       if ((el.textContent || "").trim().length === 0) {
//         el.innerHTML = `<p>${data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
//         el.dispatchEvent(new Event("input", { bubbles: true }));
//       }
//     }, { sel: composerInfo.selector, text: messageText });
//     await randomDelay(1000, 1500);
//   }

//   console.log(`   ✅ Message in composer`);

//   const sendState = await page.evaluate(() => {
//     const sels = [
//       "button.msg-form__send-btn",
//       "button.msg-form__send-button",
//       'button[aria-label="Send message"]',
//     ];
//     for (const sel of sels) {
//       const btns = document.querySelectorAll(sel);
//       for (const btn of btns) {
//         const rect = btn.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0) {
//           return {
//             exists: true, selector: sel,
//             disabled: btn.hasAttribute("disabled"),
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//           };
//         }
//       }
//     }
//     return { exists: false };
//   });

//   console.log(`   📊 Send btn: exists=${sendState.exists}, disabled=${sendState.disabled}`);

//   if (actuallySend) {
//     if (!sendState.exists) return { success: false, reason: "send_button_missing" };

//     if (sendState.disabled) {
//       await page.evaluate((sel) => {
//         const el = document.querySelector(sel);
//         if (el) { el.focus(); el.click(); }
//       }, composerInfo.selector);
//       await page.keyboard.press("End");
//       await page.keyboard.type(" ");
//       await page.waitForTimeout(400);
//       await page.keyboard.press("Backspace");
//       await page.waitForTimeout(800);
//     }

//     console.log(`   🖱️  Clicking send...`);
//     await humanClick(page, sendState.x, sendState.y);
//     await randomDelay(3000, 5000);

//     if (await dismissPremiumModal(page)) {
//       return { success: false, reason: "premium_required_for_inmail" };
//     }

//     console.log(`   ✅ Message SENT!`);
//     return { success: true, action: "message_sent" };
//   } else {
//     console.log(`   ⚠️  Safe mode — typed but NOT sent`);
//     return { success: true, action: "typed_only" };
//   }
// }

// export async function attemptSendMessage(page, messageText, subject, actuallySend, accountId = "debug") {
//   console.log(`\n💬 Attempting to send message...`);

//   const clicked = await clickMessageButton(page);
//   if (!clicked) return { success: false, reason: "no_message_button" };

//   await randomDelay(2000, 3500);
//   await dismissPremiumModal(page);

//   return await sendMessageViaComposer(page, messageText, subject, actuallySend, accountId);
// }

import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import {
  dismissPremiumModal,
  detectPremiumModalType,
} from "./premium.service.js";
import { safeGoto } from "../browser/navigation.service.js";
import SELECTORS from "../../config/selectors.js";

// ═══════════════════════════════════════════════════════════════
// HELPER: Detect Premium/InMail block modal (legacy fallback)
// Uses SELECTORS.premium.modalTextPatterns
// ═══════════════════════════════════════════════════════════════
async function isInMailPremiumBlocked(page) {
  const type = await detectPremiumModalType(page);
  return type !== null;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Close ALL compose overlays
// ═══════════════════════════════════════════════════════════════
async function closeAllComposeOverlays(page) {
  try {
    await page.evaluate(() => {
      const closeBtns = document.querySelectorAll(
        'button[data-control-name="overlay.close_conversation_window"], ' +
          "button.msg-overlay-bubble-header__control--close, " +
          '.msg-overlay-conversation-bubble button[aria-label*="Close" i], ' +
          '.msg-overlay-list-bubble button[aria-label*="Close" i]',
      );
      closeBtns.forEach((btn) => {
        try {
          btn.click();
        } catch {}
      });
    });
    await page.waitForTimeout(800);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get profile name from page
// ═══════════════════════════════════════════════════════════════
async function getProfileName(page) {
  try {
    return await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    }, SELECTORS.profile.personName);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT person-specific compose URL from profile page
// ═══════════════════════════════════════════════════════════════
async function extractComposeUrl(page) {
  return await page.evaluate(() => {
    // Strategy 1: Find any <a> with href containing /messaging/compose/ AND profileUrn
    const composeLinks = document.querySelectorAll(
      'a[href*="/messaging/compose/"]',
    );
    for (const link of composeLinks) {
      const href = link.getAttribute("href") || "";
      if (href.includes("profileUrn") || href.includes("recipient")) {
        return href.startsWith("/") ? "https://www.linkedin.com" + href : href;
      }
    }

    // Strategy 2: Extract profileUrn from page source and build URL manually
    const profileUrnSources = [
      () => {
        const el = document.querySelector("[data-member-id]");
        return el ? el.getAttribute("data-member-id") : null;
      },
      () => {
        const scripts = document.querySelectorAll('code[id*="bpr-guid"]');
        for (const script of scripts) {
          const text = script.textContent || "";
          const match = text.match(/"publicIdentifier":"([^"]+)"/);
          if (match) return match[1];
        }
        return null;
      },
      () => {
        const allLinks = document.querySelectorAll('a[href*="profileUrn"]');
        for (const link of allLinks) {
          const href = link.getAttribute("href") || "";
          const urnMatch = href.match(/profileUrn=([^&]+)/);
          if (urnMatch) return decodeURIComponent(urnMatch[1]);
        }
        return null;
      },
      () => {
        const actionBtns = document.querySelectorAll(
          "main button[data-control-name], main a[data-control-name]",
        );
        for (const btn of actionBtns) {
          const urn =
            btn.getAttribute("data-urn") || btn.getAttribute("data-entity-urn");
          if (urn && urn.includes("fsd_profile")) return urn;
        }
        return null;
      },
    ];

    for (const extractFn of profileUrnSources) {
      try {
        const urn = extractFn();
        if (urn && urn.includes("fsd_profile")) {
          const encodedUrn = encodeURIComponent(urn);
          return `https://www.linkedin.com/messaging/compose/?profileUrn=${encodedUrn}&recipient=${encodedUrn}`;
        }
      } catch {}
    }

    return null;
  });
}

// ═══════════════════════════════════════════════════════════════
// OPEN COMPOSE — Navigate directly to compose URL
// Returns: true | false | "premium_blocked" | "wrong_recipient"
// ═══════════════════════════════════════════════════════════════
export async function openComposeForProfile(page) {
  console.log(`   🔎 Extracting compose URL from profile page...`);

  const profileName = await getProfileName(page);
  console.log(`   👤 Profile: "${profileName || "UNKNOWN"}"`);

  await closeAllComposeOverlays(page);
  await randomDelay(500, 1000);

  let composeUrl = await extractComposeUrl(page);

  if (!composeUrl) {
    console.log(
      `   ⚠️  No compose URL found in page — trying scroll + retry...`,
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await randomDelay(2000, 3000);
    composeUrl = await extractComposeUrl(page);
  }

  if (!composeUrl) {
    console.log(`   ❌ Could not extract compose URL for this profile`);
    return false;
  }

  console.log(`   🔗 Compose URL: ${composeUrl.substring(0, 100)}...`);

  await closeAllComposeOverlays(page);
  await randomDelay(500, 800);

  console.log(`   🌐 Navigating to compose page...`);
  await safeGoto(page, composeUrl);
  await randomDelay(3000, 5000);

  // ── CRITICAL: Check for Premium block FIRST ──
  // "Boost your career with Premium" popup appears when
  // free-tier user has no InMail credits
  const modalType = await detectPremiumModalType(page);
  if (modalType === "inmail_limit") {
    console.log(
      `   💎 InMail limit popup detected ("Boost your career with Premium")`,
    );
    console.log(`   🚪 Dismissing popup...`);
    await dismissPremiumModal(page);
    return "premium_blocked";
  }
  if (modalType === "generic") {
    console.log(`   💎 Generic premium block — dismissing`);
    await dismissPremiumModal(page);
    return "premium_blocked";
  }

  // Verify composer opened
  let composerOpened = await page.evaluate(() => {
    const el = document.querySelector(
      '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
    );
    return el && el.getBoundingClientRect().width > 0;
  });

  if (!composerOpened) {
    console.log(`   ⚠️  Composer did not open after navigation`);
    await randomDelay(3000, 5000);

    // Check again for premium modal (might appear late)
    const lateModal = await detectPremiumModalType(page);
    if (lateModal) {
      console.log(`   💎 Late premium block detected (${lateModal})`);
      await dismissPremiumModal(page);
      return "premium_blocked";
    }

    composerOpened = await page.evaluate(() => {
      const el = document.querySelector(
        '.msg-form__contenteditable, [contenteditable="true"][role="textbox"]',
      );
      return el && el.getBoundingClientRect().width > 0;
    });

    if (!composerOpened) {
      console.log(`   ❌ Composer still not available`);
      return false;
    }
  }

  // Verify recipient
  if (profileName) {
    const recipientCheck = await page.evaluate((expectedName) => {
      const headers = document.querySelectorAll(
        ".msg-overlay-bubble-header__title, " +
          ".msg-compose-form h2, " +
          ".msg-entity-lockup__entity-title, " +
          ".msg-overlay-conversation-bubble h2",
      );

      for (const h of headers) {
        const text = (h.textContent || "").trim().toLowerCase();
        const expected = (expectedName || "").trim().toLowerCase();
        const firstName = expected.split(" ")[0];

        if (firstName && text.includes(firstName)) {
          return { verified: true, foundName: text };
        }
      }

      const url = window.location.href;
      if (url.includes("profileUrn") || url.includes("recipient")) {
        return { verified: null, foundName: "URL-based (cannot verify name)" };
      }

      return { verified: null, foundName: null };
    }, profileName);

    if (recipientCheck.verified === true) {
      console.log(
        `   ✅ Verified: compose is for "${recipientCheck.foundName}"`,
      );
    } else if (recipientCheck.verified === false) {
      console.log(
        `   ❌ WRONG recipient: "${recipientCheck.foundName}" — aborting`,
      );
      await closeAllComposeOverlays(page);
      return "wrong_recipient";
    } else {
      console.log(
        `   ℹ️  Recipient verification inconclusive (URL-based, proceeding)`,
      );
    }
  }

  console.log(`   ✅ Composer ready — correct recipient`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// SEND MESSAGE VIA COMPOSER
// ═══════════════════════════════════════════════════════════════
export async function sendMessageViaComposer(
  page,
  messageText,
  subject,
  actuallySend,
  accountId = "debug",
) {
  console.log(`   ⏳ Waiting for composer...`);

  let composerReady = false;
  let composerInfo = null;

  for (let attempt = 1; attempt <= 25; attempt++) {
    await page.waitForTimeout(1000);

    // Periodic premium check
    if (attempt === 3 || attempt === 8 || attempt === 15) {
      const modalType = await detectPremiumModalType(page);
      if (modalType === "inmail_limit" || modalType === "generic") {
        console.log(`   💎 Premium block during composer wait (${modalType})`);
        await dismissPremiumModal(page);
        return { success: false, reason: "premium_required_for_inmail" };
      }
    }

    composerInfo = await page.evaluate(() => {
      const primary = document.querySelector(".msg-form__contenteditable");
      if (primary) {
        const rect = primary.getBoundingClientRect();
        if (rect.width > 30 && rect.height > 15) {
          return {
            found: true,
            selector: ".msg-form__contenteditable",
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
            w: Math.floor(rect.width),
            h: Math.floor(rect.height),
            hasSubject: !!document.querySelector(
              'input.msg-form__subject, input[name="subject"]',
            ),
          };
        }
      }

      const fallbacks = [
        '[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"][aria-label*="Write" i]',
        'div[contenteditable="true"][aria-label*="compose" i]',
      ];

      for (const sel of fallbacks) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 30 && rect.height > 15) {
            return {
              found: true,
              selector: sel,
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              w: Math.floor(rect.width),
              h: Math.floor(rect.height),
              hasSubject: !!document.querySelector(
                'input.msg-form__subject, input[name="subject"]',
              ),
            };
          }
        }
      }
      return { found: false };
    });

    if (composerInfo.found) {
      console.log(
        `   ✅ Composer ready after ${attempt}s (${composerInfo.w}x${composerInfo.h})`,
      );
      console.log(`   📝 Has subject field: ${composerInfo.hasSubject}`);
      composerReady = true;
      break;
    }

    if (attempt % 5 === 0) {
      console.log(`   ⏳ Still waiting for composer... ${attempt}/25s`);
    }
  }

  if (!composerReady) {
    // Final premium check before giving up
    const modalType = await detectPremiumModalType(page);
    if (modalType) {
      await dismissPremiumModal(page);
      return { success: false, reason: "premium_required_for_inmail" };
    }
    return { success: false, reason: "composer_never_appeared" };
  }

  await randomDelay(1000, 2000);

  // Fill subject
  if (composerInfo.hasSubject && subject && subject.length > 0) {
    console.log(`   ✍️  Filling subject: "${subject.substring(0, 60)}"`);
    await page.evaluate(() => {
      const f = document.querySelector(
        'input.msg-form__subject, input[name="subject"]',
      );
      if (f) {
        f.focus();
        f.click();
      }
    });
    await randomDelay(500, 900);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await humanTypeText(page, subject);
    await randomDelay(800, 1500);
    console.log(`   ✅ Subject filled`);
  }

  // Click composer
  console.log(`   🖱️  Clicking composer area...`);
  await humanClick(page, composerInfo.x, composerInfo.y);
  await randomDelay(800, 1500);

  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      el.click();
    }
  }, composerInfo.selector);
  await randomDelay(400, 800);

  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await randomDelay(300, 600);

  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, composerInfo.selector);
  await randomDelay(400, 800);

  console.log(`   ⌨️  Typing message (${messageText.length} chars)...`);
  await humanTypeText(page, messageText);
  await randomDelay(1500, 2500);

  const typedContent = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? (el.textContent || "").trim().length : 0;
  }, composerInfo.selector);

  console.log(`   📊 Chars in composer: ${typedContent}`);

  if (typedContent === 0) {
    console.log(`   ⚠️  Typing failed — using JS insertText fallback...`);
    await page.evaluate(
      (data) => {
        const el = document.querySelector(data.sel);
        if (!el) return;
        el.focus();
        try {
          document.execCommand("insertText", false, data.text);
        } catch {}
        if ((el.textContent || "").trim().length === 0) {
          el.innerHTML = `<p>${data.text
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</p>`;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
      { sel: composerInfo.selector, text: messageText },
    );
    await randomDelay(1000, 1500);
  }

  console.log(`   ✅ Message in composer`);

  const sendState = await page.evaluate(() => {
    const sels = [
      "button.msg-form__send-btn",
      "button.msg-form__send-button",
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[type="submit"]',
    ];
    for (const sel of sels) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            exists: true,
            selector: sel,
            disabled: btn.hasAttribute("disabled"),
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    return { exists: false };
  });

  console.log(
    `   📊 Send button: exists=${sendState.exists}, disabled=${sendState.disabled}`,
  );

  // Premium check before send
  const preModalType = await detectPremiumModalType(page);
  if (preModalType) {
    await dismissPremiumModal(page);
    return { success: false, reason: "premium_required_for_inmail" };
  }

  if (actuallySend) {
    if (!sendState.exists) {
      return { success: false, reason: "send_button_missing" };
    }

    if (sendState.disabled) {
      console.log(`   ⚠️  Send disabled — nudging composer...`);
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.focus();
          el.click();
        }
      }, composerInfo.selector);
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await page.waitForTimeout(400);
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(800);
    }

    console.log(`   🖱️  Clicking Send...`);
    await humanClick(page, sendState.x, sendState.y);
    await randomDelay(3000, 5000);

    // Post-send premium check
    const postModalType = await detectPremiumModalType(page);
    if (postModalType) {
      console.log(`   💎 Premium popup after send (${postModalType})`);
      await dismissPremiumModal(page);
      return { success: false, reason: "premium_required_for_inmail" };
    }

    console.log(`   ✅ Message SENT!`);

    // Close all overlays
    await randomDelay(1500, 2500);
    await closeAllComposeOverlays(page);
    await randomDelay(1000, 2000);

    return { success: true, action: "message_sent" };
  } else {
    console.log(`   ⚠️  Safe mode — typed but NOT sent`);
    return { success: true, action: "typed_only" };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════
export async function attemptSendMessage(
  page,
  messageText,
  subject,
  actuallySend,
  accountId = "debug",
) {
  console.log(`\n💬 Attempting to send message...`);

  const openResult = await openComposeForProfile(page);

  if (openResult === "premium_blocked") {
    return { success: false, reason: "premium_required_for_inmail" };
  }

  if (openResult === "wrong_recipient") {
    return { success: false, reason: "wrong_recipient" };
  }

  if (!openResult) {
    return { success: false, reason: "no_message_button" };
  }

  await randomDelay(2000, 3500);

  // Final premium check before composer flow
  const modalType = await detectPremiumModalType(page);
  if (modalType) {
    console.log(`   💎 Premium block detected before composer (${modalType})`);
    await dismissPremiumModal(page);
    return { success: false, reason: "premium_required_for_inmail" };
  }

  return await sendMessageViaComposer(
    page,
    messageText,
    subject,
    actuallySend,
    accountId,
  );
}
