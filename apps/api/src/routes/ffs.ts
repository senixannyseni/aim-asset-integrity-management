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
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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


async function loadCalculationRunByIdentifier(client: PoolClient, identifier: string): Promise<DbRow | undefined> {
  const result = isUuid(identifier)
    ? await client.query<DbRow>('select * from calculation_runs where id = $1::uuid limit 1', [identifier])
    : await client.query<DbRow>('select * from calculation_runs where run_id = $1 limit 1', [identifier]);
  return result.rows[0];
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


type FfsDispositionGate = {
  gate_type: string;
  gate_status: 'pass' | 'warning' | 'fail';
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

function ffsDispositionGate(
  gateType: string,
  pass: boolean,
  message: string,
  metadata: Record<string, unknown> = {},
  blocking = true,
  warningWhenFailed = false
): FfsDispositionGate {
  return {
    gate_type: gateType,
    gate_status: pass ? 'pass' : warningWhenFailed ? 'warning' : 'fail',
    blocking,
    message,
    metadata
  };
}

function ffsGateSummary(gates: FfsDispositionGate[]): Record<string, number> {
  return {
    total: gates.length,
    pass: gates.filter((gate) => gate.gate_status === 'pass').length,
    warning: gates.filter((gate) => gate.gate_status === 'warning').length,
    fail: gates.filter((gate) => gate.gate_status === 'fail').length,
    blocking: gates.filter((gate) => gate.blocking && gate.gate_status !== 'pass').length
  };
}

function mapFfsTraceRow(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.case_id ?? row.run_id ?? row.finding_code ?? row.report_code ?? row.work_order_code ?? row.review_code ?? row.approval_code ?? row.evidence_code,
    title: row.title ?? row.report_title ?? row.review_type ?? row.approval_type ?? row.original_filename ?? row.component ?? row.damage_mechanism,
    status: row.status ?? row.review_status ?? row.approval_status ?? row.report_status ?? row.validation_status,
    type: row.entity_type ?? row.source_entity_type ?? row.trigger_source ?? row.finding_type,
    severity: row.severity,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at,
    approved_at: row.approved_at,
    issued_at: row.issued_at,
    closed_at: row.closed_at
  };
}

function mapFfsEvidence(row: DbRow): Record<string, unknown> {
  return {
    evidence_file_id: row.evidence_file_id ?? row.id,
    evidence_code: row.evidence_code,
    original_filename: row.original_filename,
    file_type: row.file_type ?? row.file_extension,
    checksum_sha256: row.checksum_sha256,
    evidence_status: row.evidence_status ?? row.status,
    method: row.method,
    component: row.component,
    inspection_date: row.inspection_date,
    link_reason: row.link_reason,
    linked_entity_type: row.linked_entity_type,
    linked_entity_id: row.linked_entity_id,
    created_at: row.created_at
  };
}

function mapFfsAuditEvent(row: DbRow): Record<string, unknown> {
  return {
    audit_log_id: row.audit_log_id ?? row.id,
    event_type: row.event_type,
    actor_user_id: row.actor_user_id,
    actor_role_codes: row.actor_role_codes,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    created_at: row.created_at,
    metadata: row.metadata_json ?? row.metadata
  };
}

async function buildFfsDispositionReadiness(client: Queryable, ffsCase: DbRow): Promise<Record<string, unknown>> {
  const caseId = String(ffsCase.id);
  const assetId = String(ffsCase.asset_id);
  const calculationRunId = ffsCase.calculation_run_id ? String(ffsCase.calculation_run_id) : null;
  const inspectionEventId = ffsCase.inspection_event_id ? String(ffsCase.inspection_event_id) : null;

  const [assetResult, inspectionResult, calculationResult, evidenceResult, reviewResult, approvalResult, findingResult, reportResult, workOrderResult, auditResult] = await Promise.all([
    client.query<DbRow>('select * from assets where id = $1 limit 1', [assetId]),
    inspectionEventId
      ? client.query<DbRow>('select * from inspection_events where id = $1 limit 1', [inspectionEventId])
      : Promise.resolve({ rows: [], rowCount: 0 }),
    calculationRunId
      ? client.query<DbRow>('select * from calculation_runs where id = $1 limit 1', [calculationRunId])
      : Promise.resolve({ rows: [], rowCount: 0 }),
    client.query<DbRow>(
      `select el.evidence_file_id, el.link_reason, el.linked_entity_type, el.linked_entity_id, el.created_at,
              ef.evidence_code, ef.original_filename, ef.file_type, ef.file_extension, ef.checksum_sha256,
              ef.status as evidence_status, ef.method, ef.component, ef.inspection_date
       from evidence_links el
       left join evidence_files ef on ef.id = el.evidence_file_id
       where el.linked_entity_type = 'ffs_case'
         and el.linked_entity_id = $1
       order by el.created_at desc
       limit 50`,
      [caseId]
    ),
    client.query<DbRow>(
      `select * from engineering_reviews
       where entity_type = 'ffs_case'
         and entity_id = $1
       order by reviewed_at desc nulls last, created_at desc nulls last
       limit 25`,
      [caseId]
    ),
    client.query<DbRow>(
      `select * from approval_records
       where (entity_type = 'ffs_case' and entity_id = $1)
          or id = $2
       order by approved_at desc nulls last, created_at desc nulls last
       limit 25`,
      [caseId, ffsCase.approval_record_id ?? null]
    ),
    client.query<DbRow>(
      `select * from findings
       where asset_id = $1
         and (source_entity_id = $2 or status = 'linked_to_ffs_candidate' or calculation_run_id = $3)
       order by created_at desc
       limit 25`,
      [assetId, caseId, calculationRunId]
    ),
    client.query<DbRow>(
      `select * from reports
       where asset_id = $1
         and ($2::uuid is null or calculation_run_id = $2)
       order by created_at desc
       limit 25`,
      [assetId, calculationRunId]
    ),
    client.query<DbRow>(
      `select * from internal_work_orders
       where asset_id = $1
         and (source_entity_type = 'ffs_case' and source_entity_id = $2)
       order by created_at desc
       limit 25`,
      [assetId, caseId]
    ),
    client.query<DbRow>(
      `select * from audit_logs
       where (entity_type = 'ffs_case' and entity_id = $1)
          or (entity_type = 'calculation_run' and entity_id = $2)
       order by created_at desc
       limit 50`,
      [caseId, calculationRunId]
    )
  ]);

  const snapshotEvidenceIds = evidenceIdsFromLinks(ffsCase.evidence_links);
  const linkedEvidenceCount = evidenceResult.rows.length;
  const evidenceCount = linkedEvidenceCount + snapshotEvidenceIds.length;
  const reviewCompleted = reviewResult.rows.some((row) => row.review_status === 'reviewed' || row.review_status === 'approved');
  const approvedDisposition = approvalResult.rows.some((row) => row.approval_status === 'approved') || Boolean(ffsCase.approval_record_id);
  const closedWithDisposition = ffsCase.status === 'closed' && Boolean(asString(ffsCase.final_disposition));
  const triggerSource = asString(ffsCase.trigger_source) ?? 'unknown';
  const calculationTraceExpected = triggerSource === 'calculation_warning' || Boolean(calculationRunId);

  const gates: FfsDispositionGate[] = [
    ffsDispositionGate('ffs_case_recorded', true, 'FFS trigger case is recorded in AIM as a governance workflow case.', { case_id: ffsCase.case_id, status: ffsCase.status }),
    ffsDispositionGate(
      'trigger_context_present',
      Boolean(asString(ffsCase.trigger_reason)) && Boolean(asString(ffsCase.damage_mechanism)) && Boolean(asString(ffsCase.trigger_rule_id)),
      'Trigger reason, damage mechanism, and trigger rule are visible for engineering review.',
      { trigger_source: ffsCase.trigger_source, damage_mechanism: ffsCase.damage_mechanism, trigger_rule_id: ffsCase.trigger_rule_id }
    ),
    ffsDispositionGate(
      'supporting_evidence_linked',
      evidenceCount > 0,
      'Supporting evidence is linked to the FFS case or preserved in the trigger evidence snapshot.',
      { linked_evidence_count: linkedEvidenceCount, snapshot_evidence_count: snapshotEvidenceIds.length }
    ),
    ffsDispositionGate(
      'calculation_trigger_trace_visible',
      !calculationTraceExpected || calculationResult.rows.length > 0,
      'Calculation trigger trace is visible when the FFS case was created from deterministic calculation warnings.',
      { trigger_source: triggerSource, calculation_run_id: calculationRunId },
      false,
      true
    ),
    ffsDispositionGate(
      'engineering_review_trace_present',
      reviewCompleted || reviewResult.rows.length > 0,
      'Human engineering review trace is visible before final FFS disposition.',
      { review_count: reviewResult.rows.length }
    ),
    ffsDispositionGate(
      'final_disposition_approval_present',
      closedWithDisposition && approvedDisposition,
      'Senior engineer/admin final disposition approval is recorded when the case is closed.',
      { status: ffsCase.status, approval_count: approvalResult.rows.length, final_disposition_present: Boolean(asString(ffsCase.final_disposition)) },
      false,
      true
    ),
    ffsDispositionGate(
      'downstream_report_or_work_order_trace_visible',
      reportResult.rows.length + workOrderResult.rows.length > 0,
      'Downstream report or work-order traceability is visible when created from the FFS disposition.',
      { report_count: reportResult.rows.length, work_order_count: workOrderResult.rows.length },
      false,
      true
    ),
    ffsDispositionGate(
      'no_api_579_formula_execution',
      true,
      'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this FFS readiness endpoint.',
      { read_only: true, formula_execution: false },
      false
    ),
    ffsDispositionGate(
      'ai_n8n_finalization_absent',
      true,
      'AI, n8n, and service actors cannot approve final FFS disposition or declare fitness for service.',
      { ai_can_finalize: false, n8n_can_finalize: false, service_actor_can_finalize: false }
    )
  ];

  const summary = ffsGateSummary(gates);
  return {
    ffs_case_id: caseId,
    case_id: ffsCase.case_id,
    asset_id: assetId,
    inspection_event_id: inspectionEventId,
    calculation_run_id: calculationRunId,
    status: ffsCase.status,
    final_disposition_ready: summary.blocking === 0,
    final_disposition_recorded: closedWithDisposition && approvedDisposition,
    gate_summary: summary,
    ffs_case: mapFfsCase(ffsCase),
    readiness_gates: gates,
    evidence_traceability: {
      linked_evidence_count: linkedEvidenceCount,
      snapshot_evidence_ids: snapshotEvidenceIds,
      linked_evidence: evidenceResult.rows.map(mapFfsEvidence)
    },
    linked_context: {
      asset: assetResult.rows[0] ? mapFfsTraceRow(assetResult.rows[0]) : null,
      inspection_event: inspectionResult.rows[0] ? mapFfsTraceRow(inspectionResult.rows[0]) : null,
      calculation_run: calculationResult.rows[0] ? mapFfsTraceRow(calculationResult.rows[0]) : null,
      findings: findingResult.rows.map(mapFfsTraceRow),
      engineering_reviews: reviewResult.rows.map(mapFfsTraceRow),
      approval_records: approvalResult.rows.map(mapFfsTraceRow),
      reports: reportResult.rows.map(mapFfsTraceRow),
      work_orders: workOrderResult.rows.map(mapFfsTraceRow)
    },
    audit_events: auditResult.rows.map(mapFfsAuditEvent),
    governance_notes: [
      'RC4-S is a read-only FFS disposition readiness preview and detail workflow.',
      'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by the readiness endpoint.',
      'AIM remains the system of record; AI/n8n/service actors cannot approve final FFS disposition.'
    ]
  };
}

async function assetExists(client: Queryable, assetId: string): Promise<boolean> {
  const result = await client.query('select id from assets where id = $1 and deleted_at is null limit 1', [assetId]);
  return (result.rowCount ?? 0) > 0;
}


async function validateEvidenceFilesForAsset(
  client: Queryable,
  assetId: string,
  evidenceFileIds: string[]
): Promise<{ ok: true } | { ok: false; invalidIds: string[] }> {
  if (evidenceFileIds.length === 0) return { ok: true };
  const uniqueIds = [...new Set(evidenceFileIds)];
  const result = await client.query<{ id: string }>(
    `select id::text as id
     from evidence_files
     where id = any($1::uuid[])
       and asset_id = $2
       and status not in ('deleted','rejected')`,
    [uniqueIds, assetId]
  );
  const valid = new Set(result.rows.map((row) => row.id));
  const invalidIds = uniqueIds.filter((id) => !valid.has(id));
  return invalidIds.length === 0 ? { ok: true } : { ok: false, invalidIds };
}

function crossAssetEvidenceError(res: ApiResponse, invalidIds: string[]): void {
  res.status(400).json({
    error: {
      code: 'CROSS_ASSET_EVIDENCE_LINK_BLOCKED',
      message: 'FFS case evidence must belong to the same asset as the FFS case.',
      details: invalidIds.map((id) => ({
        field: 'evidence_links.evidence_file_id',
        message: `Evidence file ${id} does not belong to the FFS case asset or is not active.`,
        severity: 'blocking'
      }))
    }
  });
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


ffsRouter.get('/ffs/cases/:caseId/readiness', requirePermission('ffs.read'), async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    if (!caseId) {
      validationError(res, 'caseId', 'caseId is required.');
      return;
    }
    const ffsCase = await getFfsCase(pool, caseId);
    if (!ffsCase) {
      res.status(404).json({ error: { code: 'FFS_CASE_NOT_FOUND', message: 'FFS case not found.' } });
      return;
    }
    const readiness = await buildFfsDispositionReadiness(pool, ffsCase);
    res.json({ data: readiness });
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
    const manualEvidenceIds = evidenceIdsFromLinks(normalized.evidenceLinks);
    const evidenceValidation = await validateEvidenceFilesForAsset(client, normalized.assetId, manualEvidenceIds);
    if (!evidenceValidation.ok) {
      await client.query('rollback');
      crossAssetEvidenceError(res, evidenceValidation.invalidIds);
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
    const run = await loadCalculationRunByIdentifier(client, calculationRunId);
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
       order by input_name asc`,
      [run.id]
    );
    const evidenceLinks = inputResult.rows
      .map((input) => ({
        evidence_file_id: input.evidence_file_id,
        source_entity_id: input.source_entity_id,
        source_entity_type: 'ndt_measurement',
        source_calculation_run_id: run.id,
        input_name: input.input_name
      }))
      .filter((item) => item.evidence_file_id);
    const calculationEvidenceIds = evidenceIdsFromLinks(evidenceLinks);
    const calculationEvidenceValidation = await validateEvidenceFilesForAsset(client, String(run.asset_id), calculationEvidenceIds);
    if (!calculationEvidenceValidation.ok) {
      await client.query('rollback');
      crossAssetEvidenceError(res, calculationEvidenceValidation.invalidIds);
      return;
    }

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
        triggerMeasurements: inputResult.rows.map((input) => ({
          ...input,
          source_calculation_run_id: run.id,
          source_entity_type: 'ndt_measurement'
        })),
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

