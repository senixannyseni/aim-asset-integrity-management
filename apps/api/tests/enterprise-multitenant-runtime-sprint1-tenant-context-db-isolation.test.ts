import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertTenantBoundary,
  defaultLocalDemoTenantMembership,
  resolveTenantContext,
  tenantScopedWhereClause,
  TenantContextError,
  type TenantMembership
} from '../src/modules/tenancy/tenant-context.js';

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

const memberships: TenantMembership[] = [
  {
    tenantId: '11111111-1111-4111-8111-111111111111',
    tenantSlug: 'alpha',
    tenantName: 'Alpha Tenant',
    status: 'active',
    isDefault: true,
    roleScope: []
  },
  {
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantSlug: 'beta',
    tenantName: 'Beta Tenant',
    status: 'active',
    isDefault: false,
    roleScope: []
  }
];

describe('enterprise multi-tenant runtime Sprint 1 tenant context and DB isolation foundation', () => {
  it('adds Sprint 1 docs, migration, tenant runtime files, route, RBAC, and runbook records', () => {
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint1_tenant_context_db_isolation_pack.md');
    const runtime = expectFile('docs/enterprise/tenant_context_runtime_foundation_record.md');
    const db = expectFile('docs/enterprise/tenant_database_isolation_foundation_record.md');
    const rbac = expectFile('docs/enterprise/multitenant_sprint1_rbac_service_actor_runtime_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint1_tenant_context_db_isolation_runbook.md');
    const migration = expectFile('db/migrations/0028_enterprise_multitenant_sprint1_tenant_context.sql');
    const tenancyModule = expectFile('apps/api/src/modules/tenancy/tenant-context.ts');
    const tenantMiddleware = expectFile('apps/api/src/middleware/tenant-context.ts');
    const tenantRoute = expectFile('apps/api/src/routes/tenants.ts');
    const app = expectFile('apps/api/src/app.ts');
    const userContext = expectFile('apps/api/src/auth/user-context.ts');
    const roles = expectFile('apps/api/src/rbac/roles.ts');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation Pack');
    expect(pack).toContain('MT-S1-001');
    expect(pack).toContain('MT-S1-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 1 evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve tenant context implementation');
    expect(pack).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 1 closure');

    expect(runtime).toContain('Tenant Context Runtime Foundation Record');
    expect(runtime).toContain('x-aim-tenant-id');
    expect(runtime).toContain('x-aim-tenant-slug');
    expect(runtime).toContain('AI/n8n/service actors cannot approve tenant context implementation');

    expect(db).toContain('Tenant Database Isolation Foundation Record');
    expect(db).toContain('0028_enterprise_multitenant_sprint1_tenant_context.sql');
    expect(db).toContain('tenant_id foundation columns');
    expect(db).toContain('Sprint 2 must apply tenant filters');

    expect(rbac).toContain('Multi-Tenant Sprint 1 RBAC and Service Actor Runtime Record');
    expect(rbac).toContain('tenant.context.read');
    expect(rbac).toContain('tenant.manage');
    expect(rbac).toContain('AI/n8n/service actors cannot approve tenant-aware RBAC changes');

    expect(runbook).toContain('Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Runbook');
    expect(runbook).toContain('pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint1-tenant-context-db-isolation.test.ts');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');

    expect(migration).toContain('create table if not exists tenants');
    expect(migration).toContain('create table if not exists user_tenant_memberships');
    expect(migration).toContain("alter table if exists assets add column if not exists tenant_id");
    expect(migration).toContain("alter table if exists evidence_files add column if not exists tenant_id");
    expect(migration).toContain("alter table if exists calculation_runs add column if not exists tenant_id");
    expect(migration).toContain("alter table if exists reports add column if not exists tenant_id");
    expect(migration).toContain("'tenant.context.read'");
    expect(migration).toContain("'tenant.manage'");

    expect(tenancyModule).toContain('resolveTenantContext');
    expect(tenancyModule).toContain('assertTenantBoundary');
    expect(tenantMiddleware).toContain('resolveRequestTenantContext');
    expect(tenantRoute).toContain("/tenant/context");
    expect(tenantRoute).toContain("/tenant/isolation-health");
    expect(app).toContain('resolveRequestTenantContext');
    expect(app).toContain('tenantsRouter');
    expect(app).toContain('x-aim-tenant-id');
    expect(userContext).toContain('tenantMemberships');
    expect(userContext).toContain('user_tenant_memberships');
    expect(roles).toContain("'tenant.context.read'");
    expect(roles).toContain("'tenant.manage'");
  });

  it('resolves tenant context and rejects cross-tenant access in runtime helpers', () => {
    const defaultContext = resolveTenantContext({ authType: 'jwt', memberships });
    expect(defaultContext.tenantSlug).toBe('alpha');
    expect(defaultContext.selectedBy).toBe('default_membership');

    const selectedBySlug = resolveTenantContext({ authType: 'jwt', memberships, requestedTenantSlug: 'beta' });
    expect(selectedBySlug.tenantId).toBe('22222222-2222-4222-8222-222222222222');
    expect(selectedBySlug.selectedBy).toBe('request_header');

    const selectedById = resolveTenantContext({ authType: 'jwt', memberships, requestedTenantId: '11111111-1111-4111-8111-111111111111' });
    expect(selectedById.tenantSlug).toBe('alpha');

    const demoFallback = resolveTenantContext({ authType: 'local_demo', memberships: [] });
    expect(demoFallback.tenantSlug).toBe(defaultLocalDemoTenantMembership().tenantSlug);
    expect(demoFallback.selectedBy).toBe('local_demo_fallback');

    expect(() => resolveTenantContext({ authType: 'jwt', memberships, requestedTenantSlug: 'gamma' })).toThrow(TenantContextError);
    expect(() => assertTenantBoundary('22222222-2222-4222-8222-222222222222', defaultContext)).toThrow(TenantContextError);
    expect(() => assertTenantBoundary(defaultContext.tenantId, defaultContext)).not.toThrow();
    expect(tenantScopedWhereClause('assets', '$1')).toBe('assets.tenant_id = $1');
  });

  it('links Sprint 1 into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation');
    expect(readme).toContain('Enterprise Multi-Tenant Runtime Sprint 1 adds runtime tenant context foundation');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 1 evidence');

    expect(sprint).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation');
    expect(sprint).toContain('MT-S1-001');
    expect(sprint).toContain('MT-S1-012');

    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Mapping');
    expect(register).toContain('MT-S1-001');
    expect(register).toContain('MT-S1-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails Pack');

    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Gate');
    expect(gates).toContain('MT-S1-001 through MT-S1-012');

    expect(roadmap).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Backlog Mapping');
  });

  it('preserves tenant safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/enterprise/enterprise_multitenant_runtime_sprint1_tenant_context_db_isolation_pack.md');
    const runtime = read('docs/enterprise/tenant_context_runtime_foundation_record.md');
    const db = read('docs/enterprise/tenant_database_isolation_foundation_record.md');
    const rbac = read('docs/enterprise/multitenant_sprint1_rbac_service_actor_runtime_record.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint1_tenant_context_db_isolation_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('tenant credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('tenant data');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('contract redlines');
    expect(pack).toContain('invoice/payment details');
    expect(pack).toContain('tenant billing details');
    expect(pack).toContain('payment processing data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(runtime).toContain('AI/n8n/service actors cannot approve tenant isolation readiness');
    expect(db).toContain('AI/n8n/service actors cannot approve tenant-aware database migration');
    expect(rbac).toContain('AI/n8n/service actors cannot approve service actor tenant scope');
    expect(runbook).toContain('AI/n8n/service actors cannot waive multi-tenant Sprint 1 evidence');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, runtime, db, rbac, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }
  });
});
