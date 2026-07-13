# 🚀 LinkedIn Automation System

AI-powered LinkedIn outreach automation with lead discovery, AI messaging, and multi-channel sync.

## 🎯 Features

- ✅ Auto lead discovery via LinkedIn search
- ✅ AI lead scoring (conversion prediction)
- ✅ Auto connection requests with personalized notes
- ✅ Auto InMail messages (Premium)
- ✅ AI-powered reply analysis
- ✅ AI-generated reply drafts
- ✅ Acceptance tracking
- ✅ Auto warming messages
- ✅ Google Sheets sync
- ✅ MongoDB storage
- ✅ Daily analytics reports

## 🏗️ Architecture

- **Local PC** (via PM2) — Browser automation tasks
- **GitHub Actions** (Free) — AI processing + Sheets sync
- **MongoDB Atlas** (Free) — Data storage
- **OpenRouter** (Free) — AI (LLaMA/Gemma/Mistral)
- **Google Sheets** (Free) — Team dashboard

## 📦 Setup

### 1. Install Dependencies

```bash
bun install
bunx playwright install chromium

The Complete Data Flow


┌────────────────────────────────────────────────────────────┐
│                    DAILY AUTOMATION FLOW                    │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│  Your PC (via PM2/manual)   │  ← BROWSER TASKS
│  Runs every day 9AM-6PM     │
└─────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  STAGE 1: DISCOVERY (Your PC — needs browser)          │
├─────────────────────────────────────────────────────────┤
│  1. Search LinkedIn with keywords                       │
│  2. Score posts with Xenova embeddings                  │
│  3. Filter posts (>50% score)                           │
│  4. Check DB for duplicates                             │
│  5. Comment/Reply with AI-generated text                │
│  6. Extract profile URL                                 │
│  7. Save lead to MongoDB + Google Sheet                 │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (writes to DB)
┌─────────────────────────────────────────────────────────┐
│  MongoDB: leads collection                              │
│  Status: "discovered" or "commented"                    │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (next day or later)
┌─────────────────────────────────────────────────────────┐
│  STAGE 2: CONNECTION REQUESTS (Your PC — needs browser)│
├─────────────────────────────────────────────────────────┤
│  1. Read leads with status "commented"                  │
│  2. For each lead:                                      │
│     ├─ Visit profile                                    │
│     ├─ Click Connect (or More → Connect)               │
│     ├─ Add note (if free notes available)              │
│     ├─ Send connection request                         │
│     ├─ Update status: "connection_sent"                │
│     └─ Save timestamp                                  │
└─────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  MongoDB: leads collection                              │
│  Status: "connection_sent"                              │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (every 6 hours)
┌─────────────────────────────────────────────────────────┐
│  STAGE 3: ACCEPTANCE CHECK (Your PC — needs browser)   │
├─────────────────────────────────────────────────────────┤
│  1. Read leads with status "connection_sent"           │
│  2. Visit each profile                                  │
│  3. Check if now 1st degree connection                  │
│  4. If accepted:                                        │
│     ├─ Update status: "accepted"                        │
│     ├─ Extract contact info (email/phone visible now)  │
│     └─ Save to DB + Sheet                              │
└─────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  STAGE 4: WARMING MESSAGE (Your PC — needs browser)    │
├─────────────────────────────────────────────────────────┤
│  1. Read leads with status "accepted"                   │
│  2. Generate warming message with AI                    │
│  3. Send message to their inbox                         │
│  4. Update status: "warming_sent"                       │
└─────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  STAGE 5: INBOX MONITORING (Your PC — every 30 min)   │
├─────────────────────────────────────────────────────────┤
│  1. Open LinkedIn messaging                             │
│  2. Scan unread conversations                           │
│  3. For each unread message:                            │
│     ├─ Get full conversation history                   │
│     ├─ Save to MongoDB conversations collection        │
│     └─ Mark lead as "replied"                          │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (writes conversations)
┌─────────────────────────────────────────────────────────┐
│  MongoDB: conversations collection                      │
│  Each conversation has array of messages                │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (GitHub Actions runs every hour)
┌─────────────────────────────────────────────────────────┐
│  STAGE 6: AI ANALYSIS (GitHub Actions — no browser)    │
├─────────────────────────────────────────────────────────┤
│  1. Read conversations from MongoDB                     │
│  2. For each conversation needing reply:                │
│     ├─ Send to OpenRouter AI                           │
│     ├─ AI analyzes: interested? sentiment? intent?     │
│     ├─ AI generates reply draft                        │
│     └─ Save analysis + draft to MongoDB                │
│  3. Mark as "ready_to_send"                            │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (writes drafts)
┌─────────────────────────────────────────────────────────┐
│  MongoDB: conversations collection                      │
│  Now has AI-generated reply drafts                      │
└─────────────────────────────────────────────────────────┘
              │
              ↓ (Your PC every 45 min)
┌─────────────────────────────────────────────────────────┐
│  STAGE 7: SEND AI REPLIES (Your PC — needs browser)    │
├─────────────────────────────────────────────────────────┤
│  1. Read conversations with "ready_to_send" drafts     │
│  2. Open LinkedIn messaging                             │
│  3. For each draft:                                     │
│     ├─ Open the conversation                           │
│     ├─ Type the AI-generated reply                     │
│     ├─ Send it                                         │
│     └─ Mark as "sent"                                  │
└─────────────────────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  STAGE 8: SYNC TO GOOGLE SHEETS (GitHub Actions - 6h) │
├─────────────────────────────────────────────────────────┤
│  1. Read all leads from MongoDB                         │
│  2. Update Google Sheet with latest data                │
│  3. Team can review everything in real-time             │
└─────────────────────────────────────────────────────────┘


On PC (needs browser):

✅ LinkedIn login
✅ Search & discover posts
✅ Comment on posts
✅ Send connection requests
✅ Check acceptances
✅ Send warming messages
✅ Scan inbox
✅ Send AI-generated replies

On GitHub Actions (no browser):

✅ AI analyze conversations (OpenRouter API)
✅ Generate reply drafts (OpenRouter API)
✅ Sync MongoDB to Google Sheets
✅ Generate daily reports
✅ Backup MongoDB nightly


Data Flow in Simple Terms

┌───────────┐    ┌──────────┐    ┌──────────────┐
│  Your PC  │←→ │ MongoDB  │ ←→│Google Sheets │
│ (Browser) │    │  (Data)  │    │  (Viewing)   │
└───────────┘    └──────────┘    └──────────────┘
       ↑              ↕
       │        ┌──────────┐
       │        │  GitHub  │
       └────────│ Actions  │
                │(AI/Sync) │
                └──────────┘

1. Your PC writes to MongoDB:
 Discovered leads
 Comments posted
 Connections sent
 Messages received

2. GitHub Actions reads from MongoDB:
 Fetches new leads to score
 Fetches new conversations to analyze
 Fetches all data to sync to Sheets

3. GitHub Actions writes to MongoDB:
 AI-generated reply drafts
 Analysis results
 Scoring updates

4. Your PC reads from MongoDB:
 Reads AI reply drafts → Sends them via browser
 Reads accepted leads → Sends warming messages
 Reads pending connections → Checks acceptance

5. Google Sheets:
 Read-only view for humans
 Updates every 6 hours from MongoDB


