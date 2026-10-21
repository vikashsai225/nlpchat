# 🛡️ NLPChat - Security Checklist & Architecture

This document details the security principles, data protection controls, and vulnerability mitigations implemented in **NLPChat**.

---

## 1. Security Checklist Overview

| Category | Security Control | Implementation Details | Status |
| :--- | :--- | :--- | :--- |
| **API Keys** | Never expose AI keys to frontend | AI calls (`Gemini`, `OpenAI`, `Anthropic`) are exclusively handled server-side in `backend/src/services/aiProviders.js`. | ✅ Implemented |
| **Data Privacy** | Raw message protection | Raw input is stripped from payloads delivered to recipients unless explicitly permitted by sender privacy settings. | ✅ Implemented |
| **Authentication** | JWT Token Security | Cryptographically signed tokens verified on every REST request and Socket.IO handshake. | ✅ Implemented |
| **Password Storage** | Bcrypt hashing | Passwords hashed using `bcryptjs` with salt work factor 10. | ✅ Implemented |
| **Input Sanitization** | XSS and HTML stripping | All user inputs are sanitized in `backend/src/middleware/sanitize.js`. | ✅ Implemented |
| **Abuse Protection** | Express Rate Limiting | IP-based rate limiting on `/api/`, auth endpoints, and normalization previews. | ✅ Implemented |
| **Deduplication** | Duplicate send prevention | Client-generated UUIDs (`clientId`) prevent duplicate message inserts. | ✅ Implemented |
| **Auto-Delete** | Disappearing messages | Automated periodic purge cleaner for expired records (`expires_at`). | ✅ Implemented |
| **WebSocket** | Authenticated Handshake | Socket.IO verifies JWT authorization token before granting socket access. | ✅ Implemented |

---

## 2. Raw vs. Normalized Message Privacy Model

NLPChat introduces an architecture where users communicate comfortably in their native dialect or slang while ensuring recipients receive clear, natural English:

1. **Storage**: Both raw content and normalized English are encrypted/stored in the `messages` table.
2. **Delivery**: The default payload emitted over WebSocket and REST endpoints provides `normalized_content` as the primary text bubble.
3. **View Original Access Control**:
   - Every user configures their global privacy setting:
     - `Everyone`: Any recipient can click "Original" to reveal raw text.
     - `Contacts`: Only recognized contacts can view raw text.
     - `Nobody`: Maximum privacy. Raw text is strictly prohibited from leaving the server.
   - When a recipient requests `/api/messages/:id/view-original`, the server enforces the sender's permission before returning the raw string.

---

## 3. Rate Limiting Specifications

Configured in `backend/src/middleware/rateLimiter.js`:
- **General API**: Max 200 requests per 15-minute window per IP.
- **Normalization Previews**: Max 120 previews per 15-minute window per IP (allows rapid interactive typing while preventing DDoS abuse).
- **Authentication**: Max 50 login/registration attempts per 15-minute window to prevent credential stuffing.

---

## 4. Production Hardening Recommendations

Before deploying to public infrastructure:
1. **Rotate Secrets**: Generate a strong 64-character secret for `JWT_SECRET`.
2. **HTTPS & WSS**: Enforce SSL/TLS certificates via Let's Encrypt or Cloudflare to protect WebSocket transmissions in transit.
3. **Database Backups**: Enable point-in-time recovery (PITR) if using PostgreSQL on Supabase or AWS RDS.
4. **Environment Isolation**: Never commit `.env` files into source control (`.gitignore` is strictly enforced).
