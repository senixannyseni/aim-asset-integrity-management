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

describe('Engineering review and approval workflow governance', () => {
  it('adds engineering review and approval workflow migration', () => {
    const migration = readRepoFile('db/migrations/0010_engineering_review_approval_workflow.sql');
    expect(migration).toContain('engineering_review.read');
    expect(migration).toContain('approval_record.approve');
    expect(migration).toContain('prevent_locked_engineering_review_change');
    expect(migration).toContain('prevent_locked_approval_record_change');
    expect(migration).toContain("review_status in ('approved','rejected','locked')");
    expect(migration).toContain("approval_status in ('approved','rejected','locked')");
  });

  it('registers engineering review routes in the API app', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    expect(app).toContain("import { engineeringReviewsRouter } from './routes/engineering-reviews.js';");
    expect(app).toContain("app.use('/api/v1', engineeringReviewsRouter);");
  });

  it('protects approval and override from ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'engineering_review.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'engineering_review.override')).toBe(false);
    expect(hasPermission(['ai_agent'], 'approval_record.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'approval_record.reject')).toBe(false);
    expect(ROLE_PERMISSIONS.senior_engineer).toContain('approval_record.approve');
  });

  it('blocks override approval without reason and evidence', () => {
    const route = readRepoFile('apps/api/src/routes/engineering-reviews.ts');
    expect(route).toContain('OVERRIDE_REASON_AND_EVIDENCE_REQUIRED');
    expect(route).toContain('affected_field');
    expect(route).toContain('original_value');
    expect(route).toContain('override_value');
    expect(route).toContain('AI_AGENT_CANNOT_APPROVE_OR_OVERRIDE');
    expect(route).toContain('REVIEW_ID_REQUIRED');
    expect(route).toContain('REVIEW_STATUS_TRANSITION_REQUIRED');
    expect(route).toContain('REVISION_START_STATUS_INVALID');
    expect(route).toContain("review.review_status !== 'reviewed' || !review.reviewed_at");
    expect(route).toContain('FINAL_APPROVAL_STATE_LOCKED');
    expect(route).toContain('APPROVAL_NOT_SUBMITTED');
    expect(route).toContain('REVIEW_MUTATION_STATE_LOCKED');
    expect(route).toContain('normalizeChecklist(review.checklist_json)');
    expect(route).toContain('for update');
  });

  it('locks calculation runs after senior approval and exposes full audit trail from calculation detail', () => {
    const route = readRepoFile('apps/api/src/routes/engineering-reviews.ts');
    expect(route).toContain("status = 'locked'");
    expect(route).toContain('locked_flag = true');
    expect(route).toContain('APPROVAL_RECORD_APPROVED');
    const calculations = readRepoFile('apps/api/src/routes/calculations.ts');
    expect(calculations).toContain("calculationsRouter.get('/engineering/calculations/:runId'");
    expect(calculations).toContain('engineering_reviews');
    expect(calculations).toContain('approval_records');
    expect(calculations).toContain('audit_trail');
  });

  it('documents engineering review endpoints in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/engineering/reviews:');
    expect(openapi).toContain('/approval-records:');
    expect(openapi).toContain('/approval-records/{approvalId}/approve:');
    expect(openapi).toContain('x-permission-required: approval_record.approve');
    expect(openapi).toContain('Approval requests must reference a completed engineering review');
  });
});
