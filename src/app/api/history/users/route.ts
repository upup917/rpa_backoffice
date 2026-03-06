export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import pool from '../../_lib/db';

// GET /api/history/users
export async function GET() {
  try {
    const schema = process.env.DB_SCHEMA || 'schema_beta';
    const result = await pool.query(
      `SELECT DISTINCT user_id FROM ${schema}.chat_sessions WHERE summary_content IS NOT NULL AND BTRIM(summary_content) <> '' ORDER BY user_id`
    );
    console.log('[History Users API] ดึงข้อมูลจาก 1 ตาราง (chat_sessions)');
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
