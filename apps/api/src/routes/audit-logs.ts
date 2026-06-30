import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { redactAuditMetadata } from '../modules/audit-log/redaction.js';
import { requireTenantContextFromRequest } from '../modules/tenancy/tenant-scope.js';

export const auditLogsRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

type QueryBuild = {
  whereSql: string;
  values: unknown[];
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asUuid(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : undefined;
}

function asDate(value: unknown): string | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function asPositiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
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

function isServiceAuditViewer(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';
  return roles.includes('ai_agent') || email.includes('n8n') || email.includes('service') || email.includes('integration');
}

function enforceHumanAuditViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceAuditViewer(req)) {
    res.status(403).json({
      error: {
        code: 'AUDIT_LOG_SERVICE_ACTOR_BLOCKED',
        message: 'Broad audit log governance visibility is restricted to authorized human users.'
      }
    });
    return false;
  }
  return true;
}

function buildTraceability(row: DbRow): Record<string, unknown> {
  const entityType = asString(row.entity_type) ?? null;
  const entityId = asString(row.entity_id) ?? null;

  const routeByEntityType: Record<string, string> = {
    evidence_file: '/evidence',
    calculation_run: entityId ? `/calculations/${entityId}` : '/calculations',
    report: '/reports',
    report_export: '/reports',
    integrity_decision: entityId ? `/integrity-decisions/${entityId}` : '/integrity-decisions',
    internal_work_order: entityId ? `/work-orders/${entityId}` : '/work-orders',
    engineering_review: '/reviews'
  };

  return {
    entity_type: entityType,
    entity_id: entityId,
    frontend_href: entityType && routeByEntityType[entityType] ? routeByEntityType[entityType] : null,
    note: entityType && routeByEntityType[entityType]
      ? 'Traceability link points to an existing AIM frontend route.'
      : 'No existing frontend route is declared for this entity type; display entity type and ID as read-only text.'
  };
}

function mapAuditLog(row: DbRow): Record<string, unknown> {
  return {
    audit_log_id: row.id,
    event_type: row.event_type,
    actor_user_id: row.actor_user_id ?? null,
    actor_email: row.actor_email ?? null,
    actor_full_name: row.actor_full_name ?? null,
    actor_role_codes: row.actor_role_codes ?? [],
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    request_id: row.request_id ?? null,
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
    before: redactAuditMetadata(row.before_json ?? null),
    after: redactAuditMetadata(row.after_json ?? null),
    metadata: redactAuditMetadata(row.metadata_json ?? {}),
    traceability: buildTraceability(row),
    created_at: row.created_at,
    redaction_notice: 'Sensitive audit metadata values such as tokens, credentials, cookies, signed URLs, and private keys are redacted before API/UI display.',
    read_only: true
  };
}

function buildAuditLogFilters(req: Request, res: ApiResponse, tenantId: string): QueryBuild | undefined {
  const values: unknown[] = [tenantId];
  const where: string[] = ['al.tenant_id = $1::uuid'];

  const eventType = asString(req.query.event_type);
  if (eventType) {
    values.push(eventType);
    where.push(`al.event_type = $${values.length}`);
  }

  const entityType = asString(req.query.entity_type);
  if (entityType) {
    values.push(entityType);
    where.push(`al.entity_type = $${values.length}`);
  }

  const entityIdRaw = asString(req.query.entity_id);
  if (entityIdRaw) {
    const entityId = asUuid(entityIdRaw);
    if (!entityId) {
      validationError(res, 'entity_id', 'entity_id must be a UUID when provided.');
      return undefined;
    }
    values.push(entityId);
    where.push(`al.entity_id = $${values.length}::uuid`);
  }

  const actorUserIdRaw = asString(req.query.actor_user_id);
  if (actorUserIdRaw) {
    const actorUserId = asUuid(actorUserIdRaw);
    if (!actorUserId) {
      validationError(res, 'actor_user_id', 'actor_user_id must be a UUID when provided.');
      return undefined;
    }
    values.push(actorUserId);
    where.push(`al.actor_user_id = $${values.length}::uuid`);
  }

  const fromRaw = asString(req.query.from);
  if (fromRaw) {
    const from = asDate(fromRaw);
    if (!from) {
      validationError(res, 'from', 'from must be a valid timestamp.');
      return undefined;
    }
    values.push(from);
    where.push(`al.created_at >= $${values.length}::timestamptz`);
  }

  const toRaw = asString(req.query.to);
  if (toRaw) {
    const to = asDate(toRaw);
    if (!to) {
      validationError(res, 'to', 'to must be a valid timestamp.');
      return undefined;
    }
    values.push(to);
    where.push(`al.created_at <= $${values.length}::timestamptz`);
  }

  // Search is restricted to safe fields only and never scans metadata_json, before_json, or after_json.
  const search = asString(req.query.search);
  if (search) {
    values.push(`%${search.replace(/[%_]/g, '\\$&')}%`);
    where.push(`(al.event_type ilike $${values.length} escape '\\' or al.entity_type ilike $${values.length} escape '\\' or al.request_id ilike $${values.length} escape '\\' or u.email ilike $${values.length} escape '\\' or u.full_name ilike $${values.length} escape '\\')`);
  }

  return { whereSql: where.length > 0 ? `where ${where.join(' and ')}` : '', values };
}

auditLogsRouter.get('/audit-logs', requirePermission('audit_logs.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAuditViewer(req, res)) return;
    const tenant = requireTenantContextFromRequest(req);

    const filters = buildAuditLogFilters(req, res, tenant.tenantId);
    if (!filters) return;

    const limit = asPositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const page = asPositiveInt(req.query.page, 1);
    const offset = (page - 1) * limit;

    const countResult = await pool.query<{ total_count: string }>(
      `select count(*)::text as total_count
       from audit_logs al
       left join users u on u.id = al.actor_user_id
       ${filters.whereSql}`,
      filters.values
    );

    const result = await pool.query<DbRow>(
      `select al.*, u.email as actor_email, u.full_name as actor_full_name
       from audit_logs al
       left join users u on u.id = al.actor_user_id
       ${filters.whereSql}
       order by al.created_at desc, al.id desc
       limit $${filters.values.length + 1} offset $${filters.values.length + 2}`,
      [...filters.values, limit, offset]
    );

    const totalCount = Number.parseInt(countResult.rows[0]?.total_count ?? '0', 10);
    res.json({
      data: result.rows.map(mapAuditLog),
      pagination: {
        page,
        limit,
        total_count: totalCount,
        has_next_page: offset + result.rows.length < totalCount
      },
      governance: {
        read_only: true,
        permission_required: 'audit_logs.view',
        redaction_enforced: true,
        mutation_controls_exposed: false
      }
    });
  } catch (error) {
    next(error);
  }
});

auditLogsRouter.get('/audit-logs/:auditLogId', requirePermission('audit_logs.view'), async (req, res, next) => {
  try {
    if (!enforceHumanAuditViewer(req, res)) return;
    const tenant = requireTenantContextFromRequest(req);

    const auditLogId = asUuid(req.params.auditLogId);
    if (!auditLogId) {
      validationError(res, 'auditLogId', 'auditLogId path parameter must be a UUID.');
      return;
    }

    const result = await pool.query<DbRow>(
      `select al.*, u.email as actor_email, u.full_name as actor_full_name
       from audit_logs al
       left join users u on u.id = al.actor_user_id
       where al.id = $1 and al.tenant_id = $2::uuid`,
      [auditLogId, tenant.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Audit log entry not found.' } });
      return;
    }

    res.json({
      data: mapAuditLog(row),
      governance: {
        read_only: true,
        permission_required: 'audit_logs.view',
        redaction_enforced: true,
        mutation_controls_exposed: false
      }
    });
  } catch (error) {
    next(error);
  }
});
