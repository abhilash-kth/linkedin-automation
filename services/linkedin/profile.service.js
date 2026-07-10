import { randomDelay } from "../../helpers/delay.helper.js";
import SELECTORS from "../../config/selectors.js";

export async function detectProfileStatus(page) {
  console.log(`🔎 Detecting profile status...`);
  await randomDelay(2000, 3500);

  const status = await page.evaluate(() => {
    const result = {
      personName: "",
      distance: null,
      hasConnect: false,
      hasMessage: false,
      hasPending: false,
      hasMore: false,
      isFirstDegree: false,
    };

    // Find person name
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

    // Find distance
    document.querySelectorAll("p, span").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (/^·?\s*(1st|2nd|3rd)$/.test(text)) {
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

    // Find Message button
    const messageLinks = document.querySelectorAll('a[href*="/messaging/compose/"]');
    for (const el of messageLinks) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
      el.setAttribute("data-outreach-btn", "message");
      result.hasMessage = true;
      break;
    }

    if (!result.hasMessage) {
      const allBtns = document.querySelectorAll("button, a");
      for (const el of allBtns) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        const text = (el.textContent || "").trim();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        if (text === "Message" || aria === "message" || aria.startsWith("message ")) {
          el.setAttribute("data-outreach-btn", "message");
          result.hasMessage = true;
          break;
        }
      }
    }

    // Find Connect button
    const allClickables = [
      ...document.querySelectorAll("a[aria-label]"),
      ...document.querySelectorAll("button[aria-label]"),
    ];

    allClickables.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.x > 700 || rect.y < 400 || rect.y > 800) return;

      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const componentkey = el.getAttribute("componentkey") || "";

      if (
        (aria.includes("invite") && aria.includes("connect")) ||
        componentkey.includes("ConnectButton")
      ) {
        if (aria.includes(fullName) || aria.includes(firstName)) {
          el.setAttribute("data-outreach-btn", "connect");
          result.hasConnect = true;
        }
      }

      if (aria.includes("pending") || aria.includes("withdraw invitation")) {
        result.hasPending = true;
      }

      if (aria === "more actions" || aria === "more") {
        el.setAttribute("data-outreach-btn", "more");
        result.hasMore = true;
      }
    });

    // Pending by text
    if (!result.hasPending) {
      const btns = document.querySelectorAll("button");
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) continue;
        if ((btn.textContent || "").trim() === "Pending") {
          result.hasPending = true;
          break;
        }
      }
    }

    // Fallback connect
    if (!result.hasConnect) {
      const all = document.querySelectorAll("a, button");
      all.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.x > 700 || rect.y < 400 || rect.y > 800) return;
        if ((el.textContent || "").trim() === "Connect") {
          el.setAttribute("data-outreach-btn", "connect");
          result.hasConnect = true;
        }
      });
    }

    return result;
  });

  console.log(`   👤 Person: ${status.personName || "Unknown"}`);
  console.log(`   🔗 Distance: ${status.distance || "Unknown"}`);
  console.log(`   Connect: ${status.hasConnect ? "✅" : "❌"}`);
  console.log(`   Message: ${status.hasMessage ? "✅" : "❌"}`);
  console.log(`   Pending: ${status.hasPending ? "⏳" : "❌"}`);
  console.log(`   More menu: ${status.hasMore ? "✅" : "❌"}`);
  console.log(`   1st degree: ${status.isFirstDegree ? "✅" : "❌"}`);

  return status;
}