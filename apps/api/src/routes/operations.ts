import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const operationsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

type ValidationIssue = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function validationError(res: ApiResponse, issues: ValidationIssue[]): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: issues
    }
  });
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
      JSON.stringify(before ?? null),
      JSON.stringify(after ?? null),
      JSON.stringify(metadata)
    ]
  );
  return result.rows[0]?.id;
}

function mapWorkflowEvent(row: DbRow): Record<string, unknown> {
  return {
    workflow_event_id: row.id,
    workflow_event_code: row.workflow_event_code,
    workflow_id: row.workflow_id,
    workflow_name: row.workflow_name,
    event_type: row.event_type,
    event_status: row.event_status,
    source_system: row.source_system,
    related_entity_type: row.related_entity_type,
    related_entity_id: row.related_entity_id,
    payload: row.payload_json,
    created_at: row.created_at
  };
}

function mapErrorLog(row: DbRow): Record<string, unknown> {
  return {
    error_log_id: row.id,
    error_code: row.error_code,
    error_message: row.error_message,
    severity: row.severity,
    source_module: row.source_module,
    source_system: row.source_system,
    related_entity_type: row.related_entity_type,
    related_entity_id: row.related_entity_id,
    workflow_event_id: row.workflow_event_id,
    request_id: row.request_id,
    payload: row.payload_json,
    status: row.status,
    created_at: row.created_at,
    resolved_at: row.resolved_at
  };
}

operationsRouter.post('/workflow-events', requirePermission('workflow_event.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, [{ field: 'body', message: 'JSON object body is required.', severity: 'error' }]);
    return;
  }

  const workflowEventCode = asString(req.body.workflow_event_code) ?? `WF-EVT-${Date.now()}`;
  const workflowId = asString(req.body.workflow_id);
  const eventType = asString(req.body.event_type);

  if (!workflowId || !eventType) {
    validationError(res, [
      { field: 'workflow_id', message: 'workflow_id is required.', severity: 'error' },
      { field: 'event_type', message: 'event_type is required.', severity: 'error' }
    ]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<DbRow>(
      `insert into workflow_events(
        workflow_event_code,
        workflow_id,
        workflow_name,
        event_type,
        event_status,
        source_system,
        related_entity_type,
        related_entity_id,
        payload_json,
        created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::jsonb, $10)
      on conflict (workflow_event_code) do update set
        event_status = excluded.event_status,
        payload_json = excluded.payload_json
      returning *`,
      [
        workflowEventCode,
        workflowId,
        asString(req.body.workflow_name) ?? null,
        eventType,
        asString(req.body.event_status) ?? 'received',
        asString(req.body.source_system) ?? 'n8n',
        asString(req.body.related_entity_type) ?? null,
        asString(req.body.related_entity_id) ?? null,
        JSON.stringify(isPlainObject(req.body.payload) ? req.body.payload : {}),
        actorUserId(req)
      ]
    );
    const event = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'WORKFLOW_EVENT_RECEIVED', 'workflow_event', event?.id ? String(event.id) : null, null, event ?? null, {
      aim_n8n_boundary: 'n8n orchestration event recorded through AIM API only'
    });
    await client.query('commit');
    res.status(201).json({ data: mapWorkflowEvent(event ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

operationsRouter.get('/error-logs', requirePermission('error_log.read'), async (_req, res, next) => {
  try {
    const result = await pool.query<DbRow>(
      `select * from error_logs order by created_at desc limit 100`
    );
    res.json({ data: result.rows.map(mapErrorLog) });
  } catch (error) {
    next(error);
  }
});

operationsRouter.post('/error-logs', requirePermission('error_log.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, [{ field: 'body', message: 'JSON object body is required.', severity: 'error' }]);
    return;
  }

  const errorCode = asString(req.body.error_code);
  const errorMessage = asString(req.body.error_message);
  const sourceModule = asString(req.body.source_module);

  if (!errorCode || !errorMessage || !sourceModule) {
    validationError(res, [
      { field: 'error_code', message: 'error_code is required.', severity: 'error' },
      { field: 'error_message', message: 'error_message is required.', severity: 'error' },
      { field: 'source_module', message: 'source_module is required.', severity: 'error' }
    ]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<DbRow>(
      `insert into error_logs(
        error_code,
        error_message,
        severity,
        source_module,
        source_system,
        related_entity_type,
        related_entity_id,
        workflow_event_id,
        request_id,
        stack_trace,
        payload_json,
        status,
        created_by
      ) values ($1, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9, $10, $11::jsonb, $12, $13)
      returning *`,
      [
        errorCode,
        errorMessage,
        asString(req.body.severity) ?? 'medium',
        sourceModule,
        asString(req.body.source_system) ?? 'aim',
        asString(req.body.related_entity_type) ?? null,
        asString(req.body.related_entity_id) ?? null,
        asString(req.body.workflow_event_id) ?? null,
        req.header('x-request-id') ?? asString(req.body.request_id) ?? null,
        asString(req.body.stack_trace) ?? null,
        JSON.stringify(isPlainObject(req.body.payload) ? req.body.payload : {}),
        asString(req.body.status) ?? 'open',
        actorUserId(req)
      ]
    );
    const errorLog = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'ERROR_LOG_CREATED', 'error_log', errorLog?.id ? String(errorLog.id) : null, null, errorLog ?? null, {
      module: 'governance_hardening'
    });
    await client.query('commit');
    res.status(201).json({ data: mapErrorLog(errorLog ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
