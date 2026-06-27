import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined
});

export async function checkDatabaseConnection(): Promise<{ ok: boolean; serverTime?: string; error?: string }> {
  try {
    const result = await pool.query<{ now: string }>('select now()::text as now');
    return { ok: true, serverTime: result.rows[0]?.now };
  } catch {
    return { ok: false, error: 'Database connectivity check failed.' };
  }
}
