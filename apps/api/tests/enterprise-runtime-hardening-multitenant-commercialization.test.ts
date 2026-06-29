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

describe('enterprise runtime hardening and multi-tenant commercialization implementation backlog pack', () => {
  it('adds enterprise runtime, multi-tenant, security gap, and runbook records', () => {
    const pack = expectFile('docs/enterprise/enterprise_runtime_hardening_multitenant_commercialization_backlog_pack.md');
    const runtime = expectFile('docs/enterprise/enterprise_runtime_hardening_backlog_record.md');
    const multitenant = expectFile('docs/enterprise/multitenant_commercialization_backlog_record.md');
    const gaps = expectFile('docs/enterprise/enterprise_security_compliance_runtime_gap_record.md');
    const runbook = expectFile('docs/operations/enterprise_runtime_hardening_multitenant_commercialization_runbook.md');

    expect(pack).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Implementation Backlog Pack');
    expect(pack).toContain('ENT-RUNTIME-001');
    expect(pack).toContain('ENT-RUNTIME-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept enterprise runtime backlog evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve multi-tenant runtime implementation');
    expect(pack).toContain('AI/n8n/service actors cannot sign enterprise runtime hardening closure');

    expect(runtime).toContain('Enterprise Runtime Hardening Backlog Record');
    expect(runtime).toContain('AI/n8n/service actors cannot approve enterprise security hardening priority');
    expect(runtime).toContain('AI/n8n/service actors cannot accept enterprise runtime backlog evidence');
    expect(runtime).toContain('AI/n8n/service actors cannot sign enterprise runtime hardening closure');

    expect(multitenant).toContain('Multi-Tenant Commercialization Backlog Record');
    expect(multitenant).toContain('AI/n8n/service actors cannot approve multi-tenant runtime implementation');
    expect(multitenant).toContain('AI/n8n/service actors cannot approve tenant isolation readiness');
    expect(multitenant).toContain('AI/n8n/service actors cannot approve billing/payment implementation');
    expect(multitenant).toContain('AI/n8n/service actors cannot approve customer production rollout scope');

    expect(gaps).toContain('Enterprise Security, Compliance, and Runtime Gap Record');
    expect(gaps).toContain('AI/n8n/service actors cannot accept enterprise runtime risks');
    expect(gaps).toContain('AI/n8n/service actors cannot waive enterprise runtime evidence');

    expect(runbook).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign enterprise runtime hardening closure');
  });

  it('links enterprise runtime backlog into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Implementation Backlog Pack');
    expect(readme).toContain('Enterprise runtime hardening does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept enterprise runtime backlog evidence');

    expect(sprint).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Implementation Backlog Pack');
    expect(sprint).toContain('ENT-RUNTIME-001');
    expect(sprint).toContain('ENT-RUNTIME-012');

    expect(register).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Mapping');
    expect(register).toContain('ENT-RUNTIME-001');
    expect(register).toContain('ENT-RUNTIME-012');
    expect(register).toContain('Commercial Final Closure and Enterprise Scale Roadmap Consolidation Pack');

    expect(gates).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Gate');
    expect(gates).toContain('ENT-RUNTIME-001 through ENT-RUNTIME-012');

    expect(roadmap).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Implementation Backlog Pack');
    expect(backlog).toContain('Enterprise Runtime Hardening and Multi-Tenant Commercialization Backlog Mapping');
  });

  it('preserves enterprise runtime safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/enterprise/enterprise_runtime_hardening_multitenant_commercialization_backlog_pack.md');
    const runtime = read('docs/enterprise/enterprise_runtime_hardening_backlog_record.md');
    const multitenant = read('docs/enterprise/multitenant_commercialization_backlog_record.md');
    const gaps = read('docs/enterprise/enterprise_security_compliance_runtime_gap_record.md');
    const runbook = read('docs/operations/enterprise_runtime_hardening_multitenant_commercialization_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('tenant credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('contract redlines');
    expect(pack).toContain('invoice/payment details');
    expect(pack).toContain('tenant billing details');
    expect(pack).toContain('payment processing data');
    expect(pack).toContain('partner contract terms');
    expect(pack).toContain('partner credentials');
    expect(pack).toContain('confidential sales pipeline data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(runtime).toContain('AI/n8n/service actors cannot approve enterprise security hardening priority');
    expect(multitenant).toContain('AI/n8n/service actors cannot approve billing/payment implementation');
    expect(gaps).toContain('AI/n8n/service actors cannot accept enterprise runtime risks');
    expect(runbook).toContain('AI/n8n/service actors cannot waive enterprise runtime evidence');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, runtime, multitenant, gaps, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('customer@example.com password');
      expect(content).not.toContain('4111 1111 1111 1111');
      expect(content).not.toContain('sk_live_');
    }
  });
});
