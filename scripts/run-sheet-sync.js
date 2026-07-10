import { syncFromSheet, syncToSheet } from "../controllers/sync.controller.js";

const args = process.argv.slice(2);
const direction = args[0] || "both";

if (direction === "from" || direction === "both") {
  await syncFromSheet();
}

if (direction === "to" || direction === "both") {
  await syncToSheet();
}