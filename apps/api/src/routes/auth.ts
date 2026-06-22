import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { extractBearerToken, signAuthToken, verifyAuthToken } from '../auth/jwt.js';
import { verifyPassword } from '../auth/password.js';
import { loadUserContextById } from '../auth/user-context.js';
import { config } from '../config/env.js';
import { pool } from '../db/client.js';

export const authRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;

type LoginUserRow = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  password_hash: string;
  locked_until: Date | string | null;
  failed_login_count: number | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function validationError(res: ApiResponse, field: string, message: string): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: [{ field, message, severity: 'error' }]
    }
  });
}

async function writeAuthAudit(
  client: PoolClient,
  req: Request,
  eventType: string,
  actorUserId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await client.query(
    `insert into audit_logs(
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      ip_address,
      user_agent,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, '{}', 'auth_session', $3, $4, $5::inet, $6, null, $7::jsonb, $8::jsonb)`,
    [
      eventType,
      actorUserId,
      actorUserId,
      req.header('x-request-id') ?? null,
      req.ip ?? null,
      req.header('user-agent') ?? null,
      JSON.stringify({ event_type: eventType }),
      JSON.stringify(metadata)
    ]
  );
}

function authResponse(user: Awaited<ReturnType<typeof loadUserContextById>>, accessToken: string, refreshToken: string, refreshExpiresAt: Date): Record<string, unknown> {
  return {
    data: {
      user: user
        ? {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roles,
            permissions: user.permissions
          }
        : null,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.authAccessTokenTtlSeconds,
      refreshExpiresAt: refreshExpiresAt.toISOString()
    }
  };
}

authRouter.post('/auth/login', async (req: Request, res: ApiResponse, next) => {
  const body = isPlainObject(req.body) ? req.body : undefined;
  if (!body) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  const email = asString(body.email)?.toLowerCase();
  const password = asString(body.password);
  if (!email) {
    validationError(res, 'email', 'Email is required.');
    return;
  }
  if (!password) {
    validationError(res, 'password', 'Password is required.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<LoginUserRow>(
      `select id, email, full_name, status, password_hash, locked_until, failed_login_count
       from users
       where lower(email) = $1
       for update`,
      [email]
    );
    const user = result.rows[0];

    if (!user || user.status !== 'active' || (user.locked_until && new Date(user.locked_until).getTime() > Date.now())) {
      await writeAuthAudit(client, req, 'auth.login_failed', user?.id ?? null, { reason: 'invalid_or_inactive_account', email });
      await client.query('commit');
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
      return;
    }

    if (!verifyPassword(password, user.password_hash)) {
      const failedCount = Number(user.failed_login_count ?? 0) + 1;
      const shouldLock = failedCount >= 5;
      await client.query(
        `update users
         set failed_login_count = $1,
             locked_until = case when $2 then now() + interval '15 minutes' else locked_until end,
             status = case when $2 then 'locked' else status end,
             updated_at = now()
         where id = $3`,
        [failedCount, shouldLock, user.id]
      );
      await writeAuthAudit(client, req, 'auth.login_failed', user.id, { reason: shouldLock ? 'account_locked' : 'bad_password', email });
      await client.query('commit');
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
      return;
    }

    const access = signAuthToken({ userId: user.id, email: user.email, type: 'access', ttlSeconds: config.authAccessTokenTtlSeconds });
    const refresh = signAuthToken({ userId: user.id, email: user.email, type: 'refresh', ttlSeconds: config.authRefreshTokenTtlSeconds });
    const refreshExpiresAt = new Date(refresh.payload.exp * 1000);

    await client.query(
      `insert into auth_refresh_sessions(user_id, token_id, expires_at, user_agent, ip_address)
       values ($1, $2, $3, $4, $5::inet)`,
      [user.id, refresh.payload.jti, refreshExpiresAt, req.header('user-agent') ?? null, req.ip ?? null]
    );
    await client.query(
      `update users
       set failed_login_count = 0,
           locked_until = null,
           last_login_at = now(),
           status = 'active',
           updated_at = now()
       where id = $1`,
      [user.id]
    );
    await writeAuthAudit(client, req, 'auth.login_success', user.id, { token_id: access.payload.jti });
    await client.query('commit');

    const userContext = await loadUserContextById(user.id, access.payload.jti);
    res.json(authResponse(userContext, access.token, refresh.token, refreshExpiresAt));
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

authRouter.post('/auth/refresh', async (req: Request, res: ApiResponse, next) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const refreshToken = asString(body.refreshToken) ?? extractBearerToken(req.header('authorization'));
  if (!refreshToken) {
    validationError(res, 'refreshToken', 'Refresh token is required.');
    return;
  }

  const client = await pool.connect();
  try {
    const payload = verifyAuthToken(refreshToken, 'refresh');
    await client.query('begin');
    const session = await client.query<{ user_id: string; expires_at: Date; revoked_at: Date | null }>(
      `select user_id, expires_at, revoked_at
       from auth_refresh_sessions
       where token_id = $1
       for update`,
      [payload.jti]
    );
    const row = session.rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
      await writeAuthAudit(client, req, 'auth.refresh_failed', row?.user_id ?? payload.sub, { reason: 'refresh_session_invalid' });
      await client.query('commit');
      res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired.' } });
      return;
    }

    const userContext = await loadUserContextById(payload.sub);
    if (!userContext) {
      await writeAuthAudit(client, req, 'auth.refresh_failed', payload.sub, { reason: 'user_inactive_or_missing' });
      await client.query('commit');
      res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired.' } });
      return;
    }

    await client.query(`update auth_refresh_sessions set revoked_at = now(), revoked_reason = 'rotated' where token_id = $1`, [payload.jti]);
    const access = signAuthToken({ userId: userContext.id, email: userContext.email, type: 'access', ttlSeconds: config.authAccessTokenTtlSeconds });
    const refresh = signAuthToken({ userId: userContext.id, email: userContext.email, type: 'refresh', ttlSeconds: config.authRefreshTokenTtlSeconds });
    const refreshExpiresAt = new Date(refresh.payload.exp * 1000);
    await client.query(
      `insert into auth_refresh_sessions(user_id, token_id, expires_at, user_agent, ip_address)
       values ($1, $2, $3, $4, $5::inet)`,
      [userContext.id, refresh.payload.jti, refreshExpiresAt, req.header('user-agent') ?? null, req.ip ?? null]
    );
    await writeAuthAudit(client, req, 'auth.token_refreshed', userContext.id, { old_token_id: payload.jti, new_token_id: refresh.payload.jti });
    await client.query('commit');
    res.json(authResponse(userContext, access.token, refresh.token, refreshExpiresAt));
  } catch (error) {
    await client.query('rollback');
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired.' } });
  } finally {
    client.release();
  }
});

authRouter.post('/auth/logout', async (req: Request, res: ApiResponse, next) => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication context is required.' } });
    return;
  }

  const body = isPlainObject(req.body) ? req.body : {};
  const refreshToken = asString(body.refreshToken);
  const client = await pool.connect();
  try {
    await client.query('begin');
    let revokedTokenId: string | null = null;
    if (refreshToken) {
      const payload = verifyAuthToken(refreshToken, 'refresh');
      if (payload.sub === req.user.id) {
        revokedTokenId = payload.jti;
        await client.query(`update auth_refresh_sessions set revoked_at = now(), revoked_reason = 'logout' where token_id = $1`, [payload.jti]);
      }
    } else {
      await client.query(
        `update auth_refresh_sessions
         set revoked_at = now(), revoked_reason = 'logout_all_for_access_session'
         where user_id = $1 and revoked_at is null`,
        [req.user.id]
      );
    }
    await writeAuthAudit(client, req, 'auth.logout', req.user.id, { revoked_token_id: revokedTokenId });
    await client.query('commit');
    res.json({ data: { loggedOut: true } });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

authRouter.get('/auth/me', async (req: Request, res: ApiResponse) => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication context is required.' } });
    return;
  }

  res.json({
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        roles: req.user.roles,
        permissions: req.user.permissions,
        authType: req.user.authType
      }
    }
  });
});
