import type { NextFunction, Request, Response } from 'express';
import { extractBearerToken, verifyAuthToken } from '../auth/jwt.js';
import { loadUserContextById, type AuthenticatedUserContext } from '../auth/user-context.js';
import { config } from '../config/env.js';
import { DEFAULT_SINGLE_TENANT_NAME, DEFAULT_SINGLE_TENANT_SLUG, DEFAULT_SINGLE_TENANT_ID } from '../modules/tenancy/tenant-context.js';
import { isRole, permissionsForRoles, type Permission, type Role } from '../rbac/roles.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserContext;
    }
  }
}

function unauthorized(res: Response, message: string): void {
  res.status(401).json({
    error: {
      code: 'UNAUTHENTICATED',
      message
    }
  });
}

/** LOCAL-DEV ONLY: demo header identity is a temporary sprint development shim.
 * It is enabled only when AUTH_ALLOW_LOCAL_DEMO=true and APP_ENV is local/development/test.
 * Production authentication must use verified JWT/session identity and DB-backed RBAC.
 */
export function demoRequestContext(req: Request, _res: Response, next: NextFunction): void {
  if (!config.allowLocalDemoAuth) {
    next();
    return;
  }

  const rawRoles = req.header('x-aim-demo-roles');
  if (!rawRoles) {
    next();
    return;
  }

  const roles = rawRoles
    .split(',')
    .map((role) => role.trim())
    .filter(isRole);

  const permissions = Array.from(permissionsForRoles(roles)) as Permission[];

  req.user = {
    id: req.header('x-aim-demo-user-id') ?? '00000000-0000-0000-0000-000000000000',
    email: req.header('x-aim-demo-email') ?? 'local.demo@aim.local',
    fullName: req.header('x-aim-demo-full-name') ?? 'Local Demo User',
    roles,
    permissions,
    tenantMemberships: [{
      tenantId: req.header('x-aim-demo-tenant-id') ?? DEFAULT_SINGLE_TENANT_ID,
      tenantSlug: req.header('x-aim-demo-tenant-slug') ?? DEFAULT_SINGLE_TENANT_SLUG,
      tenantName: req.header('x-aim-demo-tenant-name') ?? DEFAULT_SINGLE_TENANT_NAME,
      status: 'active',
      isDefault: true,
      roleScope: []
    }],
    authType: 'local_demo'
  };
  next();
}

export async function authenticateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.header('authorization'));
    if (token) {
      const payload = verifyAuthToken(token, 'access');
      const userContext = await loadUserContextById(payload.sub, payload.jti);
      if (!userContext) {
        unauthorized(res, 'Authenticated user is disabled, locked, or no longer exists.');
        return;
      }
      req.user = userContext;
      next();
      return;
    }

    demoRequestContext(req, res, next);
  } catch {
    unauthorized(res, 'Invalid or expired authentication token.');
  }
}
