/**
 * Debug script — inspects DOM after clicking Comment button
 * Run: node scripts/debug-comment-flow.js account_1
 */
import { launchBrowser, closeBrowser } from "../services/browser/browser.service.js";
import { checkSession } from "../services/browser/session.service.js";
import { safeGoto } from "../services/browser/navigation.service.js";
import { randomDelay } from "../helpers/delay.helper.js";
import { humanClick } from "../helpers/human-click.helper.js";

const args = process.argv.slice(2);
const accountId = args[0] || "account_1";
const keyword = args[1] || "looking for AI development team";

console.log(`\n🐛 DEBUG COMMENT FLOW\n`);

const { context, page } = await launchBrowser(accountId);

try {
  if (!(await checkSession(page))) {
    console.log("❌ Session invalid");
    process.exit(1);
  }

  const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}&sortBy=%5B%22date_posted%22%5D`;
  console.log(`\n🌐 Going to: ${searchUrl}\n`);
  await safeGoto(page, searchUrl);
  await randomDelay(5000, 7000);

  // Scroll to load posts
  console.log(`📜 Scrolling...`);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await randomDelay(1500, 2500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await randomDelay(2000, 3000);

  // Find first Comment button
  console.log(`\n🔍 Finding first Comment button...`);
  const btnInfo = await page.evaluate(() => {
    const containers = document.querySelectorAll('[role="listitem"]');
    for (const container of containers) {
      const btn = container.querySelector('button[aria-label="Comment"]');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          btn.setAttribute("data-debug-comment-btn", "true");
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
            html: btn.outerHTML.substring(0, 500),
          };
        }
      }
    }
    return null;
  });

  if (!btnInfo) {
    console.log("❌ No Comment button found");
    process.exit(1);
  }

  console.log(`✅ Found Comment button at (${btnInfo.x}, ${btnInfo.y})`);
  console.log(`HTML: ${btnInfo.html}\n`);

  // Scroll into view
  await page.evaluate(() => {
    const el = document.querySelector('[data-debug-comment-btn="true"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  await randomDelay(2000, 3000);

  const freshCoords = await page.evaluate(() => {
    const el = document.querySelector('[data-debug-comment-btn="true"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
  });

  console.log(`🖱️  Clicking Comment button at (${freshCoords.x}, ${freshCoords.y})...`);
  await humanClick(page, freshCoords.x, freshCoords.y);
  await randomDelay(4000, 6000);

  // Now inspect the DOM for ANY editable elements or placeholders
  console.log(`\n🔍 Scanning DOM for comment inputs...\n`);

  const inspection = await page.evaluate(() => {
    const results = {
      allContentEditable: [],
      allInputs: [],
      placeholders: [],
      proseMirror: [],
      addCommentText: [],
    };

    // 1. All contenteditable elements
    document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.allContentEditable.push({
          tag: el.tagName,
          class: el.className.substring(0, 200),
          aria: el.getAttribute("aria-label"),
          role: el.getAttribute("role"),
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          w: Math.floor(rect.width),
          h: Math.floor(rect.height),
          html: el.outerHTML.substring(0, 300),
        });
      }
    });

    // 2. All inputs with placeholder "Add a comment"
    document.querySelectorAll('input, textarea').forEach((el) => {
      const placeholder = el.getAttribute("placeholder") || "";
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && placeholder.toLowerCase().includes("comment")) {
        results.allInputs.push({
          tag: el.tagName,
          type: el.getAttribute("type"),
          placeholder,
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          html: el.outerHTML.substring(0, 300),
        });
      }
    });

    // 3. All elements with data-placeholder="Add a comment..."
    document.querySelectorAll('[data-placeholder]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.placeholders.push({
          tag: el.tagName,
          placeholder: el.getAttribute("data-placeholder"),
          class: el.className.substring(0, 200),
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          w: Math.floor(rect.width),
          h: Math.floor(rect.height),
          parentTag: el.parentElement?.tagName,
          parentClass: (el.parentElement?.className || "").substring(0, 200),
          parentContentEditable: el.parentElement?.getAttribute("contenteditable"),
        });
      }
    });

    // 4. ProseMirror specifically
    document.querySelectorAll('.ProseMirror, .tiptap').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.proseMirror.push({
          class: el.className.substring(0, 300),
          contentEditable: el.getAttribute("contenteditable"),
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          w: Math.floor(rect.width),
        });
      }
    });

    // 5. Text elements containing "Add a comment"
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length > 0) return; // Leaf nodes only
      const text = (el.textContent || "").trim();
      if (text === "Add a comment..." || text === "Add a comment…") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          results.addCommentText.push({
            tag: el.tagName,
            text,
            x: Math.floor(rect.x),
            y: Math.floor(rect.y),
            w: Math.floor(rect.width),
            h: Math.floor(rect.height),
            parentContentEditable: el.parentElement?.getAttribute("contenteditable"),
            parentTag: el.parentElement?.tagName,
            parentClass: (el.parentElement?.className || "").substring(0, 200),
          });
        }
      }
    });

    return results;
  });

  console.log(`\n📊 RESULTS:\n`);
  console.log(`═══ ContentEditable elements (${inspection.allContentEditable.length}) ═══`);
  inspection.allContentEditable.forEach((el, i) => {
    console.log(`\n[${i + 1}] ${el.tag}`);
    console.log(`    class: ${el.class}`);
    console.log(`    aria: ${el.aria}`);
    console.log(`    role: ${el.role}`);
    console.log(`    pos: (${el.x}, ${el.y})  size: ${el.w}x${el.h}`);
    console.log(`    HTML: ${el.html}`);
  });

  console.log(`\n\n═══ Comment inputs (${inspection.allInputs.length}) ═══`);
  inspection.allInputs.forEach((el, i) => {
    console.log(`\n[${i + 1}] ${el.tag} type=${el.type}`);
    console.log(`    placeholder: ${el.placeholder}`);
    console.log(`    pos: (${el.x}, ${el.y})`);
    console.log(`    HTML: ${el.html}`);
  });

  console.log(`\n\n═══ Elements with data-placeholder (${inspection.placeholders.length}) ═══`);
  inspection.placeholders.forEach((el, i) => {
    console.log(`\n[${i + 1}] ${el.tag}`);
    console.log(`    placeholder: ${el.placeholder}`);
    console.log(`    class: ${el.class}`);
    console.log(`    pos: (${el.x}, ${el.y})  size: ${el.w}x${el.h}`);
    console.log(`    parent: ${el.parentTag} (contenteditable=${el.parentContentEditable})`);
    console.log(`    parent class: ${el.parentClass}`);
  });

  console.log(`\n\n═══ ProseMirror elements (${inspection.proseMirror.length}) ═══`);
  inspection.proseMirror.forEach((el, i) => {
    console.log(`\n[${i + 1}] class: ${el.class}`);
    console.log(`    contenteditable: ${el.contentEditable}`);
    console.log(`    pos: (${el.x}, ${el.y})  width: ${el.w}`);
  });

  console.log(`\n\n═══ "Add a comment..." text (${inspection.addCommentText.length}) ═══`);
  inspection.addCommentText.forEach((el, i) => {
    console.log(`\n[${i + 1}] ${el.tag}: "${el.text}"`);
    console.log(`    pos: (${el.x}, ${el.y})  size: ${el.w}x${el.h}`);
    console.log(`    parent: ${el.parentTag} (contenteditable=${el.parentContentEditable})`);
    console.log(`    parent class: ${el.parentClass}`);
  });

  console.log(`\n\n⏸️  Browser will stay open for 60s — inspect manually with F12...\n`);
  await page.waitForTimeout(60000);
} catch (err) {
  console.error(`❌ ${err.message}`);
  console.error(err.stack);
} finally {
  await closeBrowser(context);
}

process.exit(0);