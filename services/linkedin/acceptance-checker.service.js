import { safeGoto, closeMessagingOverlays } from "../browser/navigation.service.js";
import { detectProfileStatus } from "./profile.service.js";
import { randomDelay } from "../../helpers/delay.helper.js";
import { behaveLikeHuman } from "../../helpers/human-behavior.helper.js";

/**
 * Check if a specific lead has accepted the connection request
 */
export async function checkAcceptance(page, profileUrl) {
  console.log(`   🔍 Checking acceptance: ${profileUrl}`);

  const navOk = await safeGoto(page, profileUrl);
  if (!navOk) return { accepted: false, reason: "navigation_failed" };

  await closeMessagingOverlays(page);
  await behaveLikeHuman(page);
  await randomDelay(2000, 3000);

  const status = await detectProfileStatus(page);

  if (status.isFirstDegree) {
    console.log(`   ✅ ACCEPTED! Now 1st degree connection`);
    return { accepted: true, distance: "1st" };
  }

  if (status.hasPending) {
    console.log(`   ⏳ Still pending`);
    return { accepted: false, reason: "still_pending" };
  }

  console.log(`   ❌ Not accepted (distance: ${status.distance})`);
  return { accepted: false, reason: "not_1st_degree", distance: status.distance };
}