import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import type { Role } from '../rbac/roles.js';

export const rbiRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

const RBI_STATUSES = [
  'open',
  'under_review',
  'data_required',
  'assessment_in_progress',
  'ready_for_review',
  'approved',
  'exported',
  'closed'
] as const;

type RbiStatus = typeof RBI_STATUSES[number];

type RbiEvidenceLinkInput = {
  evidence_file_id: string;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  source_calculation_run_id?: string | null;
};

type RbiCaseInput = {
  caseId?: string;
  assetId: string;
  inspectionEventId?: string | null;
  calculationRunId?: string | null;
  system: string;
  component: string;
  damageMechanism: string;
  probabilityDriver: string;
  consequenceDriver: string;
  riskCategory: string;
  recommendedInterval: string;
  inspectionPlanReference: string;
  evidenceLinks: RbiEvidenceLinkInput[];
  inputPlaceholders: Record<string, unknown>;
  triggerSource: string;
  triggerReason: string;
  triggerRuleId: string;
  reviewer?: string | null;
  approver?: string | null;
  status?: RbiStatus;
};

type NormalizedRbiCaseInput = Omit<RbiCaseInput, 'assetId' | 'status'> & {
  assetId: string | undefined;
  status: string;
};

const TRIGGER_WARNING_CODES = new Set([
  'HIGH_CORROSION_RATE',
  'LOW_REMAINING_LIFE',
  'RBI_TRIGGER_CANDIDATE',
  'REPEATED_ANOMALY',
  'MISSING_EVIDENCE'
]);

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

function rejectAiApproval(req: Request, res: ApiResponse): boolean {
  if (actorRoles(req).includes('ai_agent')) {
    res.status(403).json({
      error: {
        code: 'AI_AGENT_CANNOT_APPROVE_RBI',
        message: 'AI agents may not approve, export, close, or finalize RBI cases.'
      }
    });
    return true;
  }
  return false;
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

function normalizeEvidenceLinks(raw: unknown): RbiEvidenceLinkInput[] {
  const items = Array.isArray(raw) ? raw : [];

  return items.flatMap((item) => {
    if (!isPlainObject(item)) return [];

    const evidenceFileId = asString(item.evidence_file_id ?? item.evidenceFileId);
    if (!evidenceFileId) return [];

    return [
      {
        evidence_file_id: evidenceFileId,
        source_entity_type: asString(item.source_entity_type ?? item.sourceEntityType) ?? null,
        source_entity_id: asString(item.source_entity_id ?? item.sourceEntityId) ?? null,
        source_calculation_run_id: asString(item.source_calculation_run_id ?? item.sourceCalculationRunId) ?? null
      }
    ];
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

function mapRbiCase(row: DbRow | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    id: row.id,
    case_id: row.case_id,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    calculation_run_id: row.calculation_run_id,
    system: row.system,
    component: row.component,
    damage_mechanism: row.damage_mechanism,
    probability_driver: row.probability_driver,
    consequence_driver: row.consequence_driver,
    risk_category: row.risk_category,
    recommended_interval: row.recommended_interval,
    inspection_plan_reference: row.inspection_plan_reference,
    evidence_links: row.evidence_links,
    input_placeholders: row.input_placeholders,
    trigger_source: row.trigger_source,
    trigger_reason: row.trigger_reason,
    trigger_rule_id: row.trigger_rule_id,
    calculation_basis: row.calculation_basis,
    calculation_basis_note: row.calculation_basis_note,
    status: row.status,
    reviewer: row.reviewer,
    approver: row.approver,
    reviewed_at: row.reviewed_at,
    approved_at: row.approved_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function assetExists(client: Queryable, assetId: string): Promise<boolean> {
  const result = await client.query('select id from assets where id = $1 and deleted_at is null limit 1', [assetId]);
  return (result.rowCount ?? 0) > 0;
}

function evidenceIdsFromLinks(links: RbiEvidenceLinkInput[]): string[] {
  return links
    .map((link) => link.evidence_file_id)
    .filter((id): id is string => Boolean(id));
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
      message: 'RBI case evidence must belong to the same asset as the RBI case.',
      details: invalidIds.map((id) => ({
        field: 'evidence_links.evidence_file_id',
        message: `Evidence file ${id} does not belong to the RBI case asset or is not active.`,
        severity: 'blocking'
      }))
    }
  });
}

async function createEvidenceLinks(
  client: PoolClient,
  req: Request,
  rbiCaseId: string,
  evidenceFileIds: string[]
): Promise<void> {
  const linkedBy = await resolveUserId(client, req);
  for (const evidenceFileId of evidenceFileIds) {
    await client.query(
      `insert into evidence_links(evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
       values ($1, 'rbi_case', $2, 'RBI interface supporting evidence', $3)
       on conflict do nothing`,
      [evidenceFileId, rbiCaseId, linkedBy]
    );
  }
}

function nextCaseCode(): string {
  return `RBI-${Date.now()}`;
}

function defaultInputPlaceholders(body: Record<string, unknown>): Record<string, unknown> {
  const supplied = isPlainObject(body.input_placeholders) ? body.input_placeholders : {};
  return {
    consequence_of_failure: supplied.consequence_of_failure ?? body.consequence_of_failure ?? 'placeholder_required',
    probability_of_failure: supplied.probability_of_failure ?? body.probability_of_failure ?? 'placeholder_required',
    damage_mechanism: supplied.damage_mechanism ?? body.damage_mechanism ?? 'engineering_review_required',
    inspection_effectiveness: supplied.inspection_effectiveness ?? body.inspection_effectiveness ?? 'placeholder_required',
    fluid_service: supplied.fluid_service ?? body.fluid_service ?? 'placeholder_required',
    inventory: supplied.inventory ?? body.inventory ?? 'placeholder_required',
    operating_severity: supplied.operating_severity ?? body.operating_severity ?? 'placeholder_required',
    mitigation_controls: supplied.mitigation_controls ?? body.mitigation_controls ?? 'placeholder_required',
    calculation_basis: 'qualitative_or_semi_quantitative_placeholder_only_no_api_581_rules'
  };
}

function normalizeManualBody(body: Record<string, unknown>): NormalizedRbiCaseInput {
  const placeholders = defaultInputPlaceholders(body);
  const rawEvidenceLinks = Array.isArray(body.evidence_links)
    ? body.evidence_links
    : Array.isArray(body.evidenceLinks)
      ? body.evidenceLinks
      : [];
  const evidenceLinks: RbiEvidenceLinkInput[] = rawEvidenceLinks
    .filter(isPlainObject)
    .map((link) => ({
      evidence_file_id: uuidOrNull(link.evidence_file_id ?? link.evidenceFileId) ?? '',
      source_entity_type: asString(link.source_entity_type ?? link.sourceEntityType) ?? null,
      source_entity_id: uuidOrNull(link.source_entity_id ?? link.sourceEntityId) ?? asString(link.source_entity_id ?? link.sourceEntityId) ?? null,
      source_calculation_run_id: uuidOrNull(link.source_calculation_run_id ?? link.sourceCalculationRunId) ?? null
    }))
    .filter((link) => Boolean(link.evidence_file_id));

  return {
    assetId: asString(body.asset_id),
    inspectionEventId: uuidOrNull(body.inspection_event_id),
    calculationRunId: uuidOrNull(body.calculation_run_id),
    system: asString(body.system) ?? 'tank_integrity',
    component: asString(body.component) ?? 'unknown_component',
    damageMechanism: asString(body.damage_mechanism) ?? String(placeholders.damage_mechanism ?? 'engineering_review_required'),
    probabilityDriver: asString(body.probability_driver) ?? 'engineering_review_placeholder',
    consequenceDriver: asString(body.consequence_driver) ?? 'consequence_placeholder_required',
    riskCategory: asString(body.risk_category) ?? 'screening_required',
    recommendedInterval: asString(body.recommended_interval) ?? 'engineer_review_required',
    inspectionPlanReference: asString(body.inspection_plan_reference) ?? 'not_assigned',
    evidenceLinks,
    status: asString(body.status) ?? 'open',
    reviewer: uuidOrNull(body.reviewer),
    approver: uuidOrNull(body.approver),
    triggerSource: asString(body.trigger_source) ?? 'engineering_review',
    triggerReason: asString(body.trigger_reason) ?? 'Manual RBI interface case created for engineering review.',
    triggerRuleId: asString(body.trigger_rule_id) ?? 'RBI-TRIG-ENGINEERING-REVIEW',
    inputPlaceholders: placeholders
  };
}

function isStatus(value: string | undefined): value is RbiStatus {
  return value !== undefined && (RBI_STATUSES as readonly string[]).includes(value);
}

async function loadTriggerRule(client: Queryable, ruleId: string | undefined, warningCode?: string): Promise<DbRow | undefined> {
  if (ruleId) {
    const byId = await client.query<DbRow>('select * from rbi_trigger_rules where rule_id = $1 and active_flag = true', [ruleId]);
    if (byId.rows[0]) return byId.rows[0];
  }
  if (warningCode) {
    const byWarning = await client.query<DbRow>(
      `select * from rbi_trigger_rules
       where active_flag = true and $1 = any(warning_codes)
       order by rule_id
       limit 1`,
      [warningCode]
    );
    return byWarning.rows[0];
  }
  return undefined;
}

async function insertRbiCase(
  client: PoolClient,
  req: Request,
  data: RbiCaseInput
): Promise<DbRow> {
  const actor = await resolveUserId(client, req);
  const result = await client.query<DbRow>(
    `insert into rbi_cases(
      case_id,
      asset_id,
      inspection_event_id,
      calculation_run_id,
      system,
      component,
      damage_mechanism,
      probability_driver,
      consequence_driver,
      risk_category,
      recommended_interval,
      inspection_plan_reference,
      evidence_links,
      input_placeholders,
      trigger_source,
      trigger_reason,
      trigger_rule_id,
      calculation_basis,
      calculation_basis_note,
      reviewer,
      approver,
      status,
      created_by,
      updated_by
    ) values (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13::jsonb, $14::jsonb, $15,
      $16, $17, 'qualitative_or_semi_quantitative_placeholder_only',
      'RBI interface only. Quantitative API RP 581 rules are not implemented unless approved Formula Registry rules are supplied.',
      $18, $19, $20, $21, $21
    ) returning *`,
    [
      data.caseId ?? nextCaseCode(),
      data.assetId,
      data.inspectionEventId ?? null,
      data.calculationRunId ?? null,
      data.system,
      data.component,
      data.damageMechanism,
      data.probabilityDriver,
      data.consequenceDriver,
      data.riskCategory,
      data.recommendedInterval,
      data.inspectionPlanReference,
      JSON.stringify(data.evidenceLinks),
      JSON.stringify(data.inputPlaceholders),
      data.triggerSource,
      data.triggerReason,
      data.triggerRuleId,
      data.reviewer ?? null,
      data.approver ?? null,
      data.status ?? 'open',
      actor
    ]
  );
  const row = result.rows[0];
  if (!row) throw new Error('RBI_CASE_INSERT_FAILED');
  await createEvidenceLinks(client, req, String(row.id), evidenceIdsFromLinks(data.evidenceLinks));
  return row;
}

rbiRouter.get('/rbi/cases', requirePermission('rbi.interface.read'), async (req, res, next) => {
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
      `select * from rbi_cases
       ${where.length > 0 ? `where ${where.join(' and ')}` : ''}
       order by created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapRbiCase) });
  } catch (error) {
    next(error);
  }
});

rbiRouter.get('/rbi/cases/:caseId', requirePermission('rbi.interface.read'), async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    if (!caseId) {
      validationError(res, 'caseId', 'caseId is required.');
      return;
    }
    const result = await pool.query<DbRow>('select * from rbi_cases where id = $1 or case_id = $1 limit 1', [caseId]);
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: { code: 'RBI_CASE_NOT_FOUND', message: 'RBI case not found.' } });
      return;
    }
    res.json({ data: mapRbiCase(row) });
  } catch (error) {
    next(error);
  }
});

rbiRouter.post('/rbi/cases', requirePermission('rbi.interface.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const normalized = normalizeManualBody(req.body);
  if (!normalized.assetId) {
    validationError(res, 'asset_id', 'asset_id is required.');
    return;
  }
  if (!isStatus(normalized.status)) {
    validationError(res, 'status', `status must be one of ${RBI_STATUSES.join(', ')}.`);
    return;
  }
  if (['approved', 'exported', 'closed'].includes(normalized.status)) {
    validationError(res, 'status', 'Use the RBI approval endpoint for approved/exported/closed workflow states.', 'RBI_APPROVAL_ENDPOINT_REQUIRED');
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
    const evidenceIds = evidenceIdsFromLinks(normalized.evidenceLinks);
    const evidenceValidation = await validateEvidenceFilesForAsset(client, normalized.assetId, evidenceIds);
    if (!evidenceValidation.ok) {
      await client.query('rollback');
      crossAssetEvidenceError(res, evidenceValidation.invalidIds);
      return;
    }
    const caseInput: RbiCaseInput = {
      ...normalized,
      assetId: normalized.assetId,
      status: normalized.status
    };
    const created = await insertRbiCase(client, req, caseInput);
    const auditLogId = await writeAudit(client, req, 'RBI_CASE_CREATED', 'rbi_case', String(created.id), null, mapRbiCase(created), {
      module: 'rbi_interface_trigger_workflow',
      manual_create: true,
      quantitative_api_581_not_implemented: true
    });
    await client.query('commit');
    res.status(201).json({ data: mapRbiCase(created), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

function warningCodesFromRows(rows: DbRow[]): string[] {
  return rows
    .map((row) => asString(row.warning_code))
    .filter((code): code is string => Boolean(code && TRIGGER_WARNING_CODES.has(code)));
}

function riskCategoryFromWarnings(warningCodes: string[], rule: DbRow | undefined): string {
  if (rule && asString(rule.default_risk_category)) return String(rule.default_risk_category);
  if (warningCodes.includes('LOW_REMAINING_LIFE')) return 'high';
  if (warningCodes.includes('HIGH_CORROSION_RATE')) return 'medium_high';
  if (warningCodes.includes('REPEATED_ANOMALY')) return 'medium';
  return 'screening_required';
}

rbiRouter.post('/rbi/cases/from-calculation', requirePermission('rbi.interface.create'), async (req, res, next) => {
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

    const runAssetId = asString(run.asset_id);
    if (!runAssetId) {
      await client.query('rollback');
      res.status(400).json({
        error: {
          code: 'CALCULATION_RUN_ASSET_REQUIRED',
          message: 'Calculation run must have asset_id before creating an RBI case.'
        }
      });
      return;
    }

    const outputResult = await client.query<DbRow>(
      `select * from calculation_outputs
       where calculation_run_id = $1
         and warning_code is not null
       order by input_name asc`,
      [run.id]
    );
    const warningCodes = warningCodesFromRows(outputResult.rows);
    if (warningCodes.length === 0) {
      await client.query('rollback');
      res.status(400).json({
        error: {
          code: 'NO_RBI_TRIGGER_WARNING_FOUND',
          message: 'Calculation run does not contain configured RBI trigger warnings.'
        }
      });
      return;
    }
    const primaryWarning = warningCodes.includes('RBI_TRIGGER_CANDIDATE') ? 'RBI_TRIGGER_CANDIDATE' : warningCodes[0];
    const rule = await loadTriggerRule(client, asString(req.body.trigger_rule_id), primaryWarning);
    const inputResult = await client.query<DbRow>(
      `select source_entity_type, source_entity_id, evidence_file_id
       from calculation_inputs
       where calculation_run_id = $1
         and (source_entity_id is not null or evidence_file_id is not null)
       order by created_at
       limit 25`,
      [run.id]
    );
    const evidenceLinks: RbiEvidenceLinkInput[] = inputResult.rows.flatMap((row) => {
  const evidenceFileId = uuidOrNull(row.evidence_file_id);
  if (!evidenceFileId) return [];

  return [
    {
      evidence_file_id: evidenceFileId,
      source_entity_type: asString(row.source_entity_type) ?? null,
      source_entity_id: uuidOrNull(row.source_entity_id) ?? asString(row.source_entity_id) ?? null,
      source_calculation_run_id: String(run.id)
    }
  ];
});

    const created = await insertRbiCase(client, req, {
      assetId: runAssetId,
      inspectionEventId: uuidOrNull(run.inspection_event_id),
      calculationRunId: String(run.id),
      system: asString(req.body.system) ?? 'tank_integrity',
      component: asString(req.body.component) ?? 'shell',
      damageMechanism: asString(req.body.damage_mechanism) ?? 'corrosion_screening',
      probabilityDriver: asString(rule?.probability_driver) ?? 'calculation_warning_screening',
      consequenceDriver: asString(rule?.consequence_driver) ?? 'consequence_placeholder_required',
      riskCategory: riskCategoryFromWarnings(warningCodes, rule),
      recommendedInterval: asString(rule?.recommended_interval) ?? 'engineer_review_required',
      inspectionPlanReference: asString(rule?.inspection_plan_reference) ?? 'update_inspection_plan_after_rbi_review',
      evidenceLinks,
      inputPlaceholders: {
        consequence_of_failure: 'placeholder_required',
        probability_of_failure: warningCodes,
        damage_mechanism: asString(req.body.damage_mechanism) ?? 'corrosion_screening',
        inspection_effectiveness: 'placeholder_required',
        fluid_service: 'from_asset_or_user_input_required',
        inventory: 'placeholder_required',
        operating_severity: 'placeholder_required',
        mitigation_controls: 'placeholder_required',
        calculation_basis: 'qualitative_placeholder_only_from_calculation_warning',
        source_calculation_run_id: run.id,
        source_warning_codes: warningCodes,
        source_measurements: inputResult.rows
      },
      triggerSource: 'calculation_warning',
      triggerReason: `RBI trigger candidate from calculation warnings: ${warningCodes.join(', ')}`,
      triggerRuleId: asString(rule?.rule_id) ?? 'RBI-TRIG-ENGINEERING-REVIEW',
      status: 'open'
    });
    const auditLogId = await writeAudit(client, req, 'RBI_CASE_CREATED_FROM_CALCULATION', 'rbi_case', String(created.id), null, mapRbiCase(created), {
      module: 'rbi_interface_trigger_workflow',
      calculation_run_id: run.id,
      warning_codes: warningCodes,
      quantitative_api_581_not_implemented: true
    });
    await client.query('commit');
    res.status(201).json({ data: mapRbiCase(created), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

rbiRouter.patch('/rbi/cases/:caseId/status', requirePermission('rbi.interface.update'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const caseId = req.params.caseId;
  const nextStatus = asString(req.body.status);
  if (!caseId || !nextStatus || !isStatus(nextStatus)) {
    validationError(res, 'status', `status must be one of ${RBI_STATUSES.join(', ')}.`);
    return;
  }
  if (['approved', 'exported', 'closed'].includes(nextStatus)) {
    res.status(400).json({
      error: {
        code: 'RBI_APPROVAL_ENDPOINT_REQUIRED',
        message: 'Use the RBI approval endpoint for approved/exported/closed disposition states.'
      }
    });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from rbi_cases where id = $1 or case_id = $1 limit 1', [caseId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'RBI_CASE_NOT_FOUND', message: 'RBI case not found.' } });
      return;
    }
    const reviewer = await resolveUserId(client, req);
    const result = await client.query<DbRow>(
      `update rbi_cases
       set status = $2,
           reviewer = coalesce(reviewer, $3),
           reviewed_at = coalesce(reviewed_at, now()),
           updated_by = $3,
           updated_at = now()
       where id = $1
       returning *`,
      [before.id, nextStatus, reviewer]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'RBI_CASE_STATUS_UPDATED', 'rbi_case', String(updated?.id ?? before.id), mapRbiCase(before), mapRbiCase(updated), {
      module: 'rbi_interface_trigger_workflow'
    });
    await client.query('commit');
    res.json({ data: mapRbiCase(updated), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

rbiRouter.post('/rbi/cases/:caseId/approve', requirePermission('rbi.interface.approve'), async (req, res, next) => {
  if (rejectAiApproval(req, res)) return;
  if (!hasSeniorAuthority(req)) {
    res.status(403).json({
      error: {
        code: 'RBI_APPROVAL_REQUIRES_SENIOR_ENGINEER',
        message: 'RBI interface approval/export requires senior_engineer or admin role.'
      }
    });
    return;
  }
  const caseId = req.params.caseId;
  if (!caseId) {
    validationError(res, 'caseId', 'caseId is required.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from rbi_cases where id = $1 or case_id = $1 limit 1', [caseId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'RBI_CASE_NOT_FOUND', message: 'RBI case not found.' } });
      return;
    }
    const approver = await resolveUserId(client, req);
    const requestedStatus = asString(isPlainObject(req.body) ? req.body.status : undefined) ?? 'approved';
    const finalStatus = ['approved', 'exported', 'closed'].includes(requestedStatus) ? requestedStatus : 'approved';
    const result = await client.query<DbRow>(
      `update rbi_cases
       set status = $2,
           approver = $3,
           approved_at = now(),
           updated_by = $3,
           updated_at = now()
       where id = $1
       returning *`,
      [before.id, finalStatus, approver]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'RBI_CASE_APPROVED', 'rbi_case', String(updated?.id ?? before.id), mapRbiCase(before), mapRbiCase(updated), {
      module: 'rbi_interface_trigger_workflow',
      quantitative_api_581_not_implemented: true
    });
    await client.query('commit');
    res.json({ data: mapRbiCase(updated), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
