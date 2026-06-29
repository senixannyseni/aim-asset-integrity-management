import type { NextFunction, Request, Response } from 'express';
import { resolveTenantContext, TenantContextError, type TenantContext } from '../modules/tenancy/tenant-context.js';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

export function resolveRequestTenantContext(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    next();
    return;
  }

  try {
    req.tenant = resolveTenantContext({
      requestedTenantId: req.header('x-aim-tenant-id'),
      requestedTenantSlug: req.header('x-aim-tenant-slug'),
      authType: user.authType,
      memberships: user.tenantMemberships
    });
    next();
  } catch (error) {
    if (error instanceof TenantContextError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }
    next(error);
  }
}
