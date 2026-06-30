import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest } from '../modules/tenancy/tenant-scope.js';
import { hasPermission } from '../rbac/roles.js';

function canCloseFinding(req: Request): boolean {
  return Boolean(
    req.user?.permissions?.includes('finding.close') ||
      hasPermission(req.user?.roles ?? [], 'finding.close')
  );
}


export const findingsRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;
type Queryable = { query<T extends DbRow = DbRow>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }> };
type ValidationIssue = { field: string; message: string; severity: 'error' | 'warning' };

const FINDING_TYPES = [
  'corrosion',
  'wall_loss',
  'pitting',
  'crack',
  'deformation',
  'settlement',
  'coating_defect',
  'weld_defect',
  'nozzle_issue',
  'roof_issue',
  'floor_issue',
  'documentation_gap',
  'data_quality_issue',
  'other'
] as const;

const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'under_review', 'disposition_required', 'linked_to_ffs_candidate', 'linked_to_rbi_candidate', 'resolved', 'closed', 'rejected_duplicate'] as const;
const SOURCE_TYPES = ['manual', 'evidence_review', 'ndt_measurement', 'calculation_warning', 'validation_warning', 'inspection_report'] as const;
const SERVICE_CLOSURE_BLOCKED_ROLES = ['ai_agent', 'n8n_service', 'service_account', 'workflow_service', 'integration_service', 'system_service'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function nullIfEmpty(value: unknown): string | null {
  return asString(value) ?? null;
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function isServiceActor(req: Request): boolean {
  return actorRoles(req).some((role) => SERVICE_CLOSURE_BLOCKED_ROLES.includes(role));
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

function ensureBody(req: Request, res: ApiResponse): Record<string, unknown> | undefined {
  if (!isPlainObject(req.body)) {
    validationError(res, [{ field: 'body', message: 'JSON object body is required.', severity: 'error' }]);
    return undefined;
  }
  return req.body;
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
  const tenant = requireTenantContextFromRequest(req);
  const result = await client.query<{ id: string }>(
    `insert into audit_logs(
      tenant_id,
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
    returning id`,
    [
      tenant.tenantId,
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

function mapFinding(row: DbRow): Record<string, unknown> {
  return {
    finding_id: row.id,
    finding_code: row.finding_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    title: row.title,
    description: row.description,
    finding_type: row.finding_type,
    component: row.component,
    shell_course_no: row.shell_course_no,
    cml_tml_id: row.cml_tml_id,
    grid_ref: row.grid_ref,
    elevation: row.elevation,
    orientation: row.orientation,
    severity: row.severity,
    status: row.status,
    source_type: row.source_type,
    source_entity_id: row.source_entity_id,
    evidence_file_id: row.evidence_file_id,
    ndt_measurement_id: row.ndt_measurement_id,
    calculation_run_id: row.calculation_run_id,
    validation_run_id: row.validation_run_id,
    identified_by: row.identified_by,
    identified_at: row.identified_at,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    closed_by: row.closed_by,
    closed_at: row.closed_at,
    closure_reason: row.closure_reason,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset_tag: row.asset_tag ?? null,
    asset_name: row.asset_name ?? null,
    evidence_code: row.evidence_code ?? null,
    evidence_file_name: row.evidence_file_name ?? row.file_name ?? null,
    ndt_measurement_code: row.measurement_code ?? null,
    calculation_run_code: row.run_id ?? null,
    linkage_status: {
      has_evidence: Boolean(row.evidence_file_id),
      has_ndt: Boolean(row.ndt_measurement_id),
      has_calculation: Boolean(row.calculation_run_id),
      missing_evidence: !row.evidence_file_id,
      critical_missing_evidence: row.severity === 'critical' && !row.evidence_file_id
    }
  };
}

async function nextFindingCode(client: PoolClient, tenantId: string): Promise<string> {
  const result = await client.query<{ count: string }>('select count(*)::text as count from findings where tenant_id = $1::uuid', [tenantId]);
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `FND-${String(next).padStart(6, '0')}`;
}

function validateFindingInput(body: Record<string, unknown>, partial = false): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const assetId = asString(body.asset_id);
  const title = asString(body.title);
  const findingType = asString(body.finding_type);
  const severity = asString(body.severity);
  const status = asString(body.status);
  const sourceType = asString(body.source_type);
  const shellCourseNo = asInteger(body.shell_course_no);

  if (!partial || body.asset_id !== undefined) {
    if (!assetId) issues.push({ field: 'asset_id', message: 'asset_id is required.', severity: 'error' });
  }
  if (!partial || body.title !== undefined) {
    if (!title) issues.push({ field: 'title', message: 'title is required.', severity: 'error' });
  }
  if (!partial || body.finding_type !== undefined) {
    if (!findingType) issues.push({ field: 'finding_type', message: 'finding_type is required.', severity: 'error' });
    if (findingType && !(FINDING_TYPES as readonly string[]).includes(findingType)) issues.push({ field: 'finding_type', message: `finding_type must be one of: ${FINDING_TYPES.join(', ')}.`, severity: 'error' });
  }
  if (!partial || body.severity !== undefined) {
    if (!severity) issues.push({ field: 'severity', message: 'severity is required.', severity: 'error' });
    if (severity && !(SEVERITIES as readonly string[]).includes(severity)) issues.push({ field: 'severity', message: `severity must be one of: ${SEVERITIES.join(', ')}.`, severity: 'error' });
  }
  if (status && !(STATUSES as readonly string[]).includes(status)) issues.push({ field: 'status', message: `status must be one of: ${STATUSES.join(', ')}.`, severity: 'error' });
  if (sourceType && !(SOURCE_TYPES as readonly string[]).includes(sourceType)) issues.push({ field: 'source_type', message: `source_type must be one of: ${SOURCE_TYPES.join(', ')}.`, severity: 'error' });
  if (body.shell_course_no !== undefined && body.shell_course_no !== null && body.shell_course_no !== '' && (shellCourseNo === undefined || shellCourseNo <= 0)) {
    issues.push({ field: 'shell_course_no', message: 'shell_course_no must be a positive integer when provided.', severity: 'error' });
  }

  return issues;
}

async function loadFinding(client: Queryable, findingId: string, tenantId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>(
    `select f.*, a.asset_tag, a.asset_name,
            ef.evidence_code, ef.file_name as evidence_file_name,
            nm.measurement_code,
            cr.run_id
     from findings f
     left join assets a on a.id = f.asset_id and a.tenant_id = $2::uuid
     left join evidence_files ef on ef.id = f.evidence_file_id and ef.tenant_id = $2::uuid
     left join ndt_measurements nm on nm.id = f.ndt_measurement_id and nm.tenant_id = $2::uuid
     left join calculation_runs cr on cr.id = f.calculation_run_id and cr.tenant_id = $2::uuid
     where f.id = $1 and f.tenant_id = $2::uuid`,
    [findingId, tenantId]
  );
  return result.rows[0];
}

async function assertAssetExists(client: PoolClient, assetId: string, tenantId: string): Promise<void> {
  const result = await client.query('select id from assets where id = $1 and tenant_id = $2::uuid and deleted_at is null', [assetId, tenantId]);
  if (result.rowCount === 0) {
    const error = new Error('ASSET_NOT_FOUND');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
}

async function assertInspectionEventLink(client: PoolClient, assetId: string, inspectionEventId: string, tenantId: string): Promise<void> {
  const result = await client.query('select id from inspection_events where id = $1 and asset_id = $2 and tenant_id = $3::uuid', [inspectionEventId, assetId, tenantId]);
  if (result.rowCount === 0) {
    const error = new Error('INSPECTION_LINK_TARGET_NOT_FOUND');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
}

async function assertSameAssetLink(client: PoolClient, assetId: string, entityType: 'evidence' | 'ndt' | 'calculation', entityId: string, tenantId: string): Promise<void> {
  const queryByType: Record<'evidence' | 'ndt' | 'calculation', string> = {
    evidence: 'select asset_id from evidence_files where id = $1 and tenant_id = $2::uuid',
    ndt: 'select asset_id from ndt_measurements where id = $1 and tenant_id = $2::uuid',
    calculation: 'select asset_id from calculation_runs where id = $1 and tenant_id = $2::uuid'
  };
  const result = await client.query<{ asset_id: string | null }>(queryByType[entityType], [entityId, tenantId]);
  const linkedAssetId = result.rows[0]?.asset_id;
  if (!linkedAssetId) {
    const error = new Error(`${entityType.toUpperCase()}_LINK_TARGET_NOT_FOUND`);
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }
  if (linkedAssetId !== assetId) {
    const error = new Error('CROSS_ASSET_LINK_BLOCKED');
    (error as Error & { statusCode?: number; entityType?: string }).statusCode = 409;
    (error as Error & { entityType?: string }).entityType = entityType;
    throw error;
  }
}

async function insertEvidenceLink(client: PoolClient, req: Request, findingId: string, evidenceFileId: string, reason = 'RC4-H finding evidence linkage'): Promise<void> {
  await client.query(
    `insert into evidence_links(evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
     values ($1, 'finding', $2, $3, $4)
     on conflict (evidence_file_id, linked_entity_type, linked_entity_id) do update set
       link_reason = excluded.link_reason,
       linked_by = excluded.linked_by`,
    [evidenceFileId, findingId, reason, actorUserId(req)]
  );
}

async function handleCrossAssetBlocked(client: PoolClient, req: Request, res: ApiResponse, findingId: string | null, error: unknown): Promise<boolean> {
  if (error instanceof Error && error.message === 'CROSS_ASSET_LINK_BLOCKED') {
    await writeAudit(client, req, 'finding.cross_asset_link_blocked', 'finding', findingId, null, null, {
      reason: 'Cross-asset linkage rejected.',
      source_entity_type: (error as Error & { entityType?: string }).entityType ?? 'unknown'
    });
    res.status(409).json({
      error: {
        code: 'CROSS_ASSET_LINK_BLOCKED',
        message: 'Finding linkage target must belong to the same asset as the finding.'
      }
    });
    return true;
  }
  return false;
}

findingsRouter.get('/findings', requirePermission('finding.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const clauses: string[] = ['f.tenant_id = $1::uuid'];
    const values: unknown[] = [tenant.tenantId];
    const addFilter = (column: string, queryKey: string) => {
      const value = asString(req.query[queryKey]);
      if (!value) return;
      values.push(value);
      clauses.push(`${column} = $${values.length}`);
    };

    addFilter('f.asset_id', 'asset_id');
    addFilter('f.inspection_event_id', 'inspection_event_id');
    addFilter('f.finding_type', 'finding_type');
    addFilter('f.component', 'component');
    addFilter('f.severity', 'severity');
    addFilter('f.status', 'status');
    addFilter('f.source_type', 'source_type');
    addFilter('f.evidence_file_id', 'evidence_file_id');
    addFilter('f.ndt_measurement_id', 'ndt_measurement_id');
    addFilter('f.calculation_run_id', 'calculation_run_id');

    const createdFrom = asString(req.query.created_from);
    if (createdFrom) {
      values.push(createdFrom);
      clauses.push(`f.created_at >= $${values.length}::timestamptz`);
    }
    const createdTo = asString(req.query.created_to);
    if (createdTo) {
      values.push(createdTo);
      clauses.push(`f.created_at <= $${values.length}::timestamptz`);
    }

    const where = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';
    const result = await pool.query<DbRow>(
      `select f.*, a.asset_tag, a.asset_name,
              ef.evidence_code, ef.file_name as evidence_file_name,
              nm.measurement_code,
              cr.run_id
       from findings f
       left join assets a on a.id = f.asset_id and a.tenant_id = $1::uuid
       left join evidence_files ef on ef.id = f.evidence_file_id and ef.tenant_id = $1::uuid
       left join ndt_measurements nm on nm.id = f.ndt_measurement_id and nm.tenant_id = $1::uuid
       left join calculation_runs cr on cr.id = f.calculation_run_id and cr.tenant_id = $1::uuid
       ${where}
       order by f.updated_at desc, f.created_at desc
       limit 250`,
      values
    );

    res.json({ data: result.rows.map(mapFinding) });
  } catch (error) {
    next(error);
  }
});

findingsRouter.get('/assets/:assetId/findings', requirePermission('finding.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const result = await pool.query<DbRow>(
      `select f.*, a.asset_tag, a.asset_name,
              ef.evidence_code, ef.file_name as evidence_file_name,
              nm.measurement_code,
              cr.run_id
       from findings f
       left join assets a on a.id = f.asset_id and a.tenant_id = $2::uuid
       left join evidence_files ef on ef.id = f.evidence_file_id and ef.tenant_id = $2::uuid
       left join ndt_measurements nm on nm.id = f.ndt_measurement_id and nm.tenant_id = $2::uuid
       left join calculation_runs cr on cr.id = f.calculation_run_id and cr.tenant_id = $2::uuid
       where f.asset_id = $1 and f.tenant_id = $2::uuid
       order by f.updated_at desc, f.created_at desc`,
      [req.params.assetId, tenant.tenantId]
    );
    res.json({ data: result.rows.map(mapFinding) });
  } catch (error) {
    next(error);
  }
});

findingsRouter.get('/findings/:findingId', requirePermission('finding.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const finding = await loadFinding(pool, String(req.params.findingId), tenant.tenantId);
    if (!finding) {
      res.status(404).json({ error: { code: 'FINDING_NOT_FOUND', message: 'Finding not found.' } });
      return;
    }

    const linkedEvidence = await pool.query<DbRow>(
      `select ef.id as evidence_id, ef.evidence_code, ef.file_name, ef.file_type, ef.status, ef.asset_id
       from evidence_links el
       join evidence_files ef on ef.id = el.evidence_file_id
       where el.linked_entity_type = 'finding' and el.linked_entity_id = $1 and ef.tenant_id = $2::uuid
       order by el.created_at desc`,
      [String(req.params.findingId), tenant.tenantId]
    );

    res.json({
      data: {
        ...mapFinding(finding),
        linked_evidence: linkedEvidence.rows.map((row) => ({
          evidence_id: row.evidence_id,
          evidence_code: row.evidence_code,
          file_name: row.file_name,
          file_type: row.file_type,
          status: row.status,
          asset_id: row.asset_id
        })),
        related_links: {
          asset: `/assets/${finding.asset_id}`,
          asset_findings: `/assets/${finding.asset_id}/findings`,
          evidence: finding.evidence_file_id ? `/evidence/${finding.evidence_file_id}` : null,
          ndt: finding.ndt_measurement_id ? `/ndt/${finding.ndt_measurement_id}` : null,
          calculation: finding.calculation_run_id ? `/calculations/${finding.calculation_run_id}` : null,
          validation_history: `/validation/history?entity_type=finding&entity_id=${finding.id}`,
          audit_logs: `/audit-logs?entity_type=finding&entity_id=${finding.id}`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

findingsRouter.post('/findings', requirePermission('finding.create'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;
  const issues = validateFindingInput(body);
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const assetId = asString(body.asset_id);
    const title = asString(body.title);
    const findingType = asString(body.finding_type);
    const severity = asString(body.severity);
    if (!assetId || !title || !findingType || !severity) throw new Error('Validated finding payload is missing required fields.');
    await assertAssetExists(client, assetId, tenant.tenantId);

    const evidenceFileId = asString(body.evidence_file_id);
    const ndtMeasurementId = asString(body.ndt_measurement_id);
    const calculationRunId = asString(body.calculation_run_id);
    const inspectionEventId = nullIfEmpty(body.inspection_event_id);
    if (inspectionEventId) await assertInspectionEventLink(client, assetId, inspectionEventId, tenant.tenantId);
    if (evidenceFileId) await assertSameAssetLink(client, assetId, 'evidence', evidenceFileId, tenant.tenantId);
    if (ndtMeasurementId) await assertSameAssetLink(client, assetId, 'ndt', ndtMeasurementId, tenant.tenantId);
    if (calculationRunId) await assertSameAssetLink(client, assetId, 'calculation', calculationRunId, tenant.tenantId);

    const findingCode = await nextFindingCode(client, tenant.tenantId);
    const result = await client.query<DbRow>(
      `insert into findings(
        finding_code, tenant_id, asset_id, inspection_event_id, title, description, finding_type, component,
        shell_course_no, cml_tml_id, grid_ref, elevation, orientation, severity, status, source_type,
        source_entity_id, evidence_file_id, ndt_measurement_id, calculation_run_id, validation_run_id,
        identified_by, identified_at, created_by
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,
        $22,coalesce($23::timestamptz, now()),$24
      ) returning *`,
      [
        findingCode,
        tenant.tenantId,
        assetId,
        inspectionEventId,
        title,
        nullIfEmpty(body.description),
        findingType,
        nullIfEmpty(body.component),
        asInteger(body.shell_course_no) ?? null,
        nullIfEmpty(body.cml_tml_id),
        nullIfEmpty(body.grid_ref),
        nullIfEmpty(body.elevation),
        nullIfEmpty(body.orientation),
        severity,
        asString(body.status) ?? 'open',
        asString(body.source_type) ?? 'manual',
        nullIfEmpty(body.source_entity_id),
        evidenceFileId ?? null,
        ndtMeasurementId ?? null,
        calculationRunId ?? null,
        nullIfEmpty(body.validation_run_id),
        actorUserId(req),
        nullIfEmpty(body.identified_at),
        actorUserId(req)
      ]
    );
    const finding = result.rows[0];
    if (!finding) throw new Error('FINDING_CREATE_FAILED');
    if (evidenceFileId) await insertEvidenceLink(client, req, String(finding.id), evidenceFileId);
    const auditLogId = await writeAudit(client, req, 'finding.created', 'finding', String(finding.id), null, finding, { finding_code: finding.finding_code });
    await client.query('commit');
    res.status(201).json({ data: mapFinding(finding), auditLogId });
  } catch (error) {
    await client.query('rollback');
    if (await handleCrossAssetBlocked(client, req, res, null, error)) return;
    next(error);
  } finally {
    client.release();
  }
});

findingsRouter.patch('/findings/:findingId', requirePermission('finding.update'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;
  const issues = validateFindingInput(body, true);
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const before = await loadFinding(client, String(req.params.findingId), tenant.tenantId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FINDING_NOT_FOUND', message: 'Finding not found.' } });
      return;
    }

    const assetId = asString(body.asset_id) ?? String(before.asset_id);
    const evidenceFileId = body.evidence_file_id === undefined ? (before.evidence_file_id as string | null) : nullIfEmpty(body.evidence_file_id);
    const ndtMeasurementId = body.ndt_measurement_id === undefined ? (before.ndt_measurement_id as string | null) : nullIfEmpty(body.ndt_measurement_id);
    const calculationRunId = body.calculation_run_id === undefined ? (before.calculation_run_id as string | null) : nullIfEmpty(body.calculation_run_id);
    const inspectionEventId = body.inspection_event_id === undefined ? (before.inspection_event_id as string | null) : nullIfEmpty(body.inspection_event_id);
    if (assetId !== before.asset_id) await assertAssetExists(client, assetId, tenant.tenantId);
    if (inspectionEventId) await assertInspectionEventLink(client, assetId, inspectionEventId, tenant.tenantId);
    if (evidenceFileId) await assertSameAssetLink(client, assetId, 'evidence', evidenceFileId, tenant.tenantId);
    if (ndtMeasurementId) await assertSameAssetLink(client, assetId, 'ndt', ndtMeasurementId, tenant.tenantId);
    if (calculationRunId) await assertSameAssetLink(client, assetId, 'calculation', calculationRunId, tenant.tenantId);

    const status = asString(body.status) ?? String(before.status);
    const closing = (status === 'closed' || status === 'resolved') && before.status !== status;
    const closureReason = nullIfEmpty(body.closure_reason) ?? (before.closure_reason as string | null);
    if (closing) {
      if (!canCloseFinding(req)) {
        await writeAudit(client, req, 'finding.close_blocked', 'finding', String(req.params.findingId), before, null, {
          reason: 'finding.close permission is required.'
        });
        await client.query('rollback');
        res.status(403).json({
          error: {
            code: 'FINDING_CLOSE_PERMISSION_REQUIRED',
            message: 'Permission required: finding.close'
          }
        });
        return;
      }
      if (isServiceActor(req)) {
        await writeAudit(client, req, 'finding.close_blocked', 'finding', String(req.params.findingId), before, null, { reason: 'AI/n8n/service actors cannot close findings.' });
        await client.query('rollback');
        res.status(403).json({ error: { code: 'FINDING_CLOSE_BLOCKED_FOR_SERVICE_ACTOR', message: 'AI/n8n/service actors cannot close or finalize findings.' } });
        return;
      }
      if (!closureReason) {
        await writeAudit(client, req, 'finding.close_blocked', 'finding', String(req.params.findingId), before, null, { reason: 'closure_reason is required.' });
        await client.query('rollback');
        res.status(400).json({ error: { code: 'CLOSURE_REASON_REQUIRED', message: 'closure_reason is required when closing or resolving a finding.' } });
        return;
      }
      if ((before.severity === 'critical' || body.severity === 'critical') && !evidenceFileId) {
        await writeAudit(client, req, 'finding.close_blocked', 'finding', String(req.params.findingId), before, null, { reason: 'Critical finding closure requires evidence linkage.' });
        await client.query('rollback');
        res.status(409).json({ error: { code: 'CRITICAL_FINDING_EVIDENCE_REQUIRED', message: 'Critical findings require evidence linkage before closure.' } });
        return;
      }
    }

    const result = await client.query<DbRow>(
      `update findings set
        asset_id = $1,
        inspection_event_id = $2,
        title = $3,
        description = $4,
        finding_type = $5,
        component = $6,
        shell_course_no = $7,
        cml_tml_id = $8,
        grid_ref = $9,
        elevation = $10,
        orientation = $11,
        severity = $12,
        status = $13,
        source_type = $14,
        source_entity_id = $15,
        evidence_file_id = $16,
        ndt_measurement_id = $17,
        calculation_run_id = $18,
        validation_run_id = $19,
        closed_by = case when $20::boolean then $21 else closed_by end,
        closed_at = case when $20::boolean then now() else closed_at end,
        closure_reason = coalesce($22, closure_reason),
        updated_at = now()
       where id = $23 and tenant_id = $24::uuid
       returning *`,
      [
        assetId,
        inspectionEventId,
        asString(body.title) ?? before.title,
        body.description === undefined ? before.description : nullIfEmpty(body.description),
        asString(body.finding_type) ?? before.finding_type,
        body.component === undefined ? before.component : nullIfEmpty(body.component),
        body.shell_course_no === undefined ? before.shell_course_no : asInteger(body.shell_course_no) ?? null,
        body.cml_tml_id === undefined ? before.cml_tml_id : nullIfEmpty(body.cml_tml_id),
        body.grid_ref === undefined ? before.grid_ref : nullIfEmpty(body.grid_ref),
        body.elevation === undefined ? before.elevation : nullIfEmpty(body.elevation),
        body.orientation === undefined ? before.orientation : nullIfEmpty(body.orientation),
        asString(body.severity) ?? before.severity,
        status,
        asString(body.source_type) ?? before.source_type,
        body.source_entity_id === undefined ? before.source_entity_id : nullIfEmpty(body.source_entity_id),
        evidenceFileId,
        ndtMeasurementId,
        calculationRunId,
        body.validation_run_id === undefined ? before.validation_run_id : nullIfEmpty(body.validation_run_id),
        closing,
        actorUserId(req),
        closureReason,
        String(req.params.findingId),
        tenant.tenantId
      ]
    );
    const after = result.rows[0];
    if (!after) throw new Error('FINDING_UPDATE_FAILED');
    if (evidenceFileId) await insertEvidenceLink(client, req, String(after.id), evidenceFileId);
    const action = closing ? 'finding.closed' : before.status !== after.status ? 'finding.status_changed' : 'finding.updated';
    const auditLogId = await writeAudit(client, req, action, 'finding', String(req.params.findingId), before, after, { status_before: before.status, status_after: after.status });
    await client.query('commit');
    res.json({ data: mapFinding(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    if (await handleCrossAssetBlocked(client, req, res, String(req.params.findingId), error)) return;
    next(error);
  } finally {
    client.release();
  }
});

findingsRouter.post('/findings/:findingId/links/evidence', requirePermission('finding.update'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;
  const evidenceFileId = asString(body.evidence_file_id);
  if (!evidenceFileId) {
    validationError(res, [{ field: 'evidence_file_id', message: 'evidence_file_id is required.', severity: 'error' }]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const before = await loadFinding(client, String(req.params.findingId), tenant.tenantId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FINDING_NOT_FOUND', message: 'Finding not found.' } });
      return;
    }
    await assertSameAssetLink(client, String(before.asset_id), 'evidence', evidenceFileId, tenant.tenantId);
    await insertEvidenceLink(client, req, String(req.params.findingId), evidenceFileId, asString(body.link_reason) ?? 'RC4-H finding evidence linkage');
    const update = await client.query<DbRow>('update findings set evidence_file_id = $1, updated_at = now() where id = $2 and tenant_id = $3::uuid returning *', [evidenceFileId, String(req.params.findingId), tenant.tenantId]);
    const after = update.rows[0];
    if (!after) throw new Error('FINDING_EVIDENCE_LINK_FAILED');
    const auditLogId = await writeAudit(client, req, 'finding.evidence_linked', 'finding', String(req.params.findingId), before, after, { evidence_file_id: evidenceFileId });
    await client.query('commit');
    res.json({ data: mapFinding(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    if (await handleCrossAssetBlocked(client, req, res, String(req.params.findingId), error)) return;
    next(error);
  } finally {
    client.release();
  }
});

findingsRouter.delete('/findings/:findingId/links/evidence/:evidenceFileId', requirePermission('finding.update'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const before = await loadFinding(client, String(req.params.findingId), tenant.tenantId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FINDING_NOT_FOUND', message: 'Finding not found.' } });
      return;
    }
    await client.query(
      `delete from evidence_links
       where linked_entity_type = 'finding'
         and linked_entity_id = $1
         and evidence_file_id = $2
         and exists (
           select 1 from evidence_files ef
           where ef.id = evidence_links.evidence_file_id
             and ef.tenant_id = $3::uuid
         )`,
      [String(req.params.findingId), String(req.params.evidenceFileId), tenant.tenantId]
    );
    const update = await client.query<DbRow>(
      `update findings
       set evidence_file_id = case when evidence_file_id = $1 then null else evidence_file_id end,
           updated_at = now()
       where id = $2 and tenant_id = $3::uuid returning *`,
      [String(req.params.evidenceFileId), String(req.params.findingId), tenant.tenantId]
    );
    const after = update.rows[0];
    if (!after) throw new Error('FINDING_EVIDENCE_UNLINK_FAILED');
    const auditLogId = await writeAudit(client, req, 'finding.evidence_unlinked', 'finding', String(req.params.findingId), before, after, { evidence_file_id: String(req.params.evidenceFileId) });
    await client.query('commit');
    res.json({ data: mapFinding(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

