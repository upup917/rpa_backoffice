export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import db from '../../api/_lib/db';

function safeError(err: unknown) {
  if (err instanceof Error) {
    const withCode = err as Error & { code?: unknown };
    return {
      name: err.name,
      code: typeof withCode.code === 'string' ? withCode.code : undefined,
      message: err.message,
    };
  }

  if (!err || typeof err !== 'object') return { message: String(err) };

  const record = err as Record<string, unknown>;
  return {
    name: typeof record.name === 'string' ? record.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    message: typeof record.message === 'string' ? record.message : String(err),
  };
}

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.query('SELECT 1 as ok');
    return NextResponse.json({
      ok: true,
      node_env: process.env.NODE_ENV,
      db: {
        ok: true,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        user: process.env.DB_USER,
      },
      elapsed_ms: Date.now() - startedAt,
      now: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        node_env: process.env.NODE_ENV,
        db: {
          ok: false,
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          schema: process.env.DB_SCHEMA,
          user: process.env.DB_USER,
        },
        error: safeError(err),
        elapsed_ms: Date.now() - startedAt,
        now: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
