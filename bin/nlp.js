#!/usr/bin/env node

/**
 * NLPChat Unified CLI
 * Handles running, seeding, testing, and managing the NLPChat fullstack application.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const args = process.argv.slice(2);
const command = (args[0] || 'start').toLowerCase();

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function banner() {
  console.log(`
${COLORS.cyan}╔═══════════════════════════════════════════════════════════╗
║               💬 NLPChat Fullstack Platform               ║
╚═══════════════════════════════════════════════════════════╝${COLORS.reset}
`);
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe /c start "" "' + url + '"', { detached: true, stdio: 'ignore', shell: true });
    } else if (process.platform === 'darwin') {
      spawn(`open "${url}"`, { detached: true, stdio: 'ignore', shell: true });
    } else {
      spawn(`xdg-open "${url}"`, { detached: true, stdio: 'ignore', shell: true });
    }
  } catch (_) {
    // Ignore browser open errors
  }
}

function runStart() {
  banner();
  console.log(`${COLORS.green}▶ Starting NLPChat Backend and Frontend concurrently...${COLORS.reset}\n`);
  console.log(`  ${COLORS.bright}Backend API:${COLORS.reset}   http://localhost:5000`);
  console.log(`  ${COLORS.bright}Frontend Web:${COLORS.reset}  http://localhost:5173\n`);

  const cmd = `npx concurrently --kill-others-on-fail --prefix "[{name}]" --names "backend,frontend" --prefix-colors "cyan,magenta" "npm run --prefix backend dev" "npm run --prefix frontend dev"`;

  const child = spawn(cmd, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });

  // Poll frontend and auto-open browser after it becomes ready
  let browserOpened = false;
  const pollInterval = setInterval(() => {
    if (browserOpened) {
      clearInterval(pollInterval);
      return;
    }
    const req = http.get('http://localhost:5173', () => {
      if (!browserOpened) {
        browserOpened = true;
        clearInterval(pollInterval);
        console.log(`\n${COLORS.bright}${COLORS.green}✨ Frontend is ready! Opening http://localhost:5173 in browser...${COLORS.reset}\n`);
        openBrowser('http://localhost:5173');
      }
    });
    req.on('error', () => {});
  }, 1000);

  // Clean interval after 30 seconds if not ready
  setTimeout(() => clearInterval(pollInterval), 30000);

  child.on('exit', (code) => {
    clearInterval(pollInterval);
    process.exit(code || 0);
  });
}

function runBackend() {
  banner();
  console.log(`${COLORS.cyan}▶ Starting NLPChat Backend only on port 5000...${COLORS.reset}\n`);
  const child = spawn('npm run --prefix backend dev', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', (code) => process.exit(code || 0));
}

function runFrontend() {
  banner();
  console.log(`${COLORS.magenta}▶ Starting NLPChat Frontend only on port 5173...${COLORS.reset}\n`);
  const child = spawn('npm run --prefix frontend dev', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', (code) => process.exit(code || 0));
}

function runSeed() {
  banner();
  console.log(`${COLORS.yellow}▶ Seeding demo database (Alice, Bob, Priya, Carlos)...${COLORS.reset}\n`);
  const child = spawn('npm run --prefix backend seed', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`\n${COLORS.green}✔ Database seeded successfully!${COLORS.reset}`);
    }
    process.exit(code || 0);
  });
}

function runTest() {
  banner();
  console.log(`${COLORS.blue}▶ Running automated test suite...${COLORS.reset}\n`);
  const child = spawn('npm test --prefix backend', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', (code) => process.exit(code || 0));
}

function runInstall() {
  banner();
  console.log(`${COLORS.yellow}▶ Installing all dependencies (root, backend, frontend)...${COLORS.reset}\n`);
  try {
    console.log(`${COLORS.cyan}Installing root dependencies...${COLORS.reset}`);
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`${COLORS.cyan}Installing backend dependencies...${COLORS.reset}`);
    execSync('npm install', { cwd: BACKEND_DIR, stdio: 'inherit' });
    console.log(`${COLORS.cyan}Installing frontend dependencies...${COLORS.reset}`);
    execSync('npm install', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    console.log(`\n${COLORS.green}✔ All dependencies installed successfully!${COLORS.reset}`);
  } catch (err) {
    console.error(`${COLORS.red}Error installing dependencies: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }
}

function getLocalIp() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function runShare() {
  banner();
  console.log(`${COLORS.yellow}▶ Building frontend static bundle for production...${COLORS.reset}\n`);
  try {
    execSync('npm run --prefix frontend build', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error(`${COLORS.red}Build failed: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }

  const localIp = getLocalIp();
  console.log(`\n${COLORS.green}✔ Build complete! Starting unified fullstack server on port 5000...${COLORS.reset}`);
  console.log(`  ${COLORS.bright}Local URL:${COLORS.reset}        http://localhost:5000`);
  console.log(`  ${COLORS.bright}Wi-Fi Network URL:${COLORS.reset} http://${localIp}:5000 (Open on any phone on same Wi-Fi)\n`);
  console.log(`${COLORS.cyan}▶ Generating Live Public HTTPS Link via Localtunnel...${COLORS.reset}\n`);

  const cmd = `npx concurrently --kill-others-on-fail --prefix "[{name}]" --names "server,tunnel" --prefix-colors "green,cyan" "node backend/src/index.js" "npx --yes localtunnel --port 5000"`;

  const child = spawn(cmd, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => process.exit(code || 0));
}

function runHelp() {
  banner();
  console.log(`
${COLORS.bright}Usage:${COLORS.reset}
  nlp [command]

${COLORS.bright}Commands:${COLORS.reset}
  ${COLORS.green}start${COLORS.reset} or ${COLORS.green}dev${COLORS.reset}       Start both Backend (5000) and Frontend (5173) (default)
  ${COLORS.cyan}share${COLORS.reset}             Start unified server + generate public HTTPS link
  ${COLORS.cyan}backend${COLORS.reset}           Start only the backend API server
  ${COLORS.magenta}frontend${COLORS.reset}          Start only the frontend Vite development server
  ${COLORS.yellow}seed${COLORS.reset}              Populate SQLite database with demo accounts & chats
  ${COLORS.blue}test${COLORS.reset}              Run unit & normalizer test suite
  ${COLORS.yellow}install${COLORS.reset}           Install all project dependencies
  ${COLORS.reset}help${COLORS.reset}              Show this help menu

${COLORS.bright}Examples:${COLORS.reset}
  nlp start         # Start backend + frontend dev servers
  nlp share         # Build and start with live public HTTPS link
  nlp seed          # Reset demo users & conversations
`);
}

switch (command) {
  case 'start':
  case 'dev':
  case 'run':
    runStart();
    break;
  case 'share':
  case 'live':
  case 'public':
    runShare();
    break;
  case 'backend':
  case 'server':
  case 'api':
    runBackend();
    break;
  case 'frontend':
  case 'client':
  case 'ui':
    runFrontend();
    break;
  case 'seed':
    runSeed();
    break;
  case 'test':
  case 'tests':
    runTest();
    break;
  case 'install':
  case 'install:all':
    runInstall();
    break;
  case 'help':
  case '--help':
  case '-h':
    runHelp();
    break;
  default:
    console.warn(`${COLORS.yellow}Unknown command: "${command}". Defaulting to "nlp start"...${COLORS.reset}\n`);
    runStart();
    break;
}
