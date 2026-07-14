// import { humanClick, humanTypeText, humanMove } from "../../helpers/human-click.helper.js";
// import { randomDelay } from "../../helpers/delay.helper.js";
// import { scrollPostElementIntoView, scrollToElementAndGetCoords } from "../../helpers/scroll.helper.js";
// import SELECTORS from "../../config/selectors.js";

// /**
//  * Cleanup ALL comment box tags from ALL posts
//  * Called at START of every comment/copy operation to prevent stale tags
//  */
// async function fullCleanup(page) {
//   try {
//     await page.evaluate(() => {
//       document.querySelectorAll('[data-active-comment-box]').forEach((el) => {
//         el.removeAttribute("data-active-comment-box");
//       });
//       document.querySelectorAll('[data-reply-box]').forEach((el) => {
//         el.removeAttribute("data-reply-box");
//       });
//       document.querySelectorAll('[data-target-reply-btn]').forEach((el) => {
//         el.removeAttribute("data-target-reply-btn");
//       });
//     });
//   } catch {}
// }

// /**
//  * Close any open comment editors by pressing Escape
//  * Called after successful post to ensure clean state
//  */
// async function closeOpenEditors(page) {
//   try {
//     await page.keyboard.press("Escape");
//     await randomDelay(500, 1000);
//     // Click somewhere neutral
//     await page.evaluate(() => {
//       const main = document.querySelector('main');
//       if (main) {
//         const rect = main.getBoundingClientRect();
//         // Click empty space at top
//       }
//     });
//   } catch {}
// }

// /**
//  * Copy post link via 3-dot menu
//  */
// export async function copyPostLink(page, postIndex) {
//   console.log(`   🔗 Copying post link...`);

//   // Cleanup before starting
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

//     console.log(`   🖱️  Clicking 3-dot at (${finalMenuCoords.x}, ${finalMenuCoords.y})...`);
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
//           if ((item.textContent || "").toLowerCase().includes("copy link")) return true;
//         }
//         return false;
//       }, SELECTORS.postDropdown.menuItem);
//       if (has) { dropdownReady = true; break; }
//     }

//     if (!dropdownReady) {
//       console.log(`   🔄 Retrying 3-dot with JS click...`);
//       await page.evaluate((data) => {
//         const container = document.querySelector(`[data-post-index="${data.idx}"]`);
//         if (!container) return;
//         for (const sel of data.selectors) {
//           const btn = container.querySelector(sel);
//           if (btn) { btn.click(); return; }
//         }
//       }, { idx: postIndex, selectors: SELECTORS.postCard.threeDotMenu });
//       await randomDelay(2500, 4000);

//       for (let i = 0; i < 10; i++) {
//         await page.waitForTimeout(500);
//         const has = await page.evaluate((sel) => {
//           const items = document.querySelectorAll(sel);
//           for (const item of items) {
//             if ((item.textContent || "").toLowerCase().includes("copy link")) return true;
//           }
//           return false;
//         }, SELECTORS.postDropdown.menuItem);
//         if (has) { dropdownReady = true; break; }
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
//           return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
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
//         try { return await navigator.clipboard.readText(); } catch { return null; }
//       });
//     } catch {}

//     if (postUrl) {
//       console.log(`   ✅ URL: ${postUrl.substring(0, 80)}`);
//     } else {
//       console.log(`   ⚠️  Clipboard empty`);
//     }

//     await page.keyboard.press("Escape");
//     await randomDelay(1000, 2000);
//     return postUrl;
//   } catch (err) {
//     console.log(`   ❌ Copy link error: ${err.message}`);
//     return null;
//   }
// }

// /**
//  * Comment on post — INLINE, isolated per post
//  *
//  * CRITICAL FIX: Full cleanup at start + count editors before/after click
//  * to ensure we find the NEW editor for THIS post, not old ones from prior posts
//  */
// export async function commentOnPost(page, postIndex, commentText, actuallySend = false) {
//   console.log(`   💬 Adding inline comment...`);

//   // CRITICAL: Clean up ALL stale tags from previous posts
//   await fullCleanup(page);

//   try {
//     // ── STEP 1: Count existing editors BEFORE clicking Comment ──
//     // This helps us identify which editor is NEW after the click
//     const editorsBefore = await page.evaluate(() => {
//       const editors = document.querySelectorAll(
//         'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//       );
//       // Mark existing ones as "old"
//       editors.forEach((el) => {
//         el.setAttribute("data-old-editor", "true");
//       });
//       return editors.length;
//     });
//     console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

//     // ── STEP 2: Scroll COMMENT BUTTON of THIS post into view ──
//     const commentBtnCoords = await scrollPostElementIntoView(
//       page,
//       postIndex,
//       'button[aria-label="Comment"]',
//     );

//     if (!commentBtnCoords) {
//       console.log(`   ⚠️  Comment button not found for post ${postIndex}`);
//       await cleanupOldEditors(page);
//       return { success: false, reason: "no_comment_button" };
//     }

//     console.log(`   🖱️  Clicking Comment at (${commentBtnCoords.x}, ${commentBtnCoords.y})...`);
//     await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
//     await randomDelay(300, 600);
//     await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
//     await randomDelay(2000, 3500);

//     // ── STEP 3: Wait for NEW editor (not the old ones) ──
//     console.log(`   ⏳ Waiting for NEW editor...`);
//     let editorCoords = null;

//     for (let i = 0; i < 15; i++) {
//       await page.waitForTimeout(700);

//       editorCoords = await page.evaluate(() => {
//         // Find editors that DON'T have "data-old-editor" tag
//         const allEditors = document.querySelectorAll(
//           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//         );

//         for (const editor of allEditors) {
//           if (editor.hasAttribute("data-old-editor")) continue; // skip old
//           const rect = editor.getBoundingClientRect();
//           if (rect.width > 50) {
//             editor.setAttribute("data-active-comment-box", "true");
//             return {
//               x: Math.floor(rect.x + rect.width / 2),
//               y: Math.floor(rect.y + rect.height / 2),
//               w: Math.floor(rect.width),
//               h: Math.floor(rect.height),
//               inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
//               rawY: Math.floor(rect.y),
//             };
//           }
//         }
//         return null;
//       });

//       if (editorCoords) {
//         console.log(`   ✅ NEW editor found (${editorCoords.w}x${editorCoords.h}) at y=${editorCoords.rawY}`);
//         break;
//       }
//     }

//     // Fallback: JS click retry if no new editor
//     if (!editorCoords) {
//       console.log(`   🔄 Retrying Comment click via JS...`);
//       await page.evaluate((idx) => {
//         const container = document.querySelector(`[data-post-index="${idx}"]`);
//         if (!container) return;
//         const btn = container.querySelector('button[aria-label="Comment"]');
//         if (btn) {
//           btn.scrollIntoView({ block: "center" });
//           btn.click();
//         }
//       }, postIndex);
//       await randomDelay(2500, 4000);

//       editorCoords = await page.evaluate(() => {
//         const allEditors = document.querySelectorAll(
//           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//         );
//         for (const editor of allEditors) {
//           if (editor.hasAttribute("data-old-editor")) continue;
//           const rect = editor.getBoundingClientRect();
//           if (rect.width < 50) continue;
//           editor.setAttribute("data-active-comment-box", "true");
//           return {
//             x: Math.floor(rect.x + rect.width / 2),
//             y: Math.floor(rect.y + rect.height / 2),
//             w: Math.floor(rect.width),
//             h: Math.floor(rect.height),
//             inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
//             rawY: Math.floor(rect.y),
//           };
//         }
//         return null;
//       });

//       if (!editorCoords) {
//         console.log(`   ❌ No NEW editor appeared`);
//         await cleanupOldEditors(page);
//         return { success: false, reason: "no_new_editor" };
//       }
//       console.log(`   ✅ NEW editor found on retry`);
//     }

//     // ── STEP 4: Scroll editor into view if needed ──
//     if (!editorCoords.inViewport) {
//       console.log(`   📜 Scrolling editor into view (was at y=${editorCoords.rawY})...`);
//       const freshCoords = await scrollToElementAndGetCoords(
//         page,
//         '[data-active-comment-box="true"]',
//       );
//       if (freshCoords) {
//         editorCoords = freshCoords;
//         console.log(`   ✅ Editor now at (${editorCoords.x}, ${editorCoords.y})`);
//       }
//     }

//     // ── STEP 5: Click + focus editor ──
//     console.log(`   🖱️  Clicking editor at (${editorCoords.x}, ${editorCoords.y})...`);
//     await humanMove(page, editorCoords.x, editorCoords.y);
//     await randomDelay(300, 600);
//     await humanClick(page, editorCoords.x, editorCoords.y);
//     await randomDelay(800, 1500);

//     await page.evaluate(() => {
//       const el = document.querySelector('[data-active-comment-box="true"]');
//       if (el) { el.focus(); el.click(); }
//     });
//     await randomDelay(500, 1000);

//     // Verify focus is on the CORRECT editor
//     const focusVerify = await page.evaluate(() => {
//       const target = document.querySelector('[data-active-comment-box="true"]');
//       const active = document.activeElement;
//       return {
//         focused: active === target,
//         activeTag: active?.tagName,
//         activeAria: active?.getAttribute("aria-label"),
//       };
//     });
//     console.log(`   📊 Focus verify: focused=${focusVerify.focused} (active: ${focusVerify.activeTag} "${focusVerify.activeAria}")`);

//     if (!focusVerify.focused) {
//       console.log(`   ⚠️  Focus is on wrong element — forcing focus again...`);
//       await page.evaluate(() => {
//         const el = document.querySelector('[data-active-comment-box="true"]');
//         if (el) {
//           el.focus();
//           const range = document.createRange();
//           const sel = window.getSelection();
//           range.selectNodeContents(el);
//           range.collapse(false);
//           sel.removeAllRanges();
//           sel.addRange(range);
//         }
//       });
//       await randomDelay(500, 1000);
//     }

//     // ── STEP 6: Type comment ──
//     console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
//     await humanTypeText(page, commentText);
//     await randomDelay(2000, 3500);

//     // Verify text landed in the CORRECT editor
//     const typedLen = await page.evaluate(() => {
//       const el = document.querySelector('[data-active-comment-box="true"]');
//       return el ? (el.textContent || "").trim().length : 0;
//     });
//     console.log(`   📊 Typed in target editor: ${typedLen} chars`);

//     if (typedLen === 0) {
//       console.log(`   ⚠️  JS fallback...`);
//       await page.evaluate((text) => {
//         const el = document.querySelector('[data-active-comment-box="true"]');
//         if (!el) return;
//         el.focus();
//         try { document.execCommand("insertText", false, text); } catch {}
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

//     // ── STEP 7: Find & click submit ──
//     console.log(`   🔍 Finding submit button...`);
//     await randomDelay(800, 1500);

//     // Find submit button that is ADJACENT to our active editor
//     const submitCoords = await page.evaluate(() => {
//       const editor = document.querySelector('[data-active-comment-box="true"]');
//       if (!editor) return null;

//       // Walk up from editor to find submit button in same container
//       let parent = editor.parentElement;
//       for (let i = 0; i < 15; i++) {
//         if (!parent) break;
//         const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
//         for (const btn of buttons) {
//           const text = (btn.textContent || "").trim();
//           if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
//             btn.scrollIntoView({ block: "center", behavior: "smooth" });
//             const rect = btn.getBoundingClientRect();
//             if (rect.width > 0 && rect.height > 0) {
//               return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//             }
//           }
//         }
//         parent = parent.parentElement;
//       }

//       // Fallback: any enabled commentButtonSection
//       const allButtons = document.querySelectorAll('button[componentkey*="commentButtonSection"]');
//       for (const btn of allButtons) {
//         const text = (btn.textContent || "").trim();
//         if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
//           btn.scrollIntoView({ block: "center", behavior: "smooth" });
//           const rect = btn.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//       }
//       return null;
//     });

//     if (!submitCoords) {
//       console.log(`   ❌ Submit not found`);
//       await fullCleanup(page);
//       return { success: false, reason: "no_submit_button" };
//     }

//     await randomDelay(500, 1000);

//     // Re-get fresh coords after scrollIntoView
//     const freshSubmit = await page.evaluate(() => {
//       const editor = document.querySelector('[data-active-comment-box="true"]');
//       if (!editor) return null;

//       let parent = editor.parentElement;
//       for (let i = 0; i < 15; i++) {
//         if (!parent) break;
//         const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
//         for (const btn of buttons) {
//           const text = (btn.textContent || "").trim();
//           if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
//             const rect = btn.getBoundingClientRect();
//             if (rect.width > 0 && rect.height > 0 && rect.y > 50 && rect.y < window.innerHeight - 50) {
//               return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//             }
//           }
//         }
//         parent = parent.parentElement;
//       }
//       return null;
//     });

//     const finalSubmit = freshSubmit || submitCoords;

//     console.log(`   🖱️  Submitting at (${finalSubmit.x}, ${finalSubmit.y})...`);
//     await humanMove(page, finalSubmit.x, finalSubmit.y);
//     await randomDelay(300, 600);
//     await humanClick(page, finalSubmit.x, finalSubmit.y);
//     await randomDelay(3000, 5000);

//     // Verify comment posted (editor should be cleared or gone)
//     const verified = await page.evaluate(() => {
//       const el = document.querySelector('[data-active-comment-box="true"]');
//       if (!el) return true; // editor gone = posted
//       return (el.textContent || "").trim().length === 0;
//     });

//     // CRITICAL: Full cleanup after posting (removes all tags)
//     await fullCleanup(page);

//     if (verified) {
//       console.log(`   ✅ Comment POSTED!`);
//       return { success: true, action: "commented" };
//     } else {
//       console.log(`   ⚠️  Sent (unverified)`);
//       return { success: true, action: "commented_unverified" };
//     }
//   } catch (err) {
//     console.log(`   ❌ Error: ${err.message}`);
//     await fullCleanup(page);
//     return { success: false, reason: "error", error: err.message };
//   }
// }

// async function cleanupOldEditors(page) {
//   try {
//     await page.evaluate(() => {
//       document.querySelectorAll('[data-old-editor]').forEach((el) => {
//         el.removeAttribute("data-old-editor");
//       });
//     });
//   } catch {}
// }

// /**
//  * Reply to a comment on a post page
//  */
// export async function replyToComment(page, postIndex, targetAuthorName, replyText, actuallySend = false) {
//   console.log(`   ↩️  Replying to ${targetAuthorName}...`);
//   await fullCleanup(page);

//   try {
//     const replyBtnCoords = await page.evaluate((data) => {
//       const container = document.querySelector(`[data-post-index="${data.idx}"]`);
//       if (!container) return null;
//       const comments = container.querySelectorAll(data.commentItemSelectors.join(", "));
//       for (const comment of comments) {
//         const nameEl = comment.querySelector(data.commentAuthorSelectors.join(", "));
//         if (!nameEl) continue;
//         const name = (nameEl.textContent || "").trim().split("\n")[0].trim();
//         if (!name.toLowerCase().includes(data.targetName.split(" ")[0].toLowerCase())) continue;
//         const replyBtn = comment.querySelector(data.replyButton);
//         if (replyBtn) {
//           replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
//           const rect = replyBtn.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//       }
//       return null;
//     }, {
//       idx: postIndex,
//       targetName: targetAuthorName,
//       commentItemSelectors: SELECTORS.commentsSection.commentItem,
//       commentAuthorSelectors: SELECTORS.commentsSection.commentAuthorName,
//       replyButton: SELECTORS.commentsSection.replyButton,
//     });

//     if (!replyBtnCoords) return { success: false, reason: "no_reply_button" };

//     // Mark existing editors as old
//     await page.evaluate(() => {
//       document.querySelectorAll(
//         'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//       ).forEach((el) => el.setAttribute("data-old-editor", "true"));
//     });

//     await randomDelay(1000, 1800);
//     await humanClick(page, replyBtnCoords.x, replyBtnCoords.y);
//     await randomDelay(2500, 4000);

//     let editorCoords = null;
//     for (let i = 0; i < 15; i++) {
//       await page.waitForTimeout(700);
//       editorCoords = await page.evaluate(() => {
//         const allEditors = document.querySelectorAll(
//           'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
//         );
//         for (const el of allEditors) {
//           if (el.hasAttribute("data-old-editor")) continue;
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 50) {
//             el.setAttribute("data-reply-box", "true");
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//         return null;
//       });
//       if (editorCoords) break;
//     }

//     if (!editorCoords) {
//       await fullCleanup(page);
//       return { success: false, reason: "no_reply_editor" };
//     }

//     await humanClick(page, editorCoords.x, editorCoords.y);
//     await randomDelay(800, 1500);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-reply-box="true"]');
//       if (el) { el.focus(); el.click(); }
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

//     const submitCoords = await page.evaluate(() => {
//       const editor = document.querySelector('[data-reply-box="true"]');
//       if (!editor) return null;
//       let parent = editor.parentElement;
//       for (let i = 0; i < 15; i++) {
//         if (!parent) break;
//         const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
//         for (const btn of buttons) {
//           const text = (btn.textContent || "").trim();
//           if ((text === "Comment" || text === "Reply") && !btn.hasAttribute("disabled")) {
//             btn.scrollIntoView({ block: "center" });
//             const rect = btn.getBoundingClientRect();
//             if (rect.width > 0) return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//         parent = parent.parentElement;
//       }
//       return null;
//     });

//     if (!submitCoords) {
//       await fullCleanup(page);
//       return { success: false, reason: "no_submit" };
//     }

//     await randomDelay(500, 800);
//     await humanClick(page, submitCoords.x, submitCoords.y);
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

import { humanClick, humanTypeText, humanMove } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { scrollPostElementIntoView, scrollToElementAndGetCoords } from "../../helpers/scroll.helper.js";
import SELECTORS from "../../config/selectors.js";

async function fullCleanup(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('[data-active-comment-box]').forEach((el) => {
        el.removeAttribute("data-active-comment-box");
      });
      document.querySelectorAll('[data-reply-box]').forEach((el) => {
        el.removeAttribute("data-reply-box");
      });
      document.querySelectorAll('[data-target-reply-btn]').forEach((el) => {
        el.removeAttribute("data-target-reply-btn");
      });
      document.querySelectorAll('[data-old-editor]').forEach((el) => {
        el.removeAttribute("data-old-editor");
      });
      document.querySelectorAll('[data-active-submit]').forEach((el) => {
        el.removeAttribute("data-active-submit");
      });
    });
  } catch {}
}

export async function copyPostLink(page, postIndex) {
  console.log(`   🔗 Copying post link...`);
  await fullCleanup(page);

  try {
    const menuCoords = await scrollPostElementIntoView(
      page,
      postIndex,
      SELECTORS.postCard.threeDotMenu[0],
    );

    let finalMenuCoords = menuCoords;
    if (!finalMenuCoords) {
      for (let i = 1; i < SELECTORS.postCard.threeDotMenu.length; i++) {
        finalMenuCoords = await scrollPostElementIntoView(
          page,
          postIndex,
          SELECTORS.postCard.threeDotMenu[i],
        );
        if (finalMenuCoords) break;
      }
    }

    if (!finalMenuCoords) {
      console.log(`   ⚠️  3-dot menu not found`);
      return null;
    }

    console.log(`   🖱️  Clicking 3-dot at (${finalMenuCoords.x}, ${finalMenuCoords.y})...`);
    await humanMove(page, finalMenuCoords.x, finalMenuCoords.y);
    await randomDelay(400, 800);
    await humanClick(page, finalMenuCoords.x, finalMenuCoords.y);
    await randomDelay(2500, 4000);

    let dropdownReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(500);
      const has = await page.evaluate((sel) => {
        const items = document.querySelectorAll(sel);
        for (const item of items) {
          if ((item.textContent || "").toLowerCase().includes("copy link")) return true;
        }
        return false;
      }, SELECTORS.postDropdown.menuItem);
      if (has) { dropdownReady = true; break; }
    }

    if (!dropdownReady) {
      console.log(`   🔄 Retrying 3-dot with JS click...`);
      await page.evaluate((data) => {
        const container = document.querySelector(`[data-post-index="${data.idx}"]`);
        if (!container) return;
        for (const sel of data.selectors) {
          const btn = container.querySelector(sel);
          if (btn) { btn.click(); return; }
        }
      }, { idx: postIndex, selectors: SELECTORS.postCard.threeDotMenu });
      await randomDelay(2500, 4000);

      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        const has = await page.evaluate((sel) => {
          const items = document.querySelectorAll(sel);
          for (const item of items) {
            if ((item.textContent || "").toLowerCase().includes("copy link")) return true;
          }
          return false;
        }, SELECTORS.postDropdown.menuItem);
        if (has) { dropdownReady = true; break; }
      }
    }

    if (!dropdownReady) {
      console.log(`   ⚠️  Dropdown didn't appear`);
      await page.keyboard.press("Escape");
      await randomDelay(1000, 2000);
      return null;
    }

    const copyCoords = await page.evaluate((sel) => {
      const items = document.querySelectorAll(sel);
      for (const item of items) {
        if ((item.textContent || "").toLowerCase().includes("copy link")) {
          const rect = item.getBoundingClientRect();
          return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
        }
      }
      return null;
    }, SELECTORS.postDropdown.menuItem);

    if (!copyCoords) {
      await page.keyboard.press("Escape");
      return null;
    }

    console.log(`   🖱️  Clicking "Copy link"...`);
    await humanClick(page, copyCoords.x, copyCoords.y);
    await randomDelay(2500, 4000);

    let postUrl = null;
    try {
      postUrl = await page.evaluate(async () => {
        try { return await navigator.clipboard.readText(); } catch { return null; }
      });
    } catch {}

    if (postUrl) console.log(`   ✅ URL: ${postUrl.substring(0, 80)}`);
    else console.log(`   ⚠️  Clipboard empty`);

    await page.keyboard.press("Escape");
    await randomDelay(1000, 2000);
    return postUrl;
  } catch (err) {
    console.log(`   ❌ Copy link error: ${err.message}`);
    return null;
  }
}

/**
 * Comment on post — with STRICT submit button binding
 *
 * KEY FIX: Submit button must be:
 * 1. componentkey containing "commentButtonSection"
 * 2. Text = "Comment"
 * 3. Not disabled
 * 4. In the SAME parent form as our active editor
 * 5. BELOW our editor's y-position (submit is always below textbox)
 * 6. Within reasonable distance from editor (< 300px vertical)
 */
export async function commentOnPost(page, postIndex, commentText, actuallySend = false) {
  console.log(`   💬 Adding inline comment...`);
  await fullCleanup(page);

  try {
    // ── STEP 1: Mark existing editors as "old" ──
    const editorsBefore = await page.evaluate(() => {
      const editors = document.querySelectorAll(
        'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      );
      editors.forEach((el) => el.setAttribute("data-old-editor", "true"));
      return editors.length;
    });
    console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

    // ── STEP 2: Find Comment button ──
    const commentBtnCoords = await scrollPostElementIntoView(
      page,
      postIndex,
      'button[aria-label="Comment"]',
    );

    if (!commentBtnCoords) {
      console.log(`   ⚠️  Comment button not found for post ${postIndex}`);
      await fullCleanup(page);
      return { success: false, reason: "no_comment_button" };
    }

    console.log(`   🖱️  Clicking Comment at (${commentBtnCoords.x}, ${commentBtnCoords.y})...`);
    await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(300, 600);
    await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(2000, 3500);

    // ── STEP 3: Wait for NEW editor ──
    console.log(`   ⏳ Waiting for NEW editor...`);
    let editorInfo = null;

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(700);
      editorInfo = await page.evaluate(() => {
        const editors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );
        for (const editor of editors) {
          if (editor.hasAttribute("data-old-editor")) continue;
          const rect = editor.getBoundingClientRect();
          if (rect.width > 50) {
            editor.setAttribute("data-active-comment-box", "true");
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
      });
      if (editorInfo) {
        console.log(`   ✅ NEW editor found at y=${editorInfo.rawY}`);
        break;
      }
    }

    if (!editorInfo) {
      console.log(`   🔄 Retrying Comment click via JS...`);
      await page.evaluate((idx) => {
        const container = document.querySelector(`[data-post-index="${idx}"]`);
        if (!container) return;
        const btn = container.querySelector('button[aria-label="Comment"]');
        if (btn) { btn.scrollIntoView({ block: "center" }); btn.click(); }
      }, postIndex);
      await randomDelay(2500, 4000);

      editorInfo = await page.evaluate(() => {
        const editors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );
        for (const editor of editors) {
          if (editor.hasAttribute("data-old-editor")) continue;
          const rect = editor.getBoundingClientRect();
          if (rect.width < 50) continue;
          editor.setAttribute("data-active-comment-box", "true");
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
            rawY: Math.floor(rect.y),
            inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
          };
        }
        return null;
      });

      if (!editorInfo) {
        console.log(`   ❌ No NEW editor`);
        await fullCleanup(page);
        return { success: false, reason: "no_new_editor" };
      }
    }

    // ── STEP 4: Scroll editor into view ──
    if (!editorInfo.inViewport) {
      console.log(`   📜 Scrolling editor into view...`);
      const fresh = await scrollToElementAndGetCoords(page, '[data-active-comment-box="true"]');
      if (fresh) editorInfo = { ...editorInfo, ...fresh, rawY: fresh.y };
    }

    // ── STEP 5: Click + focus editor ──
    console.log(`   🖱️  Clicking editor at (${editorInfo.x}, ${editorInfo.y})...`);
    await humanMove(page, editorInfo.x, editorInfo.y);
    await randomDelay(300, 600);
    await humanClick(page, editorInfo.x, editorInfo.y);
    await randomDelay(800, 1500);

    await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      if (el) { el.focus(); el.click(); }
    });
    await randomDelay(500, 1000);

    const focusOk = await page.evaluate(() => {
      const target = document.querySelector('[data-active-comment-box="true"]');
      return document.activeElement === target;
    });
    console.log(`   📊 Focus: ${focusOk ? "✅" : "❌"}`);

    // ── STEP 6: Type comment ──
    console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
    await humanTypeText(page, commentText);
    await randomDelay(2000, 3500);

    const typedLen = await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      return el ? (el.textContent || "").trim().length : 0;
    });
    console.log(`   📊 Typed: ${typedLen} chars`);

    if (typedLen === 0) {
      console.log(`   ⚠️  JS fallback typing...`);
      await page.evaluate((text) => {
        const el = document.querySelector('[data-active-comment-box="true"]');
        if (!el) return;
        el.focus();
        try { document.execCommand("insertText", false, text); } catch {}
        if ((el.textContent || "").trim().length === 0) {
          el.innerHTML = `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, commentText);
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

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Find submit button — CRITICAL FIX
    // ═══════════════════════════════════════════════════════════
    // Submit button MUST be:
    // - In the same immediate form/container as our editor
    // - BELOW our editor's y-position (submit is always below textbox)
    // - Within 300px vertical distance from editor
    // - Not disabled
    // - Text = "Comment" or "Post" or "Reply"
    // ═══════════════════════════════════════════════════════════

    console.log(`   🔍 Finding correct submit button (must be below editor)...`);
    await randomDelay(1500, 2500);

    const submitInfo = await page.evaluate(() => {
      const editor = document.querySelector('[data-active-comment-box="true"]');
      if (!editor) return { error: "no_editor" };

      const editorRect = editor.getBoundingClientRect();
      const editorY = editorRect.y + editorRect.height / 2;

      // ═══ METHOD 1: Find the immediate FORM containing our editor ═══
      // LinkedIn wraps each comment composer in a <form> or dedicated container
      let form = editor.closest('form');
      if (!form) {
        // Try to find the composer wrapper (walk up looking for a container that has ONLY our editor)
        let candidate = editor.parentElement;
        for (let i = 0; i < 8; i++) {
          if (!candidate) break;
          const editorsInCandidate = candidate.querySelectorAll(
            'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
          );
          if (editorsInCandidate.length === 1 && editorsInCandidate[0] === editor) {
            // This container has ONLY our editor — good candidate for form scope
            const buttonsInCandidate = candidate.querySelectorAll(
              'button[componentkey*="commentButtonSection"]',
            );
            if (buttonsInCandidate.length > 0) {
              form = candidate;
              break;
            }
          }
          candidate = candidate.parentElement;
        }
      }

      if (!form) {
        return { error: "no_form_found", editorY };
      }

      // ═══ METHOD 2: Find submit button within this form ONLY ═══
      const candidateButtons = form.querySelectorAll(
        'button[componentkey*="commentButtonSection"]',
      );

      let bestBtn = null;
      let bestDistance = Infinity;

      for (const btn of candidateButtons) {
        const text = (btn.textContent || "").trim();
        if (!["Comment", "Post", "Reply"].includes(text)) continue;
        if (btn.hasAttribute("disabled")) continue;

        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const btnY = rect.y + rect.height / 2;

        // CRITICAL: Submit button must be BELOW editor (y > editorY)
        if (btnY <= editorY) {
          continue; // This button is ABOVE our editor — WRONG one
        }

        // Must be within 400px vertical distance
        const distance = btnY - editorY;
        if (distance > 400) continue;

        // This is a valid candidate — pick closest below
        if (distance < bestDistance) {
          bestDistance = distance;
          bestBtn = btn;
        }
      }

      if (!bestBtn) {
        return {
          error: "no_valid_submit_below_editor",
          editorY,
          candidateCount: candidateButtons.length,
        };
      }

      // Scroll and mark
      bestBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      bestBtn.setAttribute("data-active-submit", "true");

      const rect = bestBtn.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
        rawY: Math.floor(rect.y),
        editorY: Math.floor(editorY),
        distance: Math.floor(bestDistance),
        text: (bestBtn.textContent || "").trim(),
      };
    });

    if (submitInfo.error) {
      console.log(`   ❌ Submit button error: ${submitInfo.error}`);
      if (submitInfo.editorY) {
        console.log(`   📊 Editor was at y=${Math.floor(submitInfo.editorY)}`);
      }
      await fullCleanup(page);
      return { success: false, reason: submitInfo.error };
    }

    console.log(`   ✅ Submit button found: "${submitInfo.text}" at y=${submitInfo.rawY}`);
    console.log(`   📊 Editor y=${submitInfo.editorY} | Submit y=${submitInfo.rawY} | Distance=${submitInfo.distance}px`);

    await randomDelay(1000, 2000);

    // Get FRESH coords after scrollIntoView
    const freshSubmit = await page.evaluate(() => {
      const btn = document.querySelector('[data-active-submit="true"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      if (rect.y < 50 || rect.y > window.innerHeight - 50) return null;
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    const finalSubmit = freshSubmit || submitInfo;

    console.log(`   🖱️  Clicking submit at (${finalSubmit.x}, ${finalSubmit.y})...`);
    await humanMove(page, finalSubmit.x, finalSubmit.y);
    await randomDelay(400, 800);
    await humanClick(page, finalSubmit.x, finalSubmit.y);
    await randomDelay(3500, 5500);

    // ── STEP 8: Verify comment posted ──
    // Check 1: Our text now appears as a comment (best case)
    // Check 2: Editor became empty AND is no longer the same element
    const verification = await page.evaluate((expectedText) => {
      // Check if editor still exists
      const editor = document.querySelector('[data-active-comment-box="true"]');
      const editorGone = !editor;
      const editorEmpty = editor ? (editor.textContent || "").trim().length === 0 : true;

      // Try to find our comment in the DOM (search for first 30 chars)
      const searchText = expectedText.substring(0, 30).toLowerCase();
      const allComments = document.querySelectorAll(
        '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
      );
      let foundInComments = false;
      for (const c of allComments) {
        const text = (c.textContent || "").toLowerCase();
        if (text.includes(searchText)) {
          foundInComments = true;
          break;
        }
      }

      return { editorGone, editorEmpty, foundInComments };
    }, commentText);

    console.log(`   📊 Verify: editorGone=${verification.editorGone}, editorEmpty=${verification.editorEmpty}, foundInComments=${verification.foundInComments}`);

    await fullCleanup(page);

    if (verification.foundInComments) {
      console.log(`   ✅ Comment POSTED and VERIFIED in comments section!`);
      return { success: true, action: "commented" };
    } else if (verification.editorEmpty || verification.editorGone) {
      console.log(`   ⚠️  Editor cleared but comment not found in DOM — may still be posting`);
      // Wait a bit more and check again
      await randomDelay(3000, 5000);
      const secondCheck = await page.evaluate((expectedText) => {
        const searchText = expectedText.substring(0, 30).toLowerCase();
        const allComments = document.querySelectorAll(
          '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
        );
        for (const c of allComments) {
          if ((c.textContent || "").toLowerCase().includes(searchText)) return true;
        }
        return false;
      }, commentText);

      if (secondCheck) {
        console.log(`   ✅ Comment now visible in DOM!`);
        return { success: true, action: "commented" };
      } else {
        console.log(`   ⚠️  Comment posted but not visible in DOM — LinkedIn may need refresh`);
        return { success: true, action: "commented_unverified" };
      }
    } else {
      console.log(`   ❌ Comment NOT posted — editor still has text`);
      return { success: false, reason: "comment_not_posted" };
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    await fullCleanup(page);
    return { success: false, reason: "error", error: err.message };
  }
}

/**
 * Reply to a comment (used by workflow for post-comment replies)
 */
export async function replyToComment(page, postIndex, targetAuthorName, replyText, actuallySend = false) {
  console.log(`   ↩️  Replying to ${targetAuthorName}...`);
  await fullCleanup(page);

  try {
    const replyBtnCoords = await page.evaluate((data) => {
      const container = document.querySelector(`[data-post-index="${data.idx}"]`);
      if (!container) return null;
      const comments = container.querySelectorAll(data.commentItemSelectors.join(", "));
      for (const comment of comments) {
        const nameEl = comment.querySelector(data.commentAuthorSelectors.join(", "));
        if (!nameEl) continue;
        const name = (nameEl.textContent || "").trim().split("\n")[0].trim();
        if (!name.toLowerCase().includes(data.targetName.split(" ")[0].toLowerCase())) continue;
        const replyBtn = comment.querySelector(data.replyButton);
        if (replyBtn) {
          replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
          const rect = replyBtn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
          }
        }
      }
      return null;
    }, {
      idx: postIndex,
      targetName: targetAuthorName,
      commentItemSelectors: SELECTORS.commentsSection.commentItem,
      commentAuthorSelectors: SELECTORS.commentsSection.commentAuthorName,
      replyButton: SELECTORS.commentsSection.replyButton,
    });

    if (!replyBtnCoords) return { success: false, reason: "no_reply_button" };

    await page.evaluate(() => {
      document.querySelectorAll(
        'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      ).forEach((el) => el.setAttribute("data-old-editor", "true"));
    });

    await randomDelay(1000, 1800);
    await humanClick(page, replyBtnCoords.x, replyBtnCoords.y);
    await randomDelay(2500, 4000);

    let editorInfo = null;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(700);
      editorInfo = await page.evaluate(() => {
        const editors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );
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
      });
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
      if (el) { el.focus(); el.click(); }
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

    // Same strict submit button finding as commentOnPost
    const submitInfo = await page.evaluate(() => {
      const editor = document.querySelector('[data-reply-box="true"]');
      if (!editor) return { error: "no_editor" };
      const editorRect = editor.getBoundingClientRect();
      const editorY = editorRect.y + editorRect.height / 2;

      let form = editor.closest('form');
      if (!form) {
        let candidate = editor.parentElement;
        for (let i = 0; i < 8; i++) {
          if (!candidate) break;
          const editorsInCandidate = candidate.querySelectorAll(
            'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
          );
          if (editorsInCandidate.length === 1 && editorsInCandidate[0] === editor) {
            const buttonsInCandidate = candidate.querySelectorAll(
              'button[componentkey*="commentButtonSection"]',
            );
            if (buttonsInCandidate.length > 0) {
              form = candidate;
              break;
            }
          }
          candidate = candidate.parentElement;
        }
      }
      if (!form) return { error: "no_form" };

      const buttons = form.querySelectorAll('button[componentkey*="commentButtonSection"]');
      let bestBtn = null;
      let bestDist = Infinity;

      for (const btn of buttons) {
        const text = (btn.textContent || "").trim();
        if (!["Comment", "Post", "Reply"].includes(text)) continue;
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
    });

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