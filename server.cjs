const dotenvResult = require('dotenv').config();
if (dotenvResult.error) {
  console.error('[server] dotenv load error:', dotenvResult.error);
} else {
  console.log('[server] dotenv loaded:', Object.keys(process.env));
  console.log('[server] ENV:', {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
    NEXT_PUBLIC_WEBHOOK_URL: process.env.NEXT_PUBLIC_WEBHOOK_URL,
  });
}
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
