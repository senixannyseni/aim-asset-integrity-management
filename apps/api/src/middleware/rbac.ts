import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from '../rbac/roles.js';

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export function requirePermission(permission: Permission) {
  return function rbacMiddleware(req: Request, res: Response<ApiErrorResponse>, next: NextFunction): void {
    const roles = req.user?.roles ?? [];

    if (roles.length === 0) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication context is required.'
        }
      });
      return;
    }

    if (!hasPermission(roles, permission)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Permission required: ${permission}`
        }
      });
      return;
    }

    next();
  };
}
