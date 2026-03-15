const path = require('path');
const dotenv = require('dotenv');

// Load env from the same directory as server.cjs so deployments that run with a different CWD
// still pick up the file the deployer placed next to the app.
function loadEnvFile(filename) {
  const p = path.join(__dirname, filename);
  const result = dotenv.config({ path: p });
  if (result.error) return { ok: false, path: p, error: result.error };
  return { ok: true, path: p };
}

// Try a small set of common filenames; prefer runtime env vars when present.
const envAttempts = [
  process.env.NODE_ENV === 'production' ? '.env.production' : null,
  '.env',
  '.env.local',
].filter(Boolean);

let loadedFrom = null;
for (const f of envAttempts) {
  const r = loadEnvFile(f);
  if (r.ok) {
    loadedFrom = r.path;
    break;
  }
}

if (!loadedFrom) {
  console.warn('[server] No .env file loaded (this is OK if env vars are set by the platform).');
} else {
  console.log('[server] Loaded env from:', loadedFrom);
}

console.log('[server] ENV summary:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,
  DB_SCHEMA: process.env.DB_SCHEMA,
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
  NEXT_PUBLIC_WEBHOOK_URL: process.env.NEXT_PUBLIC_WEBHOOK_URL,
});
const { createServer } = require('http');
const next = require('next');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on ${port}`);
  });
});
