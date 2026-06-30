import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TenantContextError } from '../src/modules/tenancy/tenant-context.js';
import {
  PRODUCTION_ROUTE_FILES,
  TENANT_ROUTE_REGISTRY,
  routeFilesMissingFromRegistry,
  tenantRouteRegistryByEvidenceId,
  tenantScopedRouteEntries,
  tenantScopedRoutesWithoutBoundary
} from '../src/modules/tenancy/tenant-route-registry.js';
import {
  assertTenantRouteRegressionCoverage,
  assertTenantScopedRouteHasRuntimeBoundary,
  buildTenantRouteEvidenceMatrix,
  buildTenantRouteRegressionSummary
} from '../src/modules/tenancy/tenant-regression-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

function routeFilesFromDisk(): string[] {
  return fs
    .readdirSync(path.join(repoRoot, 'apps/api/src/routes'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `apps/api/src/routes/${file}`)
    .sort();
}

describe('enterprise multi-tenant runtime Sprint 3 route expansion and isolation regression harness', () => {
  it('adds Sprint 3 docs, migration, route registry, and regression harness modules', () => {
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint3_route_expansion_regression_harness_pack.md');
    const routeRecord = expectFile('docs/enterprise/tenant_route_expansion_runtime_record.md');
    const harnessRecord = expectFile('docs/enterprise/tenant_isolation_regression_harness_record.md');
    const exceptionRecord = expectFile('docs/enterprise/multitenant_sprint3_route_exception_register.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint3_route_expansion_regression_harness_runbook.md');
    const migration = expectFile('db/migrations/0030_enterprise_multitenant_sprint3_route_expansion_regression_harness.sql');
    const registry = expectFile('apps/api/src/modules/tenancy/tenant-route-registry.ts');
    const harness = expectFile('apps/api/src/modules/tenancy/tenant-regression-harness.ts');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 3 — Full Route Expansion and Tenant Isolation Regression Harness Pack');
    expect(pack).toContain('MT-S3-001');
    expect(pack).toContain('MT-S3-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 3 evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve full route expansion');
    expect(pack).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 3 closure');

    expect(routeRecord).toContain('Tenant Route Expansion Runtime Record');
    expect(routeRecord).toContain('TENANT_ROUTE_REGISTRY');
    expect(routeRecord).toContain('assets/evidence/reports Sprint 2 runtime patterns remain enforced');
    expect(routeRecord).toContain('AI/n8n/service actors cannot approve route expansion exceptions');

    expect(harnessRecord).toContain('Tenant Isolation Regression Harness Record');
    expect(harnessRecord).toContain('assertTenantRouteRegressionCoverage');
    expect(harnessRecord).toContain('buildTenantRouteRegressionSummary');
    expect(harnessRecord).toContain('AI/n8n/service actors cannot approve tenant isolation regression results');

    expect(exceptionRecord).toContain('MT-S3-EXC-001');
    expect(exceptionRecord).toContain('auth_context');
    expect(exceptionRecord).toContain('public_health');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint3-route-expansion-regression-harness.test.ts');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');

    expect(migration).toContain('tenant_route_isolation_reviews');
    expect(migration).toContain('idx_tenant_route_isolation_reviews_status');
    expect(migration).toContain('MT-S3-006');

    expect(registry).toContain('TENANT_ROUTE_REGISTRY');
    expect(registry).toContain('routeFilesMissingFromRegistry');
    expect(registry).toContain('tenantScopedRoutesWithoutBoundary');
    expect(harness).toContain('assertTenantRouteRegressionCoverage');
    expect(harness).toContain('buildTenantRouteEvidenceMatrix');
  });

  it('maps every implemented route file into the tenant route registry with no unbounded tenant-scoped route', () => {
    const actualRouteFiles = routeFilesFromDisk();
    expect(actualRouteFiles).toEqual(PRODUCTION_ROUTE_FILES);
    expect(routeFilesMissingFromRegistry(actualRouteFiles)).toEqual([]);
    expect(tenantScopedRoutesWithoutBoundary()).toEqual([]);
    expect(tenantScopedRouteEntries().length).toBeGreaterThan(10);

    const summary = buildTenantRouteRegressionSummary({ actualRouteFiles });
    expect(summary.registryStatus).toBe('pass');
    expect(summary.totalRouteFiles).toBe(actualRouteFiles.length);
    expect(summary.mappedRouteFiles).toBe(TENANT_ROUTE_REGISTRY.length);
    expect(summary.routesMissingFromRegistry).toEqual([]);
    expect(summary.duplicateRouteFiles).toEqual([]);
    expect(summary.tenantScopedRoutesWithoutBoundary).toEqual([]);
    expect(summary.evidenceIds).toContain('MT-S3-006');
    expect(() => assertTenantRouteRegressionCoverage({ actualRouteFiles })).not.toThrow();
  });

  it('builds route evidence matrix and fails closed for unregistered or unbounded route entries', () => {
    const matrix = buildTenantRouteEvidenceMatrix();
    expect(matrix['MT-S3-003']).toContain('apps/api/src/routes/assets.ts');
    expect(matrix['MT-S3-004']).toContain('apps/api/src/routes/evidence.ts');
    expect(matrix['MT-S3-005']).toContain('apps/api/src/routes/reports.ts');
    expect(matrix['MT-S3-006']).toContain('apps/api/src/routes/inspections.ts');
    expect(tenantRouteRegistryByEvidenceId('MT-S3-006').length).toBeGreaterThan(5);

    expect(assertTenantScopedRouteHasRuntimeBoundary('apps/api/src/routes/assets.ts').scopeStatus).toBe('tenant_scoped');
    expect(() => assertTenantScopedRouteHasRuntimeBoundary('apps/api/src/routes/not-registered.ts')).toThrow(TenantContextError);
    expect(() =>
      assertTenantRouteRegressionCoverage({
        actualRouteFiles: ['apps/api/src/routes/assets.ts', 'apps/api/src/routes/new-tenant-route.ts']
      })
    ).toThrow(TenantContextError);
  });

  it('links Sprint 3 into README, sprint status, evidence register, gates, roadmap, backlog, and migration sequence', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');
    const migrationSequence = read('apps/api/tests/migration-sequence.test.ts');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 3 — Full Route Expansion and Tenant Isolation Regression Harness');
    expect(readme).toContain('Enterprise Multi-Tenant Runtime Sprint 3 adds a complete route registry and tenant isolation regression harness');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 3 evidence');

    expect(sprint).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 3 — Full Route Expansion and Tenant Isolation Regression Harness');
    expect(sprint).toContain('MT-S3-001');
    expect(sprint).toContain('MT-S3-012');

    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 3 Route Expansion and Tenant Isolation Regression Harness Mapping');
    expect(register).toContain('MT-S3-001');
    expect(register).toContain('MT-S3-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 2 Route Filtering and Object Storage Boundary Mapping');

    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 3 Route Expansion and Regression Harness Gate');
    expect(gates).toContain('MT-S3-001 through MT-S3-012');

    expect(roadmap).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 3 — Full Route Expansion and Tenant Isolation Regression Harness');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 3 Route Expansion Regression Harness Backlog Mapping');
    expect(migrationSequence).toContain('0030_enterprise_multitenant_sprint3_route_expansion_regression_harness.sql');
  });

  it('preserves tenant safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/enterprise/enterprise_multitenant_runtime_sprint3_route_expansion_regression_harness_pack.md');
    const routeRecord = read('docs/enterprise/tenant_route_expansion_runtime_record.md');
    const harnessRecord = read('docs/enterprise/tenant_isolation_regression_harness_record.md');
    const exceptionRecord = read('docs/enterprise/multitenant_sprint3_route_exception_register.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint3_route_expansion_regression_harness_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('tenant credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('tenant data');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('tenant billing details');
    expect(pack).toContain('payment processing data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(routeRecord).toContain('AI/n8n/service actors cannot approve full route expansion');
    expect(harnessRecord).toContain('AI/n8n/service actors cannot waive tenant isolation regression failures');
    expect(exceptionRecord).toContain('AI/n8n/service actors cannot approve tenant route exceptions');
    expect(runbook).toContain('AI/n8n/service actors cannot waive multi-tenant Sprint 3 evidence');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, routeRecord, harnessRecord, exceptionRecord, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }
  });
});
