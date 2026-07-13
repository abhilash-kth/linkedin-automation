import { humanClick, humanTypeText, humanMove } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { scrollPostElementIntoView, scrollToElementAndGetCoords } from "../../helpers/scroll.helper.js";
import SELECTORS from "../../config/selectors.js";

/**
 * Cleanup ALL comment box tags from ALL posts
 * Called at START of every comment/copy operation to prevent stale tags
 */
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
    });
  } catch {}
}

/**
 * Close any open comment editors by pressing Escape
 * Called after successful post to ensure clean state
 */
async function closeOpenEditors(page) {
  try {
    await page.keyboard.press("Escape");
    await randomDelay(500, 1000);
    // Click somewhere neutral
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) {
        const rect = main.getBoundingClientRect();
        // Click empty space at top
      }
    });
  } catch {}
}

/**
 * Copy post link via 3-dot menu
 */
export async function copyPostLink(page, postIndex) {
  console.log(`   🔗 Copying post link...`);

  // Cleanup before starting
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

    if (postUrl) {
      console.log(`   ✅ URL: ${postUrl.substring(0, 80)}`);
    } else {
      console.log(`   ⚠️  Clipboard empty`);
    }

    await page.keyboard.press("Escape");
    await randomDelay(1000, 2000);
    return postUrl;
  } catch (err) {
    console.log(`   ❌ Copy link error: ${err.message}`);
    return null;
  }
}

/**
 * Comment on post — INLINE, isolated per post
 *
 * CRITICAL FIX: Full cleanup at start + count editors before/after click
 * to ensure we find the NEW editor for THIS post, not old ones from prior posts
 */
export async function commentOnPost(page, postIndex, commentText, actuallySend = false) {
  console.log(`   💬 Adding inline comment...`);

  // CRITICAL: Clean up ALL stale tags from previous posts
  await fullCleanup(page);

  try {
    // ── STEP 1: Count existing editors BEFORE clicking Comment ──
    // This helps us identify which editor is NEW after the click
    const editorsBefore = await page.evaluate(() => {
      const editors = document.querySelectorAll(
        'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      );
      // Mark existing ones as "old"
      editors.forEach((el) => {
        el.setAttribute("data-old-editor", "true");
      });
      return editors.length;
    });
    console.log(`   🔍 Existing editors before click: ${editorsBefore}`);

    // ── STEP 2: Scroll COMMENT BUTTON of THIS post into view ──
    const commentBtnCoords = await scrollPostElementIntoView(
      page,
      postIndex,
      'button[aria-label="Comment"]',
    );

    if (!commentBtnCoords) {
      console.log(`   ⚠️  Comment button not found for post ${postIndex}`);
      await cleanupOldEditors(page);
      return { success: false, reason: "no_comment_button" };
    }

    console.log(`   🖱️  Clicking Comment at (${commentBtnCoords.x}, ${commentBtnCoords.y})...`);
    await humanMove(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(300, 600);
    await humanClick(page, commentBtnCoords.x, commentBtnCoords.y);
    await randomDelay(2000, 3500);

    // ── STEP 3: Wait for NEW editor (not the old ones) ──
    console.log(`   ⏳ Waiting for NEW editor...`);
    let editorCoords = null;

    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(700);

      editorCoords = await page.evaluate(() => {
        // Find editors that DON'T have "data-old-editor" tag
        const allEditors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );

        for (const editor of allEditors) {
          if (editor.hasAttribute("data-old-editor")) continue; // skip old
          const rect = editor.getBoundingClientRect();
          if (rect.width > 50) {
            editor.setAttribute("data-active-comment-box", "true");
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
              w: Math.floor(rect.width),
              h: Math.floor(rect.height),
              inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
              rawY: Math.floor(rect.y),
            };
          }
        }
        return null;
      });

      if (editorCoords) {
        console.log(`   ✅ NEW editor found (${editorCoords.w}x${editorCoords.h}) at y=${editorCoords.rawY}`);
        break;
      }
    }

    // Fallback: JS click retry if no new editor
    if (!editorCoords) {
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

      editorCoords = await page.evaluate(() => {
        const allEditors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );
        for (const editor of allEditors) {
          if (editor.hasAttribute("data-old-editor")) continue;
          const rect = editor.getBoundingClientRect();
          if (rect.width < 50) continue;
          editor.setAttribute("data-active-comment-box", "true");
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
            w: Math.floor(rect.width),
            h: Math.floor(rect.height),
            inViewport: rect.y > 50 && rect.y < window.innerHeight - 50,
            rawY: Math.floor(rect.y),
          };
        }
        return null;
      });

      if (!editorCoords) {
        console.log(`   ❌ No NEW editor appeared`);
        await cleanupOldEditors(page);
        return { success: false, reason: "no_new_editor" };
      }
      console.log(`   ✅ NEW editor found on retry`);
    }

    // ── STEP 4: Scroll editor into view if needed ──
    if (!editorCoords.inViewport) {
      console.log(`   📜 Scrolling editor into view (was at y=${editorCoords.rawY})...`);
      const freshCoords = await scrollToElementAndGetCoords(
        page,
        '[data-active-comment-box="true"]',
      );
      if (freshCoords) {
        editorCoords = freshCoords;
        console.log(`   ✅ Editor now at (${editorCoords.x}, ${editorCoords.y})`);
      }
    }

    // ── STEP 5: Click + focus editor ──
    console.log(`   🖱️  Clicking editor at (${editorCoords.x}, ${editorCoords.y})...`);
    await humanMove(page, editorCoords.x, editorCoords.y);
    await randomDelay(300, 600);
    await humanClick(page, editorCoords.x, editorCoords.y);
    await randomDelay(800, 1500);

    await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      if (el) { el.focus(); el.click(); }
    });
    await randomDelay(500, 1000);

    // Verify focus is on the CORRECT editor
    const focusVerify = await page.evaluate(() => {
      const target = document.querySelector('[data-active-comment-box="true"]');
      const active = document.activeElement;
      return {
        focused: active === target,
        activeTag: active?.tagName,
        activeAria: active?.getAttribute("aria-label"),
      };
    });
    console.log(`   📊 Focus verify: focused=${focusVerify.focused} (active: ${focusVerify.activeTag} "${focusVerify.activeAria}")`);

    if (!focusVerify.focused) {
      console.log(`   ⚠️  Focus is on wrong element — forcing focus again...`);
      await page.evaluate(() => {
        const el = document.querySelector('[data-active-comment-box="true"]');
        if (el) {
          el.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
      await randomDelay(500, 1000);
    }

    // ── STEP 6: Type comment ──
    console.log(`   ⌨️  Typing (${commentText.length} chars)...`);
    await humanTypeText(page, commentText);
    await randomDelay(2000, 3500);

    // Verify text landed in the CORRECT editor
    const typedLen = await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      return el ? (el.textContent || "").trim().length : 0;
    });
    console.log(`   📊 Typed in target editor: ${typedLen} chars`);

    if (typedLen === 0) {
      console.log(`   ⚠️  JS fallback...`);
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

    // ── STEP 7: Find & click submit ──
    console.log(`   🔍 Finding submit button...`);
    await randomDelay(800, 1500);

    // Find submit button that is ADJACENT to our active editor
    const submitCoords = await page.evaluate(() => {
      const editor = document.querySelector('[data-active-comment-box="true"]');
      if (!editor) return null;

      // Walk up from editor to find submit button in same container
      let parent = editor.parentElement;
      for (let i = 0; i < 15; i++) {
        if (!parent) break;
        const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
            btn.scrollIntoView({ block: "center", behavior: "smooth" });
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
            }
          }
        }
        parent = parent.parentElement;
      }

      // Fallback: any enabled commentButtonSection
      const allButtons = document.querySelectorAll('button[componentkey*="commentButtonSection"]');
      for (const btn of allButtons) {
        const text = (btn.textContent || "").trim();
        if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
          btn.scrollIntoView({ block: "center", behavior: "smooth" });
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
          }
        }
      }
      return null;
    });

    if (!submitCoords) {
      console.log(`   ❌ Submit not found`);
      await fullCleanup(page);
      return { success: false, reason: "no_submit_button" };
    }

    await randomDelay(500, 1000);

    // Re-get fresh coords after scrollIntoView
    const freshSubmit = await page.evaluate(() => {
      const editor = document.querySelector('[data-active-comment-box="true"]');
      if (!editor) return null;

      let parent = editor.parentElement;
      for (let i = 0; i < 15; i++) {
        if (!parent) break;
        const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          if ((text === "Comment" || text === "Reply" || text === "Post") && !btn.hasAttribute("disabled")) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.y > 50 && rect.y < window.innerHeight - 50) {
              return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
            }
          }
        }
        parent = parent.parentElement;
      }
      return null;
    });

    const finalSubmit = freshSubmit || submitCoords;

    console.log(`   🖱️  Submitting at (${finalSubmit.x}, ${finalSubmit.y})...`);
    await humanMove(page, finalSubmit.x, finalSubmit.y);
    await randomDelay(300, 600);
    await humanClick(page, finalSubmit.x, finalSubmit.y);
    await randomDelay(3000, 5000);

    // Verify comment posted (editor should be cleared or gone)
    const verified = await page.evaluate(() => {
      const el = document.querySelector('[data-active-comment-box="true"]');
      if (!el) return true; // editor gone = posted
      return (el.textContent || "").trim().length === 0;
    });

    // CRITICAL: Full cleanup after posting (removes all tags)
    await fullCleanup(page);

    if (verified) {
      console.log(`   ✅ Comment POSTED!`);
      return { success: true, action: "commented" };
    } else {
      console.log(`   ⚠️  Sent (unverified)`);
      return { success: true, action: "commented_unverified" };
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    await fullCleanup(page);
    return { success: false, reason: "error", error: err.message };
  }
}

async function cleanupOldEditors(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('[data-old-editor]').forEach((el) => {
        el.removeAttribute("data-old-editor");
      });
    });
  } catch {}
}

/**
 * Reply to a comment on a post page
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

    // Mark existing editors as old
    await page.evaluate(() => {
      document.querySelectorAll(
        'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
      ).forEach((el) => el.setAttribute("data-old-editor", "true"));
    });

    await randomDelay(1000, 1800);
    await humanClick(page, replyBtnCoords.x, replyBtnCoords.y);
    await randomDelay(2500, 4000);

    let editorCoords = null;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(700);
      editorCoords = await page.evaluate(() => {
        const allEditors = document.querySelectorAll(
          'div[contenteditable="true"][aria-label="Text editor for creating comment"]',
        );
        for (const el of allEditors) {
          if (el.hasAttribute("data-old-editor")) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width > 50) {
            el.setAttribute("data-reply-box", "true");
            return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
          }
        }
        return null;
      });
      if (editorCoords) break;
    }

    if (!editorCoords) {
      await fullCleanup(page);
      return { success: false, reason: "no_reply_editor" };
    }

    await humanClick(page, editorCoords.x, editorCoords.y);
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

    const submitCoords = await page.evaluate(() => {
      const editor = document.querySelector('[data-reply-box="true"]');
      if (!editor) return null;
      let parent = editor.parentElement;
      for (let i = 0; i < 15; i++) {
        if (!parent) break;
        const buttons = parent.querySelectorAll('button[componentkey*="commentButtonSection"]');
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          if ((text === "Comment" || text === "Reply") && !btn.hasAttribute("disabled")) {
            btn.scrollIntoView({ block: "center" });
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0) return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
          }
        }
        parent = parent.parentElement;
      }
      return null;
    });

    if (!submitCoords) {
      await fullCleanup(page);
      return { success: false, reason: "no_submit" };
    }

    await randomDelay(500, 800);
    await humanClick(page, submitCoords.x, submitCoords.y);
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