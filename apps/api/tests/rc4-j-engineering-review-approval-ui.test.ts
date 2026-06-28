import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC4-J engineering review detail and approval UX hardening', () => {
  it('adds review detail route with structured checklist, comments, reject, override, and revision actions', () => {
    const page = readRepoFile('apps/web/app/reviews/[reviewId]/page.tsx');
    const client = readRepoFile('apps/web/app/reviews/[reviewId]/EngineeringReviewDetailClient.tsx');
    expect(page).toContain('EngineeringReviewDetailClient');
    expect(client).toContain('Structured checklist');
    expect(client).toContain('Threaded comments');
    expect(client).toContain('Reject with Reason');
    expect(client).toContain('Controlled override approval');
    expect(client).toContain('Create New Revision');
    expect(client).toContain('/revision');
    expect(client).toContain('rejection_reason');
    expect(client).toContain('affected_field');
    expect(client).toContain('evidence_file_id');
  });

  it('keeps frontend actions permission-aware for human roles and read-only actors', () => {
    const list = readRepoFile('apps/web/app/reviews/EngineeringReviewClient.tsx');
    const detail = readRepoFile('apps/web/app/reviews/[reviewId]/EngineeringReviewDetailClient.tsx');
    expect(list).toContain("apiFetch('/api/v1/auth/me'");
    expect(detail).toContain("apiFetch('/api/v1/auth/me'");
    expect(list).toContain("hasPermission(user, 'approval_record.create')");
    expect(detail).toContain("hasPermission(user, 'approval_record.approve')");
    expect(detail).toContain("hasPermission(user, 'approval_record.reject')");
    expect(detail).toContain("hasPermission(user, 'engineering_review.update')");
    expect(detail).toContain('reviewMutationLocked');
    expect(detail).toContain("approval.approval_status === 'submitted_for_approval'");
    expect(detail).not.toContain('review_status_confirmed');
  });

  it('hardens backend review gates before approval and prevents raw checklist bypass', () => {
    const route = readRepoFile('apps/api/src/routes/engineering-reviews.ts');
    expect(route).toContain('validateStructuredChecklistForReview');
    expect(route).toContain('STRUCTURED_CHECKLIST_REQUIRED');
    expect(route).toContain('REVIEW_COMPLETION_REQUIRED');
    expect(route).toContain('REVIEW_ID_REQUIRED');
    expect(route).toContain('APPROVAL_REVIEW_ENTITY_MISMATCH');
    expect(route).toContain('FINAL_APPROVAL_STATE_LOCKED');
    expect(route).toContain('REVIEW_STATUS_TRANSITION_REQUIRED');
    expect(route).toContain("['submitted_for_approval', 'approved', 'rejected', 'locked'].includes(status)");
    expect(route).toContain('REVIEW_MUTATION_STATE_LOCKED');
    expect(route).toContain('isReviewMutationLocked');
    expect(route).toContain("['reviewed', 'submitted_for_approval', 'approved', 'rejected', 'locked'].includes(reviewStatus)");
    expect(route).toContain("['reviewed', 'submitted_for_approval', 'approved', 'rejected', 'locked'].includes(status)");
    expect(route).toContain("review.review_status !== 'reviewed' || !review.reviewed_at");
    expect(route).toContain('ENGINEERING_REVIEW_REVISION_CREATED');
    expect(route).toContain('JSON.stringify(normalizeChecklist(review.checklist_json))');
    expect(route).toContain('APPROVAL_REVIEW_ASSET_CONTEXT_MISMATCH');
    expect(route).toContain('APPROVAL_REVIEW_CALCULATION_CONTEXT_MISMATCH');
    expect(route).toContain('const requestedEntityId = uuidOrNull(req.body.entity_id ?? req.body.entityId);');
    expect(route).toContain('const linkedReviewCalculationRunId = uuidOrNull(review.calculation_run_id);');
    expect(route).toContain("const expectedCalculationRunId = linkedReviewCalculationRunId ?? context.calculationRunId ?? (entityType === 'calculation_run' ? entityId : null);");
    expect(route).toContain('const expectedAssetId = linkedReviewAssetId ?? context.assetId;');
    expect(route).not.toContain('isPlainObject(req.body.checklist) ? req.body.checklist : normalizeChecklist(review.checklist_json)');
    expect(route).toContain('for update');
    expect(route).toContain('parent_comment_id');
    expect(route).toContain('thread_id');
  });

  it('aligns DB-backed approval authority with static RBAC for senior, lead, and approver roles while blocking AI', () => {
    const migration = readRepoFile('db/migrations/0010_engineering_review_approval_workflow.sql');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');
    expect(migration).toContain("where r.role_code in ('admin','senior_engineer','lead_engineer','approver')");
    expect(seed).toContain("where r.role_code in ('admin','senior_engineer','lead_engineer','approver')");
    expect(ROLE_PERMISSIONS.lead_engineer).toContain('approval_record.approve');
    expect(ROLE_PERMISSIONS.approver).toContain('approval_record.approve');
    expect(hasPermission(['ai_agent'], 'approval_record.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'approval_record.reject')).toBe(false);
  });

  it('replaces calculation raw JSON audit display with readable timeline and review links', () => {
    const detail = readRepoFile('apps/web/app/calculations/[runId]/CalculationDetailClient.tsx');
    expect(detail).toContain('readable audit timeline');
    expect(detail).toContain('Audit timeline');
    expect(detail).toContain('Raw audit fallback');
    expect(detail).toContain('href={`/reviews/${String(review.id)}`}');
    expect(detail).not.toContain('<h2>Reviews, approvals, and audit trail</h2><div className="grid-two"><article><h2>{detail.engineering_reviews?.length ?? 0}</h2>');
  });

  it('documents RC4-J review revision and override API contract', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/engineering/reviews/{reviewId}/revision:');
    expect(openapi).toContain('EngineeringReviewRevisionRequest');
    expect(openapi).toContain('Controlled override approval payload');
    expect(openapi).toContain('Approval requests must reference a completed engineering review');
    expect(openapi).toContain('clients cannot override that snapshot');
    expect(openapi).toContain('asset_id, and calculation_run_id are optional cross-check fields');
    expect(openapi).not.toContain(`        checklist:
          type: object
        approval_comment:`);
    expect(openapi).toContain('ENGINEERING_REVIEW_REVISION_CREATED');
  });
});
