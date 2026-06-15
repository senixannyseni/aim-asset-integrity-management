import type { NextFunction, Request, Response } from 'express';
import { isRole, type Role } from '../rbac/roles.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: Role[];
      };
    }
  }
}

export function demoRequestContext(req: Request, _res: Response, next: NextFunction): void {
  const rawRoles = req.header('x-aim-demo-roles');
  if (!rawRoles) {
    next();
    return;
  }

  const roles = rawRoles
    .split(',')
    .map((role) => role.trim())
    .filter(isRole);

  req.user = {
    id: req.header('x-aim-demo-user-id') ?? '00000000-0000-0000-0000-000000000000',
    email: req.header('x-aim-demo-email') ?? 'local.demo@aim.local',
    roles
  };
  next();
}
