import { extractPhones } from "../../helpers/text-parser.helper.js";

export function parsePhonesFromProfile(pageText) {
  return extractPhones(pageText);
}