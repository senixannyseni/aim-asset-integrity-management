import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildEvidenceObjectKey } from '../src/modules/object-storage/evidence-storage.js';
import { buildReportExportObjectKey } from '../src/modules/object-storage/report-storage.js';
import {
  appendTenantWhereClause,
  assertTenantScopedRow,
  tenantScopeMetadata,
  tenantWhereClause
} from '../src/modules/tenancy/tenant-scope.js';
import {
  assertTenantObjectKeyBoundary,
  buildTenantScopedObjectKey,
  isTenantScopedObjectKey,
  tenantObjectStoragePrefix
} from '../src/modules/tenancy/tenant-object-boundary.js';
import { TenantContextError, type TenantContext } from '../src/modules/tenancy/tenant-context.js';

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

const tenant: TenantContext = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  tenantSlug: 'alpha-customer',
  tenantName: 'Alpha Customer',
  status: 'active',
  selectedBy: 'request_header'
};

describe('enterprise multi-tenant runtime Sprint 2 route filtering and object storage boundary', () => {
  it('adds Sprint 2 docs, migration, tenant route helpers, and object boundary helpers', () => {
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint2_route_filtering_object_boundary_pack.md');
    const routeRecord = expectFile('docs/enterprise/tenant_route_filtering_runtime_record.md');
    const objectRecord = expectFile('docs/enterprise/tenant_object_storage_boundary_record.md');
    const riskRecord = expectFile('docs/enterprise/multitenant_sprint2_rollout_risk_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint2_route_filtering_object_boundary_runbook.md');
    const migration = expectFile('db/migrations/0029_enterprise_multitenant_sprint2_route_filtering_object_boundary.sql');
    const tenantScope = expectFile('apps/api/src/modules/tenancy/tenant-scope.ts');
    const objectBoundary = expectFile('apps/api/src/modules/tenancy/tenant-object-boundary.ts');
    const evidenceStorage = expectFile('apps/api/src/modules/object-storage/evidence-storage.ts');
    const reportStorage = expectFile('apps/api/src/modules/object-storage/report-storage.ts');
    const evidenceRoute = expectFile('apps/api/src/routes/evidence.ts');
    const reportRoute = expectFile('apps/api/src/routes/reports.ts');
    const assetRoute = expectFile('apps/api/src/routes/assets.ts');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 2 — Route-Wide Tenant Filtering and Object Storage Tenant Boundary Pack');
    expect(pack).toContain('MT-S2-001');
    expect(pack).toContain('MT-S2-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 2 evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve route-wide tenant filtering');
    expect(pack).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 2 closure');

    expect(routeRecord).toContain('Tenant Route Filtering Runtime Record');
    expect(routeRecord).toContain('appendTenantWhereClause');
    expect(routeRecord).toContain('asset list/detail/readiness/create/update/delete filtering');
    expect(routeRecord).toContain('AI/n8n/service actors cannot approve tenant-scoped route rollout');

    expect(objectRecord).toContain('Tenant Object Storage Boundary Record');
    expect(objectRecord).toContain('tenantObjectStoragePrefix');
    expect(objectRecord).toContain('tenants/{tenant_slug}/{tenant_id}/evidence');
    expect(objectRecord).toContain('AI/n8n/service actors cannot approve tenant object-storage boundary readiness');

    expect(riskRecord).toContain('MT-S2-RISK-001');
    expect(riskRecord).toContain('Sprint 3 route expansion');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint2-route-filtering-object-boundary.test.ts');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');

    expect(migration).toContain('alter table if exists evidence_upload_sessions add column if not exists tenant_id');
    expect(migration).toContain('alter table if exists report_exports add column if not exists tenant_id');
    expect(migration).toContain('idx_evidence_upload_sessions_tenant_status');
    expect(migration).toContain('idx_report_exports_tenant_report');

    expect(tenantScope).toContain('requireTenantContextFromRequest');
    expect(tenantScope).toContain('appendTenantWhereClause');
    expect(tenantScope).toContain('assertTenantScopedRow');
    expect(objectBoundary).toContain('tenantObjectStoragePrefix');
    expect(objectBoundary).toContain('buildTenantScopedObjectKey');
    expect(objectBoundary).toContain('assertTenantObjectKeyBoundary');

    expect(evidenceStorage).toContain('buildTenantScopedObjectKey');
    expect(reportStorage).toContain('buildTenantScopedObjectKey');
    expect(evidenceRoute).toContain('requireTenantContextFromRequest');
    expect(evidenceRoute).toContain('TENANT_OBJECT_KEY_BOUNDARY_VIOLATION');
    expect(evidenceRoute).toContain('select * from evidence_files where id = $1 and tenant_id = $2');
    expect(reportRoute).toContain('assertTenantObjectKeyBoundary');
    expect(reportRoute).toContain('select * from report_exports where id = $1 and tenant_id = $2 for update');
    expect(assetRoute).toContain('appendTenantWhereClause');
    expect(assetRoute).toContain('tenantIdForInsert');
  });

  it('builds tenant-scoped query filters and rejects cross-tenant rows', () => {
    expect(tenantWhereClause('assets', 3)).toBe('assets.tenant_id = $3');
    const scoped = appendTenantWhereClause({ baseWhere: 'where a.deleted_at is null', alias: 'a', params: ['%TK%'], tenant });
    expect(scoped.clause).toContain('where a.deleted_at is null and a.tenant_id = $2');
    expect(scoped.params).toEqual(['%TK%', tenant.tenantId]);
    expect(scoped.nextIndex).toBe(3);
    expect(tenantScopeMetadata(tenant)).toEqual({
      tenant_id: tenant.tenantId,
      tenant_slug: tenant.tenantSlug,
      tenant_boundary: 'tenant-scoped-runtime-filter'
    });
    expect(() => assertTenantScopedRow({ tenant_id: tenant.tenantId }, tenant)).not.toThrow();
    expect(() => assertTenantScopedRow({ tenant_id: '22222222-2222-4222-8222-222222222222' }, tenant)).toThrow(TenantContextError);
  });

  it('creates tenant-prefixed object keys and blocks cross-tenant object access', () => {
    expect(tenantObjectStoragePrefix(tenant)).toBe(`tenants/${tenant.tenantSlug}/${tenant.tenantId}`);
    const key = buildTenantScopedObjectKey(tenant, 'evidence/TK-001/na/EVD-1/report.pdf');
    expect(key).toBe(`tenants/${tenant.tenantSlug}/${tenant.tenantId}/evidence/TK-001/na/EVD-1/report.pdf`);
    expect(isTenantScopedObjectKey(key, tenant)).toBe(true);
    expect(() => assertTenantObjectKeyBoundary(key, tenant)).not.toThrow();
    expect(() => assertTenantObjectKeyBoundary('tenants/beta/22222222-2222-4222-8222-222222222222/evidence/TK-001/report.pdf', tenant)).toThrow(TenantContextError);
    expect(() => buildTenantScopedObjectKey(tenant, '../secret.env')).toThrow(TenantContextError);
    expect(() => buildTenantScopedObjectKey(tenant, 'https://signed.example/evidence.pdf?token=secret')).toThrow(TenantContextError);

    const evidenceKey = buildEvidenceObjectKey({
      tenant,
      assetTagOrId: 'TK-001',
      inspectionId: null,
      evidenceCode: 'EVD-2026-000001',
      filename: 'shell UT report.pdf'
    });
    expect(evidenceKey).toContain(`tenants/${tenant.tenantSlug}/${tenant.tenantId}/evidence/TK-001/na/EVD-2026-000001/shell-UT-report.pdf`);

    const reportKey = buildReportExportObjectKey({
      tenant,
      reportId: '38000000-0000-4000-8000-000000000001',
      exportId: '39000000-0000-4000-8000-000000000001',
      filename: 'report.pdf'
    });
    expect(reportKey).toContain(`tenants/${tenant.tenantSlug}/${tenant.tenantId}/reports/38000000-0000-4000-8000-000000000001/exports/39000000-0000-4000-8000-000000000001/report.pdf`);
  });

  it('links Sprint 2 into README, sprint status, evidence register, gates, roadmap, backlog, and migration sequence', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');
    const migrationSequence = read('apps/api/tests/migration-sequence.test.ts');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 2 — Route-Wide Tenant Filtering and Object Storage Tenant Boundary');
    expect(readme).toContain('Enterprise Multi-Tenant Runtime Sprint 2 adds tenant-scoped route filtering helpers and object-storage tenant boundaries');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 2 evidence');

    expect(sprint).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 2 — Route-Wide Tenant Filtering and Object Storage Tenant Boundary');
    expect(sprint).toContain('MT-S2-001');
    expect(sprint).toContain('MT-S2-012');

    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 2 Route Filtering and Object Storage Boundary Mapping');
    expect(register).toContain('MT-S2-001');
    expect(register).toContain('MT-S2-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Foundation');

    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 2 Route Filtering and Object Storage Boundary Gate');
    expect(gates).toContain('MT-S2-001 through MT-S2-012');

    expect(roadmap).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 2 — Route-Wide Tenant Filtering and Object Storage Tenant Boundary');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 2 Route Filtering and Object Storage Boundary Backlog Mapping');
    expect(migrationSequence).toContain('0029_enterprise_multitenant_sprint2_route_filtering_object_boundary.sql');
  });

  it('preserves tenant safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/enterprise/enterprise_multitenant_runtime_sprint2_route_filtering_object_boundary_pack.md');
    const routeRecord = read('docs/enterprise/tenant_route_filtering_runtime_record.md');
    const objectRecord = read('docs/enterprise/tenant_object_storage_boundary_record.md');
    const riskRecord = read('docs/enterprise/multitenant_sprint2_rollout_risk_record.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint2_route_filtering_object_boundary_runbook.md');

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

    expect(routeRecord).toContain('AI/n8n/service actors cannot approve route-wide tenant filtering');
    expect(objectRecord).toContain('AI/n8n/service actors cannot waive tenant object-storage boundary evidence');
    expect(riskRecord).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 2 closure');
    expect(runbook).toContain('AI/n8n/service actors cannot waive multi-tenant Sprint 2 evidence');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, routeRecord, objectRecord, riskRecord, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }
  });
});
