import pool from '../../api/_lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM faq ORDER BY id ASC');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await pool.query(
      'INSERT INTO faq (question, answer) VALUES ($1, $2) RETURNING *',
      [data.question, data.answer]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const result = await pool.query(
      'UPDATE faq SET question = $1, answer = $2 WHERE id = $3 RETURNING *',
      [data.question, data.answer, data.id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await pool.query('DELETE FROM faq WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
