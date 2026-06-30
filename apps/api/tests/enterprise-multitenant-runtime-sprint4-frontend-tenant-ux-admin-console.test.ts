import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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

describe('enterprise multi-tenant runtime Sprint 4 frontend tenant UX and admin console', () => {
  it('adds Sprint 4 frontend tenant UX, tenant admin page, docs, and runbook', () => {
    const tenantSession = expectFile('apps/web/lib/tenant-session.ts');
    const apiClient = expectFile('apps/web/lib/api-client.ts');
    const shell = expectFile('apps/web/app/components/AimShell.tsx');
    const tenantAdmin = expectFile('apps/web/app/tenant-admin/TenantAdminClient.tsx');
    const tenantPage = expectFile('apps/web/app/tenant-admin/page.tsx');
    const css = expectFile('apps/web/app/globals.css');
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint4_frontend_tenant_ux_admin_console_pack.md');
    const frontendRecord = expectFile('docs/enterprise/tenant_frontend_ux_runtime_record.md');
    const adminRecord = expectFile('docs/enterprise/tenant_admin_console_governance_record.md');
    const riskRecord = expectFile('docs/enterprise/multitenant_sprint4_frontend_boundary_risk_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint4_frontend_tenant_ux_admin_console_runbook.md');

    expect(tenantSession).toContain('AIM_TENANT_SELECTION_EVENT');
    expect(tenantSession).toContain('getAimTenantSelection');
    expect(tenantSession).toContain('setAimTenantSelection');
    expect(apiClient).toContain("headers.set('x-aim-tenant-id'");
    expect(apiClient).toContain("headers.set('x-aim-tenant-slug'");
    expect(shell).toContain('/api/v1/tenant/context');
    expect(shell).toContain('/tenant-admin');
    expect(shell).toContain('Tenant context');
    expect(tenantPage).toContain('TenantAdminClient');
    expect(tenantAdmin).toContain('/api/v1/tenant/context');
    expect(tenantAdmin).toContain('/api/v1/tenant/isolation-health');
    expect(tenantAdmin).toContain('x-aim-tenant-id / x-aim-tenant-slug');
    expect(css).toContain('Enterprise Multi-Tenant Runtime Sprint 4');
    expect(css).toContain('.aim-tenant-mini-card');
    expect(css).toContain('.aim-tenant-admin-page');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 4 — Frontend Tenant UX and Tenant Admin Console Pack');
    expect(pack).toContain('MT-S4-001');
    expect(pack).toContain('MT-S4-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 4 evidence');
    expect(frontendRecord).toContain('Tenant Frontend UX Runtime Record');
    expect(frontendRecord).toContain('Backend remains enforcement layer');
    expect(adminRecord).toContain('Tenant Admin Console Governance Record');
    expect(adminRecord).toContain('does not:');
    expect(riskRecord).toContain('MT-S4-RISK-001');
    expect(runbook).toContain('enterprise-multitenant-runtime-sprint4-frontend-tenant-ux-admin-console.test.ts');
    expect(runbook).toContain('pnpm --filter @aim/web build');
  });

  it('preserves backend authority and avoids unsafe tenant admin claims', () => {
    const tenantAdmin = read('apps/web/app/tenant-admin/TenantAdminClient.tsx');
    const shell = read('apps/web/app/components/AimShell.tsx');
    const frontendRecord = read('docs/enterprise/tenant_frontend_ux_runtime_record.md');
    const adminRecord = read('docs/enterprise/tenant_admin_console_governance_record.md');
    const riskRecord = read('docs/enterprise/multitenant_sprint4_frontend_boundary_risk_record.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint4_frontend_tenant_ux_admin_console_runbook.md');

    for (const content of [tenantAdmin, shell, frontendRecord, adminRecord, riskRecord, runbook]) {
      expect(content).toContain('AI/n8n/service actors cannot');
    }

    expect(tenantAdmin).toContain('Frontend tenant selection only sends');
    expect(tenantAdmin).toContain('No tenant creation');
    expect(tenantAdmin).toContain('No approval delegation');
    expect(tenantAdmin).toContain('No frontend enforcement claim');
    expect(adminRecord).toContain('create tenants');
    expect(adminRecord).toContain('create or approve tenant memberships');
    expect(adminRecord).toContain('certify tenant isolation readiness');
    expect(frontendRecord).toContain('The frontend is not an enforcement boundary');
    expect(riskRecord).toContain('Sprint 4 package adds no migration and does not modify 0028/0029/0030/0031');
  });

  it('links Sprint 4 into release docs without creating migrations or API route changes', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 4 — Frontend Tenant UX and Tenant Admin Console');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 4 evidence');
    expect(sprint).toContain('MT-S4-001 through MT-S4-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 4 Frontend Tenant UX and Tenant Admin Console Mapping');
    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 4 Frontend Tenant UX Gate');
    expect(roadmap).toContain('Sprint 4 makes multi-tenant runtime visible and usable in the frontend');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 4 Frontend Tenant UX Backlog Mapping');

    const migrationNames = fs.readdirSync(path.join(repoRoot, 'db/migrations')).filter((file) => file.includes('sprint4'));
    expect(migrationNames).toEqual([]);
  });

  it('avoids unsafe committed evidence examples', () => {
    const docs = [
      read('docs/enterprise/enterprise_multitenant_runtime_sprint4_frontend_tenant_ux_admin_console_pack.md'),
      read('docs/enterprise/tenant_frontend_ux_runtime_record.md'),
      read('docs/enterprise/tenant_admin_console_governance_record.md'),
      read('docs/enterprise/multitenant_sprint4_frontend_boundary_risk_record.md'),
      read('docs/operations/enterprise_multitenant_runtime_sprint4_frontend_tenant_ux_admin_console_runbook.md')
    ];

    expect(docs[0]).toContain('Do not paste secrets');
    expect(docs[0]).toContain('tenant credentials');
    expect(docs[0]).toContain('customer PII');
    expect(docs[0]).toContain('real customer data');
    expect(docs[0]).toContain('tenant data');
    expect(docs[0]).toContain('tenant billing details');
    expect(docs[0]).toContain('payment processing data');
    expect(docs[0]).toContain('full API 579');
    expect(docs[0]).toContain('full API 581');
    expect(docs[0]).toContain('copied API/API-ASME formulas');

    for (const content of docs) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }
  });
});
