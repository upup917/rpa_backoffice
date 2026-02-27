import { NextResponse } from 'next/server';
import pool from '../_lib/db';

// GET /api/chat-sessions?user_id=&feedback=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  const feedback = searchParams.get('feedback');

  let query = `
    SELECT
      s.id,
      s.user_id,
      s.summary_content,
      s.created_at,
      s.updated_at,
      COUNT(CASE WHEN m.feedback = 'like' THEN 1 END) as like_count,
      COUNT(CASE WHEN m.feedback = 'dislike' THEN 1 END) as dislike_count,
      COUNT(CASE WHEN m.feedback IS NULL THEN 1 END) as neutral_count
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON m.session_id = s.id
    WHERE s.summary_content IS NOT NULL AND BTRIM(s.summary_content) <> ''
  `;
  const params: any[] = [];

  if (user_id) {
    params.push(user_id);
    query += ` AND s.user_id = $${params.length}`;
  }

  query += ' GROUP BY s.id, s.user_id, s.summary_content, s.created_at, s.updated_at';

  if (feedback === 'like') {
    query += " HAVING COUNT(CASE WHEN m.feedback = 'like' THEN 1 END) > 0";
  } else if (feedback === 'dislike') {
    query += " HAVING COUNT(CASE WHEN m.feedback = 'dislike' THEN 1 END) > 0";
  } else if (feedback === 'neutral') {
    query += " HAVING COUNT(CASE WHEN m.feedback IS NULL THEN 1 END) > 0";
  }

  query += ' ORDER BY s.created_at DESC';

  try {
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
