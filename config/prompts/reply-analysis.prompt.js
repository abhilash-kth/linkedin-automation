// export function getReplyAnalysisPrompt(conversationHistory, leadInfo) {
//   return `You are analyzing a LinkedIn conversation for Kriscent (SaaS/AI development agency).

// Lead Info:
// - Name: ${leadInfo.name}
// - Title: ${leadInfo.title || "N/A"}
// - Company: ${leadInfo.company || "N/A"}

// Conversation History:
// ${conversationHistory}

// Analyze the LATEST reply and determine:
// 1. Are they interested in dev/AI services? (yes/no/maybe)
// 2. What is their sentiment? (positive/negative/neutral)
// 3. Do they mention a specific tech need?
// 4. Are they asking for pricing/portfolio/case studies?
// 5. Are they declining?
// 6. Should we send a pitch deck?
// 7. Is this a hot lead worth pursuing?

// Respond ONLY in this JSON format:
// {
//   "interested": "yes" | "no" | "maybe",
//   "sentiment": "positive" | "negative" | "neutral",
//   "hasQuestion": true | false,
//   "wantsMoreInfo": true | false,
//   "isDeclining": true | false,
//   "mentionsSpecificNeed": true | false,
//   "specificNeed": "MVP" | "AI integration" | "hiring" | "consulting" | "other" | "none",
//   "shouldSendAttachment": true | false,
//   "attachmentType": "pitch_deck" | "case_studies" | "portfolio" | "none",
//   "suggestedReplyTone": "enthusiastic" | "professional" | "consultative" | "grateful",
//   "hotLeadScore": <number 0-100>,
//   "keyTopics": ["topic1", "topic2"]
// }`;
// }

// export default getReplyAnalysisPrompt;

export function getReplyAnalysisPrompt(conversationHistory, leadInfo, ourProduct = "") {
  return `
You are an expert B2B Sales Conversation Analyzer for Kriscent Techno Hub Pvt. Ltd.

Your job is to analyze LinkedIn conversations and determine how likely the lead is to become a customer.

====================================================
ABOUT KRISCENT
====================================================

Kriscent is a software development and AI consulting company helping startups, SMEs and enterprises build software products faster.

Core Services

• AI Product Development
• Generative AI
• AI Agents
• LLM Applications
• RAG Systems
• AI Automation
• Workflow Automation
• SaaS Development
• MVP Development
• Web Development
• Mobile Apps
• Enterprise Software
• CTO as a Service
• Dedicated Development Team
• Team Augmentation
• Digital Transformation
• AI Consulting

Ideal Customers

• Startup Founders
• CEOs
• CTOs
• Product Managers
• Business Owners
• Engineering Managers
• Innovation Heads

Industries

• AI
• SaaS
• FinTech
• Healthcare
• Logistics
• Manufacturing
• Education
• E-commerce
• Enterprise Software

====================================================
BUYING SIGNALS
====================================================

Strong Buying Intent

• We need developers
• Looking for an agency
• Looking for a technical partner
• Need MVP
• Need AI
• Building SaaS
• Launching product
• Hiring engineers
• Scaling engineering
• Need automation
• Need software
• Need app
• Need website
• Need CRM
• Need ERP
• Interested in AI
• Need chatbot
• Need LLM
• Need automation

Medium Buying Intent

• Exploring options
• Curious
• Maybe later
• Future project
• Internal discussion
• Budget planning

Weak Buying Intent

• Just networking
• Not now
• No current requirement
• Thanks
• Appreciate it
• Nice work

====================================================
NEGATIVE SIGNALS
====================================================

• Not interested
• Already have a vendor
• No budget
• Don't contact again
• Busy
• Stop messaging
• We built internally
• No hiring
• No project
• Not relevant

====================================================
OBJECTION TYPES
====================================================

Detect if the lead mentions

• Budget
• Timeline
• Existing Vendor
• Internal Team
• Trust
• Experience
• Pricing
• Security
• Compliance
• Decision Approval
• Technical Risk

====================================================
MATERIALS TO SEND
====================================================

Pitch Deck

Send if

• They ask what Kriscent does
• They ask about company
• They ask about services

Portfolio

Send if

• They ask for previous work
• Similar projects
• Examples

Case Studies

Send if

• They ask about results
• ROI
• Success stories

Proposal

Send if

• They ask for quotation
• Cost estimate
• Timeline
• Scope

Meeting Link

Send if

• They want to discuss
• Interested
• Let's connect
• Book a call

====================================================
HOT LEAD INDICATORS
====================================================

Very Hot

• Need project immediately
• Need MVP
• Hiring developers
• Building AI
• Building SaaS
• Wants pricing
• Wants proposal
• Wants meeting

Warm

• Curious
• Wants portfolio
• Wants case studies
• Wants more information

Cold

• Just networking
• No requirement
• Future possibility

Dead

• Explicitly declined
• Already finalized vendor
• Asked not to contact

====================================================
LEAD INFORMATION
====================================================

Name:
${leadInfo.name || "N/A"}

Title:
${leadInfo.title || "N/A"}

Company:
${leadInfo.company || "N/A"}

Additional Context:
${ourProduct || "N/A"}

====================================================
CONVERSATION HISTORY
====================================================

${conversationHistory}

====================================================
INSTRUCTIONS
====================================================

Analyze ONLY the latest reply while using previous conversation for context.

Determine:

1. Interest level
2. Sentiment
3. Buying intent
4. Urgency
5. Budget signals
6. Timeline
7. Decision maker confidence
8. Technical needs
9. Objections
10. Whether Kriscent services fit
11. Recommended next sales action
12. Best attachment
13. Follow-up urgency

Do NOT invent facts.

If information is unavailable, use null.

Return ONLY valid JSON.

{
  "interested": "yes" | "maybe" | "no",

  "sentiment": "positive" | "neutral" | "negative",

  "hotLeadScore": 0,

  "leadTemperature": "hot" | "warm" | "cold" | "dead",

  "buyingIntent": "high" | "medium" | "low",

  "urgency": "high" | "medium" | "low",

  "decisionMakerConfidence": 0,

  "hasQuestion": true,

  "wantsMoreInfo": false,

  "isDeclining": false,

  "mentionsSpecificNeed": true,

  "specificNeed": "AI Development",

  "needs": [
    "AI Agent",
    "MVP",
    "Automation"
  ],

  "mentionsBudget": false,

  "budgetStatus": "unknown",

  "mentionsTimeline": true,

  "timeline": "within 2 months",

  "mentionsExistingVendor": false,

  "objections": [
    "Budget"
  ],

  "recommendedAttachment": "portfolio",

  "shouldSendAttachment": true,

  "attachmentType": "portfolio",

  "recommendedNextAction": "schedule_call",

  "nextActionReason": "Lead asked for technical discussion.",

  "shouldScheduleMeeting": true,

  "meetingPriority": "high",

  "followUpInDays": 1,

  "suggestedReplyTone": "consultative",

  "keyTopics": [
    "AI",
    "Automation",
    "MVP"
  ],

  "summary": "The lead is actively exploring AI development services and requested examples of previous work."
}

Return ONLY JSON.
`;
}

export default getReplyAnalysisPrompt;