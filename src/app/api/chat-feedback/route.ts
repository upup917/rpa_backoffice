import { NextResponse } from 'next/server';

import pool from '../_lib/db';

// GET /api/chat-feedback?user_id=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  let query = `
    SELECT 
      COUNT(CASE WHEN feedback = 'like' THEN 1 END) as like_count,
      COUNT(CASE WHEN feedback = 'dislike' THEN 1 END) as dislike_count,
      COUNT(CASE WHEN feedback IS NULL THEN 1 END) as neutral_count
    FROM chat_messages
  `;
  let params: any[] = [];
  if (user_id) {
    query += ' WHERE user_id = $1';
    params = [user_id];
  }
  try {
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows[0] || { like_count: 0, dislike_count: 0, neutral_count: 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
