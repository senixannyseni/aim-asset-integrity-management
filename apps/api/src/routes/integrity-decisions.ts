import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const integrityDecisionsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function isAiAgent(req: Request): boolean {
  return (req.user?.roles ?? []).includes('ai_agent');
}

function isSeniorIntegrityActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('senior_engineer') || roles.includes('lead_engineer') || roles.includes('approver');
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

function mapDecision(row: DbRow): Record<string, unknown> {
  return {
    integrity_decision_id: row.id,
    decision_code: row.decision_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    calculation_run_id: row.calculation_run_id,
    decision_type: row.decision_type,
    integrity_status: row.integrity_status,
    decision_status: row.decision_status,
    decision_summary: row.decision_summary,
    required_action: row.required_action,
    operating_limitation: row.operating_limitation,
    due_date: row.due_date,
    created_by: row.created_by,
    reviewed_by: row.reviewed_by,
    approved_by: row.approved_by,
    reviewed_at: row.reviewed_at,
    approved_at: row.approved_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
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
      req.user?.roles ?? [],
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

async function countLinkedEvidence(client: PoolClient, entityType: string, entityId: string): Promise<number> {
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count
     from evidence_links
     where linked_entity_type = $1 and linked_entity_id = $2::uuid`,
    [entityType, entityId]
  );
  return Number(result.rows[0]?.count ?? '0');
}

async function persistIntegrityDecisionApprovalGate(
  client: PoolClient,
  req: Request,
  decisionId: string,
  gateStatus: 'pass' | 'fail',
  evidenceCount: number
): Promise<void> {
  await client.query(
    `insert into review_gates(
      entity_type,
      entity_id,
      gate_domain,
      gate_type,
      gate_status,
      blocking,
      evidence_link_required,
      checked_by,
      checked_at,
      metadata_json,
      updated_at
    ) values ('integrity_decision', $1, 'integrity_decision', 'evidence_linked', $2, true, true, $3, now(), $4::jsonb, now())
    on conflict (entity_type, entity_id, gate_domain, gate_type) do update set
      gate_status = excluded.gate_status,
      blocking = excluded.blocking,
      evidence_link_required = excluded.evidence_link_required,
      checked_by = excluded.checked_by,
      checked_at = excluded.checked_at,
      metadata_json = excluded.metadata_json,
      updated_at = now()`,
    [
      decisionId,
      gateStatus,
      actorUserId(req),
      JSON.stringify({
        message: 'Integrity decision approval requires direct evidence linkage.',
        evidence_count: evidenceCount,
        linked_entity_type: 'integrity_decision'
      })
    ]
  );
}


integrityDecisionsRouter.get('/integrity-decisions', requirePermission('integrity_decision.review'), async (req, res, next) => {
  try {
    const values: unknown[] = [];
    const filters = ['1 = 1'];
    const assetId = asString(req.query.asset_id);
    const calculationRunId = asString(req.query.calculation_run_id);
    const decisionStatus = asString(req.query.decision_status);

    if (assetId) {
      if (!isUuid(assetId)) {
        validationError(res, 'asset_id', 'asset_id must be a valid UUID.');
        return;
      }
      values.push(assetId);
      filters.push(`asset_id = $${values.length}`);
    }

    if (calculationRunId) {
      if (!isUuid(calculationRunId)) {
        validationError(res, 'calculation_run_id', 'calculation_run_id must be a valid UUID.');
        return;
      }
      values.push(calculationRunId);
      filters.push(`calculation_run_id = $${values.length}`);
    }

    if (decisionStatus) {
      values.push(decisionStatus);
      filters.push(`decision_status = $${values.length}`);
    }

    const result = await pool.query<DbRow>(
      `select id.*,
              coalesce(ev.evidence_count, 0)::int as evidence_count
       from integrity_decisions id
       left join lateral (
         select count(*)::int as evidence_count
         from evidence_links el
         where el.linked_entity_type = 'integrity_decision'
           and el.linked_entity_id = id.id
       ) ev on true
       where ${filters.join(' and ')}
       order by id.created_at desc
       limit 100`,
      values
    );

    res.json({ data: result.rows.map((row) => ({ ...mapDecision(row), evidence_count: row.evidence_count })) });
  } catch (error) {
    next(error);
  }
});

integrityDecisionsRouter.get('/integrity-decisions/:decisionId', requirePermission('integrity_decision.review'), async (req, res, next) => {
  const decisionId = req.params.decisionId;
  if (!isUuid(decisionId)) {
    validationError(res, 'decisionId', 'decisionId must be a valid UUID.');
    return;
  }

  try {
    const result = await pool.query<DbRow>('select * from integrity_decisions where id = $1', [decisionId]);
    const decision = result.rows[0];

    if (!decision) {
      res.status(404).json({ error: { code: 'INTEGRITY_DECISION_NOT_FOUND', message: 'Integrity decision not found.' } });
      return;
    }

    res.json({ data: mapDecision(decision) });
  } catch (error) {
    next(error);
  }
});

integrityDecisionsRouter.post('/integrity-decisions', requirePermission('integrity_decision.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  if (isAiAgent(req)) {
    res.status(403).json({ error: { code: 'AI_INTEGRITY_DECISION_BLOCKED', message: 'AI agents cannot create integrity decisions.' } });
    return;
  }

  const body = req.body;
  const assetId = asString(body.asset_id);
  const inspectionEventId = asString(body.inspection_event_id);
  const calculationRunId = asString(body.calculation_run_id);
  const integrityStatus = asString(body.integrity_status) ?? 'watch';
  const decisionSummary = asString(body.decision_summary);
  const requiredAction = asString(body.required_action);
  const operatingLimitation = asString(body.operating_limitation);
  const dueDate = asString(body.due_date);

  if (!isUuid(assetId)) {
    validationError(res, 'asset_id', 'asset_id must be a valid UUID.');
    return;
  }

  if (inspectionEventId && !isUuid(inspectionEventId)) {
    validationError(res, 'inspection_event_id', 'inspection_event_id must be a valid UUID.');
    return;
  }

  if (!isUuid(calculationRunId)) {
    validationError(res, 'calculation_run_id', 'calculation_run_id must be a valid UUID.');
    return;
  }

  if (!['acceptable', 'watch', 'action_required', 'blocked', 'insufficient_data'].includes(integrityStatus)) {
    validationError(res, 'integrity_status', 'integrity_status must be acceptable, watch, action_required, blocked, or insufficient_data.');
    return;
  }

  if (!decisionSummary) {
    validationError(res, 'decision_summary', 'decision_summary is required.');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const calculationResult = await client.query<DbRow>('select * from calculation_runs where id = $1', [calculationRunId]);
    const calculation = calculationResult.rows[0];

    if (!calculation) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'CALCULATION_RUN_NOT_FOUND', message: 'Calculation run not found.' } });
      return;
    }

    if (String(calculation.asset_id) !== assetId) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'INTEGRITY_DECISION_ASSET_MISMATCH', message: 'Integrity decision asset must match calculation asset.' } });
      return;
    }

    if (!['approved', 'locked'].includes(String(calculation.approval_status))) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'CALCULATION_NOT_APPROVED', message: 'Approved calculation is required before integrity decision.' } });
      return;
    }

    const decisionCode = asString(body.decision_code) ?? `IDEC-${Date.now()}`;

    const result = await client.query<DbRow>(
      `insert into integrity_decisions(
        decision_code,
        asset_id,
        inspection_event_id,
        calculation_run_id,
        decision_type,
        integrity_status,
        decision_status,
        decision_summary,
        required_action,
        operating_limitation,
        due_date,
        created_by,
        reviewed_by,
        reviewed_at
      ) values ($1, $2, $3, $4, 'tank_integrity', $5, 'pending_review', $6, $7, $8, $9, $10, $10, now())
      returning *`,
      [
        decisionCode,
        assetId,
        inspectionEventId ?? null,
        calculationRunId,
        integrityStatus,
        decisionSummary,
        requiredAction ?? null,
        operatingLimitation ?? null,
        dueDate ?? null,
        actorUserId(req)
      ]
    );

    const created = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'INTEGRITY_DECISION_CREATED', 'integrity_decision', String(created?.id ?? ''), null, mapDecision(created ?? {}), {
      calculation_run_id: calculationRunId,
      human_created: true,
      ai_approved: false
    });

    await client.query('commit');
    res.status(201).json({ data: mapDecision(created ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

integrityDecisionsRouter.post('/integrity-decisions/:decisionId/approve', requirePermission('integrity_decision.approve'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  if (isAiAgent(req)) {
    res.status(403).json({ error: { code: 'AI_INTEGRITY_APPROVAL_BLOCKED', message: 'AI agents cannot approve integrity decisions.' } });
    return;
  }

  if (!isSeniorIntegrityActor(req)) {
    res.status(403).json({ error: { code: 'SENIOR_INTEGRITY_APPROVAL_REQUIRED', message: 'Integrity decision approval requires senior_engineer, lead_engineer, approver, or admin.' } });
    return;
  }

  const decisionId = req.params.decisionId;
  if (!isUuid(decisionId)) {
    validationError(res, 'decisionId', 'decisionId must be a valid UUID.');
    return;
  }

  const approvalComment = asString(req.body.approval_comment ?? req.body.comment);
  if (!approvalComment) {
    validationError(res, 'approval_comment', 'Integrity decision approval requires approval_comment.');
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const beforeResult = await client.query<DbRow>('select * from integrity_decisions where id = $1 for update', [decisionId]);
    const before = beforeResult.rows[0];

    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'INTEGRITY_DECISION_NOT_FOUND', message: 'Integrity decision not found.' } });
      return;
    }

    if (before.decision_status === 'approved') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'INTEGRITY_DECISION_ALREADY_APPROVED', message: 'Integrity decision is already approved.' } });
      return;
    }

    const evidenceCount = await countLinkedEvidence(client, 'integrity_decision', decisionId);
    await persistIntegrityDecisionApprovalGate(client, req, decisionId, evidenceCount > 0 ? 'pass' : 'fail', evidenceCount);

    if (evidenceCount === 0) {
      const auditLogId = await writeAudit(client, req, 'INTEGRITY_DECISION_APPROVAL_BLOCKED', 'integrity_decision', decisionId, mapDecision(before), mapDecision(before), {
        reason: 'direct_evidence_link_required',
        evidence_count: evidenceCount,
        ai_approved: false
      });
      await client.query('commit');
      res.status(409).json({
        error: {
          code: 'INTEGRITY_DECISION_EVIDENCE_REQUIRED',
          message: 'Integrity decision approval requires at least one direct evidence link.',
          auditLogId,
          gates: [
            {
              gate_type: 'evidence_linked',
              gate_status: 'fail',
              blocking: true,
              message: 'Integrity decision must have direct linked evidence before approval.',
              metadata: { evidence_count: evidenceCount, linked_entity_type: 'integrity_decision' }
            }
          ]
        }
      });
      return;
    }

    const result = await client.query<DbRow>(
      `update integrity_decisions
       set decision_status = 'approved',
           reviewed_by = coalesce(reviewed_by, $2),
           reviewed_at = coalesce(reviewed_at, now()),
           approved_by = $2,
           approved_at = now(),
           updated_at = now()
       where id = $1
       returning *`,
      [decisionId, actorUserId(req)]
    );

    const updated = result.rows[0];

    const auditLogId = await writeAudit(client, req, 'INTEGRITY_DECISION_APPROVED', 'integrity_decision', decisionId, mapDecision(before), mapDecision(updated ?? {}), {
      approval_comment: approvalComment,
      ai_approved: false
    });

    await client.query('commit');
    res.json({ data: mapDecision(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});


