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

describe('RC4-M evidence traceability matrix and coverage workflow', () => {
  it('adds a read-only cross-module evidence traceability endpoint', () => {
    const route = readRepoFile('apps/api/src/routes/evidence.ts');
    expect(route).toContain("evidenceRouter.get('/evidence/traceability-matrix'");
    expect(route).toContain("requirePermission('evidence.read')");
    expect(route).toContain('buildEvidenceTraceabilityMatrix');
    expect(route).toContain('RC4-M is a read-only cross-module evidence coverage matrix');
    expect(route).toContain('coverage_matrix');
    expect(route).toContain('missing_evidence');
    const endpoint = route.slice(route.indexOf("evidenceRouter.get('/evidence/traceability-matrix'"), route.indexOf("evidenceRouter.get('/evidence/:evidenceId'"));
    expect(endpoint).not.toContain('insert into');
    expect(endpoint).not.toContain('update evidence_files');
    expect(endpoint).not.toContain('delete from');
    expect(endpoint).not.toContain('writeAudit(');
  });

  it('covers required engineering modules without implementing approval or object-storage changes', () => {
    const route = readRepoFile('apps/api/src/routes/evidence.ts');
    for (const marker of [
      'asset_register',
      'inspection_events',
      'ndt_measurements',
      'findings',
      'calculation_runs',
      'integrity_decisions',
      'rbi_cases',
      'reports',
      'internal_work_orders'
    ]) {
      expect(route).toContain(marker);
    }
    expect(route).toContain('Object storage behavior is unchanged');
    expect(route).toContain('ready_for_governance_review');
    expect(route).toContain('TRACEABILITY_MATRIX_ASSET_ID_INVALID');
    expect(route).toContain('TRACEABILITY_MATRIX_INSPECTION_ID_INVALID');
  });

  it('adds a frontend evidence traceability matrix page and navigation links', () => {
    const page = readRepoFile('apps/web/app/evidence-traceability/page.tsx');
    const client = readRepoFile('apps/web/app/evidence-traceability/EvidenceTraceabilityMatrixClient.tsx');
    const evidenceClient = readRepoFile('apps/web/app/evidence/EvidenceRepositoryClient.tsx');
    const home = readRepoFile('apps/web/app/page.tsx');
    expect(page).toContain('EvidenceTraceabilityMatrixClient');
    expect(client).toContain('RC4-M evidence traceability matrix');
    expect(client).toContain('/api/v1/evidence/traceability-matrix');
    expect(client).toContain('Coverage Matrix');
    expect(client).toContain('Missing Evidence Indicators');
    expect(client).toContain('Recent Evidence Links');
    expect(client).toContain('without approving');
    expect(evidenceClient).toContain('/evidence-traceability');
    expect(home).toContain('Evidence Traceability');
  });

  it('documents RC4-M in OpenAPI, release, UAT, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const release = readRepoFile('docs/release/AIM_RC4M_evidence_traceability_matrix_report.md');
    const uat = readRepoFile('docs/uat/uat_rc4m_evidence_traceability_matrix.md');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    expect(openapi).toContain('/api/v1/evidence/traceability-matrix:');
    expect(openapi).toContain('EvidenceTraceabilityMatrix');
    expect(openapi).toContain('Read-only RC4-M evidence coverage matrix');
    expect(release).toContain('RC4-M Evidence Traceability Matrix');
    expect(uat).toContain('RC4-M Evidence Traceability Matrix UAT');
    expect(readme).toContain('RC4-M Evidence Traceability Matrix');
    expect(sprint).toContain('RC4-M Evidence Traceability Matrix');
  });
});
