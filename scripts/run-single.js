import { smartOutreach } from "../controllers/outreach.controller.js";

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error(
    '❌ Usage: node scripts/run-single.js <accountId> <profileUrl> "<message>" [--send] [--force]',
  );
  process.exit(1);
}

const [accountId, profileUrl, ...rest] = args;
const actuallySend = rest.includes("--send");
const skipBusinessHours = rest.includes("--force");
const messageText = rest.filter((x) => !x.startsWith("--")).join(" ");

// smartOutreach(accountId, profileUrl, messageText, { actuallySend, skipBusinessHours });
try {
  const result = await smartOutreach(accountId, profileUrl, messageText, {
    actuallySend,
    skipBusinessHours,
  });

  console.log("\nResult:");
  console.log(result);
} catch (err) {
  console.error("Fatal Error:");
  console.error(err);
  process.exit(1);
}
