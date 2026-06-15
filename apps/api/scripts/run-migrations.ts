import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const migrationsDir = path.join(repoRoot, 'db/migrations');

async function main() {
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const alreadyApplied = await pool.query('select 1 from schema_migrations where filename = $1', [file]);
    if ((alreadyApplied.rowCount ?? 0) > 0) {
      console.log(`Skipping applied migration: ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying migration: ${file}`);
    await pool.query('begin');
    try {
      await pool.query(sql);
      await pool.query('insert into schema_migrations(filename) values($1)', [file]);
      await pool.query('commit');
    } catch (error) {
      await pool.query('rollback');
      throw error;
    }
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
