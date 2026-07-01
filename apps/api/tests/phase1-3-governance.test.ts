import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Phase 1.3 governance batch', () => {
  it('mounts AI extraction/staging routes and keeps reviewed, allowlisted final promotion semantics', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(app).toContain("aiExtractionRouter");
    expect(app).toContain("/api/v1");
    expect(route).toContain("aiExtractionRouter.post('/extraction-jobs'");
    expect(route).toContain("aiExtractionRouter.post('/extraction-fields/:fieldId/review'");
    expect(route).toContain("aiExtractionRouter.post('/staging-records/:stagingRecordId/promote'");
    expect(route).toContain('FINAL_PROMOTION_ALLOWLIST');
    expect(route).toContain('final_table_mutation: true');
    expect(route).toContain('EVIDENCE_LINK_REQUIRED');
    expect(route).toContain('AI_ATTEMPTED_APPROVAL_OR_DECISION');
  });

  it('enforces AI confidence and evidence validation controls in extraction flow', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('confidenceBand');
    expect(route).toContain('LOW_CONFIDENCE_FIELD');
    expect(route).toContain('MISSING_EVIDENCE_REFERENCE');
    expect(route).toContain('UNIT_MISMATCH');
    expect(route).toContain('manual_overrides');
    expect(route).toContain('correction_reason');
    expect(route).toContain('staging_record.promoted');
  });

  it('hardens approval endpoints with comments and segregation of duty checks', () => {
    const approvals = readRepoFile('apps/api/src/routes/engineering-reviews.ts');
    const reports = readRepoFile('apps/api/src/routes/reports.ts');
    expect(approvals).toContain('APPROVAL_COMMENT_REQUIRED');
    expect(approvals).toContain('REJECTION_REASON_REQUIRED');
    expect(approvals).toContain('SEGREGATION_OF_DUTY_BLOCKED');
    expect(reports).toContain('REPORT_APPROVAL_COMMENT_REQUIRED');
    expect(reports).toContain('REPORT_ISSUE_COMMENT_REQUIRED');
    expect(reports).toContain('REPORT_ISSUE_BLOCKED');
    expect(reports).toContain('REPORT_GATES_NOT_SATISFIED');
  });

  it('hardens evidence governance with signed URL issuance, scan status guardrail, and linked deletion block', () => {
    const route = readRepoFile('apps/api/src/routes/evidence.ts');
    const validation = readRepoFile('apps/api/src/modules/evidence/validation.ts');
    expect(route).toContain("evidenceRouter.get('/evidence/:evidenceId/download-url'");
    expect(route).toContain('EVIDENCE_SIGNED_URL_CREATED');
    expect(route).toContain('malware_scan_status');
    expect(route).toContain('LINKED_EVIDENCE_DELETE_BLOCKED');
    expect(validation).toContain('isExpectedMimeForFileType');
    expect(validation).toContain('isSha256');
    expect(validation).toContain("'staging_record'");
  });
});
