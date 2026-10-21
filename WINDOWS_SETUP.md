# 🪟 NLPChat - Windows & VS Code Setup Instructions

This guide provides step-by-step instructions to run and develop **NLPChat** on Microsoft Windows 10/11 using PowerShell and Visual Studio Code.

---

## 1. Prerequisites

1. **Node.js**: Version 20+ (Node.js 22 or 24 recommended).
   - Verify installation in PowerShell:
     ```powershell
     node -v
     npm -v
     ```
2. **VS Code**: Visual Studio Code with the following recommended extensions:
   - **Tailwind CSS IntelliSense**
   - **ES7+ React/Redux/React-Native snippets**
   - **SQLite Viewer** (Florian Klampfer)
   - **Prettier - Code formatter**

---

## 2. Project Directory Structure

```
NLPChat/
├── frontend/        # Vite + React 19 + Tailwind CSS Frontend
├── backend/         # Node.js + Express + Socket.IO + SQLite Backend
├── package.json     # Root orchestration package
├── WINDOWS_SETUP.md # This guide
├── DEPLOYMENT.md    # Production deployment guide
└── SECURITY.md      # Security checklist & auditing
```

---

## 3. Quick Start in VS Code (PowerShell)

### Step 1: Open the Project in VS Code
1. Open Visual Studio Code.
2. Select **File > Open Folder...** and choose `C:\Users\vikash\OneDrive\Desktop\NLPChat`.
3. Open a new Terminal (`Ctrl + ~`).

### Step 2: Install All Dependencies (If not already installed)
From the root directory:
```powershell
npm run install:all
```
*This installs dependencies for the root orchestrator, `backend/`, and `frontend/`.*

### Step 3: Seed Demo Data
Populate the database with pre-configured demo users (`alice`, `bob`, `priya`, `carlos`) and sample conversations:
```powershell
nlp seed
# or: npm run seed
```

### Step 4: Start Client and Server Concurrently
Run both the backend API (port 5000) and frontend Vite development server (port 5173) with a single command:

**Option A - Unified CLI (Recommended):**
```powershell
nlp start
```
*(This starts both servers AND automatically opens your browser to `http://localhost:5173`!)*

**Option B - Standard NPM:**
```powershell
npm start
```

**Option C - In VS Code (1-Click Run & Debug):**
- Press **F5** or go to **Run > Start Debugging**.
- VS Code automatically starts the backend + frontend and launches Chrome/Edge!
- Or open **Terminal > Run Build Task...** (`Ctrl+Shift+B`).

### Step 5: Open in Your Browser
If not already opened automatically:
👉 **`http://localhost:5173`**

---

## 4. Testing Multi-User Live Chat (Two Browser Windows)

NLPChat features a **1-Click Quick Demo Login** designed specifically for instant testing:

1. **Window 1 (Normal Tab)**:
   - Navigate to `http://localhost:5173`.
   - On the login screen, click **Quick Demo (1-Click)** and select **Alice Johnson**.
2. **Window 2 (Incognito / Private Window)**:
   - Navigate to `http://localhost:5173`.
   - Click **Quick Demo (1-Click)** and select **Bob Miller**.
3. **Send a Message from Bob**:
   - In Bob's window, click on Alice's chat.
   - Type in raw Hinglish or slang: `kkrho` or `kal milte h bro` or `wru` or `3la fekra ana gayy`.
   - An editable preview card automatically appears above the input box showing:
     - Clear English: `"What are you doing?"`
     - Language chip: `Hinglish (Romanized Hindi) 98% match`
     - Tone selector: `Natural`, `Friendly`, `Formal`, `Concise`
   - Click **Send Approved** (or hit `Enter`).
4. **Observe Alice's Window**:
   - Alice immediately receives `"What are you doing?"` directly in natural English.
   - Alice hears a gentle incoming message chime and sees the double tick status update.
   - Alice sees 3 contextual **Smart Reply suggestions** (e.g., *"Not much, chilling!"*, *"Working on a project."*).

---

## 5. Running Automated Unit & Integration Tests

Execute the 49 unit and integration test cases covering 35+ slang / Hinglish / Arabizi normalization rules:
```powershell
npm test
```

Expected output:
```
✔ NLPChat API Integration Tests (98ms)
✔ NLPChat Normalizer Test Suite (35+ Test Cases) (31ms)
ℹ pass 49
ℹ fail 0
```

---

## 6. Optional: Configuring AI Provider (Gemini / OpenAI)

NLPChat runs out of the box using its high-speed local rule & slang dictionary with zero API keys required.

To connect Gemini or OpenAI:
1. Open `backend/.env`.
2. Add your API key:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   OPENAI_API_KEY=your_openai_api_key_here
   ```
3. Restart the server (`npm start`). NLPChat will seamlessly use the LLM provider for zero-shot natural language conversion.

---

## 7. Troubleshooting on Windows

- **Port 5000 Already in Use**:
  If port 5000 is occupied, set `PORT=5001` in `backend/.env`.
- **PowerShell Execution Policy Error**:
  If scripts are restricted, run PowerShell as Administrator:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **SQLite Database Inspection**:
  Install the VS Code extension **SQLite Viewer** to inspect `backend/nlpchat.db` with a graphical UI.
