import { Pool } from 'pg';

// ตั้งค่าการเชื่อมต่อโดยดึงค่าจากไฟล์ .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
});

// ตรวจสอบการเชื่อมต่อเบื้องต้น
pool.on('connect', () => {
  console.log('✅ เชื่อมต่อกับฐานข้อมูล PostgreSQL สำเร็จ!');
});

pool.on('error', (err: Error) => {
  console.error('❌ เกิดข้อผิดพลาดกับฐานข้อมูล:', err);
  process.exit(-1);
});

export default pool;
