import { NextResponse } from 'next/server';
import pool from '../../_lib/db';

// GET /api/history/users
export async function GET() {
  try {
    const result = await pool.query(
      "SELECT DISTINCT user_id FROM chat_sessions WHERE summary_content IS NOT NULL AND BTRIM(summary_content) <> '' ORDER BY user_id"
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
