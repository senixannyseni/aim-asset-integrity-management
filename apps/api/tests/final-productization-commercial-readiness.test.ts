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

describe('final productization and commercial readiness roadmap pack', () => {
  it('adds productization pack, roadmap, commercial model, gap backlog, and runbook records', () => {
    const pack = expectFile('docs/productization/final_productization_commercial_readiness_pack.md');
    const roadmap = expectFile('docs/productization/productization_commercial_readiness_roadmap.md');
    const commercial = expectFile('docs/productization/commercial_packaging_tenant_support_model_record.md');
    const gaps = expectFile('docs/productization/enterprise_readiness_gap_backlog_record.md');
    const runbook = expectFile('docs/operations/final_productization_commercial_readiness_runbook.md');

    expect(pack).toContain('Final Productization and Commercial Readiness Roadmap Pack');
    expect(pack).toContain('PROD-READY-001');
    expect(pack).toContain('PROD-READY-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept productization evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve commercial readiness');
    expect(pack).toContain('AI/n8n/service actors cannot sign productization roadmap approval');

    expect(roadmap).toContain('Productization and Commercial Readiness Roadmap');
    expect(roadmap).toContain('Productization roadmap readiness is not commercial launch approval');
    expect(roadmap).toContain('AI/n8n/service actors cannot approve commercial readiness');
    expect(roadmap).toContain('AIM remains the system of record');

    expect(commercial).toContain('Commercial Packaging, Tenant, and Support Model Record');
    expect(commercial).toContain('AI/n8n/service actors cannot approve customer onboarding readiness');
    expect(commercial).toContain('AI/n8n/service actors cannot approve pricing or licensing');
    expect(commercial).toContain('n8n remains orchestration-only');

    expect(gaps).toContain('Enterprise Readiness Gap and Commercial Backlog Record');
    expect(gaps).toContain('PROD-GAP-001');
    expect(gaps).toContain('AI/n8n/service actors cannot accept enterprise readiness gaps');
    expect(gaps).toContain('AI/n8n/service actors cannot approve continuous improvement priority');
    expect(gaps).toContain('AI/n8n/service actors cannot sign productization roadmap approval');

    expect(runbook).toContain('Final Productization and Commercial Readiness Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign productization roadmap approval');
  });

  it('links productization readiness into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Final Productization and Commercial Readiness Roadmap Pack');
    expect(readme).toContain('Productization readiness does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept productization evidence');

    expect(sprint).toContain('Final Productization and Commercial Readiness Roadmap Pack');
    expect(sprint).toContain('PROD-READY-001');
    expect(sprint).toContain('PROD-READY-012');

    expect(register).toContain('Final Productization and Commercial Readiness Mapping');
    expect(register).toContain('PROD-READY-001');
    expect(register).toContain('PROD-READY-012');
    expect(register).toContain('Final Production Operations Closure and Continuous Improvement Backlog Pack');

    expect(gates).toContain('Final Productization and Commercial Readiness Roadmap Gate');
    expect(gates).toContain('PROD-READY-001 through PROD-READY-012');

    expect(roadmap).toContain('Final Productization and Commercial Readiness Roadmap Pack');
    expect(backlog).toContain('Final Productization and Commercial Readiness Backlog Mapping');
  });

  it('preserves productization safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/productization/final_productization_commercial_readiness_pack.md');
    const roadmap = read('docs/productization/productization_commercial_readiness_roadmap.md');
    const commercial = read('docs/productization/commercial_packaging_tenant_support_model_record.md');
    const gaps = read('docs/productization/enterprise_readiness_gap_backlog_record.md');
    const runbook = read('docs/operations/final_productization_commercial_readiness_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');
    expect(pack).toContain('tenant billing');
    expect(pack).toContain('payment processing');

    expect(roadmap).toContain('Productization roadmap readiness is not commercial launch approval');
    expect(commercial).toContain('Do not paste secrets');
    expect(gaps).toContain('AI/n8n/service actors cannot accept residual commercial risks');
    expect(gaps).toContain('AI/n8n/service actors cannot waive missing productization evidence');
    expect(runbook).toContain('AI/n8n/service actors cannot approve pricing or licensing');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, roadmap, commercial, gaps, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
