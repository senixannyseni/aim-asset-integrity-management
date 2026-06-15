import { Router } from 'express';
import { checkDatabaseConnection } from '../db/client.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'aim-tank-integrity-api',
    sprint: 'foundation',
    calculationsImplemented: false
  });
});

healthRouter.get('/health/db', async (_req, res) => {
  const db = await checkDatabaseConnection();
  if (!db.ok) {
    res.status(503).json({ status: 'error', database: db });
    return;
  }
  res.json({ status: 'ok', database: db });
});
