# 🏗️ Kriscent LinkedIn Automation — System Architecture

## Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          YOUR PC (Windows)                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                      PM2 Process Manager                          │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────┐   ┌────────────────────────────┐   │   │
│  │  │   linkedin-scheduler      │   │   linkedin-api (Express)   │   │   │
│  │  │  (node-cron + Playwright) │   │  (REST API on port 3001)   │   │   │
│  │  └──────────┬─────────────────┘   └────────────────────────────┘   │   │
│  │             │                                                       │   │
│  └─────────────┼───────────────────────────────────────────────────────┘   │
│                │                                                            │
│  ┌─────────────┼───────────────────────────────────────────────────────┐   │
│  │             │              Application Layer                       │   │
│  │             ↓                                                       │   │
│  │  ┌──────────────────┐                                              │   │
│  │  │   Controllers     │  ← Business logic orchestrators             │   │
│  │  │                    │                                              │   │
│  │  │   discovery        │  → Search + Score + Comment                │   │
│  │  │   outreach         │  → Connect + Message                       │   │
│  │  │   acceptance       │  → Track who accepted                      │   │
│  │  │   warming          │  → Send warm intros                        │   │
│  │  │   ai-reply         │  → AI inbox replies                        │   │
│  │  │   monitor          │  → Inbox scanning                          │   │
│  │  └─────────┬──────────┘                                              │   │
│  │            │                                                        │   │
│  │  ┌─────────┴──────────┐                                              │   │
│  │  │     Services        │  ← Single-responsibility modules          │   │
│  │  │                      │                                            │   │
│  │  │  ┌────────────┐      │                                            │   │
│  │  │  │  Browser   │      │  Playwright, stealth, navigation          │   │
│  │  │  ├────────────┤      │                                            │   │
│  │  │  │ LinkedIn   │      │  Profile, connect, message, comment       │   │
│  │  │  ├────────────┤      │                                            │   │
│  │  │  │    AI      │      │  Xenova (local), OpenRouter, Groq         │   │
│  │  │  ├────────────┤      │                                            │   │
│  │  │  │ Database   │      │  MongoDB CRUD, vector storage             │   │
│  │  │  ├────────────┤      │                                            │   │
│  │  │  │Integration │      │  Google Sheets, email/phone parsing       │   │
│  │  │  └────────────┘      │                                            │   │
│  │  └──────────────────────┘                                            │   │
│  │                                                                        │   │
│  │  ┌──────────────────┐                                                 │   │
│  │  │      Config        │  ← Centralized settings                      │   │
│  │  │                    │                                                │   │
│  │  │  selectors.js      │  → ALL LinkedIn CSS selectors                 │   │
│  │  │  config.js         │  → Account, timezone, limits                 │   │
│  │  │  ai.config.js      │  → AI model settings                         │   │
│  │  │  prompts/          │  → AI prompt templates                       │   │
│  │  └────────────────────┘                                                │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                     │              │              │
                     ↓              ↓              ↓
              ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
              │   MongoDB    │ │  OpenRouter  │ │  Google Sheets   │
              │    Atlas     │ │   / Groq     │ │                  │
              │  (M0 Free)   │ │  (Free AI)   │ │   46-column      │
              │              │ │              │ │   Dashboard      │
              │ Collections: │ │  Models:     │ │                  │
              │ - leads      │ │  - LLaMA 3.1 │ │   Tabs:          │
              │ - convos     │ │  - Gemma 2   │ │   - Leads        │
              │ - messages   │ │  - Mistral   │ │   - Outreach Log │
              │ - posts      │ │  - Groq      │ │   - Analytics    │
              │ - keyword_   │ │              │ │                  │
              │   vectors    │ │  Local:      │ │                  │
              │ - ai_analyses│ │  - Xenova    │ │                  │
              │ - outreach_  │ │    MiniLM    │ │                  │
              │   history    │ │  (384 dim)   │ │                  │
              └──────────────┘ └──────────────┘ └──────────────────┘
                     ↑
                     │
        ┌──────────────────────────────────────────┐
        │        GitHub Actions (Free Cloud)        │
        │                                            │
        │  ┌────────────┐   ┌────────────────────┐  │
        │  │ sheet-sync │   │   daily-report      │  │
        │  │ (every 6h) │   │  (9AM IST daily)    │  │
        │  ├────────────┤   ├────────────────────┤  │
        │  │ ai-scoring │   │   mongo-backup      │  │
        │  │ (hourly)   │   │  (2AM IST nightly)  │  │
        │  └────────────┘   └────────────────────┘  │
        └────────────────────────────────────────────┘
```

---

## Design Principles

1. **Single Source of Selectors** — `config/selectors.js` contains ALL LinkedIn CSS selectors
2. **One Service = One Job** — Each service file does exactly one thing
3. **Controllers Orchestrate** — Controllers call multiple services but don't do low-level work
4. **Human-Like Everything** — Random delays, variable typing, curved mouse paths
5. **Duplicate Prevention** — Check DB before every action (post, lead, comment)
6. **Graceful Failures** — Every function handles errors without crashing
7. **Same-Page Processing** — Comments happen inline without page navigation
8. **Sequential Task Queue** — Only one task runs at a time (prevents conflicts)

---

## MongoDB Collections

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| `leads` | All discovered leads | profileUrl, status, score |
| `conversations` | Chat history per lead | messages[], lastAnalysis |
| `messages` | Individual message log | sender, text, isAIGenerated |
| `posts` | Scraped LinkedIn posts | postUrl, content, authorUrl |
| `keyword_vectors` | Keyword embeddings | keyword, vector[384] |
| `ai_analyses` | AI decision audit trail | type, prompt, response |
| `outreach_history` | Action log | action, success, duration |
| `accounts` | LinkedIn account state | sessionValid, messagesToday |

---

## Lead Status Flow

```
discovered → commented → connection_sent → accepted → warming_sent → message_sent → replied → interested → meeting_scheduled
                                                                                              ↓
                                                                                       not_interested
```

---

## Related Documents

- [`README.md`](./README.md) — Setup guide, daily schedule, commands reference, and full feature list
- `PM2-SETUP.md` — Detailed PM2 process manager configuration
