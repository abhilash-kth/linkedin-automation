import { randomDelay, random } from "../../helpers/delay.helper.js";
import {
  humanClick,
  humanTypeText,
  humanMove,
} from "../../helpers/human-click.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";
import { safeGoto } from "../browser/navigation.service.js";
import { scrollPostElementIntoView } from "../../helpers/scroll.helper.js";
import SELECTORS from "../../config/selectors.js";

const HB = SELECTORS.humanBehavior;

export async function searchPostsByKeyword(page, keyword) {
  console.log(`\n🔍 Searching POSTS for: "${keyword}"`);

  try {
    await safeGoto(page, SELECTORS.urls.feed);
    await randomDelay(3000, 5000);
    await behaveLikeHuman(page);

    // ── Find search bar ──
    let searchBarCoords = null;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      searchBarCoords = await page.evaluate(
        ({ selectors, tag }) => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                el.setAttribute(tag, "true");
                return {
                  x: Math.floor(rect.x + rect.width / 2),
                  y: Math.floor(rect.y + rect.height / 2),
                };
              }
            }
          }
          return null;
        },
        { selectors: SELECTORS.searchBar.input, tag: SELECTORS.searchBar.tag },
      );
      if (searchBarCoords) break;
    }

    if (!searchBarCoords) {
      console.log(`   ❌ Search bar not found`);
      return [];
    }

    // ── Human: move mouse to search bar area first ──
    const preX = searchBarCoords.x + Math.floor(random(-50, 50));
    const preY = searchBarCoords.y + Math.floor(random(30, 80));
    await humanMove(page, preX, preY);
    await randomDelay(300, 700);

    await humanClick(page, searchBarCoords.x, searchBarCoords.y);
    await randomDelay(800, 1500);

    await page.evaluate((tag) => {
      const el = document.querySelector(`[${tag}="true"]`);
      if (el) el.focus();
    }, SELECTORS.searchBar.tag);
    await randomDelay(400, 800);

    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await randomDelay(300, 600);

    console.log(`   ⌨️  Typing: "${keyword}"`);
    await humanTypeText(page, keyword);
    await randomDelay(1500, 2500);

    await page.keyboard.press("Enter");
    await randomDelay(4000, 6000);

    await clickPostsFilter(page);
    await randomDelay(3000, 5000);

    await applyLatestSort(page);
    await randomDelay(3000, 5000);

    // ── Load posts with human scroll ──
    console.log(`   📜 Loading posts (minimum ${HB.minPostsRequired})...`);
    await realisticScrollToLoadPosts(page);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await randomDelay(2000, 3500);

    const posts = await collectAndTagPosts(page);
    console.log(`   ✅ Found ${posts.length} posts`);

    if (posts.length < HB.minPostsRequired) {
      console.log(
        `   ⚠️  Less than ${HB.minPostsRequired} posts found — still processing available`,
      );
    }

    return posts;
  } catch (err) {
    console.log(`   ❌ Search failed: ${err.message}`);
    return [];
  }
}

async function clickPostsFilter(page) {
  const coords = await page.evaluate((selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    const els = document.querySelectorAll("a, button");
    for (const el of els) {
      if ((el.textContent || "").trim() === "Posts") {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.y < 300) {
          return {
            x: Math.floor(rect.x + rect.width / 2),
            y: Math.floor(rect.y + rect.height / 2),
          };
        }
      }
    }
    return null;
  }, SELECTORS.filters.postsFilter);

  if (!coords) {
    console.log(`   ⚠️  Posts filter not found`);
    return false;
  }

  // Human: move mouse near button first
  await humanMove(
    page,
    coords.x + Math.floor(random(-20, 20)),
    coords.y + Math.floor(random(-10, 10)),
  );
  await randomDelay(300, 600);
  await humanClick(page, coords.x, coords.y);
  return true;
}

async function applyLatestSort(page) {
  try {
    if (page.url().includes("date_posted")) {
      console.log(`   ✅ Already Latest`);
      return true;
    }

    const pillCoords = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return null;
    }, SELECTORS.filters.sortByPill);

    if (!pillCoords) {
      console.log(`   ⚠️  Sort pill not found`);
      return false;
    }

    await humanClick(page, pillCoords.x, pillCoords.y);
    await randomDelay(1500, 2500);

    const latestCoords = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return null;
    }, SELECTORS.filters.latestOption);

    if (!latestCoords) {
      console.log(`   ⚠️  Latest not found`);
      return false;
    }

    await humanClick(page, latestCoords.x, latestCoords.y);
    await randomDelay(1000, 2000);

    const showCoords = await page.evaluate((text) => {
      const links = document.querySelectorAll("a");
      for (const link of links) {
        if ((link.textContent || "").trim() === text) {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: Math.floor(rect.x + rect.width / 2),
              y: Math.floor(rect.y + rect.height / 2),
            };
          }
        }
      }
      return null;
    }, SELECTORS.filters.showResultsText);

    if (showCoords) {
      await humanClick(page, showCoords.x, showCoords.y);
      await randomDelay(4000, 6000);
      console.log(`   ✅ Latest sort applied`);
    }
    return true;
  } catch (err) {
    console.log(`   ⚠️  Latest sort failed: ${err.message}`);
    return false;
  }
}

async function realisticScrollToLoadPosts(page) {
  let previousCount = 0;
  let noNewPostsCount = 0;
  const HB = SELECTORS.humanBehavior;
  const maxAttempts = HB.maxScrollAttempts;
  const targetCount = HB.targetPostCount;

  console.log(
    `   📜 Scrolling to load posts (target: ${targetCount}, max scrolls: ${maxAttempts})...`,
  );

  // ── Get initial mouse position (center of viewport) ──
  const viewport = page.viewportSize();
  let mouseX = Math.floor(viewport.width / 2);
  let mouseY = Math.floor(viewport.height / 2);

  // Move mouse to center of results area first
  await page.mouse.move(mouseX, mouseY, { steps: 10 });
  await randomDelay(500, 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentCount = await page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, SELECTORS.postCard.container);

    console.log(
      `   📊 Scroll attempt ${attempt}/${maxAttempts}: ${currentCount} posts loaded`,
    );

    if (currentCount >= targetCount) {
      console.log(`   ✅ Target reached (${currentCount} posts)`);
      break;
    }

    // ── HUMAN SCROLL — Real mouse wheel events ──
    const scrollType = Math.random();

    if (scrollType < 0.5) {
      // Type 1: Multiple small wheel scrolls (most human)
      const wheelCount = 4 + Math.floor(Math.random() * 6); // 4-10 wheels
      for (let w = 0; w < wheelCount; w++) {
        const scrollDelta = Math.floor(random(100, 300));
        await page.mouse.wheel(0, scrollDelta);
        await randomDelay(200, 500);

        // Occasionally move mouse slightly (human hand tremor)
        if (Math.random() < 0.3) {
          mouseX += Math.floor(random(-30, 30));
          mouseY += Math.floor(random(-15, 15));
          mouseX = Math.max(200, Math.min(viewport.width - 200, mouseX));
          mouseY = Math.max(200, Math.min(viewport.height - 200, mouseY));
          await page.mouse.move(mouseX, mouseY, { steps: 5 });
        }
      }
    } else if (scrollType < 0.8) {
      // Type 2: Faster continuous scroll
      const wheelCount = 3 + Math.floor(Math.random() * 4);
      for (let w = 0; w < wheelCount; w++) {
        const scrollDelta = Math.floor(random(300, 600));
        await page.mouse.wheel(0, scrollDelta);
        await randomDelay(300, 700);
      }
    } else {
      // Type 3: Big single scroll
      const scrollDelta = Math.floor(random(600, 1000));
      await page.mouse.wheel(0, scrollDelta);
      await randomDelay(800, 1500);
    }

    // ── FALLBACK: JS scroll if wheel didn't work ──
    // Try both window and the inner scroll container LinkedIn uses
    await page.evaluate(
      ({ containers, amount }) => {
        // Try inner scrollable containers first (LinkedIn search results)
        const scrollContainers = [
          ...document.querySelectorAll("main"),
          ...document.querySelectorAll(".scaffold-layout__main"),
          ...document.querySelectorAll('[class*="search-results-container"]'),
          ...document.querySelectorAll(".search-results-container"),
          document.documentElement,
          document.body,
        ];

        for (const el of scrollContainers) {
          if (!el) continue;
          // Check if this container is actually scrollable
          if (el.scrollHeight > el.clientHeight) {
            el.scrollBy({ top: amount, behavior: "smooth" });
          }
        }

        // Always also scroll window as final fallback
        window.scrollBy({ top: amount, behavior: "smooth" });
      },
      { containers: [], amount: 500 },
    );

    console.log(`   ⏳ Waiting for new posts to load...`);

    // Wait up to 6 seconds for new posts
    let waitIterations = 0;
    let newCountFound = currentCount;
    while (waitIterations < 12) {
      await page.waitForTimeout(500);
      newCountFound = await page.evaluate((sel) => {
        return document.querySelectorAll(sel).length;
      }, SELECTORS.postCard.container);

      if (newCountFound > currentCount) {
        console.log(
          `   📈 New posts loaded: ${newCountFound} (+${newCountFound - currentCount})`,
        );
        break;
      }
      waitIterations++;
    }

    // Human pause occasionally
    if (Math.random() < 0.3) {
      const pauseMs = random(1500, 3500);
      console.log(`   🤔 Human pause (${Math.floor(pauseMs / 1000)}s)...`);
      await new Promise((r) => setTimeout(r, pauseMs));
    } else {
      await randomDelay(1000, 2500);
    }

    // Occasional scroll back up (humans re-read)
    if (Math.random() < 0.15) {
      const backAmt = Math.floor(random(100, 250));
      await page.mouse.wheel(0, -backAmt);
      await randomDelay(500, 1200);
    }

    const afterCount = await page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, SELECTORS.postCard.container);

    if (afterCount === previousCount) {
      noNewPostsCount++;
      if (noNewPostsCount >= 3) {
        console.log(`   ℹ️  No new posts loading after 3 attempts — stopping`);
        break;
      }
      console.log(
        `   ⏳ No new posts yet, trying again... (${noNewPostsCount}/3)`,
      );
      await randomDelay(2000, 4000);
    } else {
      noNewPostsCount = 0;
    }
    previousCount = afterCount;
  }
}

async function collectAndTagPosts(page) {
  return await page.evaluate((sels) => {
    const posts = [];
    const containers = document.querySelectorAll(sels.container);
    let postCounter = 0;

    containers.forEach((container) => {
      const authorLinks = container.querySelectorAll(sels.authorLink);
      if (authorLinks.length === 0) return;

      const rawUrl = authorLinks[0].getAttribute("href").split("?")[0];
      if (!rawUrl.includes("/in/")) return;

      const fullProfileUrl = rawUrl.startsWith("http")
        ? rawUrl
        : "https://www.linkedin.com" + rawUrl;

      let authorName = "";
      const badgeSel = sels.authorLinkWithBadge.join(", ");
      const badgeEl = container.querySelector(badgeSel);
      if (badgeEl) {
        authorName = (badgeEl.getAttribute("aria-label") || "")
          .replace(/Verified Profile/gi, "")
          .replace(/\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi, "")
          .trim();
      }
      if (!authorName) {
        const p = container.querySelector(sels.authorName);
        if (p) authorName = (p.textContent || "").trim();
      }
      if (!authorName || authorName.length < 2) return;

      let authorHeadline = "";
      const paras = container.querySelectorAll(sels.authorHeadline);
      for (const p of paras) {
        const text = (p.textContent || "").trim();
        if (/^\d+[wdhm]\s*[•·]/.test(text)) continue;
        if (text.length >= 5 && text.length <= 500 && !text.startsWith("•")) {
          authorHeadline = text.substring(0, 300);
          break;
        }
      }

      let postTime = "";
      const timeParas = container.querySelectorAll(sels.postTimeClass);
      for (const p of timeParas) {
        const match = (p.textContent || "").trim().match(sels.postTimePattern);
        if (match) {
          postTime = match[1];
          break;
        }
      }

      const contentEl = container.querySelector(sels.content);
      if (!contentEl) return;

      const content = (contentEl.textContent || "").trim();
      if (!content || content.length < 30) return;

      container.setAttribute(sels.tag, String(postCounter));

      posts.push({
        index: postCounter,
        authorName,
        authorHeadline,
        authorProfileUrl: fullProfileUrl,
        content,
        postTime,
        hasExpandButton: !!container.querySelector(sels.expandMoreButton),
      });
      postCounter++;
    });

    return posts;
  }, SELECTORS.postCard);
}

export async function scrollToAndExpandPost(page, postIndex) {
  console.log(`   🖱️  Scrolling to post ${postIndex}...`);
  const HB = SELECTORS.humanBehavior;

  // ── Step 1: Scroll post into view ──
  await page.evaluate(
    ({ idx, tag }) => {
      const el = document.querySelector(`[${tag}="${idx}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    { idx: postIndex, tag: SELECTORS.postCard.tag },
  );
  await randomDelay(1500, 2500);

  // ── Step 2: Human mouse movement BEFORE reading (like a human looks around) ──
  for (let m = 0; m < HB.preCommentMouseMoves; m++) {
    await humanMove(
      page,
      Math.floor(random(150, 1100)),
      Math.floor(random(100, 700)),
    );
    await randomDelay(
      HB.preCommentMouseMoveDelay[0],
      HB.preCommentMouseMoveDelay[1],
    );
  }

  // ── Step 3: Expand "…more" if needed ──
  const hasMore = await page.evaluate(
    ({ idx, tag, btnSelector }) => {
      const container = document.querySelector(`[${tag}="${idx}"]`);
      if (!container) return false;
      return !!container.querySelector(btnSelector);
    },
    {
      idx: postIndex,
      tag: SELECTORS.postCard.tag,
      btnSelector: SELECTORS.postCard.expandMoreButton,
    },
  );

  if (hasMore) {
    console.log(`   📖 Expanding post...`);

    const expandCoords = await scrollPostElementIntoView(
      page,
      postIndex,
      SELECTORS.postCard.expandMoreButton,
    );

    if (expandCoords) {
      await humanMove(page, expandCoords.x, expandCoords.y);
      await randomDelay(300, 600);
      await humanClick(page, expandCoords.x, expandCoords.y);
      await randomDelay(1500, 2500);
    }

    const stillHasBtn = await page.evaluate(
      ({ idx, tag, btnSelector }) => {
        const container = document.querySelector(`[${tag}="${idx}"]`);
        if (!container) return false;
        return !!container.querySelector(btnSelector);
      },
      {
        idx: postIndex,
        tag: SELECTORS.postCard.tag,
        btnSelector: SELECTORS.postCard.expandMoreButton,
      },
    );

    if (stillHasBtn) {
      console.log(`   🔄 JS click fallback...`);
      await page.evaluate(
        ({ idx, tag, btnSelector }) => {
          const container = document.querySelector(`[${tag}="${idx}"]`);
          if (!container) return;
          const btn = container.querySelector(btnSelector);
          if (btn) {
            btn.scrollIntoView({ block: "center" });
            btn.click();
          }
        },
        {
          idx: postIndex,
          tag: SELECTORS.postCard.tag,
          btnSelector: SELECTORS.postCard.expandMoreButton,
        },
      );
      await randomDelay(1500, 2500);
    }
  }

  // ── Step 4: Reading pause (proportional to content length) ──
  const contentLen = await page.evaluate(
    ({ idx, tag, contentSelector }) => {
      const container = document.querySelector(`[${tag}="${idx}"]`);
      if (!container) return 0;
      const el = container.querySelector(contentSelector);
      return el ? (el.textContent || "").trim().length : 0;
    },
    {
      idx: postIndex,
      tag: SELECTORS.postCard.tag,
      contentSelector: SELECTORS.postCard.content,
    },
  );

  const readTime = Math.min(
    Math.max(contentLen * HB.readingMsPerChar, HB.readingMinMs),
    HB.readingMaxMs,
  );
  console.log(
    `   👀 Simulating reading (${Math.floor(readTime / 1000)}s, ${contentLen} chars)...`,
  );

  // During reading: occasional mouse movement (eye movement simulation)
  const readStart = Date.now();
  while (Date.now() - readStart < readTime) {
    await page.waitForTimeout(Math.floor(random(800, 2000)));
    if (Math.random() < 0.5) {
      await humanMove(
        page,
        Math.floor(random(200, 900)),
        Math.floor(random(200, 600)),
      );
    }
  }

  // ── Step 5: Scroll DOWN to see comments section ──
  console.log(`   📜 Scrolling down to comments section...`);
  for (let s = 0; s < HB.scrollToCommentsSectionSteps; s++) {
    const scrollAmt = random(150, 350);
    await page.evaluate(
      (y) => window.scrollBy({ top: y, behavior: "smooth" }),
      scrollAmt,
    );
    await randomDelay(
      HB.scrollToCommentsSectionDelay[0],
      HB.scrollToCommentsSectionDelay[1],
    );

    // Occasional mouse movement while scrolling down
    if (Math.random() < 0.4) {
      await humanMove(
        page,
        Math.floor(random(200, 800)),
        Math.floor(random(300, 600)),
      );
    }
  }

  // ── Get full content after expand ──
  const fullContent = await page.evaluate(
    ({ idx, tag, contentSelector }) => {
      const container = document.querySelector(`[${tag}="${idx}"]`);
      if (!container) return null;
      const el = container.querySelector(contentSelector);
      return el ? (el.textContent || "").trim() : null;
    },
    {
      idx: postIndex,
      tag: SELECTORS.postCard.tag,
      contentSelector: SELECTORS.postCard.content,
    },
  );

  return fullContent;
}
