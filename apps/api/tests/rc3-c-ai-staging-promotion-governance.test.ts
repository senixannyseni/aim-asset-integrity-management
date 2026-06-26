import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-C AI staging promotion governance', () => {
  it('hardens review routes with human-only approve/correct/reject and meaningful reasons', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain("aiExtractionRouter.post('/extraction-fields/:fieldId/review'");
    expect(route).toContain('ensureHumanReviewerActor');
    expect(route).toContain('AI_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('MANUAL_OVERRIDE_REASON_REQUIRED');
    expect(route).toContain('REJECTION_REASON_REQUIRED');
    expect(route).toContain('REVIEW_RATIONALE_REQUIRED');
    expect(route).toContain('AI_FIELD_APPROVED');
    expect(route).toContain('AI_FIELD_CORRECTED');
    expect(route).toContain('AI_FIELD_REJECTED');
    expect(route).toContain('AI_FIELD_OVERRIDE_RECORDED');
    expect(route).toContain('legacy_event_alias');
    expect(route).toContain('manual_override.created');
  });

  it('requires verified object-storage evidence before review and promotion', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('findVerifiedEvidenceReference');
    expect(route).toContain("ef.upload_status = 'verified'");
    expect(route).toContain('VERIFIED_EVIDENCE_LINK_REQUIRED');
    expect(route).toContain('upload_status_required');
    expect(route).toContain('metadata-only');
  });

  it('adds promotion readiness and job-level promotion gates', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain("aiExtractionRouter.get('/extraction-jobs/:jobId/promotion-readiness'");
    expect(route).toContain("aiExtractionRouter.post('/extraction-jobs/:jobId/promote'");
    expect(route).toContain('buildPromotionGateResults');
    expect(route).toContain('persistPromotionGates');
    expect(route).toContain('AI_STAGING_PROMOTION_REQUESTED');
    expect(route).toContain('AI_STAGING_PROMOTION_BLOCKED');
    expect(route).toContain('AI_STAGING_PROMOTED');
    expect(route).toContain('AI_STAGING_PROMOTION_FAILED');
    expect(route).toContain('PROMOTION_GATE_FAILED');
    expect(route).toContain('final_table_mutation: false');
  });

  it('blocks rejected, low-confidence, and SoD-violating promotion', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('REJECTED_FIELD_CANNOT_BE_PROMOTED');
    expect(route).toContain('LOW_CONFIDENCE_CORRECTION_REQUIRED');
    expect(route).toContain('SEGREGATION_OF_DUTY_BLOCKED');
    expect(route).toContain('reviewer_id');
    expect(route).toContain('promoter_id');
    expect(route).toContain('promotion_status = \'blocked\'');
  });

  it('documents RC3-C API contract, UAT, and n8n API-only boundary', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const uat = readRepoFile('docs/uat/uat_rc3_ai_staging_promotion_scripts.md');
    const n8n = readRepoFile('05_n8n/rc3c_ai_staging_promotion_workflow_addendum.md');
    const release = readRepoFile('docs/release/AIM_RC3C_ai_staging_promotion_governance_report.md');
    expect(openapi).toContain('/api/v1/extraction-jobs/{jobId}/promotion-readiness');
    expect(openapi).toContain('/api/v1/extraction-jobs/{jobId}/promote');
    expect(openapi).toContain('AI_FIELD_APPROVED');
    expect(openapi).toContain('AI_STAGING_PROMOTION_BLOCKED');
    expect(openapi).toContain('x-n8n-boundary');
    expect(uat).toContain('SEGREGATION_OF_DUTY_BLOCKED');
    expect(uat).toContain('VERIFIED_EVIDENCE_LINK_REQUIRED');
    expect(n8n).toContain('must not approve');
    expect(n8n).toContain('must not write directly to PostgreSQL');
    expect(release).toContain('RC3-C');
  });

  it('does not grant AI agent final review or promotion permissions', () => {
    expect(hasPermission(['ai_agent'], 'ai_extraction.review')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ai_extraction.correct')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ai_extraction.promote')).toBe(false);
    expect(hasPermission(['ai_agent'], 'staging.promote')).toBe(false);
  });
});
