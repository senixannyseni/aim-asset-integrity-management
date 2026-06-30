import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TENANT_ROUTE_REGISTRY } from '../src/modules/tenancy/tenant-route-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('enterprise multi-tenant runtime Sprint 3 route isolation review evidence completion', () => {
  it('adds a forward-only migration that mirrors every route registry entry into review evidence', () => {
    const migration = read('db/migrations/0031_enterprise_multitenant_sprint3_route_isolation_review_completion.sql');

    expect(migration).toContain('Forward-only migration');
    expect(migration).toContain('TENANT_ROUTE_REGISTRY');
    expect(migration).toContain('tenant_route_isolation_reviews');
    expect(migration).toContain('on conflict(route_file) do update set');
    expect(migration).not.toContain('disable trigger user');

    for (const entry of TENANT_ROUTE_REGISTRY) {
      expect(migration, `missing route review seed ${entry.routeFile}`).toContain(`'${entry.routeFile}'`);
      expect(migration, `missing route evidence ${entry.evidenceId}`).toContain(`'${entry.evidenceId}'`);
      expect(migration, `missing route scope ${entry.scopeStatus}`).toContain(`'${entry.scopeStatus}'`);
      expect(migration, `missing route boundary ${entry.boundaryMode}`).toContain(`'${entry.boundaryMode}'`);
    }
  });

  it('documents the Sprint 3 evidence-table completion without reopening route behavior', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const harnessRecord = read('docs/enterprise/tenant_isolation_regression_harness_record.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint3_route_expansion_regression_harness_runbook.md');
    const migrationSequence = read('apps/api/tests/migration-sequence.test.ts');

    expect(readme).toContain('Sprint 3 evidence-table completion hotfix');
    expect(readme).toContain('0031_enterprise_multitenant_sprint3_route_isolation_review_completion.sql');
    expect(readme).toContain('does not rewrite already-tagged migrations 0028, 0029, or 0030');

    expect(sprint).toContain('Sprint 3 evidence-table completion hotfix');
    expect(register).toContain('Sprint 3 Route Isolation Review Evidence Completion');
    expect(harnessRecord).toContain('0031_enterprise_multitenant_sprint3_route_isolation_review_completion.sql');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint3-route-isolation-review-completion.test.ts');
    expect(migrationSequence).toContain('0031_enterprise_multitenant_sprint3_route_isolation_review_completion.sql');
  });
});
