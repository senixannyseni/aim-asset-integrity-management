import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const aiExtractionRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

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

async function nextExtractionJobCode(client: PoolClient): Promise<string> {
  const result = await client.query<{ count: string }>('select count(*)::text as count from extraction_jobs');
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `EXJ-${new Date().getUTCFullYear()}-${String(next).padStart(6, '0')}`;
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

async function hasEvidenceLink(client: PoolClient, entityType: string, entityId: string): Promise<boolean> {
  const result = await client.query('select 1 from evidence_links where linked_entity_type = $1 and linked_entity_id = $2 limit 1', [entityType, entityId]);
  return (result.rowCount ?? 0) > 0;
}

async function hasBlockingDataQualityChecks(client: PoolClient, stagingRecordId: string): Promise<boolean> {
  const result = await client.query(
    `select 1 from data_quality_checks
     where staging_record_id = $1 and is_blocking = true and check_status not in ('resolved','passed') limit 1`,
    [stagingRecordId]
  );
  return (result.rowCount ?? 0) > 0;
}

aiExtractionRouter.get('/extraction-jobs', requirePermission('ai_extraction.read'), async (req, res, next) => {
  try {
    const values: unknown[] = [];
    const filters = ['1 = 1'];
    const assetId = asUuid(req.query.asset_id);
    const status = asString(req.query.status);
    if (assetId) {
      values.push(assetId);
      filters.push(`asset_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    const result = await pool.query<DbRow>(`select * from extraction_jobs where ${filters.join(' and ')} order by created_at desc limit 100`, values);
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
    const asset = await client.query('select id from assets where id = $1 and deleted_at is null', [assetId]);
    if (asset.rowCount === 0) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found.' } });
      return;
    }
    if (inspectionEventId) {
      const inspection = await client.query('select id from inspection_events where id = $1 and asset_id = $2', [inspectionEventId, assetId]);
      if (inspection.rowCount === 0) {
        await client.query('rollback');
        res.status(404).json({ error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspection event not found for asset.' } });
        return;
      }
    }
    if (sourceEvidenceFileId) {
      const evidence = await client.query('select id from evidence_files where id = $1 and asset_id = $2', [sourceEvidenceFileId, assetId]);
      if (evidence.rowCount === 0) {
        await client.query('rollback');
        res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Source evidence not found for asset.' } });
        return;
      }
    }

    const jobCode = asString(req.body.extraction_job_code) ?? await nextExtractionJobCode(client);
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
    const jobResult = await pool.query<DbRow>('select * from extraction_jobs where id = $1', [jobId]);
    const job = jobResult.rows[0];
    if (!job) {
      res.status(404).json({ error: { code: 'EXTRACTION_JOB_NOT_FOUND', message: 'Extraction job not found.' } });
      return;
    }
    const [fields, staging, quality] = await Promise.all([
      pool.query<DbRow>('select * from extraction_fields where extraction_job_id = $1 order by created_at', [jobId]),
      pool.query<DbRow>('select * from staging_records where extraction_job_id = $1 order by created_at', [jobId]),
      pool.query<DbRow>('select * from data_quality_checks where extraction_job_id = $1 order by created_at', [jobId])
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
    const jobResult = await client.query<DbRow>('select * from extraction_jobs where id = $1 for update', [req.params.jobId]);
    const job = jobResult.rows[0];
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
    await client.query(`update extraction_jobs set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now() where id = $1`, [req.params.jobId]);
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
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const decision = asString(req.body.decision) as FieldDecision | undefined;
  if (!decision || !['approve', 'correct', 'reject'].includes(decision)) {
    validationError(res, 'decision', 'decision must be approve, correct, or reject.');
    return;
  }
  const reason = asString(req.body.reason ?? req.body.comment);
  if ((decision === 'correct' || decision === 'reject') && !reason) {
    validationError(res, 'reason', 'Correction and rejection require a reason.');
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
    const beforeResult = await client.query<DbRow>('select * from extraction_fields where id = $1 for update', [req.params.fieldId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EXTRACTION_FIELD_NOT_FOUND', message: 'Extraction field not found.' } });
      return;
    }
    const stagingResult = await client.query<DbRow>('select * from staging_records where extraction_field_id = $1 order by created_at desc limit 1 for update', [req.params.fieldId]);
    const staging = stagingResult.rows[0];
    if (!staging) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'STAGING_RECORD_NOT_FOUND', message: 'Staging record not found for field.' } });
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
       where id = $1 returning *`,
      [req.params.fieldId, newFieldStatus, decision === 'correct' ? correctedValue : null, asString(req.body.corrected_unit), actorUserId(req)]
    );
    const updatedStagingResult = await client.query<DbRow>(
      `update staging_records
       set review_status = $2,
           normalized_value = coalesce($3, normalized_value),
           unit = coalesce($4, unit),
           reviewer_id = $5,
           reviewed_at = now(),
           updated_at = now()
       where id = $1 returning *`,
      [staging.id, newReviewStatus, newValue, asString(req.body.corrected_unit), actorUserId(req)]
    );

    let manualOverride: DbRow | null = null;
    if (decision === 'correct') {
      const evidenceFileId = asUuid(req.body.evidence_file_id);
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
          evidenceFileId,
          JSON.stringify(evidenceReference)
        ]
      );
      manualOverride = manualResult.rows[0] ?? null;
    }

    const eventType = decision === 'approve'
      ? 'extraction_field.approved_by_engineer'
      : decision === 'correct'
        ? 'manual_override.created'
        : 'extraction_field.rejected_by_engineer';
    const auditLogId = await writeAudit(client, req, eventType, 'extraction_field', req.params.fieldId ?? null, mapExtractionField(before), mapExtractionField(updatedFieldResult.rows[0] ?? {}), {
      decision,
      staging_record_id: staging.id,
      manual_override_id: manualOverride?.id ?? null,
      reason: reason ?? null
    });
    await client.query('commit');
    res.json({
      data: {
        field: mapExtractionField(updatedFieldResult.rows[0] ?? {}),
        staging_record: mapStagingRecord(updatedStagingResult.rows[0] ?? {}),
        manual_override: manualOverride
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

aiExtractionRouter.post('/staging-records/:stagingRecordId/promote', requirePermission('ai_extraction.promote'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const comment = asString(req.body.comment ?? req.body.reason);
  if (!comment) {
    validationError(res, 'comment', 'Promotion requires a reviewer comment/reason.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from staging_records where id = $1 for update', [req.params.stagingRecordId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'STAGING_RECORD_NOT_FOUND', message: 'Staging record not found.' } });
      return;
    }
    if (!['approved_for_promotion', 'corrected'].includes(String(before.review_status))) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'ENGINEER_REVIEW_REQUIRED', message: 'Staging record must be approved or corrected by an engineer before promotion.' } });
      return;
    }
    if (await hasBlockingDataQualityChecks(client, String(before.id))) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'BLOCKING_DATA_QUALITY_CHECKS', message: 'Unresolved blocking data quality checks prevent promotion.' } });
      return;
    }
    const linkedEvidence = await hasEvidenceLink(client, 'staging_record', String(before.id));
    if (!linkedEvidence) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'EVIDENCE_LINK_REQUIRED', message: 'Evidence link to staging_record is required before promotion.' } });
      return;
    }

    const result = await client.query<DbRow>(
      `update staging_records
       set review_status = 'promoted', promotion_status = 'promoted', promoted_by = $2, promoted_at = now(), updated_at = now()
       where id = $1 returning *`,
      [req.params.stagingRecordId, actorUserId(req)]
    );
    const updated = result.rows[0];
    await client.query(
      `insert into review_gates(entity_type, entity_id, gate_domain, gate_type, gate_status, blocking, evidence_link_required, checked_by, checked_at, metadata_json)
       values ('staging_record', $1, 'staging_promotion', 'engineer_review_evidence_gate', 'pass', true, true, $2, now(), $3::jsonb)
       on conflict (entity_type, entity_id, gate_domain, gate_type) do update set
         gate_status = 'pass', checked_by = excluded.checked_by, checked_at = now(), metadata_json = excluded.metadata_json, updated_at = now()`,
      [before.id, actorUserId(req), JSON.stringify({ comment, no_final_table_mutation: true })]
    );
    const auditLogId = await writeAudit(client, req, 'staging_record.promoted', 'staging_record', String(updated?.id), mapStagingRecord(before), mapStagingRecord(updated ?? {}), {
      comment,
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
