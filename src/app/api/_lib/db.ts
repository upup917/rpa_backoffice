import { Pool } from 'pg';

// Log environment variables for DB connection (mask password)

console.log('[DB] ENV CONFIG:', {
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
  ENV_KEYS: Object.keys(process.env),
});

let pool: Pool;

try {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  });
  console.log('[DB] สร้าง Pool สำเร็จ');

  // Log จำนวนตารางทั้งหมดในฐานข้อมูลหลังสร้าง pool
  (async () => {
    try {
      const res = await pool.query(`
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'schema_beta'
      `);
      console.log(`[DB] มีทั้งหมด ${res.rows[0].count} ตารางใน schema_beta`);
    } catch (err) {
      console.error('[DB] ตรวจสอบจำนวนตารางล้มเหลว:', err);
    }
  })();
} catch (err) {
  console.error('[DB] สร้าง Pool ไม่สำเร็จ:', err);
  throw err;
}

pool.on('connect', () => {
  console.log('✅ เชื่อมต่อกับฐานข้อมูล PostgreSQL สำเร็จ!');
});

pool.on('error', (err: Error) => {
  console.error('❌ เกิดข้อผิดพลาดกับฐานข้อมูล:', err);
  // เพิ่มรายละเอียด error
  if (err instanceof Error) {
    console.error('[DB] Error name:', err.name);
    console.error('[DB] Error message:', err.message);
    console.error('[DB] Error stack:', err.stack);
  }
  process.exit(-1);
});


// ฟังก์ชัน query พร้อม log
export async function queryWithLog(...args: any[]) {
  console.log('[DB] QUERY:', args[0], args[1]);
  try {
    // @ts-ignore: TypeScript overload issue
    const result = await pool.query(...args);
    return result;
  } catch (err) {
    console.error('[DB] QUERY ERROR:', err);
    throw err;
  }
}

export default pool;
