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

describe('Release hardening after UAT Cycle 1', () => {
  it('requires direct evidence linkage before integrity decision approval', () => {
    const route = readRepoFile('apps/api/src/routes/integrity-decisions.ts');

    expect(route).toContain('INTEGRITY_DECISION_EVIDENCE_REQUIRED');
    expect(route).toContain("countLinkedEvidence(client, 'integrity_decision', decisionId)");
    expect(route).toContain('persistIntegrityDecisionApprovalGate');
    expect(route).toContain('INTEGRITY_DECISION_APPROVAL_BLOCKED');
    expect(route).toContain('AI_INTEGRITY_APPROVAL_BLOCKED');
  });

  it('uses per-entity evidence gates for report issue and keeps self-blocking protection', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');

    expect(route).toContain('reportEvidenceCount');
    expect(route).toContain('calculationRunEvidenceCount');
    expect(route).toContain('integrityDecisionEvidenceCount');
    expect(route).toContain('missing_required_evidence');
    expect(route).toContain("coalesce(error_code, '') <> 'REPORT_ISSUE_GATE_BLOCKED'");
    expect(route).toContain("gate_domain = 'report_issue'");
    expect(route).toContain('resolved_report_issue_gate_blocked_error_ids');
    expect(route).toContain("status = 'resolved'");
  });

  it('validates NDT extraction_source before database constraints can throw', () => {
    const validation = readRepoFile('apps/api/src/modules/ndt/validation.ts');

    expect(validation).toContain('allowedExtractionSources');
    for (const source of ['manual', 'bulk_import', 'ai_staging', 'vendor_import']) {
      expect(validation).toContain(source);
    }
    expect(validation).toContain('field: \'extraction_source\'');
  });

  it('reads calculation runs without mixing uuid and text comparisons', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');

    expect(route).toContain('isUuid(runId)');
    expect(route).toContain('where id = $1::uuid');
    expect(route).toContain('where run_id = $1');
    expect(route).not.toContain('where id = $1 or run_id = $1');
  });

  it('keeps OpenAPI and docs aligned with hardening behavior', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const summary = readRepoFile('docs/uat/uat_cycle_1_actual_execution_summary.md');
    const runbook = readRepoFile('docs/deployment/deployment_runbook.md');

    expect(openapi).toContain('INTEGRITY_DECISION_EVIDENCE_REQUIRED');
    expect(openapi).toContain('per-entity evidence');
    expect(openapi).toContain('INTEGRITY_DECISION_CREATED');
    expect(openapi).toContain('INTEGRITY_DECISION_APPROVED');
    expect(summary).toContain('PASS_WITH_LOCAL_FIXES');
    expect(runbook).toContain('$token = $login.data.accessToken');
    expect(runbook).toContain('AUTH_JWT_SECRET');
    expect(runbook).not.toContain('$login.data.tokens.accessToken');
    expect(runbook).not.toContain('`JWT_SECRET`');
  });
});
