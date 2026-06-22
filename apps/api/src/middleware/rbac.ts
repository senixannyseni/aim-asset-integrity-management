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
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication context is required.'
        }
      });
      return;
    }

    if (user.permissions.includes(permission) || hasPermission(user.roles, permission)) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Permission required: ${permission}`
      }
    });
  };
}
