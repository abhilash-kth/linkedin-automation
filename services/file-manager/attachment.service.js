import { readdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = "./uploads";

export async function getAvailableAttachments() {
  const attachments = {
    pitchDecks: [],
    brochures: [],
    media: [],
  };

  try {
    attachments.pitchDecks = await readdir(join(UPLOAD_DIR, "pitch-decks")).catch(() => []);
    attachments.brochures = await readdir(join(UPLOAD_DIR, "brochures")).catch(() => []);
    attachments.media = await readdir(join(UPLOAD_DIR, "media")).catch(() => []);
  } catch {}

  return attachments;
}

export function getAttachmentPath(type, filename) {
  const dirs = {
    pitch_deck: "pitch-decks",
    brochure: "brochures",
    media: "media",
  };

  const dir = dirs[type] || "media";
  return join(UPLOAD_DIR, dir, filename);
}