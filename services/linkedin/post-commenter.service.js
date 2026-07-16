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
import SELECTORS from "../../config/selectors.js";

async function fullCleanup(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll("[data-active-comment-box]").forEach((el) => {
        el.removeAttribute("data-active-comment-box");
      });
      document.querySelectorAll("[data-reply-box]").forEach((el) => {
        el.removeAttribute("data-reply-box");
      });
      document.querySelectorAll("[data-target-reply-btn]").forEach((el) => {
        el.removeAttribute("data-target-reply-btn");
      });
      document.querySelectorAll("[data-old-editor]").forEach((el) => {
        el.removeAttribute("data-old-editor");
      });
      document.querySelectorAll("[data-active-submit]").forEach((el) => {
        el.removeAttribute("data-active-submit");
      });
      document.querySelectorAll("[data-active-reply-box]").forEach((el) => {
        el.removeAttribute("data-active-reply-box");
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

    console.log(
      `   🖱️  Clicking 3-dot at (${finalMenuCoords.x}, ${finalMenuCoords.y})...`,
    );
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
          if ((item.textContent || "").toLowerCase().includes("copy link"))
            return true;
        }
        return false;
      }, SELECTORS.postDropdown.menuItem);
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
            `[data-post-index="${data.idx}"]`,
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
        { idx: postIndex, selectors: SELECTORS.postCard.threeDotMenu },
      );
      await randomDelay(2500, 4000);

      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        const has = await page.evaluate((sel) => {
          const items = document.querySelectorAll(sel);
          for (const item of items) {
            if ((item.textContent || "").toLowerCase().includes("copy link"))
              return true;
          }
          return false;
        }, SELECTORS.postDropdown.menuItem);
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

    const copyCoords = await page.evaluate((sel) => {
      const items = document.querySelectorAll(sel);
      for (const item of items) {
        if ((item.textContent || "").toLowerCase().includes("copy link")) {
          const rect = item.getBoundingClientRect();
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
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
        try {
          return await navigator.clipboard.readText();
        } catch {
          return null;
        }
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
export async function commentOnPost(
  page,
  postIndex,
  commentText,
  actuallySend = false,
) {
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

    console.log(
      `   🖱️  Clicking Comment at (${commentBtnCoords.x}, ${commentBtnCoords.y})...`,
    );
    await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(300, 600);
    await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(2000, 3500);

    // ── STEP 3: Wait for NEW editor ──
    console.log(`   ⏳ Waiting for NEW editor...`);
    let editorInfo = null;

    // ✅ FIX: moved the progress log INSIDE the for loop
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(800);
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
        console.log(
          `   ✅ NEW editor found (${editorInfo.w}x${editorInfo.h}) at y=${editorInfo.rawY}`,
        );
        break;
      }

      // ✅ FIX: this line is now INSIDE the for loop (i is in scope here)
      if (i > 0 && i % 5 === 0) {
        console.log(`   ⏳ Still waiting for editor... (${i}/25)`);
      }
    }

    if (!editorInfo) {
      console.log(`   🔄 Retrying Comment click via JS...`);
      await page.evaluate((idx) => {
        const container = document.querySelector(`[data-post-index="${idx}"]`);
        if (!container) return;
        const btn = container.querySelector('button[aria-label="Comment"]');
        if (btn) {
          btn.scrollIntoView({ block: "center" });
          btn.click();
        }
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
      const fresh = await scrollToElementAndGetCoords(
        page,
        '[data-active-comment-box="true"]',
      );
      if (fresh) editorInfo = { ...editorInfo, ...fresh, rawY: fresh.y };
    }

    // ── STEP 5: Click + focus editor ──
    console.log(
      `   🖱️  Clicking editor at (${editorInfo.x}, ${editorInfo.y})...`,
    );
    await humanMove(page, editorInfo.x, editorInfo.y);
    await randomDelay(300, 600);
    await humanClick(page, editorInfo.x, editorInfo.y);
    await randomDelay(800, 1500);

    await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      if (el) {
        el.focus();
        el.click();
      }
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
        try {
          document.execCommand("insertText", false, text);
        } catch {}
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

    console.log(
      `   🔍 Finding correct submit button (must be below editor)...`,
    );
    await randomDelay(1500, 2500);

    const submitInfo = await page.evaluate(() => {
      const editor = document.querySelector('[data-active-comment-box="true"]');
      if (!editor) return { error: "no_editor" };

      const editorRect = editor.getBoundingClientRect();
      const editorY = editorRect.y + editorRect.height / 2;

      // ═══ METHOD 1: Find the immediate FORM containing our editor ═══
      // LinkedIn wraps each comment composer in a <form> or dedicated container
      let form = editor.closest("form");
      if (!form) {
        // Try to find the composer wrapper (walk up looking for a container that has ONLY our editor)
        let candidate = editor.parentElement;
        for (let i = 0; i < 8; i++) {
          if (!candidate) break;
          const editorsInCandidate = candidate.querySelectorAll(
            'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
          );
          if (
            editorsInCandidate.length === 1 &&
            editorsInCandidate[0] === editor
          ) {
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

    console.log(
      `   ✅ Submit button found: "${submitInfo.text}" at y=${submitInfo.rawY}`,
    );
    console.log(
      `   📊 Editor y=${submitInfo.editorY} | Submit y=${submitInfo.rawY} | Distance=${submitInfo.distance}px`,
    );

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

    console.log(
      `   🖱️  Clicking submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
    );
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
      const editorEmpty = editor
        ? (editor.textContent || "").trim().length === 0
        : true;

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

    console.log(
      `   📊 Verify: editorGone=${verification.editorGone}, editorEmpty=${verification.editorEmpty}, foundInComments=${verification.foundInComments}`,
    );

    await fullCleanup(page);

    if (verification.foundInComments) {
      console.log(`   ✅ Comment POSTED and VERIFIED in comments section!`);
      return { success: true, action: "commented" };
    } else if (verification.editorEmpty || verification.editorGone) {
      console.log(
        `   ⚠️  Editor cleared but comment not found in DOM — may still be posting`,
      );
      // Wait a bit more and check again
      await randomDelay(3000, 5000);
      const secondCheck = await page.evaluate((expectedText) => {
        const searchText = expectedText.substring(0, 30).toLowerCase();
        const allComments = document.querySelectorAll(
          '.comments-comment-item__main-content, .update-components-text, [class*="comment-item__main"]',
        );
        for (const c of allComments) {
          if ((c.textContent || "").toLowerCase().includes(searchText))
            return true;
        }
        return false;
      }, commentText);

      if (secondCheck) {
        console.log(`   ✅ Comment now visible in DOM!`);
        return { success: true, action: "commented" };
      } else {
        console.log(
          `   ⚠️  Comment posted but not visible in DOM — LinkedIn may need refresh`,
        );
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
          `[data-post-index="${data.idx}"]`,
        );
        if (!container) return null;
        const comments = container.querySelectorAll(
          data.commentItemSelectors.join(", "),
        );
        for (const comment of comments) {
          const nameEl = comment.querySelector(
            data.commentAuthorSelectors.join(", "),
          );
          if (!nameEl) continue;
          const name = (nameEl.textContent || "").trim().split("\n")[0].trim();
          if (
            !name
              .toLowerCase()
              .includes(data.targetName.split(" ")[0].toLowerCase())
          )
            continue;
          const replyBtn = comment.querySelector(data.replyButton);
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
        targetName: targetAuthorName,
        commentItemSelectors: SELECTORS.commentsSection.commentItem,
        commentAuthorSelectors: SELECTORS.commentsSection.commentAuthorName,
        replyButton: SELECTORS.commentsSection.replyButton,
      },
    );

    if (!replyBtnCoords) return { success: false, reason: "no_reply_button" };

    await page.evaluate(() => {
      document
        .querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        )
        .forEach((el) => el.setAttribute("data-old-editor", "true"));
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

    // Same strict submit button finding as commentOnPost
    const submitInfo = await page.evaluate(() => {
      const editor = document.querySelector('[data-reply-box="true"]');
      if (!editor) return { error: "no_editor" };
      const editorRect = editor.getBoundingClientRect();
      const editorY = editorRect.y + editorRect.height / 2;

      let form = editor.closest("form");
      if (!form) {
        let candidate = editor.parentElement;
        for (let i = 0; i < 8; i++) {
          if (!candidate) break;
          const editorsInCandidate = candidate.querySelectorAll(
            'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
          );
          if (
            editorsInCandidate.length === 1 &&
            editorsInCandidate[0] === editor
          ) {
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

      const buttons = form.querySelectorAll(
        'button[componentkey*="commentButtonSection"]',
      );
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

/**
 * Reply to a SPECIFIC comment identified by author name
 * Uses your HTML structure:
 * - Finds article.comments-comment-entity where author name matches
 * - Clicks its Reply button
 * - Types reply
 * - Clicks submit
 */
/**
 * Reply to a comment identified by data-id (most reliable)
 * Falls back to name-based matching if ID not provided
 */
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
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Scroll to comments section
    // ═══════════════════════════════════════════════════════════
    console.log(`   📜 Scrolling down to find comment...`);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollBy({ top: 300, behavior: "smooth" });
      });
      await randomDelay(600, 1200);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Find the EXACT target comment
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔍 Locating exact comment...`);

    const commentLocation = await page.evaluate(
      (data) => {
        const { targetName, targetCommentId } = data;
        const targetFirstName = targetName.split(" ")[0].toLowerCase();

        let targetCommentEl = null;

        // PRIORITY 1: Match by data-id (most reliable)
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
            const nameEl = targetCommentEl.querySelector(
              ".comments-comment-meta__description-title",
            );
            return {
              found: true,
              matchedBy: "id",
              matchedName: nameEl
                ? (nameEl.textContent || "").trim()
                : "unknown",
            };
          }
        }

        // PRIORITY 2: Find by name — but prefer replies to OUR comment
        const commentEls = document.querySelectorAll(
          "article.comments-comment-entity, [class*='comments-comment-entity']",
        );

        // First, find OUR comment (has "• You" in meta)
        let ourCommentEl = null;
        for (const el of commentEls) {
          const metaText =
            el.querySelector(".comments-comment-meta__description")
              ?.textContent || "";
          if (metaText.includes("• You")) {
            ourCommentEl = el;
            break;
          }
        }

        // If we found our comment, look for target's reply WITHIN it
        if (ourCommentEl) {
          const repliesContainer = ourCommentEl.querySelector(
            ".comments-replies-list, [class*='comments-replies-list']",
          );

          if (repliesContainer) {
            const nestedReplies = repliesContainer.querySelectorAll(
              "article.comments-comment-entity, [class*='comment-entity']",
            );

            for (const replyEl of nestedReplies) {
              const nameEl = replyEl.querySelector(
                ".comments-comment-meta__description-title",
              );
              if (!nameEl) continue;

              const name = (nameEl.textContent || "").trim().toLowerCase();
              if (!name.includes(targetFirstName)) continue;

              // Skip if it's our reply
              const metaText =
                replyEl.querySelector(".comments-comment-meta__description")
                  ?.textContent || "";
              if (metaText.includes("• You")) continue;

              targetCommentEl = replyEl;
              break;
            }
          }
        }

        // FALLBACK: If not found in our thread, search all comments
        if (!targetCommentEl) {
          for (const commentEl of commentEls) {
            const nameEl = commentEl.querySelector(
              ".comments-comment-meta__description-title",
            );
            if (!nameEl) continue;

            const commenterName = (nameEl.textContent || "")
              .trim()
              .toLowerCase();
            if (!commenterName.includes(targetFirstName)) continue;

            const metaText =
              commentEl.querySelector(".comments-comment-meta__description")
                ?.textContent || "";
            if (metaText.includes("• You")) continue;

            targetCommentEl = commentEl;
            break;
          }
        }

        if (!targetCommentEl) {
          return { found: false };
        }

        targetCommentEl.setAttribute("data-target-comment", "true");
        targetCommentEl.scrollIntoView({ block: "center", behavior: "smooth" });

        const nameEl = targetCommentEl.querySelector(
          ".comments-comment-meta__description-title",
        );
        const isReplyToUs =
          targetCommentEl.closest(".comments-replies-list") !== null;

        return {
          found: true,
          matchedBy: isReplyToUs ? "nested_reply_to_us" : "top_level",
          matchedName: nameEl ? (nameEl.textContent || "").trim() : "unknown",
        };
      },
      { targetName, targetCommentId },
    );

    if (!commentLocation.found) {
      console.log(`   ❌ Comment from "${targetName}" not found`);
      return { success: false, reason: "comment_not_found" };
    }

    console.log(
      `   ✅ Found comment (${commentLocation.matchedBy}): ${commentLocation.matchedName}`,
    );
    await randomDelay(2500, 4000);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Find Reply button on THIS specific comment
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔍 Finding Reply button on target comment...`);

    const replyBtnCoords = await page.evaluate(() => {
      const commentEl = document.querySelector('[data-target-comment="true"]');
      if (!commentEl) return null;

      // Get direct child social bar (not from nested replies)
      const socialBars = commentEl.querySelectorAll(
        ".comments-comment-social-bar--cr, [class*='comment-social-bar']",
      );

      // Get the FIRST social bar (belongs to this comment, not its replies)
      let socialBar = null;
      for (const bar of socialBars) {
        // Check if this social bar's parent is the target comment (not a nested reply)
        const parentComment = bar.closest("article.comments-comment-entity");
        if (parentComment === commentEl) {
          socialBar = bar;
          break;
        }
      }

      if (!socialBar) return null;

      // Find Reply button in this specific social bar
      const replyBtn = socialBar.querySelector(
        'button[aria-label*="Reply" i][aria-label*="comment"]',
      );

      if (!replyBtn) return null;

      // Scroll button into view
      replyBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      const rect = replyBtn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
        inViewport: rect.y > 80 && rect.y < window.innerHeight - 80,
      };
    });

    if (!replyBtnCoords) {
      console.log(`   ❌ Reply button not found on target comment`);
      return { success: false, reason: "reply_button_not_found" };
    }

    // Wait for scroll
    await randomDelay(1500, 2500);

    // Refresh coords after scroll
    const freshBtnCoords = await page.evaluate(() => {
      const commentEl = document.querySelector('[data-target-comment="true"]');
      if (!commentEl) return null;
      const socialBars = commentEl.querySelectorAll(
        ".comments-comment-social-bar--cr",
      );
      for (const bar of socialBars) {
        const parentComment = bar.closest("article.comments-comment-entity");
        if (parentComment === commentEl) {
          const btn = bar.querySelector(
            'button[aria-label*="Reply" i][aria-label*="comment"]',
          );
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
    });

    const finalBtnCoords = freshBtnCoords || replyBtnCoords;
    console.log(
      `   👀 Reply button at (${finalBtnCoords.x}, ${finalBtnCoords.y})`,
    );

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Mark existing editors as "old"
    // ═══════════════════════════════════════════════════════════
    await page.evaluate(() => {
      document.querySelectorAll('div[contenteditable="true"]').forEach((el) => {
        el.setAttribute("data-old-editor", "true");
      });
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Click Reply button (visible mouse movement)
    // ═══════════════════════════════════════════════════════════
    console.log(`   🖱️  Moving mouse to Reply button...`);
    await page.mouse.move(finalBtnCoords.x, finalBtnCoords.y, { steps: 20 });
    await randomDelay(500, 1000);

    console.log(`   🖱️  Clicking Reply button...`);
    await page.mouse.click(finalBtnCoords.x, finalBtnCoords.y);
    await randomDelay(3000, 5000);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Wait for reply editor (extended wait + multiple retries)
    // ═══════════════════════════════════════════════════════════
    console.log(`   ⏳ Waiting for reply editor to appear...`);
    let editorInfo = null;

    for (let attempt = 1; attempt <= 20; attempt++) {
      await page.waitForTimeout(700);

      editorInfo = await page.evaluate(() => {
        // Multiple selectors to try
        const selectors = [
          'div.ql-editor[contenteditable="true"][data-placeholder*="reply" i]',
          'div.ql-editor[contenteditable="true"][data-placeholder*="comment" i]',
          'div.ql-editor[contenteditable="true"]',
          'div.ProseMirror[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]',
          'div[contenteditable="true"]',
        ];

        for (const sel of selectors) {
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
      });

      if (editorInfo) {
        console.log(`   ✅ Editor found (${editorInfo.selectorUsed})`);
        console.log(
          `      Position: (${editorInfo.x}, ${editorInfo.y}), Size: ${editorInfo.w}x${editorInfo.h}`,
        );
        break;
      }

      if (attempt % 5 === 0) {
        console.log(`   ⏳ Still waiting... ${attempt}/20s`);
      }
    }

    // If editor didn't appear, try clicking Reply button again
    if (!editorInfo) {
      console.log(
        `   🔄 Editor didn't appear — retrying Reply click via JS...`,
      );

      await page.evaluate(() => {
        const commentEl = document.querySelector(
          '[data-target-comment="true"]',
        );
        if (!commentEl) return;
        const socialBars = commentEl.querySelectorAll(
          ".comments-comment-social-bar--cr",
        );
        for (const bar of socialBars) {
          const parentComment = bar.closest("article.comments-comment-entity");
          if (parentComment === commentEl) {
            const btn = bar.querySelector(
              'button[aria-label*="Reply" i][aria-label*="comment"]',
            );
            if (btn) {
              btn.scrollIntoView({ block: "center" });
              btn.click();
              break;
            }
          }
        }
      });
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
        console.log(`   ❌ Reply editor never appeared even after retry`);
        await fullCleanup(page);
        return { success: false, reason: "no_editor" };
      }
      console.log(`   ✅ Editor found on retry`);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Scroll editor into center
    // ═══════════════════════════════════════════════════════════
    if (!editorInfo.inViewport) {
      console.log(`   📜 Scrolling editor into center of screen...`);
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

    console.log(`   👀 Editor is now visible on screen`);

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Click editor + focus
    // ═══════════════════════════════════════════════════════════
    console.log(`   🖱️  Moving mouse to editor...`);
    await page.mouse.move(editorInfo.x, editorInfo.y, { steps: 15 });
    await randomDelay(400, 800);

    console.log(`   🖱️  Clicking editor...`);
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

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Type reply (VISIBLE)
    // ═══════════════════════════════════════════════════════════
    // Move cursor to end (past auto-inserted mention)
    await page.keyboard.press("End");
    await randomDelay(300, 500);
    await page.keyboard.type(" ");
    await randomDelay(200, 400);

    console.log(
      `   ⌨️  Typing reply (${replyText.length} chars) — watch the screen!`,
    );

    for (let i = 0; i < replyText.length; i++) {
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

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Find and click Submit
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔍 Finding Submit button...`);
    await randomDelay(1000, 1500);

    const submitCoords = await page.evaluate(() => {
      const editor = document.querySelector('[data-active-reply-box="true"]');
      if (!editor) return null;

      let parent = editor.parentElement;
      for (let i = 0; i < 12; i++) {
        if (!parent) break;

        const submitBtn = parent.querySelector(
          "button.comments-comment-box__submit-button--cr, " +
            'button[class*="comment-box__submit-button"], ' +
            'button[componentkey*="commentButtonSection"]',
        );

        if (submitBtn) {
          const text = (submitBtn.textContent || "").trim();
          if (
            (text === "Reply" || text === "Comment" || text === "Post") &&
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
    });

    if (!submitCoords) {
      console.log(`   ❌ Submit button not found`);
      await fullCleanup(page);
      return { success: false, reason: "no_submit" };
    }

    console.log(`   ✅ Submit button found: "${submitCoords.text}"`);
    await randomDelay(1000, 1500);

    const freshSubmit = await page.evaluate(() => {
      const btns = document.querySelectorAll(
        "button.comments-comment-box__submit-button--cr, " +
          'button[class*="comment-box__submit-button"], ' +
          'button[componentkey*="commentButtonSection"]',
      );
      for (const btn of btns) {
        const text = (btn.textContent || "").trim();
        if (
          (text === "Reply" || text === "Comment" || text === "Post") &&
          !btn.hasAttribute("disabled")
        ) {
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
    });

    const finalSubmit = freshSubmit || submitCoords;

    console.log(
      `   🖱️  Moving mouse to Submit at (${finalSubmit.x}, ${finalSubmit.y})...`,
    );
    await page.mouse.move(finalSubmit.x, finalSubmit.y, { steps: 15 });
    await randomDelay(500, 1000);

    console.log(`   🖱️  Clicking Submit — POSTING!`);
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