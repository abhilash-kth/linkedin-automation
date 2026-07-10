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