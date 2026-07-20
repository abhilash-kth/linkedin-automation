import { randomDelay } from "../../helpers/delay.helper.js";
import SELECTORS from "../../config/selectors.js";

export async function detectProfileStatus(page) {
  console.log(`🔎 Detecting profile status...`);
  await randomDelay(2000, 3500);

  const status = await page.evaluate((sels) => {
    const result = {
      personName: "",
      distance: null,
      hasConnect: false,
      hasMessage: false,
      hasPending: false,
      hasMore: false,
      isFirstDegree: false,
      hasIncomingInvitation: false,
    };

    const bounds = sels.buttonAreaBounds;

    // ── Check incoming invitation FIRST ──
    const acceptBtn = document.querySelector(sels.incomingAcceptButton);
    if (acceptBtn) {
      const rect = acceptBtn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        result.hasIncomingInvitation = true;
      }
    }

    // ── Find person name ──
    const nameEl = document.querySelector(sels.personName);
    if (nameEl) {
      const text = (nameEl.textContent || "").trim();
      if (text.length > 2 && text.length < 100) {
        result.personName = text;
      }
    }

    // Fallback: h2 search
    if (!result.personName) {
      const h2s = document.querySelectorAll("h2");
      for (const h of h2s) {
        const text = (h.textContent || "").trim();
        const rect = h.getBoundingClientRect();
        if (rect.y > 100 && rect.y < 600 && text.length > 2 && text.length < 100) {
          const skip = [
            "Activity", "Experience", "Education", "About", "Skills",
            "Interests", "People you may know", "You might like", "Featured",
            "Recommendations", "Volunteer experience", "Licenses & certifications",
            "Publications", "Languages", "0 notifications",
          ];
          if (!skip.includes(text)) {
            result.personName = text;
            break;
          }
        }
      }
    }

    // ── Find distance ──
    const distancePattern = new RegExp(sels.distancePattern);
    document.querySelectorAll("p, span").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (distancePattern.test(text)) {
        const rect = el.getBoundingClientRect();
        if (rect.y > 350 && rect.y < 550 && !result.distance) {
          result.distance = text.replace("·", "").trim();
          if (result.distance === "1st") result.isFirstDegree = true;
        }
      }
    });

    if (!result.personName) return result;

    const firstName = result.personName.split(" ")[0].toLowerCase();
    const fullName = result.personName.toLowerCase();

    // ═══ Find Message button ═══
    const messageLinks = document.querySelectorAll(sels.messageAnchor);
    for (const el of messageLinks) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
      el.setAttribute("data-outreach-btn", "message");
      result.hasMessage = true;
      break;
    }

    if (!result.hasMessage) {
      const allBtns = document.querySelectorAll("button, a");
      for (const el of allBtns) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
        const text = (el.textContent || "").trim();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        if (
          text === sels.messageButtonText ||
          aria === "message" ||
          aria.startsWith("message ")
        ) {
          el.setAttribute("data-outreach-btn", "message");
          result.hasMessage = true;
          break;
        }
      }
    }

    // ═══ Find Connect button (top-level, direct visible) ═══
    // Strategy 1: componentkey / href
    const connectAnchors = document.querySelectorAll(sels.connectAnchor);
    for (const el of connectAnchors) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
      // Must not be inside a dropdown menu (that's counted separately)
      if (el.closest('[role="menu"]')) continue;
      el.setAttribute("data-outreach-btn", "connect");
      result.hasConnect = true;
      break;
    }

    // Strategy 2: aria-label pattern
    if (!result.hasConnect) {
      const connectAriaRegex = new RegExp(sels.connectAriaPattern);
      const allEls = [
        ...document.querySelectorAll("a[aria-label]"),
        ...document.querySelectorAll("button[aria-label]"),
      ];
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
        if (el.closest('[role="menu"]')) continue;
        const aria = el.getAttribute("aria-label") || "";
        if (connectAriaRegex.test(aria)) {
          if (aria.toLowerCase().includes(firstName) || aria.toLowerCase().includes(fullName)) {
            el.setAttribute("data-outreach-btn", "connect");
            result.hasConnect = true;
            break;
          }
        }
      }
    }

    // Strategy 3: text-based fallback
    if (!result.hasConnect) {
      const all = document.querySelectorAll("a, button");
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
        if (el.closest('[role="menu"]')) continue;
        if ((el.textContent || "").trim() === sels.connectButtonText) {
          el.setAttribute("data-outreach-btn", "connect");
          result.hasConnect = true;
          break;
        }
      }
    }

    // ═══ Find More button ═══
    // Strategy 1: aria-label selectors
    for (const ariaSel of sels.moreButton.ariaSelectors) {
      const btns = document.querySelectorAll(ariaSel);
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
        btn.setAttribute("data-outreach-btn", "more");
        result.hasMore = true;
        break;
      }
      if (result.hasMore) break;
    }

    // Strategy 2: Modern More button (no aria-label, just text "More")
    if (!result.hasMore) {
      const allBtns = document.querySelectorAll("button");
      for (const btn of allBtns) {
        const text = (btn.textContent || "").trim();
        if (text !== sels.moreButton.buttonText) continue;

        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;

        // Skip if inside navbar
        if (btn.closest("nav, header, .global-nav")) continue;

        // Must have aria-expanded (indicates it's a dropdown trigger)
        if (!btn.hasAttribute(sels.moreButton.expandableAttr)) continue;

        btn.setAttribute("data-outreach-btn", "more");
        result.hasMore = true;
        break;
      }
    }

    // ═══ Find Pending ═══
    // Strategy 1: componentkey pattern
    const pendingByKey = document.querySelector(sels.pendingByComponentKey);
    if (pendingByKey) {
      const rect = pendingByKey.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.x <= bounds.maxX && rect.y >= bounds.minY && rect.y <= bounds.maxY) {
          result.hasPending = true;
        }
      }
    }

    // Strategy 2: aria-label pattern
    if (!result.hasPending) {
      const pendingByAria = document.querySelector(sels.pendingAriaPattern);
      if (pendingByAria) {
        const rect = pendingByAria.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          result.hasPending = true;
        }
      }
    }

    // Strategy 3: text-based
    if (!result.hasPending) {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > bounds.maxX || rect.y < bounds.minY || rect.y > bounds.maxY) continue;
        if ((btn.textContent || "").trim() === sels.pendingButtonText) {
          result.hasPending = true;
          break;
        }
      }
    }

    return result;
  }, SELECTORS.profile);

  console.log(`   👤 Person: ${status.personName || "Unknown"}`);
  console.log(`   🔗 Distance: ${status.distance || "Unknown"}`);
  console.log(`   Connect: ${status.hasConnect ? "✅" : "❌"}`);
  console.log(`   Message: ${status.hasMessage ? "✅" : "❌"}`);
  console.log(`   Pending: ${status.hasPending ? "⏳" : "❌"}`);
  console.log(`   More menu: ${status.hasMore ? "✅" : "❌"}`);
  console.log(`   1st degree: ${status.isFirstDegree ? "✅" : "❌"}`);
  console.log(`   Incoming invite: ${status.hasIncomingInvitation ? "💌" : "❌"}`);

  return status;
}