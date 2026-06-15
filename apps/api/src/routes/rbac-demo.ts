import { Router } from 'express';
import { requirePermission } from '../middleware/rbac.js';

export const rbacDemoRouter = Router();

rbacDemoRouter.get('/rbac/demo/asset-read', requirePermission('asset.read'), (_req, res) => {
  res.json({ ok: true, permission: 'asset.read' });
});

rbacDemoRouter.post('/rbac/demo/calculation-approve', requirePermission('calculation.approve'), (_req, res) => {
  res.json({ ok: true, permission: 'calculation.approve' });
});
