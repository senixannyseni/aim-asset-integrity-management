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

describe('enterprise multi-tenant runtime Sprint 0 architecture and guardrails pack', () => {
  it('adds Sprint 0 architecture, tenant isolation, RBAC/service actor, migration, and runbook records', () => {
    const pack = expectFile('docs/enterprise/enterprise_multitenant_runtime_sprint0_architecture_guardrails_pack.md');
    const architecture = expectFile('docs/enterprise/tenant_isolation_architecture_decision_record.md');
    const rbac = expectFile('docs/enterprise/multitenant_rbac_service_actor_guardrails_record.md');
    const migration = expectFile('docs/enterprise/multitenant_migration_runtime_rollout_guardrails_record.md');
    const runbook = expectFile('docs/operations/enterprise_multitenant_runtime_sprint0_architecture_guardrails_runbook.md');

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack');
    expect(pack).toContain('MT-S0-001');
    expect(pack).toContain('MT-S0-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 0 evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve tenant architecture');
    expect(pack).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 0 closure');

    expect(architecture).toContain('Tenant Isolation Architecture Decision Record');
    expect(architecture).toContain('AI/n8n/service actors cannot approve tenant architecture');
    expect(architecture).toContain('AI/n8n/service actors cannot approve tenant isolation readiness');
    expect(architecture).toContain('AIM remains the system of record');

    expect(rbac).toContain('Multi-Tenant RBAC and Service Actor Guardrails Record');
    expect(rbac).toContain('AI/n8n/service actors cannot approve tenant-aware RBAC changes');
    expect(rbac).toContain('AI/n8n/service actors cannot approve service actor tenant scope');
    expect(rbac).toContain('n8n remains orchestration-only');

    expect(migration).toContain('Multi-Tenant Migration and Runtime Rollout Guardrails Record');
    expect(migration).toContain('AI/n8n/service actors cannot approve migration rollout readiness');
    expect(migration).toContain('AI/n8n/service actors cannot waive multi-tenant guardrail evidence');

    expect(runbook).toContain('Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails Runbook');
    expect(runbook).toContain('pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint0-architecture-guardrails.test.ts');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign multi-tenant Sprint 0 closure');
  });

  it('links Sprint 0 into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack');
    expect(readme).toContain('Enterprise Multi-Tenant Runtime Sprint 0 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept multi-tenant Sprint 0 evidence');

    expect(sprint).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack');
    expect(sprint).toContain('MT-S0-001');
    expect(sprint).toContain('MT-S0-012');

    expect(register).toContain('Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails Mapping');
    expect(register).toContain('MT-S0-001');
    expect(register).toContain('MT-S0-012');
    expect(register).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Implementation Backlog Pack');

    expect(gates).toContain('Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails Gate');
    expect(gates).toContain('MT-S0-001 through MT-S0-012');

    expect(roadmap).toContain('Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails Mapping');
  });

  it('preserves multi-tenant safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/enterprise/enterprise_multitenant_runtime_sprint0_architecture_guardrails_pack.md');
    const architecture = read('docs/enterprise/tenant_isolation_architecture_decision_record.md');
    const rbac = read('docs/enterprise/multitenant_rbac_service_actor_guardrails_record.md');
    const migration = read('docs/enterprise/multitenant_migration_runtime_rollout_guardrails_record.md');
    const runbook = read('docs/operations/enterprise_multitenant_runtime_sprint0_architecture_guardrails_runbook.md');

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
    expect(pack).toContain('partner contract terms');
    expect(pack).toContain('confidential sales pipeline data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(architecture).toContain('AI/n8n/service actors cannot approve tenant isolation readiness');
    expect(rbac).toContain('AI/n8n/service actors cannot approve service actor tenant scope');
    expect(migration).toContain('AI/n8n/service actors cannot approve migration rollout readiness');
    expect(runbook).toContain('AI/n8n/service actors cannot waive multi-tenant guardrail evidence');
    expect(runbook).toContain('Do not paste secrets');

    expect(pack).not.toContain('sk-live-');
    expect(pack).not.toContain('BEGIN PRIVATE KEY');
    expect(pack).not.toContain('postgres://');
    expect(pack).not.toContain('password=');
  });
});
