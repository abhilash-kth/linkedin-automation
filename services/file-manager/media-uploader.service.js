import { randomDelay } from "../../helpers/delay.helper.js";
import { getAttachmentPath } from "./attachment.service.js";

export async function uploadAttachmentInComposer(page, attachmentType, filename) {
  console.log(`   📎 Uploading attachment: ${filename}`);

  const filePath = getAttachmentPath(attachmentType, filename);

  try {
    const fileInput = page.locator('input[type="file"].msg-form__attachment-upload-input').first();
    if ((await fileInput.count()) === 0) {
      console.log(`   ⚠️  File input not found in composer`);
      return false;
    }

    await fileInput.setInputFiles(filePath);
    await randomDelay(3000, 5000);
    console.log(`   ✅ Attachment uploaded`);
    return true;
  } catch (err) {
    console.log(`   ❌ Upload failed: ${err.message}`);
    return false;
  }
}