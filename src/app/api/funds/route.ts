import { NextResponse } from 'next/server';
// @ts-ignore
import db from '../../api/_lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';

    let sql = 'SELECT * FROM funds';
    const conditions: string[] = [];
    const values: any[] = [];

    let statusValue = '';
    let searchValue = search;
    // Parse search string for status:enable or status:disable
    if (search) {
      const statusMatch = search.match(/status:(enable|disable)/);
      if (statusMatch) {
        statusValue = statusMatch[1];
        // Remove status:enable/disable from search string
        searchValue = search.replace(/status:(enable|disable)/, '').trim();
      }
    }
    if (searchValue) {
      conditions.push(`(fund_abbr ILIKE $${values.length + 1} OR fund_name_th ILIKE $${values.length + 1} OR source_agency ILIKE $${values.length + 1})`);
      values.push(`%${searchValue}%`);
    }
    if (statusValue) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(statusValue);
    }
    if (filter === 'enable' || filter === 'disable') {
      conditions.push(`status = $${values.length + 1}`);
      values.push(filter);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY fund_id';

    const funds = await db.query(sql, values);
    return NextResponse.json(funds.rows);
  } catch (error) {
    console.error('GET /api/funds error:', error);
    const details = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    return NextResponse.json({ error: 'Failed to fetch funds', details }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { fund_abbr, fund_name_th, fund_name_en, fiscal_year, source_agency, start_period, end_period, status } = data;
    // Convert empty string dates to null
    const startPeriod = start_period === '' ? null : start_period;
    const endPeriod = end_period === '' ? null : end_period;
    // Generate new fund_id in format F-xxx
    const result = await db.query("SELECT fund_id FROM funds ORDER BY fund_id DESC LIMIT 1");
    let nextId = 1;
    if (result.rows.length > 0) {
      const lastId = result.rows[0].fund_id;
      const match = lastId.match(/^F-(\d{3})$/);
      if (match) {
        nextId = parseInt(match[1], 10) + 1;
      }
    }
    const fund_id = `F-${nextId.toString().padStart(3, '0')}`;
    try {
      await db.query(
        'INSERT INTO funds (fund_id, fund_abbr, fund_name_th, fund_name_en, fiscal_year, source_agency, start_period, end_period, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [fund_id, fund_abbr, fund_name_th, fund_name_en, fiscal_year, source_agency, startPeriod, endPeriod, status]
      );
      return NextResponse.json({ success: true, fund_id });
    } catch (error: any) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Duplicate fund_id. This fund_id already exists.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('POST /api/funds error:', error);
    const details = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    return NextResponse.json({ error: 'Failed to add fund', details }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { fund_id, fund_abbr, fund_name_th, fund_name_en, fiscal_year, source_agency, start_period, end_period, status } = data;
    // Convert empty string dates to null
    const startPeriod = start_period === '' ? null : start_period;
    const endPeriod = end_period === '' ? null : end_period;
    // Delete embeddings for this fund before update (use metadata->'Metadata'->>'source_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'source_id' = $1`,
      [fund_id]
    );
    // Update fund
    await db.query(
      'UPDATE funds SET fund_abbr=$2, fund_name_th=$3, fund_name_en=$4, fiscal_year=$5, source_agency=$6, start_period=$7, end_period=$8, status=$9 WHERE fund_id=$1',
      [fund_id, fund_abbr, fund_name_th, fund_name_en, fiscal_year, source_agency, startPeriod, endPeriod, status]
    );
    // Delete embeddings for related manual steps (if any)
    const manualResult = await db.query('SELECT chunk_id FROM manual WHERE fund_abbr LIKE $1', [`%${fund_abbr}%`]);
    for (const row of manualResult.rows) {
      await db.query(
        `DELETE FROM embedding WHERE metadata->>'source_table' = $1 AND metadata->>'source_id' = $2`,
        ['manual', row.chunk_id]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/funds error:', error);
    const details = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    return NextResponse.json({ error: 'Failed to update fund', details }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let data = {};
    try {
      data = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid request body, must be JSON.' }, { status: 400 });
    }
    const { fund_id, force }: { fund_id?: string, force?: boolean } = data;
    if (!fund_id || typeof fund_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid fund_id.' }, { status: 400 });
    }
    // Find fund_abbr for this fund_id
    const fundResult = await db.query('SELECT fund_abbr FROM funds WHERE fund_id=$1', [fund_id]);
    if (fundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Fund not found.' }, { status: 404 });
    }
    const fund_abbr = fundResult.rows[0].fund_abbr;
    // Query all manual steps that might contain this fund_abbr (loose match)
    const manualResult = await db.query(
      `SELECT chunk_id, document_title, step_number, topic, fund_abbr FROM manual WHERE fund_abbr LIKE $1`,
      [`%${fund_abbr}%`]
    );
    // Filter only steps that actually contain this fund_abbr (split by space/comma)
    const affectedSteps = manualResult.rows.filter((step: any) => {
      const abbrs = step.fund_abbr ? step.fund_abbr.split(/[ ,]+/).map((s: string) => s.trim()).filter(Boolean) : [];
      return abbrs.includes(fund_abbr);
    });
    if (!force && affectedSteps.length > 0) {
      // Return steps found, do not delete fund yet
      return NextResponse.json({ warning: 'Fund is used in manual steps.', steps: affectedSteps, fund_abbr }, { status: 409 });
    }
    if (force && affectedSteps.length > 0) {
      // For each step: if fund_abbr == this fund only, delete step; else remove fund_abbr from list
      for (const step of affectedSteps) {
        let abbrs = step.fund_abbr ? step.fund_abbr.split(/[ ,]+/).map((s: string) => s.trim()).filter(Boolean) : [];
        // Remove fund_abbr from abbrs
        abbrs = abbrs.filter((abbr: string) => abbr !== fund_abbr);
        if (abbrs.length === 0) {
          // No funds left, delete step
          await db.query('DELETE FROM manual WHERE chunk_id = $1', [step.chunk_id]);
          // Delete embeddings for this manual step
          await db.query(
            `DELETE FROM embedding WHERE metadata->>'source_table' = $1 AND metadata->>'source_id' = $2`,
            ['manual', step.chunk_id]
          );
        } else {
          // Update fund_abbr with remaining funds
          const newAbbr = abbrs.join(' ').replace(/\s+/g, ' ').trim();
          await db.query('UPDATE manual SET fund_abbr = $1 WHERE chunk_id = $2', [newAbbr, step.chunk_id]);
          // Delete embeddings for this manual step (to reembed)
          await db.query(
            `DELETE FROM embedding WHERE metadata->>'source_table' = $1 AND metadata->>'source_id' = $2`,
            ['manual', step.chunk_id]
          );
          // --- Trigger n8n webhook for re-embedding ---
          try {
            // Get updated manual step
            const manualRes = await db.query('SELECT * FROM manual WHERE chunk_id = $1', [step.chunk_id]);
            if (manualRes.rows.length > 0) {
              const manualData = manualRes.rows[0];
              const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
              if (webhookUrl) {
                // Use same formatDataForN8n as frontend
                const payload = {
                  json: {
                    text: `\nหัวข้อ: ${manualData.topic || '-'}\nเนื้อหา: ${manualData.chunk_content || '-'}\nหมวดหมู่หลัก: ${manualData.category_main || '-'}\nหมวดหมู่ย่อย: ${manualData.category_sub || '-'}\nส่วนงาน/ระเบียบ: ${manualData.section || '-'}\nชื่อเอกสาร: ${manualData.document_title || '-'}\nประเภทข้อมูล: ${manualData.data_type || '-'}\nFund: ${manualData.fund_abbr || '-'}\nStep: ${manualData.step_number || '-'}`.trim(),
                    metadata: {
                      chunk_id: manualData.chunk_id ?? null,
                      document_title: manualData.document_title ?? null,
                      category_main: manualData.category_main ?? null,
                      type: 'manual_guide'
                    }
                  }
                };
                await fetch(webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
              }
            }
          } catch (err) {
            console.error('n8n webhook manual re-embed error:', err);
          }
        }
      }
    }
    // Delete embeddings for this fund (use metadata->'Metadata'->>'source_id')
    await db.query(
      `DELETE FROM embedding WHERE metadata->'Metadata'->>'source_id' = $1`,
      [fund_id]
    );
    // Delete fund
    await db.query('DELETE FROM funds WHERE fund_id=$1', [fund_id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/funds error:', error);
    const details = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    return NextResponse.json({ error: 'Failed to delete fund', details }, { status: 500 });
  }
}
