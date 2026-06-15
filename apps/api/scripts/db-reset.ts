import { pool } from '../src/db/client.js';

async function main() {
  if (process.env.APP_ENV === 'production') {
    throw new Error('Refusing to reset production database.');
  }

  await pool.query(`
    drop schema public cascade;
    create schema public;
    grant all on schema public to public;
  `);
  await pool.end();
  console.log('Database schema reset. Run pnpm db:migrate && pnpm db:seed next.');
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
