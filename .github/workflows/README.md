# 🤖 GitHub Actions Workflows

## Overview

These workflows run automatically in the cloud (free) for tasks that **don't need a browser**.

## Workflows

| File | Purpose | Schedule (UTC) | Schedule (IST) |
|---|---|---|---|
| `ai-scoring.yml` | Score new leads with AI | Every hour at :15 | Every hour at :15 |
| `ai-reply-analysis.yml` | Analyze incoming replies | Every 30 min | Every 30 min |
| `sheet-sync.yml` | Sync MongoDB → Sheets | Every 6 hours | Every 6 hours |
| `daily-report.yml` | Send daily analytics | 3:30 AM UTC | 9:00 AM IST |
| `mongo-backup.yml` | Backup MongoDB | 8:30 PM UTC | 2:00 AM IST |

## Required Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add these:

- `MONGODB_URI` — Your MongoDB Atlas connection string
- `OPENROUTER_API_KEY` — Your OpenRouter API key
- `OPENROUTER_MODEL` — e.g. `meta-llama/llama-3.1-8b-instruct:free`
- `GOOGLE_SHEETS_ID` — Your Google Sheet ID
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — From your service account JSON
- `GOOGLE_PRIVATE_KEY` — From your service account JSON (include \n)

## Manual Trigger

Any workflow can be triggered manually:

1. Go to **Actions** tab
2. Click the workflow name
3. Click **Run workflow**
4. Select branch → **Run workflow**

## Monitoring

- Green checkmark = Success
- Red X = Failed
- Yellow dot = Running
- Grey = Queued

Click any run to see full logs.