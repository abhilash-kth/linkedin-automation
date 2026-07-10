import { getAvailableAttachments } from "./attachment.service.js";

export async function pickAttachment(attachmentType) {
  const available = await getAvailableAttachments();

  if (attachmentType === "pitch_deck" && available.pitchDecks.length > 0) {
    return { type: "pitch_deck", filename: available.pitchDecks[0] };
  }

  if (attachmentType === "brochure" && available.brochures.length > 0) {
    return { type: "brochure", filename: available.brochures[0] };
  }

  return null;
}