// import { randomDelay, random } from "../../helpers/delay.helper.js";
// import { humanClick, humanTypeText, humanMove } from "../../helpers/human-click.helper.js";
// import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";
// import { safeGoto } from "../browser/navigation.service.js";
// import { scrollPostElementIntoView } from "../../helpers/scroll.helper.js";
// import SELECTORS from "../../config/selectors.js";

// export async function searchPostsByKeyword(page, keyword) {
//   console.log(`\n🔍 Searching POSTS for: "${keyword}"`);

//   try {
//     console.log(`   🏠 Going to LinkedIn feed...`);
//     await safeGoto(page, SELECTORS.urls.feed);
//     await randomDelay(3000, 5000);
//     await behaveLikeHuman(page);

//     console.log(`   🔎 Finding search bar...`);
//     let searchBarCoords = null;
//     for (let i = 0; i < 10; i++) {
//       await page.waitForTimeout(1000);
//       searchBarCoords = await page.evaluate((selectors) => {
//         for (const sel of selectors) {
//           const el = document.querySelector(sel);
//           if (el) {
//             const rect = el.getBoundingClientRect();
//             if (rect.width > 0 && rect.height > 0) {
//               el.setAttribute("data-search-bar", "true");
//               return {
//                 x: Math.floor(rect.x + rect.width / 2),
//                 y: Math.floor(rect.y + rect.height / 2),
//               };
//             }
//           }
//         }
//         return null;
//       }, SELECTORS.searchBar.input);
//       if (searchBarCoords) break;
//     }

//     if (!searchBarCoords) {
//       console.log(`   ❌ Search bar not found`);
//       return [];
//     }

//     console.log(`   🖱️  Clicking search bar...`);
//     await humanClick(page, searchBarCoords.x, searchBarCoords.y);
//     await randomDelay(800, 1500);
//     await page.evaluate(() => {
//       const el = document.querySelector('[data-search-bar="true"]');
//       if (el) el.focus();
//     });
//     await randomDelay(400, 800);
//     await page.keyboard.press("Control+a");
//     await page.keyboard.press("Delete");
//     await randomDelay(300, 600);

//     console.log(`   ⌨️  Typing: "${keyword}"`);
//     await humanTypeText(page, keyword);
//     await randomDelay(1500, 2500);

//     console.log(`   ↵ Pressing Enter...`);
//     await page.keyboard.press("Enter");
//     await randomDelay(4000, 6000);

//     console.log(`   📝 Clicking Posts filter...`);
//     await clickPostsFilter(page);
//     await randomDelay(3000, 5000);

//     console.log(`   🕐 Applying Latest sort...`);
//     await applyLatestSort(page);
//     await randomDelay(3000, 5000);

//     console.log(`   📜 Loading posts...`);
//     await realisticScrollToLoadPosts(page);

//     console.log(`   ⬆️  Scrolling back to top...`);
//     await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
//     await randomDelay(2000, 3500);

//     console.log(`   📥 Collecting posts...`);
//     const posts = await collectAndTagPosts(page);
//     console.log(`   ✅ Found ${posts.length} posts`);

//     return posts;
//   } catch (err) {
//     console.log(`   ❌ Search failed: ${err.message}`);
//     return [];
//   }
// }

// async function clickPostsFilter(page) {
//   const coords = await page.evaluate((selectors) => {
//     for (const sel of selectors) {
//       const el = document.querySelector(sel);
//       if (el) {
//         const rect = el.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0) {
//           return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//         }
//       }
//     }
//     const els = document.querySelectorAll("a, button");
//     for (const el of els) {
//       if ((el.textContent || "").trim() === "Posts") {
//         const rect = el.getBoundingClientRect();
//         if (rect.width > 0 && rect.height > 0 && rect.y < 300) {
//           return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//         }
//       }
//     }
//     return null;
//   }, SELECTORS.filters.postsFilter);

//   if (!coords) {
//     console.log(`   ⚠️  Posts filter not found`);
//     return false;
//   }
//   await humanClick(page, coords.x, coords.y);
//   return true;
// }

// async function applyLatestSort(page) {
//   try {
//     if (page.url().includes("date_posted")) {
//       console.log(`   ✅ Already Latest`);
//       return true;
//     }

//     const pillCoords = await page.evaluate((selectors) => {
//       for (const sel of selectors) {
//         const el = document.querySelector(sel);
//         if (el) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//       }
//       return null;
//     }, SELECTORS.filters.sortByPill);

//     if (!pillCoords) { console.log(`   ⚠️  Sort pill not found`); return false; }

//     await humanClick(page, pillCoords.x, pillCoords.y);
//     await randomDelay(1500, 2500);

//     const latestCoords = await page.evaluate((selectors) => {
//       for (const sel of selectors) {
//         const el = document.querySelector(sel);
//         if (el) {
//           const rect = el.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//       }
//       return null;
//     }, SELECTORS.filters.latestOption);

//     if (!latestCoords) { console.log(`   ⚠️  Latest not found`); return false; }

//     await humanClick(page, latestCoords.x, latestCoords.y);
//     await randomDelay(1000, 2000);

//     const showCoords = await page.evaluate((text) => {
//       const links = document.querySelectorAll("a");
//       for (const link of links) {
//         if ((link.textContent || "").trim() === text) {
//           const rect = link.getBoundingClientRect();
//           if (rect.width > 0 && rect.height > 0) {
//             return { x: Math.floor(rect.x + rect.width / 2), y: Math.floor(rect.y + rect.height / 2) };
//           }
//         }
//       }
//       return null;
//     }, SELECTORS.filters.showResultsText);

//     if (showCoords) {
//       await humanClick(page, showCoords.x, showCoords.y);
//       await randomDelay(4000, 6000);
//       console.log(`   ✅ Latest sort applied`);
//     }
//     return true;
//   } catch (err) {
//     console.log(`   ⚠️  Latest sort failed: ${err.message}`);
//     return false;
//   }
// }

// async function realisticScrollToLoadPosts(page) {
//   let previousCount = 0;
//   let noNewPostsCount = 0;

//   for (let attempt = 1; attempt <= 8; attempt++) {
//     const currentCount = await page.evaluate(() =>
//       document.querySelectorAll('[role="listitem"]').length,
//     );
//     console.log(`   📊 Scroll ${attempt}: ${currentCount} posts`);
//     if (currentCount >= 20) break;

//     const scrollType = Math.random();
//     if (scrollType < 0.3) {
//       const chunks = 3 + Math.floor(Math.random() * 4);
//       for (let c = 0; c < chunks; c++) {
//         await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), random(80, 200));
//         await randomDelay(400, 900);
//       }
//     } else if (scrollType < 0.6) {
//       await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), random(400, 700));
//       await randomDelay(500, 1200);
//       await humanMove(page, Math.floor(random(300, 900)), Math.floor(random(200, 600)));
//     } else {
//       await page.evaluate((y) => window.scrollBy(0, y), random(500, 900));
//     }

//     if (Math.random() < 0.4) {
//       await new Promise((r) => setTimeout(r, random(1500, 4000)));
//     } else {
//       await randomDelay(1500, 3000);
//     }

//     if (Math.random() < 0.2) {
//       await page.evaluate((y) => window.scrollBy(0, -y), random(50, 150));
//       await randomDelay(500, 1200);
//     }

//     if (currentCount === previousCount) {
//       noNewPostsCount++;
//       if (noNewPostsCount >= 3) { console.log(`   ℹ️  No more posts loading`); break; }
//       await randomDelay(3000, 6000);
//     } else {
//       noNewPostsCount = 0;
//     }
//     previousCount = currentCount;
//   }
// }

// async function collectAndTagPosts(page) {
//   return await page.evaluate(() => {
//     const posts = [];
//     const containers = document.querySelectorAll('[role="listitem"]');
//     let postCounter = 0;

//     containers.forEach((container) => {
//       const authorLinks = container.querySelectorAll('a[href*="/in/"]');
//       if (authorLinks.length === 0) return;
//       const rawUrl = authorLinks[0].getAttribute("href").split("?")[0];
//       if (!rawUrl.includes("/in/")) return;
//       const fullProfileUrl = rawUrl.startsWith("http") ? rawUrl : "https://www.linkedin.com" + rawUrl;

//       let authorName = "";
//       const badgeEl = container.querySelector(
//         'a[aria-label*="Verified Profile"], a[aria-label*="3rd"], a[aria-label*="2nd"], a[aria-label*="1st"]',
//       );
//       if (badgeEl) {
//         authorName = (badgeEl.getAttribute("aria-label") || "")
//           .replace(/Verified Profile/gi, "")
//           .replace(/\s*(1st|2nd|3rd|3rd\+)\+?\s*/gi, "")
//           .trim();
//       }
//       if (!authorName) {
//         const p = container.querySelector('a[href*="/in/"] p span');
//         if (p) authorName = (p.textContent || "").trim();
//       }
//       if (!authorName || authorName.length < 2) return;

//       let authorHeadline = "";
//       const paras = container.querySelectorAll("p.e6590096.a303fa94");
//       for (const p of paras) {
//         const text = (p.textContent || "").trim();
//         if (/^\d+[wdhm]\s*[•·]/.test(text)) continue;
//         if (text.length >= 5 && text.length <= 500 && !text.startsWith("•")) {
//           authorHeadline = text.substring(0, 300);
//           break;
//         }
//       }

//       let postTime = "";
//       const timeParas = container.querySelectorAll("p.e6590096.a303fa94.e2049567");
//       for (const p of timeParas) {
//         const match = (p.textContent || "").trim().match(/^(\d+[wdhms])\s*[•·]/);
//         if (match) { postTime = match[1]; break; }
//       }

//       const contentEl = container.querySelector('[data-testid="expandable-text-box"]');
//       if (!contentEl) return;
//       const content = (contentEl.textContent || "").trim();
//       if (!content || content.length < 30) return;

//       container.setAttribute("data-post-index", String(postCounter));

//       posts.push({
//         index: postCounter,
//         authorName,
//         authorHeadline,
//         authorProfileUrl: fullProfileUrl,
//         content,
//         postTime,
//         hasExpandButton: !!container.querySelector('button[data-testid="expandable-text-button"]'),
//       });
//       postCounter++;
//     });

//     return posts;
//   });
// }

// /**
//  * Scroll to post + expand "…more" reliably + simulate reading
//  * FIX: Use JS click for expand (not security-sensitive), scroll expand button into view
//  */
// export async function scrollToAndExpandPost(page, postIndex) {
//   console.log(`   🖱️  Scrolling to post ${postIndex}...`);

//   // Scroll post to center
//   await page.evaluate((idx) => {
//     const el = document.querySelector(`[data-post-index="${idx}"]`);
//     if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
//   }, postIndex);
//   await randomDelay(1500, 2500);

//   // Check and click expand button
//   const hasMore = await page.evaluate((idx) => {
//     const container = document.querySelector(`[data-post-index="${idx}"]`);
//     if (!container) return false;
//     return !!container.querySelector('button[data-testid="expandable-text-button"]');
//   }, postIndex);

//   if (hasMore) {
//     console.log(`   📖 Expanding post...`);

//     // Scroll the EXPAND BUTTON into view (not just the post)
//     const expandCoords = await scrollPostElementIntoView(
//       page,
//       postIndex,
//       'button[data-testid="expandable-text-button"]',
//     );

//     if (expandCoords) {
//       // Try human click first
//       await humanMove(page, expandCoords.x, expandCoords.y);
//       await randomDelay(300, 600);
//       await humanClick(page, expandCoords.x, expandCoords.y);
//       await randomDelay(1500, 2500);
//     }

//     // Verify + JS fallback
//     const stillHasBtn = await page.evaluate((idx) => {
//       const container = document.querySelector(`[data-post-index="${idx}"]`);
//       if (!container) return false;
//       return !!container.querySelector('button[data-testid="expandable-text-button"]');
//     }, postIndex);

//     if (stillHasBtn) {
//       console.log(`   🔄 JS click fallback...`);
//       await page.evaluate((idx) => {
//         const container = document.querySelector(`[data-post-index="${idx}"]`);
//         if (!container) return;
//         const btn = container.querySelector('button[data-testid="expandable-text-button"]');
//         if (btn) {
//           btn.scrollIntoView({ block: "center" });
//           btn.click();
//         }
//       }, postIndex);
//       await randomDelay(1500, 2500);

//       const finalCheck = await page.evaluate((idx) => {
//         const container = document.querySelector(`[data-post-index="${idx}"]`);
//         if (!container) return true;
//         return !container.querySelector('button[data-testid="expandable-text-button"]');
//       }, postIndex);

//       console.log(finalCheck ? `   ✅ Expanded (JS)` : `   ⚠️  Could not expand`);
//     } else {
//       console.log(`   ✅ Expanded`);
//     }
//   } else {
//     console.log(`   ℹ️  Full content already visible`);
//   }

//   // Get content length for read time
//   const contentLen = await page.evaluate((idx) => {
//     const container = document.querySelector(`[data-post-index="${idx}"]`);
//     if (!container) return 0;
//     const el = container.querySelector('[data-testid="expandable-text-box"]');
//     return el ? (el.textContent || "").trim().length : 0;
//   }, postIndex);

//   // Reading time proportional to content
//   const readTime = 3000 + Math.min(Math.floor(contentLen * 8), 7000);
//   console.log(`   👀 Reading (${Math.floor(readTime / 1000)}s, ${contentLen} chars)...`);
//   await new Promise((r) => setTimeout(r, readTime));

//   // Get full content
//   const fullContent = await page.evaluate((idx) => {
//     const container = document.querySelector(`[data-post-index="${idx}"]`);
//     if (!container) return null;
//     const el = container.querySelector('[data-testid="expandable-text-box"]');
//     return el ? (el.textContent || "").trim() : null;
//   }, postIndex);

//   return fullContent;
// }

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

// ═══════════════════════════════════════════════════════════════════
// Search posts by keyword — full flow
// ═══════════════════════════════════════════════════════════════════
export async function searchPostsByKeyword(page, keyword) {
  console.log(`\n🔍 Searching POSTS for: "${keyword}"`);

  try {
    console.log(`   🏠 Going to LinkedIn feed...`);
    await safeGoto(page, SELECTORS.urls.feed);
    await randomDelay(3000, 5000);
    await behaveLikeHuman(page);

    console.log(`   🔎 Finding search bar...`);
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
        {
          selectors: SELECTORS.searchBar.input,
          tag: SELECTORS.searchBar.tag,
        },
      );
      if (searchBarCoords) break;
    }

    if (!searchBarCoords) {
      console.log(`   ❌ Search bar not found`);
      return [];
    }

    console.log(`   🖱️  Clicking search bar...`);
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

    console.log(`   ↵ Pressing Enter...`);
    await page.keyboard.press("Enter");
    await randomDelay(4000, 6000);

    console.log(`   📝 Clicking Posts filter...`);
    await clickPostsFilter(page);
    await randomDelay(3000, 5000);

    console.log(`   🕐 Applying Latest sort...`);
    await applyLatestSort(page);
    await randomDelay(3000, 5000);

    console.log(`   📜 Loading posts...`);
    await realisticScrollToLoadPosts(page);

    console.log(`   ⬆️  Scrolling back to top...`);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await randomDelay(2000, 3500);

    console.log(`   📥 Collecting posts...`);
    const posts = await collectAndTagPosts(page);
    console.log(`   ✅ Found ${posts.length} posts`);

    return posts;
  } catch (err) {
    console.log(`   ❌ Search failed: ${err.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// Click "Posts" filter
// ═══════════════════════════════════════════════════════════════════
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
    // Fallback: text-based
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
  await humanClick(page, coords.x, coords.y);
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// Apply "Latest" sort
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// Human-like scrolling to load posts
// ═══════════════════════════════════════════════════════════════════
async function realisticScrollToLoadPosts(page) {
  let previousCount = 0;
  let noNewPostsCount = 0;

  for (let attempt = 1; attempt <= 8; attempt++) {
    const currentCount = await page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, SELECTORS.postCard.container);

    console.log(`   📊 Scroll ${attempt}: ${currentCount} posts`);
    if (currentCount >= 20) break;

    const scrollType = Math.random();
    if (scrollType < 0.3) {
      const chunks = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < chunks; c++) {
        await page.evaluate(
          (y) => window.scrollBy({ top: y, behavior: "smooth" }),
          random(80, 200),
        );
        await randomDelay(400, 900);
      }
    } else if (scrollType < 0.6) {
      await page.evaluate(
        (y) => window.scrollBy({ top: y, behavior: "smooth" }),
        random(400, 700),
      );
      await randomDelay(500, 1200);
      await humanMove(
        page,
        Math.floor(random(300, 900)),
        Math.floor(random(200, 600)),
      );
    } else {
      await page.evaluate((y) => window.scrollBy(0, y), random(500, 900));
    }

    if (Math.random() < 0.4) {
      await new Promise((r) => setTimeout(r, random(1500, 4000)));
    } else {
      await randomDelay(1500, 3000);
    }

    if (Math.random() < 0.2) {
      await page.evaluate((y) => window.scrollBy(0, -y), random(50, 150));
      await randomDelay(500, 1200);
    }

    if (currentCount === previousCount) {
      noNewPostsCount++;
      if (noNewPostsCount >= 3) {
        console.log(`   ℹ️  No more posts loading`);
        break;
      }
      await randomDelay(3000, 6000);
    } else {
      noNewPostsCount = 0;
    }
    previousCount = currentCount;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Collect and tag posts with data-post-index
// ═══════════════════════════════════════════════════════════════════
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

      // Extract author name
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

      // Extract headline
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

      // Extract time
      let postTime = "";
      const timeParas = container.querySelectorAll(sels.postTimeClass);
      for (const p of timeParas) {
        const match = (p.textContent || "").trim().match(sels.postTimePattern);
        if (match) {
          postTime = match[1];
          break;
        }
      }

      // Extract content
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

// ═══════════════════════════════════════════════════════════════════
// Scroll to post + expand "…more" + simulate reading
// ═══════════════════════════════════════════════════════════════════
export async function scrollToAndExpandPost(page, postIndex) {
  console.log(`   🖱️  Scrolling to post ${postIndex}...`);

  await page.evaluate(
    ({ idx, tag }) => {
      const el = document.querySelector(`[${tag}="${idx}"]`);
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    { idx: postIndex, tag: SELECTORS.postCard.tag },
  );
  await randomDelay(1500, 2500);

  // Check for expand button
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

    // Verify + JS fallback
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

      const finalCheck = await page.evaluate(
        ({ idx, tag, btnSelector }) => {
          const container = document.querySelector(`[${tag}="${idx}"]`);
          if (!container) return true;
          return !container.querySelector(btnSelector);
        },
        {
          idx: postIndex,
          tag: SELECTORS.postCard.tag,
          btnSelector: SELECTORS.postCard.expandMoreButton,
        },
      );

      console.log(finalCheck ? `   ✅ Expanded (JS)` : `   ⚠️  Could not expand`);
    } else {
      console.log(`   ✅ Expanded`);
    }
  } else {
    console.log(`   ℹ️  Full content already visible`);
  }

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

  const readTime = 3000 + Math.min(Math.floor(contentLen * 8), 7000);
  console.log(
    `   👀 Reading (${Math.floor(readTime / 1000)}s, ${contentLen} chars)...`,
  );
  await new Promise((r) => setTimeout(r, readTime));

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