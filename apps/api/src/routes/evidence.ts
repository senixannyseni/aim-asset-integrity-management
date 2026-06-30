import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { config } from '../config/env.js';
import { objectStorageService, redactSignedUrl } from '../modules/object-storage/object-storage-service.js';
import { buildEvidenceObjectKey, validateEvidenceObjectRequest } from '../modules/object-storage/evidence-storage.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest, appendTenantWhereClause, tenantScopeMetadata } from '../modules/tenancy/tenant-scope.js';
import { assertTenantObjectKeyBoundary, buildTenantScopedObjectKey } from '../modules/tenancy/tenant-object-boundary.js';
import {
  asDateString,
  asInteger,
  asString,
  buildEvidenceObjectPath,
  isPlainObject,
  normalizeFileType,
  validateEvidenceLinkPayload,
  validateEvidenceUploadPayload,
  type EvidenceLinkEntityType,
  type ValidationIssue
} from '../modules/evidence/validation.js';

export const evidenceRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

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

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function mimeTypeFor(fileType: string): string {
  const normalized = fileType.toUpperCase();
  if (normalized === 'PDF') return 'application/pdf';
  if (normalized === 'CSV') return 'text/csv';
  if (normalized === 'XLSX') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (normalized === 'JPG' || normalized === 'JPEG') return 'image/jpeg';
  if (normalized === 'PNG') return 'image/png';
  if (normalized === 'ZIP') return 'application/zip';
  return 'application/octet-stream';
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

function mapEvidence(row: DbRow): Record<string, unknown> {
  return {
    evidence_id: row.id,
    evidence_code: row.evidence_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    object_storage_path: row.object_storage_path ?? row.object_storage_uri,
    object_storage_uri: row.object_storage_uri,
    storage_provider: row.storage_provider,
    storage_bucket: row.storage_bucket,
    object_key: row.object_key,
    object_version_id: row.object_version_id,
    file_name: row.file_name ?? row.original_filename,
    original_filename: row.original_filename,
    file_type: row.file_type ?? row.file_extension,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes ?? row.size_bytes,
    size_bytes: row.size_bytes ?? row.file_size_bytes,
    inspection_date: row.inspection_date,
    method: row.method,
    component: row.component,
    location: row.location,
    page_or_sheet_ref: row.page_or_sheet_ref ?? row.page_figure_table_reference,
    uploaded_by: row.uploaded_by,
    checksum: row.checksum ?? row.checksum_sha256,
    status: row.evidence_status ?? row.status,
    malware_scan_status: row.malware_scan_status,
    upload_status: row.upload_status,
    access_status: row.access_status,
    delete_requested_by: row.delete_requested_by,
    delete_approved_by: row.delete_approved_by,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapEvidenceLink(row: DbRow): Record<string, unknown> {
  return {
    evidence_link_id: row.id,
    evidence_file_id: row.evidence_file_id,
    linked_entity_type: row.linked_entity_type,
    linked_entity_id: row.linked_entity_id,
    link_reason: row.link_reason,
    linked_by: row.linked_by,
    created_at: row.created_at
  };
}

type LinkedEntityAssetResolution = {
  exists: boolean;
  assetId: string | null;
  assetOwned: boolean;
};

async function resolveLinkedEntityAsset(
  client: PoolClient,
  entityType: EvidenceLinkEntityType,
  entityId: string
): Promise<LinkedEntityAssetResolution> {
  if (entityType === 'asset') {
    const result = await client.query<{ id: string }>('select id from assets where id = $1 and deleted_at is null limit 1', [entityId]);
    return { exists: (result.rowCount ?? 0) > 0, assetId: result.rows[0]?.id ?? null, assetOwned: true };
  }

  const tableByType: Partial<Record<EvidenceLinkEntityType, string>> = {
    inspection_event: 'inspection_events',
    ndt_measurement: 'ndt_measurements',
    calculation_run: 'calculation_runs',
    extraction_job: 'extraction_jobs',
    integrity_decision: 'integrity_decisions',
    internal_work_order: 'internal_work_orders',
    report: 'reports',
    ffs_case: 'ffs_cases',
    rbi_case: 'rbi_cases'
  };

  if (entityType === 'extraction_field' || entityType === 'staging_record') {
    const table = entityType === 'extraction_field' ? 'extraction_fields' : 'staging_records';
    const result = await client.query<{ asset_id: string | null }>(
      `select ej.asset_id
       from ${table} entity
       join extraction_jobs ej on ej.id = entity.extraction_job_id
       where entity.id = $1 limit 1`,
      [entityId]
    );
    const row = result.rows[0];
    return { exists: Boolean(row), assetId: row?.asset_id ?? null, assetOwned: true };
  }

  const table = tableByType[entityType];
  if (!table) {
    return { exists: true, assetId: null, assetOwned: false };
  }

  const result = await client.query<{ asset_id: string | null }>(`select asset_id from ${table} where id = $1 limit 1`, [entityId]);
  const row = result.rows[0];
  return { exists: Boolean(row), assetId: row?.asset_id ?? null, assetOwned: true };
}

function crossAssetEvidenceError(
  res: ApiResponse,
  input: { evidenceFileId: string; evidenceAssetId: string | null; linkedEntityType: EvidenceLinkEntityType; linkedEntityId: string; linkedEntityAssetId: string | null }
): void {
  res.status(409).json({
    error: {
      code: 'CROSS_ASSET_EVIDENCE_LINK_BLOCKED',
      message: 'Evidence file and linked entity must belong to the same asset before evidence_links can be created.',
      details: input
    }
  });
}

function hasSameAssetBoundary(evidenceAssetId: string | null, linkedEntityAssetId: string | null): boolean {
  return Boolean(evidenceAssetId && linkedEntityAssetId && evidenceAssetId === linkedEntityAssetId);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isNonHumanEvidenceActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('ai_agent');
}

function controlledError(res: ApiResponse, status: number, code: string, message: string, details?: unknown): void {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

function normalizeSha256(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function extensionForFilename(filename: string): string {
  return path.extname(filename).replace(/^\./, '').toUpperCase() || 'BIN';
}

async function nextEvidenceCode(client: PoolClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const result = await client.query<{ count: string }>(
    `with used_codes as (
       select evidence_code from evidence_files where evidence_code like $1
       union
       select evidence_code from evidence_upload_sessions where evidence_code like $1
     )
     select coalesce(max(substring(evidence_code from '^EVD-[0-9]{4}-([0-9]{6})$')::int), 0)::text as count
     from used_codes`,
    [`EVD-${year}-%`]
  );
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `EVD-${year}-${String(next).padStart(6, '0')}`;
}


type EvidenceTraceabilityModule = {
  module_key: string;
  module_label: string;
  entity_type: EvidenceLinkEntityType;
  table_name: string;
  frontend_path: string;
  required_for_issue: boolean;
  total_records: number;
  linked_records: number;
  missing_records: number;
  coverage_percent: number;
  governance_note: string;
};

type EvidenceTraceabilityModuleConfig = {
  moduleKey: string;
  moduleLabel: string;
  entityType: EvidenceLinkEntityType;
  tableName: string;
  frontendPath: string;
  requiredForIssue: boolean;
  assetColumn?: string;
  inspectionColumn?: string;
  directEvidencePredicate?: string;
  extraJoin?: string;
  inspectionPredicate?: string;
  governanceNote: string;
};

const EVIDENCE_TRACEABILITY_MODULES: EvidenceTraceabilityModuleConfig[] = [
  {
    moduleKey: 'asset_register',
    moduleLabel: 'Asset Register',
    entityType: 'asset',
    tableName: 'assets',
    frontendPath: '/assets',
    requiredForIssue: true,
    assetColumn: 'id',
    governanceNote: 'Asset-level evidence proves baseline tank identity and is traceability only, not approval.'
  },
  {
    moduleKey: 'inspection_events',
    moduleLabel: 'Inspection Events',
    entityType: 'inspection_event',
    tableName: 'inspection_events',
    frontendPath: '/evidence',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    inspectionColumn: 'id',
    governanceNote: 'Inspection evidence should support the inspection event used by NDT, calculations, findings, and reports.'
  },
  {
    moduleKey: 'ndt_measurements',
    moduleLabel: 'NDT Measurements',
    entityType: 'ndt_measurement',
    tableName: 'ndt_measurements',
    frontendPath: '/ndt-data-room',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    inspectionColumn: 'inspection_event_id',
    directEvidencePredicate: 'entity.evidence_file_id is not null',
    governanceNote: 'NDT readings may be linked through normalized evidence_links or direct evidence_file_id references.'
  },
  {
    moduleKey: 'findings',
    moduleLabel: 'Findings / Anomalies',
    entityType: 'finding',
    tableName: 'findings',
    frontendPath: '/findings',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    inspectionColumn: 'inspection_event_id',
    directEvidencePredicate: 'entity.evidence_file_id is not null',
    governanceNote: 'Findings should retain evidence support before downstream FFS/RBI/report/work-order decisions.'
  },
  {
    moduleKey: 'calculation_runs',
    moduleLabel: 'Calculation Runs',
    entityType: 'calculation_run',
    tableName: 'calculation_runs',
    frontendPath: '/calculations',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    inspectionColumn: 'inspection_event_id',
    directEvidencePredicate: 'exists (select 1 from calculation_inputs ci where ci.calculation_run_id = entity.id and ci.evidence_file_id is not null)',
    governanceNote: 'Calculation evidence traceability is visibility only. Formulas remain deterministic and separately governed.'
  },
  {
    moduleKey: 'integrity_decisions',
    moduleLabel: 'Integrity Decisions',
    entityType: 'integrity_decision',
    tableName: 'integrity_decisions',
    frontendPath: '/integrity-decisions',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    inspectionColumn: 'inspection_event_id',
    governanceNote: 'Final integrity decision records must remain linked to supporting evidence, review, and calculation context.'
  },
  {
    moduleKey: 'rbi_cases',
    moduleLabel: 'RBI Cases',
    entityType: 'rbi_case',
    tableName: 'rbi_cases',
    frontendPath: '/rbi',
    requiredForIssue: false,
    assetColumn: 'asset_id',
    inspectionColumn: 'inspection_event_id',
    governanceNote: 'RBI evidence traceability is interface/readiness visibility only and does not implement API RP 581 calculations.'
  },
  {
    moduleKey: 'reports',
    moduleLabel: 'Reports',
    entityType: 'report',
    tableName: 'reports',
    frontendPath: '/reports',
    requiredForIssue: true,
    assetColumn: 'asset_id',
    extraJoin: 'left join calculation_runs trace_calc on trace_calc.id = entity.calculation_run_id',
    inspectionPredicate: 'trace_calc.inspection_event_id = $FILTER',
    governanceNote: 'Issued reports should have report-level evidence links plus calculation/evidence-register traceability.'
  },
  {
    moduleKey: 'internal_work_orders',
    moduleLabel: 'Internal Work Orders',
    entityType: 'internal_work_order',
    tableName: 'internal_work_orders',
    frontendPath: '/work-orders',
    requiredForIssue: false,
    assetColumn: 'asset_id',
    governanceNote: 'Internal work orders remain AIM fallback records; external CMMS write integration is out of scope.'
  }
];

function evidenceCoveragePercent(linkedRecords: number, totalRecords: number): number {
  if (totalRecords === 0) return 100;
  return Math.round((linkedRecords / totalRecords) * 1000) / 10;
}

function asCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function buildModuleWhereClause(
  module: EvidenceTraceabilityModuleConfig,
  assetId: string | null,
  inspectionEventId: string | null,
  values: unknown[]
): string {
  const filters: string[] = ['1 = 1'];
  if (assetId && module.assetColumn) {
    values.push(assetId);
    filters.push(`entity.${module.assetColumn} = $${values.length}`);
  }
  if (inspectionEventId) {
    if (module.inspectionColumn) {
      values.push(inspectionEventId);
      filters.push(`entity.${module.inspectionColumn} = $${values.length}`);
    } else if (module.inspectionPredicate) {
      values.push(inspectionEventId);
      filters.push(module.inspectionPredicate.replace('$FILTER', `$${values.length}`));
    }
  }
  return filters.join(' and ');
}

function buildEvidenceLinkedPredicate(module: EvidenceTraceabilityModuleConfig): string {
  const normalizedLinkPredicate = `exists (
    select 1 from evidence_links el
    where el.linked_entity_type = $1 and el.linked_entity_id = entity.id
  )`;
  if (!module.directEvidencePredicate) return normalizedLinkPredicate;
  return `(${normalizedLinkPredicate} or ${module.directEvidencePredicate})`;
}

async function buildEvidenceTraceabilityMatrix(params: {
  assetId: string | null;
  inspectionEventId: string | null;
}): Promise<Record<string, unknown>> {
  const coverageMatrix: EvidenceTraceabilityModule[] = [];

  for (const module of EVIDENCE_TRACEABILITY_MODULES) {
    const values: unknown[] = [module.entityType];
    const whereClause = buildModuleWhereClause(module, params.assetId, params.inspectionEventId, values);
    const linkedPredicate = buildEvidenceLinkedPredicate(module);
    const result = await pool.query<{ total_records: string; linked_records: string }>(
      `select
        count(*)::text as total_records,
        count(*) filter (where ${linkedPredicate})::text as linked_records
       from ${module.tableName} entity
       ${module.extraJoin ?? ''}
       where ${whereClause}`,
      values
    );
    const totalRecords = asCount(result.rows[0]?.total_records);
    const linkedRecords = asCount(result.rows[0]?.linked_records);
    const missingRecords = Math.max(totalRecords - linkedRecords, 0);
    coverageMatrix.push({
      module_key: module.moduleKey,
      module_label: module.moduleLabel,
      entity_type: module.entityType,
      table_name: module.tableName,
      frontend_path: module.frontendPath,
      required_for_issue: module.requiredForIssue,
      total_records: totalRecords,
      linked_records: linkedRecords,
      missing_records: missingRecords,
      coverage_percent: evidenceCoveragePercent(linkedRecords, totalRecords),
      governance_note: module.governanceNote
    });
  }

  const linkValues: unknown[] = [];
  const linkFilters = ['1 = 1'];
  if (params.assetId) {
    linkValues.push(params.assetId);
    linkFilters.push(`ef.asset_id = $${linkValues.length}`);
  }
  if (params.inspectionEventId) {
    linkValues.push(params.inspectionEventId);
    linkFilters.push(`ef.inspection_event_id = $${linkValues.length}`);
  }
  const recentLinks = await pool.query<DbRow>(
    `select
       el.id as evidence_link_id,
       el.evidence_file_id,
       el.linked_entity_type,
       el.linked_entity_id,
       el.link_reason,
       el.created_at,
       ef.evidence_code,
       ef.original_filename,
       ef.asset_id,
       ef.inspection_event_id,
       ef.status as evidence_status
     from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where ${linkFilters.join(' and ')}
     order by el.created_at desc
     limit 75`,
    linkValues
  );

  const totalRecords = coverageMatrix.reduce((sum, module) => sum + module.total_records, 0);
  const linkedRecords = coverageMatrix.reduce((sum, module) => sum + module.linked_records, 0);
  const missingRecords = coverageMatrix.reduce((sum, module) => sum + module.missing_records, 0);
  const requiredModules = coverageMatrix.filter((module) => module.required_for_issue);
  const requiredModulesMissing = requiredModules.filter((module) => module.missing_records > 0);

  return {
    scope: {
      asset_id: params.assetId,
      inspection_event_id: params.inspectionEventId,
      filter_note: 'Filters narrow existing AIM records only. This read-only matrix does not create, approve, delete, upload, download, or mutate evidence.'
    },
    summary: {
      total_records: totalRecords,
      linked_records: linkedRecords,
      missing_records: missingRecords,
      coverage_percent: evidenceCoveragePercent(linkedRecords, totalRecords),
      module_count: coverageMatrix.length,
      modules_with_missing_evidence: coverageMatrix.filter((module) => module.missing_records > 0).length,
      required_module_count: requiredModules.length,
      required_modules_with_missing_evidence: requiredModulesMissing.length,
      ready_for_governance_review: requiredModulesMissing.length === 0
    },
    coverage_matrix: coverageMatrix,
    missing_evidence: coverageMatrix
      .filter((module) => module.missing_records > 0)
      .map((module) => ({
        module_key: module.module_key,
        module_label: module.module_label,
        entity_type: module.entity_type,
        missing_records: module.missing_records,
        required_for_issue: module.required_for_issue,
        recommended_action: `Link evidence to ${module.entity_type} records through AIM evidence_links before relying on downstream review/report/work-order gates.`
      })),
    evidence_link_rows: recentLinks.rows.map((row) => ({
      evidence_link_id: row.evidence_link_id,
      evidence_file_id: row.evidence_file_id,
      evidence_code: row.evidence_code,
      original_filename: row.original_filename,
      linked_entity_type: row.linked_entity_type,
      linked_entity_id: row.linked_entity_id,
      link_reason: row.link_reason,
      asset_id: row.asset_id,
      inspection_event_id: row.inspection_event_id,
      evidence_status: row.evidence_status,
      created_at: row.created_at
    })),
    traceability_links: coverageMatrix.map((module) => ({
      label: module.module_label,
      entity_type: module.entity_type,
      href: module.frontend_path,
      missing_records: module.missing_records
    })),
    governance_notes: [
      'RC4-M is a read-only cross-module evidence coverage matrix.',
      'The matrix does not upload, download, delete, approve, issue, close, or promote any engineering record.',
      'Evidence coverage is not an engineering approval; human review and module-specific gates remain authoritative.',
      'Object storage behavior is unchanged; original evidence files remain in object storage and PostgreSQL keeps final structured metadata.'
    ]
  };
}

evidenceRouter.get('/evidence', requirePermission('evidence.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const values: string[] = [];
    const filters = ['1 = 1'];
    const assetId = asString(req.query.asset_id);
    const fileType = normalizeFileType(req.query.file_type);

    if (assetId) {
      values.push(assetId);
      filters.push(`asset_id = $${values.length}`);
    }

    if (fileType) {
      values.push(fileType);
      filters.push(`upper(coalesce(file_type, file_extension)) = $${values.length}`);
    }

    const scoped = appendTenantWhereClause({ baseWhere: `where ${filters.join(' and ')}`, params: values, tenant });
    const result = await pool.query<DbRow>(
      `select * from evidence_files ${scoped.clause} order by created_at desc`,
      scoped.params
    );

    res.json({ data: result.rows.map(mapEvidence) });
  } catch (error) {
    next(error);
  }
});


evidenceRouter.get('/evidence/traceability-matrix', requirePermission('evidence.read'), async (req, res, next) => {
  const assetId = asString(req.query.asset_id) ?? null;
  const inspectionEventId = asString(req.query.inspection_event_id ?? req.query.inspection_id) ?? null;
  if (assetId && !isUuid(assetId)) {
    controlledError(res, 400, 'TRACEABILITY_MATRIX_ASSET_ID_INVALID', 'asset_id must be a UUID when provided.');
    return;
  }
  if (inspectionEventId && !isUuid(inspectionEventId)) {
    controlledError(res, 400, 'TRACEABILITY_MATRIX_INSPECTION_ID_INVALID', 'inspection_event_id must be a UUID when provided.');
    return;
  }

  try {
    const matrix = await buildEvidenceTraceabilityMatrix({ assetId, inspectionEventId });
    res.json({ data: matrix });
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get('/evidence/:evidenceId', requirePermission('evidence.read'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }

  try {
    const tenant = requireTenantContextFromRequest(req);
    const evidenceResult = await pool.query<DbRow>('select * from evidence_files where id = $1 and tenant_id = $2', [evidenceId, tenant.tenantId]);
    const evidence = evidenceResult.rows[0];
    if (!evidence) {
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }

    const linksResult = await pool.query<DbRow>(
      'select * from evidence_links where evidence_file_id = $1 order by created_at desc',
      [evidenceId]
    );

    res.json({ data: { ...mapEvidence(evidence), links: linksResult.rows.map(mapEvidenceLink) } });
  } catch (error) {
    next(error);
  }
});

async function buildSignedEvidenceUrl(params: {
  objectKey: string;
  responseContentType?: string | null;
  expiresInSeconds?: number;
}) {
  return objectStorageService.getSignedDownloadUrl({
    objectKey: params.objectKey,
    responseContentType: params.responseContentType ?? undefined,
    expiresInSeconds: params.expiresInSeconds
  });
}

async function createEvidenceAccessResponse(req: Request, res: ApiResponse, evidenceId: string, accessMode: 'download_url' | 'download_open'): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const result = await client.query<DbRow>('select * from evidence_files where id = $1 and tenant_id = $2 for update', [evidenceId, tenant.tenantId]);
    const evidence = result.rows[0];
    if (!evidence) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }

    const blockEvidenceAccess = async (status: number, code: string, message: string, metadata: Record<string, unknown>): Promise<void> => {
      await client.query(
        `update evidence_files
         set access_status = 'blocked', accessed_at = now(), updated_at = now()
         where id = $1 and tenant_id = $2`,
        [evidenceId, tenant.tenantId]
      );
      const auditLogId = await writeAudit(client, req, 'EVIDENCE_ACCESS_BLOCKED', 'evidence_file', evidenceId, null, {
        evidence_id: evidenceId,
        access_status: 'blocked',
        blocked_code: code,
        access_mode: accessMode,
        ...metadata
      }, {
        access_status: 'blocked',
        signed_url_query_not_logged: true,
        object_storage_access_denied: true
      });
      await client.query('commit');
      res.status(status).json({ error: { code, message, auditLogId } });
    };

    const scanStatus = String(evidence.malware_scan_status ?? 'pending_scan');
    if (['infected', 'blocked', 'quarantined'].includes(scanStatus)) {
      await blockEvidenceAccess(409, 'EVIDENCE_BLOCKED_BY_SCAN', 'Evidence access is blocked because malware scan status does not allow download.', { malware_scan_status: scanStatus });
      return;
    }

    const objectKey = asString(evidence.object_key) ?? asString(evidence.object_storage_path ?? evidence.object_storage_uri);
    if (!objectKey) {
      await blockEvidenceAccess(409, 'EVIDENCE_OBJECT_KEY_MISSING', 'Evidence object key is missing; download cannot be issued.', { object_key_missing: true });
      return;
    }

    try {
      assertTenantObjectKeyBoundary(objectKey, tenant);
    } catch {
      await blockEvidenceAccess(403, 'TENANT_OBJECT_KEY_BOUNDARY_VIOLATION', 'Evidence object key is outside the selected tenant boundary.', { tenant_id: tenant.tenantId });
      return;
    }

    const exists = await objectStorageService.objectExists(objectKey);
    if (!exists) {
      await blockEvidenceAccess(409, 'EVIDENCE_OBJECT_NOT_FOUND', 'Evidence metadata exists but the object-storage file was not found.', { object_key: objectKey });
      return;
    }

    const signed = await buildSignedEvidenceUrl({
      objectKey,
      responseContentType: asString(evidence.mime_type),
      expiresInSeconds: config.objectStorage.signedUrlTtlSeconds
    });
    await client.query(
      `update evidence_files
       set accessed_at = now(), access_status = $2, signed_url_expires_at = $3::timestamptz, updated_at = now()
       where id = $1 and tenant_id = $4`,
      [evidenceId, accessMode === 'download_open' ? 'download_opened' : 'signed_url_issued', signed.expiresAt, tenant.tenantId]
    );
    const auditLogId = await writeAudit(
      client,
      req,
      accessMode === 'download_open' ? 'EVIDENCE_DOWNLOAD_OPENED' : 'EVIDENCE_DOWNLOAD_URL_CREATED',
      'evidence_file',
      evidenceId,
      null,
      { evidence_id: evidenceId, expires_at: signed.expiresAt, object_key: objectKey },
      {
        access_status: accessMode === 'download_open' ? 'download_opened' : 'signed_url_issued',
        ...(accessMode === 'download_url'
          ? { legacy_event_alias: 'EVIDENCE_SIGNED_URL_CREATED' }
          : {}),
        signed_url_ttl_seconds: config.objectStorage.signedUrlTtlSeconds,
        signed_url_redacted: redactSignedUrl(signed.url),
        object_storage_bucket: signed.bucket,
        signed_url_query_not_logged: true
      }
    );
    await client.query('commit');

    if (accessMode === 'download_open') {
      res.redirect(302, signed.url);
      return;
    }

    res.json({
      data: {
        evidence_id: evidence.id,
        evidence_code: evidence.evidence_code,
        object_key: objectKey,
        download_url: signed.url,
        signed_url: signed.url,
        expires_at: signed.expiresAt,
        malware_scan_status: scanStatus,
        note: 'Signed URL is issued by AIM after RBAC, object-existence, malware-status, and audit checks.'
      },
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

evidenceRouter.get('/evidence/:evidenceId/open', requirePermission('evidence.open'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  try {
    await createEvidenceAccessResponse(req, res, evidenceId, 'download_url');
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get('/evidence/:evidenceId/download-url', requirePermission('evidence.download_url'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  try {
    await createEvidenceAccessResponse(req, res, evidenceId, 'download_url');
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get('/evidence/:evidenceId/download', requirePermission('evidence.open'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  try {
    await createEvidenceAccessResponse(req, res, evidenceId, 'download_open');
  } catch (error) {
    next(error);
  }
});

evidenceRouter.post('/evidence/upload-url', requirePermission('evidence.upload'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  if (isNonHumanEvidenceActor(req)) {
    controlledError(res, 403, 'HUMAN_EVIDENCE_UPLOAD_REQUIRED', 'Evidence upload URL creation requires a human user. AI/service actors cannot create final evidence artifacts.');
    return;
  }

  const tenant = requireTenantContextFromRequest(req);
  const assetId = asString(body.asset_id);
  const filename = asString(body.filename ?? body.file_name);
  const mimeType = asString(body.mime_type);
  const sizeBytes = asInteger(body.size_bytes ?? body.file_size_bytes);
  const inspectionId = asString(body.inspection_id ?? body.inspection_event_id) ?? null;
  const checksum = normalizeSha256(body.checksum_sha256 ?? body.checksum);

  if (!assetId || !isUuid(assetId) || !filename || !mimeType || !sizeBytes) {
    validationError(res, [
      {
        field: 'asset_id',
        message: 'asset_id UUID, filename, mime_type, and size_bytes are required for gate-eligible object-storage evidence.',
        severity: 'error'
      }
    ]);
    return;
  }

  if (!checksum) {
    controlledError(
      res,
      400,
      'EVIDENCE_CHECKSUM_REQUIRED',
      'checksum_sha256 is required for gate-eligible object-storage evidence upload.',
      { checksum_required: true }
    );
    return;
  }
  if (inspectionId && !isUuid(inspectionId)) {
    validationError(res, [{ field: 'inspection_id', message: 'inspection_id must be a UUID when provided.', severity: 'error' }]);
    return;
  }

  let safeFilename: string;
  try {
    safeFilename = validateEvidenceObjectRequest({ filename, mimeType, sizeBytes }).safeFilename;
  } catch (error) {
    validationError(res, [{ field: 'filename', message: error instanceof Error ? error.message : 'Invalid evidence object request.', severity: 'error' }]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const assetResult = await client.query<{ id: string; asset_tag: string | null }>('select id, asset_tag from assets where id = $1 and tenant_id = $2 and deleted_at is null', [assetId, tenant.tenantId]);
    const asset = assetResult.rows[0];
    if (!asset) {
      await client.query('rollback');
      controlledError(res, 404, 'ASSET_NOT_FOUND', 'Asset not found for evidence upload URL.');
      return;
    }

    if (inspectionId) {
      const inspectionResult = await client.query('select id from inspection_events where id = $1 and asset_id = $2 and tenant_id = $3', [inspectionId, assetId, tenant.tenantId]);
      if (inspectionResult.rowCount === 0) {
        await client.query('rollback');
        controlledError(res, 404, 'INSPECTION_NOT_FOUND', 'Inspection event not found for asset.');
        return;
      }
    }

    const evidenceCode = await nextEvidenceCode(client);
    const objectKey = buildEvidenceObjectKey({
      assetTagOrId: String(asset.asset_tag ?? assetId),
      inspectionId,
      evidenceCode,
      filename: safeFilename,
      tenant
    });
    const signedUpload = await objectStorageService.getSignedUploadUrl({
      objectKey,
      contentType: mimeType,
      contentLength: sizeBytes,
      checksumSha256: checksum ?? undefined,
      expiresInSeconds: config.objectStorage.signedUrlTtlSeconds
    });

    const sessionResult = await client.query<DbRow>(
      `insert into evidence_upload_sessions(
        tenant_id,
        asset_id,
        inspection_id,
        evidence_code,
        original_filename,
        safe_filename,
        declared_mime_type,
        declared_size_bytes,
        expected_checksum_sha256,
        storage_bucket,
        object_key,
        upload_status,
        requested_by,
        expires_at,
        metadata_json
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13::timestamptz, $14::jsonb)
      returning *`,
      [
        tenant.tenantId,
        assetId,
        inspectionId,
        evidenceCode,
        filename,
        safeFilename,
        mimeType,
        sizeBytes,
        checksum,
        signedUpload.bucket,
        objectKey,
        actorUserId(req),
        signedUpload.expiresAt,
        JSON.stringify({ signed_url_redacted: redactSignedUrl(signedUpload.url), signed_url_query_not_logged: true, evidence_code_source: 'aim_backend_generated', checksum_required: true, ...tenantScopeMetadata(tenant) })
      ]
    );
    const session = sessionResult.rows[0];

    if (!session) {
      throw new Error('Evidence upload session insert failed.');
    }

    const auditLogId = await writeAudit(client, req, 'EVIDENCE_UPLOAD_URL_CREATED', 'evidence_upload_session', String(session.upload_session_id), null, {
      upload_session_id: session.upload_session_id,
      asset_id: assetId,
      evidence_code: evidenceCode,
      evidence_code_source: 'aim_backend_generated',
      checksum_required: true,
      object_key: objectKey,
      expires_at: signedUpload.expiresAt
    }, {
      signed_url_redacted: redactSignedUrl(signedUpload.url),
      signed_url_query_not_logged: true,
      storage_bucket: signedUpload.bucket
    });
    await client.query('commit');
    res.status(201).json({
      data: {
        upload_session_id: session.upload_session_id,
        object_key: objectKey,
        upload_url: signedUpload.url,
        expires_at: signedUpload.expiresAt,
        required_headers: {
          'Content-Type': mimeType,
          'x-amz-meta-checksum_sha256': checksum
        }
      },
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

evidenceRouter.post('/evidence/complete-upload', requirePermission('evidence.upload'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  if (isNonHumanEvidenceActor(req)) {
    controlledError(res, 403, 'HUMAN_EVIDENCE_UPLOAD_REQUIRED', 'Evidence upload completion requires a human user. AI/service actors cannot finalize evidence artifacts.');
    return;
  }

  const uploadSessionId = asString(body.upload_session_id);
  const providedChecksum = normalizeSha256(body.checksum_sha256 ?? body.checksum);
  if (!uploadSessionId || !isUuid(uploadSessionId)) {
    validationError(res, [{ field: 'upload_session_id', message: 'upload_session_id UUID is required.', severity: 'error' }]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const sessionResult = await client.query<DbRow>('select * from evidence_upload_sessions where upload_session_id = $1 and tenant_id = $2 for update', [uploadSessionId, tenant.tenantId]);
    const session = sessionResult.rows[0];
    if (!session) {
      await client.query('rollback');
      controlledError(res, 404, 'UPLOAD_SESSION_NOT_FOUND', 'Evidence upload session not found.');
      return;
    }
    if (String(session.upload_status) === 'verified') {
      await client.query('rollback');
      controlledError(res, 409, 'UPLOAD_SESSION_ALREADY_COMPLETED', 'Evidence upload session is already verified.');
      return;
    }
    if (new Date(String(session.expires_at)).getTime() < Date.now()) {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'expired']);
      await client.query('commit');
      controlledError(res, 409, 'UPLOAD_SESSION_EXPIRED', 'Evidence upload session has expired.');
      return;
    }

    const objectKey = String(session.object_key);
    let objectHead;
    try {
      objectHead = await objectStorageService.headObject(objectKey);
    } catch {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'failed']);
      await client.query('commit');
      controlledError(res, 409, 'EVIDENCE_OBJECT_NOT_FOUND', 'Object storage file does not exist. Evidence metadata was not finalized.');
      return;
    }

    const expectedSize = Number(session.declared_size_bytes);
    if (objectHead.contentLength !== expectedSize) {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'failed']);
      await client.query('commit');
      controlledError(res, 409, 'EVIDENCE_OBJECT_SIZE_MISMATCH', 'Object storage size does not match declared upload size.', { expected_size_bytes: expectedSize, actual_size_bytes: objectHead.contentLength });
      return;
    }

    const expectedChecksum = normalizeSha256(session.expected_checksum_sha256);
    const objectMetadataChecksum = normalizeSha256(
      objectHead.metadata?.checksum_sha256 ??
      objectHead.metadata?.checksumSha256 ??
      objectHead.metadata?.['checksum-sha256']
    );
    const verificationChecksum = providedChecksum ?? objectMetadataChecksum;

    if (!expectedChecksum) {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'failed']);
      await client.query('commit');
      controlledError(res, 409, 'EVIDENCE_CHECKSUM_REQUIRED', 'Expected checksum is missing from the upload session. Evidence metadata was not finalized.', { checksum_required: true });
      return;
    }

    if (!verificationChecksum) {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'failed']);
      await client.query('commit');
      controlledError(
        res,
        409,
        'EVIDENCE_CHECKSUM_VERIFICATION_REQUIRED',
        'Evidence completion requires a caller-provided checksum_sha256 or matching object metadata checksum_sha256.',
        { checksum_required: true, object_metadata_checksum_missing: true }
      );
      return;
    }

    if (expectedChecksum !== verificationChecksum) {
      await client.query('update evidence_upload_sessions set upload_status = $2 where upload_session_id = $1', [uploadSessionId, 'failed']);
      await client.query('commit');
      controlledError(res, 409, 'EVIDENCE_CHECKSUM_MISMATCH', 'Verified checksum does not match expected checksum.', {
        provided_checksum_present: Boolean(providedChecksum),
        object_metadata_checksum_present: Boolean(objectMetadataChecksum)
      });
      return;
    }

    const checksum = verificationChecksum;
    const safeFilename = String(session.safe_filename);
    const fileExtension = extensionForFilename(safeFilename);
    const completedInspectionDate = asDateString(body.inspection_date);
    const completedMethod = asString(body.method);
    const completedComponent = asString(body.component);
    const completedLocation = asString(body.location);
    const completedPageOrSheetRef = asString(body.page_or_sheet_ref);
    const evidenceResult = await client.query<DbRow>(
      `insert into evidence_files(
        tenant_id,
        evidence_code,
        asset_id,
        inspection_event_id,
        object_storage_uri,
        object_storage_path,
        storage_provider,
        storage_bucket,
        object_key,
        object_version_id,
        original_filename,
        file_name,
        file_extension,
        file_type,
        mime_type,
        file_size_bytes,
        size_bytes,
        checksum_sha256,
        checksum,
        uploaded_by,
        method,
        component,
        inspection_date,
        location,
        page_figure_table_reference,
        page_or_sheet_ref,
        status,
        evidence_status,
        malware_scan_status,
        access_status,
        upload_status,
        uploaded_at,
        completed_at
      ) values ($1, $2, $3, $4, $5, $5, 's3-compatible', $6, $7, $8, $9, $9, $10, $10, $11, $12, $12, $13, $13, $14, $15, $16, $17, $18, $19, $19, 'active', 'active', 'pending_scan', 'not_issued', 'verified', now(), now())
      on conflict (checksum_sha256, object_storage_uri) do update set
        storage_bucket = excluded.storage_bucket,
        object_key = excluded.object_key,
        upload_status = 'verified',
        method = coalesce(excluded.method, evidence_files.method),
        component = coalesce(excluded.component, evidence_files.component),
        inspection_date = coalesce(excluded.inspection_date, evidence_files.inspection_date),
        location = coalesce(excluded.location, evidence_files.location),
        page_figure_table_reference = coalesce(excluded.page_figure_table_reference, evidence_files.page_figure_table_reference),
        page_or_sheet_ref = coalesce(excluded.page_or_sheet_ref, evidence_files.page_or_sheet_ref),
        completed_at = now(),
        updated_at = now()
      returning *`,
      [
        tenant.tenantId,
        String(session.evidence_code),
        String(session.asset_id),
        session.inspection_id ?? null,
        objectKey,
        String(session.storage_bucket),
        objectKey,
        objectHead.versionId ?? null,
        safeFilename,
        fileExtension,
        String(session.declared_mime_type),
        objectHead.contentLength,
        checksum,
        actorUserId(req),
        completedMethod, 
        completedComponent,
        completedInspectionDate,
        completedLocation,
        completedPageOrSheetRef
      ]
    );
    const evidence = evidenceResult.rows[0];
    await client.query(
      `update evidence_upload_sessions
       set evidence_id = $2, upload_status = 'verified', completed_at = now(), metadata_json = metadata_json || $3::jsonb
       where upload_session_id = $1`,
      [uploadSessionId, evidence?.id, JSON.stringify({ evidence_id: evidence?.id, object_verified: true })]
    );
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_UPLOAD_COMPLETED', 'evidence_file', String(evidence?.id ?? ''), null, mapEvidence(evidence ?? {}), {
      upload_session_id: uploadSessionId,
      object_key: objectKey,
      storage_bucket: session.storage_bucket,
      checksum_sha256: checksum,
      object_verified: true
    });
    await client.query('commit');
    res.status(201).json({ data: mapEvidence(evidence ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

evidenceRouter.post('/evidence/upload', requirePermission('evidence.upload'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const issues = validateEvidenceUploadPayload(body);
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const tenant = requireTenantContextFromRequest(req);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const assetId = asString(body.asset_id);
    if (!assetId) throw new Error('asset_id unexpectedly missing after validation.');

    const assetResult = await client.query<DbRow>('select id, asset_tag from assets where id = $1 and tenant_id = $2 and deleted_at is null', [assetId, tenant.tenantId]);
    const asset = assetResult.rows[0];
    if (!asset) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found for evidence upload.' } });
      return;
    }

    const inspectionEventId = asString(body.inspection_event_id) ?? null;
    if (inspectionEventId) {
      const inspectionResult = await client.query('select id from inspection_events where id = $1 and asset_id = $2 and tenant_id = $3', [inspectionEventId, assetId, tenant.tenantId]);
      if (inspectionResult.rowCount === 0) {
        await client.query('rollback');
        res.status(404).json({ error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspection event not found for asset.' } });
        return;
      }
    }

    const evidenceCode = asString(body.evidence_code) ?? await nextEvidenceCode(client);
    const fileName = asString(body.file_name);
    const fileType = normalizeFileType(body.file_type);
    const checksum = asString(body.checksum);
    const inspectionDate = asDateString(body.inspection_date);
    if (!fileName || !fileType || !checksum || !inspectionDate) throw new Error('Evidence payload unexpectedly invalid after validation.');

    const legacyRelativePath = asString(body.object_storage_path) ?? buildEvidenceObjectPath({
      assetTag: String(asset.asset_tag),
      inspectionId: inspectionEventId,
      evidenceCode,
      fileName
    });
    const objectStoragePath = buildTenantScopedObjectKey(tenant, legacyRelativePath);
    const fileSizeBytes = asInteger(body.file_size_bytes) ?? 0;
    const mimeType = asString(body.mime_type) ?? mimeTypeFor(fileType);

    const result = await client.query<DbRow>(
      `insert into evidence_files(
        tenant_id,
        evidence_code,
        asset_id,
        inspection_event_id,
        object_storage_uri,
        object_storage_path,
        original_filename,
        file_name,
        file_extension,
        file_type,
        mime_type,
        file_size_bytes,
        checksum_sha256,
        checksum,
        method,
        component,
        location,
        inspection_date,
        page_figure_table_reference,
        page_or_sheet_ref,
        uploaded_by,
        status,
        evidence_status,
        malware_scan_status,
        access_status,
        upload_status
      ) values ($1, $2, $3, $4, $5, $5, $6, $6, $7, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, $15, $16, 'active', 'metadata_only_pending_object_verification', 'pending_scan', 'blocked', 'pending')
      on conflict (checksum_sha256, object_storage_uri) do update set
        method = excluded.method,
        component = excluded.component,
        location = excluded.location,
        page_or_sheet_ref = excluded.page_or_sheet_ref,
        evidence_status = 'metadata_only_pending_object_verification',
        access_status = 'blocked',
        upload_status = 'pending',
        updated_at = now()
      returning *`,
      [
        tenant.tenantId,
        evidenceCode,
        assetId,
        inspectionEventId,
        objectStoragePath,
        fileName,
        fileType,
        mimeType,
        fileSizeBytes,
        checksum,
        asString(body.method),
        asString(body.component),
        asString(body.location) ?? null,
        inspectionDate,
        asString(body.page_or_sheet_ref) ?? null,
        actorUserId(req)
      ]
    );

    const evidence = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_LEGACY_METADATA_REGISTERED', 'evidence_file', String(evidence?.id ?? ''), null, mapEvidence(evidence ?? {}), {
      module: 'evidence_repository',
      legacy_route: true,
      gate_eligible: false,
      object_storage_boundary: 'metadata_only_pending_object_verification',
      object_verification_required: true
    });

    await client.query('commit');
    res.status(201).json({
      data: mapEvidence(evidence ?? {}),
      auditLogId,
      warning: {
        code: 'LEGACY_METADATA_IMPORT_REQUIRES_OBJECT_VERIFICATION',
        message: 'POST /api/v1/evidence/upload is retained only for legacy metadata import. Use /api/v1/evidence/upload-url and /api/v1/evidence/complete-upload for gate-eligible object-storage evidence.'
      }
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

evidenceRouter.post('/evidence/:evidenceId/links', requirePermission('evidence.link'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }

  const body = ensureBody(req, res);
  if (!body) return;

  const issues = validateEvidenceLinkPayload(body);
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const linkedEntityType = body.linked_entity_type as EvidenceLinkEntityType;
  const linkedEntityId = asString(body.linked_entity_id);
  const linkReason = asString(body.link_reason);
  if (!linkedEntityId || !linkReason) throw new Error('Evidence link payload unexpectedly invalid after validation.');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const evidenceResult = await client.query<{ id: string; asset_id: string | null }>('select id, asset_id from evidence_files where id = $1 and tenant_id = $2', [evidenceId, tenant.tenantId]);
    const evidence = evidenceResult.rows[0];
    if (!evidence) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }

    const linkedEntity = await resolveLinkedEntityAsset(client, linkedEntityType, linkedEntityId);
    if (!linkedEntity.exists) {
      await client.query('rollback');
      res.status(404).json({
        error: {
          code: 'LINKED_ENTITY_NOT_FOUND',
          message: 'Linked entity does not exist in implemented AIM tables.'
        }
      });
      return;
    }

    if (linkedEntity.assetOwned && !hasSameAssetBoundary(evidence.asset_id, linkedEntity.assetId)) {
      await client.query('rollback');
      crossAssetEvidenceError(res, {
        evidenceFileId: evidenceId,
        evidenceAssetId: evidence.asset_id,
        linkedEntityType,
        linkedEntityId,
        linkedEntityAssetId: linkedEntity.assetId
      });
      return;
    }

    const result = await client.query<DbRow>(
      `insert into evidence_links(evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
       values ($1, $2, $3, $4, $5)
       on conflict (evidence_file_id, linked_entity_type, linked_entity_id) do update set
         link_reason = excluded.link_reason,
         linked_by = excluded.linked_by
       returning *`,
      [evidenceId, linkedEntityType, linkedEntityId, linkReason, actorUserId(req)]
    );

    const link = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_LINKED', 'evidence_link', String(link?.id ?? ''), null, mapEvidenceLink(link ?? {}), {
      module: 'evidence_repository',
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId
    });

    await client.query('commit');
    res.status(201).json({ data: mapEvidenceLink(link ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

evidenceRouter.post('/evidence/:evidenceId/delete-request', requirePermission('evidence.delete_request'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const beforeResult = await client.query<DbRow>('select * from evidence_files where id = $1 and tenant_id = $2 for update', [evidenceId, tenant.tenantId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update evidence_files
       set status = 'delete_requested', evidence_status = 'delete_requested', delete_requested_by = $2, delete_requested_at = now(), updated_at = now()
       where id = $1 and tenant_id = $3 returning *`,
      [evidenceId, actorUserId(req), tenant.tenantId]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_DELETE_REQUESTED', 'evidence_file', evidenceId, mapEvidence(before), mapEvidence(updated ?? {}), {
      soft_delete_only: true
    });
    await client.query('commit');
    res.json({ data: mapEvidence(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

evidenceRouter.post('/evidence/:evidenceId/delete-approve', requirePermission('evidence.delete_approve'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const beforeResult = await client.query<DbRow>('select * from evidence_files where id = $1 and tenant_id = $2 for update', [evidenceId, tenant.tenantId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }
    const linkCount = await client.query<{ count: string }>('select count(*)::text as count from evidence_links where evidence_file_id = $1', [evidenceId]);
    if (Number(linkCount.rows[0]?.count ?? '0') > 0) {
      await client.query('rollback');
      res.status(409).json({
        error: {
          code: 'LINKED_EVIDENCE_DELETE_BLOCKED',
          message: 'Linked evidence cannot be deleted. Mark as superseded or retain for audit lineage.'
        }
      });
      return;
    }
    const result = await client.query<DbRow>(
      `update evidence_files
       set status = 'deleted', evidence_status = 'deleted', delete_approved_by = $2, delete_approved_at = now(), updated_at = now()
       where id = $1 and tenant_id = $3 returning *`,
      [evidenceId, actorUserId(req), tenant.tenantId]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_DELETE_APPROVED', 'evidence_file', evidenceId, mapEvidence(before), mapEvidence(updated ?? {}), {
      blocked_if_linked: true,
      file_bytes_not_deleted_by_api: true
    });
    await client.query('commit');
    res.json({ data: mapEvidence(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

