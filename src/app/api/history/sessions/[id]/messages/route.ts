import { NextResponse, NextRequest } from 'next/server';
import pool from '../../../../_lib/db';
// GET /api/history/sessions/[id]/messages
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const query = 'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC';
  try {
    const result = await pool.query(query, [id]);
    return NextResponse.json(result.rows);
  } catch (err) {
    // Use Next.js best practice for error serialization
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
