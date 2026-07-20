// import {
//   humanClick,
//   humanTypeText,
//   humanMove,
// } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import {
//   scrollPostElementIntoView,
//   scrollToElementAndGetCoords,
// } from "../../helpers/scroll.helper.js";
// import SELECTORS from "../../config/selectors.js";

// async function fullCleanup(page) {
//   try {
//     await page.evaluate(() => {
//       document.querySelectorAll("[data-active-comment-box]").forEach((el) => {
//         el.removeAttribute("data-active-comment-box");
//       });
//       document.querySelectorAll("[data-reply-box]").forEach((el) => {
//         el.removeAttribute("data-reply-box");
//       });
//       document.querySelectorAll("[data-target-reply-btn]").forEach((el) => {
//         el.removeAttribute("data-target-reply-btn");
//       });
//       document.querySelectorAll("[data-old-editor]").forEach((el) => {
//         el.removeAttribute("data-old-editor");
//       });
//       document.querySelectorAll("[data-active-submit]").forEach((el) => {
//         el.removeAttribute("data-active-submit");
//       });
//       document.querySelectorAll("[data-active-reply-box]").forEach((el) => {
//         el.removeAttribute("data-active-reply-box");
//       });
//     });
//   } catch {}
// }

// export async function copyPostLink(page, postIndex) {
//   console.log(`   🔗 Copying post link...`);
//   await fullCleanup(page);

//   try {
//     const menuCoords = await scrollPostElementIntoView(
//       page,
//       postIndex,
//       SELECTORS.postCard.threeDotMenu[0],
//     );

//     let finalMenuCoords = menuCoords;
//     if (!finalMenuCoords) {
//       for (let i = 1; i < SELECTORS.postCard.threeDotMenu.length; i++) {
//         finalMenuCoords = await scrollPostElementIntoView(
//           page,
//           postIndex,
//           SELECTORS.postCard.threeDotMenu[i],
//         );
//         if (finalMenuCoords) break;
//       }
//     }

//     if (!finalMenuCoords) {
//       console.log(`   ⚠️  3-dot menu not found`);
//       return null;
//     }

//     console.log(
//       `   🖱️  Clicking 3-dot at (${finalMenuCoords.x}, ${finalMenuCoords.y})...`,
//     );
//     await humanMove(page, finalMenuCoords.x, finalMenuCoords.y);
//     await randomDelay(400, 800);
//     await humanClick(page, finalMenuCoords.x, finalMenuCoords.y);
//     await randomDelay(2500, 4000);

//     let dropdownReady = false;
//     for (let i = 0; i < 15; i++) {
//       await page.waitForTimeout(500);
//       const has = await page.evaluate((sel) => {
//         const items = document.querySelectorAll(sel);
//         for (const item of items) {
//           if ((item.textContent || "").toLowerCase().includes("copy link"))
//             return true;
//         }
//         return false;
//       }, SELECTORS.postDropdown.menuItem);
//       if (has) {
//         dropdownReady = true;
//         break;
//       }
//     }

//     if (!dropdownReady) {
//       console.log(`   🔄 Retrying 3-dot with JS click...`);
//       await page.evaluate(
//         (data) => {
//           const container = document.querySelector(
//             `[data-post-index="${data.idx}"]`,
//           );
//           if (!container) return;
//           for (const sel of data.selectors) {
//             const btn = container.querySelector(sel);
//             if (btn) {
//               btn.click();
//               return;
//             }
//           }
//         },
//         { idx: postIndex, selectors: SELECTORS.postCard.threeDotMenu },
//       );
//       await randomDelay(2500, 4000);

//       for (let i = 0; i < 10; i++) {
//         await page.waitForTimeout(500);
//         const has = await page.evaluate((sel) => {
//           const items = document.querySelectorAll(sel);
//           for (const item of items) {
//             if ((item.textContent || "").toLowerCase().includes("copy link"))
//               return true;
//           }
//           return false;
//         }, SELECTORS.postDropdown.menuItem);
//         if (has) {
//           dropdownReady = true;
//           break;
//         }
//       }
//     }

//     if (!dropdownReady) {
//       console.log(`   ⚠️  Dropdown didn't appear`);
//       await page.keyboard.press("Escape");
//       await randomDelay(1000, 2000);
//       return null;
//     }

//     const copyCoords = await page.evaluate((sel) => {
//       const items = document.querySelectorAll(sel);
//       for (const item of items) {
//         if ((item.textContent || "").toLowerCase().includes("copy link")) {
//           const rect = item.getBoundingClientRect();
//           return {
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//           };
//         }
//       }
//       return null;
//     }, SELECTORS.postDropdown.menuItem);

//     if (!copyCoords) {
//       await page.keyboard.press("Escape");
//       return null;
//     }

//     console.log(`   🖱️  Clicking "Copy link"...`);
//     await humanClick(page, copyCoords.x, copyCoords.y);
//     await randomDelay(2500, 4000);

//     let postUrl = null;
//     try {
//       postUrl = await page.evaluate(async () => {
//         try {
//           return await navigator.clipboard.readText();
//         } catch {
//           return null;
//         }
//       });
//     } catch {}

//     if (postUrl) console.log(`   ✅ URL: ${postUrl.substring(0, 80)}`);
//     else console.log(`   ⚠️  Clipboard empty`);

//     await page.keyboard.press("Escape");
//     await randomDelay(1000, 2000);
//     return postUrl;
//   } catch (err) {
//     console.log(`   ❌ Copy link error: ${err.message}`);
//     return null;
//   }
// }

// /**
//  * Comment on post — with STRICT submit button binding
//  *
//  * KEY FIX: Submit button must be:
//  * 1. componentkey containing "commentButtonSection"
//  * 2. Text = "Comment"
//  * 3. Not disabled
//  * 4. In the SAME parent form as our active editor
//  * 5. BELOW our editor's y-position (submit is always below textbox)
//  * 6. Within reasonable distance from editor (< 300px vertical)
//  */
// // export async function commentOnPost(
// //   page,
// //   postIndex,
// //   commentText,
// //   actuallySend = false,
// // ) {
// //   console.log(`   💬 Adding inline comment...`);
// //   await fullCleanup(page);

// //   try {
// //     // ── STEP 1: Mark existing editors as "old" ──
// //     const editorsBefore = await page.evaluate(() => {
// //       const editors = document.querySelectorAll(
// //         'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
// //       );
// //       editors.forEach((el) => el.setAttribute("data-old-editor", "true"));
// //       return editors.length;
// //     });
// //     console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

// //     // ── STEP 2: Find Comment button ──
// //     const commentBtnCoords = await scrollPostElementIntoView(
// //       page,
// //       postIndex,
// //       'button[aria-label="Comment"]',
// //     );

// //     if (!commentBtnCoords) {
// //       console.log(`   ⚠️  Comment button not found for post ${postIndex}`);
// //       await fullCleanup(page);
// //       return { success: false, reason: "no_comment_button" };
// //     }

// //     console.log(
// //       `   🖱️  Clicking Comment at (${commentBtnCoords.x}, ${commentBtnCoords.y})...`,
// //     );
// //     await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
// //     await randomDelay(300, 600);
// //     await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
// //     await randomDelay(2000, 3500);

// //     // ── STEP 3: Wait for NEW editor ──
// //     console.log(`   ⏳ Waiting for NEW editor...`);
// //     let editorInfo = null;

// //     // ✅ FIX: moved the progress log INSIDE the for loop
// //     for (let i = 0; i < 25; i++) {
// //       await page.waitForTimeout(800);
// //       editorInfo = await page.evaluate(() => {
// //         const editors = document.querySelectorAll(
// //           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
// //         );
// //         for (const editor of editors) {
// //           if (editor.hasAttribute("data-old-editor")) continue;
// //           const rect = editor.getBoundingClientRect();
// //           if (rect.width > 50) {
// //             editor.setAttribute("data-active-comment-box", "true");
// //             return {
// //               x: Math.floor(rect.x + rect.width / 2),
// //               y: Math.floor(rect.y + rect.height / 2),
// //               w: Math.floor(rect.width),
// //               h: Math.floor(rect.height),
// //               rawY: Math.floor(rect.y),
// //               inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
// //             };
// //           }
// //         }
// //         return null;
// //       });

// //       if (editorInfo) {
// //         console.log(
// //           `   ✅ NEW editor found (${editorInfo.w}x${editorInfo.h}) at y=${editorInfo.rawY}`,
// //         );
// //         break;
// //       }

// //       // ✅ FIX: this line is now INSIDE the for loop (i is in scope here)
// //       if (i > 0 && i % 5 === 0) {
// //         console.log(`   ⏳ Still waiting for editor... (${i}/25)`);
// //       }
// //     }

// //     if (!editorInfo) {
// //       console.log(`   🔄 Retrying Comment click via JS...`);
// //       await page.evaluate((idx) => {
// //         const container = document.querySelector(`[data-post-index="${idx}"]`);
// //         if (!container) return;
// //         const btn = container.querySelector('button[aria-label="Comment"]');
// //         if (btn) {
// //           btn.scrollIntoView({ block: "center" });
// //           btn.click();
// //         }
// //       }, postIndex);
// //       await randomDelay(2500, 4000);

// //       editorInfo = await page.evaluate(() => {
// //         const editors = document.querySelectorAll(
// //           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
// //         );
// //         for (const editor of editors) {
// //           if (editor.hasAttribute("data-old-editor")) continue;
// //           const rect = editor.getBoundingClientRect();
// //           if (rect.width < 50) continue;
// //           editor.setAttribute("data-active-comment-box", "true");
// //           return {
// //             x: Math.floor(rect.x + rect.width / 2),
// //             y: Math.floor(rect.y + rect.height / 2),
// //             rawY: Math.floor(rect.y),
// //             inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
// //           };
// //         }
// //         return null;
// //       });

// //       if (!editorInfo) {
// //         console.log(`   ❌ No NEW editor`);
// //         await fullCleanup(page);
// //         return { success: false, reason: "no_new_editor" };
// //       }
// //     }

// //     // ── STEP 4: Scroll editor into view ──
// //     if (!editorInfo.inViewport) {
// //       console.log(`   📜 Scrolling editor into view...`);
// //       const fresh = await scrollToElementAndGetCoords(
// //         page,
// //         '[data-active-comment-box="true"]',
// //       );
// //       if (fresh) editorInfo = { ...editorInfo, ...fresh, rawY: fresh.y };
// //     }

// //     // ── STEP 5: Click + focus editor ──
// //     console.log(
// //       `   🖱️  Clicking editor at (${editorInfo.x}, ${editorInfo.y})...`,
// //     );
// //     await humanMove(page, editorInfo.x, editorInfo.y);
// //     await randomDelay(300, 600);
// //     await humanClick(page, editorInfo.x, editorInfo.y);
// //     await randomDelay(800, 1500);

// //     await page.evaluate(() => {
// //       const el = document.querySelector('[data-active-comment-box="true"]');
// //       if (el) {
// //         el.focus();
// //         el.click();
// //       }
// //     });
// //     await randomDelay(500, 1000);

// //     const focusOk = await page.evaluate(() => {
// //       const target = document.querySelector('[data-active-comment-box="true"]');
// //       return document.activeElement === target;
// //     });
// //     console.log(`   📊 Focus: ${focusOk ? "✅" : "❌"}`);

// //     // ── STEP 6: Type comment ──
// //     console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
// //     await humanTypeText(page, commentText);
// //     await randomDelay(2000, 3500);

// //     const typedLen = await page.evaluate(() => {
// //       const el = document.querySelector('[data-active-comment-box="true"]');
// //       return el ? (el.textContent || "").trim().length : 0;
// //     });
// //     console.log(`   📊 Typed: ${typedLen} chars`);

// //     if (typedLen === 0) {
// //       console.log(`   ⚠️  JS fallback typing...`);
// //       await page.evaluate((text) => {
// //         const el = document.querySelector('[data-active-comment-box="true"]');
// //         if (!el) return;
// //         el.focus();
// //         try {
// //           document.execCommand("insertText", false, text);
// //         } catch {}
// //         if ((el.textContent || "").trim().length === 0) {
// //           el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
// //           el.dispatchEvent(new Event("input", { bubbles: true }));
// //         }
// //       }, commentText);
// //       await randomDelay(1000, 1500);
// //     }

// //     if (!actuallySend) {
// //       console.log(`   ⚠️  Safe mode — NOT posted`);
// //       await page.keyboard.press("Control+a");
// //       await page.keyboard.press("Delete");
// //       await page.keyboard.press("Escape");
// //       await randomDelay(1000, 2000);
// //       await fullCleanup(page);
// //       return { success: true, action: "typed_only" };
// //     }

// //     // ═══════════════════════════════════════════════════════════
// //     // STEP 7: Find submit button — CRITICAL FIX
// //     // ═══════════════════════════════════════════════════════════
// //     // Submit button MUST be:
// //     // - In the same immediate form/container as our editor
// //     // - BELOW our editor's y-position (submit is always below textbox)
// //     // - Within 300px vertical distance from editor
// //     // - Not disabled
// //     // - Text = "Comment" or "Post" or "Reply"
// //     // ═══════════════════════════════════════════════════════════

// //     console.log(
// //       `   🔍 Finding correct submit button (must be below editor)...`,
// //     );
// //     await randomDelay(1500, 2500);

// //     const submitInfo = await page.evaluate(() => {
// //       const editor = document.querySelector('[data-active-comment-box="true"]');
// //       if (!editor) return { error: "no_editor" };

// //       const editorRect = editor.getBoundingClientRect();
// //       const editorY = editorRect.y + editorRect.height / 2;

// //       // ═══ METHOD 1: Find the immediate FORM containing our editor ═══
// //       // LinkedIn wraps each comment composer in a <form> or dedicated container
// //       let form = editor.closest("form");
// //       if (!form) {
// //         // Try to find the composer wrapper (walk up looking for a container that has ONLY our editor)
// //         let candidate = editor.parentElement;
// //         for (let i = 0; i < 8; i++) {
// //           if (!candidate) break;
// //           const editorsInCandidate = candidate.querySelectorAll(
// //             'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
// //           );
// //           if (
// //             editorsInCandidate.length === 1 &&
// //             editorsInCandidate[0] === editor
// //           ) {
// //             // This container has ONLY our editor — good candidate for form scope
// //             const buttonsInCandidate = candidate.querySelectorAll(
// //               'button[componentkey*="commentButtonSection"]',
// //             );
// //             if (buttonsInCandidate.length > 0) {
// //               form = candidate;
// //               break;
// //             }
// //           }
// //           candidate = candidate.parentElement;
// //         }
// //       }

// //       if (!form) {
// //         return { error: "no_form_found", editorY };
// //       }

// //       // ═══ METHOD 2: Find submit button within this form ONLY ═══
// //       const candidateButtons = form.querySelectorAll(
// //         'button[componentkey*="commentButtonSection"]',
// //       );

// //       let bestBtn = null;
// //       let bestDistance = Infinity;

// //       for (const btn of candidateButtons) {
// //         const text = (btn.textContent || "").trim();
// //         if (!["Comment", "Post", "Reply"].includes(text)) continue;
// //         if (btn.hasAttribute("disabled")) continue;

// //         const rect = btn.getBoundingClientRect();
// //         if (rect.width === 0 || rect.height === 0) continue;

// //         const btnY = rect.y + rect.height / 2;

// //         // CRITICAL: Submit button must be BELOW editor (y > editorY)
// //         if (btnY <= editorY) {
// //           continue; // This button is ABOVE our editor — WRONG one
// //         }

// //         // Must be within 400px vertical distance
// //         const distance = btnY - editorY;
// //         if (distance > 400) continue;

// //         // This is a valid candidate — pick closest below
// //         if (distance < bestDistance) {
// //           bestDistance = distance;
// //           bestBtn = btn;
// //         }
// //       }

// //       if (!bestBtn) {
// //         return {
// //           error: "no_valid_submit_below_editor",
// //           editorY,
// //           candidateCount: candidateButtons.length,
// //         };
// //       }

// //       // Scroll and mark
// //       bestBtn.scrollIntoView({ block: "center", behavior: "smooth" });
// //       bestBtn.setAttribute("data-active-submit", "true");

// //       const rect = bestBtn.getBoundingClientRect();
// //       return {
// //         x: Math.floor(rect.x + rect.width / 2),
// //         y: Math.floor(rect.y + rect.height / 2),
// //         rawY: Math.floor(rect.y),
// //         editorY: Math.floor(editorY),
// //         distance: Math.floor(bestDistance),
// //         text: (bestBtn.textContent || "").trim(),
// //       };
// //     });

// //     if (submitInfo.error) {
// //       console.log(`   ❌ Submit button error: ${submitInfo.error}`);
// //       if (submitInfo.editorY) {
// //         console.log(`   📊 Editor was at y=${Math.floor(submitInfo.editorY)}`);
// //       }
// //       await fullCleanup(page);
// //       return { success: false, reason: submitInfo.error };
// //     }

// //     console.log(
// //       `   ✅ Submit button found: "${submitInfo.text}" at y=${submitInfo.rawY}`,
// //     );
// //     console.log(
// //       `   📊 Editor y=${submitInfo.editorY} | Submit y=${submitInfo.rawY} | Distance=${submitInfo.distance}px`,
// //     );

// //     await randomDelay(1000, 2000);

// //     // Get FRESH coords after scrollIntoView
// //     const freshSubmit = await page.evaluate(() => {
// //       const btn = document.querySelector('[data-active-submit="true"]');
// //       if (!btn) return null;
// //       const rect = btn.getBoundingClientRect();
// //       if (rect.y < 50 || rect.y > window.innerHeight - 50) return null;
// //       return {
// //         x: Math.floor(rect.x + rect.width / 2),
// //         y: Math.floor(rect.y + rect.height / 2),
// //       };
// //     });

// //     const finalSubmit = freshSubmit || submitInfo;

// //     console.log(
// //       `   🖱️  Clicking submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
// //     );
// //     await humanMove(page, finalSubmit.x, finalSubmit.y);
// //     await randomDelay(400, 800);
// //     await humanClick(page, finalSubmit.x, finalSubmit.y);
// //     await randomDelay(3500, 5500);

// //     // ── STEP 8: Verify comment posted ──
// //     // Check 1: Our text now appears as a comment (best case)
// //     // Check 2: Editor became empty AND is no longer the same element
// //     const verification = await page.evaluate((expectedText) => {
// //       // Check if editor still exists
// //       const editor = document.querySelector('[data-active-comment-box="true"]');
// //       const editorGone = !editor;
// //       const editorEmpty = editor
// //         ? (editor.textContent || "").trim().length === 0
// //         : true;

// //       // Try to find our comment in the DOM (search for first 30 chars)
// //       const searchText = expectedText.substring(0, 30).toLowerCase();
// //       const allComments = document.querySelectorAll(
// //         '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
// //       );
// //       let foundInComments = false;
// //       for (const c of allComments) {
// //         const text = (c.textContent || "").toLowerCase();
// //         if (text.includes(searchText)) {
// //           foundInComments = true;
// //           break;
// //         }
// //       }

// //       return { editorGone, editorEmpty, foundInComments };
// //     }, commentText);

// //     console.log(
// //       `   📊 Verify: editorGone=${verification.editorGone}, editorEmpty=${verification.editorEmpty}, foundInComments=${verification.foundInComments}`,
// //     );

// //     await fullCleanup(page);

// //     if (verification.foundInComments) {
// //       console.log(`   ✅ Comment POSTED and VERIFIED in comments section!`);
// //       return { success: true, action: "commented" };
// //     } else if (verification.editorEmpty || verification.editorGone) {
// //       console.log(
// //         `   ⚠️  Editor cleared but comment not found in DOM — may still be posting`,
// //       );
// //       // Wait a bit more and check again
// //       await randomDelay(3000, 5000);
// //       const secondCheck = await page.evaluate((expectedText) => {
// //         const searchText = expectedText.substring(0, 30).toLowerCase();
// //         const allComments = document.querySelectorAll(
// //           '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
// //         );
// //         for (const c of allComments) {
// //           if ((c.textContent || "").toLowerCase().includes(searchText))
// //             return true;
// //         }
// //         return false;
// //       }, commentText);

// //       if (secondCheck) {
// //         console.log(`   ✅ Comment now visible in DOM!`);
// //         return { success: true, action: "commented" };
// //       } else {
// //         console.log(
// //           `   ⚠️  Comment posted but not visible in DOM — LinkedIn may need refresh`,
// //         );
// //         return { success: true, action: "commented_unverified" };
// //       }
// //     } else {
// //       console.log(`   ❌ Comment NOT posted — editor still has text`);
// //       return { success: false, reason: "comment_not_posted" };
// //     }
// //   } catch (err) {
// //     console.log(`   ❌ Error: ${err.message}`);
// //     await fullCleanup(page);
// //     return { success: false, reason: "error", error: err.message };
// //   }
// // }

// export async function commentOnPost(
//   page,
//   postIndex,
//   commentText,
//   actuallySend = false,
// ) {
//   console.log(`   💬 Adding inline comment...`);
//   await fullCleanup(page);

//   try {
//     // ── STEP 1: Mark existing editors as "old" ──
//     const editorsBefore = await page.evaluate((sels) => {
//       const editorSelector = sels.join(", ");
//       const editors = document.querySelectorAll(editorSelector);
//       editors.forEach((el) => el.setAttribute("data-old-editor", "true"));
//       return editors.length;
//     }, SELECTORS.commentComposer.textbox);
//     console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

//     // ── STEP 2: Find Comment button (using SVG icon + text) ──
//     console.log(`   🔍 Finding Comment button for post ${postIndex}...`);

//     const commentBtnCoords = await findCommentButton(page, postIndex);

//     if (!commentBtnCoords) {
//       console.log(`   ⚠️  Comment button not found for post ${postIndex}`);

//       // DEBUG: Show what's in the post
//       const debug = await page.evaluate((idx) => {
//         const post = document.querySelector(`[data-post-index="${idx}"]`);
//         if (!post) return { error: "no_post_container" };

//         const allBtns = post.querySelectorAll("button");
//         const btnInfo = [];
//         for (const b of allBtns) {
//           const text = (b.textContent || "").trim();
//           const aria = b.getAttribute("aria-label") || "";
//           const svg = b.querySelector("svg");
//           const svgId = svg ? svg.getAttribute("id") : null;
//           const componentkey = b.getAttribute("componentkey") || "";

//           if (
//             text.toLowerCase().includes("comment") ||
//             aria.toLowerCase().includes("comment") ||
//             (svgId && svgId.includes("comment"))
//           ) {
//             const rect = b.getBoundingClientRect();
//             btnInfo.push({
//               text: text.substring(0, 30),
//               aria: aria.substring(0, 40),
//               svgId,
//               componentkey: componentkey.substring(0, 50),
//               visible: rect.width > 0,
//               y: Math.floor(rect.y),
//             });
//           }
//         }
//         return { totalButtons: allBtns.length, commentLikeButtons: btnInfo };
//       }, postIndex);

//       console.log(`   🐛 Debug:`, JSON.stringify(debug, null, 2));

//       await fullCleanup(page);
//       return { success: false, reason: "no_comment_button" };
//     }

//     console.log(
//       `   ✅ Comment button found (${commentBtnCoords.method}) at (${commentBtnCoords.x}, ${commentBtnCoords.y})`,
//     );
//     console.log(`   🖱️  Clicking Comment button...`);

//     await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
//     await randomDelay(300, 600);
//     await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
//     await randomDelay(2000, 3500);

//     // ── STEP 3: Wait for NEW editor to appear ──
//     console.log(`   ⏳ Waiting for NEW editor...`);
//     let editorInfo = null;

//     for (let i = 0; i < 25; i++) {
//       await page.waitForTimeout(800);

//       editorInfo = await page.evaluate((sels) => {
//         const editorSelector = sels.join(", ");
//         const editors = document.querySelectorAll(editorSelector);
//         for (const editor of editors) {
//           if (editor.hasAttribute("data-old-editor")) continue;
//           const rect = editor.getBoundingClientRect();
//           if (rect.width > 50) {
//             editor.setAttribute("data-active-comment-box", "true");
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               rawY: Math.floor(rect.y),
//               inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
//             };
//           }
//         }
//         return null;
//       }, SELECTORS.commentComposer.textbox);

//       if (editorInfo) {
//         console.log(
//           `   ✅ NEW editor found (${editorInfo.w}x${editorInfo.h}) at y=${editorInfo.rawY}`,
//         );
//         break;
//       }

//       if (i > 0 && i % 5 === 0) {
//         console.log(`   ⏳ Still waiting for editor... (${i}/25)`);
//       }
//     }

//     if (!editorInfo) {
//       console.log(`   🔄 Retrying Comment click via JS...`);
//       await page.evaluate((idx) => {
//         const post = document.querySelector(`[data-post-index="${idx}"]`);
//         if (!post) return;

//         // Find comment button by SVG icon + text
//         const svgs = post.querySelectorAll('svg[id="comment-small"]');
//         for (const svg of svgs) {
//           const btn = svg.closest("button");
//           if (!btn) continue;
//           const text = (btn.textContent || "").trim();
//           if (text !== "Comment") continue;
//           btn.scrollIntoView({ block: "center" });
//           btn.click();
//           return;
//         }
//       }, postIndex);
//       await randomDelay(2500, 4000);

//       editorInfo = await page.evaluate((sels) => {
//         const editorSelector = sels.join(", ");
//         const editors = document.querySelectorAll(editorSelector);
//         for (const editor of editors) {
//           if (editor.hasAttribute("data-old-editor")) continue;
//           const rect = editor.getBoundingClientRect();
//           if (rect.width < 50) continue;
//           editor.setAttribute("data-active-comment-box", "true");
//           return {
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             rawY: Math.floor(rect.y),
//             inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
//           };
//         }
//         return null;
//       }, SELECTORS.commentComposer.textbox);

//       if (!editorInfo) {
//         console.log(`   ❌ No NEW editor after retry`);
//         await fullCleanup(page);
//         return { success: false, reason: "no_new_editor" };
//       }
//     }

//     // ── STEP 4: Scroll editor into view ──
//     if (!editorInfo.inViewport) {
//       console.log(`   📜 Scrolling editor into view...`);
//       const fresh = await scrollToElementAndGetCoords(
//         page,
//         '[data-active-comment-box="true"]',
//       );
//       if (fresh) editorInfo = { ...editorInfo, ...fresh, rawY: fresh.y };
//     }

//     // ── STEP 5: Click + focus editor ──
//     console.log(
//       `   🖱️  Clicking editor at (${editorInfo.x}, ${editorInfo.y})...`,
//     );
//     await humanMove(page, editorInfo.x, editorInfo.y);
//     await randomDelay(300, 600);
//     await humanClick(page, editorInfo.x, editorInfo.y);
//     await randomDelay(800, 1500);

//     await page.evaluate(() => {
//       const el = document.querySelector('[data-active-comment-box="true"]');
//       if (el) {
//         el.focus();
//         el.click();
//       }
//     });
//     await randomDelay(500, 1000);

//     const focusOk = await page.evaluate(() => {
//       const target = document.querySelector('[data-active-comment-box="true"]');
//       return document.activeElement === target;
//     });
//     console.log(`   📊 Focus: ${focusOk ? "✅" : "❌"}`);

//     // ── STEP 6: Type comment ──
//     console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
//     await humanTypeText(page, commentText);
//     await randomDelay(2000, 3500);

//     const typedLen = await page.evaluate(() => {
//       const el = document.querySelector('[data-active-comment-box="true"]');
//       return el ? (el.textContent || "").trim().length : 0;
//     });
//     console.log(`   📊 Typed: ${typedLen} chars`);

//     if (typedLen === 0) {
//       console.log(`   ⚠️  JS fallback typing...`);
//       await page.evaluate((text) => {
//         const el = document.querySelector('[data-active-comment-box="true"]');
//         if (!el) return;
//         el.focus();
//         try {
//           document.execCommand("insertText", false, text);
//         } catch {}
//         if ((el.textContent || "").trim().length === 0) {
//           el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
//           el.dispatchEvent(new Event("input", { bubbles: true }));
//         }
//       }, commentText);
//       await randomDelay(1000, 1500);
//     }

//     if (!actuallySend) {
//       console.log(`   ⚠️  Safe mode — NOT posted`);
//       await page.keyboard.press("Control+a");
//       await page.keyboard.press("Delete");
//       await page.keyboard.press("Escape");
//       await randomDelay(1000, 2000);
//       await fullCleanup(page);
//       return { success: true, action: "typed_only" };
//     }

//     // ── STEP 7: Find + click submit button ──
//     console.log(`   🔍 Finding submit button...`);
//     await randomDelay(1500, 2500);

//     const submitInfo = await findSubmitButton(page);

//     if (submitInfo.error) {
//       console.log(`   ❌ Submit button error: ${submitInfo.error}`);
//       if (submitInfo.editorY) {
//         console.log(`   📊 Editor was at y=${Math.floor(submitInfo.editorY)}`);
//       }
//       await fullCleanup(page);
//       return { success: false, reason: submitInfo.error };
//     }

//     console.log(
//       `   ✅ Submit button found: "${submitInfo.text}" at y=${submitInfo.rawY}`,
//     );
//     console.log(
//       `   📊 Editor y=${submitInfo.editorY} | Submit y=${submitInfo.rawY} | Distance=${submitInfo.distance}px`,
//     );

//     await randomDelay(1000, 2000);

//     const freshSubmit = await page.evaluate(() => {
//       const btn = document.querySelector('[data-active-submit="true"]');
//       if (!btn) return null;
//       const rect = btn.getBoundingClientRect();
//       if (rect.y < 50 || rect.y > window.innerHeight - 50) return null;
//       return {
//         x: Math.floor(rect.x + rect.width / 2),
//         y: Math.floor(rect.y + rect.height / 2),
//       };
//     });

//     const finalSubmit = freshSubmit || submitInfo;

//     console.log(
//       `   🖱️  Clicking submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
//     );
//     await humanMove(page, finalSubmit.x, finalSubmit.y);
//     await randomDelay(400, 800);
//     await humanClick(page, finalSubmit.x, finalSubmit.y);
//     await randomDelay(3500, 5500);

//     // ── STEP 8: Verify comment posted ──
//     const verification = await page.evaluate((expectedText) => {
//       const editor = document.querySelector('[data-active-comment-box="true"]');
//       const editorGone = !editor;
//       const editorEmpty = editor
//         ? (editor.textContent || "").trim().length === 0
//         : true;

//       const searchText = expectedText.substring(0, 30).toLowerCase();
//       const allComments = document.querySelectorAll(
//         '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
//       );
//       let foundInComments = false;
//       for (const c of allComments) {
//         const text = (c.textContent || "").toLowerCase();
//         if (text.includes(searchText)) {
//           foundInComments = true;
//           break;
//         }
//       }

//       return { editorGone, editorEmpty, foundInComments };
//     }, commentText);

//     console.log(
//       `   📊 Verify: editorGone=${verification.editorGone}, editorEmpty=${verification.editorEmpty}, foundInComments=${verification.foundInComments}`,
//     );

//     await fullCleanup(page);

//     if (verification.foundInComments) {
//       console.log(`   ✅ Comment POSTED and VERIFIED in comments section!`);
//       return { success: true, action: "commented" };
//     } else if (verification.editorEmpty || verification.editorGone) {
//       console.log(
//         `   ⚠️  Editor cleared but comment not found in DOM — may still be posting`,
//       );
//       await randomDelay(3000, 5000);
//       const secondCheck = await page.evaluate((expectedText) => {
//         const searchText = expectedText.substring(0, 30).toLowerCase();
//         const allComments = document.querySelectorAll(
//           '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
//         );
//         for (const c of allComments) {
//           if ((c.textContent || "").toLowerCase().includes(searchText))
//             return true;
//         }
//         return false;
//       }, commentText);

//       if (secondCheck) {
//         console.log(`   ✅ Comment now visible in DOM!`);
//         return { success: true, action: "commented" };
//       } else {
//         console.log(`   ⚠️  Comment posted but not visible in DOM`);
//         return { success: true, action: "commented_unverified" };
//       }
//     } else {
//       console.log(`   ❌ Comment NOT posted — editor still has text`);
//       return { success: false, reason: "comment_not_posted" };
//     }
//   } catch (err) {
//     console.log(`   ❌ Error: ${err.message}`);
//     await fullCleanup(page);
//     return { success: false, reason: "error", error: err.message };
//   }
// }

// // ═══════════════════════════════════════════════════════════════════
// // HELPER: Find Comment button using modern LinkedIn UI markers
// // (SVG icon id="comment-small" + inner text "Comment")
// // ═══════════════════════════════════════════════════════════════════
// async function findCommentButton(page, postIndex) {
//   const coords = await page.evaluate(
//     ({ idx, iconId, buttonText }) => {
//       const post = document.querySelector(`[data-post-index="${idx}"]`);
//       if (!post) return { error: "no_post_container" };

//       // ─── Strategy 1 (BEST): SVG icon id="comment-small" ───
//       // The action bar Comment button contains this SVG
//       const svgs = post.querySelectorAll(`svg[id="${iconId}"]`);
//       for (const svg of svgs) {
//         const btn = svg.closest("button");
//         if (!btn) continue;

//         const rect = btn.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;

//         // Verify it's the action button (text should be exactly "Comment")
//         const text = (btn.textContent || "").trim();
//         if (text !== buttonText) continue;

//         // Verify it's NOT the submit button (submit has componentkey with "commentButtonSection")
//         const componentkey = btn.getAttribute("componentkey") || "";
//         if (componentkey.includes("commentButtonSection")) continue;

//         btn.scrollIntoView({ block: "center", behavior: "instant" });
//         const fresh = btn.getBoundingClientRect();
//         return {
//           x: Math.floor(fresh.x + fresh.width / 2),
//           y: Math.floor(fresh.y + fresh.height / 2),
//           method: "svg_icon_" + iconId,
//         };
//       }

//       // ─── Strategy 2: Text-based search in action bar ───
//       const allBtns = post.querySelectorAll("button");
//       const candidates = [];

//       for (const btn of allBtns) {
//         const text = (btn.textContent || "").trim();
//         if (text !== buttonText) continue;

//         const rect = btn.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;

//         // Must have an SVG icon (action bar buttons all have icons)
//         if (!btn.querySelector("svg")) continue;

//         // Exclude submit button
//         const componentkey = btn.getAttribute("componentkey") || "";
//         if (componentkey.includes("commentButtonSection")) continue;

//         candidates.push({ btn, rect });
//       }

//       if (candidates.length > 0) {
//         // Pick the topmost one (action bar sits below post content)
//         candidates.sort((a, b) => a.rect.y - b.rect.y);
//         const chosen = candidates[0];
//         chosen.btn.scrollIntoView({ block: "center", behavior: "instant" });
//         const fresh = chosen.btn.getBoundingClientRect();
//         return {
//           x: Math.floor(fresh.x + fresh.width / 2),
//           y: Math.floor(fresh.y + fresh.height / 2),
//           method: "text_with_svg",
//         };
//       }

//       // ─── Strategy 3: Legacy aria-label ───
//       const ariaBtns = post.querySelectorAll('button[aria-label="Comment"]');
//       for (const btn of ariaBtns) {
//         const rect = btn.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;

//         const componentkey = btn.getAttribute("componentkey") || "";
//         if (componentkey.includes("commentButtonSection")) continue;

//         btn.scrollIntoView({ block: "center", behavior: "instant" });
//         const fresh = btn.getBoundingClientRect();
//         return {
//           x: Math.floor(fresh.x + fresh.width / 2),
//           y: Math.floor(fresh.y + fresh.height / 2),
//           method: "legacy_aria",
//         };
//       }

//       return { error: "no_button_found" };
//     },
//     {
//       idx: postIndex,
//       iconId: SELECTORS.postCard.actionBarSvgIcons.comment, // "comment-small"
//       buttonText: SELECTORS.postCard.commentButton.buttonText, // "Comment"
//     },
//   );

//   if (coords.error) {
//     return null;
//   }

//   await page.waitForTimeout(800);

//   // Re-fetch coords after any scroll settled
//   const freshCoords = await page.evaluate(
//     ({ idx, iconId, buttonText }) => {
//       const post = document.querySelector(`[data-post-index="${idx}"]`);
//       if (!post) return null;

//       // Try SVG method first
//       const svg = post.querySelector(`svg[id="${iconId}"]`);
//       if (svg) {
//         const btn = svg.closest("button");
//         if (btn) {
//           const text = (btn.textContent || "").trim();
//           if (text === buttonText) {
//             const componentkey = btn.getAttribute("componentkey") || "";
//             if (!componentkey.includes("commentButtonSection")) {
//               const r = btn.getBoundingClientRect();
//               if (r.width > 0) {
//                 return {
//                   x: Math.floor(r.x + r.width / 2),
//                   y: Math.floor(r.y + r.height / 2),
//                 };
//               }
//             }
//           }
//         }
//       }

//       // Fallback: text-based
//       const allBtns = post.querySelectorAll("button");
//       for (const btn of allBtns) {
//         if ((btn.textContent || "").trim() !== buttonText) continue;
//         const componentkey = btn.getAttribute("componentkey") || "";
//         if (componentkey.includes("commentButtonSection")) continue;
//         if (!btn.querySelector("svg")) continue;
//         const r = btn.getBoundingClientRect();
//         if (r.width === 0) continue;
//         return {
//           x: Math.floor(r.x + r.width / 2),
//           y: Math.floor(r.y + r.height / 2),
//         };
//       }
//       return null;
//     },
//     {
//       idx: postIndex,
//       iconId: SELECTORS.postCard.actionBarSvgIcons.comment,
//       buttonText: SELECTORS.postCard.commentButton.buttonText,
//     },
//   );

//   return freshCoords || coords;
// }

// // ═══════════════════════════════════════════════════════════════════
// // HELPER: Find Submit button (must be BELOW editor, within same form)
// // ═══════════════════════════════════════════════════════════════════
// async function findSubmitButton(page) {
//   return await page.evaluate(
//     ({ submitSelector, submitTexts }) => {
//       const editor = document.querySelector('[data-active-comment-box="true"]');
//       if (!editor) return { error: "no_editor" };

//       const editorRect = editor.getBoundingClientRect();
//       const editorY = editorRect.y + editorRect.height / 2;

//       // Find the composer wrapper (walk up until we find one with submit button)
//       let composerWrapper = null;
//       let candidate = editor.parentElement;

//       for (let i = 0; i < 10; i++) {
//         if (!candidate) break;

//         const submitBtn = candidate.querySelector(submitSelector);
//         if (submitBtn) {
//           // Verify our editor is INSIDE this wrapper
//           const editorsInside = candidate.querySelectorAll(
//             'div[contenteditable="true"][aria-label="Text editor for creating comment"], div.tiptap.ProseMirror[contenteditable="true"]',
//           );
//           let ourEditorInside = false;
//           for (const e of editorsInside) {
//             if (e === editor) {
//               ourEditorInside = true;
//               break;
//             }
//           }
//           if (ourEditorInside) {
//             composerWrapper = candidate;
//             break;
//           }
//         }
//         candidate = candidate.parentElement;
//       }

//       if (!composerWrapper) {
//         return { error: "no_composer_wrapper_found", editorY };
//       }

//       // Find submit button in this specific wrapper
//       const submitButtons = composerWrapper.querySelectorAll(submitSelector);

//       let bestBtn = null;
//       let bestDistance = Infinity;

//       for (const btn of submitButtons) {
//         const text = (btn.textContent || "").trim();
//         if (!submitTexts.includes(text)) continue;
//         if (btn.hasAttribute("disabled")) continue;

//         const rect = btn.getBoundingClientRect();
//         if (rect.width === 0 || rect.height === 0) continue;

//         const btnY = rect.y + rect.height / 2;
//         if (btnY <= editorY) continue; // must be BELOW editor

//         const distance = btnY - editorY;
//         if (distance > 500) continue;

//         if (distance < bestDistance) {
//           bestDistance = distance;
//           bestBtn = btn;
//         }
//       }

//       if (!bestBtn) {
//         return {
//           error: "no_valid_submit_below_editor",
//           editorY,
//           candidateCount: submitButtons.length,
//         };
//       }

//       bestBtn.scrollIntoView({ block: "center", behavior: "smooth" });
//       bestBtn.setAttribute("data-active-submit", "true");

//       const rect = bestBtn.getBoundingClientRect();
//       return {
//         x: Math.floor(rect.x + rect.width / 2),
//         y: Math.floor(rect.y + rect.height / 2),
//         rawY: Math.floor(rect.y),
//         editorY: Math.floor(editorY),
//         distance: Math.floor(bestDistance),
//         text: (bestBtn.textContent || "").trim(),
//       };
//     },
//     {
//       submitSelector: SELECTORS.commentComposer.submitButton,
//       submitTexts: SELECTORS.commentComposer.submitButtonTexts,
//     },
//   );
// }

// /**
//  * Reply to a comment (used by workflow for post-comment replies)
//  */
// export async function replyToComment(
//   page,
//   postIndex,
//   targetAuthorName,
//   replyText,
//   actuallySend = false,
// ) {
//   console.log(`   ↩️  Replying to ${targetAuthorName}...`);
//   await fullCleanup(page);

//   try {
//     const replyBtnCoords = await page.evaluate(
//       (data) => {
//         const container = document.querySelector(
//           `[data-post-index="${data.idx}"]`,
//         );
//         if (!container) return null;
//         const comments = container.querySelectorAll(
//           data.commentItemSelectors.join(", "),
//         );
//         for (const comment of comments) {
//           const nameEl = comment.querySelector(
//             data.commentAuthorSelectors.join(", "),
//           );
//           if (!nameEl) continue;
//           const name = (nameEl.textContent || "").trim().split("\n")[0].trim();
//           if (
//             !name
//               .toLowerCase()
//               .includes(data.targetName.split(" ")[0].toLowerCase())
//           )
//             continue;
//           const replyBtn = comment.querySelector(data.replyButton);
//           if (replyBtn) {
//             replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
//             const rect = replyBtn.getBoundingClientRect();
//             if (rect.width > 0 && rect.height > 0) {
//               return {
//                 x: Math.floor(rect.x + rect.width / 2),
//                 y: Math.floor(rect.y + rect.height / 2),
//               };
//             }
//           }
//         }
//         return null;
//       },
//       {
//         idx: postIndex,
//         targetName: targetAuthorName,
//         commentItemSelectors: SELECTORS.commentsSection.commentItem,
//         commentAuthorSelectors: SELECTORS.commentsSection.commentAuthorName,
//         replyButton: SELECTORS.commentsSection.replyButton,
//       },
//     );

//     if (!replyBtnCoords) return { success: false, reason: "no_reply_button" };

//     await page.evaluate(() => {
//       document
//         .querySelectorAll(
//           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//         )
//         .forEach((el) => el.setAttribute("data-old-editor", "true"));
//     });

//     await randomDelay(1000, 1800);
//     await humanClick(page, replyBtnCoords.x, replyBtnCoords.y);
//     await randomDelay(2500, 4000);

//     let editorInfo = null;
//     for (let i = 0; i < 15; i++) {
//       await page.waitForTimeout(700);
//       editorInfo = await page.evaluate(() => {
//         const editors = document.querySelectorAll(
//           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//         );
//         for (const el of editors) {
//           if (el.hasAttribute("data-old-editor")) continue;
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 50) {
//             el.setAttribute("data-reply-box", "true");
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               editorY: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }
//         return null;
//       });
//       if (editorInfo) break;
//     }

//     if (!editorInfo) {
//       await fullCleanup(page);
//       return { success: false, reason: "no_reply_editor" };
//     }

//     await humanClick(page, editorInfo.x, editorInfo.y);
//     await randomDelay(800, 1500);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-reply-box="true"]');
//       if (el) {
//         el.focus();
//         el.click();
//       }
//     });

//     console.log(`   ⌨️  Typing reply (${replyText.length} chars)...`);
//     await humanTypeText(page, replyText);
//     await randomDelay(2000, 3500);

//     if (!actuallySend) {
//       await page.keyboard.press("Control+a");
//       await page.keyboard.press("Delete");
//       await page.keyboard.press("Escape");
//       await fullCleanup(page);
//       return { success: true, action: "typed_only" };
//     }

//     // Same strict submit button finding as commentOnPost
//     const submitInfo = await page.evaluate(() => {
//       const editor = document.querySelector('[data-reply-box="true"]');
//       if (!editor) return { error: "no_editor" };
//       const editorRect = editor.getBoundingClientRect();
//       const editorY = editorRect.y + editorRect.height / 2;

//       let form = editor.closest("form");
//       if (!form) {
//         let candidate = editor.parentElement;
//         for (let i = 0; i < 8; i++) {
//           if (!candidate) break;
//           const editorsInCandidate = candidate.querySelectorAll(
//             'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//           );
//           if (
//             editorsInCandidate.length === 1 &&
//             editorsInCandidate[0] === editor
//           ) {
//             const buttonsInCandidate = candidate.querySelectorAll(
//               'button[componentkey*="commentButtonSection"]',
//             );
//             if (buttonsInCandidate.length > 0) {
//               form = candidate;
//               break;
//             }
//           }
//           candidate = candidate.parentElement;
//         }
//       }
//       if (!form) return { error: "no_form" };

//       const buttons = form.querySelectorAll(
//         'button[componentkey*="commentButtonSection"]',
//       );
//       let bestBtn = null;
//       let bestDist = Infinity;

//       for (const btn of buttons) {
//         const text = (btn.textContent || "").trim();
//         if (!["Comment", "Post", "Reply"].includes(text)) continue;
//         if (btn.hasAttribute("disabled")) continue;
//         const rect = btn.getBoundingClientRect();
//         if (rect.width === 0) continue;
//         const btnY = rect.y + rect.height / 2;
//         if (btnY <= editorY) continue;
//         const dist = btnY - editorY;
//         if (dist > 400) continue;
//         if (dist < bestDist) {
//           bestDist = dist;
//           bestBtn = btn;
//         }
//       }

//       if (!bestBtn) return { error: "no_valid_submit" };

//       bestBtn.scrollIntoView({ block: "center" });
//       const rect = bestBtn.getBoundingClientRect();
//       return {
//         x: Math.floor(rect.x + rect.width / 2),
//         y: Math.floor(rect.y + rect.height / 2),
//       };
//     });

//     if (submitInfo.error) {
//       await fullCleanup(page);
//       return { success: false, reason: submitInfo.error };
//     }

//     await randomDelay(800, 1500);
//     await humanClick(page, submitInfo.x, submitInfo.y);
//     await randomDelay(3000, 5000);
//     await fullCleanup(page);

//     console.log(`   ✅ Replied to ${targetAuthorName}!`);
//     return { success: true, action: "replied" };
//   } catch (err) {
//     console.log(`   ❌ Reply error: ${err.message}`);
//     await fullCleanup(page);
//     return { success: false, reason: "error" };
//   }
// }

// /**
//  * Reply to a SPECIFIC comment identified by author name
//  * Uses your HTML structure:
//  * - Finds article.comments-comment-entity where author name matches
//  * - Clicks its Reply button
//  * - Types reply
//  * - Clicks submit
//  */
// /**
//  * Reply to a comment identified by data-id (most reliable)
//  * Falls back to name-based matching if ID not provided
//  */
// export async function replyToSpecificComment(
//   page,
//   targetName,
//   replyText,
//   actuallySend = false,
//   targetCommentId = null,
// ) {
//   console.log(`   ↩️  Replying to ${targetName}'s comment...`);
//   if (targetCommentId) {
//     console.log(`      Target comment ID: ${targetCommentId}`);
//   }
//   await fullCleanup(page);

//   try {
//     // ═══════════════════════════════════════════════════════════
//     // STEP 1: Scroll to comments section
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   📜 Scrolling down to find comment...`);

//     for (let i = 0; i < 5; i++) {
//       await page.evaluate(() => {
//         window.scrollBy({ top: 300, behavior: "smooth" });
//       });
//       await randomDelay(600, 1200);
//     }

//     // ═══════════════════════════════════════════════════════════
//     // STEP 2: Find the EXACT target comment
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   🔍 Locating exact comment...`);

//     const commentLocation = await page.evaluate(
//       (data) => {
//         const { targetName, targetCommentId } = data;
//         const targetFirstName = targetName.split(" ")[0].toLowerCase();

//         let targetCommentEl = null;

//         // PRIORITY 1: Match by data-id (most reliable)
//         if (targetCommentId) {
//           targetCommentEl = document.querySelector(
//             `article[data-id="${targetCommentId}"], [data-id="${targetCommentId}"]`,
//           );

//           if (targetCommentEl) {
//             targetCommentEl.setAttribute("data-target-comment", "true");
//             targetCommentEl.scrollIntoView({
//               block: "center",
//               behavior: "smooth",
//             });
//             const nameEl = targetCommentEl.querySelector(
//               ".comments-comment-meta__description-title",
//             );
//             return {
//               found: true,
//               matchedBy: "id",
//               matchedName: nameEl
//                 ? (nameEl.textContent || "").trim()
//                 : "unknown",
//             };
//           }
//         }

//         // PRIORITY 2: Find by name — but prefer replies to OUR comment
//         const commentEls = document.querySelectorAll(
//           "article.comments-comment-entity, [class*='comments-comment-entity']",
//         );

//         // First, find OUR comment (has "• You" in meta)
//         let ourCommentEl = null;
//         for (const el of commentEls) {
//           const metaText =
//             el.querySelector(".comments-comment-meta__description")
//               ?.textContent || "";
//           if (metaText.includes("• You")) {
//             ourCommentEl = el;
//             break;
//           }
//         }

//         // If we found our comment, look for target's reply WITHIN it
//         if (ourCommentEl) {
//           const repliesContainer = ourCommentEl.querySelector(
//             ".comments-replies-list, [class*='comments-replies-list']",
//           );

//           if (repliesContainer) {
//             const nestedReplies = repliesContainer.querySelectorAll(
//               "article.comments-comment-entity, [class*='comment-entity']",
//             );

//             for (const replyEl of nestedReplies) {
//               const nameEl = replyEl.querySelector(
//                 ".comments-comment-meta__description-title",
//               );
//               if (!nameEl) continue;

//               const name = (nameEl.textContent || "").trim().toLowerCase();
//               if (!name.includes(targetFirstName)) continue;

//               // Skip if it's our reply
//               const metaText =
//                 replyEl.querySelector(".comments-comment-meta__description")
//                   ?.textContent || "";
//               if (metaText.includes("• You")) continue;

//               targetCommentEl = replyEl;
//               break;
//             }
//           }
//         }

//         // FALLBACK: If not found in our thread, search all comments
//         if (!targetCommentEl) {
//           for (const commentEl of commentEls) {
//             const nameEl = commentEl.querySelector(
//               ".comments-comment-meta__description-title",
//             );
//             if (!nameEl) continue;

//             const commenterName = (nameEl.textContent || "")
//               .trim()
//               .toLowerCase();
//             if (!commenterName.includes(targetFirstName)) continue;

//             const metaText =
//               commentEl.querySelector(".comments-comment-meta__description")
//                 ?.textContent || "";
//             if (metaText.includes("• You")) continue;

//             targetCommentEl = commentEl;
//             break;
//           }
//         }

//         if (!targetCommentEl) {
//           return { found: false };
//         }

//         targetCommentEl.setAttribute("data-target-comment", "true");
//         targetCommentEl.scrollIntoView({ block: "center", behavior: "smooth" });

//         const nameEl = targetCommentEl.querySelector(
//           ".comments-comment-meta__description-title",
//         );
//         const isReplyToUs =
//           targetCommentEl.closest(".comments-replies-list") !== null;

//         return {
//           found: true,
//           matchedBy: isReplyToUs ? "nested_reply_to_us" : "top_level",
//           matchedName: nameEl ? (nameEl.textContent || "").trim() : "unknown",
//         };
//       },
//       { targetName, targetCommentId },
//     );

//     if (!commentLocation.found) {
//       console.log(`   ❌ Comment from "${targetName}" not found`);
//       return { success: false, reason: "comment_not_found" };
//     }

//     console.log(
//       `   ✅ Found comment (${commentLocation.matchedBy}): ${commentLocation.matchedName}`,
//     );
//     await randomDelay(2500, 4000);

//     // ═══════════════════════════════════════════════════════════
//     // STEP 3: Find Reply button on THIS specific comment
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   🔍 Finding Reply button on target comment...`);

//     const replyBtnCoords = await page.evaluate(() => {
//       const commentEl = document.querySelector('[data-target-comment="true"]');
//       if (!commentEl) return null;

//       // Get direct child social bar (not from nested replies)
//       const socialBars = commentEl.querySelectorAll(
//         ".comments-comment-social-bar--cr, [class*='comment-social-bar']",
//       );

//       // Get the FIRST social bar (belongs to this comment, not its replies)
//       let socialBar = null;
//       for (const bar of socialBars) {
//         // Check if this social bar's parent is the target comment (not a nested reply)
//         const parentComment = bar.closest("article.comments-comment-entity");
//         if (parentComment === commentEl) {
//           socialBar = bar;
//           break;
//         }
//       }

//       if (!socialBar) return null;

//       // Find Reply button in this specific social bar
//       const replyBtn = socialBar.querySelector(
//         'button[aria-label*="Reply" i][aria-label*="comment"]',
//       );

//       if (!replyBtn) return null;

//       // Scroll button into view
//       replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
//       const rect = replyBtn.getBoundingClientRect();
//       if (rect.width === 0 || rect.height === 0) return null;

//       return {
//         x: Math.floor(rect.x + rect.width / 2),
//         y: Math.floor(rect.y + rect.height / 2),
//         inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
//       };
//     });

//     if (!replyBtnCoords) {
//       console.log(`   ❌ Reply button not found on target comment`);
//       return { success: false, reason: "reply_button_not_found" };
//     }

//     // Wait for scroll
//     await randomDelay(1500, 2500);

//     // Refresh coords after scroll
//     const freshBtnCoords = await page.evaluate(() => {
//       const commentEl = document.querySelector('[data-target-comment="true"]');
//       if (!commentEl) return null;
//       const socialBars = commentEl.querySelectorAll(
//         ".comments-comment-social-bar--cr",
//       );
//       for (const bar of socialBars) {
//         const parentComment = bar.closest("article.comments-comment-entity");
//         if (parentComment === commentEl) {
//           const btn = bar.querySelector(
//             'button[aria-label*="Reply" i][aria-label*="comment"]',
//           );
//           if (btn) {
//             const rect = btn.getBoundingClientRect();
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }
//       }
//       return null;
//     });

//     const finalBtnCoords = freshBtnCoords || replyBtnCoords;
//     console.log(
//       `   👀 Reply button at (${finalBtnCoords.x}, ${finalBtnCoords.y})`,
//     );

//     // ═══════════════════════════════════════════════════════════
//     // STEP 4: Mark existing editors as "old"
//     // ═══════════════════════════════════════════════════════════
//     await page.evaluate(() => {
//       document.querySelectorAll('div[contenteditable="true"]').forEach((el) => {
//         el.setAttribute("data-old-editor", "true");
//       });
//     });

//     // ═══════════════════════════════════════════════════════════
//     // STEP 5: Click Reply button (visible mouse movement)
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   🖱️  Moving mouse to Reply button...`);
//     await page.mouse.move(finalBtnCoords.x, finalBtnCoords.y, { steps: 20 });
//     await randomDelay(500, 1000);

//     console.log(`   🖱️  Clicking Reply button...`);
//     await page.mouse.click(finalBtnCoords.x, finalBtnCoords.y);
//     await randomDelay(3000, 5000);

//     // ═══════════════════════════════════════════════════════════
//     // STEP 6: Wait for reply editor (extended wait + multiple retries)
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   ⏳ Waiting for reply editor to appear...`);
//     let editorInfo = null;

//     for (let attempt = 1; attempt <= 20; attempt++) {
//       await page.waitForTimeout(700);

//       editorInfo = await page.evaluate(() => {
//         // Multiple selectors to try
//         const selectors = [
//           'div.ql-editor[contenteditable="true"][data-placeholder*="reply" i]',
//           'div.ql-editor[contenteditable="true"][data-placeholder*="comment" i]',
//           'div.ql-editor[contenteditable="true"]',
//           'div.ProseMirror[contenteditable="true"]',
//           'div[contenteditable="true"][role="textbox"]',
//           'div[contenteditable="true"]',
//         ];

//         for (const sel of selectors) {
//           const editors = document.querySelectorAll(sel);
//           for (const el of editors) {
//             if (el.hasAttribute("data-old-editor")) continue;
//             const rect = el.getBoundingClientRect();
//             if (rect.width > 50 && rect.height > 10) {
//               el.setAttribute("data-active-reply-box", "true");
//               return {
//                 x: Math.floor(rect.x + rect.width / 2),
//                 y: Math.floor(rect.y + rect.height / 2),
//                 w: Math.floor(rect.width),
//                 h: Math.floor(rect.height),
//                 inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
//                 rawY: Math.floor(rect.y),
//                 selectorUsed: sel,
//               };
//             }
//           }
//         }
//         return null;
//       });

//       if (editorInfo) {
//         console.log(`   ✅ Editor found (${editorInfo.selectorUsed})`);
//         console.log(
//           `      Position: (${editorInfo.x}, ${editorInfo.y}), Size: ${editorInfo.w}x${editorInfo.h}`,
//         );
//         break;
//       }

//       if (attempt % 5 === 0) {
//         console.log(`   ⏳ Still waiting... ${attempt}/20s`);
//       }
//     }

//     // If editor didn't appear, try clicking Reply button again
//     if (!editorInfo) {
//       console.log(
//         `   🔄 Editor didn't appear — retrying Reply click via JS...`,
//       );

//       await page.evaluate(() => {
//         const commentEl = document.querySelector(
//           '[data-target-comment="true"]',
//         );
//         if (!commentEl) return;
//         const socialBars = commentEl.querySelectorAll(
//           ".comments-comment-social-bar--cr",
//         );
//         for (const bar of socialBars) {
//           const parentComment = bar.closest("article.comments-comment-entity");
//           if (parentComment === commentEl) {
//             const btn = bar.querySelector(
//               'button[aria-label*="Reply" i][aria-label*="comment"]',
//             );
//             if (btn) {
//               btn.scrollIntoView({ block: "center" });
//               btn.click();
//               break;
//             }
//           }
//         }
//       });
//       await randomDelay(3000, 5000);

//       editorInfo = await page.evaluate(() => {
//         const editors = document.querySelectorAll(
//           'div[contenteditable="true"]:not([data-old-editor])',
//         );
//         for (const el of editors) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 50) {
//             el.setAttribute("data-active-reply-box", "true");
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
//             };
//           }
//         }
//         return null;
//       });

//       if (!editorInfo) {
//         console.log(`   ❌ Reply editor never appeared even after retry`);
//         await fullCleanup(page);
//         return { success: false, reason: "no_editor" };
//       }
//       console.log(`   ✅ Editor found on retry`);
//     }

//     // ═══════════════════════════════════════════════════════════
//     // STEP 7: Scroll editor into center
//     // ═══════════════════════════════════════════════════════════
//     if (!editorInfo.inViewport) {
//       console.log(`   📜 Scrolling editor into center of screen...`);
//       await page.evaluate(() => {
//         const el = document.querySelector('[data-active-reply-box="true"]');
//         if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//       });
//       await randomDelay(2000, 3000);

//       const fresh = await page.evaluate(() => {
//         const el = document.querySelector('[data-active-reply-box="true"]');
//         if (!el) return null;
//         const rect = el.getBoundingClientRect();
//         return {
//           x: Math.floor(rect.x + rect.width / 2),
//           y: Math.floor(rect.y + rect.height / 2),
//         };
//       });
//       if (fresh) editorInfo = { ...editorInfo, ...fresh };
//     }

//     console.log(`   👀 Editor is now visible on screen`);

//     // ═══════════════════════════════════════════════════════════
//     // STEP 8: Click editor + focus
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   🖱️  Moving mouse to editor...`);
//     await page.mouse.move(editorInfo.x, editorInfo.y, { steps: 15 });
//     await randomDelay(400, 800);

//     console.log(`   🖱️  Clicking editor...`);
//     await page.mouse.click(editorInfo.x, editorInfo.y);
//     await randomDelay(800, 1500);

//     await page.evaluate(() => {
//       const el = document.querySelector('[data-active-reply-box="true"]');
//       if (el) {
//         el.focus();
//         el.click();
//       }
//     });
//     await randomDelay(500, 1000);

//     // ═══════════════════════════════════════════════════════════
//     // STEP 9: Type reply (VISIBLE)
//     // ═══════════════════════════════════════════════════════════
//     // Move cursor to end (past auto-inserted mention)
//     await page.keyboard.press("End");
//     await randomDelay(300, 500);
//     await page.keyboard.type(" ");
//     await randomDelay(200, 400);

//     console.log(
//       `   ⌨️  Typing reply (${replyText.length} chars) — watch the screen!`,
//     );

//     for (let i = 0; i < replyText.length; i++) {
//       const char = replyText[i];
//       await page.keyboard.type(char, { delay: 40 + Math.random() * 60 });

//       if (Math.random() < 0.03 && i > 10) {
//         await page.waitForTimeout(400 + Math.random() * 800);
//       }
//     }

//     await randomDelay(2000, 3500);

//     const typedLen = await page.evaluate(() => {
//       const el = document.querySelector('[data-active-reply-box="true"]');
//       return el ? (el.textContent || "").trim().length : 0;
//     });
//     console.log(`   📊 Chars in editor: ${typedLen}`);

//     if (typedLen < replyText.length / 2) {
//       console.log(`   ⚠️  Typing incomplete — JS fallback...`);
//       await page.evaluate((text) => {
//         const el = document.querySelector('[data-active-reply-box="true"]');
//         if (!el) return;
//         el.focus();
//         try {
//           document.execCommand("insertText", false, text);
//         } catch {}
//         if ((el.textContent || "").trim().length < text.length / 2) {
//           el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
//           el.dispatchEvent(new Event("input", { bubbles: true }));
//         }
//       }, replyText);
//       await randomDelay(1000, 1500);
//     }

//     if (!actuallySend) {
//       console.log(`   ⚠️  Safe mode — NOT posting`);
//       await page.keyboard.press("Control+a");
//       await page.keyboard.press("Delete");
//       await page.keyboard.press("Escape");
//       await fullCleanup(page);
//       return { success: true, action: "typed_only" };
//     }

//     // ═══════════════════════════════════════════════════════════
//     // STEP 10: Find and click Submit
//     // ═══════════════════════════════════════════════════════════
//     console.log(`   🔍 Finding Submit button...`);
//     await randomDelay(1000, 1500);

//     const submitCoords = await page.evaluate(() => {
//       const editor = document.querySelector('[data-active-reply-box="true"]');
//       if (!editor) return null;

//       let parent = editor.parentElement;
//       for (let i = 0; i < 12; i++) {
//         if (!parent) break;

//         const submitBtn = parent.querySelector(
//           "button.comments-comment-box__submit-button--cr, " +
//             'button[class*="comment-box__submit-button"], ' +
//             'button[componentkey*="commentButtonSection"]',
//         );

//         if (submitBtn) {
//           const text = (submitBtn.textContent || "").trim();
//           if (
//             (text === "Reply" || text === "Comment" || text === "Post") &&
//             !submitBtn.hasAttribute("disabled")
//           ) {
//             submitBtn.scrollIntoView({ block: "center", behavior: "smooth" });
//             const rect = submitBtn.getBoundingClientRect();
//             if (rect.width > 0) {
//               return {
//                 x: Math.floor(rect.x + rect.width / 2),
//                 y: Math.floor(rect.y + rect.height / 2),
//                 text,
//               };
//             }
//           }
//         }
//         parent = parent.parentElement;
//       }
//       return null;
//     });

//     if (!submitCoords) {
//       console.log(`   ❌ Submit button not found`);
//       await fullCleanup(page);
//       return { success: false, reason: "no_submit" };
//     }

//     console.log(`   ✅ Submit button found: "${submitCoords.text}"`);
//     await randomDelay(1000, 1500);

//     const freshSubmit = await page.evaluate(() => {
//       const btns = document.querySelectorAll(
//         "button.comments-comment-box__submit-button--cr, " +
//           'button[class*="comment-box__submit-button"], ' +
//           'button[componentkey*="commentButtonSection"]',
//       );
//       for (const btn of btns) {
//         const text = (btn.textContent || "").trim();
//         if (
//           (text === "Reply" || text === "Comment" || text === "Post") &&
//           !btn.hasAttribute("disabled")
//         ) {
//           const rect = btn.getBoundingClientRect();
//           if (
//             rect.width > 0 &&
//             rect.y > 50 &&
//             rect.y < window.innerHeight - 50
//           ) {
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//             };
//           }
//         }
//       }
//       return null;
//     });

//     const finalSubmit = freshSubmit || submitCoords;

//     console.log(
//       `   🖱️  Moving mouse to Submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
//     );
//     await page.mouse.move(finalSubmit.x, finalSubmit.y, { steps: 15 });
//     await randomDelay(500, 1000);

//     console.log(`   🖱️  Clicking Submit — POSTING!`);
//     await page.mouse.click(finalSubmit.x, finalSubmit.y);
//     await randomDelay(3000, 5000);

//     console.log(`   ✅ Reply POSTED to ${targetName}!`);
//     await fullCleanup(page);
//     return { success: true, action: "replied" };
//   } catch (err) {
//     console.log(`   ❌ Reply error: ${err.message}`);
//     await fullCleanup(page);
//     return { success: false, reason: "error", error: err.message };
//   }
// }

import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import {
  scrollPostElementIntoView,
  scrollToElementAndGetCoords,
} from "../../helpers/scroll.helper.js";
import { closeExtraTabs } from "../browser/browser.service.js";
import SELECTORS from "../../config/selectors.js";

// ═══════════════════════════════════════════════════════════════════
// CLEANUP HELPERS
// ═══════════════════════════════════════════════════════════════════

async function fullCleanup(page) {
  try {
    await page.evaluate(() => {
      const tags = [
        "data-active-comment-box",
        "data-reply-box",
        "data-target-reply-btn",
        "data-old-editor",
        "data-active-submit",
        "data-active-reply-box",
        "data-target-comment",
      ];
      for (const tag of tags) {
        document.querySelectorAll(`[${tag}]`).forEach((el) => {
          el.removeAttribute(tag);
        });
      }
    });
  } catch {}

  // Also close blocking modals and extra tabs
  await closeBlockingModals(page);
  await closeExtraTabs(page);
}

/**
 * Close any blocking modals (Reactions popup, dialogs, etc.)
 * Uses SELECTORS.blockingModals
 */
async function closeBlockingModals(page) {
  try {
    const closed = await page.evaluate(
      ({ containers, closeButtons }) => {
        let closedCount = 0;
        const containerSel = containers.join(", ");
        const closeBtnSel = closeButtons.join(", ");

        const dialogs = document.querySelectorAll(containerSel);
        for (const dialog of dialogs) {
          const rect = dialog.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const closeBtn = dialog.querySelector(closeBtnSel);
          if (closeBtn) {
            try {
              closeBtn.click();
              closedCount++;
            } catch {}
          }
        }
        return closedCount;
      },
      {
        containers: SELECTORS.blockingModals.containers,
        closeButtons: SELECTORS.blockingModals.closeButtons,
      },
    );

    if (closed > 0) {
      console.log(`   🚪 Closed ${closed} blocking modal(s)`);
      await page.waitForTimeout(1000);
    }

    // Escape key as fallback
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// COPY POST LINK (3-dot menu → Copy link)
// ═══════════════════════════════════════════════════════════════════

export async function copyPostLink(page, postIndex) {
  console.log(`   🔗 Copying post link...`);
  await fullCleanup(page);

  try {
    // Find 3-dot menu button using SELECTORS
    let finalMenuCoords = null;
    for (const sel of SELECTORS.postCard.threeDotMenu) {
      finalMenuCoords = await scrollPostElementIntoView(page, postIndex, sel);
      if (finalMenuCoords) break;
    }

    if (!finalMenuCoords) {
      console.log(`   ⚠️  3-dot menu not found`);
      return null;
    }

    console.log(
      `   🖱️  Clicking 3-dot at (${finalMenuCoords.x}, ${finalMenuCoords.y})...`,
    );
    await humanMove(page, finalMenuCoords.x, finalMenuCoords.y);
    await randomDelay(400, 800);
    await humanClick(page, finalMenuCoords.x, finalMenuCoords.y);
    await randomDelay(2500, 4000);

    // Wait for dropdown with "Copy link"
    let dropdownReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(500);
      const has = await page.evaluate(
        ({ menuItemSel, copyText }) => {
          const items = document.querySelectorAll(menuItemSel);
          for (const item of items) {
            if ((item.textContent || "").toLowerCase().includes(copyText))
              return true;
          }
          return false;
        },
        {
          menuItemSel: SELECTORS.postDropdown.menuItem,
          copyText: SELECTORS.postDropdown.copyLinkText,
        },
      );
      if (has) {
        dropdownReady = true;
        break;
      }
    }

    if (!dropdownReady) {
      console.log(`   🔄 Retrying 3-dot with JS click...`);
      await page.evaluate(
        (data) => {
          const container = document.querySelector(
            `[${data.tag}="${data.idx}"]`,
          );
          if (!container) return;
          for (const sel of data.selectors) {
            const btn = container.querySelector(sel);
            if (btn) {
              btn.click();
              return;
            }
          }
        },
        {
          idx: postIndex,
          tag: SELECTORS.postCard.tag,
          selectors: SELECTORS.postCard.threeDotMenu,
        },
      );
      await randomDelay(2500, 4000);

      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        const has = await page.evaluate(
          ({ menuItemSel, copyText }) => {
            const items = document.querySelectorAll(menuItemSel);
            for (const item of items) {
              if ((item.textContent || "").toLowerCase().includes(copyText))
                return true;
            }
            return false;
          },
          {
            menuItemSel: SELECTORS.postDropdown.menuItem,
            copyText: SELECTORS.postDropdown.copyLinkText,
          },
        );
        if (has) {
          dropdownReady = true;
          break;
        }
      }
    }

    if (!dropdownReady) {
      console.log(`   ⚠️  Dropdown didn't appear`);
      await page.keyboard.press("Escape");
      await randomDelay(1000, 2000);
      return null;
    }

    // Click "Copy link"
    const copyCoords = await page.evaluate(
      ({ menuItemSel, copyText }) => {
        const items = document.querySelectorAll(menuItemSel);
        for (const item of items) {
          if ((item.textContent || "").toLowerCase().includes(copyText)) {
            const rect = item.getBoundingClientRect();
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
        return null;
      },
      {
        menuItemSel: SELECTORS.postDropdown.menuItem,
        copyText: SELECTORS.postDropdown.copyLinkText,
      },
    );

    if (!copyCoords) {
      await page.keyboard.press("Escape");
      return null;
    }

    console.log(`   🖱️  Clicking "Copy link"...`);
    await humanClick(page, copyCoords.x, copyCoords.y);
    await randomDelay(2500, 4000);

    // Read clipboard
    let postUrl = null;
    try {
      postUrl = await page.evaluate(async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return null;
        }
      });
    } catch {}

    if (postUrl) console.log(`   ✅ URL: ${postUrl.substring(0, 80)}`);
    else console.log(`   ⚠️  Clipboard empty`);

    // Close any modals/tabs that may have opened
    await page.keyboard.press("Escape");
    await randomDelay(1000, 2000);
    await closeBlockingModals(page);
    await closeExtraTabs(page);

    return postUrl;
  } catch (err) {
    console.log(`   ❌ Copy link error: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMMENT ON POST — Main function
// ═══════════════════════════════════════════════════════════════════

export async function commentOnPost(
  page,
  postIndex,
  commentText,
  actuallySend = false,
) {
  console.log(`   💬 Adding inline comment...`);

  // Pre-cleanup: close modals, extra tabs, remove stale tags
  await closeBlockingModals(page);
  await closeExtraTabs(page);
  await fullCleanup(page);

  try {
    // ═══ STEP 1: Mark existing editors as "old" ═══
    const editorsBefore = await page.evaluate((textboxSels) => {
      const sel = textboxSels.join(", ");
      const editors = document.querySelectorAll(sel);
      editors.forEach((el) => el.setAttribute("data-old-editor", "true"));
      return editors.length;
    }, SELECTORS.commentComposer.textbox);
    console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

    // ═══ STEP 2: Find Comment button ═══
    console.log(`   🔍 Finding Comment button for post ${postIndex}...`);
    const commentBtnCoords = await findCommentButton(page, postIndex);

    if (!commentBtnCoords) {
      console.log(`   ⚠️  Comment button not found for post ${postIndex}`);

      // Debug: show what buttons exist
      const debug = await page.evaluate(
        ({ idx, tag, iconId }) => {
          const post = document.querySelector(`[${tag}="${idx}"]`);
          if (!post) return { error: "no_post_container" };

          const allBtns = post.querySelectorAll("button");
          const btnInfo = [];
          for (const b of allBtns) {
            const text = (b.textContent || "").trim();
            const svg = b.querySelector("svg");
            const svgId = svg ? svg.getAttribute("id") : null;
            if (
              text.toLowerCase().includes("comment") ||
              (svgId && svgId.includes("comment"))
            ) {
              const rect = b.getBoundingClientRect();
              const componentkey = b.getAttribute("componentkey") || "";
              btnInfo.push({
                text: text.substring(0, 30),
                svgId,
                ck: componentkey.substring(0, 50),
                visible: rect.width > 0,
                y: Math.floor(rect.y),
              });
            }
          }
          return { totalButtons: allBtns.length, commentButtons: btnInfo };
        },
        {
          idx: postIndex,
          tag: SELECTORS.postCard.tag,
          iconId: SELECTORS.postCard.actionBarSvgIcons.comment,
        },
      );
      console.log(`   🐛 Debug:`, JSON.stringify(debug, null, 2));

      await fullCleanup(page);
      return { success: false, reason: "no_comment_button" };
    }

    console.log(
      `   ✅ Comment button found (${commentBtnCoords.method}) at (${commentBtnCoords.x}, ${commentBtnCoords.y})`,
    );

    // Click the comment button
    console.log(`   🖱️  Clicking Comment button...`);
    await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(300, 600);
    await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(2000, 3500);

    // Post-click cleanup
    await closeBlockingModals(page);
    await closeExtraTabs(page);

    // ═══ STEP 3: Wait for NEW editor ═══
    console.log(`   ⏳ Waiting for NEW editor...`);
    let editorInfo = await waitForNewEditor(page);

    if (!editorInfo) {
      // Retry via JS click
      console.log(`   🔄 Retrying Comment click via JS...`);
      await closeBlockingModals(page);
      await closeExtraTabs(page);

      await page.evaluate(
        ({ idx, tag, iconId, buttonText, submitKey }) => {
          const post = document.querySelector(`[${tag}="${idx}"]`);
          if (!post) return;

          // Find by SVG icon
          const svgs = post.querySelectorAll(`svg[id="${iconId}"]`);
          for (const svg of svgs) {
            const btn = svg.closest("button");
            if (!btn) continue;
            const text = (btn.textContent || "").trim();
            if (text !== buttonText) continue;
            const ck = btn.getAttribute("componentkey") || "";
            if (ck.includes(submitKey)) continue;
            btn.scrollIntoView({ block: "center" });
            btn.click();
            return;
          }
        },
        {
          idx: postIndex,
          tag: SELECTORS.postCard.tag,
          iconId: SELECTORS.postCard.actionBarSvgIcons.comment,
          buttonText: SELECTORS.postCard.commentButton.buttonText,
          submitKey: "commentButtonSection",
        },
      );
      await randomDelay(2500, 4000);
      await closeBlockingModals(page);
      await closeExtraTabs(page);

      editorInfo = await waitForNewEditor(page);

      if (!editorInfo) {
        console.log(`   ❌ No NEW editor after retry`);
        await fullCleanup(page);
        return { success: false, reason: "no_new_editor" };
      }
    }

    // ═══ STEP 4: Scroll editor into view ═══
    if (!editorInfo.inViewport) {
      console.log(`   📜 Scrolling editor into view...`);
      const fresh = await scrollToElementAndGetCoords(
        page,
        SELECTORS.commentComposer.activeEditorSelector,
      );
      if (fresh) editorInfo = { ...editorInfo, ...fresh, rawY: fresh.y };
    }

    // ═══ STEP 5: Click + focus editor ═══
    console.log(
      `   🖱️  Clicking editor at (${editorInfo.x}, ${editorInfo.y})...`,
    );
    await humanMove(page, editorInfo.x, editorInfo.y);
    await randomDelay(300, 600);
    await humanClick(page, editorInfo.x, editorInfo.y);
    await randomDelay(800, 1500);

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.focus();
        el.click();
      }
    }, SELECTORS.commentComposer.activeEditorSelector);
    await randomDelay(500, 1000);

    const focusOk = await page.evaluate((sel) => {
      const target = document.querySelector(sel);
      return document.activeElement === target;
    }, SELECTORS.commentComposer.activeEditorSelector);
    console.log(`   📊 Focus: ${focusOk ? "✅" : "❌"}`);

    // ═══ STEP 6: Type comment ═══
    console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
    await humanTypeText(page, commentText);
    await randomDelay(2000, 3500);

    const typedLen = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? (el.textContent || "").trim().length : 0;
    }, SELECTORS.commentComposer.activeEditorSelector);
    console.log(`   📊 Typed: ${typedLen} chars`);

    if (typedLen === 0) {
      console.log(`   ⚠️  JS fallback typing...`);
      await page.evaluate(
        ({ sel, text }) => {
          const el = document.querySelector(sel);
          if (!el) return;
          el.focus();
          try {
            document.execCommand("insertText", false, text);
          } catch {}
          if ((el.textContent || "").trim().length === 0) {
            el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        {
          sel: SELECTORS.commentComposer.activeEditorSelector,
          text: commentText,
        },
      );
      await randomDelay(1000, 1500);
    }

    if (!actuallySend) {
      console.log(`   ⚠️  Safe mode — NOT posted`);
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.keyboard.press("Escape");
      await randomDelay(1000, 2000);
      await fullCleanup(page);
      return { success: true, action: "typed_only" };
    }

    // ═══ STEP 7: Find + click submit button ═══
    console.log(`   🔍 Finding submit button...`);
    await randomDelay(1500, 2500);
    await closeBlockingModals(page);
    await closeExtraTabs(page);

    const submitInfo = await findSubmitButton(page);

    if (submitInfo.error) {
      console.log(`   ❌ Submit button error: ${submitInfo.error}`);
      if (submitInfo.editorY) {
        console.log(`   📊 Editor was at y=${Math.floor(submitInfo.editorY)}`);
      }
      await fullCleanup(page);
      return { success: false, reason: submitInfo.error };
    }

    console.log(
      `   ✅ Submit button found: "${submitInfo.text}" at y=${submitInfo.rawY}`,
    );
    console.log(
      `   📊 Editor y=${submitInfo.editorY} | Submit y=${submitInfo.rawY} | Distance=${submitInfo.distance}px`,
    );

    await randomDelay(1000, 2000);

    // CRITICAL: Get fresh coords AFTER scroll settles
    const freshSubmit = await getFreshSubmitCoords(page);

    if (!freshSubmit) {
      console.log(`   ❌ Submit button no longer visible in viewport`);
      await fullCleanup(page);
      return { success: false, reason: "submit_not_visible" };
    }

    console.log(
      `   📍 Fresh submit coords: (${freshSubmit.x}, ${freshSubmit.y})`,
    );
    console.log(
      `   🖱️  Clicking submit at (${freshSubmit.x}, ${freshSubmit.y})...`,
    );
    await humanMove(page, freshSubmit.x, freshSubmit.y);
    await randomDelay(400, 800);
    await humanClick(page, freshSubmit.x, freshSubmit.y);
    await randomDelay(3500, 5500);

    // Post-submit cleanup
    await closeBlockingModals(page);
    await closeExtraTabs(page);

    // ═══ STEP 8: Verify comment posted ═══
    const verification = await page.evaluate(
      ({ editorSel, commentDisplaySels, expectedText }) => {
        const editor = document.querySelector(editorSel);
        const editorGone = !editor;
        const editorEmpty = editor
          ? (editor.textContent || "").trim().length === 0
          : true;

        const searchText = expectedText.substring(0, 30).toLowerCase();
        const displaySel = commentDisplaySels.join(", ");
        const allComments = document.querySelectorAll(displaySel);
        let foundInComments = false;
        for (const c of allComments) {
          if ((c.textContent || "").toLowerCase().includes(searchText)) {
            foundInComments = true;
            break;
          }
        }

        return { editorGone, editorEmpty, foundInComments };
      },
      {
        editorSel: SELECTORS.commentComposer.activeEditorSelector,
        commentDisplaySels: SELECTORS.commentComposer.commentDisplaySelectors,
        expectedText: commentText,
      },
    );

    console.log(
      `   📊 Verify: editorGone=${verification.editorGone}, editorEmpty=${verification.editorEmpty}, foundInComments=${verification.foundInComments}`,
    );

    await fullCleanup(page);

    // SUCCESS conditions
    if (verification.foundInComments) {
      console.log(`   ✅ Comment POSTED and VERIFIED in DOM!`);
      return { success: true, action: "commented" };
    }

    if (verification.editorEmpty || verification.editorGone) {
      // Editor cleared = LinkedIn accepted the comment
      // On search results page, comments don't render inline
      console.log(`   ✅ Comment SUBMITTED (editor cleared by LinkedIn)`);
      return { success: true, action: "commented" };
    }

    console.log(`   ❌ Comment NOT posted — editor still has text`);
    return { success: false, reason: "comment_not_posted" };
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    await closeBlockingModals(page);
    await closeExtraTabs(page);
    await fullCleanup(page);
    return { success: false, reason: "error", error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FIND COMMENT BUTTON (action bar — opens the editor)
// Uses: SELECTORS.postCard.actionBarSvgIcons.comment ("comment-small")
//       SELECTORS.postCard.commentButton.buttonText ("Comment")
//       SELECTORS.postCard.commentButton.ariaLabel (legacy)
// ═══════════════════════════════════════════════════════════════════

async function findCommentButton(page, postIndex) {
  const iconId = SELECTORS.postCard.actionBarSvgIcons.comment;
  const buttonText = SELECTORS.postCard.commentButton.buttonText;
  const legacyAria = SELECTORS.postCard.commentButton.ariaLabel;
  const postTag = SELECTORS.postCard.tag;
  const submitKey = "commentButtonSection";

  const coords = await page.evaluate(
    ({ idx, postTag, iconId, buttonText, legacyAria, submitKey }) => {
      const post = document.querySelector(`[${postTag}="${idx}"]`);
      if (!post) return { error: "no_post_container" };

      // ─── Strategy 1: SVG icon id ───
      const svgs = post.querySelectorAll(`svg[id="${iconId}"]`);
      for (const svg of svgs) {
        const btn = svg.closest("button");
        if (!btn) continue;
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (btn.textContent || "").trim();
        if (text !== buttonText) continue;
        const ck = btn.getAttribute("componentkey") || "";
        if (ck.includes(submitKey)) continue;
        btn.scrollIntoView({ block: "center", behavior: "instant" });
        const fresh = btn.getBoundingClientRect();
        return {
          x: Math.floor(fresh.x + fresh.width / 2),
          y: Math.floor(fresh.y + fresh.height / 2),
          method: "svg_icon_" + iconId,
        };
      }

      // ─── Strategy 2: Text + SVG ───
      const allBtns = post.querySelectorAll("button");
      const candidates = [];
      for (const btn of allBtns) {
        const text = (btn.textContent || "").trim();
        if (text !== buttonText) continue;
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (!btn.querySelector("svg")) continue;
        const ck = btn.getAttribute("componentkey") || "";
        if (ck.includes(submitKey)) continue;
        candidates.push({ btn, rect });
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.rect.y - b.rect.y);
        const chosen = candidates[0];
        chosen.btn.scrollIntoView({ block: "center", behavior: "instant" });
        const fresh = chosen.btn.getBoundingClientRect();
        return {
          x: Math.floor(fresh.x + fresh.width / 2),
          y: Math.floor(fresh.y + fresh.height / 2),
          method: "text_with_svg",
        };
      }

      // ─── Strategy 3: Legacy aria-label ───
      const ariaBtns = post.querySelectorAll(legacyAria);
      for (const btn of ariaBtns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const ck = btn.getAttribute("componentkey") || "";
        if (ck.includes(submitKey)) continue;
        btn.scrollIntoView({ block: "center", behavior: "instant" });
        const fresh = btn.getBoundingClientRect();
        return {
          x: Math.floor(fresh.x + fresh.width / 2),
          y: Math.floor(fresh.y + fresh.height / 2),
          method: "legacy_aria",
        };
      }

      return { error: "no_button_found" };
    },
    { idx: postIndex, postTag, iconId, buttonText, legacyAria, submitKey },
  );

  if (coords.error) return null;

  await page.waitForTimeout(800);

  // Re-fetch fresh coords after scroll settles
  const freshCoords = await page.evaluate(
    ({ idx, postTag, iconId, buttonText, submitKey }) => {
      const post = document.querySelector(`[${postTag}="${idx}"]`);
      if (!post) return null;

      const svg = post.querySelector(`svg[id="${iconId}"]`);
      if (svg) {
        const btn = svg.closest("button");
        if (btn) {
          const text = (btn.textContent || "").trim();
          if (text === buttonText) {
            const ck = btn.getAttribute("componentkey") || "";
            if (!ck.includes(submitKey)) {
              const r = btn.getBoundingClientRect();
              if (r.width > 0)
                return {
                  x: Math.floor(r.x + r.width / 2),
                  y: Math.floor(r.y + r.height / 2),
                };
            }
          }
        }
      }

      const allBtns = post.querySelectorAll("button");
      for (const btn of allBtns) {
        if ((btn.textContent || "").trim() !== buttonText) continue;
        const ck = btn.getAttribute("componentkey") || "";
        if (ck.includes(submitKey)) continue;
        if (!btn.querySelector("svg")) continue;
        const r = btn.getBoundingClientRect();
        if (r.width === 0) continue;
        return {
          x: Math.floor(r.x + r.width / 2),
          y: Math.floor(r.y + r.height / 2),
        };
      }
      return null;
    },
    { idx: postIndex, postTag, iconId, buttonText, submitKey },
  );

  if (freshCoords) {
    return { ...freshCoords, method: coords.method };
  }
  return coords;
}

// ═══════════════════════════════════════════════════════════════════
// WAIT FOR NEW EDITOR (reusable helper)
// Uses: SELECTORS.commentComposer.textbox
//       SELECTORS.commentComposer.tag
// ═══════════════════════════════════════════════════════════════════

async function waitForNewEditor(page) {
  const textboxSels = SELECTORS.commentComposer.textbox;
  const tag = SELECTORS.commentComposer.tag;

  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(800);

    // Close modals every 5 iterations
    if (i > 0 && i % 5 === 0) {
      await closeBlockingModals(page);
      await closeExtraTabs(page);
    }

    const editorInfo = await page.evaluate(
      ({ sels, tag }) => {
        const sel = sels.join(", ");
        const editors = document.querySelectorAll(sel);
        for (const editor of editors) {
          if (editor.hasAttribute("data-old-editor")) continue;
          const rect = editor.getBoundingClientRect();
          if (rect.width > 50) {
            editor.setAttribute(tag, "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              w: Math.floor(rect.width),
              h: Math.floor(rect.height),
              rawY: Math.floor(rect.y),
              inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
            };
          }
        }
        return null;
      },
      { sels: textboxSels, tag },
    );

    if (editorInfo) {
      console.log(
        `   ✅ NEW editor found (${editorInfo.w}x${editorInfo.h}) at y=${editorInfo.rawY}`,
      );
      return editorInfo;
    }

    if (i > 0 && i % 5 === 0) {
      console.log(`   ⏳ Still waiting for editor... (${i}/25)`);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// FIND SUBMIT BUTTON (must be BELOW editor, in same composer wrapper)
// Uses: SELECTORS.commentComposer.submitButton
//       SELECTORS.commentComposer.submitButtonTexts
//       SELECTORS.commentComposer.activeEditorSelector
//       SELECTORS.commentComposer.editorInsideCheck
// ═══════════════════════════════════════════════════════════════════

async function findSubmitButton(page) {
  return await page.evaluate(
    ({ editorSel, submitSel, submitTexts, insideCheckSels, submitTag }) => {
      const editor = document.querySelector(editorSel);
      if (!editor) return { error: "no_editor" };

      const editorRect = editor.getBoundingClientRect();
      const editorY = editorRect.y + editorRect.height / 2;

      // Walk up from editor to find composer wrapper
      let composerWrapper = null;
      let candidate = editor.parentElement;
      const insideCheckSel = insideCheckSels.join(", ");

      for (let i = 0; i < 10; i++) {
        if (!candidate) break;
        const submitBtn = candidate.querySelector(submitSel);
        if (submitBtn) {
          const editorsInside = candidate.querySelectorAll(insideCheckSel);
          let ourEditorInside = false;
          for (const e of editorsInside) {
            if (e === editor) {
              ourEditorInside = true;
              break;
            }
          }
          if (ourEditorInside) {
            composerWrapper = candidate;
            break;
          }
        }
        candidate = candidate.parentElement;
      }

      if (!composerWrapper) {
        return { error: "no_composer_wrapper_found", editorY };
      }

      const submitButtons = composerWrapper.querySelectorAll(submitSel);
      let bestBtn = null;
      let bestDistance = Infinity;

      for (const btn of submitButtons) {
        const text = (btn.textContent || "").trim();
        if (!submitTexts.includes(text)) continue;
        if (btn.hasAttribute("disabled")) continue;

        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const btnY = rect.y + rect.height / 2;
        if (btnY <= editorY) continue;

        const distance = btnY - editorY;
        if (distance > 500) continue;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestBtn = btn;
        }
      }

      if (!bestBtn) {
        return {
          error: "no_valid_submit_below_editor",
          editorY,
          candidateCount: submitButtons.length,
        };
      }

      bestBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      bestBtn.setAttribute(submitTag, "true");

      const rect = bestBtn.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
        rawY: Math.floor(rect.y),
        editorY: Math.floor(editorY),
        distance: Math.floor(bestDistance),
        text: (bestBtn.textContent || "").trim(),
      };
    },
    {
      editorSel: SELECTORS.commentComposer.activeEditorSelector,
      submitSel: SELECTORS.commentComposer.submitButton,
      submitTexts: SELECTORS.commentComposer.submitButtonTexts,
      insideCheckSels: SELECTORS.commentComposer.editorInsideCheck,
      submitTag: SELECTORS.commentComposer.submitTag,
    },
  );
}

// ═══════════════════════════════════════════════════════════════════
// GET FRESH SUBMIT COORDS — always call after findSubmitButton
// Scrolls button into viewport if needed, returns accurate coords
// ═══════════════════════════════════════════════════════════════════

async function getFreshSubmitCoords(page) {
  await page.waitForTimeout(500); // wait for scroll to settle

  return await page.evaluate((submitSel) => {
    const btn = document.querySelector(submitSel);
    if (!btn) return null;

    let rect = btn.getBoundingClientRect();

    // If button is outside viewport, scroll it in
    if (rect.y < 50 || rect.y > window.innerHeight - 50) {
      btn.scrollIntoView({ block: "center", behavior: "instant" });
      rect = btn.getBoundingClientRect();
    }

    if (rect.width === 0 || rect.height === 0) return null;
    if (rect.y < 0 || rect.y > window.innerHeight) return null;

    return {
      x: Math.floor(rect.x + rect.width / 2),
      y: Math.floor(rect.y + rect.height / 2),
    };
  }, SELECTORS.commentComposer.activeSubmitSelector);
}

// ═══════════════════════════════════════════════════════════════════
// REPLY TO COMMENT (on search results page inline)
// ═══════════════════════════════════════════════════════════════════

export async function replyToComment(
  page,
  postIndex,
  targetAuthorName,
  replyText,
  actuallySend = false,
) {
  console.log(`   ↩️  Replying to ${targetAuthorName}...`);
  await fullCleanup(page);

  try {
    const replyBtnCoords = await page.evaluate(
      (data) => {
        const container = document.querySelector(
          `[${data.postTag}="${data.idx}"]`,
        );
        if (!container) return null;
        const commentItemSel = data.commentItemSels.join(", ");
        const comments = container.querySelectorAll(commentItemSel);

        for (const comment of comments) {
          const nameEl = comment.querySelector(data.commentAuthorNameSel);
          if (!nameEl) continue;
          const name = (nameEl.textContent || "").trim().split("\n")[0].trim();
          if (
            !name
              .toLowerCase()
              .includes(data.targetName.split(" ")[0].toLowerCase())
          )
            continue;

          const replyBtn = comment.querySelector(data.replyButtonSel);
          if (replyBtn) {
            replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
            const rect = replyBtn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
        return null;
      },
      {
        idx: postIndex,
        postTag: SELECTORS.postCard.tag,
        targetName: targetAuthorName,
        commentItemSels: SELECTORS.commentsSection.commentItem,
        commentAuthorNameSel: SELECTORS.commentsSection.commentAuthorName,
        replyButtonSel: SELECTORS.commentsSection.commentReplyButton,
      },
    );

    if (!replyBtnCoords) return { success: false, reason: "no_reply_button" };

    // Mark existing editors as old
    await page.evaluate((textboxSels) => {
      const sel = textboxSels.join(", ");
      document.querySelectorAll(sel).forEach((el) => {
        el.setAttribute("data-old-editor", "true");
      });
    }, SELECTORS.commentComposer.textbox);

    await randomDelay(1000, 1800);
    await humanClick(page, replyBtnCoords.x, replyBtnCoords.y);
    await randomDelay(2500, 4000);

    // Wait for new editor
    let editorInfo = null;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(700);
      editorInfo = await page.evaluate((textboxSels) => {
        const sel = textboxSels.join(", ");
        const editors = document.querySelectorAll(sel);
        for (const el of editors) {
          if (el.hasAttribute("data-old-editor")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 50) {
            el.setAttribute("data-reply-box", "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              editorY: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
        return null;
      }, SELECTORS.commentComposer.textbox);
      if (editorInfo) break;
    }

    if (!editorInfo) {
      await fullCleanup(page);
      return { success: false, reason: "no_reply_editor" };
    }

    await humanClick(page, editorInfo.x, editorInfo.y);
    await randomDelay(800, 1500);
    await page.evaluate(() => {
      const el = document.querySelector('[data-reply-box="true"]');
      if (el) {
        el.focus();
        el.click();
      }
    });

    console.log(`   ⌨️  Typing reply (${replyText.length} chars)...`);
    await humanTypeText(page, replyText);
    await randomDelay(2000, 3500);

    if (!actuallySend) {
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.keyboard.press("Escape");
      await fullCleanup(page);
      return { success: true, action: "typed_only" };
    }

    // Find submit button
    const submitInfo = await page.evaluate(
      ({ submitSel, submitTexts }) => {
        const editor = document.querySelector('[data-reply-box="true"]');
        if (!editor) return { error: "no_editor" };
        const editorRect = editor.getBoundingClientRect();
        const editorY = editorRect.y + editorRect.height / 2;

        let form = editor.closest("form");
        if (!form) {
          let candidate = editor.parentElement;
          for (let i = 0; i < 8; i++) {
            if (!candidate) break;
            const btn = candidate.querySelector(submitSel);
            if (btn) {
              form = candidate;
              break;
            }
            candidate = candidate.parentElement;
          }
        }
        if (!form) return { error: "no_form" };

        const buttons = form.querySelectorAll(submitSel);
        let bestBtn = null;
        let bestDist = Infinity;

        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          if (!submitTexts.includes(text)) continue;
          if (btn.hasAttribute("disabled")) continue;
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0) continue;
          const btnY = rect.y + rect.height / 2;
          if (btnY <= editorY) continue;
          const dist = btnY - editorY;
          if (dist > 400) continue;
          if (dist < bestDist) {
            bestDist = dist;
            bestBtn = btn;
          }
        }

        if (!bestBtn) return { error: "no_valid_submit" };

        bestBtn.scrollIntoView({ block: "center" });
        const rect = bestBtn.getBoundingClientRect();
        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      },
      {
        submitSel: SELECTORS.commentComposer.submitButton,
        submitTexts: SELECTORS.commentComposer.submitButtonTexts,
      },
    );

    if (submitInfo.error) {
      await fullCleanup(page);
      return { success: false, reason: submitInfo.error };
    }

    await randomDelay(800, 1500);
    await humanClick(page, submitInfo.x, submitInfo.y);
    await randomDelay(3000, 5000);
    await fullCleanup(page);

    console.log(`   ✅ Replied to ${targetAuthorName}!`);
    return { success: true, action: "replied" };
  } catch (err) {
    console.log(`   ❌ Reply error: ${err.message}`);
    await fullCleanup(page);
    return { success: false, reason: "error" };
  }
}

// ═══════════════════════════════════════════════════════════════════
// REPLY TO SPECIFIC COMMENT (on individual post page)
// ═══════════════════════════════════════════════════════════════════

export async function replyToSpecificComment(
  page,
  targetName,
  replyText,
  actuallySend = false,
  targetCommentId = null,
) {
  console.log(`   ↩️  Replying to ${targetName}'s comment...`);
  if (targetCommentId) {
    console.log(`      Target comment ID: ${targetCommentId}`);
  }
  await fullCleanup(page);

  try {
    // ═══ STEP 1: Scroll to comments ═══
    console.log(`   📜 Scrolling down to find comment...`);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() =>
        window.scrollBy({ top: 300, behavior: "smooth" }),
      );
      await randomDelay(600, 1200);
    }

    // ═══ STEP 2: Find the exact target comment ═══
    console.log(`   🔍 Locating exact comment...`);
    const commentLocation = await page.evaluate(
      (data) => {
        const {
          targetName,
          targetCommentId,
          commentItemSels,
          authorNameSel,
          metaDescSel,
        } = data;
        const targetFirstName = targetName.split(" ")[0].toLowerCase();
        const commentItemSel = commentItemSels.join(", ");
        let targetCommentEl = null;

        // PRIORITY 1: Match by data-id
        if (targetCommentId) {
          targetCommentEl = document.querySelector(
            `article[data-id="${targetCommentId}"], [data-id="${targetCommentId}"]`,
          );
          if (targetCommentEl) {
            targetCommentEl.setAttribute("data-target-comment", "true");
            targetCommentEl.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
            const nameEl = targetCommentEl.querySelector(authorNameSel);
            return {
              found: true,
              matchedBy: "id",
              matchedName: nameEl
                ? (nameEl.textContent || "").trim()
                : "unknown",
            };
          }
        }

        // PRIORITY 2: Find by name
        const commentEls = document.querySelectorAll(commentItemSel);

        // Find our comment first
        let ourCommentEl = null;
        for (const el of commentEls) {
          const metaText = el.querySelector(metaDescSel)?.textContent || "";
          if (metaText.includes("• You")) {
            ourCommentEl = el;
            break;
          }
        }

        // Look in our comment's replies first
        if (ourCommentEl) {
          const repliesContainer = ourCommentEl.querySelector(
            ".comments-replies-list, [class*='comments-replies-list']",
          );
          if (repliesContainer) {
            const nestedReplies =
              repliesContainer.querySelectorAll(commentItemSel);
            for (const replyEl of nestedReplies) {
              const nameEl = replyEl.querySelector(authorNameSel);
              if (!nameEl) continue;
              const name = (nameEl.textContent || "").trim().toLowerCase();
              if (!name.includes(targetFirstName)) continue;
              const metaText =
                replyEl.querySelector(metaDescSel)?.textContent || "";
              if (metaText.includes("• You")) continue;
              targetCommentEl = replyEl;
              break;
            }
          }
        }

        // Fallback: search all comments
        if (!targetCommentEl) {
          for (const commentEl of commentEls) {
            const nameEl = commentEl.querySelector(authorNameSel);
            if (!nameEl) continue;
            const commenterName = (nameEl.textContent || "")
              .trim()
              .toLowerCase();
            if (!commenterName.includes(targetFirstName)) continue;
            const metaText =
              commentEl.querySelector(metaDescSel)?.textContent || "";
            if (metaText.includes("• You")) continue;
            targetCommentEl = commentEl;
            break;
          }
        }

        if (!targetCommentEl) return { found: false };

        targetCommentEl.setAttribute("data-target-comment", "true");
        targetCommentEl.scrollIntoView({ block: "center", behavior: "smooth" });
        const nameEl = targetCommentEl.querySelector(authorNameSel);
        const isReplyToUs =
          targetCommentEl.closest(".comments-replies-list") !== null;

        return {
          found: true,
          matchedBy: isReplyToUs ? "nested_reply_to_us" : "top_level",
          matchedName: nameEl ? (nameEl.textContent || "").trim() : "unknown",
        };
      },
      {
        targetName,
        targetCommentId,
        commentItemSels: SELECTORS.commentsSection.commentItem,
        authorNameSel: SELECTORS.commentsSection.commentAuthorName,
        metaDescSel: SELECTORS.commentsSection.commentMetaDescription,
      },
    );

    if (!commentLocation.found) {
      console.log(`   ❌ Comment from "${targetName}" not found`);
      return { success: false, reason: "comment_not_found" };
    }

    console.log(
      `   ✅ Found comment (${commentLocation.matchedBy}): ${commentLocation.matchedName}`,
    );
    await randomDelay(2500, 4000);

    // ═══ STEP 3: Find Reply button ═══
    console.log(`   🔍 Finding Reply button on target comment...`);
    const replyBtnCoords = await page.evaluate(
      ({ socialBarSel, replyBtnSel }) => {
        const commentEl = document.querySelector(
          '[data-target-comment="true"]',
        );
        if (!commentEl) return null;

        const socialBars = commentEl.querySelectorAll(socialBarSel);
        let socialBar = null;
        for (const bar of socialBars) {
          const parentComment = bar.closest("article.comments-comment-entity");
          if (parentComment === commentEl) {
            socialBar = bar;
            break;
          }
        }
        if (!socialBar) return null;

        const replyBtn = socialBar.querySelector(replyBtnSel);
        if (!replyBtn) return null;

        replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
        const rect = replyBtn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
          inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
        };
      },
      {
        socialBarSel: SELECTORS.commentsSection.commentSocialBar,
        replyBtnSel: SELECTORS.commentsSection.commentReplyButton,
      },
    );

    if (!replyBtnCoords) {
      console.log(`   ❌ Reply button not found on target comment`);
      return { success: false, reason: "reply_button_not_found" };
    }

    await randomDelay(1500, 2500);

    // Refresh coords
    const freshBtnCoords = await page.evaluate(
      ({ socialBarSel, replyBtnSel }) => {
        const commentEl = document.querySelector(
          '[data-target-comment="true"]',
        );
        if (!commentEl) return null;
        const socialBars = commentEl.querySelectorAll(socialBarSel);
        for (const bar of socialBars) {
          const parentComment = bar.closest("article.comments-comment-entity");
          if (parentComment === commentEl) {
            const btn = bar.querySelector(replyBtnSel);
            if (btn) {
              const rect = btn.getBoundingClientRect();
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
        return null;
      },
      {
        socialBarSel: SELECTORS.commentsSection.commentSocialBar,
        replyBtnSel: SELECTORS.commentsSection.commentReplyButton,
      },
    );

    const finalBtnCoords = freshBtnCoords || replyBtnCoords;
    console.log(
      `   👀 Reply button at (${finalBtnCoords.x}, ${finalBtnCoords.y})`,
    );

    // ═══ STEP 4: Mark existing editors ═══
    await page.evaluate(() => {
      document.querySelectorAll('div[contenteditable="true"]').forEach((el) => {
        el.setAttribute("data-old-editor", "true");
      });
    });

    // ═══ STEP 5: Click Reply ═══
    console.log(`   🖱️  Clicking Reply button...`);
    await page.mouse.move(finalBtnCoords.x, finalBtnCoords.y, { steps: 20 });
    await randomDelay(500, 1000);
    await page.mouse.click(finalBtnCoords.x, finalBtnCoords.y);
    await randomDelay(3000, 5000);

    // ═══ STEP 6: Wait for reply editor ═══
    console.log(`   ⏳ Waiting for reply editor...`);
    let editorInfo = null;

    const replyTextboxSels = SELECTORS.replyComposer.textbox;

    for (let attempt = 1; attempt <= 20; attempt++) {
      await page.waitForTimeout(700);

      editorInfo = await page.evaluate((sels) => {
        for (const sel of sels) {
          const editors = document.querySelectorAll(sel);
          for (const el of editors) {
            if (el.hasAttribute("data-old-editor")) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 10) {
              el.setAttribute("data-active-reply-box", "true");
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
                w: Math.floor(rect.width),
                h: Math.floor(rect.height),
                inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
                rawY: Math.floor(rect.y),
                selectorUsed: sel,
              };
            }
          }
        }
        return null;
      }, replyTextboxSels);

      if (editorInfo) {
        console.log(`   ✅ Editor found (${editorInfo.selectorUsed})`);
        break;
      }

      if (attempt % 5 === 0) {
        console.log(`   ⏳ Still waiting... ${attempt}/20s`);
      }
    }

    // Retry click if editor didn't appear
    if (!editorInfo) {
      console.log(`   🔄 Retrying Reply click via JS...`);
      await page.evaluate(
        ({ socialBarSel, replyBtnSel }) => {
          const commentEl = document.querySelector(
            '[data-target-comment="true"]',
          );
          if (!commentEl) return;
          const socialBars = commentEl.querySelectorAll(socialBarSel);
          for (const bar of socialBars) {
            const parentComment = bar.closest(
              "article.comments-comment-entity",
            );
            if (parentComment === commentEl) {
              const btn = bar.querySelector(replyBtnSel);
              if (btn) {
                btn.scrollIntoView({ block: "center" });
                btn.click();
                break;
              }
            }
          }
        },
        {
          socialBarSel: SELECTORS.commentsSection.commentSocialBar,
          replyBtnSel: SELECTORS.commentsSection.commentReplyButton,
        },
      );
      await randomDelay(3000, 5000);

      editorInfo = await page.evaluate(() => {
        const editors = document.querySelectorAll(
          'div[contenteditable="true"]:not([data-old-editor])',
        );
        for (const el of editors) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 50) {
            el.setAttribute("data-active-reply-box", "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
            };
          }
        }
        return null;
      });

      if (!editorInfo) {
        console.log(`   ❌ Reply editor never appeared`);
        await fullCleanup(page);
        return { success: false, reason: "no_editor" };
      }
      console.log(`   ✅ Editor found on retry`);
    }

    // ═══ STEP 7: Scroll editor into center ═══
    if (!editorInfo.inViewport) {
      console.log(`   📜 Scrolling editor into center...`);
      await page.evaluate(() => {
        const el = document.querySelector('[data-active-reply-box="true"]');
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      await randomDelay(2000, 3000);

      const fresh = await page.evaluate(() => {
        const el = document.querySelector('[data-active-reply-box="true"]');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: Math.floor(rect.x + rect.width / 2),
          y: Math.floor(rect.y + rect.height / 2),
        };
      });
      if (fresh) editorInfo = { ...editorInfo, ...fresh };
    }

    // ═══ STEP 8: Click editor + focus ═══
    await page.mouse.move(editorInfo.x, editorInfo.y, { steps: 15 });
    await randomDelay(400, 800);
    await page.mouse.click(editorInfo.x, editorInfo.y);
    await randomDelay(800, 1500);

    await page.evaluate(() => {
      const el = document.querySelector('[data-active-reply-box="true"]');
      if (el) {
        el.focus();
        el.click();
      }
    });
    await randomDelay(500, 1000);

    // ═══ STEP 9: Type reply ═══
    // ═══ STEP 9: Type reply ═══
    // CRITICAL: LinkedIn auto-inserts a mention when replying to nested comments.
    // We MUST verify the auto-mention matches our target BEFORE typing.

    console.log(`   🔍 Checking for auto-inserted mention in editor...`);
    await randomDelay(500, 1000);

    const autoMention = await page.evaluate((expectedTargetName) => {
      const el = document.querySelector('[data-active-reply-box="true"]');
      if (!el) return { hasEditor: false };

      const editorText = (el.textContent || "").trim();
      const expectedFirstName = expectedTargetName.split(" ")[0].toLowerCase();
      const expectedLastName = expectedTargetName
        .split(" ")
        .slice(-1)[0]
        .toLowerCase();

      // Check for mention links inside editor
      const mentionLinks = el.querySelectorAll(
        'a[href*="/in/"], span.ql-mention, a.ql-mention',
      );
      const mentionedNames = [];
      for (const link of mentionLinks) {
        const text = (link.textContent || "").trim().toLowerCase();
        if (text) mentionedNames.push(text);
      }

      // Determine if auto-mention exists
      if (editorText.length === 0 && mentionedNames.length === 0) {
        return { hasEditor: true, hasAutoMention: false };
      }

      // Check if any mention matches our target
      const editorTextLower = editorText.toLowerCase();
      const matchesTarget =
        editorTextLower.includes(expectedFirstName) ||
        editorTextLower.includes(expectedLastName) ||
        mentionedNames.some(
          (n) => n.includes(expectedFirstName) || n.includes(expectedLastName),
        );

      return {
        hasEditor: true,
        hasAutoMention: editorText.length > 0 || mentionedNames.length > 0,
        currentText: editorText,
        mentionedNames,
        matchesTarget,
        expectedFirstName,
      };
    }, targetName);

    if (!autoMention.hasEditor) {
      console.log(`   ❌ Editor disappeared before typing`);
      await fullCleanup(page);
      return { success: false, reason: "editor_disappeared" };
    }

    if (autoMention.hasAutoMention) {
      console.log(
        `   🏷️  Auto-mention detected: "${autoMention.currentText.substring(0, 60)}..."`,
      );
      console.log(
        `   🎯 Mentioned names: [${autoMention.mentionedNames.join(", ")}]`,
      );
      console.log(`   🎯 Expected target: "${targetName}"`);
      console.log(
        `   🎯 Matches target: ${autoMention.matchesTarget ? "✅" : "❌"}`,
      );

      if (!autoMention.matchesTarget) {
        // WRONG mention — abort to prevent replying to wrong person
        console.log(
          `   🚫 WRONG mention detected — aborting reply to protect account`,
        );
        console.log(`      Expected: ${targetName}`);
        console.log(
          `      Got:      ${autoMention.mentionedNames.join(", ") || autoMention.currentText}`,
        );

        // Cancel the reply
        await page.keyboard.press("Escape").catch(() => {});
        await randomDelay(1000, 2000);
        await fullCleanup(page);
        return { success: false, reason: "wrong_mention_auto_inserted" };
      }

      // Correct mention — move cursor to end, add space, then type
      console.log(`   ✅ Mention correct — appending our text after it`);
      await page.keyboard.press("End");
      await randomDelay(300, 500);
      await page.keyboard.type(" ");
      await randomDelay(200, 400);
    } else {
      console.log(`   ℹ️  No auto-mention detected — typing directly`);
    }

    // Now type our reply
    console.log(`   ⌨️  Typing reply (${replyText.length} chars)...`);
    for (let i = 0; i < replyText.length; i++) {
      // Guard against page closure mid-typing
      if (page.isClosed()) {
        console.log(`   ❌ Page closed during typing`);
        return { success: false, reason: "page_closed_during_typing" };
      }

      const char = replyText[i];
      await page.keyboard.type(char, { delay: 40 + Math.random() * 60 });
      if (Math.random() < 0.03 && i > 10) {
        await page.waitForTimeout(400 + Math.random() * 800);
      }
    }
    await randomDelay(2000, 3500);

    const typedLen = await page.evaluate(() => {
      const el = document.querySelector('[data-active-reply-box="true"]');
      return el ? (el.textContent || "").trim().length : 0;
    });
    console.log(`   📊 Chars in editor: ${typedLen}`);

    if (typedLen < replyText.length / 2) {
      console.log(`   ⚠️  Typing incomplete — JS fallback...`);
      await page.evaluate((text) => {
        const el = document.querySelector('[data-active-reply-box="true"]');
        if (!el) return;
        el.focus();
        try {
          document.execCommand("insertText", false, text);
        } catch {}
        if ((el.textContent || "").trim().length < text.length / 2) {
          el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, replyText);
      await randomDelay(1000, 1500);
    }

    if (!actuallySend) {
      console.log(`   ⚠️  Safe mode — NOT posting`);
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.keyboard.press("Escape");
      await fullCleanup(page);
      return { success: true, action: "typed_only" };
    }

    // ═══ STEP 10: Find and click Submit ═══
    console.log(`   🔍 Finding Submit button...`);
    await randomDelay(1000, 1500);

    const submitSels = SELECTORS.replyComposer.submitButton;
    const submitSelJoined =
      typeof submitSels === "string" ? submitSels : submitSels.join(", ");

    const submitCoords = await page.evaluate(
      ({ submitSelJoined, submitTexts }) => {
        const editor = document.querySelector('[data-active-reply-box="true"]');
        if (!editor) return null;

        let parent = editor.parentElement;
        for (let i = 0; i < 12; i++) {
          if (!parent) break;

          const submitBtn = parent.querySelector(submitSelJoined);
          if (submitBtn) {
            const text = (submitBtn.textContent || "").trim();
            if (
              submitTexts.includes(text) &&
              !submitBtn.hasAttribute("disabled")
            ) {
              submitBtn.scrollIntoView({ block: "center", behavior: "smooth" });
              const rect = submitBtn.getBoundingClientRect();
              if (rect.width > 0) {
                return {
                  x: Math.floor(rect.x + rect.width / 2),
                  y: Math.floor(rect.y + rect.height / 2),
                  text,
                };
              }
            }
          }
          parent = parent.parentElement;
        }
        return null;
      },
      {
        submitSelJoined,
        submitTexts: SELECTORS.replyComposer.submitButtonTexts,
      },
    );

    if (!submitCoords) {
      console.log(`   ❌ Submit button not found`);
      await fullCleanup(page);
      return { success: false, reason: "no_submit" };
    }

    console.log(`   ✅ Submit button found: "${submitCoords.text}"`);
    await randomDelay(1000, 1500);

    // Fresh coords
    const freshSubmit = await page.evaluate(
      ({ submitSelJoined, submitTexts }) => {
        const btns = document.querySelectorAll(submitSelJoined);
        for (const btn of btns) {
          const text = (btn.textContent || "").trim();
          if (submitTexts.includes(text) && !btn.hasAttribute("disabled")) {
            const rect = btn.getBoundingClientRect();
            if (
              rect.width > 0 &&
              rect.y > 50 &&
              rect.y < window.innerHeight - 50
            ) {
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
        return null;
      },
      {
        submitSelJoined,
        submitTexts: SELECTORS.replyComposer.submitButtonTexts,
      },
    );

    const finalSubmit = freshSubmit || submitCoords;

    console.log(
      `   🖱️  Clicking Submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
    );
    await page.mouse.move(finalSubmit.x, finalSubmit.y, { steps: 15 });
    await randomDelay(500, 1000);
    await page.mouse.click(finalSubmit.x, finalSubmit.y);
    await randomDelay(3000, 5000);

    console.log(`   ✅ Reply POSTED to ${targetName}!`);
    await fullCleanup(page);
    return { success: true, action: "replied" };
  } catch (err) {
    console.log(`   ❌ Reply error: ${err.message}`);
    await fullCleanup(page);
    return { success: false, reason: "error", error: err.message };
  }
}
