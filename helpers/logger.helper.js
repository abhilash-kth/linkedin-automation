import { appendFile, mkdir } from "fs/promises";
import { join } from "path";

const LOG_DIR = "./data/logs";

// Ensure log directory exists
try {
  await mkdir(LOG_DIR, { recursive: true });
} catch {}

export function logInfo(context, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ✅ [${context}] ${message}`);
}

export function logWarn(context, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ⚠️  [${context}] ${message}`);
}

export function logError(context, message, error = null) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ [${context}] ${message}`);
  if (error) console.error(`   Error: ${error.message || error}`);

  // Also write to file
  const logLine = `${timestamp} | ERROR | ${context} | ${message} | ${error?.message || ""}\n`;
  appendFile(join(LOG_DIR, "errors.log"), logLine).catch(() => {});
}

export async function logAIDecision(leadName, action, details) {
  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} | ${leadName} | ${action} | ${JSON.stringify(details)}\n`;
  await appendFile(join(LOG_DIR, "ai-decisions.log"), logLine).catch(() => {});
}

export async function logOutreach(leadName, action, result) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, leadName, action, result };
  console.log(`📊 [Outreach] ${leadName} → ${action} → ${result.success ? "✅" : "❌"}`);

  try {
    const { readFile, writeFile } = await import("fs/promises");
    const filePath = join(LOG_DIR, "outreach-history.json");
    let history = [];
    try {
      const data = await readFile(filePath, "utf-8");
      history = JSON.parse(data);
    } catch {}
    history.push(entry);
    await writeFile(filePath, JSON.stringify(history, null, 2));
  } catch {}
}