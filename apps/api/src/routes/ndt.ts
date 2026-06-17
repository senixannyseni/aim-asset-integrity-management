import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { evaluateNdtEvidenceGate } from '../modules/ndt/governance.js';
import {
  asBoolean,
  asDateString,
  asInteger,
  asNumber,
  asString,
  isPlainObject,
  normalizeLengthToMeters,
  normalizeThicknessToMillimeters,
  validateNdtMeasurementPayload,
  type ValidationIssue
} from '../modules/ndt/validation.js';

export const ndtRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

type LinkedEvidenceRow = { evidence_file_id: string; asset_id: string | null };

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

function mapEvidence(row: DbRow | undefined): Record<string, unknown> | null {
  if (!row?.evidence_id) return null;
  return {
    evidence_id: row.evidence_id,
    evidence_code: row.evidence_code,
    file_name: row.file_name ?? row.original_filename,
    file_type: row.file_type ?? row.file_extension,
    object_storage_path: row.object_storage_path ?? row.object_storage_uri,
    checksum: row.checksum ?? row.checksum_sha256,
    status: row.evidence_status ?? row.evidence_file_status
  };
}

function mapNdt(row: DbRow): Record<string, unknown> {
  return {
    measurement_id: row.id,
    measurement_code: row.measurement_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    component: row.component,
    shell_course_no: row.shell_course_no,
    cml_tml_id: row.cml_tml_id,
    grid_ref: row.grid_ref,
    elevation: row.elevation_m,
    elevation_unit: 'm',
    orientation: row.orientation,
    measured_thickness: row.measured_thickness_mm,
    measured_thickness_unit: 'mm',
    reading_date: row.reading_date,
    method: row.method,
    confidence: row.confidence,
    evidence_file_id: row.evidence_file_id,
    extraction_source: row.extraction_source,
    reviewer_status: row.reviewer_status,
    validation_status: row.validation_status,
    validation_message: row.validation_message,
    is_critical: row.is_critical,
    evidence: mapEvidence(row),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function validateReviewerStatus(value: unknown): 'needs_review' | 'reviewed' | 'rejected' | undefined {
  const status = asString(value);
  if (status === 'needs_review' || status === 'reviewed' || status === 'rejected') return status;
  return undefined;
}

function validationStatusForEvidence(evidenceFileId: string | undefined, isCritical: boolean): { status: string; message: string } {
  if (evidenceFileId) {
    return { status: 'valid', message: 'NDT measurement has direct evidence_file_id.' };
  }

  if (isCritical) {
    return { status: 'blocked', message: 'Critical NDT measurement requires traceable evidence before approval.' };
  }

  return { status: 'warning', message: 'NDT measurement has no direct evidence; link evidence before approval if critical.' };
}

async function getLinkedEvidenceRows(client: PoolClient, measurementId: string): Promise<LinkedEvidenceRow[]> {
  const result = await client.query<LinkedEvidenceRow>(
    `select el.evidence_file_id, ef.asset_id
     from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where el.linked_entity_type = 'ndt_measurement' and el.linked_entity_id = $1`,
    [measurementId]
  );
  return result.rows;
}

function linkedEvidenceIds(rows: LinkedEvidenceRow[]): string[] {
  return rows.map((row) => row.evidence_file_id);
}

function sameAssetLinkedEvidenceIds(rows: LinkedEvidenceRow[], assetId: string): string[] {
  return rows.filter((row) => row.asset_id === assetId).map((row) => row.evidence_file_id);
}

function crossAssetLinkedEvidenceIds(rows: LinkedEvidenceRow[], assetId: string): string[] {
  return rows.filter((row) => row.asset_id !== assetId).map((row) => row.evidence_file_id);
}

function crossAssetEvidenceError(res: ApiResponse, invalidEvidenceFileIds: string[]): void {
  res.status(409).json({
    error: {
      code: 'CROSS_ASSET_EVIDENCE_LINK_BLOCKED',
      message: 'Linked evidence files for NDT approval must belong to the same asset as the NDT measurement.',
      details: { invalid_evidence_file_ids: invalidEvidenceFileIds }
    }
  });
}

async function loadNdtMeasurement(client: PoolClient, measurementId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>(
    `select nm.*, ef.id as evidence_id, ef.evidence_code, ef.file_name, ef.original_filename, ef.file_type, ef.file_extension,
            ef.object_storage_path, ef.object_storage_uri, ef.checksum, ef.checksum_sha256, ef.evidence_status, ef.status as evidence_file_status,
            ef.asset_id as direct_evidence_asset_id
     from ndt_measurements nm
     left join evidence_files ef on ef.id = nm.evidence_file_id
     where nm.id = $1`,
    [measurementId]
  );
  return result.rows[0];
}

async function nextMeasurementCode(client: PoolClient): Promise<string> {
  const result = await client.query<{ count: string }>('select count(*)::text as count from ndt_measurements');
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `NDT-${String(next).padStart(6, '0')}`;
}

async function createMeasurement(client: PoolClient, req: Request, body: Record<string, unknown>, source: 'manual' | 'bulk_import'): Promise<DbRow> {
  const issues = validateNdtMeasurementPayload(body);
  if (issues.length > 0) {
    const error = new Error('VALIDATION_FAILED');
    (error as Error & { validationIssues?: ValidationIssue[] }).validationIssues = issues;
    throw error;
  }

  const assetId = asString(body.asset_id);
  const component = asString(body.component);
  const measuredThicknessRaw = asNumber(body.measured_thickness);
  const readingDate = asDateString(body.reading_date);
  const method = asString(body.method);
  if (!assetId || !component || measuredThicknessRaw === undefined || !readingDate || !method) {
    throw new Error('NDT payload unexpectedly invalid after validation.');
  }

  const assetResult = await client.query('select id from assets where id = $1 and deleted_at is null', [assetId]);
  if (assetResult.rowCount === 0) {
    const error = new Error('ASSET_NOT_FOUND');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const inspectionEventId = asString(body.inspection_event_id) ?? null;
  if (inspectionEventId) {
    const inspectionResult = await client.query('select id from inspection_events where id = $1 and asset_id = $2', [inspectionEventId, assetId]);
    if (inspectionResult.rowCount === 0) {
      const error = new Error('INSPECTION_NOT_FOUND');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
  }

  const evidenceFileId = asString(body.evidence_file_id);
  if (evidenceFileId) {
    const evidenceResult = await client.query('select id from evidence_files where id = $1 and asset_id = $2', [evidenceFileId, assetId]);
    if (evidenceResult.rowCount === 0) {
      const error = new Error('EVIDENCE_NOT_FOUND');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
  }

  const isCritical = asBoolean(body.is_critical) ?? true;
  const validation = validationStatusForEvidence(evidenceFileId, isCritical);
  const measuredThicknessMm = normalizeThicknessToMillimeters(measuredThicknessRaw, asString(body.measured_thickness_unit) ?? 'mm');
  const elevationRaw = asNumber(body.elevation);
  const elevationM = elevationRaw === undefined ? null : normalizeLengthToMeters(elevationRaw, asString(body.elevation_unit) ?? 'm');
  const measurementCode = asString(body.measurement_code) ?? await nextMeasurementCode(client);

  const result = await client.query<DbRow>(
    `insert into ndt_measurements(
      measurement_code,
      asset_id,
      inspection_event_id,
      component,
      shell_course_no,
      cml_tml_id,
      grid_ref,
      elevation_m,
      orientation,
      measured_thickness_mm,
      reading_date,
      method,
      confidence,
      evidence_file_id,
      extraction_source,
      reviewer_status,
      validation_status,
      validation_message,
      is_critical,
      created_by
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'needs_review', $16, $17, $18, $19)
    returning *`,
    [
      measurementCode,
      assetId,
      inspectionEventId,
      component,
      asInteger(body.shell_course_no) ?? null,
      asString(body.cml_tml_id) ?? null,
      asString(body.grid_ref) ?? null,
      elevationM,
      asString(body.orientation) ?? null,
      measuredThicknessMm,
      readingDate,
      method,
      asNumber(body.confidence) ?? 1,
      evidenceFileId ?? null,
      asString(body.extraction_source) ?? source,
      validation.status,
      validation.message,
      isCritical,
      actorUserId(req)
    ]
  );
  return result.rows[0] ?? {};
}

ndtRouter.get('/ndt/measurements', requirePermission('ndt.read'), async (req, res, next) => {
  try {
    const values: string[] = [];
    const filters = ['1 = 1'];
    const assetId = asString(req.query.asset_id);
    const status = asString(req.query.reviewer_status);

    if (assetId) {
      values.push(assetId);
      filters.push(`nm.asset_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      filters.push(`nm.reviewer_status = $${values.length}`);
    }

    const result = await pool.query<DbRow>(
      `select nm.*, ef.id as evidence_id, ef.evidence_code, ef.file_name, ef.original_filename, ef.file_type, ef.file_extension,
              ef.object_storage_path, ef.object_storage_uri, ef.checksum, ef.checksum_sha256, ef.evidence_status, ef.status as evidence_file_status
       from ndt_measurements nm
       left join evidence_files ef on ef.id = nm.evidence_file_id
       where ${filters.join(' and ')}
       order by nm.created_at desc`,
      values
    );

    res.json({ data: result.rows.map(mapNdt) });
  } catch (error) {
    next(error);
  }
});

ndtRouter.get('/ndt/measurements/:measurementId', requirePermission('ndt.read'), async (req, res, next) => {
  const measurementId = req.params.measurementId;
  if (!measurementId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing measurementId.' } });
    return;
  }

  const client = await pool.connect();
  try {
    const row = await loadNdtMeasurement(client, measurementId);
    if (!row) {
      res.status(404).json({ error: { code: 'NDT_MEASUREMENT_NOT_FOUND', message: 'NDT measurement not found.' } });
      return;
    }
    const linkedEvidenceRows = await getLinkedEvidenceRows(client, measurementId);
    const assetId = String(row.asset_id);
    const validLinkedEvidenceIds = sameAssetLinkedEvidenceIds(linkedEvidenceRows, assetId);
    const invalidLinkedEvidenceIds = crossAssetLinkedEvidenceIds(linkedEvidenceRows, assetId);
    const directEvidenceFileId = typeof row.evidence_file_id === 'string' && (!row.direct_evidence_asset_id || row.direct_evidence_asset_id === row.asset_id)
      ? row.evidence_file_id
      : null;
    const evidenceGate = evaluateNdtEvidenceGate({
      isCritical: Boolean(row.is_critical),
      directEvidenceFileId,
      linkedEvidenceFileIds: validLinkedEvidenceIds
    });
    res.json({
      data: {
        ...mapNdt(row),
        linked_evidence_file_ids: linkedEvidenceIds(linkedEvidenceRows),
        valid_linked_evidence_file_ids: validLinkedEvidenceIds,
        invalid_linked_evidence_file_ids: invalidLinkedEvidenceIds,
        evidence_gate: evidenceGate
      }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

ndtRouter.post('/ndt/measurements', requirePermission('ndt.create'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const client = await pool.connect();
  try {
    await client.query('begin');
    const measurement = await createMeasurement(client, req, body, 'manual');
    const auditLogId = await writeAudit(client, req, 'NDT_MEASUREMENT_CREATED', 'ndt_measurement', String(measurement.id ?? ''), null, mapNdt(measurement), {
      module: 'ndt_data_room',
      source: 'manual'
    });
    await client.query('commit');
    res.status(201).json({ data: mapNdt(measurement), auditLogId });
  } catch (error) {
    await client.query('rollback');
    const validationIssues = (error as Error & { validationIssues?: ValidationIssue[] }).validationIssues;
    if (validationIssues) {
      validationError(res, validationIssues);
      return;
    }
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      res.status(404).json({ error: { code: error instanceof Error ? error.message : 'NOT_FOUND', message: 'Referenced NDT entity was not found.' } });
      return;
    }
    next(error);
  } finally {
    client.release();
  }
});

ndtRouter.post('/ndt/measurements/bulk-import', requirePermission('ndt.import'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const rows = Array.isArray(body.rows) ? body.rows : undefined;
  if (!rows || rows.length === 0 || !rows.every(isPlainObject)) {
    validationError(res, [{ field: 'rows', message: 'rows must be a non-empty array of NDT measurement objects.', severity: 'error' }]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const created: Record<string, unknown>[] = [];
    for (const row of rows) {
      const measurement = await createMeasurement(client, req, row, 'bulk_import');
      created.push(mapNdt(measurement));
    }

    const auditLogId = await writeAudit(client, req, 'NDT_MEASUREMENT_BULK_IMPORTED', 'ndt_measurement', null, null, created, {
      module: 'ndt_data_room',
      row_count: created.length
    });

    await client.query('commit');
    res.status(201).json({ data: { imported_count: created.length, measurements: created }, auditLogId });
  } catch (error) {
    await client.query('rollback');
    const validationIssues = (error as Error & { validationIssues?: ValidationIssue[] }).validationIssues;
    if (validationIssues) {
      validationError(res, validationIssues);
      return;
    }
    next(error);
  } finally {
    client.release();
  }
});

ndtRouter.post('/ndt/measurements/:measurementId/review', requirePermission('ndt.review'), async (req, res, next) => {
  const measurementId = req.params.measurementId;
  if (!measurementId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing measurementId.' } });
    return;
  }

  const body = ensureBody(req, res);
  if (!body) return;

  const reviewerStatus = validateReviewerStatus(body.reviewer_status);
  if (!reviewerStatus) {
    validationError(res, [{ field: 'reviewer_status', message: 'reviewer_status must be needs_review, reviewed, or rejected. Approval requires /approve endpoint.', severity: 'error' }]);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await loadNdtMeasurement(client, measurementId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'NDT_MEASUREMENT_NOT_FOUND', message: 'NDT measurement not found.' } });
      return;
    }

    const result = await client.query<DbRow>(
      `update ndt_measurements
       set reviewer_status = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
       where id = $1
       returning *`,
      [measurementId, reviewerStatus, actorUserId(req)]
    );
    const after = result.rows[0] ?? {};
    const auditLogId = await writeAudit(client, req, 'NDT_MEASUREMENT_REVIEWED', 'ndt_measurement', measurementId, mapNdt(before), mapNdt(after), {
      module: 'ndt_data_room',
      reviewer_status: reviewerStatus,
      comment: asString(body.comment) ?? null
    });

    await client.query('commit');
    res.json({ data: mapNdt(after), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

ndtRouter.post('/ndt/measurements/:measurementId/approve', requirePermission('ndt.approve'), async (req, res, next) => {
  const measurementId = req.params.measurementId;
  if (!measurementId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing measurementId.' } });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await loadNdtMeasurement(client, measurementId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'NDT_MEASUREMENT_NOT_FOUND', message: 'NDT measurement not found.' } });
      return;
    }

    const assetId = String(before.asset_id);
    const linkedEvidenceRows = await getLinkedEvidenceRows(client, measurementId);
    const invalidLinkedEvidenceIds = crossAssetLinkedEvidenceIds(linkedEvidenceRows, assetId);
    if (invalidLinkedEvidenceIds.length > 0) {
      await client.query('rollback');
      crossAssetEvidenceError(res, invalidLinkedEvidenceIds);
      return;
    }

    const directEvidenceFileId = typeof before.evidence_file_id === 'string' && (!before.direct_evidence_asset_id || before.direct_evidence_asset_id === before.asset_id)
      ? before.evidence_file_id
      : null;
    const evidenceGate = evaluateNdtEvidenceGate({
      isCritical: Boolean(before.is_critical),
      directEvidenceFileId,
      linkedEvidenceFileIds: sameAssetLinkedEvidenceIds(linkedEvidenceRows, assetId)
    });

    if (evidenceGate.status === 'blocked') {
      await client.query('rollback');
      res.status(409).json({
        error: {
          code: 'NDT_EVIDENCE_REQUIRED',
          message: evidenceGate.reason,
          details: { evidence_gate: evidenceGate }
        }
      });
      return;
    }

    const result = await client.query<DbRow>(
      `update ndt_measurements
       set reviewer_status = 'approved', validation_status = $2, validation_message = $3, approved_by = $4, approved_at = now(), updated_at = now()
       where id = $1
       returning *`,
      [measurementId, evidenceGate.status === 'warning' ? 'warning' : 'valid', evidenceGate.reason, actorUserId(req)]
    );
    const after = result.rows[0] ?? {};
    const auditLogId = await writeAudit(client, req, 'NDT_MEASUREMENT_APPROVED', 'ndt_measurement', measurementId, mapNdt(before), mapNdt(after), {
      module: 'ndt_data_room',
      evidence_gate: evidenceGate
    });

    await client.query('commit');
    res.json({ data: mapNdt(after), auditLogId, evidenceGate });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
