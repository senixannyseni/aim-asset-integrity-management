import { Router } from 'express';
import { checkDatabaseConnection } from '../db/client.js';

type DatabaseHealth = Awaited<ReturnType<typeof checkDatabaseConnection>>;

export const healthRouter = Router();

function safeDatabaseHealth(database: DatabaseHealth): DatabaseHealth {
  if (database.ok) {
    return database;
  }

  return { ok: false, error: 'Database connectivity check failed.' };
}

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'aim-tank-integrity-api',
    sprint: 'foundation',
    calculationsImplemented: false
  });
});

healthRouter.get('/health/db', async (_req, res) => {
  const db = safeDatabaseHealth(await checkDatabaseConnection());
  if (!db.ok) {
    res.status(503).json({ status: 'error', database: db });
    return;
  }
  res.json({ status: 'ok', database: db });
});
