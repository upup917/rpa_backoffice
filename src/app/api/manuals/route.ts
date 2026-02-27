import { NextResponse } from "next/server";
import db from '../../api/_lib/db';

// Table: manual (chunk_id SERIAL PRIMARY KEY, document_title TEXT, category_main TEXT, category_sub TEXT, step_number INT, topic TEXT, chunk_content TEXT, fund_abbr TEXT, section TEXT, data_type TEXT)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const document_title = searchParams.get("document_title") || "";
    let sql = 'SELECT * FROM manual';
    const conditions = [];
    const values = [];
    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(`(document_title ILIKE $${idx} OR category_main ILIKE $${idx} OR category_sub ILIKE $${idx} OR topic ILIKE $${idx} OR section ILIKE $${idx} OR chunk_content ILIKE $${idx} OR fund_abbr ILIKE $${idx} OR data_type ILIKE $${idx})`);
    }
    if (document_title) {
      values.push(document_title);
      conditions.push(`document_title = $${values.length}`);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY chunk_id ASC';
    const result = await db.query(sql, values);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("GET /api/manuals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("POST /api/manuals body:", body);
    let { document_title, category_main, category_sub, step_number, topic, chunk_content, fund_abbr, section, data_type } = body;
    // Convert empty string step_number to null for integer column
    if (step_number === "") step_number = null;
    if (!document_title || !category_main || !category_sub || !topic || !chunk_content) {
      console.error("POST /api/manuals missing fields", { document_title, category_main, category_sub, topic, chunk_content });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await db.query(
      'INSERT INTO manual (document_title, category_main, category_sub, step_number, topic, chunk_content, fund_abbr, section, data_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [document_title, category_main, category_sub, step_number, topic, chunk_content, fund_abbr, section, data_type]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/manuals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { chunk_id, document_title, category_main, category_sub, step_number, topic, chunk_content, fund_abbr, section, data_type } = await request.json();
    if (!chunk_id || !document_title || !category_main || !category_sub || !topic || !chunk_content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Delete embeddings for this manual step before update (use metadata->'Metadata'->>'chunk_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'chunk_id' = $1`,
      [chunk_id]
    );
    const result = await db.query(
      'UPDATE manual SET document_title = $1, category_main = $2, category_sub = $3, step_number = $4, topic = $5, chunk_content = $6, fund_abbr = $7, section = $8, data_type = $9 WHERE chunk_id = $10 RETURNING *',
      [document_title, category_main, category_sub, step_number, topic, chunk_content, fund_abbr, section, data_type, chunk_id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Manual not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/manuals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { chunk_id } = await request.json();
    // Delete embeddings for this manual step (use metadata->'Metadata'->>'chunk_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'chunk_id' = $1`,
      [chunk_id]
    );
    await db.query('DELETE FROM manual WHERE chunk_id = $1', [chunk_id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/manuals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
