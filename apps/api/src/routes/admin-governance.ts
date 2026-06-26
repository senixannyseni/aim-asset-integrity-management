import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { redactAuditMetadata } from '../modules/audit-log/redaction.js';

export const adminGovernanceRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

const SENSITIVE_SETTING_PATTERN = /(secret|token|password|credential|access_key|secret_key|private_key|jwt|cookie|signed_url|presigned_url|object_storage|s3_|aws_|env)/i;
const ALLOWED_SETTING_UPDATES: Record<
  string,
  {
    type: 'string' | 'number' | 'boolean' | 'json';
    description: string;
    min?: number;
    max?: number;
    maxLength?: number;
  }
> = {
  evidence_retention_days: {
    type: 'number',
    min: 30,
    max: 3650,
    description: 'Non-secret evidence governance retention window in days.'
  },
  report_export_expiry_hours: {
    type: 'number',
    min: 1,
    max: 168,
    description: 'Non-secret report export link policy window in hours.'
  },
  ai_review_sla_hours: {
    type: 'number',
    min: 1,
    max: 720,
    description: 'Non-secret AI review reminder SLA in hours.'
  },
  governance_banner_text: {
    type: 'string',
    maxLength: 280,
    description: 'Non-secret admin governance banner text.'
  },
  admin_governance_read_only_notice_enabled: {
    type: 'boolean',
    description: 'Non-secret UI notice toggle for admin governance.'
  }
};

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asUuid(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMeaningfulReason(value: unknown): boolean {
  const text = asString(value)?.toLowerCase();
  if (!text) return false;
  return !['n/a', 'na', '-', 'none', 'test', 'because'].includes(text) && text.length >= 8;
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

const SERVICE_ADMIN_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

function isServiceAdminActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_ADMIN_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanAdminActor(req: Request, res: ApiResponse, action: string): boolean {
  if (isServiceAdminActor(req)) {
    res.status(403).json({
      error: {
        code: 'ADMIN_SERVICE_ACTOR_BLOCKED',
        message: `Service, AI, and n8n-style actors cannot ${action}.`
      }
    });
    return false;
  }
  return true;
}

function validationError(res: ApiResponse, field: string, message: string, code = 'VALIDATION_FAILED'): void {
  res.status(400).json({
    error: {
      code,
      message: 'Request validation failed.',
      details: [{ field, message, severity: 'error' }]
    }
  });
}

function blocked(res: ApiResponse, code: string, message: string, details: Record<string, unknown> = {}): void {
  res.status(409).json({ error: { code, message, details } });
}

async function writeAudit(
  client: PoolClient,
  req: Request,
  eventType: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  metadata: Record<string, unknown> = {}
): Promise<string | undefined> {
  const safeBefore = redactAuditMetadata(before ?? null);
  const safeAfter = redactAuditMetadata(after ?? null);
  const safeMetadata = redactAuditMetadata(metadata);
  const result = await client.query<{ id: string }>(
    `insert into audit_logs(
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
    returning id`,
    [
      eventType,
      actorUserId(req),
      actorRoles(req),
      entityType,
      entityId,
      req.header('x-request-id') ?? null,
      JSON.stringify(safeBefore),
      JSON.stringify(safeAfter),
      JSON.stringify(safeMetadata)
    ]
  );
  return result.rows[0]?.id;
}

function mapUser(row: DbRow): Record<string, unknown> {
  return {
    user_id: row.id,
    email: row.email,
    full_name: row.full_name,
    status: row.status,
    last_login_at: row.last_login_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sensitive_fields_omitted: ['password_hash', 'password_hash_algorithm', 'refresh_tokens', 'mfa_secret']
  };
}

function mapRole(row: DbRow): Record<string, unknown> {
  return {
    role_id: row.id,
    role_code: row.role_code,
    role_name: row.role_name,
    description: row.description ?? null,
    created_at: row.created_at
  };
}

function mapPermission(row: DbRow): Record<string, unknown> {
  return {
    permission_id: row.id,
    permission_code: row.permission_code,
    description: row.description ?? null,
    created_at: row.created_at
  };
}

function classifySetting(key: string): 'public_governance' | 'operational' | 'sensitive_redacted' | 'secret_blocked' {
  if (SENSITIVE_SETTING_PATTERN.test(key)) return 'secret_blocked';
  if (Object.prototype.hasOwnProperty.call(ALLOWED_SETTING_UPDATES, key)) return 'public_governance';
  return 'operational';
}

function safeSettingValue(row: DbRow): unknown {
  const key = asString(row.setting_key) ?? '';
  const classification = classifySetting(key);
  if (classification === 'secret_blocked' || classification === 'sensitive_redacted') return '[REDACTED]';
  return redactAuditMetadata(row.setting_value ?? null);
}

function mapSystemSetting(row: DbRow): Record<string, unknown> {
  const key = asString(row.setting_key) ?? '';
  const classification = classifySetting(key);
  return {
    setting_id: row.id,
    setting_key: key,
    setting_value: safeSettingValue(row),
    setting_type: row.setting_type,
    classification,
    update_allowed: Object.prototype.hasOwnProperty.call(ALLOWED_SETTING_UPDATES, key) && classification === 'public_governance',
    description: row.description ?? ALLOWED_SETTING_UPDATES[key]?.description ?? null,
    requires_approval: row.requires_approval ?? false,
    effective_from: row.effective_from ?? null,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at ?? null,
    redaction_notice: classification === 'secret_blocked' ? 'Secret or environment-derived setting values are not exposed.' : null
  };
}

function parseSettingValue(expectedType: string, value: unknown): unknown | undefined {
  if (expectedType === 'string') return typeof value === 'string' ? value : undefined;
  if (expectedType === 'boolean') return typeof value === 'boolean' ? value : undefined;
  if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  if (expectedType === 'json') return value === undefined ? undefined : value;
  return undefined;
}

async function roleHasAdminGovernanceManagement(client: PoolClient, roleId: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `select exists(
       select 1
       from role_permissions rp
       join permissions p on p.id = rp.permission_id
       where rp.role_id = $1 and p.permission_code in ('admin_governance.manage_roles', 'admin_governance.manage_settings', 'admin.manage')
     ) as exists`,
    [roleId]
  );
  return result.rows[0]?.exists === true;
}

async function countRemainingAdminCapableUsers(client: PoolClient, excludingUserId: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    `select count(distinct ur.user_id)::text as count
     from user_roles ur
     join role_permissions rp on rp.role_id = ur.role_id
     join permissions p on p.id = rp.permission_id
     join users u on u.id = ur.user_id
     where ur.user_id <> $1::uuid
       and u.status = 'active'
       and p.permission_code in ('admin_governance.manage_roles', 'admin_governance.manage_settings', 'admin.manage')`,
    [excludingUserId]
  );
  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
}

adminGovernanceRouter.get('/admin-governance/users', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view admin governance users')) return;
    const result = await pool.query<DbRow>('select id, email, full_name, status, last_login_at, created_at, updated_at from users order by email asc');
    res.json({ data: result.rows.map(mapUser), governance: { read_only: true, permission_required: 'admin_governance.view', secrets_exposed: false } });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.get('/admin-governance/roles', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view admin governance roles')) return;
    const result = await pool.query<DbRow>('select id, role_code, role_name, description, created_at from roles order by role_code asc');
    res.json({ data: result.rows.map(mapRole), governance: { read_only: true, permission_required: 'admin_governance.view' } });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.get('/admin-governance/permissions', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view admin governance permissions')) return;
    const result = await pool.query<DbRow>('select id, permission_code, description, created_at from permissions order by permission_code asc');
    res.json({ data: result.rows.map(mapPermission), governance: { read_only: true, permission_required: 'admin_governance.view' } });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.get('/admin-governance/role-permissions', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view role-permission mappings')) return;
    const result = await pool.query<DbRow>(
      `select r.id as role_id, r.role_code, p.id as permission_id, p.permission_code, rp.granted_at
       from role_permissions rp
       join roles r on r.id = rp.role_id
       join permissions p on p.id = rp.permission_id
       order by r.role_code asc, p.permission_code asc`
    );
    res.json({ data: result.rows, governance: { read_only: true, permission_required: 'admin_governance.view' } });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.get('/admin-governance/user-roles', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view user-role assignments')) return;
    const result = await pool.query<DbRow>(
      `select u.id as user_id, u.email, u.full_name, u.status, r.id as role_id, r.role_code, r.role_name, ur.assigned_at
       from user_roles ur
       join users u on u.id = ur.user_id
       join roles r on r.id = ur.role_id
       order by u.email asc, r.role_code asc`
    );
    res.json({ data: result.rows, governance: { read_only: true, permission_required: 'admin_governance.view' } });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.get('/admin-governance/system-settings', requirePermission('admin_governance.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAdminActor(req, res, 'view system settings')) return;
    const result = await pool.query<DbRow>(
      `select id, setting_key, setting_value, setting_type, description, effective_from, requires_approval, updated_by, created_at, updated_at
       from system_settings
       order by setting_key asc`
    );
    res.json({
      data: result.rows.map(mapSystemSetting),
      allowed_updates: Object.keys(ALLOWED_SETTING_UPDATES),
      classifications: ['public_governance', 'operational', 'sensitive_redacted', 'secret_blocked'],
      governance: { read_only: false, permission_required: 'admin_governance.view', manage_permission: 'admin_governance.manage_settings', secrets_exposed: false }
    });
  } catch (error) {
    next(error);
  }
});

adminGovernanceRouter.post('/admin-governance/user-roles', requirePermission('admin_governance.manage_roles'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!enforceHumanAdminActor(req, res, 'assign roles')) return;
    if (!isPlainObject(req.body)) {
      validationError(res, 'body', 'JSON object body is required.');
      return;
    }
    const userId = asUuid(req.body.user_id);
    const roleId = asUuid(req.body.role_id);
    const reason = asString(req.body.reason ?? req.body.comment);
    if (!userId) {
      validationError(res, 'user_id', 'user_id UUID is required.');
      return;
    }
    if (!roleId) {
      validationError(res, 'role_id', 'role_id UUID is required.');
      return;
    }
    if (!isMeaningfulReason(reason)) {
      validationError(res, 'reason', 'A meaningful reason is required for role assignment.', 'ADMIN_REASON_REQUIRED');
      return;
    }
    if (actorUserId(req) === userId) {
      blocked(res, 'ADMIN_SELF_ESCALATION_BLOCKED', 'Administrators cannot change their own role assignments through RC3-E.');
      return;
    }

    await client.query('begin');
    const userResult = await client.query<DbRow>('select id, email, full_name, status from users where id = $1 for update', [userId]);
    const roleResult = await client.query<DbRow>('select id, role_code, role_name from roles where id = $1', [roleId]);
    const targetUser = userResult.rows[0];
    const targetRole = roleResult.rows[0];
    if (!targetUser || !targetRole) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target user or role not found.' } });
      return;
    }

    const beforeResult = await client.query<DbRow>(
      `select u.id as user_id, u.email, r.id as role_id, r.role_code
       from user_roles ur join users u on u.id = ur.user_id join roles r on r.id = ur.role_id
       where ur.user_id = $1 and ur.role_id = $2`,
      [userId, roleId]
    );
    await client.query('insert into user_roles(user_id, role_id) values ($1, $2) on conflict do nothing', [userId, roleId]);
    const after = { user_id: userId, role_id: roleId, email: targetUser.email, role_code: targetRole.role_code, assigned: true };
    const auditLogId = await writeAudit(client, req, 'ADMIN_USER_ROLE_ASSIGNED', 'user_role_assignment', userId, beforeResult.rows[0] ?? null, after, { target_user_id: userId, role_id: roleId, reason });
    await client.query('commit');
    res.status(201).json({ data: after, auditLogId, governance: { permission_required: 'admin_governance.manage_roles', reason_required: true, transactional: true } });
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

adminGovernanceRouter.delete('/admin-governance/user-roles', requirePermission('admin_governance.manage_roles'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!enforceHumanAdminActor(req, res, 'remove roles')) return;
    if (!isPlainObject(req.body)) {
      validationError(res, 'body', 'JSON object body is required.');
      return;
    }
    const userId = asUuid(req.body.user_id);
    const roleId = asUuid(req.body.role_id);
    const reason = asString(req.body.reason ?? req.body.comment);
    if (!userId) {
      validationError(res, 'user_id', 'user_id UUID is required.');
      return;
    }
    if (!roleId) {
      validationError(res, 'role_id', 'role_id UUID is required.');
      return;
    }
    if (!isMeaningfulReason(reason)) {
      validationError(res, 'reason', 'A meaningful reason is required for role removal.', 'ADMIN_REASON_REQUIRED');
      return;
    }
    if (actorUserId(req) === userId) {
      blocked(res, 'ADMIN_SELF_ESCALATION_BLOCKED', 'Administrators cannot change their own role assignments through RC3-E.');
      return;
    }

    await client.query('begin');
    const beforeResult = await client.query<DbRow>(
      `select u.id as user_id, u.email, r.id as role_id, r.role_code
       from user_roles ur join users u on u.id = ur.user_id join roles r on r.id = ur.role_id
       where ur.user_id = $1 and ur.role_id = $2 for update`,
      [userId, roleId]
    );
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User-role assignment not found.' } });
      return;
    }
    if (await roleHasAdminGovernanceManagement(client, roleId)) {
      const remaining = await countRemainingAdminCapableUsers(client, userId);
      if (remaining < 1) {
        await writeAudit(client, req, 'ADMIN_ROLE_CHANGE_BLOCKED', 'user_role_assignment', userId, before, before, { blocked_reason: 'Removing this role would remove the last admin-capable user.', role_id: roleId, reason });
        await client.query('commit');
        blocked(res, 'LAST_ADMIN_REMOVAL_BLOCKED', 'Cannot remove the last admin-capable role assignment.', { role_id: roleId });
        return;
      }
    }
    await client.query('delete from user_roles where user_id = $1 and role_id = $2', [userId, roleId]);
    const auditLogId = await writeAudit(client, req, 'ADMIN_USER_ROLE_REMOVED', 'user_role_assignment', userId, before, null, { target_user_id: userId, role_id: roleId, reason });
    await client.query('commit');
    res.json({ data: { user_id: userId, role_id: roleId, removed: true }, auditLogId, governance: { permission_required: 'admin_governance.manage_roles', reason_required: true, transactional: true } });
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

adminGovernanceRouter.patch('/admin-governance/system-settings/:settingKey', requirePermission('admin_governance.manage_settings'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!enforceHumanAdminActor(req, res, 'update system settings')) return;
    const settingKey = asString(req.params.settingKey);
    if (!settingKey) {
      validationError(res, 'settingKey', 'settingKey path parameter is required.');
      return;
    }
    if (!isPlainObject(req.body)) {
      validationError(res, 'body', 'JSON object body is required.');
      return;
    }
    const reason = asString(req.body.reason ?? req.body.comment);
    if (!isMeaningfulReason(reason)) {
      validationError(res, 'reason', 'A meaningful reason is required for setting changes.', 'ADMIN_REASON_REQUIRED');
      return;
    }
    const allowed = ALLOWED_SETTING_UPDATES[settingKey];
    if (!allowed || SENSITIVE_SETTING_PATTERN.test(settingKey)) {
      blocked(res, 'ADMIN_SYSTEM_SETTING_UPDATE_BLOCKED', 'Unknown, sensitive, secret, or environment-derived settings cannot be updated through RC3-E.', { setting_key: settingKey, allowed_settings: Object.keys(ALLOWED_SETTING_UPDATES) });
      return;
    }
    const value = parseSettingValue(allowed.type, req.body.setting_value);
    if (value === undefined) {
      validationError(res, 'setting_value', `setting_value must match setting type ${allowed.type}.`);
      return;
    }

    if (typeof value === 'number') {
      if (
        (allowed.min !== undefined && value < allowed.min) ||
        (allowed.max !== undefined && value > allowed.max)
      ) {
        validationError(
          res,
          'setting_value',
          `setting_value must be between ${allowed.min ?? '-∞'} and ${allowed.max ?? '∞'}.`,
          'ADMIN_SETTING_VALUE_OUT_OF_RANGE'
        );
        return;
      }
    }

    if (
      typeof value === 'string' &&
      allowed.maxLength !== undefined &&
      value.length > allowed.maxLength
    ) {
      validationError(
        res,
        'setting_value',
        `setting_value must be ${allowed.maxLength} characters or fewer.`,
        'ADMIN_SETTING_VALUE_TOO_LONG'
      );
      return;
    }

    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from system_settings where setting_key = $1 for update', [settingKey]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'System setting not found.' } });
      return;
    }
    const updateResult = await client.query<DbRow>(
      `update system_settings
       set setting_value = $2::jsonb,
           setting_type = $3,
           updated_by = $4,
           updated_at = now()
       where setting_key = $1
       returning *`,
      [settingKey, JSON.stringify(value), allowed.type, actorUserId(req)]
    );
    const after = updateResult.rows[0];
    const auditLogId = await writeAudit(client, req, 'ADMIN_SYSTEM_SETTING_UPDATED', 'system_setting', String(before.id), mapSystemSetting(before), mapSystemSetting(after ?? before), { setting_key: settingKey, old_value_redacted: safeSettingValue(before), new_value_redacted: redactAuditMetadata(value), reason, allowlisted: true });
    await client.query('commit');
    res.json({ data: mapSystemSetting(after ?? before), auditLogId, governance: { permission_required: 'admin_governance.manage_settings', reason_required: true, allowlisted_setting: true, secrets_exposed: false } });
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});
