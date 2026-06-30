import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest } from '../modules/tenancy/tenant-scope.js';

export const aiExtractionRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;
type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

type FieldDecision = 'approve' | 'correct' | 'reject';

type FieldInput = {
  field_path?: unknown;
  field_name?: unknown;
  extracted_value?: unknown;
  normalized_value?: unknown;
  unit?: unknown;
  source_reference?: unknown;
  confidence_score?: unknown;
  target_entity_type?: unknown;
  target_entity_id?: unknown;
  target_table?: unknown;
  target_column?: unknown;
  validation_flags?: unknown;
  field_status?: unknown;
};

type PreparedField = {
  fieldPath: string;
  fieldName: string;
  extractedValue: string | null;
  normalizedValue: string | null;
  unit: string | null;
  sourceReference: Record<string, unknown>;
  confidenceScore: number | null;
  fieldStatus: 'ai_extracted' | 'needs_review' | 'invalid' | 'rejected_by_validation';
  reviewRequired: boolean;
  validationFlags: string[];
  dataQualityChecks: Array<{ code: string; severity: 'warning' | 'high' | 'critical' | 'blocking'; status: 'failed' | 'warning' | 'blocked'; message: string; blocking: boolean }>;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetTable: string | null;
  targetColumn: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function asUuid(value: unknown): string | null {
  const raw = asString(value);
  return raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function validationError(res: ApiResponse, field: string, message: string, code = 'VALIDATION_FAILED'): void {
  res.status(400).json({ error: { code, message, details: [{ field, message }] } });
}

function controlledError(res: ApiResponse, status: number, code: string, message: string, details: Record<string, unknown> = {}): void {
  res.status(status).json({ error: { code, message, ...details } });
}

const SERVICE_ONLY_ACTOR_ROLES = new Set(['ai_agent', 'n8n_service', 'integration_service', 'workflow_service', 'system_service']);

function isServiceOnlyActor(req: Request): boolean {
  return actorRoles(req).some((role) => SERVICE_ONLY_ACTOR_ROLES.has(role));
}

function ensureHumanReviewerActor(req: Request, res: ApiResponse, action: string): boolean {
  if (!actorUserId(req) || isServiceOnlyActor(req)) {
    controlledError(res, 403, 'AI_SERVICE_ACTOR_BLOCKED', `Human engineer actor is required to ${action}.`, {
      actor_roles: actorRoles(req),
      human_review_required: true
    });
    return false;
  }
  return true;
}

const WEAK_REASON_VALUES = new Set(['n/a', 'na', 'none', 'nil', '-', '--', 'test', 'testing', 'tbd', 'todo']);

function isMeaningfulReason(value: unknown): value is string {
  const reason = asString(value);
  if (!reason) return false;
  const normalized = reason.toLowerCase().replace(/[.\s]+$/g, '').trim();
  return reason.length >= 8 && !WEAK_REASON_VALUES.has(normalized);
}

function sourceReferenceRequiresEvidence(sourceReference: unknown): boolean {
  if (!isPlainObject(sourceReference)) return true;
  return sourceReference.evidence_not_required !== true;
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

async function nextExtractionJobCode(client: PoolClient, tenantId: string): Promise<string> {
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count
     from extraction_jobs ej
     join assets a on a.id = ej.asset_id
     where a.tenant_id = $1::uuid`,
    [tenantId]
  );
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `EXJ-${new Date().getUTCFullYear()}-${String(next).padStart(6, '0')}`;
}

async function loadExtractionJob(client: Queryable, jobId: string | undefined, tenantId: string, forUpdate = false): Promise<DbRow | undefined> {
  const id = asUuid(jobId);
  if (!id) return undefined;
  const result = await client.query<DbRow>(
    `select ej.*
     from extraction_jobs ej
     join assets a on a.id = ej.asset_id
     where ej.id = $1::uuid
       and a.tenant_id = $2::uuid
     limit 1${forUpdate ? ' for update of ej' : ''}`,
    [id, tenantId]
  );
  return result.rows[0];
}

async function loadExtractionField(client: Queryable, fieldId: string | undefined, tenantId: string, forUpdate = false): Promise<DbRow | undefined> {
  const id = asUuid(fieldId);
  if (!id) return undefined;
  const result = await client.query<DbRow>(
    `select ef.*
     from extraction_fields ef
     join extraction_jobs ej on ej.id = ef.extraction_job_id
     join assets a on a.id = ej.asset_id
     where ef.id = $1::uuid
       and a.tenant_id = $2::uuid
     limit 1${forUpdate ? ' for update of ef' : ''}`,
    [id, tenantId]
  );
  return result.rows[0];
}

async function loadLatestStagingForField(client: Queryable, fieldId: string | undefined, tenantId: string, forUpdate = false): Promise<DbRow | undefined> {
  const id = asUuid(fieldId);
  if (!id) return undefined;
  const result = await client.query<DbRow>(
    `select sr.*
     from staging_records sr
     join extraction_jobs ej on ej.id = sr.extraction_job_id
     join assets a on a.id = ej.asset_id
     where sr.extraction_field_id = $1::uuid
       and a.tenant_id = $2::uuid
     order by sr.created_at desc
     limit 1${forUpdate ? ' for update of sr' : ''}`,
    [id, tenantId]
  );
  return result.rows[0];
}

async function loadStagingRecord(client: Queryable, stagingRecordId: string | undefined, tenantId: string, forUpdate = false): Promise<DbRow | undefined> {
  const id = asUuid(stagingRecordId);
  if (!id) return undefined;
  const result = await client.query<DbRow>(
    `select sr.*
     from staging_records sr
     join extraction_jobs ej on ej.id = sr.extraction_job_id
     join assets a on a.id = ej.asset_id
     where sr.id = $1::uuid
       and a.tenant_id = $2::uuid
     limit 1${forUpdate ? ' for update of sr' : ''}`,
    [id, tenantId]
  );
  return result.rows[0];
}

function hasEvidenceReference(sourceReference: Record<string, unknown>, sourceEvidenceFileId?: string | null): boolean {
  return Boolean(
    sourceEvidenceFileId
      || asString(sourceReference.evidence_file_id)
      || asString(sourceReference.evidence_code)
      || asString(sourceReference.source_file_name)
  );
}

function confidenceBand(score: number | null): 'high' | 'medium' | 'low' | 'invalid' {
  if (score === null || score < 0 || score > 1) return 'invalid';
  if (score >= 0.9) return 'high';
  if (score >= 0.75) return 'medium';
  return 'low';
}

function prepareField(input: FieldInput, sourceEvidenceFileId?: string | null): PreparedField {
  const fieldPath = asString(input.field_path) ?? asString(input.field_name) ?? '';
  const fieldName = asString(input.field_name) ?? fieldPath;
  const sourceReference = isPlainObject(input.source_reference) ? input.source_reference : {};
  const confidenceScore = asNumber(input.confidence_score) ?? null;
  const rawFlags = asStringArray(input.validation_flags);
  const flags = new Set<string>(rawFlags);
  const dataQualityChecks: PreparedField['dataQualityChecks'] = [];

  function addFlag(code: string, message: string, severity: 'warning' | 'high' | 'critical' | 'blocking', blocking = severity === 'critical' || severity === 'blocking'): void {
    flags.add(code);
    dataQualityChecks.push({
      code,
      severity,
      status: blocking ? 'blocked' : 'failed',
      message,
      blocking
    });
  }

  const attemptedStatus = asString(input.field_status);
  if (attemptedStatus && ['approved_by_engineer', 'corrected_by_engineer', 'rejected_by_engineer'].includes(attemptedStatus)) {
    addFlag('AI_ATTEMPTED_APPROVAL_OR_DECISION', 'AI payload attempted to set a human-only review status.', 'blocking', true);
  }

  if (!fieldPath || !fieldName) {
    addFlag('REQUIRED_FIELD_MISSING', 'field_path and field_name are required for extracted fields.', 'critical', true);
  }

  if (!hasEvidenceReference(sourceReference, sourceEvidenceFileId)) {
    addFlag('MISSING_EVIDENCE_REFERENCE', 'Every extracted field must include evidence source reference.', 'critical', true);
  }

  const band = confidenceBand(confidenceScore);
  if (band === 'invalid') {
    addFlag('INVALID_CONFIDENCE_SCORE', 'confidence_score must be numeric between 0.00 and 1.00.', 'critical', true);
  } else if (band === 'low') {
    addFlag('LOW_CONFIDENCE_FIELD', 'Low-confidence extracted field requires engineer review with evidence side-by-side.', 'high', false);
  } else if (band === 'medium') {
    addFlag('MEDIUM_CONFIDENCE_FIELD', 'Medium-confidence extracted field requires engineer review before promotion.', 'warning', false);
  }

  const unit = asString(input.unit) ?? null;
  const fieldNameLower = fieldName.toLowerCase();
  if ((fieldNameLower.includes('thickness') || fieldNameLower.includes('diameter') || fieldNameLower.includes('height')) && unit && unit.toLowerCase() !== 'mm') {
    addFlag('UNIT_MISMATCH', 'MVP thickness/dimension extraction requires explicit mm unit or engineer correction.', 'high', true);
  }

  const extractedValue = input.extracted_value === undefined || input.extracted_value === null ? null : String(input.extracted_value);
  const normalizedValue = input.normalized_value === undefined || input.normalized_value === null ? extractedValue : String(input.normalized_value);
  const hasBlockingFlag = dataQualityChecks.some((check) => check.blocking);
  const reviewRequired = band !== 'high' || flags.size > 0;
  const fieldStatus = hasBlockingFlag ? 'invalid' : reviewRequired ? 'needs_review' : 'ai_extracted';

  return {
    fieldPath: fieldPath || `field_${Date.now()}`,
    fieldName: fieldName || fieldPath || 'unknown_field',
    extractedValue,
    normalizedValue,
    unit,
    sourceReference,
    confidenceScore,
    fieldStatus,
    reviewRequired,
    validationFlags: Array.from(flags),
    dataQualityChecks,
    targetEntityType: asString(input.target_entity_type) ?? null,
    targetEntityId: asUuid(input.target_entity_id),
    targetTable: asString(input.target_table) ?? null,
    targetColumn: asString(input.target_column) ?? null
  };
}

function mapExtractionJob(row: DbRow): Record<string, unknown> {
  return {
    extraction_job_id: row.id,
    extraction_job_code: row.extraction_job_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    source_evidence_file_id: row.source_evidence_file_id,
    schema_name: row.schema_name,
    schema_version: row.schema_version,
    prompt_version: row.prompt_version,
    extraction_purpose: row.extraction_purpose,
    status: row.status,
    staging_only_flag: row.staging_only_flag,
    failure_code: row.failure_code,
    failure_message: row.failure_message,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapExtractionField(row: DbRow): Record<string, unknown> {
  return {
    extraction_field_id: row.id,
    extraction_job_id: row.extraction_job_id,
    field_path: row.field_path,
    field_name: row.field_name,
    extracted_value: row.extracted_value,
    normalized_value: row.normalized_value,
    unit: row.unit,
    source_reference: row.source_reference_json,
    confidence_score: row.confidence_score === null || row.confidence_score === undefined ? null : Number(row.confidence_score),
    field_status: row.field_status,
    review_required: row.review_required,
    validation_flags: row.validation_flags,
    reviewer_id: row.reviewer_id,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapStagingRecord(row: DbRow): Record<string, unknown> {
  return {
    staging_record_id: row.id,
    extraction_job_id: row.extraction_job_id,
    extraction_field_id: row.extraction_field_id,
    target_entity_type: row.target_entity_type,
    target_entity_id: row.target_entity_id,
    target_table: row.target_table,
    target_column: row.target_column,
    proposed_value: row.proposed_value,
    normalized_value: row.normalized_value,
    unit: row.unit,
    review_status: row.review_status,
    promotion_status: row.promotion_status,
    reviewer_id: row.reviewer_id,
    reviewed_at: row.reviewed_at,
    promoted_by: row.promoted_by,
    promoted_at: row.promoted_at,
    manual_entry_flag: row.manual_entry_flag,
    metadata_json: row.metadata_json,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function insertPreparedField(client: PoolClient, jobId: string, prepared: PreparedField, createdBy: string | null): Promise<{ field: DbRow; staging: DbRow }> {
  const fieldResult = await client.query<DbRow>(
    `insert into extraction_fields(
      extraction_job_id, field_path, field_name, extracted_value, normalized_value, unit,
      source_reference_json, confidence_score, field_status, review_required, validation_flags
    ) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
    on conflict (extraction_job_id, field_path) do update set
      field_name = excluded.field_name,
      extracted_value = excluded.extracted_value,
      normalized_value = excluded.normalized_value,
      unit = excluded.unit,
      source_reference_json = excluded.source_reference_json,
      confidence_score = excluded.confidence_score,
      field_status = excluded.field_status,
      review_required = excluded.review_required,
      validation_flags = excluded.validation_flags,
      updated_at = now()
    returning *`,
    [
      jobId,
      prepared.fieldPath,
      prepared.fieldName,
      prepared.extractedValue,
      prepared.normalizedValue,
      prepared.unit,
      JSON.stringify(prepared.sourceReference),
      prepared.confidenceScore,
      prepared.fieldStatus,
      prepared.reviewRequired,
      prepared.validationFlags
    ]
  );
  const field = fieldResult.rows[0];

  const stagingResult = await client.query<DbRow>(
    `insert into staging_records(
      extraction_job_id, extraction_field_id, target_entity_type, target_entity_id, target_table, target_column,
      proposed_value, normalized_value, unit, review_status, promotion_status, created_by, metadata_json
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'not_promoted',$11,$12::jsonb)
    returning *`,
    [
      jobId,
      field?.id,
      prepared.targetEntityType,
      prepared.targetEntityId,
      prepared.targetTable,
      prepared.targetColumn,
      prepared.extractedValue,
      prepared.normalizedValue,
      prepared.unit,
      prepared.fieldStatus === 'ai_extracted' ? 'pending_review' : prepared.fieldStatus === 'invalid' ? 'returned_for_evidence' : 'pending_review',
      createdBy,
      JSON.stringify({ staging_only: true, source: 'ai_extraction' })
    ]
  );
  const staging = stagingResult.rows[0];

  for (const check of prepared.dataQualityChecks) {
    await client.query(
      `insert into data_quality_checks(
        extraction_job_id, extraction_field_id, staging_record_id, check_code, severity, check_status, message, is_blocking
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [jobId, field?.id, staging?.id, check.code, check.severity, check.status, check.message, check.blocking]
    );
  }

  return { field: field ?? {}, staging: staging ?? {} };
}

async function hasEvidenceLink(client: PoolClient, entityType: string, entityId: string, tenantId: string): Promise<boolean> {
  const result = await client.query(
    `select 1
     from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where el.linked_entity_type = $1
       and el.linked_entity_id = $2
       and ef.tenant_id = $3::uuid
     limit 1`,
    [entityType, entityId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function hasBlockingDataQualityChecks(client: PoolClient, stagingRecordId: string, tenantId: string): Promise<boolean> {
  const result = await client.query(
    `select 1
     from data_quality_checks dqc
     join staging_records sr on sr.id = dqc.staging_record_id
     join extraction_jobs ej on ej.id = sr.extraction_job_id
     join assets a on a.id = ej.asset_id
     where dqc.staging_record_id = $1
       and a.tenant_id = $2::uuid
       and dqc.is_blocking = true
       and dqc.check_status not in ('resolved','passed')
     limit 1`,
    [stagingRecordId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function findVerifiedEvidenceReference(
  client: PoolClient,
  params: { tenantId: string; extractionJobId?: string | null; extractionFieldId?: string | null; stagingRecordId?: string | null; sourceReference?: unknown; evidenceFileId?: string | null }
): Promise<{ evidence_file_id: string; evidence_code: string | null } | null> {
  const sourceEvidenceId = asUuid(isPlainObject(params.sourceReference) ? params.sourceReference.evidence_file_id : null);
  const explicitEvidenceId = asUuid(params.evidenceFileId) ?? sourceEvidenceId;
  const result = await client.query<{ evidence_file_id: string; evidence_code: string | null }>(
    `with candidates as (
       select ef.id as evidence_file_id, ef.evidence_code
       from evidence_files ef
       where $1::uuid is not null and ef.id = $1::uuid and ef.tenant_id = $5::uuid and ef.upload_status = 'verified'
       union
       select ef.id as evidence_file_id, ef.evidence_code
       from evidence_links el
       join evidence_files ef on ef.id = el.evidence_file_id
       where ef.upload_status = 'verified'
         and ef.tenant_id = $5::uuid
         and (
           ($2::uuid is not null and el.linked_entity_type = 'extraction_job' and el.linked_entity_id = $2::uuid)
           or ($3::uuid is not null and el.linked_entity_type = 'extraction_field' and el.linked_entity_id = $3::uuid)
           or ($4::uuid is not null and el.linked_entity_type = 'staging_record' and el.linked_entity_id = $4::uuid)
         )
       union
       select ef.id as evidence_file_id, ef.evidence_code
       from extraction_jobs ej
       join evidence_files ef on ef.id = ej.source_evidence_file_id
       join assets a on a.id = ej.asset_id
       where $2::uuid is not null and ej.id = $2::uuid and a.tenant_id = $5::uuid and ef.tenant_id = $5::uuid and ef.upload_status = 'verified'
       union
       select ef.id as evidence_file_id, ef.evidence_code
       from manual_overrides mo
       join evidence_files ef on ef.id = mo.evidence_file_id
       where ef.upload_status = 'verified'
         and ef.tenant_id = $5::uuid
         and (
           ($3::uuid is not null and mo.extraction_field_id = $3::uuid)
           or ($4::uuid is not null and mo.staging_record_id = $4::uuid)
         )
     )
     select evidence_file_id, evidence_code from candidates limit 1`,
    [
      explicitEvidenceId,
      params.extractionJobId ?? null,
      params.extractionFieldId ?? null,
      params.stagingRecordId ?? null,
      params.tenantId
    ]
  );
  return result.rows[0] ?? null;
}

async function hasVerifiedEvidenceLink(client: PoolClient, entityType: string, entityId: string, tenantId: string): Promise<boolean> {
  const result = await client.query(
    `select 1
     from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where el.linked_entity_type = $1
       and el.linked_entity_id = $2
       and ef.tenant_id = $3::uuid
       and ef.upload_status = 'verified'
     limit 1`,
    [entityType, entityId, tenantId]
  );
  return (result.rowCount ?? 0) > 0;
}

type PromotionGateResult = {
  gate: string;
  status: 'pass' | 'blocked';
  code?: string;
  message: string;
  metadata?: Record<string, unknown>;
};

async function buildPromotionGateResults(
  client: PoolClient,
  params: {
    req: Request;
    staging: DbRow;
    field?: DbRow | null;
    job?: DbRow | null;
    comment?: string | null;
  }
): Promise<{ canPromote: boolean; gates: PromotionGateResult[]; verifiedEvidence: { evidence_file_id: string; evidence_code: string | null } | null }> {
  const tenant = requireTenantContextFromRequest(params.req);
  const gates: PromotionGateResult[] = [];
  const actorId = actorUserId(params.req);
  const reviewStatus = String(params.staging.review_status ?? '');
  const fieldStatus = String(params.field?.field_status ?? '');
  const confidenceScore = params.field?.confidence_score === null || params.field?.confidence_score === undefined
    ? null
    : Number(params.field.confidence_score);
  const sourceReference = params.field?.source_reference_json ?? {};
  const evidenceRequired = sourceReferenceRequiresEvidence(sourceReference);

  function pass(gate: string, message: string, metadata: Record<string, unknown> = {}): void {
    gates.push({ gate, status: 'pass', message, metadata });
  }

  function block(gate: string, code: string, message: string, metadata: Record<string, unknown> = {}): void {
    gates.push({ gate, status: 'blocked', code, message, metadata });
  }

  if (!params.job) {
    block('extraction_job_exists', 'EXTRACTION_JOB_NOT_FOUND', 'Extraction job is required before staging promotion.');
  } else {
    pass('extraction_job_exists', 'Extraction job exists.', { extraction_job_id: params.job.id });
  }

  if (!params.field) {
    block('extraction_field_exists', 'EXTRACTION_FIELD_NOT_FOUND', 'Extraction field is required before staging promotion.');
  } else {
    pass('extraction_field_exists', 'Extraction field exists.', { extraction_field_id: params.field.id });
  }

  if (reviewStatus === 'rejected' || fieldStatus === 'rejected_by_engineer') {
    block('engineer_review_status', 'REJECTED_FIELD_CANNOT_BE_PROMOTED', 'Rejected AI extraction fields cannot be promoted.');
  } else if (!['approved_for_promotion', 'corrected'].includes(reviewStatus)) {
    block('engineer_review_status', 'ENGINEER_REVIEW_REQUIRED', 'Staging record must be approved or corrected by a human engineer before promotion.', { review_status: reviewStatus });
  } else {
    pass('engineer_review_status', 'Human engineer review status allows promotion.', { review_status: reviewStatus });
  }

  if (['invalid', 'rejected_by_validation'].includes(fieldStatus)) {
    block('field_validation_status', 'FIELD_VALIDATION_STATUS_BLOCKED', 'Invalid or validation-rejected fields cannot be promoted.', { field_status: fieldStatus });
  } else {
    pass('field_validation_status', 'Field validation status allows promotion.', { field_status: fieldStatus });
  }

  if (await hasBlockingDataQualityChecks(client, String(params.staging.id), tenant.tenantId)) {
    block('data_quality_checks', 'BLOCKING_DATA_QUALITY_CHECKS', 'Unresolved blocking data quality checks prevent promotion.');
  } else {
    pass('data_quality_checks', 'No unresolved blocking data quality checks were found.');
  }

  const stagingMetadata = isPlainObject(params.staging.metadata_json)
    ? params.staging.metadata_json
    : {};

  const lowConfidenceApprovedWithReason =
    stagingMetadata.low_confidence_or_flagged_approval_with_reason === true &&
    isMeaningfulReason(asString(stagingMetadata.rc3c_review_reason));

  if (
    confidenceScore !== null &&
    confidenceScore < 0.75 &&
    reviewStatus !== 'corrected' &&
    !lowConfidenceApprovedWithReason
  ) {
    block(
      'confidence_gate',
      'LOW_CONFIDENCE_REVIEW_RATIONALE_REQUIRED',
      'Low-confidence AI extraction fields require human correction or explicit human approval with meaningful rationale before promotion.',
      {
        confidence_score: confidenceScore,
        review_status: reviewStatus,
        low_confidence_approved_with_reason: false,
        legacy_code: 'LOW_CONFIDENCE_CORRECTION_REQUIRED'
      }
    );
  } else {
    pass(
      'confidence_gate',
      'Confidence gate satisfied.',
      {
        confidence_score: confidenceScore,
        review_status: reviewStatus,
        low_confidence_approved_with_reason: lowConfidenceApprovedWithReason
      }
    );
  }

  const reviewerId = asString(params.staging.reviewer_id ?? params.field?.reviewer_id);
  if (!reviewerId) {
    block('reviewer_identity', 'HUMAN_REVIEWER_REQUIRED', 'A human reviewer identity is required before promotion.');
  } else if (reviewerId === actorId) {
    block('segregation_of_duty', 'SEGREGATION_OF_DUTY_BLOCKED', 'Promoter must be independent from the reviewer for staging promotion.');
  } else {
    pass('segregation_of_duty', 'Segregation-of-duty check passed.', { reviewer_id: reviewerId, promoter_id: actorId });
  }

  let manualOverrideReasonOk = true;
  if (reviewStatus === 'corrected') {
    const overrideResult = await client.query<{ correction_reason: string | null }>(
      `select mo.correction_reason
       from manual_overrides mo
       left join staging_records sr on sr.id = mo.staging_record_id
       left join extraction_fields ef on ef.id = mo.extraction_field_id
       join extraction_jobs ej on ej.id = coalesce(sr.extraction_job_id, ef.extraction_job_id)
       join assets a on a.id = ej.asset_id
       where a.tenant_id = $3::uuid
         and (mo.staging_record_id = $1 or mo.extraction_field_id = $2)
       order by mo.created_at desc
       limit 1`,
      [params.staging.id, params.staging.extraction_field_id, tenant.tenantId]
    );
    const overrideReason = overrideResult.rows[0]?.correction_reason ?? null;
    manualOverrideReasonOk = isMeaningfulReason(overrideReason);
    if (!manualOverrideReasonOk) {
      block('manual_override_reason', 'MANUAL_OVERRIDE_REASON_REQUIRED', 'Corrected fields require a meaningful manual override reason.');
    } else {
      pass('manual_override_reason', 'Manual override reason is present and meaningful.');
    }
  }

  const verifiedEvidence = evidenceRequired
    ? await findVerifiedEvidenceReference(client, {
      tenantId: tenant.tenantId,
      extractionJobId: asString(params.staging.extraction_job_id),
      extractionFieldId: asString(params.staging.extraction_field_id),
      stagingRecordId: asString(params.staging.id),
      sourceReference
    })
    : null;
  if (evidenceRequired && !verifiedEvidence) {
    block(
      'verified_evidence_linkage',
      'VERIFIED_EVIDENCE_LINK_REQUIRED',
      'Verified object-storage evidence is required before promotion; metadata-only legacy evidence is not sufficient.',
      {
        engineer_review_evidence_gate: true,
        upload_status_required: 'verified'
      }
    );
  } else if (evidenceRequired) {
    pass(
      'verified_evidence_linkage',
      'Verified object-storage evidence is linked.',
      {
        engineer_review_evidence_gate: true,
        ...(verifiedEvidence ?? {})
      }
    );
  } else {
    pass(
      'verified_evidence_linkage',
      'Evidence was explicitly marked not required for this field.',
      {
        engineer_review_evidence_gate: true,
        evidence_required: false
      }
    );
  }

  const canPromote = gates.every((gate) => gate.status === 'pass') && manualOverrideReasonOk;
  return { canPromote, gates, verifiedEvidence };
}

async function persistPromotionGates(
  client: PoolClient,
  req: Request,
  entityId: string,
  gates: PromotionGateResult[]
): Promise<void> {
  for (const gate of gates) {
    await client.query(
      `insert into review_gates(entity_type, entity_id, gate_domain, gate_type, gate_status, blocking, evidence_link_required, checked_by, checked_at, metadata_json)
       values ('staging_record', $1, 'staging_promotion', $2, $3, true, $4, $5, now(), $6::jsonb)
       on conflict (entity_type, entity_id, gate_domain, gate_type) do update set
         gate_status = excluded.gate_status,
         checked_by = excluded.checked_by,
         checked_at = now(),
         evidence_link_required = excluded.evidence_link_required,
         metadata_json = excluded.metadata_json,
         updated_at = now()`,
      [
        entityId,
        gate.gate,
        gate.status === 'pass' ? 'pass' : 'blocked',
        gate.gate === 'verified_evidence_linkage',
        actorUserId(req),
        JSON.stringify({
          code: gate.code ?? null,
          message: gate.message,
          ...(gate.metadata ?? {})
        })
      ]
    );
  }
}

aiExtractionRouter.get('/extraction-jobs', requirePermission('ai_extraction.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const values: unknown[] = [tenant.tenantId];
    const filters = ['a.tenant_id = $1::uuid'];
    const assetId = asUuid(req.query.asset_id);
    const status = asString(req.query.status);
    if (assetId) {
      values.push(assetId);
      filters.push(`ej.asset_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`ej.status = $${values.length}`);
    }
    const result = await pool.query<DbRow>(
      `select ej.*
       from extraction_jobs ej
       join assets a on a.id = ej.asset_id
       where ${filters.join(' and ')}
       order by ej.created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapExtractionJob) });
  } catch (error) {
    next(error);
  }
});

aiExtractionRouter.post('/extraction-jobs', requirePermission('ai_extraction.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  const assetId = asUuid(req.body.asset_id);
  const inspectionEventId = asUuid(req.body.inspection_event_id);
  const sourceEvidenceFileId = asUuid(req.body.source_evidence_file_id);
  const schemaName = asString(req.body.schema_name);
  if (!assetId || !schemaName) {
    validationError(res, 'asset_id', 'asset_id and schema_name are required.');
    return;
  }

  const fields = Array.isArray(req.body.fields) ? req.body.fields : [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const asset = await client.query('select id from assets where id = $1 and tenant_id = $2::uuid and deleted_at is null', [assetId, tenant.tenantId]);
    if (asset.rowCount === 0) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found.' } });
      return;
    }
    if (inspectionEventId) {
      const inspection = await client.query('select id from inspection_events where id = $1 and asset_id = $2 and tenant_id = $3::uuid', [inspectionEventId, assetId, tenant.tenantId]);
      if (inspection.rowCount === 0) {
        await client.query('rollback');
        res.status(404).json({ error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspection event not found for asset.' } });
        return;
      }
    }
    if (sourceEvidenceFileId) {
      const evidence = await client.query('select id from evidence_files where id = $1 and asset_id = $2 and tenant_id = $3::uuid', [sourceEvidenceFileId, assetId, tenant.tenantId]);
      if (evidence.rowCount === 0) {
        await client.query('rollback');
        res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Source evidence not found for asset.' } });
        return;
      }
    }

    const jobCode = asString(req.body.extraction_job_code) ?? await nextExtractionJobCode(client, tenant.tenantId);
    const jobResult = await client.query<DbRow>(
      `insert into extraction_jobs(
        extraction_job_code, asset_id, inspection_event_id, source_evidence_file_id,
        schema_name, schema_version, prompt_version, extraction_purpose, status, created_by, metadata_json, started_at, completed_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now(),$12)
      returning *`,
      [
        jobCode,
        assetId,
        inspectionEventId,
        sourceEvidenceFileId,
        schemaName,
        asString(req.body.schema_version) ?? '1.0.0',
        asString(req.body.prompt_version) ?? null,
        asString(req.body.extraction_purpose) ?? null,
        fields.length > 0 ? 'completed' : 'queued',
        actorUserId(req),
        JSON.stringify({ ai_output_final: false, staging_only: true, ...(isPlainObject(req.body.metadata_json) ? req.body.metadata_json : {}) }),
        fields.length > 0 ? new Date().toISOString() : null
      ]
    );
    const job = jobResult.rows[0];
    const createdFields: Record<string, unknown>[] = [];
    const createdStaging: Record<string, unknown>[] = [];
    for (const rawField of fields) {
      if (!isPlainObject(rawField)) continue;
      const prepared = prepareField(rawField, sourceEvidenceFileId);
      const created = await insertPreparedField(client, String(job?.id), prepared, actorUserId(req));
      createdFields.push(mapExtractionField(created.field));
      createdStaging.push(mapStagingRecord(created.staging));
    }

    const auditLogId = await writeAudit(client, req, 'extraction_job.created', 'extraction_job', String(job?.id), null, mapExtractionJob(job ?? {}), {
      staging_only: true,
      field_count: createdFields.length
    });
    await client.query('commit');
    res.status(201).json({ data: { ...mapExtractionJob(job ?? {}), fields: createdFields, staging_records: createdStaging }, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

aiExtractionRouter.get('/extraction-jobs/:jobId', requirePermission('ai_extraction.read'), async (req, res, next) => {
  const jobId = req.params.jobId;
  try {
    const tenant = requireTenantContextFromRequest(req);
    const job = await loadExtractionJob(pool, jobId, tenant.tenantId);
    if (!job) {
      res.status(404).json({ error: { code: 'EXTRACTION_JOB_NOT_FOUND', message: 'Extraction job not found.' } });
      return;
    }
    const [fields, staging, quality] = await Promise.all([
      pool.query<DbRow>(
        `select ef.*
         from extraction_fields ef
         join extraction_jobs ej on ej.id = ef.extraction_job_id
         join assets a on a.id = ej.asset_id
         where ef.extraction_job_id = $1
           and a.tenant_id = $2::uuid
         order by ef.created_at`,
        [jobId, tenant.tenantId]
      ),
      pool.query<DbRow>(
        `select sr.*
         from staging_records sr
         join extraction_jobs ej on ej.id = sr.extraction_job_id
         join assets a on a.id = ej.asset_id
         where sr.extraction_job_id = $1
           and a.tenant_id = $2::uuid
         order by sr.created_at`,
        [jobId, tenant.tenantId]
      ),
      pool.query<DbRow>(
        `select dqc.*
         from data_quality_checks dqc
         join extraction_jobs ej on ej.id = dqc.extraction_job_id
         join assets a on a.id = ej.asset_id
         where dqc.extraction_job_id = $1
           and a.tenant_id = $2::uuid
         order by dqc.created_at`,
        [jobId, tenant.tenantId]
      )
    ]);
    res.json({
      data: {
        ...mapExtractionJob(job),
        fields: fields.rows.map(mapExtractionField),
        staging_records: staging.rows.map(mapStagingRecord),
        data_quality_checks: quality.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

aiExtractionRouter.post('/extraction-jobs/:jobId/fields', requirePermission('ai_extraction.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const fields = Array.isArray(req.body.fields) ? req.body.fields : [req.body];
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const job = await loadExtractionJob(client, req.params.jobId, tenant.tenantId, true);
    if (!job) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EXTRACTION_JOB_NOT_FOUND', message: 'Extraction job not found.' } });
      return;
    }
    const createdFields: Record<string, unknown>[] = [];
    const createdStaging: Record<string, unknown>[] = [];
    for (const rawField of fields) {
      if (!isPlainObject(rawField)) continue;
      const prepared = prepareField(rawField, asString(job.source_evidence_file_id));
      const created = await insertPreparedField(client, String(job.id), prepared, actorUserId(req));
      createdFields.push(mapExtractionField(created.field));
      createdStaging.push(mapStagingRecord(created.staging));
    }
    await client.query(
      `update extraction_jobs
       set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
       where id = $1
         and exists (
           select 1 from assets a
           where a.id = extraction_jobs.asset_id
             and a.tenant_id = $2::uuid
         )`,
      [req.params.jobId, tenant.tenantId]
    );
    const auditLogId = await writeAudit(client, req, 'extraction_field.created', 'extraction_job', String(job.id), null, { fields: createdFields }, { staging_only: true });
    await client.query('commit');
    res.status(201).json({ data: { fields: createdFields, staging_records: createdStaging }, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

aiExtractionRouter.post('/extraction-fields/:fieldId/review', requirePermission('ai_extraction.review'), async (req, res, next) => {
  if (!ensureHumanReviewerActor(req, res, 'review AI extracted fields')) return;
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const decision = asString(req.body.decision) as FieldDecision | undefined;
  if (!decision || !['approve', 'correct', 'reject'].includes(decision)) {
    validationError(res, 'decision', 'decision must be approve, correct, or reject.');
    return;
  }
  const reason = asString(req.body.reason ?? req.body.comment ?? req.body.correction_reason ?? req.body.rejection_reason);
  if ((decision === 'correct' || decision === 'reject') && !isMeaningfulReason(reason)) {
    validationError(res, 'reason', 'Correction and rejection require a meaningful human reason.', decision === 'correct' ? 'MANUAL_OVERRIDE_REASON_REQUIRED' : 'REJECTION_REASON_REQUIRED');
    return;
  }
  const correctedValue = req.body.corrected_value === undefined || req.body.corrected_value === null ? undefined : String(req.body.corrected_value);
  if (decision === 'correct' && correctedValue === undefined) {
    validationError(res, 'corrected_value', 'Correct decision requires corrected_value.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const before = await loadExtractionField(client, req.params.fieldId, tenant.tenantId, true);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EXTRACTION_FIELD_NOT_FOUND', message: 'Extraction field not found.' } });
      return;
    }
    const staging = await loadLatestStagingForField(client, req.params.fieldId, tenant.tenantId, true);
    if (!staging) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'STAGING_RECORD_NOT_FOUND', message: 'Staging record not found for field.' } });
      return;
    }
    if (['rejected_by_engineer', 'rejected_by_validation'].includes(String(before.field_status))) {
      await writeAudit(client, req, 'AI_FIELD_REJECTED', 'extraction_field', req.params.fieldId ?? null, mapExtractionField(before), mapExtractionField(before), {
        blocked_reason: 'Field already rejected.',
        legacy_event_alias: 'extraction_field.rejected_by_engineer'
      });
      await client.query('commit');
      controlledError(res, 409, 'FIELD_ALREADY_REJECTED', 'Rejected fields cannot be re-reviewed without a new extraction run.');
      return;
    }

    const confidenceScore = before.confidence_score === null || before.confidence_score === undefined ? null : Number(before.confidence_score);
    const validationFlags = Array.isArray(before.validation_flags) ? before.validation_flags : [];
    if (decision === 'approve' && (confidenceScore === null || confidenceScore < 0.75 || validationFlags.length > 0) && !isMeaningfulReason(reason)) {
      await writeAudit(client, req, 'AI_FIELD_REVIEW_BLOCKED', 'extraction_field', req.params.fieldId ?? null, mapExtractionField(before), mapExtractionField(before), {
        blocked_reason: 'Low-confidence or validation-flagged approval requires reviewer rationale.',
        confidence_score: confidenceScore,
        validation_flags: validationFlags
      });
      await client.query('commit');
      validationError(res, 'reason', 'Approval of low-confidence or validation-flagged fields requires a meaningful reviewer rationale.', 'REVIEW_RATIONALE_REQUIRED');
      return;
    }

    const lowConfidenceOrFlagged =
      confidenceScore === null || confidenceScore < 0.75 || validationFlags.length > 0;

    const reviewMetadata = {
      rc3c_review_reason: reason ?? null,
      low_confidence_or_flagged_approval_with_reason:
        decision === 'approve' && lowConfidenceOrFlagged && isMeaningfulReason(reason)
    };

    const explicitEvidenceFileId = asUuid(req.body.evidence_file_id);

    const sourceRequiresEvidence = sourceReferenceRequiresEvidence(before.source_reference_json);

    const evidenceRequiredForDecision =
      decision !== 'reject' && sourceRequiresEvidence;

    const verifiedEvidence = sourceRequiresEvidence || explicitEvidenceFileId
      ? await findVerifiedEvidenceReference(client, {
          tenantId: tenant.tenantId,
          extractionJobId: asString(before.extraction_job_id),
          extractionFieldId: req.params.fieldId,
          stagingRecordId: asString(staging.id),
          sourceReference: before.source_reference_json,
          evidenceFileId: explicitEvidenceFileId
        })
      : null;

    if (explicitEvidenceFileId && !verifiedEvidence) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file was not found in the current tenant or is not verified.' } });
      return;
    }

    if (evidenceRequiredForDecision && !verifiedEvidence) {
      await writeAudit(
        client, 
        req, 
        'AI_FIELD_REVIEW_BLOCKED', 
        'extraction_field', 
        req.params.fieldId ?? null, 
        mapExtractionField(before), 
        mapExtractionField(before), 
        {
          blocked_reason: 'Verified object-storage evidence is required before approve/correct.',
        decision,
        upload_status_required: 'verified'
        }
      );

      await client.query('commit');
      
      controlledError(
        res, 
        409, 
        'VERIFIED_EVIDENCE_LINK_REQUIRED', 
        'Verified object-storage evidence linkage is required before approving or correcting this extracted field.', 
        {
          decision,
          upload_status_required: 'verified'
        }
      );
      
      return;
    }

    const newFieldStatus = decision === 'approve' ? 'approved_by_engineer' : decision === 'correct' ? 'corrected_by_engineer' : 'rejected_by_engineer';
    const newReviewStatus = decision === 'approve' ? 'approved_for_promotion' : decision === 'correct' ? 'corrected' : 'rejected';
    const newValue = decision === 'correct' ? correctedValue : asString(before.normalized_value) ?? asString(before.extracted_value) ?? null;
    const updatedFieldResult = await client.query<DbRow>(
      `update extraction_fields
       set field_status = $2,
           normalized_value = coalesce($3, normalized_value),
           unit = coalesce($4, unit),
           reviewer_id = $5,
           reviewed_at = now(),
           updated_at = now()
       where id = $1
         and exists (
           select 1 from extraction_jobs ej
           join assets a on a.id = ej.asset_id
           where ej.id = extraction_fields.extraction_job_id
             and a.tenant_id = $6::uuid
         )
       returning *`,
      [req.params.fieldId, newFieldStatus, decision === 'correct' ? correctedValue : null, asString(req.body.corrected_unit), actorUserId(req), tenant.tenantId]
    );
    const updatedStagingResult = await client.query<DbRow>(
      `update staging_records
      set review_status = $2,
          normalized_value = coalesce($3, normalized_value),
          unit = coalesce($4, unit),
          reviewer_id = $5,
          reviewed_at = now(),
          metadata_json = coalesce(metadata_json, '{}'::jsonb) || $6::jsonb,
          updated_at = now()
      where id = $1
        and exists (
          select 1 from extraction_jobs ej
          join assets a on a.id = ej.asset_id
          where ej.id = staging_records.extraction_job_id
            and a.tenant_id = $7::uuid
        )
      returning *`,
      [
        staging.id,
        newReviewStatus,
        newValue,
        asString(req.body.corrected_unit),
        actorUserId(req),
        JSON.stringify(reviewMetadata),
        tenant.tenantId
      ]
    );

    let manualOverride: DbRow | null = null;
    if (decision === 'correct') {
      const evidenceReference = isPlainObject(req.body.evidence_reference) ? req.body.evidence_reference : {};
      const manualResult = await client.query<DbRow>(
        `insert into manual_overrides(
          staging_record_id, extraction_field_id, original_value, corrected_value, corrected_unit,
          correction_reason, reviewer_id, evidence_file_id, evidence_reference_json
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) returning *`,
        [
          staging.id,
          req.params.fieldId,
          asString(before.extracted_value) ?? null,
          correctedValue,
          asString(req.body.corrected_unit) ?? asString(before.unit) ?? null,
          reason,
          actorUserId(req),
          verifiedEvidence?.evidence_file_id ?? null,
          JSON.stringify({ ...evidenceReference, evidence_file_id: verifiedEvidence?.evidence_file_id ?? null })
        ]
      );
      manualOverride = manualResult.rows[0] ?? null;
      await writeAudit(client, req, 'AI_FIELD_OVERRIDE_RECORDED', 'manual_override', String(manualOverride?.id ?? ''), null, manualOverride, {
        extraction_job_id: before.extraction_job_id,
        extraction_field_id: req.params.fieldId,
        staging_record_id: staging.id,
        field_name: before.field_name,
        original_value: asString(before.extracted_value) ?? null,
        corrected_value: correctedValue,
        evidence_id: verifiedEvidence?.evidence_file_id ?? null,
        reason
      });
    }

    const eventType = decision === 'approve'
      ? 'AI_FIELD_APPROVED'
      : decision === 'correct'
        ? 'AI_FIELD_CORRECTED'
        : 'AI_FIELD_REJECTED';
    const legacyEventAlias = decision === 'approve'
      ? 'extraction_field.approved_by_engineer'
      : decision === 'correct'
        ? 'manual_override.created'
        : 'extraction_field.rejected_by_engineer';
    const auditLogId = await writeAudit(client, req, eventType, 'extraction_field', req.params.fieldId ?? null, mapExtractionField(before), mapExtractionField(updatedFieldResult.rows[0] ?? {}), {
      legacy_event_alias: legacyEventAlias,
      decision,
      extraction_job_id: before.extraction_job_id,
      staging_record_id: staging.id,
      manual_override_id: manualOverride?.id ?? null,
      reason: reason ?? null,
      field_name: before.field_name,
      validation_status: before.field_status,
      confidence_score: confidenceScore,
      evidence_id: verifiedEvidence?.evidence_file_id ?? null
    });
    await client.query('commit');
    res.json({
      data: {
        field: mapExtractionField(updatedFieldResult.rows[0] ?? {}),
        staging_record: mapStagingRecord(updatedStagingResult.rows[0] ?? {}),
        manual_override: manualOverride,
        review_governance: {
          human_review_required: true,
          verified_evidence_required: sourceReferenceRequiresEvidence(before.source_reference_json),
          verified_evidence_id: verifiedEvidence?.evidence_file_id ?? null
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

aiExtractionRouter.get('/extraction-jobs/:jobId/promotion-readiness', requirePermission('ai_extraction.read'), async (req, res, next) => {
  const jobId = req.params.jobId;
  try {
    const tenant = requireTenantContextFromRequest(req);
    const job = await loadExtractionJob(pool, jobId, tenant.tenantId);
    if (!job) {
      res.status(404).json({ error: { code: 'EXTRACTION_JOB_NOT_FOUND', message: 'Extraction job not found.' } });
      return;
    }
    const stagingResult = await pool.query<DbRow>(
      `select sr.*, ef.field_status, ef.field_name, ef.confidence_score, ef.validation_flags, ef.source_reference_json, ef.reviewer_id as field_reviewer_id
       from staging_records sr
       join extraction_jobs ej on ej.id = sr.extraction_job_id
       join assets a on a.id = ej.asset_id
       left join extraction_fields ef on ef.id = sr.extraction_field_id
       where sr.extraction_job_id = $1
         and a.tenant_id = $2::uuid
       order by sr.created_at`,
      [jobId, tenant.tenantId]
    );
    const client = await pool.connect();
    try {
      const readiness = [];
      for (const staging of stagingResult.rows) {
        const field = staging.extraction_field_id
          ? {
            id: staging.extraction_field_id,
            extraction_job_id: staging.extraction_job_id,
            field_status: staging.field_status,
            field_name: staging.field_name,
            confidence_score: staging.confidence_score,
            validation_flags: staging.validation_flags,
            source_reference_json: staging.source_reference_json,
            reviewer_id: staging.field_reviewer_id
          }
          : null;
        const result = await buildPromotionGateResults(client, { req, staging, field, job });
        readiness.push({
          staging_record_id: staging.id,
          extraction_field_id: staging.extraction_field_id,
          can_promote: result.canPromote,
          gates: result.gates
        });
      }
      res.json({
        data: {
          extraction_job_id: jobId,
          can_promote: readiness.length > 0 && readiness.every((item) => item.can_promote),
          staging_records: readiness
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

aiExtractionRouter.post('/extraction-jobs/:jobId/promote', requirePermission('ai_extraction.promote'), async (req, res, next) => {
  if (!ensureHumanReviewerActor(req, res, 'promote AI staging records')) return;
  const jobId = asString(req.params.jobId);

  if (!jobId) {
    validationError(res, 'jobId', 'extraction job id is required.', 'EXTRACTION_JOB_ID_REQUIRED');
    return;
  }
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const comment = asString(req.body.comment ?? req.body.reason);
  if (!isMeaningfulReason(comment)) {
    validationError(res, 'comment', 'Promotion requires a meaningful reviewer comment/reason.', 'PROMOTION_REASON_REQUIRED');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const job = await loadExtractionJob(client, jobId, tenant.tenantId, true);
    if (!job) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EXTRACTION_JOB_NOT_FOUND', message: 'Extraction job not found.' } });
      return;
    }
    const stagingResult = await client.query<DbRow>(
      `select sr.*
       from staging_records sr
       join extraction_jobs ej on ej.id = sr.extraction_job_id
       join assets a on a.id = ej.asset_id
       where sr.extraction_job_id = $1
         and a.tenant_id = $2::uuid
       order by sr.created_at
       for update`,
      [jobId, tenant.tenantId]
    );
    if (stagingResult.rowCount === 0) {
      await writeAudit(client, req, 'AI_STAGING_PROMOTION_BLOCKED', 'extraction_job', jobId, mapExtractionJob(job), mapExtractionJob(job), {
        blocked_reason: 'No staging records exist for extraction job.',
        promotion_gate_results: [{ gate: 'staging_records_exist', status: 'blocked', code: 'NO_STAGING_RECORDS' }]
      });
      await client.query('commit');
      controlledError(res, 409, 'NO_STAGING_RECORDS', 'Extraction job has no staging records to promote.');
      return;
    }

    const readiness = [];
    for (const staging of stagingResult.rows) {
      const field = await loadExtractionField(client, asString(staging.extraction_field_id), tenant.tenantId, true) ?? null;
      const gateResult = await buildPromotionGateResults(client, { req, staging, field, job, comment });
      readiness.push({ staging, field, ...gateResult });
      await persistPromotionGates(client, req, String(staging.id), gateResult.gates);
    }

    const blocked = readiness.filter((item) => !item.canPromote);
    await writeAudit(client, req, 'AI_STAGING_PROMOTION_REQUESTED', 'extraction_job', jobId, mapExtractionJob(job), mapExtractionJob(job), {
      extraction_job_id: jobId,
      actor_user_id: actorUserId(req),
      staging_record_count: readiness.length,
      promotion_gate_results: readiness.map((item) => ({ staging_record_id: item.staging.id, gates: item.gates }))
    });

    if (blocked.length > 0) {
      await client.query(
        `update staging_records
         set promotion_status = 'blocked', updated_at = now()
         where extraction_job_id = $1 and id = any($2::uuid[])
           and exists (
             select 1 from extraction_jobs ej
             join assets a on a.id = ej.asset_id
             where ej.id = staging_records.extraction_job_id
               and a.tenant_id = $3::uuid
           )`,
        [jobId, blocked.map((item) => item.staging.id), tenant.tenantId]
      );
      await writeAudit(client, req, 'AI_STAGING_PROMOTION_BLOCKED', 'extraction_job', jobId, mapExtractionJob(job), mapExtractionJob(job), {
        blocked_reason: 'One or more staging promotion gates failed.',
        promotion_gate_results: readiness.map((item) => ({ staging_record_id: item.staging.id, gates: item.gates }))
      });
      await client.query('commit');
      controlledError(res, 409, 'PROMOTION_GATE_FAILED', 'AI staging promotion gates are not satisfied.', {
        promotion_gate_results: readiness.map((item) => ({ staging_record_id: item.staging.id, gates: item.gates }))
      });
      return;
    }

    const promoted = [];
    for (const item of readiness) {
      const result = await client.query<DbRow>(
        `update staging_records
         set review_status = 'promoted',
             promotion_status = 'promoted',
             promoted_by = $2,
             promoted_at = now(),
             updated_at = now(),
             metadata_json = metadata_json || $3::jsonb
         where id = $1
           and exists (
             select 1 from extraction_jobs ej
             join assets a on a.id = ej.asset_id
             where ej.id = staging_records.extraction_job_id
               and a.tenant_id = $4::uuid
           )
         returning *`,
        [
          item.staging.id,
          actorUserId(req),
          JSON.stringify({
            rc3c_promoted: true,
            promoted_from_ai_staging: true,
            final_table_mutation: false,
            promotion_comment: comment,
            verified_evidence_file_id: item.verifiedEvidence?.evidence_file_id ?? null
          }),
          tenant.tenantId
        ]
      );
      const updated = result.rows[0] ?? {};
      promoted.push(mapStagingRecord(updated));
      await writeAudit(client, req, 'AI_STAGING_PROMOTED', 'staging_record', String(item.staging.id), mapStagingRecord(item.staging), mapStagingRecord(updated), {
        legacy_event_alias: 'staging_record.promoted',
        extraction_job_id: jobId,
        staging_record_id: item.staging.id,
        extraction_field_id: item.staging.extraction_field_id,
        field_name: item.field?.field_name ?? null,
        evidence_id: item.verifiedEvidence?.evidence_file_id ?? null,
        promotion_gate_results: item.gates,
        final_table_mutation: false,
        comment
      });
    }

    await client.query(
      `update extraction_jobs
       set status = 'completed',
           metadata_json = metadata_json || $2::jsonb,
           updated_at = now()
       where id = $1
         and exists (
           select 1 from assets a
           where a.id = extraction_jobs.asset_id
             and a.tenant_id = $3::uuid
         )`,
      [
        jobId,
        JSON.stringify({
          rc3c_promotion_governance: 'passed',
          promoted_staging_record_count: promoted.length,
          final_table_mutation: false
        }),
        tenant.tenantId
      ]
    );

    await client.query('commit');
    res.json({
      data: {
        extraction_job_id: jobId,
        promoted_staging_records: promoted,
        final_table_mutation: false,
        promotion_gate_results: readiness.map((item) => ({ staging_record_id: item.staging.id, gates: item.gates }))
      }
    });
  } catch (error) {
    await client.query('rollback');
    try {
      const auditClient = await pool.connect();
      try {
        await writeAudit(auditClient, req, 'AI_STAGING_PROMOTION_FAILED', 'extraction_job', jobId, null, null, {
          blocked_reason: error instanceof Error ? error.message : 'Unknown promotion failure.'
        });
      } finally {
        auditClient.release();
      }
    } catch {
      // Preserve original failure path; audit failure must not mask API error.
    }
    next(error);
  } finally {
    client.release();
  }
});

aiExtractionRouter.post('/staging-records/:stagingRecordId/promote', requirePermission('ai_extraction.promote'), async (req, res, next) => {
  if (!ensureHumanReviewerActor(req, res, 'promote AI staging records')) return;
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const comment = asString(req.body.comment ?? req.body.reason);
  if (!isMeaningfulReason(comment)) {
    validationError(res, 'comment', 'Promotion requires a meaningful reviewer comment/reason.', 'PROMOTION_REASON_REQUIRED');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const before = await loadStagingRecord(client, req.params.stagingRecordId, tenant.tenantId, true);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'STAGING_RECORD_NOT_FOUND', message: 'Staging record not found.' } });
      return;
    }
    const field = await loadExtractionField(client, asString(before.extraction_field_id), tenant.tenantId, true) ?? null;
    const job = await loadExtractionJob(client, asString(before.extraction_job_id), tenant.tenantId, true) ?? null;

    const gateResult = await buildPromotionGateResults(client, { req, staging: before, field, job, comment });
    await persistPromotionGates(client, req, String(before.id), gateResult.gates);

    if (!gateResult.canPromote) {
      await client.query(
        `update staging_records
         set promotion_status = 'blocked', updated_at = now()
         where id = $1
           and exists (
             select 1 from extraction_jobs ej
             join assets a on a.id = ej.asset_id
             where ej.id = staging_records.extraction_job_id
               and a.tenant_id = $2::uuid
           )`,
        [req.params.stagingRecordId, tenant.tenantId]
      );
      await writeAudit(client, req, 'AI_STAGING_PROMOTION_BLOCKED', 'staging_record', String(before.id), mapStagingRecord(before), mapStagingRecord(before), {
        blocked_reason: 'Staging promotion gate failed.',
        extraction_job_id: before.extraction_job_id,
        staging_record_id: before.id,
        extraction_field_id: before.extraction_field_id,
        promotion_gate_results: gateResult.gates
      });
      await client.query('commit');
      controlledError(res, 409, 'PROMOTION_GATE_FAILED', 'AI staging promotion gates are not satisfied.', { promotion_gate_results: gateResult.gates });
      return;
    }

    const result = await client.query<DbRow>(
      `update staging_records
       set review_status = 'promoted',
           promotion_status = 'promoted',
           promoted_by = $2,
           promoted_at = now(),
           updated_at = now(),
           metadata_json = metadata_json || $3::jsonb
       where id = $1
         and exists (
           select 1 from extraction_jobs ej
           join assets a on a.id = ej.asset_id
           where ej.id = staging_records.extraction_job_id
             and a.tenant_id = $4::uuid
         )
       returning *`,
      [
        req.params.stagingRecordId,
        actorUserId(req),
        JSON.stringify({
          rc3c_promoted: true,
          promoted_from_ai_staging: true,
          final_table_mutation: false,
          promotion_comment: comment,
          verified_evidence_file_id: gateResult.verifiedEvidence?.evidence_file_id ?? null
        }),
        tenant.tenantId
      ]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'AI_STAGING_PROMOTED', 'staging_record', String(updated?.id), mapStagingRecord(before), mapStagingRecord(updated ?? {}), {
      legacy_event_alias: 'staging_record.promoted',
      comment,
      extraction_job_id: before.extraction_job_id,
      staging_record_id: before.id,
      extraction_field_id: before.extraction_field_id,
      evidence_id: gateResult.verifiedEvidence?.evidence_file_id ?? null,
      promotion_gate_results: gateResult.gates,
      evidence_link_required: true,
      final_table_mutation: false,
      note: 'Promotion state recorded; final table mapping remains deterministic and reviewed in later implementation.'
    });
    await client.query('commit');
    res.json({ data: mapStagingRecord(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
