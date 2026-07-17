# 🚀 Kriscent LinkedIn Automation System

> AI-powered LinkedIn outreach automation with lead discovery, AI messaging, and multi-channel sync.
> Runs **fully automatically** on your PC via PM2 — no manual work needed.
> **Total monthly cost: $0**

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Setup Guide](#-setup-guide)
- [Daily Schedule](#-daily-schedule)
- [Complete Data Flow](#-complete-data-flow)
- [Environment Variables](#-environment-variables)
- [Commands Reference](#-commands-reference)
- [PM2 Commands](#-pm2-commands)
- [Google Sheets Structure](#-google-sheets-structure)
- [AI Models](#-ai-models)
- [Safety Limits](#-safety-limits)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [Important Rules](#-important-rules)
- [Quick Start Checklist](#-quick-start-checklist)
- [Daily Routine](#-daily-routine)
- [Total Monthly Cost](#-total-monthly-cost)
- [Changelog](#-changelog)

---

## ✅ Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🔍 Lead Discovery | Searches LinkedIn posts by keywords, scores with AI embeddings | ✅ Working |
| 🤖 AI Scoring | Uses Xenova transformer (local, free) to score post relevance | ✅ Working |
| 💬 Comment Automation | Generates & posts AI comments on relevant posts (inline, same page) | ✅ Working |
| 📋 Latest Sort | Automatically sorts search results by "Latest" posts first | ✅ Working |
| 🔗 Post URL Capture | Copies post URL via 3-dot menu for future reply tracking | ✅ Working |
| 📨 Connection Requests | Sends personalized connection requests with/without notes | ✅ Working |
| ✅ Acceptance Tracking | Detects who accepted connection requests | ✅ Working |
| 🤝 Warming Messages | Sends AI-generated intro messages to new connections | ✅ Working |
| 📥 Inbox Monitoring | Scans LinkedIn inbox for unread messages every 30 minutes | ✅ Working |
| 🧠 AI Reply Analysis | Analyzes conversations: interest level, sentiment, intent | ✅ Working |
| ✍️ AI Reply Generation | Generates contextual replies using OpenRouter/Groq | ✅ Working |
| 📊 Google Sheets Sync | 46-column live dashboard updated every 6 hours | ✅ Working |
| 🗄️ MongoDB Storage | All leads, conversations, history stored in cloud DB | ✅ Working |
| 📈 Daily Reports | Auto-generated analytics every morning | ✅ Working |
| 🔄 Duplicate Prevention | Skips already-commented posts and recently-processed leads | ✅ Working |
| ↩️ Comment Reply Detection | Detects when post authors reply to your comments | 🔧 Building |
| 📇 Contact Info Extraction | Clicks Contact Info button, extracts email/phone/website | ✅ Working |
| 🛡️ Human-Like Behavior | Random delays, typing speed, mouse movements, scroll patterns | ✅ Working |
| ⏰ Auto-Schedule | PM2 runs everything automatically during business hours | ✅ Working |
| 🔁 Auto-Recovery | PM2 auto-restarts on crash, survives PC restart | ✅ Working |

---

## 🏗️ Architecture

### High-Level System Diagram

```
┌────────────────────────────────────────────────────────┐
│                    YOUR PC (via PM2)                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Playwright  │  │   Xenova     │  │  node-cron   │  │
│  │  (Browser)   │  │ (Embeddings) │  │ (Scheduler)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └────────┬────────┘                 │          │
│                   ↓                          │          │
│          ┌────────────────┐                  │          │
│          │  Controllers   │←─────────────────┘          │
│          │ (Business      │                             │
│          │  Logic)        │                             │
│          └────────┬───────┘                             │
│                   │                                      │
│                   ↓                                      │
│          ┌────────────────┐                              │
│          │   Services     │                              │
│          │ (LinkedIn,     │                              │
│          │  AI, DB)       │                              │
│          └────────┬───────┘                              │
│                   │                                      │
└───────────────────┼──────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
  ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │ MongoDB  │ │OpenRouter│ │Google Sheets │
  │  Atlas   │ │  /Groq   │ │ (Dashboard)  │
  │ (Data)   │ │  (AI)    │ │              │
  └──────────┘ └──────────┘ └──────────────┘
        ↑                          ↑
        │                          │
┌───────┴──────────────────────────┴───────────────┐
│              GITHUB ACTIONS (Cloud)               │
│                                                    │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐ │
│  │ Sheet  │  │ Daily  │  │ Mongo  │  │ AI Score │ │
│  │ Sync   │  │ Report │  │ Backup │  │ (Cloud)  │ │
│  └────────┘  └────────┘  └────────┘  └──────────┘ │
└────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
LinkedIn ←→ Playwright Browser ←→ Services ←→ MongoDB
                                       ↓
                              OpenRouter/Groq (AI)
                                       ↓
                              Google Sheets (Sync)
```

### What Runs Where

| Component | Location | Needs Browser | Cost |
|-----------|----------|---------------|------|
| Lead Discovery | Your PC | ✅ Yes | Free |
| Post Comments | Your PC | ✅ Yes | Free |
| Connection Requests | Your PC | ✅ Yes | Free |
| Acceptance Check | Your PC | ✅ Yes | Free |
| Warming Messages | Your PC | ✅ Yes | Free |
| Inbox Monitor | Your PC | ✅ Yes | Free |
| AI Reply Sender | Your PC | ✅ Yes | Free |
| AI Analysis | Your PC (scheduled) | ❌ No | Free |
| Xenova Embeddings | Your PC (local) | ❌ No | Free |
| Sheet Sync | GitHub Actions | ❌ No | Free |
| Daily Report | GitHub Actions | ❌ No | Free |
| MongoDB Backup | GitHub Actions | ❌ No | Free |

---

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Bun** | JavaScript runtime (faster than Node) | Latest |
| **Playwright** | Browser automation | 1.61+ |
| **playwright-extra** | Stealth plugin for anti-detection | Latest |
| **Xenova Transformers** | Local AI embeddings (384-dim vectors) | Latest |
| **Mongoose** | MongoDB ODM | 8.8+ |
| **node-cron** | Task scheduling | 3.0+ |
| **googleapis** | Google Sheets API | 144+ |
| **Express** | API server (optional) | 4.21+ |
| **OpenRouter API** | Free AI models (LLaMA, Gemma, Mistral) | REST API |
| **Groq API** | Fast AI fallback | REST API |
| **MongoDB Atlas** | Cloud database (M0 free tier) | 7.0+ |
| **PM2** | Process manager (auto-restart, startup) | Latest |

---

## 📦 Setup Guide

### Prerequisites

- Windows 10/11 PC
- Node.js 20+ installed
- Bun installed
- Git installed
- LinkedIn Premium account (recommended but not required)

### Step 1: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/linkedin-automation.git
cd linkedin-automation/server
bun install
bunx playwright install chromium
```

### Step 2: Setup External Services

**MongoDB Atlas (Free)**
1. Create account at mongodb.com/cloud/atlas
2. Create free M0 cluster (Mumbai region)
3. Create database user (admin/password)
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Copy connection string to `.env`

**OpenRouter (Free AI)**
1. Sign up at openrouter.ai
2. Generate API key
3. Copy key to `.env`
4. No credit card needed for free models

**Google Sheets API**
1. Create project at console.cloud.google.com
2. Enable Google Sheets API
3. Create service account → Download JSON key
4. Create Google Sheet → Share with service account email as Editor
5. Copy credentials to `.env`

### Step 3: Configure Environment

```bash
cp .env.example .env
notepad .env
```

Fill in all values (see [Environment Variables](#-environment-variables) section).

### Step 4: First-Time LinkedIn Login

```bash
bun run manual-login account_1
```

Browser opens → Login manually → Script detects and saves session.

### Step 5: Embed Keywords

```bash
bun scripts/embed-keywords.js
```

### Step 6: Setup Google Sheet Headers

```bash
bun setup-sheet.js
```

### Step 7: Test in Safe Mode

```bash
# Discovery (types but doesn't post comments)
bun run discover

# Outreach (types but doesn't send)
bun run batch account_1 data/leads.json
```

### Step 8: Go Live with PM2

```bash
npm install -g pm2 pm2-windows-startup
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2-startup install
```

### Step 9: Verify

```bash
pm2 status
pm2 logs linkedin-scheduler --lines 20
```

You should see: `✅ MongoDB connected` and `✅ LIVE`

---

## 📅 Daily Schedule

**Active Hours:** 10:30 AM – 6:30 PM IST (Monday to Saturday)
**Sunday:** ❌ No activity (human pattern)

| Time | Task | Description | Control |
|------|------|-------------|---------|
| 10:30 AM | 🔐 Session Check | Verifies LinkedIn login valid | Always |
| 10:45 AM | 🔍 Morning Discovery | Search posts → Score → Comment → Save leads | ACTUALLY_COMMENT |
| 12:30 PM | 📨 Morning Connections | Send connect requests to discovered leads | ACTUALLY_SEND |
| 01:30 PM | 💬 Comment Replies | Check if post authors replied to comments | ACTUALLY_SEND |
| 02:00 PM | ✅ Acceptance Check | Detect who accepted connection requests | Always (read-only) |
| 02:30 PM | 🤝 Warming Messages | Send intro to newly accepted connections | ACTUALLY_SEND |
| 03:00 PM | 🤖 AI Reply (Afternoon) | Read inbox → AI analyze → Send reply | ACTUALLY_SEND |
| 04:00 PM | 🔍 Evening Discovery | Second discovery round (afternoon posts) | ACTUALLY_COMMENT |
| 05:30 PM | 📨 Evening Connections | Second batch of connections | ACTUALLY_SEND |
| 06:00 PM | 💬 Evening Comment Replies | Second comment reply check | ACTUALLY_SEND |
| 06:15 PM | 🤖 AI Reply (Final) | Last inbox check of the day | ACTUALLY_SEND |
| 06:30 PM | 💤 End of Workday | Print daily stats, pause until tomorrow | Auto |

### Task Priority Queue

```
Priority 10 → Session Check        (critical — runs first)
Priority  9 → AI Reply             (user waiting — urgent)
Priority  8 → Comment Replies      (time sensitive)
Priority  7 → Acceptance Check     (read-only)
Priority  6 → Warming Messages
Priority  5 → Connections
Priority  4 → Contact Extraction
Priority  3 → Discovery            (longest task — runs last)
```

### Auto-Catchup (PC Was Off)

If PC was off during business hours:

```
PC wakes up → Detects gap > 4 hours → Auto-runs:
  5 seconds later  → SESSION_CHECK
  5 minutes later  → AI_REPLY catchup
```

No manual action needed.

---

## 🔄 Complete Data Flow

### Stage 1: Discovery (Your PC — Browser)

```
Search LinkedIn → Type keyword → Click Posts → Apply Latest Sort
    ↓
Scroll through posts (human-like, one at a time)
    ↓
For each post:
  ├─ Scroll to post (like reading)
  ├─ Click "…more" to expand
  ├─ Read content (wait 4-8 seconds)
  ├─ Generate Xenova embedding
  ├─ Calculate cosine similarity vs keyword
  │
  ├─ IF score >= 50%:
  │   ├─ Check DB: duplicate? → Skip
  │   ├─ Check DB: already commented? → Skip
  │   ├─ Copy post URL (3-dot menu → Copy link)
  │   ├─ Generate AI comment (OpenRouter/Groq)
  │   ├─ Click Comment button (inline)
  │   ├─ Type comment slowly (human-like)
  │   ├─ Click Submit
  │   ├─ Save to MongoDB + Google Sheet
  │   └─ Cooldown 45-105 seconds
  │
  └─ ELSE: Skip → Scroll to next post
```
MongoDB Status after: `commented` or `discovered`

### Stage 2: Connection Requests (Your PC — Browser)

```
Read leads with status "commented" from MongoDB
    ↓
For each lead:
  ├─ Visit their LinkedIn profile
  ├─ Click Connect (or More → Connect)
  ├─ Add personalized note (if free notes available)
  ├─ Send connection request
  ├─ Update MongoDB: status → "connection_sent"
  └─ Cooldown between requests
```

### Stage 3: Acceptance Check (Your PC — Browser)

```
Read leads with status "connection_sent"
    ↓
For each lead:
  ├─ Visit their profile
  ├─ Check if now "1st degree"
  ├─ IF accepted:
  │   ├─ Update MongoDB: status → "accepted"
  │   ├─ Click "Contact info" button
  │   ├─ Extract email, phone, website
  │   └─ Update MongoDB + Sheet with contact details
  └─ ELSE: still pending → skip
```

### Stage 4: Warming Message (Your PC — Browser)

```
Read leads with status "accepted"
    ↓
For each lead:
  ├─ Generate warming message with AI
  ├─ Open LinkedIn messaging
  ├─ Send warm intro message
  └─ Update MongoDB: status → "warming_sent"
```

### Stage 5: Inbox Monitor (Your PC — Browser)

```
Open LinkedIn messaging page
    ↓
Scan all conversations
    ↓
For each unread message:
  ├─ Get full conversation history
  ├─ Save messages to MongoDB conversations collection
  └─ Mark lead as "replied"
```

### Stage 6: AI Analysis (Your PC — No Browser)

```
Read conversations from MongoDB
    ↓
For each conversation needing reply:
  ├─ Send to AI (OpenRouter → Groq fallback)
  ├─ AI determines: interested? declining? needs info?
  ├─ AI generates contextual reply draft
  └─ Save to MongoDB: status → "ready_to_send"
```

### Stage 7: Send AI Replies (Your PC — Browser)

```
Read conversations with "ready_to_send" drafts
    ↓
For each draft:
  ├─ Open LinkedIn messaging
  ├─ Find the conversation
  ├─ Type AI-generated reply (human-like)
  ├─ Send it
  └─ Update MongoDB: status → "sent"
```

### Stage 8: Google Sheets Sync (GitHub Actions — Cloud)

```
Every 6 hours (runs on GitHub, not your PC):
  ├─ Read all leads from MongoDB
  ├─ Update 46-column Google Sheet
  └─ Team reviews leads in real-time
```

---

## ⚙️ Environment Variables

### Live Mode Control

```env
ACTUALLY_SEND=true          # Controls: connections, messages, AI replies
ACTUALLY_COMMENT=true       # Controls: comments on discovery posts
```

| Variable | false | true |
|----------|-------|------|
| `ACTUALLY_SEND` | 🔒 Types but does NOT send | ✅ Actually sends |
| `ACTUALLY_COMMENT` | 🔒 Finds posts but does NOT comment | ✅ Actually comments |

### Database

```env
MONGODB_URI=mongodb+srv://admin:password@cluster0.xxxxx.mongodb.net/linkedin-automation
```

### AI Keys

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
GROQ_API_KEY=gsk_xxxxx
```

### Google Sheets

```env
GOOGLE_SHEETS_ID=1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Daily Limits

```env
MAX_MESSAGES_PER_DAY=15
MAX_CONNECTIONS_PER_DAY=20
MAX_COMMENTS_PER_DAY=30
```

### Account

```env
ACCOUNT_ID=account_1
TIMEZONE=Asia/Kolkata
NODE_ENV=production
```

### ⚠️ After Every .env Change

```bash
pm2 restart linkedin-scheduler --update-env
```

---

## 💻 Commands Reference

### Manual Commands (for testing)

```bash
# LinkedIn Login
bun run manual-login account_1

# Discovery (safe mode — types but doesn't post)
bun run discover

# Discovery (REAL — actually posts comments)
bun run discover:real

# Outreach (safe)
bun run batch account_1 data/leads.json

# Outreach (REAL)
bun run send

# Check Acceptances
bun run check-acceptance

# Send Warming Messages
bun run warming

# Check Inbox
bun run monitor account_1 data/leads.json

# Process AI Replies
bun run ai-reply

# Sync Google Sheets
bun run sync-sheet

# Embed Keywords to MongoDB
bun scripts/embed-keywords.js

# Setup Sheet Headers
bun setup-sheet.js
```

## 🔧 PM2 Commands

```bash
# One-time setup
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2-startup install

# Control
pm2 status                    # Show running processes
pm2 logs linkedin-scheduler   # Live logs
pm2 logs --lines 100          # Last 100 lines
pm2 restart linkedin-scheduler --update-env  # Restart with new .env
pm2 stop linkedin-scheduler   # Pause
pm2 start linkedin-scheduler  # Resume
pm2 monit                     # Interactive dashboard
pm2 flush                     # Clear old logs
```

---

## 📊 Google Sheets Structure

### 46 Columns (A to AT)

| Column | Field | Updated When |
|--------|-------|---------------|
| A | Date Discovered | Discovery |
| B | Name | Discovery |
| C | Profile URL | Discovery |
| D | Headline | Discovery |
| E | Location | Contact extraction |
| F | Email | Contact extraction |
| G | Phone | Contact extraction |
| H | Website | Contact extraction |
| I | Score (%) | Discovery |
| J | Category (hot/warm/cold) | Discovery |
| K | Keyword | Discovery |
| L | Source (post/search) | Discovery |
| M | Post Content | Discovery |
| N | Post URL | Discovery |
| O | Post Time | Discovery |
| P | Comment Posted (Yes/No) | After commenting |
| Q | Our Comment Text | After commenting |
| R | Comment Date | After commenting |
| S | Connection Sent (Yes/No) | After connection |
| T | Connection Note | After connection |
| U | Connection Date | After connection |
| V | Connection Status | Acceptance check |
| W | Accepted Date | When accepted |
| X | Warming Message Sent | After warming |
| Y | Warming Message Text | After warming |
| Z | Warming Date | After warming |
| AA | InMail Sent | If InMail sent |
| AB | InMail Text | If InMail sent |
| AC | InMail Date | If InMail sent |
| AD | Replied (Yes/No) | On reply detection |
| AE | First Reply Date | On first reply |
| AF | Total Replies | Each reply |
| AG | Last Reply Preview | Each reply |
| AH | AI Interest Level | AI analysis |
| AI | AI Sentiment | AI analysis |
| AJ | Follow-up Needed | AI analysis |
| AK | Follow-up 1 Sent | After follow-up |
| AL | Follow-up 1 Date | After follow-up |
| AM | Follow-up 2 Sent | After follow-up |
| AN | Follow-up 2 Date | After follow-up |
| AO | Final Status | Ongoing |
| AP | Meeting Scheduled | If meeting booked |
| AQ | Meeting Date | If meeting booked |
| AR | Notes | Manual |
| AS | Account Used | Any action |
| AT | Last Updated | Any update |

---

## 🤖 AI Models

### AI Fallback Chain

```
OpenRouter (Free Tier)
  ├─ meta-llama/llama-3.1-8b-instruct:free (default)
  ├─ google/gemma-2-9b-it:free (fallback 1)
  ├─ mistralai/mistral-7b-instruct:free (fallback 2)
  └─ qwen/qwen-2.5-7b-instruct:free (fallback 3)
          ↓ if all fail
Groq (Fast & Reliable)
  └─ llama-3.1-8b-instant (always works)
```

### Local AI (No Internet)

```
Xenova/all-MiniLM-L6-v2
  ├─ Runs 100% locally on your PC
  ├─ 384-dimensional sentence embeddings
  ├─ ~50ms per embedding
  ├─ ~30MB model (auto-downloaded first run)
  └─ Used for: Post scoring, keyword matching
```

---

## 🛡️ Safety Limits

### Daily Limits

| Action | Max Per Day | Why |
|--------|-------------|-----|
| Comments | 30 | LinkedIn soft limit |
| Connection Requests | 20 | LinkedIn weekly limit ~100 |
| Messages | 15 | Avoid spam detection |
| Profile Visits | 50 | LinkedIn tracking |

### Human-Like Behaviors

| Behavior | Implementation |
|----------|-----------------|
| Typing speed | 80-200ms per character (variable) |
| Occasional typos | 2% chance, auto-corrected |
| Reading pauses | 4-8 seconds per post |
| Between posts | 45-105 seconds cooldown |
| Between keywords | 30-60 seconds cooldown |
| Mouse movement | Curved paths with 8-15 steps |
| Scrolling | Variable speed, random amounts |
| Business hours only | 10:30 AM - 6:30 PM Mon-Sat |
| No Sunday activity | Respects weekend patterns |

---

## 🛠️ Troubleshooting

### MongoDB Connection Error

```
❌ MongoDB connection failed: querySrv ECONNREFUSED
```

**Fix:**
1. MongoDB Atlas → Security → Network Access → Add Current IP
2. Wait 60 seconds
3. `pm2 restart linkedin-scheduler --update-env`

### Messages Not Sending (Safe Mode)

```
⚠️  Safe mode — typed but NOT sent
```

**Fix:**
```bash
# Edit .env
ACTUALLY_SEND=true
ACTUALLY_COMMENT=true

# Restart with new values
pm2 restart linkedin-scheduler --update-env
```

### Session Expired

```
❌ Session expired
```

**Fix:**
```bash
bun run manual-login account_1
pm2 restart linkedin-scheduler
```

### OpenRouter Models All Failing

```
🔄 OpenRouter meta-llama failed
🔄 OpenRouter gemma-2 failed
✅ Groq llama-3.1-8b-instant succeeded
```

Normal! Free models have rate limits. Groq fallback handles it.

### PC Was Off — Missed Tasks

No action needed. Auto-catchup detects gaps and runs critical tasks.

### Changed .env But Nothing Changed

Always restart with `--update-env`:

```bash
pm2 restart linkedin-scheduler --update-env
```

---

## 📁 Project Structure

```
linkedin-automation/
├── server/
│   ├── config/
│   │   ├── config.js                    # App configuration
│   │   ├── selectors.js                 # All LinkedIn CSS selectors (CENTRAL)
│   │   ├── ai.config.js                 # AI model settings
│   │   ├── mongodb.config.js            # MongoDB connection config
│   │   ├── google-sheets.config.js      # Sheets API config
│   │   └── prompts/
│   │       ├── comment-generation.prompt.js
│   │       ├── reply-on-comment.prompt.js
│   │       ├── warming-message.prompt.js
│   │       ├── reply-analysis.prompt.js
│   │       ├── reply-generation.prompt.js
│   │       └── lead-scoring.prompt.js
│   │
│   ├── controllers/
│   │   ├── discovery.controller.js      # Lead discovery + commenting
│   │   ├── outreach.controller.js       # Single lead outreach
│   │   ├── batch.controller.js          # Batch outreach processing
│   │   ├── auth.controller.js           # LinkedIn login (auto + manual)
│   │   ├── monitor.controller.js        # Inbox monitoring
│   │   ├── ai-reply.controller.js       # AI reply processing
│   │   ├── acceptance-check.controller.js # Connection acceptance
│   │   ├── warming-message.controller.js  # Warming messages
│   │   ├── scoring.controller.js        # Lead scoring
│   │   └── sync.controller.js           # Google Sheets sync
│   │
│   ├── services/
│   │   ├── browser/
│   │   │   ├── browser.service.js       # Playwright launch/setup
│   │   │   ├── session.service.js       # Session validation
│   │   │   ├── navigation.service.js    # safeGoto, humanRefresh
│   │   │   └── stealth.service.js       # Anti-detection
│   │   │
│   │   ├── linkedin/
│   │   │   ├── profile.service.js       # Detect profile status
│   │   │   ├── connection.service.js    # Send connection requests
│   │   │   ├── message.service.js       # Send messages/InMail
│   │   │   ├── post-scraper.service.js  # Search posts, expand, extract
│   │   │   ├── post-commenter.service.js # Comment inline + copy link
│   │   │   ├── comment-reader.service.js # Read existing comments
│   │   │   ├── contact-info.service.js  # Extract email/phone
│   │   │   ├── inbox.service.js         # Scan inbox
│   │   │   ├── reply-sender.service.js  # Send AI replies
│   │   │   ├── acceptance-checker.service.js # Check acceptance
│   │   │   ├── search.service.js        # People search
│   │   │   └── premium.service.js       # Premium modal handler
│   │   │
│   │   ├── ai/
│   │   │   ├── claude.service.js        # OpenRouter/Groq API wrapper
│   │   │   ├── embedding.service.js     # Xenova embeddings + cosine
│   │   │   ├── scoring.service.js       # Lead scoring
│   │   │   ├── comment-generator.service.js # Generate comments + replies
│   │   │   ├── reply-analyzer.service.js    # Analyze inbox replies
│   │   │   ├── reply-generator.service.js   # Generate reply drafts
│   │   │   └── rag.service.js           # RAG (placeholder)
│   │   │
│   │   ├── database/
│   │   │   ├── mongodb.service.js       # MongoDB connection + CRUD
│   │   │   ├── lead-db.service.js       # Lead CRUD + duplicate checks
│   │   │   ├── conversation.service.js  # Conversation CRUD
│   │   │   └── vector-db.service.js     # Keyword vector storage
│   │   │
│   │   ├── integrations/
│   │   │   ├── google-sheets.service.js # Sheets read/write (46 cols)
│   │   │   ├── email-parser.service.js  # Extract emails
│   │   │   └── phone-parser.service.js  # Extract phones
│   │   │
│   │   └── file-manager/
│   │       ├── attachment.service.js    # PDF/media uploads
│   │       ├── file-picker.service.js   # Select right file
│   │       └── media-uploader.service.js # LinkedIn upload
│   │
│   ├── models/
│   │   ├── Lead.model.js               # Lead MongoDB schema
│   │   ├── Account.model.js            # Account schema
│   │   ├── Conversation.model.js       # Chat history schema
│   │   ├── Message.model.js            # Individual message schema
│   │   ├── Post.model.js               # Scraped post schema
│   │   ├── OutreachResult.model.js     # Outreach result schema
│   │   ├── AIAnalysis.model.js         # AI decision log
│   │   ├── KeywordVector.model.js      # Keyword embeddings
│   │   └── VectorEmbedding.model.js    # Vector metadata
│   │
│   ├── helpers/
│   │   ├── delay.helper.js             # random(), randomDelay()
│   │   ├── human-behavior.helper.js    # Scroll, mouse movements
│   │   ├── human-click.helper.js       # Clicks, typing, refresh
│   │   ├── text-parser.helper.js       # Email/phone extraction
│   │   ├── url-parser.helper.js        # URL utilities
│   │   ├── validator.helper.js         # Input validation
│   │   └── logger.helper.js            # Structured logging
│   │
│   ├── views/
│   │   ├── console-logger.view.js      # Console formatting
│   │   ├── report-generator.view.js    # Batch reports
│   │   └── notification.view.js        # Slack/email alerts
│   │
│   ├── scripts/
│   │   ├── pc-scheduler.js             # Main scheduler (cron jobs)
│   │   ├── run-login.js                # CLI: auto login
│   │   ├── run-manual-login.js         # CLI: manual login
│   │   ├── run-single.js               # CLI: single outreach
│   │   ├── run-batch.js                # CLI: batch outreach
│   │   ├── run-discovery.js            # CLI: lead discovery
│   │   ├── run-inbox-monitor.js        # CLI: inbox check
│   │   ├── run-ai-replies.js           # CLI: AI replies
│   │   ├── run-acceptance-check.js     # CLI: acceptance check
│   │   ├── run-warming.js              # CLI: warming messages
│   │   ├── run-sheet-sync.js           # CLI: sheets sync
│   │   ├── embed-keywords.js           # CLI: embed keywords
│   │   ├── gh-ai-scoring.js            # GitHub: AI scoring
│   │   ├── gh-ai-analysis.js           # GitHub: reply analysis
│   │   ├── gh-sheet-sync.js            # GitHub: sheets sync
│   │   ├── gh-daily-report.js          # GitHub: daily report
│   │   └── gh-mongo-backup.js          # GitHub: MongoDB backup
│   │
│   ├── debug/
│   │   ├── capture-buttons.js          # Debug: inspect buttons
│   │   ├── debug-message.js            # Debug: inspect messaging
│   │   └── screenshots/               # Auto-captured debug images
│   │
│   ├── data/
│   │   ├── leads.json                  # File-based leads (legacy)
│   │   ├── keywords.json              # Search keywords
│   │   └── logs/
│   │       ├── scheduler-out.log       # PM2 output log
│   │       ├── scheduler-error.log     # PM2 error log
│   │       ├── errors.log              # App errors
│   │       ├── ai-decisions.log        # AI decision audit
│   │       └── outreach-history.json   # Action history
│   │
│   ├── profiles/                       # Playwright browser sessions
│   │   └── account_1/                  # Persistent login data
│   │
│   ├── uploads/                        # Attachments to send
│   │   ├── pitch-decks/
│   │   ├── brochures/
│   │   └── media/
│   │
│   ├── .env                            # ⚠️ Secrets (NEVER commit!)
│   ├── .env.example                    # Template for .env
│   ├── package.json                    # Dependencies + scripts
│   └── server.js                       # Express API (optional)
│
├── .github/
│   └── workflows/
│       ├── ai-scoring.yml              # Score leads (hourly)
│       ├── ai-reply-analysis.yml       # Analyze replies (30min)
│       ├── sheet-sync.yml              # Sync sheets (6h)
│       ├── daily-report.yml            # Daily analytics (9AM IST)
│       ├── mongo-backup.yml            # Nightly backup (2AM IST)
│       └── README.md                   # Workflow documentation
│
├── ecosystem.config.cjs                # PM2 configuration
├── setup-sheet.js                      # One-time sheet setup
├── .gitignore                          # Git ignore rules
├── README.md                           # This file
├── ARCHITECTURE.md                     # Detailed architecture
└── PM2-SETUP.md                        # PM2 setup guide
```

---

## ⚠️ Important Rules

### DO
- ✅ Always test in safe mode first (`ACTUALLY_SEND=false`)
- ✅ Restart PM2 with `--update-env` after changing `.env`
- ✅ Check logs daily: `pm2 logs linkedin-scheduler --lines 50`
- ✅ Keep PC awake during business hours (Power Settings → Never Sleep)
- ✅ Whitelist your IP in MongoDB Atlas
- ✅ Pause automation when using LinkedIn manually

### DON'T
- ❌ NEVER commit `.env` to Git
- ❌ NEVER run on multiple LinkedIn accounts simultaneously
- ❌ NEVER exceed daily limits (20 connections, 15 messages, 30 comments)
- ❌ NEVER run 24/7 (only business hours 10:30 AM - 6:30 PM)
- ❌ NEVER use datacenter IPs (home/office IP only)
- ❌ NEVER send same message to all leads (always personalized)

---

## 🚦 Quick Start Checklist

```
[ ] MongoDB Atlas IP whitelisted (Security → Network Access)
[ ] .env file filled with all credentials
[ ] ACTUALLY_SEND=true
[ ] ACTUALLY_COMMENT=true
[ ] bun install completed
[ ] bunx playwright install chromium completed
[ ] Manual login successful: bun run manual-login account_1
[ ] Keywords embedded: bun scripts/embed-keywords.js
[ ] Sheet headers set: bun setup-sheet.js
[ ] pm2 start ecosystem.config.cjs --env production
[ ] pm2 save
[ ] pm2 status → both processes "online"
[ ] pm2 logs → "✅ MongoDB connected" and "✅ LIVE"
[ ] Wait for 10:30 AM → automation starts automatically ✅
```

---

## 📞 Daily Routine (2 Minutes Per Day)

```bash
# Morning — confirm it's running
pm2 status

# Anytime — watch live activity
pm2 logs linkedin-scheduler

# Evening — check today's results
pm2 logs linkedin-scheduler --lines 100

# If something looks wrong
pm2 restart linkedin-scheduler --update-env
```

---

## 💰 Total Monthly Cost

| Service | Cost |
|---------|------|
| Bun Runtime | Free |
| Playwright | Free |
| Xenova AI (local) | Free |
| MongoDB Atlas M0 | Free (512MB) |
| OpenRouter AI | Free (200 req/day) |
| Groq AI | Free (14.4K tokens/min) |
| Google Sheets API | Free |
| GitHub Actions | Free (2000 min/month) |
| PM2 | Free |
| **TOTAL** | **$0/month** |

---

## 📝 Changelog

### v3.0 (Current)
- ✅ Same-page commenting (no navigation)
- ✅ Latest sort for posts
- ✅ One-at-a-time post processing
- ✅ Duplicate prevention (DB + post-level)
- ✅ 46-column Google Sheet pipeline
- ✅ Xenova embedding scoring
- ✅ Comment reply detection

### v2.0
- ✅ MVC architecture (modular services)
- ✅ MongoDB integration
- ✅ GitHub Actions cloud automation
- ✅ PM2 auto-scheduling

### v1.0
- ✅ Basic outreach (connect + message)
- ✅ Flat file structure
- ✅ JSON-based leads

---

Built for Kriscent — AI-powered LinkedIn outreach at scale 🚀
Total cost: $0/month | Fully automated | Human-like behavior