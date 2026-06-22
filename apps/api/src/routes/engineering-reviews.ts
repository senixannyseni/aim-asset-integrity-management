import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { hasPermission } from '../rbac/roles.js';

export const engineeringReviewsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;
type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

const REVIEW_STATUSES = [
  'draft',
  'submitted_for_review',
  'returned_for_revision',
  'reviewed',
  'submitted_for_approval',
  'approved',
  'rejected',
  'locked'
] as const;

const REVIEW_ENTITY_TYPES = ['asset', 'calculation_run', 'ndt_measurement', 'ffs_case', 'rbi_case', 'finding'] as const;

type ReviewStatus = typeof REVIEW_STATUSES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function uuidOrNull(value: unknown): string | null {
  const stringValue = asString(value);
  return isUuid(stringValue) ? stringValue : null;
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === 'string' && (REVIEW_STATUSES as readonly string[]).includes(value);
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

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function isSeniorApprovalActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('senior_engineer') || roles.includes('lead_engineer') || roles.includes('approver');
}

function isAiAgent(req: Request): boolean {
  return (req.user?.roles ?? []).includes('ai_agent');
}

function hasReqPermission(req: Request, permission: Parameters<typeof hasPermission>[1]): boolean {
  return hasPermission(req.user?.roles ?? [], permission);
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

function mapReview(row: DbRow): Record<string, unknown> {
  return {
    review_id: row.id,
    review_code: row.review_code,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    asset_id: row.asset_id,
    calculation_run_id: row.calculation_run_id,
    review_type: row.review_type,
    review_status: row.review_status,
    review_comment: row.review_comment,
    checklist: row.checklist_json,
    comments: row.comments_json,
    override: row.override_json,
    assigned_engineer: row.assigned_engineer,
    reviewer_id: row.reviewer_id,
    revision_no: row.revision_no,
    supersedes_review_id: row.supersedes_review_id,
    locked_flag: row.locked_flag,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    returned_at: row.returned_at,
    updated_at: row.updated_at,
    created_at: row.created_at
  };
}

function mapApproval(row: DbRow): Record<string, unknown> {
  return {
    approval_record_id: row.id,
    approval_code: row.approval_code,
    review_id: row.review_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    asset_id: row.asset_id,
    calculation_run_id: row.calculation_run_id,
    approval_type: row.approval_type,
    approval_status: row.approval_status,
    approval_comment: row.approval_comment,
    override: row.override_json,
    affected_field: row.affected_field,
    original_value: row.original_value_json,
    override_value: row.override_value_json,
    reason: row.reason,
    evidence_links: row.evidence_links,
    checklist: row.checklist_json,
    reviewer_user_id: row.reviewer_user_id,
    approver_id: row.approver_id,
    locked_flag: row.locked_flag,
    submitted_at: row.submitted_at,
    approved_at: row.approved_at,
    rejected_at: row.rejected_at,
    updated_at: row.updated_at,
    created_at: row.created_at
  };
}

async function loadCalculationRun(client: Queryable, calculationRunId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>('select * from calculation_runs where id = $1', [calculationRunId]);
  return result.rows[0];
}

async function resolveEntityContext(client: Queryable, entityType: string, entityId: string): Promise<{ assetId: string | null; calculationRunId: string | null }> {
  if (entityType === 'asset') return { assetId: entityId, calculationRunId: null };
  if (entityType === 'calculation_run') {
    const run = await loadCalculationRun(client, entityId);
    if (!run) return { assetId: null, calculationRunId: null };
    return { assetId: asString(run.asset_id) ?? null, calculationRunId: asString(run.id) ?? entityId };
  }
  if (entityType === 'ndt_measurement') {
    const result = await client.query<DbRow>('select asset_id from ndt_measurements where id = $1', [entityId]);
    return { assetId: asString(result.rows[0]?.asset_id) ?? null, calculationRunId: null };
  }
  if (entityType === 'ffs_case') {
    const result = await client.query<DbRow>('select asset_id, calculation_run_id from ffs_cases where id = $1', [entityId]);
    return { assetId: asString(result.rows[0]?.asset_id) ?? null, calculationRunId: asString(result.rows[0]?.calculation_run_id) ?? null };
  }
  if (entityType === 'rbi_case') {
    const result = await client.query<DbRow>('select asset_id, calculation_run_id from rbi_cases where id = $1', [entityId]);
    return { assetId: asString(result.rows[0]?.asset_id) ?? null, calculationRunId: asString(result.rows[0]?.calculation_run_id) ?? null };
  }
  return { assetId: null, calculationRunId: null };
}

function normalizeChecklist(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function normalizeEvidenceLinks(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainObject);
}

function normalizeOverridePayload(body: Record<string, unknown>): Record<string, unknown> | null {
  const overrideCandidate = isPlainObject(body.override) ? body.override : body;
  const affectedField = asString(overrideCandidate.affected_field ?? overrideCandidate.affectedField);
  const reason = asString(overrideCandidate.reason);
  const hasOriginal = Object.prototype.hasOwnProperty.call(overrideCandidate, 'original_value') || Object.prototype.hasOwnProperty.call(overrideCandidate, 'originalValue');
  const hasOverride = Object.prototype.hasOwnProperty.call(overrideCandidate, 'override_value') || Object.prototype.hasOwnProperty.call(overrideCandidate, 'overrideValue');
  const evidenceLinks = normalizeEvidenceLinks(overrideCandidate.evidence_links ?? overrideCandidate.evidenceLinks);
  const evidenceFileId = uuidOrNull(overrideCandidate.evidence_file_id ?? overrideCandidate.evidenceFileId);
  const hasEvidence = evidenceLinks.length > 0 || Boolean(evidenceFileId);

  if (!affectedField || !reason || !hasOriginal || !hasOverride || !hasEvidence) return null;

  return {
    affected_field: affectedField,
    original_value: overrideCandidate.original_value ?? overrideCandidate.originalValue,
    override_value: overrideCandidate.override_value ?? overrideCandidate.overrideValue,
    reason,
    evidence_file_id: evidenceFileId,
    evidence_links: evidenceLinks
  };
}

engineeringReviewsRouter.get('/engineering/reviews', requirePermission('engineering_review.read'), async (req, res, next) => {
  try {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const entityType = asString(req.query.entity_type);
    const entityId = asString(req.query.entity_id);
    const calculationRunId = asString(req.query.calculation_run_id);
    if (entityType) {
      values.push(entityType);
      clauses.push(`entity_type = $${values.length}`);
    }
    if (entityId) {
      values.push(entityId);
      clauses.push(`entity_id = $${values.length}`);
    }
    if (calculationRunId) {
      values.push(calculationRunId);
      clauses.push(`calculation_run_id = $${values.length}`);
    }
    const result = await pool.query<DbRow>(
      `select * from engineering_reviews
       ${clauses.length > 0 ? `where ${clauses.join(' and ')}` : ''}
       order by created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapReview) });
  } catch (error) {
    next(error);
  }
});

engineeringReviewsRouter.post('/engineering/reviews', requirePermission('engineering_review.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const entityType = asString(req.body.entity_type ?? req.body.entityType);
  const entityId = uuidOrNull(req.body.entity_id ?? req.body.entityId);
  if (!entityType || !(REVIEW_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    validationError(res, 'entity_type', `entity_type must be one of ${REVIEW_ENTITY_TYPES.join(', ')}.`);
    return;
  }
  if (!entityId) {
    validationError(res, 'entity_id', 'entity_id must be a valid UUID.');
    return;
  }
  const reviewStatus = asString(req.body.review_status ?? req.body.status) ?? 'draft';
  if (!isReviewStatus(reviewStatus)) {
    validationError(res, 'review_status', `review_status must be one of ${REVIEW_STATUSES.join(', ')}.`);
    return;
  }
  if (['approved', 'locked'].includes(reviewStatus)) {
    validationError(res, 'review_status', 'Use the approval workflow to approve or lock engineering results.', 'APPROVAL_WORKFLOW_REQUIRED');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const context = await resolveEntityContext(client, entityType, entityId);
    if (!context.assetId && entityType !== 'finding') {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REVIEW_ENTITY_NOT_FOUND', message: 'Review target was not found.' } });
      return;
    }
    const revisionResult = await client.query<{ next_revision: string }>(
      `select coalesce(max(revision_no), 0) + 1 as next_revision
       from engineering_reviews
       where entity_type = $1 and entity_id = $2`,
      [entityType, entityId]
    );
    const reviewCode = `REV-${Date.now()}-${revisionResult.rows[0]?.next_revision ?? '1'}`;
    const result = await client.query<DbRow>(
      `insert into engineering_reviews(
        review_code, entity_type, entity_id, asset_id, calculation_run_id, review_type,
        reviewer_id, assigned_engineer, review_status, review_comment, checklist_json,
        comments_json, revision_no, supersedes_review_id, submitted_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11::jsonb,
        $12::jsonb, $13, $14, $15, now()
      ) returning *`,
      [
        reviewCode,
        entityType,
        entityId,
        uuidOrNull(req.body.asset_id) ?? context.assetId,
        uuidOrNull(req.body.calculation_run_id) ?? context.calculationRunId,
        asString(req.body.review_type ?? req.body.reviewType) ?? 'engineering_review',
        actorUserId(req),
        uuidOrNull(req.body.assigned_engineer ?? req.body.assignedEngineer),
        reviewStatus,
        asString(req.body.review_comment ?? req.body.comment) ?? null,
        JSON.stringify(normalizeChecklist(req.body.checklist)),
        JSON.stringify([]),
        Number(revisionResult.rows[0]?.next_revision ?? '1'),
        uuidOrNull(req.body.supersedes_review_id ?? req.body.supersedesReviewId),
        reviewStatus === 'submitted_for_review' ? new Date().toISOString() : null
      ]
    );
    const created = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'ENGINEERING_REVIEW_CREATED', 'engineering_review', String(created?.id), null, mapReview(created ?? {}), {
      ai_cannot_approve_or_override: true,
      creates_revision_instead_of_editing_locked_record: true
    });
    await client.query('commit');
    res.status(201).json({ data: mapReview(created ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

engineeringReviewsRouter.get('/engineering/reviews/:reviewId', requirePermission('engineering_review.read'), async (req, res, next) => {
  try {
    const reviewId = asString(req.params.reviewId);
    const reviewResult = await pool.query<DbRow>('select * from engineering_reviews where id = $1', [reviewId]);
    const review = reviewResult.rows[0];
    if (!review) {
      res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Engineering review not found.' } });
      return;
    }
    const approvals = await pool.query<DbRow>('select * from approval_records where review_id = $1 order by created_at desc', [reviewId]);
    const audits = await pool.query<DbRow>(
      `select * from audit_logs
       where (entity_type = 'engineering_review' and entity_id = $1)
          or (entity_type = 'approval_record' and entity_id in (select id from approval_records where review_id = $1))
       order by created_at desc`,
      [reviewId]
    );
    res.json({ data: { ...mapReview(review), approvals: approvals.rows.map(mapApproval), audit_trail: audits.rows } });
  } catch (error) {
    next(error);
  }
});

engineeringReviewsRouter.patch('/engineering/reviews/:reviewId/status', requirePermission('engineering_review.update'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const status = asString(req.body.review_status ?? req.body.status);
  if (!isReviewStatus(status)) {
    validationError(res, 'review_status', `review_status must be one of ${REVIEW_STATUSES.join(', ')}.`);
    return;
  }
  if (['approved', 'locked'].includes(status)) {
    validationError(res, 'review_status', 'Use approval_records endpoints for approved or locked status.', 'APPROVAL_ENDPOINT_REQUIRED');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from engineering_reviews where id = $1', [req.params.reviewId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Engineering review not found.' } });
      return;
    }
    if (before.locked_flag === true || before.review_status === 'locked') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'LOCKED_RECORD_IMMUTABLE', message: 'Locked review records cannot be edited. Create a new revision.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update engineering_reviews
       set review_status = $2,
           review_comment = coalesce($3, review_comment),
           checklist_json = coalesce($4::jsonb, checklist_json),
           submitted_at = case when $2 = 'submitted_for_review' then now() else submitted_at end,
           returned_at = case when $2 = 'returned_for_revision' then now() else returned_at end,
           reviewed_at = case when $2 = 'reviewed' then now() else reviewed_at end,
           updated_at = now()
       where id = $1
       returning *`,
      [req.params.reviewId, status, asString(req.body.review_comment ?? req.body.comment) ?? null, isPlainObject(req.body.checklist) ? JSON.stringify(req.body.checklist) : null]
    );
    const updated = result.rows[0];
    if (updated?.calculation_run_id && status === 'reviewed') {
      await client.query(`update calculation_runs set review_status = 'reviewed', status = 'reviewed', reviewer_id = coalesce($2, reviewer_id), reviewed_at = now() where id = $1`, [updated.calculation_run_id, actorUserId(req)]);
    }
    const auditLogId = await writeAudit(client, req, 'ENGINEERING_REVIEW_STATUS_UPDATED', 'engineering_review', String(updated?.id), mapReview(before), mapReview(updated ?? {}), { status });
    await client.query('commit');
    res.json({ data: mapReview(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

engineeringReviewsRouter.post('/engineering/reviews/:reviewId/comments', requirePermission('engineering_review.comment'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const comment = asString(req.body.comment);
  if (!comment) {
    validationError(res, 'comment', 'comment is required.');
    return;
  }
  const commentRecord = {
    comment,
    author_user_id: actorUserId(req),
    author_roles: actorRoles(req),
    created_at: new Date().toISOString()
  };
  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from engineering_reviews where id = $1', [req.params.reviewId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REVIEW_NOT_FOUND', message: 'Engineering review not found.' } });
      return;
    }
    if (before.locked_flag === true || before.review_status === 'locked') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'LOCKED_RECORD_IMMUTABLE', message: 'Locked review records cannot be edited. Create a new revision.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update engineering_reviews
       set comments_json = comments_json || $2::jsonb,
           updated_at = now()
       where id = $1
       returning *`,
      [req.params.reviewId, JSON.stringify([commentRecord])]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'ENGINEERING_REVIEW_COMMENT_ADDED', 'engineering_review', String(updated?.id), mapReview(before), mapReview(updated ?? {}), { comment_added: true });
    await client.query('commit');
    res.status(201).json({ data: mapReview(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

engineeringReviewsRouter.get('/approval-records', requirePermission('approval_record.read'), async (req, res, next) => {
  try {
    const values: unknown[] = [];
    const clauses: string[] = [];
    const calculationRunId = asString(req.query.calculation_run_id);
    if (calculationRunId) {
      values.push(calculationRunId);
      clauses.push(`calculation_run_id = $${values.length}`);
    }
    const result = await pool.query<DbRow>(
      `select * from approval_records
       ${clauses.length > 0 ? `where ${clauses.join(' and ')}` : ''}
       order by created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapApproval) });
  } catch (error) {
    next(error);
  }
});

engineeringReviewsRouter.post('/approval-records', requirePermission('approval_record.create'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const reviewId = uuidOrNull(req.body.review_id ?? req.body.reviewId);
  const entityType = asString(req.body.entity_type ?? req.body.entityType) ?? 'calculation_run';
  const entityId = uuidOrNull(req.body.entity_id ?? req.body.entityId ?? req.body.calculation_run_id ?? req.body.calculationRunId);
  if (!entityId) {
    validationError(res, 'entity_id', 'entity_id or calculation_run_id must be a valid UUID.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const context = await resolveEntityContext(client, entityType, entityId);
    if (!context.assetId && entityType !== 'finding') {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'APPROVAL_ENTITY_NOT_FOUND', message: 'Approval target was not found.' } });
      return;
    }
    const approvalCode = `APR-${Date.now()}`;
    const result = await client.query<DbRow>(
      `insert into approval_records(
        approval_code, review_id, entity_type, entity_id, asset_id, calculation_run_id,
        approval_type, approval_status, reviewer_user_id, approval_comment, checklist_json,
        submitted_at, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, 'submitted_for_approval', $8, $9, $10::jsonb,
        now(), now(), now()
      ) returning *`,
      [
        approvalCode,
        reviewId,
        entityType,
        entityId,
        uuidOrNull(req.body.asset_id) ?? context.assetId,
        uuidOrNull(req.body.calculation_run_id) ?? context.calculationRunId ?? (entityType === 'calculation_run' ? entityId : null),
        asString(req.body.approval_type ?? req.body.approvalType) ?? 'final_result',
        actorUserId(req),
        asString(req.body.approval_comment ?? req.body.comment) ?? null,
        JSON.stringify(normalizeChecklist(req.body.checklist))
      ]
    );
    const created = result.rows[0];
    if (reviewId) {
      await client.query(`update engineering_reviews set review_status = 'submitted_for_approval', updated_at = now() where id = $1 and locked_flag = false`, [reviewId]);
    }
    const auditLogId = await writeAudit(client, req, 'APPROVAL_RECORD_CREATED', 'approval_record', String(created?.id), null, mapApproval(created ?? {}), { approval_workflow: true });
    await client.query('commit');
    res.status(201).json({ data: mapApproval(created ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

async function loadApprovalForUpdate(client: Queryable, approvalId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>('select * from approval_records where id = $1', [approvalId]);
  return result.rows[0];
}

function requireSeniorApprovalActor(req: Request, res: ApiResponse): boolean {
  if (isAiAgent(req)) {
    res.status(403).json({ error: { code: 'AI_AGENT_CANNOT_APPROVE_OR_OVERRIDE', message: 'AI agents cannot approve, reject, lock, or override engineering decisions.' } });
    return false;
  }
  if (!isSeniorApprovalActor(req) || !hasReqPermission(req, 'approval_record.approve')) {
    res.status(403).json({ error: { code: 'SENIOR_ENGINEER_APPROVAL_REQUIRED', message: 'Final approval requires senior_engineer or admin with approval_record.approve permission.' } });
    return false;
  }
  return true;
}

function hasRequiredApprovalComment(req: Request): boolean {
  return Boolean(isPlainObject(req.body) && asString(req.body.approval_comment ?? req.body.comment ?? req.body.reason));
}

function isSelfApprovalAttempt(req: Request, approval: DbRow): boolean {
  const actor = actorUserId(req);
  return Boolean(actor && (approval.reviewer_user_id === actor || approval.created_by === actor));
}

engineeringReviewsRouter.post('/approval-records/:approvalId/approve', requirePermission('approval_record.approve'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  if (!requireSeniorApprovalActor(req, res)) return;
  if (!hasRequiredApprovalComment(req)) {
    validationError(res, 'approval_comment', 'Approval requires approval_comment or comment for audit trail.', 'APPROVAL_COMMENT_REQUIRED');
    return;
  }

  const override = isPlainObject(req.body.override) || asString(req.body.affected_field ?? req.body.affectedField)
    ? normalizeOverridePayload(req.body)
    : null;
  if ((isPlainObject(req.body.override) || asString(req.body.affected_field ?? req.body.affectedField)) && !override) {
    validationError(res, 'override', 'Override approval requires affected_field, original_value, override_value, reason, and evidence.', 'OVERRIDE_REASON_AND_EVIDENCE_REQUIRED');
    return;
  }

  const approvalId = req.params.approvalId;

  if (!approvalId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'approvalId is required.'
      }
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await loadApprovalForUpdate(client, approvalId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'APPROVAL_RECORD_NOT_FOUND', message: 'Approval record not found.' } });
      return;
    }
    if (before.locked_flag === true || before.approval_status === 'locked') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'LOCKED_RECORD_IMMUTABLE', message: 'Locked approval records cannot be edited. Create a new revision.' } });
      return;
    }
    if (isSelfApprovalAttempt(req, before)) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'SEGREGATION_OF_DUTY_BLOCKED', message: 'The user who created/submitted an approval record cannot approve the same record.' } });
      return;
    }
  
    const result = await client.query<DbRow>(
      `update approval_records
       set approval_status = 'approved',
           approver_id = $2,
           approval_comment = coalesce($3, approval_comment),
           override_json = coalesce($4::jsonb, override_json),
           affected_field = coalesce($5, affected_field),
           original_value_json = coalesce($6::jsonb, original_value_json),
           override_value_json = coalesce($7::jsonb, override_value_json),
           reason = coalesce($8, reason),
           evidence_links = coalesce($9::jsonb, evidence_links),
           locked_flag = true,
           approved_at = now(),
           updated_at = now()
       where id = $1
       returning *`,
      [
        approvalId,
        actorUserId(req),
        asString(req.body.approval_comment ?? req.body.comment) ?? null,
        override ? JSON.stringify(override) : null,
        override ? asString(override.affected_field) ?? null : null,
        override ? JSON.stringify(override.original_value ?? null) : null,
        override ? JSON.stringify(override.override_value ?? null) : null,
        override ? asString(override.reason) ?? null : null,
        override ? JSON.stringify(override.evidence_links ?? []) : null
      ]
    );
    const updated = result.rows[0];

    if (updated?.review_id) {
      await client.query(`update engineering_reviews set review_status = 'approved', locked_flag = true, updated_at = now() where id = $1 and locked_flag = false`, [updated.review_id]);
    }
    if (updated?.calculation_run_id) {
      await client.query(
        `update calculation_runs
         set approval_status = 'approved',
             review_status = 'reviewed',
             status = 'locked',
             approver_id = $2,
             approved_at = now(),
             locked_at = now(),
             locked_flag = true
         where id = $1`,
        [updated.calculation_run_id, actorUserId(req)]
      );
    }
    const auditLogId = await writeAudit(client, req, override ? 'ENGINEERING_OVERRIDE_APPROVED' : 'APPROVAL_RECORD_APPROVED', 'approval_record', String(updated?.id), mapApproval(before), mapApproval(updated ?? {}), {
      senior_engineer_approval_required: true,
      ai_agent_blocked: true,
      locked_after_approval: true,
      override_approved: Boolean(override)
    });
    await client.query('commit');
    res.json({ data: mapApproval(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

engineeringReviewsRouter.post('/approval-records/:approvalId/reject', requirePermission('approval_record.reject'), async (req, res, next) => {
  const approvalId = req.params.approvalId;

  if (!approvalId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'approvalId is required.'
      }
    });
    return;
  }
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  if (!isSeniorApprovalActor(req) || isAiAgent(req)) {
    res.status(403).json({ error: { code: 'SENIOR_ENGINEER_REJECTION_REQUIRED', message: 'Rejecting final engineering approval requires senior_engineer or admin. AI agents cannot reject.' } });
    return;
  }
  if (!hasRequiredApprovalComment(req)) {
    validationError(res, 'reason', 'Rejection requires reason or comment for audit trail.', 'REJECTION_REASON_REQUIRED');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await loadApprovalForUpdate(client, approvalId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'APPROVAL_RECORD_NOT_FOUND', message: 'Approval record not found.' } });
      return;
    }
    if (before.locked_flag === true || before.approval_status === 'locked') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'LOCKED_RECORD_IMMUTABLE', message: 'Locked approval records cannot be edited. Create a new revision.' } });
      return;
    }
    if (isSelfApprovalAttempt(req, before)) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'SEGREGATION_OF_DUTY_BLOCKED', message: 'The user who created/submitted an approval record cannot reject the same record.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update approval_records
       set approval_status = 'rejected',
           approver_id = $2,
           approval_comment = coalesce($3, approval_comment),
           rejected_at = now(),
           updated_at = now()
       where id = $1
       returning *`,
      [approvalId, actorUserId(req), isPlainObject(req.body) ? asString(req.body.reason ?? req.body.comment) ?? null : null]
    );
    const updated = result.rows[0];
    if (updated?.review_id) {
      await client.query(`update engineering_reviews set review_status = 'rejected', updated_at = now() where id = $1 and locked_flag = false`, [updated.review_id]);
    }
    if (updated?.calculation_run_id) {
      await client.query(`update calculation_runs set approval_status = 'rejected', status = 'rejected', approver_id = $2 where id = $1 and locked_flag = false`, [updated.calculation_run_id, actorUserId(req)]);
    }
    const auditLogId = await writeAudit(client, req, 'APPROVAL_RECORD_REJECTED', 'approval_record', String(updated?.id), mapApproval(before), mapApproval(updated ?? {}), { ai_agent_blocked: true });
    await client.query('commit');
    res.json({ data: mapApproval(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
