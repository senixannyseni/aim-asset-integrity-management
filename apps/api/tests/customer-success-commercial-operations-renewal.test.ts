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

describe('customer success commercial operations and renewal readiness evidence pack', () => {
  it('adds customer success, commercial operations, renewal, expansion, and runbook records', () => {
    const pack = expectFile('docs/customer_success/customer_success_commercial_operations_renewal_pack.md');
    const health = expectFile('docs/customer_success/customer_success_health_adoption_record.md');
    const operations = expectFile('docs/customer_success/commercial_operations_billing_support_readiness_record.md');
    const renewal = expectFile('docs/customer_success/renewal_expansion_readiness_record.md');
    const runbook = expectFile('docs/operations/customer_success_commercial_operations_renewal_runbook.md');

    expect(pack).toContain('Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack');
    expect(pack).toContain('CS-OPS-001');
    expect(pack).toContain('CS-OPS-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept customer success evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve customer success readiness');
    expect(pack).toContain('AI/n8n/service actors cannot sign customer lifecycle closure');

    expect(health).toContain('Customer Success Health and Adoption Record');
    expect(health).toContain('AI/n8n/service actors cannot accept customer success evidence');
    expect(health).toContain('AI/n8n/service actors cannot close customer success gaps');
    expect(health).toContain('AI/n8n/service actors cannot accept customer lifecycle risks');

    expect(operations).toContain('Commercial Operations, Support, and SLA Readiness Record');
    expect(operations).toContain('AI/n8n/service actors cannot approve commercial operations handoff');
    expect(operations).toContain('AI/n8n/service actors cannot approve SLA exceptions');
    expect(operations).toContain('AI/n8n/service actors cannot authorize payment processing');

    expect(renewal).toContain('Renewal and Expansion Readiness Record');
    expect(renewal).toContain('AI/n8n/service actors cannot approve renewal readiness');
    expect(renewal).toContain('AI/n8n/service actors cannot approve expansion readiness');
    expect(renewal).toContain('AI/n8n/service actors cannot sign customer lifecycle closure');

    expect(runbook).toContain('Customer Success, Commercial Operations, and Renewal Readiness Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign customer lifecycle closure');
  });

  it('links customer success into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack');
    expect(readme).toContain('Customer success/commercial operations readiness does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept customer success evidence');

    expect(sprint).toContain('Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack');
    expect(sprint).toContain('CS-OPS-001');
    expect(sprint).toContain('CS-OPS-012');

    expect(register).toContain('Customer Success and Commercial Operations Mapping');
    expect(register).toContain('CS-OPS-001');
    expect(register).toContain('CS-OPS-012');
    expect(register).toContain('Commercial MVP Launch Control and Customer Onboarding Evidence Pack');

    expect(gates).toContain('Customer Success and Commercial Operations Gate');
    expect(gates).toContain('CS-OPS-001 through CS-OPS-012');

    expect(roadmap).toContain('Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack');
    expect(backlog).toContain('Customer Success and Commercial Operations Backlog Mapping');
  });

  it('preserves customer success/commercial operations safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/customer_success/customer_success_commercial_operations_renewal_pack.md');
    const health = read('docs/customer_success/customer_success_health_adoption_record.md');
    const operations = read('docs/customer_success/commercial_operations_billing_support_readiness_record.md');
    const renewal = read('docs/customer_success/renewal_expansion_readiness_record.md');
    const runbook = read('docs/operations/customer_success_commercial_operations_renewal_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('contract redlines');
    expect(pack).toContain('invoice/payment details');
    expect(pack).toContain('tenant billing details');
    expect(pack).toContain('payment processing data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(health).toContain('Do not paste secrets');
    expect(health).toContain('AI/n8n/service actors cannot approve customer success readiness');
    expect(operations).toContain('AI/n8n/service actors cannot approve commercial operations handoff');
    expect(operations).toContain('AI/n8n/service actors cannot authorize payment processing');
    expect(renewal).toContain('AI/n8n/service actors cannot approve renewal readiness');
    expect(renewal).toContain('AI/n8n/service actors cannot approve expansion scope');
    expect(runbook).toContain('AI/n8n/service actors cannot accept customer lifecycle risks');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, health, operations, renewal, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('customer@example.com password');
      expect(content).not.toContain('4111 1111 1111 1111');
    }
  });
});
