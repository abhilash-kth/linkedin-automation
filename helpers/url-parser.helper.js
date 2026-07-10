export function extractVanityName(profileUrl) {
  const match = profileUrl.match(/\/in\/([^\/\?]+)/);
  return match ? match[1] : null;
}

export function buildInviteUrl(vanityName) {
  return `https://www.linkedin.com/preload/custom-invite/?vanityName=${vanityName}`;
}

export function buildMessagingUrl(profileUrn) {
  return `https://www.linkedin.com/messaging/compose/?profileUrn=${profileUrn}`;
}

export function isLinkedInUrl(url) {
  return (
    url && (url.includes("linkedin.com/in/") || url.includes("linkedin.com/"))
  );
}

export function normalizeProfileUrl(url) {
  if (!url) return url;
  url = url.split("?")[0]; // Remove query params
  if (!url.endsWith("/")) url += "/";
  if (!url.startsWith("https://")) url = "https://www.linkedin.com" + url;
  return url;
}