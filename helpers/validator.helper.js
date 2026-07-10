export function validateLead(lead) {
  const errors = [];

  if (!lead.name || lead.name.trim().length < 2) {
    errors.push("Name is required (min 2 chars)");
  }

  if (!lead.profileUrl || !lead.profileUrl.includes("linkedin.com/in/")) {
    errors.push("Valid LinkedIn profile URL required");
  }

  if (lead.message && lead.message.length > 1900) {
    errors.push("Message too long (max 1900 chars for InMail)");
  }

  if (lead.connectionNote && lead.connectionNote.length > 300) {
    errors.push("Connection note too long (max 300 chars)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAccountId(accountId, config) {
  const account = config.accounts.find((a) => a.id === accountId);
  return !!account;
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}