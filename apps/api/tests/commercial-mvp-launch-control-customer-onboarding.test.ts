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

describe('commercial MVP launch control and customer onboarding evidence pack', () => {
  it('adds launch pack, launch authorization, onboarding, support/SLA, and runbook records', () => {
    const pack = expectFile('docs/commercial/commercial_mvp_launch_control_customer_onboarding_pack.md');
    const launch = expectFile('docs/commercial/commercial_mvp_launch_control_authorization_record.md');
    const onboarding = expectFile('docs/commercial/customer_onboarding_readiness_record.md');
    const support = expectFile('docs/commercial/customer_acceptance_support_sla_record.md');
    const runbook = expectFile('docs/operations/commercial_mvp_launch_control_customer_onboarding_runbook.md');

    expect(pack).toContain('Commercial MVP Launch Control and Customer Onboarding Evidence Pack');
    expect(pack).toContain('COMM-LAUNCH-001');
    expect(pack).toContain('COMM-LAUNCH-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept commercial launch evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve commercial launch');
    expect(pack).toContain('AI/n8n/service actors cannot sign commercial launch authorization');

    expect(launch).toContain('Commercial MVP Launch Control Authorization Record');
    expect(launch).toContain('AI/n8n/service actors cannot approve commercial launch');
    expect(launch).toContain('AI/n8n/service actors cannot accept commercial launch risks');
    expect(launch).toContain('AI/n8n/service actors cannot sign commercial launch authorization');

    expect(onboarding).toContain('Customer Onboarding Readiness Record');
    expect(onboarding).toContain('AI/n8n/service actors cannot approve customer onboarding');
    expect(onboarding).toContain('AI/n8n/service actors cannot approve customer acceptance');
    expect(onboarding).toContain('AI/n8n/service actors cannot waive customer onboarding evidence');

    expect(support).toContain('Commercial Customer Acceptance, Support, and SLA Record');
    expect(support).toContain('AI/n8n/service actors cannot approve customer acceptance');
    expect(support).toContain('AI/n8n/service actors cannot approve SLA commitments');
    expect(support).toContain('AI/n8n/service actors cannot authorize customer rollback or offboarding');

    expect(runbook).toContain('Commercial MVP Launch Control and Customer Onboarding Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign commercial launch authorization');
  });

  it('links commercial launch into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Commercial MVP Launch Control and Customer Onboarding Evidence Pack');
    expect(readme).toContain('Commercial launch control does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept commercial launch evidence');

    expect(sprint).toContain('Commercial MVP Launch Control and Customer Onboarding Evidence Pack');
    expect(sprint).toContain('COMM-LAUNCH-001');
    expect(sprint).toContain('COMM-LAUNCH-012');

    expect(register).toContain('Commercial MVP Launch Control and Customer Onboarding Mapping');
    expect(register).toContain('COMM-LAUNCH-001');
    expect(register).toContain('COMM-LAUNCH-012');
    expect(register).toContain('Final Productization and Commercial Readiness Roadmap Pack');

    expect(gates).toContain('Commercial MVP Launch Control and Customer Onboarding Gate');
    expect(gates).toContain('COMM-LAUNCH-001 through COMM-LAUNCH-012');

    expect(roadmap).toContain('Commercial MVP Launch Control and Customer Onboarding Evidence Pack');
    expect(backlog).toContain('Commercial MVP Launch Control and Customer Onboarding Backlog Mapping');
  });

  it('preserves commercial launch safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/commercial/commercial_mvp_launch_control_customer_onboarding_pack.md');
    const launch = read('docs/commercial/commercial_mvp_launch_control_authorization_record.md');
    const onboarding = read('docs/commercial/customer_onboarding_readiness_record.md');
    const support = read('docs/commercial/customer_acceptance_support_sla_record.md');
    const runbook = read('docs/operations/commercial_mvp_launch_control_customer_onboarding_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('customer commercial terms');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('contract redlines');
    expect(pack).toContain('invoice/payment details');
    expect(pack).toContain('tenant billing');
    expect(pack).toContain('payment processing');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(launch).toContain('AI/n8n/service actors cannot accept commercial launch risks');
    expect(onboarding).toContain('Do not paste secrets');
    expect(onboarding).toContain('AI/n8n/service actors cannot waive customer onboarding evidence');
    expect(support).toContain('AI/n8n/service actors cannot approve SLA commitments');
    expect(support).toContain('AI/n8n/service actors cannot authorize customer rollback or offboarding');
    expect(runbook).toContain('AI/n8n/service actors cannot approve customer onboarding');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, launch, onboarding, support, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('customer@example.com password');
    }
  });
});
