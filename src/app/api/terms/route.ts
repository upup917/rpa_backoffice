import { NextResponse } from "next/server";
import db from '../../api/_lib/db';

// Table: term (word_id SERIAL PRIMARY KEY, word TEXT, meaning TEXT, word_type TEXT)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    let terms;
    if (search) {
      terms = await db.query(
        "SELECT * FROM term WHERE word ILIKE $1 ORDER BY word_id asc",
        [`%${search}%`]
      );
    } else {
      terms = await db.query("SELECT * FROM term ORDER BY word_id asc");
    }
    // ดึง word_type ไม่ซ้ำทั้งหมด
    const typeResult = await db.query("SELECT DISTINCT word_type FROM term WHERE word_type IS NOT NULL AND word_type <> '' ORDER BY word_type ASC");
    const types = typeResult.rows.map(r => r.word_type);
    return NextResponse.json({ terms: terms.rows, types });
  } catch (err) {
    console.error("GET /api/terms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { word, meaning, word_type } = await request.json();
    if (!word || !meaning || !word_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // generate word_id ใหม่แบบ W-xxx (หา max จริง)
    const max = await db.query("SELECT MAX(CAST(SUBSTRING(word_id, 3) AS INTEGER)) AS maxnum FROM term WHERE word_id LIKE 'W-%'");
    let nextNum = 1;
    if (max.rows[0].maxnum) nextNum = max.rows[0].maxnum + 1;
    const word_id = `W-${String(nextNum).padStart(3, '0')}`;
    const result = await db.query(
      "INSERT INTO term (word_id, word, meaning, word_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [word_id, word, meaning, word_type]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/terms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  try {
    const { word_id, word, meaning, word_type } = await request.json();
    if (!word_id || !word || !meaning || !word_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Delete embeddings for this term before update (use metadata->'Metadata'->>'word_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'word_id' = $1`,
      [word_id]
    );
    const result = await db.query(
      "UPDATE term SET word = $2, meaning = $3, word_type = $4 WHERE word_id = $1 RETURNING *",
      [word_id, word, meaning, word_type]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/terms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { word_id } = await request.json();
    // Delete embeddings for this term (use metadata->'Metadata'->>'word_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'word_id' = $1`,
      [word_id]
    );
    await db.query("DELETE FROM term WHERE word_id = $1", [word_id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/terms error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
