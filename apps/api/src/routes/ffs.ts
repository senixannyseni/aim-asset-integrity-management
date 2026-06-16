import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import type { Role } from '../rbac/roles.js';

export const ffsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

const FFS_STATUSES = [
  'open',
  'under_review',
  'data_required',
  'assessment_in_progress',
  'accepted',
  'repair_required',
  'monitor',
  'closed'
] as const;

const DAMAGE_MECHANISMS = [
  'local_thin_area',
  'crack_like_indication',
  'dent_gouge',
  'severe_corrosion',
  'settlement_concern',
  'out_of_roundness',
  'brittle_fracture_concern',
  'thickness_below_screening',
  'engineering_review_required'
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function uuidOrNull(value: unknown): string | null {
  const text = asString(value);
  return isUuid(text) ? text : null;
}

function isStatus(value: string | undefined): value is typeof FFS_STATUSES[number] {
  return value !== undefined && (FFS_STATUSES as readonly string[]).includes(value);
}

function isDamageMechanism(value: string | undefined): value is typeof DAMAGE_MECHANISMS[number] {
  return value !== undefined && (DAMAGE_MECHANISMS as readonly string[]).includes(value);
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): Role[] {
  return req.user?.roles ?? [];
}

function hasSeniorAuthority(req: Request): boolean {
  const roles = actorRoles(req);
  return roles.includes('admin') || roles.includes('senior_engineer');
}

function rejectAiFinalAction(req: Request, res: ApiResponse): boolean {
  if (actorRoles(req).includes('ai_agent')) {
    res.status(403).json({
      error: {
        code: 'AI_AGENT_CANNOT_CLOSE_FFS',
        message: 'AI agents may not close FFS cases or approve final FFS dispositions.'
      }
    });
    return true;
  }
  return false;
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

async function resolveUserId(client: Queryable, req: Request): Promise<string | null> {
  const explicit = actorUserId(req);
  if (explicit) return explicit;
  const email = req.user?.email;
  if (!email) return null;
  const result = await client.query<{ id: string }>('select id from users where email = $1 and status = $2 limit 1', [email, 'active']);
  return result.rows[0]?.id ?? null;
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

function mapFfsCase(row: DbRow | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    id: row.id,
    case_id: row.case_id,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    calculation_run_id: row.calculation_run_id,
    component: row.component,
    damage_mechanism: row.damage_mechanism,
    trigger_source: row.trigger_source,
    trigger_reason: row.trigger_reason,
    trigger_rule_id: row.trigger_rule_id,
    severity: row.severity,
    evidence_links: row.evidence_links,
    trigger_measurements: row.trigger_measurements_json,
    required_next_action: row.required_next_action,
    assigned_engineer: row.assigned_engineer ?? row.owner_user_id,
    status: row.status,
    due_date: row.due_date,
    final_disposition: row.final_disposition,
    approval_record_id: row.approval_record_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getFfsCase(client: Queryable, caseId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>('select * from ffs_cases where id = $1 or case_id = $1 limit 1', [caseId]);
  return result.rows[0];
}

async function assetExists(client: Queryable, assetId: string): Promise<boolean> {
  const result = await client.query('select id from assets where id = $1 and deleted_at is null limit 1', [assetId]);
  return (result.rowCount ?? 0) > 0;
}

async function createEvidenceLinks(
  client: PoolClient,
  req: Request,
  ffsCaseId: string,
  evidenceFileIds: string[]
): Promise<void> {
  const linkedBy = await resolveUserId(client, req);
  for (const evidenceFileId of evidenceFileIds) {
    await client.query(
      `insert into evidence_links(evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
       values ($1, 'ffs_case', $2, 'FFS trigger supporting evidence', $3)
       on conflict do nothing`,
      [evidenceFileId, ffsCaseId, linkedBy]
    );
  }
}

function evidenceIdsFromLinks(value: unknown): string[] {
  return asArray(value)
    .map((item) => isPlainObject(item) ? uuidOrNull(item.evidence_file_id) : uuidOrNull(item))
    .filter((id): id is string => id !== null);
}

function nextCaseCode(): string {
  return `FFS-${Date.now()}`;
}

function defaultDueDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString().slice(0, 10);
}

async function loadTriggerRule(client: Queryable, ruleId: string | undefined, warningCode?: string): Promise<DbRow | undefined> {
  if (ruleId) {
    const byId = await client.query<DbRow>('select * from ffs_trigger_rules where rule_id = $1 and active_flag = true', [ruleId]);
    if (byId.rows[0]) return byId.rows[0];
  }
  if (warningCode) {
    const byWarning = await client.query<DbRow>(
      `select * from ffs_trigger_rules
       where active_flag = true and $1 = any(warning_codes)
       order by rule_id
       limit 1`,
      [warningCode]
    );
    return byWarning.rows[0];
  }
  return undefined;
}

function normalizeManualCaseBody(body: Record<string, unknown>): {
  assetId: string | undefined;
  component: string;
  damageMechanism: string | undefined;
  triggerSource: string;
  triggerReason: string | undefined;
  triggerRuleId: string;
  severity: string;
  evidenceLinks: unknown[];
  triggerMeasurements: unknown[];
  assignedEngineer: string | null;
  dueDate: string;
  requiredNextAction: string;
} {
  const damageMechanism = asString(body.damage_mechanism);
  const ruleId = asString(body.trigger_rule_id);
  return {
    assetId: asString(body.asset_id),
    component: asString(body.component) ?? 'unknown_component',
    damageMechanism: isDamageMechanism(damageMechanism) ? damageMechanism : undefined,
    triggerSource: asString(body.trigger_source) ?? 'manual_finding',
    triggerReason: asString(body.trigger_reason),
    triggerRuleId: ruleId ?? 'FFS-TRIG-THICKNESS-BELOW-SCREENING',
    severity: asString(body.severity) ?? 'warning',
    evidenceLinks: asArray(body.evidence_links),
    triggerMeasurements: asArray(body.supporting_measurements ?? body.trigger_measurements),
    assignedEngineer: uuidOrNull(body.assigned_engineer),
    dueDate: asString(body.due_date) ?? defaultDueDate(),
    requiredNextAction: asString(body.required_next_action) ?? 'Engineer review required. FFS trigger does not declare fitness for service.'
  };
}

async function insertFfsCase(
  client: PoolClient,
  req: Request,
  data: {
    caseId?: string;
    assetId: string;
    inspectionEventId?: string | null;
    calculationRunId?: string | null;
    component: string;
    damageMechanism: string;
    triggerSource: string;
    triggerReason: string;
    triggerRuleId: string;
    severity: string;
    evidenceLinks: unknown[];
    triggerMeasurements: unknown[];
    assignedEngineer?: string | null;
    dueDate?: string | null;
    requiredNextAction: string;
  }
): Promise<DbRow> {
  const actor = await resolveUserId(client, req);
  const result = await client.query<DbRow>(
    `insert into ffs_cases(
      case_id,
      asset_id,
      inspection_event_id,
      calculation_run_id,
      component,
      damage_mechanism,
      trigger_source,
      trigger_reason,
      trigger_rule_id,
      severity,
      evidence_links,
      trigger_measurements_json,
      assigned_engineer,
      owner_user_id,
      status,
      due_date,
      required_next_action,
      created_by,
      updated_by
    ) values (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11::jsonb, $12::jsonb, $13, $13,
      'open', $14, $15, $16, $16
    ) returning *`,
    [
      data.caseId ?? nextCaseCode(),
      data.assetId,
      data.inspectionEventId ?? null,
      data.calculationRunId ?? null,
      data.component,
      data.damageMechanism,
      data.triggerSource,
      data.triggerReason,
      data.triggerRuleId,
      data.severity,
      JSON.stringify(data.evidenceLinks),
      JSON.stringify(data.triggerMeasurements),
      data.assignedEngineer ?? null,
      data.dueDate ?? defaultDueDate(),
      data.requiredNextAction,
      actor
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('FFS_CASE_INSERT_FAILED');
  await createEvidenceLinks(client, req, String(row.id), evidenceIdsFromLinks(data.evidenceLinks));
  return row;
}

ffsRouter.get('/ffs/cases', requirePermission('ffs.read'), async (req, res, next) => {
  try {
    const values: unknown[] = [];
    const where: string[] = [];
    const assetId = asString(req.query.asset_id);
    const status = asString(req.query.status);
    if (assetId) {
      values.push(assetId);
      where.push(`asset_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }
    const result = await pool.query<DbRow>(
      `select * from ffs_cases
       ${where.length > 0 ? `where ${where.join(' and ')}` : ''}
       order by created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map((row) => mapFfsCase(row)) });
  } catch (error) {
    next(error);
  }
});

ffsRouter.get('/ffs/cases/:caseId', requirePermission('ffs.read'), async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    if (!caseId) {
      validationError(res, 'caseId', 'caseId is required.');
      return;
    }
    const result = await pool.query<DbRow>(
      `select fc.*, ar.approval_status, ar.approval_comment
       from ffs_cases fc
       left join approval_records ar on ar.id = fc.approval_record_id
       where fc.id = $1 or fc.case_id = $1
       limit 1`,
      [caseId]
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: { code: 'FFS_CASE_NOT_FOUND', message: 'FFS case not found.' } });
      return;
    }
    res.json({ data: mapFfsCase(row) });
  } catch (error) {
    next(error);
  }
});

ffsRouter.post('/ffs/cases', requirePermission('ffs.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const normalized = normalizeManualCaseBody(req.body);
  if (!normalized.assetId) {
    validationError(res, 'asset_id', 'asset_id is required.');
    return;
  }
  if (!normalized.triggerReason) {
    validationError(res, 'trigger_reason', 'trigger_reason is required.');
    return;
  }
  if (!normalized.damageMechanism) {
    validationError(res, 'damage_mechanism', `damage_mechanism must be one of ${DAMAGE_MECHANISMS.join(', ')}.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    if (!(await assetExists(client, normalized.assetId))) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found.' } });
      return;
    }
    const rule = await loadTriggerRule(client, normalized.triggerRuleId);
    const requiredNextAction = asString(rule?.required_next_action) ?? normalized.requiredNextAction;
    const severity = asString(rule?.default_severity) ?? normalized.severity;
    const created = await insertFfsCase(client, req, {
      assetId: normalized.assetId,
      component: normalized.component,
      damageMechanism: normalized.damageMechanism,
      triggerSource: normalized.triggerSource,
      triggerReason: normalized.triggerReason,
      triggerRuleId: normalized.triggerRuleId,
      severity,
      evidenceLinks: normalized.evidenceLinks,
      triggerMeasurements: normalized.triggerMeasurements,
      assignedEngineer: normalized.assignedEngineer,
      dueDate: normalized.dueDate,
      requiredNextAction
    });
    const auditLogId = await writeAudit(client, req, 'FFS_CASE_CREATED', 'ffs_case', String(created.id), null, mapFfsCase(created), {
      module: 'ffs_trigger_workflow',
      manual_create: true,
      does_not_declare_fitness: true
    });
    await client.query('commit');
    res.status(201).json({ data: mapFfsCase(created), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

ffsRouter.post('/ffs/cases/from-calculation', requirePermission('ffs.trigger'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const calculationRunId = asString(req.body.calculation_run_id);
  if (!calculationRunId) {
    validationError(res, 'calculation_run_id', 'calculation_run_id is required.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const runResult = await client.query<DbRow>('select * from calculation_runs where id = $1 or run_id = $1 limit 1', [calculationRunId]);
    const run = runResult.rows[0];
    if (!run) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'CALCULATION_RUN_NOT_FOUND', message: 'Calculation run not found.' } });
      return;
    }

    const warningResult = await client.query<DbRow>(
      `select * from calculation_outputs
       where calculation_run_id = $1
         and warning_code is not null
         and warning_code in (
          'FFS_TRIGGER_CANDIDATE',
          'BELOW_REQUIRED_THICKNESS',
          'LOW_REMAINING_LIFE',
          'HIGH_CORROSION_RATE',
          'LOCAL_THIN_AREA',
          'CRACK_LIKE_INDICATION',
          'DENT_GOUGE',
          'SEVERE_CORROSION',
          'SETTLEMENT_CONCERN',
          'OUT_OF_ROUNDNESS',
          'BRITTLE_FRACTURE_CONCERN'
         )
       order by created_at asc`,
      [run.id]
    );

    const inputResult = await client.query<DbRow>(
      `select source_entity_id, evidence_file_id, input_name, normalized_value, normalized_unit
       from calculation_inputs
       where calculation_run_id = $1
       order by created_at asc`,
      [run.id]
    );
    const evidenceLinks = inputResult.rows
      .map((input) => ({ evidence_file_id: input.evidence_file_id, source_entity_id: input.source_entity_id, input_name: input.input_name }))
      .filter((item) => item.evidence_file_id);

    const createdCases: Array<Record<string, unknown> | null> = [];
    for (const warning of warningResult.rows) {
      const warningCode = asString(warning.warning_code);
      const rule = await loadTriggerRule(client, asString(req.body.trigger_rule_id), warningCode);
      if (!rule) continue;
      const damageMechanism = asString(rule.damage_mechanism) ?? 'engineering_review_required';
      const reason = asString(warning.warning_message)
        ?? `Calculation warning ${warningCode ?? 'unknown'} created FFS trigger candidate.`;
      const already = await client.query(
        `select id from ffs_cases
         where calculation_run_id = $1
           and trigger_rule_id = $2
           and trigger_reason = $3
         limit 1`,
        [run.id, rule.rule_id, reason]
      );
      if ((already.rowCount ?? 0) > 0) continue;
      const created = await insertFfsCase(client, req, {
        assetId: String(run.asset_id),
        inspectionEventId: uuidOrNull(run.inspection_event_id),
        calculationRunId: String(run.id),
        component: asString(req.body.component) ?? 'shell',
        damageMechanism,
        triggerSource: 'calculation_warning',
        triggerReason: reason,
        triggerRuleId: String(rule.rule_id),
        severity: asString(rule.default_severity) ?? 'warning',
        evidenceLinks,
        triggerMeasurements: inputResult.rows,
        assignedEngineer: uuidOrNull(req.body.assigned_engineer),
        dueDate: asString(req.body.due_date) ?? defaultDueDate(),
        requiredNextAction: asString(rule.required_next_action) ?? 'Engineer review required. FFS trigger does not declare fitness for service.'
      });
      createdCases.push(mapFfsCase(created));
    }

    const auditLogId = await writeAudit(client, req, 'FFS_CASES_TRIGGERED_FROM_CALCULATION', 'calculation_run', String(run.id), null, createdCases, {
      module: 'ffs_trigger_workflow',
      created_count: createdCases.length,
      does_not_declare_fitness: true
    });
    await client.query('commit');
    res.status(201).json({ data: createdCases, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

ffsRouter.patch('/ffs/cases/:caseId/status', requirePermission('ffs.update'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const caseId = req.params.caseId;
  const status = asString(req.body.status);
  if (!caseId) {
    validationError(res, 'caseId', 'caseId is required.');
    return;
  }
  if (!isStatus(status) || status === 'closed') {
    validationError(res, 'status', 'status must be a valid non-closed FFS workflow status. Use close endpoint for final disposition.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await getFfsCase(client, caseId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FFS_CASE_NOT_FOUND', message: 'FFS case not found.' } });
      return;
    }
    const actor = await resolveUserId(client, req);
    const result = await client.query<DbRow>(
      `update ffs_cases
       set status = $2,
           assigned_engineer = coalesce($3, assigned_engineer),
           owner_user_id = coalesce($3, owner_user_id),
           due_date = coalesce($4, due_date),
           updated_by = $5,
           updated_at = now()
       where id = $1
       returning *`,
      [before.id, status, uuidOrNull(req.body.assigned_engineer), asString(req.body.due_date) ?? null, actor]
    );
    const after = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'FFS_CASE_STATUS_UPDATED', 'ffs_case', String(before.id), mapFfsCase(before), mapFfsCase(after), {
      module: 'ffs_trigger_workflow'
    });
    await client.query('commit');
    res.json({ data: mapFfsCase(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

ffsRouter.post('/ffs/cases/:caseId/close', requirePermission('ffs.approve'), async (req, res, next) => {
  if (rejectAiFinalAction(req, res)) return;
  if (!hasSeniorAuthority(req)) {
    res.status(403).json({ error: { code: 'SENIOR_ENGINEER_APPROVAL_REQUIRED', message: 'Final FFS disposition requires senior_engineer or admin authority.' } });
    return;
  }
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const caseId = req.params.caseId;
  const finalDisposition = asString(req.body.final_disposition);
  if (!caseId) {
    validationError(res, 'caseId', 'caseId is required.');
    return;
  }
  if (!finalDisposition) {
    validationError(res, 'final_disposition', 'final_disposition is required for senior engineer approval.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await getFfsCase(client, caseId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FFS_CASE_NOT_FOUND', message: 'FFS case not found.' } });
      return;
    }
    if (before.status === 'closed') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'FFS_CASE_ALREADY_CLOSED', message: 'FFS case is already closed.' } });
      return;
    }
    const approverId = await resolveUserId(client, req);
    if (!approverId) {
      await client.query('rollback');
      res.status(400).json({ error: { code: 'APPROVER_USER_REQUIRED', message: 'A valid senior engineer/admin user is required for final FFS disposition.' } });
      return;
    }
    const approval = await client.query<{ id: string }>(
      `insert into approval_records(entity_type, entity_id, approval_status, approver_id, approval_comment)
       values ('ffs_case', $1, 'approved', $2, $3)
       returning id`,
      [before.id, approverId, asString(req.body.approval_comment) ?? 'Senior engineer final FFS disposition approval.']
    );
    const result = await client.query<DbRow>(
      `update ffs_cases
       set status = 'closed',
           final_disposition = $2,
           approval_record_id = $3,
           updated_by = $4,
           updated_at = now()
       where id = $1
       returning *`,
      [before.id, finalDisposition, approval.rows[0]?.id, approverId]
    );
    const after = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'FFS_CASE_FINAL_DISPOSITION_APPROVED', 'ffs_case', String(before.id), mapFfsCase(before), mapFfsCase(after), {
      module: 'ffs_trigger_workflow',
      approval_record_id: approval.rows[0]?.id,
      does_not_backfill_engineering_calculation: true
    });
    await client.query('commit');
    res.json({ data: mapFfsCase(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
