export function extractEmails(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return (text.match(emailRegex) || []).filter(
    (e) => !e.endsWith(".png") && !e.endsWith(".jpg"),
  );
}

export function extractPhones(text) {
  const phoneRegex =
    /(?:\+?(\d{1,3}))?[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const matches = text.match(phoneRegex) || [];
  return matches.filter((p) => p.replace(/\D/g, "").length >= 10);
}

export function extractVanityName(profileUrl) {
  const match = profileUrl.match(/\/in\/([^\/\?]+)/);
  return match ? match[1] : null;
}

export function cleanText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

export function truncate(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function getFirstName(fullName) {
  return (fullName || "").split(" ")[0];
}