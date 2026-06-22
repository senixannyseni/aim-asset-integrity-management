import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { config } from '../config/env.js';
import { requirePermission } from '../middleware/rbac.js';
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

function mapEvidence(row: DbRow): Record<string, unknown> {
  return {
    evidence_id: row.id,
    evidence_code: row.evidence_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    object_storage_path: row.object_storage_path ?? row.object_storage_uri,
    object_storage_uri: row.object_storage_uri,
    file_name: row.file_name ?? row.original_filename,
    original_filename: row.original_filename,
    file_type: row.file_type ?? row.file_extension,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    inspection_date: row.inspection_date,
    method: row.method,
    component: row.component,
    location: row.location,
    page_or_sheet_ref: row.page_or_sheet_ref ?? row.page_figure_table_reference,
    uploaded_by: row.uploaded_by,
    checksum: row.checksum ?? row.checksum_sha256,
    status: row.evidence_status ?? row.status,
    malware_scan_status: row.malware_scan_status,
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

async function nextEvidenceCode(client: PoolClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const result = await client.query<{ count: string }>(
    `select count(*)::text as count from evidence_files where evidence_code like $1`,
    [`EVD-${year}-%`]
  );
  const next = Number(result.rows[0]?.count ?? '0') + 1;
  return `EVD-${year}-${String(next).padStart(6, '0')}`;
}

evidenceRouter.get('/evidence', requirePermission('evidence.read'), async (req, res, next) => {
  try {
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

    const result = await pool.query<DbRow>(
      `select * from evidence_files where ${filters.join(' and ')} order by created_at desc`,
      values
    );

    res.json({ data: result.rows.map(mapEvidence) });
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
    const evidenceResult = await pool.query<DbRow>('select * from evidence_files where id = $1', [evidenceId]);
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

function buildSignedEvidenceUrl(evidence: DbRow): { signed_url: string; expires_at: string } {
  const expiresAt = new Date(Date.now() + config.objectStorage.signedUrlTtlSeconds * 1000).toISOString();
  const storageUri = String(evidence.object_storage_path ?? evidence.object_storage_uri ?? '');
  const signature = createHash('sha256')
    .update(`${evidence.id}:${storageUri}:${expiresAt}:${config.authJwtSecret}`)
    .digest('hex');
  const encodedPath = encodeURIComponent(storageUri);
  return {
    signed_url: `/api/v1/evidence/${String(evidence.id)}/download?path=${encodedPath}&expires=${encodeURIComponent(expiresAt)}&signature=${signature}`,
    expires_at: expiresAt
  };
}

async function createEvidenceAccessResponse(req: Request, res: ApiResponse, evidenceId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<DbRow>('select * from evidence_files where id = $1 for update', [evidenceId]);
    const evidence = result.rows[0];
    if (!evidence) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }
    if (String(evidence.malware_scan_status ?? 'pending_scan') === 'infected') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'EVIDENCE_BLOCKED_BY_SCAN', message: 'Evidence access is blocked because malware scan status is infected.' } });
      return;
    }
    const signed = buildSignedEvidenceUrl(evidence);
    await client.query(`update evidence_files set accessed_at = now(), access_status = 'signed_url_issued', updated_at = now() where id = $1`, [evidenceId]);
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_SIGNED_URL_CREATED', 'evidence_file', evidenceId, null, { evidence_id: evidenceId, expires_at: signed.expires_at }, {
      signed_url_ttl_seconds: config.objectStorage.signedUrlTtlSeconds,
      object_storage_path_not_exposed_as_authority: true
    });
    await client.query('commit');
    res.json({
      data: {
        evidence_id: evidence.id,
        evidence_code: evidence.evidence_code,
        signed_url: signed.signed_url,
        expires_at: signed.expires_at,
        malware_scan_status: evidence.malware_scan_status ?? 'pending_scan',
        note: 'Signed URL is issued by AIM after RBAC check and access audit; object storage remains private.'
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
    await createEvidenceAccessResponse(req, res, evidenceId);
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get('/evidence/:evidenceId/download-url', requirePermission('evidence.open'), async (req, res, next) => {
  const evidenceId = req.params.evidenceId;
  if (!evidenceId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing evidenceId.' } });
    return;
  }
  try {
    await createEvidenceAccessResponse(req, res, evidenceId);
  } catch (error) {
    next(error);
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

  const client = await pool.connect();
  try {
    await client.query('begin');
    const assetId = asString(body.asset_id);
    if (!assetId) throw new Error('asset_id unexpectedly missing after validation.');

    const assetResult = await client.query<DbRow>('select id, asset_tag from assets where id = $1 and deleted_at is null', [assetId]);
    const asset = assetResult.rows[0];
    if (!asset) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found for evidence upload.' } });
      return;
    }

    const inspectionEventId = asString(body.inspection_event_id) ?? null;
    if (inspectionEventId) {
      const inspectionResult = await client.query('select id from inspection_events where id = $1 and asset_id = $2', [inspectionEventId, assetId]);
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

    const objectStoragePath = asString(body.object_storage_path) ?? buildEvidenceObjectPath({
      assetTag: String(asset.asset_tag),
      inspectionId: inspectionEventId,
      evidenceCode,
      fileName
    });
    const fileSizeBytes = asInteger(body.file_size_bytes) ?? 0;
    const mimeType = asString(body.mime_type) ?? mimeTypeFor(fileType);

    const result = await client.query<DbRow>(
      `insert into evidence_files(
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
        access_status
      ) values ($1, $2, $3, $4, $4, $5, $5, $6, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14, $14, $15, 'active', 'active', 'pending_scan', 'not_issued')
      on conflict (checksum_sha256, object_storage_uri) do update set
        method = excluded.method,
        component = excluded.component,
        location = excluded.location,
        page_or_sheet_ref = excluded.page_or_sheet_ref,
        updated_at = now()
      returning *`,
      [
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
    const auditLogId = await writeAudit(client, req, 'EVIDENCE_UPLOADED', 'evidence_file', String(evidence?.id ?? ''), null, mapEvidence(evidence ?? {}), {
      module: 'evidence_repository',
      object_storage_boundary: 'metadata_only_in_aim'
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
    const evidenceResult = await client.query<{ id: string; asset_id: string | null }>('select id, asset_id from evidence_files where id = $1', [evidenceId]);
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
    const beforeResult = await client.query<DbRow>('select * from evidence_files where id = $1 for update', [evidenceId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'EVIDENCE_NOT_FOUND', message: 'Evidence file not found.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update evidence_files
       set status = 'delete_requested', evidence_status = 'delete_requested', delete_requested_by = $2, delete_requested_at = now(), updated_at = now()
       where id = $1 returning *`,
      [evidenceId, actorUserId(req)]
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
    const beforeResult = await client.query<DbRow>('select * from evidence_files where id = $1 for update', [evidenceId]);
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
       where id = $1 returning *`,
      [evidenceId, actorUserId(req)]
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

