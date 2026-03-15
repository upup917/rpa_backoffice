import { Pool } from 'pg';

type DbConfig = {
  user: string;
  host: string;
  database: string;
  password: string;
  port?: number;
  schema: string;
};

function readDbConfig(): DbConfig {
  const missing: string[] = [];

  const user = process.env.DB_USER || '';
  const host = process.env.DB_HOST || '';
  const database = process.env.DB_NAME || '';
  const password = process.env.DB_PASSWORD || '';
  const schema = process.env.DB_SCHEMA || 'schema_beta';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

  if (!user) missing.push('DB_USER');
  if (!host) missing.push('DB_HOST');
  if (!database) missing.push('DB_NAME');
  if (!password) missing.push('DB_PASSWORD');

  if (missing.length) {
    throw new Error(
      `[DB] Missing required env: ${missing.join(
        ', '
      )}. Ensure the deploy runtime has these variables set (or a .env file is loaded).`
    );
  }

  return { user, host, database, password, port, schema };
}

let poolSingleton: Pool | null = null;
let initLogged = false;

function getPool(): Pool {
  if (poolSingleton) return poolSingleton;

  const cfg = readDbConfig();
  if (!initLogged) {
    initLogged = true;
    console.log('[DB] Initializing Pool with:', {
      user: cfg.user,
      host: cfg.host,
      database: cfg.database,
      port: cfg.port,
      schema: cfg.schema,
      password: cfg.password ? '***' : undefined,
    });
  }

  const pool = new Pool({
    user: cfg.user,
    host: cfg.host,
    database: cfg.database,
    password: cfg.password,
    port: cfg.port,
    options: `-c search_path=${cfg.schema}`,
  });

  pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL.');
  });

  pool.on('error', (err: Error) => {
    // Don't kill the whole Next.js process on transient DB errors.
    console.error('[DB] Pool error:', err);
  });

  poolSingleton = pool;
  return poolSingleton;
}

// Keep default export compatible with existing code: `import db from ...; await db.query(...)`
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export async function queryWithLog(text: string, params?: any[]) {
  console.log('[DB] QUERY:', text, params);
  try {
    return await getPool().query(text as any, params as any);
  } catch (err) {
    console.error('[DB] QUERY ERROR:', err);
    throw err;
  }
}

export default pool;

