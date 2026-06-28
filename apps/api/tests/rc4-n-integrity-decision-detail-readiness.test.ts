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

describe('RC4-N integrity decision detail and readiness workflow', () => {
  it('adds a read-only backend decision readiness endpoint', () => {
    const route = readRepoFile('apps/api/src/routes/integrity-decisions.ts');
    expect(route).toContain("integrityDecisionsRouter.get('/integrity-decisions/:decisionId/readiness'");
    expect(route).toContain("requirePermission('integrity_decision.review')");
    expect(route).toContain('buildIntegrityDecisionReadiness');
    expect(route).toContain('ready_for_downstream_use');
    expect(route).toContain('direct_evidence_linked');
    expect(route).toContain('decision_approved_for_downstream_use');
    expect(route).toContain('ai_n8n_finalization_absent');
    const endpoint = route.slice(route.indexOf("integrityDecisionsRouter.get('/integrity-decisions/:decisionId/readiness'"), route.indexOf("integrityDecisionsRouter.post('/integrity-decisions'"));
    expect(endpoint).not.toContain('insert into');
    expect(endpoint).not.toContain('update integrity_decisions');
    expect(endpoint).not.toContain('writeAudit(');
  });

  it('extends decision detail with traceability without weakening approval gates', () => {
    const route = readRepoFile('apps/api/src/routes/integrity-decisions.ts');
    expect(route).toContain('loadIntegrityDecisionEvidenceLinks');
    expect(route).toContain('loadIntegrityDecisionAuditEvents');
    expect(route).toContain('linked_evidence');
    expect(route).toContain('audit_events');
    expect(route).toContain('linked_context');
    expect(route).toContain('downstream_reports');
    expect(route).toContain('downstream_work_orders');
    expect(route).toContain('INTEGRITY_DECISION_EVIDENCE_REQUIRED');
    expect(route).toContain('AI_INTEGRITY_APPROVAL_BLOCKED');
    expect(route).toContain('SENIOR_INTEGRITY_APPROVAL_REQUIRED');
  });

  it('adds a product-facing integrity decision detail page and readiness actions', () => {
    const page = readRepoFile('apps/web/app/integrity-decisions/[decisionId]/page.tsx');
    const client = readRepoFile('apps/web/app/integrity-decisions/[decisionId]/IntegrityDecisionDetailClient.tsx');
    const list = readRepoFile('apps/web/app/integrity-decisions/IntegrityDecisionsClient.tsx');
    expect(page).toContain('IntegrityDecisionDetailClient');
    expect(client).toContain('RC4-N integrity decision detail and decision readiness');
    expect(client).toContain('/api/v1/integrity-decisions/${decisionId}/readiness');
    expect(client).toContain('Decision Readiness Gates');
    expect(client).toContain('Link Direct Evidence');
    expect(client).toContain('Approve Decision');
    expect(client).toContain('Decision Traceability');
    expect(client).toContain('Audit Timeline');
    expect(client).toContain('AI/n8n/service actors cannot approve');
    expect(client).toContain("hasPermission(user, 'integrity_decision.approve')");
    expect(client).toContain("hasPermission(user, 'evidence.link')");
    expect(list).toContain('RC4-N adds detail-level decision readiness');
    expect(list).toContain('Decision readiness</Link>');
  });

  it('documents RC4-N in OpenAPI, release, UAT, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const release = readRepoFile('docs/release/AIM_RC4N_integrity_decision_detail_readiness_report.md');
    const uat = readRepoFile('docs/uat/uat_rc4n_integrity_decision_detail_readiness.md');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    expect(openapi).toContain('/api/v1/integrity-decisions/{decisionId}/readiness:');
    expect(openapi).toContain('IntegrityDecisionReadiness');
    expect(openapi).toContain('Read-only RC4-N integrity decision readiness preview');
    expect(release).toContain('RC4-N Integrity Decision Detail and Decision Readiness');
    expect(uat).toContain('RC4-N Integrity Decision Detail and Decision Readiness UAT');
    expect(readme).toContain('RC4-N Integrity Decision Detail and Decision Readiness');
    expect(sprint).toContain('RC4-N Integrity Decision Detail and Decision Readiness');
  });
});
