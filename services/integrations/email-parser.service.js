import { extractEmails } from "../../helpers/text-parser.helper.js";

export function parseEmailsFromProfile(pageText) {
  return extractEmails(pageText);
}