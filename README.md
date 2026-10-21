# 💬 NLPChat

> **Natural Language WhatsApp Web App** — Type in any language, dialect, Hinglish, slang, or SMS shortcuts; your recipient receives clear, natural English directly.

[![Tests](https://img.shields.io/badge/tests-49%20passed-brightgreen.svg)]()
[![Platform](https://img.shields.io/badge/platform-React%2019%20%7C%20Node.js%20%7C%20Vite%20%7C%20Tailwind-teal.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

---

## ✨ Overview

**NLPChat** combines the familiar, responsive feel of WhatsApp with an invisible, AI-powered message normalizer. Users can express themselves naturally using romanized regional dialects, slang, typos, emojis, or abbreviations. The backend analyzes the message and provides an **editable preview card** for the sender. Once approved, the recipient receives the polished English version directly as the main chat bubble.

### 🌟 Examples

| Raw Message | Detected Style | Normalized English Bubble |
| :--- | :--- | :--- |
| `kkrho` | Hinglish (Romanized Hindi) | **What are you doing?** |
| `wru` | SMS / Internet Slang | **Where are you?** |
| `kal milte h bro` | Hinglish | **Let’s meet tomorrow, bro.** |
| `tmrw nhi aa pauga` | Hinglish & SMS | **I won’t be able to come tomorrow.** |
| `bhai kya scene hai` | Hinglish | **Bro, what’s the plan?** |
| `3la fekra ana gayy` | Arabizi (Arabic Chat Alphabet) | **By the way, I am coming.** |
| `7bibi sbah el kheir` | Arabizi | **My friend, good morning.** |
| `pls send d docs asap` | SMS & Typo | **Please send the documents as soon as possible.** |
| `thx a lot mate` | Slang | **Thank you very much, mate.** |
| `np cya l8r` | SMS Short Form | **No problem, see you later.** |
| `🔥` | Emoji Speak | **That’s awesome!** |

---

## 🔄 Core Message Flow

```
[ Sender Types Raw Input ]
       │  (e.g., "kkrho")
       ▼
[ Invisible Normalization Service ]  <─── AI Model / Local Fallback Dictionary
       │  (Detects tone, intent, slang, language)
       ▼
[ Sender Editable Preview Card ]
       │  • Converted English: "What are you doing?"
       │  • Tone Controls: [Natural] [Friendly] [Formal] [Concise]
       │  • Confidence & Language Chips: [Hinglish 98%]
       │  • Privacy Option: [Allow / Deny Original View]
       │  • Sender edits or approves
       ▼
[ Approved Message Dispatched via Socket.IO ]
       │
       ▼
[ Receiver Main Chat Bubble ]
          "What are you doing?"  (Direct natural English delivery)
```

1. **Invisible Processing**: No jarring technical messages (*"AI is processing"*, *"Calling OpenAI"*, or *"Fallback active"*).
2. **Never Sends Unapproved Drafts**: The sender always reviews and can tweak any word before dispatch.
3. **Raw Message Protection**: Raw input is stripped from payloads delivered to the recipient by default.
4. **"View Original" Privacy Control**: Recipients can click a subtle "Show original" button only if the sender's privacy settings permit it.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Real-Time Engine**: Socket.IO
- **Backend**: Node.js, Express
- **Database**:
  - Out-of-the-box local development: Built-in SQLite (`node:sqlite`) with zero-configuration setup.
  - Production: Full PostgreSQL & Supabase support via `backend/src/db/schema.sql`.
- **Authentication**: JWT authentication with `bcryptjs` password hashing and 1-click demo switcher.
- **AI Normalizer**: Dual-engine architecture:
  - Official Gemini / OpenAI API integration (backend only).
  - High-fidelity offline rule engine & comprehensive slang dictionary fallback.
- **PWA Ready**: Web app manifest and offline service worker.
- **Styling**: Light mode and WhatsApp dark mode with wallpaper texture.

---

## 📋 Key Features

- **WhatsApp Web Interface**: Left chat list with avatars, unread badges, timestamps, search, and online indicators.
- **Direct Normalized Delivery**: Receiver sees clean, natural English as the primary chat bubble.
- **Editable Normalized Preview**: Inline docked preview card with instant approval and text tweaking.
- **Tone Controls**: Choose between `Natural`, `Friendly`, `Formal`, and `Concise`.
- **Personal Slang Dictionary**: Users can define their own custom slang translations (e.g. `bt` → `stressful situation`, `jugaad` → `clever workaround`).
- **Voice-to-Text**: Built-in microphone input using the Web Speech API in any language.
- **Group Chats & Summaries**: Multi-member group chats with a 1-click **"Summarize Chat"** feature that highlights discussions and decisions.
- **Smart Replies**: 3 contextual reply suggestion chips for incoming messages.
- **Message Status Ticks**: Single grey tick (sent), double grey tick (delivered), double blue tick (read), or clock icon (offline queue).
- **Starred Messages**: Bookmark messages and view them in a dedicated drawer.
- **Offline Message Queue**: Automatically buffers messages when offline and flushes them when reconnected.
- **Chat Export**: Download conversation history as formatted `.txt` or printable styled PDF.
- **Privacy & Auto-Delete**: Disappearing messages (Off, 24 Hours, 7 Days, 90 Days) and access controls for raw messages.
- **Safety Alerts**: Automatic scam detection and urgency warning badges.
- **Rate Limiting & Sanitization**: Protection against spam, brute-force logins, and XSS injection.

---

## ⚡ Quick Start (Windows / macOS / Linux)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd NLPChat

# Install root, backend, and frontend dependencies
npm run install:all
```

### 2. Seed the Demo Database
Seeds 4 demo users (`alice`, `bob`, `priya`, `carlos`) and sample conversations:
```bash
npm run seed
```

### 3. Start Development Server
Launches backend (port 5000) and frontend (port 5173) concurrently:
```bash
npm start
```

Open **`http://localhost:5173`** in your browser.

---

## 🧪 Testing Multi-User Chat

1. Open **Tab 1** at `http://localhost:5173`.
2. Click **Quick Demo (1-Click)** and select **Alice Johnson**.
3. Open **Tab 2** (Incognito window) at `http://localhost:5173`.
4. Click **Quick Demo (1-Click)** and select **Bob Miller**.
5. Select Alice's chat in Bob's window, type `kkrho`, preview `"What are you doing?"`, and hit **Send Approved**.
6. Alice receives `"What are you doing?"` in real-time with double blue ticks and audio notification!

---

## 🧪 Running Automated Tests

Run the full test suite including the 35+ normalization test cases and API integration tests:

```bash
npm test
```

All 49 unit and integration tests will run using Node.js's built-in test runner:
```
✔ NLPChat API Integration Tests (98ms)
✔ NLPChat Normalizer Test Suite (35+ Test Cases) (31ms)
ℹ pass 49
ℹ fail 0
```

---

## 📖 Additional Documentation

- 🪟 [Windows & VS Code Setup Guide](./WINDOWS_SETUP.md)
- 🚀 [Production Deployment Guide](./DEPLOYMENT.md)
- 🛡️ [Security Checklist & Privacy Architecture](./SECURITY.md)
- ⚙️ [Environment Configuration Template](./.env.example)

---

## 📄 License
MIT License. Built for seamless cross-cultural and multilingual communication.
