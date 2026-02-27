import { NextResponse } from 'next/server';
import db from '../../api/_lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';
    let sql = 'SELECT * FROM scenario';
    const conditions = [];
    const values = [];
    let paramIdx = 1;
    if (search) {
      conditions.push(`(scenario_name ILIKE $${paramIdx} OR scenario ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }
    if (tag) {
      conditions.push(`tag = $${paramIdx}`);
      values.push(tag);
      paramIdx++;
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY id';
    const result = await db.query(sql, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { scenario_name, tag, scenario, solution } = data;
    const result = await db.query(
      'INSERT INTO scenario (scenario_name, tag, scenario, solution) VALUES ($1, $2, $3, $4) RETURNING id',
      [scenario_name, tag, scenario, solution]
    );
    const id = result.rows[0]?.id;
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add scenario' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, scenario_name, tag, scenario, solution } = data;
    // Delete embeddings for this scenario before update (use metadata->'Metadata'->>'parent_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'parent_id' = $1`,
      [String(id)]
    );
    await db.query(
      'UPDATE scenario SET scenario_name=$1, tag=$2, scenario=$3, solution=$4 WHERE id=$5',
      [scenario_name, tag, scenario, solution, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const { id } = data;
    // Delete embeddings for this scenario (use metadata->'Metadata'->>'parent_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'parent_id' = $1`,
      [String(id)]
    );
    await db.query('DELETE FROM scenario WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}
