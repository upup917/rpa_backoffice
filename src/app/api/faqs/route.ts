import pool from '../../api/_lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const schema = process.env.DB_SCHEMA || 'schema_beta';
    const result = await pool.query(`SELECT * FROM ${schema}.faq ORDER BY id ASC`);
    // log ตารางที่ดึงมาและจำนวน row
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${schema}.faq`);
    const rowCount = countResult.rows[0].count;
    console.log(`[FAQ API] Table faq accessed, row count: ${rowCount}`);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const schema = process.env.DB_SCHEMA || 'schema_beta';
    const result = await pool.query(
      `INSERT INTO ${schema}.faq (question, answer) VALUES ($1, $2) RETURNING *`,
      [data.question, data.answer]
    );
    // log ตารางที่ดึงมาและจำนวน row
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${schema}.faq`);
    const rowCount = countResult.rows[0].count;
    console.log(`[FAQ API] Table faq accessed, row count: ${rowCount}`);
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const schema = process.env.DB_SCHEMA || 'schema_beta';
    const result = await pool.query(
      `UPDATE ${schema}.faq SET question = $1, answer = $2 WHERE id = $3 RETURNING *`,
      [data.question, data.answer, data.id]
    );
    // log ตารางที่ดึงมาและจำนวน row
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${schema}.faq`);
    const rowCount = countResult.rows[0].count;
    console.log(`[FAQ API] Table faq accessed, row count: ${rowCount}`);
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const schema = process.env.DB_SCHEMA || 'schema_beta';
    await pool.query(`DELETE FROM ${schema}.faq WHERE id = $1`, [id]);
    // log ตารางที่ดึงมาและจำนวน row
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${schema}.faq`);
    const rowCount = countResult.rows[0].count;
    console.log(`[FAQ API] Table faq accessed, row count: ${rowCount}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
