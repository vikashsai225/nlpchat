# 🚀 NLPChat - Production Deployment Guide

This guide covers deployment strategies for **NLPChat** across containerized environments (Docker), managed cloud services (Render, Railway, Fly.io), and relational database configurations (PostgreSQL / Supabase).

---

## 1. Production Architecture Overview

- **Frontend**: Vite + React 19 single-page application and Progressive Web App (PWA) static assets served via CDN (Vercel, Netlify, Cloudflare Pages) or reverse-proxied by NGINX.
- **Backend**: Node.js Express server handling REST endpoints and real-time bidirectional WebSocket connections via Socket.IO.
- **Database**:
  - Development / Single Node: High-performance built-in SQLite (`node:sqlite`) with WAL mode.
  - Production / Multi Node: PostgreSQL or Supabase via standard SQL schema (`server/src/db/schema.sql`).

---

## 2. Environment Variables Checklist

Ensure the following variables are configured in your production hosting platform:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Backend listening port | `5000` or assigned by host |
| `JWT_SECRET` | Cryptographically random 64-char key | `generate with: openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | JWT session lifetime | `7d` |
| `DATABASE_URL` | Optional PostgreSQL connection string | `postgresql://user:pass@host:5432/nlpchat` |
| `GEMINI_API_KEY` | Optional Google Gemini API key | `AIzaSy...` |
| `OPENAI_API_KEY` | Optional OpenAI API key | `sk-proj-...` |
| `CLIENT_URL` | Public URL of frontend for CORS | `https://nlpchat.yourdomain.com` |

---

## 3. Database Deployment: Supabase / PostgreSQL

NLPChat's database schema in `backend/src/db/schema.sql` is 100% ANSI-SQL compliant with PostgreSQL:

1. Open your **Supabase Dashboard** or PostgreSQL instance.
2. Navigate to the **SQL Editor**.
3. Copy the contents of `backend/src/db/schema.sql` and click **Run**.
4. Set `DATABASE_URL` in your server environment:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

---

## 4. Docker Deployment

### Dockerfile (Full-Stack Container)

Create `Dockerfile` in the root:

```dockerfile
# Multi-stage build
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

RUN npm run install:all

COPY . .
RUN cd frontend && npm run build

# Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend /app/backend
COPY --from=build /app/frontend/dist /app/frontend/dist

EXPOSE 5000
CMD ["node", "backend/src/index.js"]
```

### Running with Docker Compose

```yaml
version: '3.8'

services:
  nlpchat:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - JWT_SECRET=replace_with_a_secure_random_string_32_chars
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - nlpchat-data:/app/backend
    restart: always

volumes:
  nlpchat-data:
```

Launch with:
```bash
docker compose up -d
```

---

## 5. Deployment on Cloud Platforms

### A. Railway / Render
1. Connect your GitHub repository to Railway or Render.
2. Select **Web Service**.
3. **Build Command**: `npm run install:all && cd frontend && npm run build`
4. **Start Command**: `node backend/src/index.js`
5. Configure Environment Variables (`JWT_SECRET`, `NODE_ENV=production`).

### B. Vercel (Frontend) + Render/Fly.io (Backend)
1. **Frontend (Vercel)**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - In `frontend/vite.config.js`, configure production API base URL pointing to your backend.
2. **Backend (Render / Fly.io / VPS)**:
   - Run Node.js backend on standard port.
   - Configure CORS `CLIENT_URL` to your Vercel domain.

---

## 6. PM2 Production Daemon Setup (Ubuntu / Debian VPS)

For deploying directly to a Linux VPS:

```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies and build frontend
npm run install:all
cd frontend && npm run build && cd ..

# Start backend cluster with PM2
pm2 start backend/src/index.js --name "nlpchat-api" -i max
pm2 save
pm2 startup
```

Configure NGINX reverse proxy with WebSocket upgrade support:

```nginx
server {
    listen 80;
    server_name nlpchat.yourdomain.com;

    location / {
        root /var/www/nlpchat/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
