import { humanClick, humanTypeText } from "../../helpers/human-click.helper.js";
import { randomDelay } from "../../helpers/delay.helper.js";

/**
 * Get post URL by clicking three-dot menu → Copy link
 */
export async function copyPostLink(page, postIndex) {
  console.log(`   🔗 Copying post link...`);

  try {
    // Ensure post is in viewport first
    await page.evaluate((idx) => {
      const el = document.querySelector(`[data-post-index="${idx}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, postIndex);
    await randomDelay(2000, 3500);

    // Find three-dot menu with multiple fallbacks
    const menuCoords = await page.evaluate((idx) => {
      const container = document.querySelector(`[data-post-index="${idx}"]`);
      if (!container) return null;

      // Try multiple selectors
      const selectors = [
        'button[aria-label*="Open control menu for post"]',
        'button[aria-label*="Open control menu"]',
        'button[aria-label*="More actions"]',
        'button[aria-label*="Overflow"]',
        'button[data-test-icon="overflow-web-ios-medium"]',
        'button svg[id="overflow-web-ios-small"]',
      ];

      for (const sel of selectors) {
        const btn = container.querySelector(sel);
        if (btn) {
          // If we found the svg, get parent button
          let menuBtn = btn;
          if (btn.tagName === "SVG" || btn.tagName === "svg") {
            menuBtn = btn.closest("button");
          }

          if (menuBtn) {
            const rect = menuBtn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
      }
      return null;
    }, postIndex);

    if (!menuCoords) {
      console.log(`   ⚠️  Menu button not found`);
      return null;
    }

    console.log(`   🖱️  Clicking three-dot menu at (${menuCoords.x}, ${menuCoords.y})...`);

    // Human click first
    await humanClick(page, menuCoords.x, menuCoords.y);
    await randomDelay(2000, 3500);

    // Wait for dropdown
    let dropdownReady = false;
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(500);
      const has = await page.evaluate(() => {
        const items = document.querySelectorAll('div[role="menuitem"]');
        for (const item of items) {
          const text = (item.textContent || "").toLowerCase();
          if (text.includes("copy link")) return true;
        }
        return false;
      });
      if (has) {
        dropdownReady = true;
        break;
      }
    }

    // Retry if not open
    if (!dropdownReady) {
      console.log(`   🔄 Retrying menu click...`);
      await page.mouse.click(menuCoords.x, menuCoords.y);
      await randomDelay(2000, 3500);

      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(500);
        const has = await page.evaluate(() => {
          const items = document.querySelectorAll('div[role="menuitem"]');
          for (const item of items) {
            const text = (item.textContent || "").toLowerCase();
            if (text.includes("copy link")) return true;
          }
          return false;
        });
        if (has) {
          dropdownReady = true;
          break;
        }
      }
    }

    if (!dropdownReady) {
      console.log(`   ⚠️  Dropdown didn't appear — skipping copy link`);
      await page.keyboard.press("Escape");
      await randomDelay(1000, 2000);
      return null;
    }

    // Click Copy link
    console.log(`   🖱️  Clicking "Copy link to post"...`);
    const copyCoords = await page.evaluate(() => {
      const items = document.querySelectorAll('div[role="menuitem"]');
      for (const item of items) {
        const text = (item.textContent || "").toLowerCase();
        if (text.includes("copy link")) {
          const rect = item.getBoundingClientRect();
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
      return null;
    });

    if (!copyCoords) return null;

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
    } catch (err) {
      console.log(`   ⚠️  Clipboard read failed: ${err.message}`);
    }

    if (postUrl) {
      console.log(`   ✅ Post URL: ${postUrl.substring(0, 80)}`);
    }

    await page.keyboard.press("Escape");
    await randomDelay(1500, 2500);

    return postUrl;
  } catch (err) {
    console.log(`   ❌ Copy link failed: ${err.message}`);
    return null;
  }
}

/**
 * Post an AI-generated comment on a specific post
 * OPENS POST IN NEW PAGE for reliable commenting
 */
export async function commentOnPost(page, postIndex, commentText, actuallySend = false, postUrl = null) {
  console.log(`   💬 Adding comment to post...`);

  try {
    // ═══════════════════════════════════════════════════════════
    // STRATEGY: Open post in full-page view for better commenting
    // ═══════════════════════════════════════════════════════════

    if (postUrl) {
      console.log(`   🌐 Opening post in full page: ${postUrl.substring(0, 80)}...`);
      await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await randomDelay(4000, 6000);
    } else {
      // Fallback: scroll to post on search page
      await page.evaluate((idx) => {
        const el = document.querySelector(`[data-post-index="${idx}"]`);
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, postIndex);
      await randomDelay(2500, 4000);
    }

    // ═══════════════════════════════════════════════════════════
    // Find Comment button (multiple selectors)
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔍 Locating Comment button...`);

    let commentBtnCoords = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      await page.waitForTimeout(1000);

      commentBtnCoords = await page.evaluate(() => {
        // Try multiple selectors for comment button
        const selectors = [
          'button[aria-label="Comment"]',
          'button[aria-label*="Comment"]',
          'button[data-test-icon*="comment"]',
        ];

        for (const sel of selectors) {
          const btns = document.querySelectorAll(sel);
          for (const btn of btns) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
        return null;
      });

      if (commentBtnCoords) break;
    }

    if (!commentBtnCoords) {
      console.log(`   ⚠️  Comment button not found`);
      return { success: false, reason: "no_comment_button" };
    }

    console.log(`   ✅ Comment button at (${commentBtnCoords.x}, ${commentBtnCoords.y})`);

    // Scroll comment button into view
    await page.evaluate((coords) => {
      window.scrollTo({
        top: coords.y - 300,
        behavior: "smooth",
      });
    }, commentBtnCoords);
    await randomDelay(1500, 2500);

    // Re-get coords after scroll
    const freshCommentCoords = await page.evaluate(() => {
      const btns = document.querySelectorAll('button[aria-label="Comment"], button[aria-label*="Comment"]');
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.y > 100) {
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
      return null;
    });

    const finalCommentCoords = freshCommentCoords || commentBtnCoords;

    console.log(`   🖱️  Clicking Comment button at (${finalCommentCoords.x}, ${finalCommentCoords.y})...`);
    await humanClick(page, finalCommentCoords.x, finalCommentCoords.y);
    await randomDelay(3000, 5000);

    // ═══════════════════════════════════════════════════════════
    // Wait for comment textbox (LONGER wait + more selectors)
    // ═══════════════════════════════════════════════════════════
    console.log(`   ⏳ Waiting for comment textbox...`);
    let textboxReady = false;
    let textboxCoords = null;

    for (let i = 0; i < 30; i++) {  // 30 seconds
      await page.waitForTimeout(1000);

      textboxCoords = await page.evaluate(() => {
        const selectors = [
          'div.tiptap.ProseMirror[contenteditable="true"]',
          'div[contenteditable="true"][aria-label*="comment" i]',
          'div[contenteditable="true"][aria-label*="Text editor" i]',
          'div[contenteditable="true"][role="textbox"]',
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"][data-placeholder*="comment" i]',
        ];

        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 20) {
              el.setAttribute("data-comment-box", "true");
              return {
                x: Math.floor(rect.x + rect.width / 2),
                y: Math.floor(rect.y + rect.height / 2),
              };
            }
          }
        }
        return null;
      });

      if (textboxCoords) {
        textboxReady = true;
        break;
      }

      if (i % 5 === 0 && i > 0) {
        console.log(`   ⏳ Still waiting for textbox... ${i}/30s`);
      }
    }

    if (!textboxReady) {
      console.log(`   ❌ Comment textbox never appeared`);
      return { success: false, reason: "no_textbox" };
    }

    console.log(`   ✅ Textbox found at (${textboxCoords.x}, ${textboxCoords.y})`);

    // ═══════════════════════════════════════════════════════════
    // Scroll textbox into view so user can watch typing
    // ═══════════════════════════════════════════════════════════
    console.log(`   📜 Scrolling to comment textbox...`);
    await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await randomDelay(2000, 3000);

    // Get fresh coords after scroll
    const freshTextboxCoords = await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.floor(rect.x + rect.width / 2),
        y: Math.floor(rect.y + rect.height / 2),
      };
    });

    const finalTextboxCoords = freshTextboxCoords || textboxCoords;

    // ═══════════════════════════════════════════════════════════
    // Click textbox with multiple methods to ensure focus
    // ═══════════════════════════════════════════════════════════
    console.log(`   🖱️  Clicking comment textbox at (${finalTextboxCoords.x}, ${finalTextboxCoords.y})...`);
    await humanClick(page, finalTextboxCoords.x, finalTextboxCoords.y);
    await randomDelay(1500, 2500);

    // Method 2: Playwright click
    try {
      await page.locator('[data-comment-box="true"]').first().click({ force: true, timeout: 5000 });
      await randomDelay(500, 1000);
    } catch {}

    // Method 3: Force focus via JS
    await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      if (el) {
        el.focus();
        el.click();
      }
    });
    await randomDelay(800, 1500);

    // Verify focus
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      return el && document.activeElement === el;
    });
    console.log(`   📊 Textbox focused: ${isFocused}`);

    // ═══════════════════════════════════════════════════════════
    // Type comment (slow, visible)
    // ═══════════════════════════════════════════════════════════

    // Clear existing text
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(500, 1000);

    console.log(`   ⌨️  Typing comment (${commentText.length} chars) — watch the browser!`);
    await humanTypeText(page, commentText);
    await randomDelay(2500, 4000);

    // Verify text was typed
    const typedContent = await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      return el ? (el.textContent || "").trim().length : 0;
    });

    console.log(`   📊 Chars typed in textbox: ${typedContent}`);

    // If typing failed, try JS fallback
    if (typedContent === 0) {
      console.log(`   ⚠️  Typing didn't register — trying JS insertText fallback...`);
      await page.evaluate((text) => {
        const el = document.querySelector('[data-comment-box="true"]');
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
      await randomDelay(1000, 2000);
    }

    if (!actuallySend) {
      console.log(`   ⚠️  Safe mode — typed but NOT posted`);
      // Clear typed comment
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.keyboard.press("Escape");
      await randomDelay(1000, 2000);
      return { success: true, action: "typed_only" };
    }

    // ═══════════════════════════════════════════════════════════
    // Find and click Submit Comment button
    // ═══════════════════════════════════════════════════════════
    console.log(`   🔍 Finding submit button...`);
    await randomDelay(1000, 2000);

    const submitCoords = await page.evaluate(() => {
      // Method 1: Component key match
      const buttons = document.querySelectorAll('button[componentkey*="commentButtonSection"]');
      for (const btn of buttons) {
        const text = (btn.textContent || "").trim();
        if (text === "Comment" || text.includes("Comment")) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && !btn.hasAttribute("disabled")) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }

      // Method 2: Near textbox
      const textbox = document.querySelector('[data-comment-box="true"]');
      if (textbox) {
        // Look for buttons in the same form/section as the textbox
        let parent = textbox.closest('form, [class*="comment"], [class*="Comment"]');
        if (!parent) parent = textbox.parentElement?.parentElement?.parentElement;

        if (parent) {
          const btns = parent.querySelectorAll('button');
          for (const btn of btns) {
            const text = (btn.textContent || "").trim();
            if ((text === "Comment" || text === "Post" || text === "Submit") && !btn.hasAttribute("disabled")) {
              const rect = btn.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                return {
                  x: Math.floor(rect.x + rect.width / 2),
                  y: Math.floor(rect.y + rect.height / 2),
                };
              }
            }
          }
        }
      }

      // Method 3: All visible submit buttons
      const allBtns = document.querySelectorAll('button');
      for (const btn of allBtns) {
        const text = (btn.textContent || "").trim();
        if (text === "Comment" && !btn.hasAttribute("disabled")) {
          const rect = btn.getBoundingClientRect();
          // Must be visible and reasonably sized
          if (rect.width > 50 && rect.height > 20 && rect.y > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }

      return null;
    });

    if (!submitCoords) {
      console.log(`   ❌ Submit button not found`);
      return { success: false, reason: "no_submit_button" };
    }

    console.log(`   🖱️  Clicking submit at (${submitCoords.x}, ${submitCoords.y})...`);
    await humanClick(page, submitCoords.x, submitCoords.y);
    await randomDelay(3000, 5000);

    // Verify comment posted
    const verified = await page.evaluate(() => {
      const el = document.querySelector('[data-comment-box="true"]');
      if (!el) return true;
      return (el.textContent || "").trim().length === 0;
    });

    if (verified) {
      console.log(`   ✅ Comment POSTED successfully!`);
      return { success: true, action: "commented" };
    } else {
      console.log(`   ⚠️  Comment sent but not verified`);
      return { success: true, action: "commented_unverified" };
    }
  } catch (err) {
    console.log(`   ❌ Comment failed: ${err.message}`);
    return { success: false, reason: "error", error: err.message };
  }
}