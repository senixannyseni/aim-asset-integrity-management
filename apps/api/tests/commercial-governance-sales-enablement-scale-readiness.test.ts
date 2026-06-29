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

describe('commercial governance sales enablement and scale readiness evidence pack', () => {
  it('adds commercial governance, sales enablement, scale readiness, and runbook records', () => {
    const pack = expectFile('docs/commercial/commercial_governance_sales_enablement_scale_readiness_pack.md');
    const governance = expectFile('docs/commercial/commercial_governance_control_record.md');
    const sales = expectFile('docs/commercial/sales_enablement_demo_safety_record.md');
    const scale = expectFile('docs/commercial/scale_readiness_partner_channel_record.md');
    const runbook = expectFile('docs/operations/commercial_governance_sales_enablement_scale_readiness_runbook.md');

    expect(pack).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack');
    expect(pack).toContain('COMM-GOV-001');
    expect(pack).toContain('COMM-GOV-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept commercial governance evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve scale readiness');
    expect(pack).toContain('AI/n8n/service actors cannot sign commercial governance closure');

    expect(governance).toContain('Commercial Governance Control Record');
    expect(governance).toContain('AI/n8n/service actors cannot approve pricing or discount exceptions');
    expect(governance).toContain('AI/n8n/service actors cannot approve customer commitments');
    expect(governance).toContain('AI/n8n/service actors cannot accept commercial scale risks');

    expect(sales).toContain('Sales Enablement and Demo Safety Record');
    expect(sales).toContain('AI/n8n/service actors cannot approve sales enablement materials');
    expect(sales).toContain('AI/n8n/service actors cannot approve customer qualification');
    expect(sales).toContain('AI/n8n/service actors cannot waive sales/demo safety evidence');

    expect(scale).toContain('Scale Readiness, Partner, and Channel Record');
    expect(scale).toContain('AI/n8n/service actors cannot approve partner/channel readiness');
    expect(scale).toContain('AI/n8n/service actors cannot approve support handoff');
    expect(scale).toContain('AI/n8n/service actors cannot approve SLA exceptions');

    expect(runbook).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign commercial governance closure');
  });

  it('links commercial governance into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack');
    expect(readme).toContain('Commercial governance and scale readiness does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept commercial governance evidence');

    expect(sprint).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack');
    expect(sprint).toContain('COMM-GOV-001');
    expect(sprint).toContain('COMM-GOV-012');

    expect(register).toContain('Commercial Governance and Scale Readiness Mapping');
    expect(register).toContain('COMM-GOV-001');
    expect(register).toContain('COMM-GOV-012');
    expect(register).toContain('Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack');

    expect(gates).toContain('Commercial Governance and Scale Readiness Gate');
    expect(gates).toContain('COMM-GOV-001 through COMM-GOV-012');

    expect(roadmap).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack');
    expect(backlog).toContain('Commercial Governance and Scale Readiness Backlog Mapping');
  });

  it('preserves commercial governance safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/commercial/commercial_governance_sales_enablement_scale_readiness_pack.md');
    const governance = read('docs/commercial/commercial_governance_control_record.md');
    const sales = read('docs/commercial/sales_enablement_demo_safety_record.md');
    const scale = read('docs/commercial/scale_readiness_partner_channel_record.md');
    const runbook = read('docs/operations/commercial_governance_sales_enablement_scale_readiness_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
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

    expect(governance).toContain('AI/n8n/service actors cannot accept commercial governance evidence');
    expect(governance).toContain('AI/n8n/service actors cannot sign commercial governance closure');
    expect(sales).toContain('AI/n8n/service actors cannot approve sales enablement materials');
    expect(sales).toContain('AI/n8n/service actors cannot approve customer commitments');
    expect(scale).toContain('AI/n8n/service actors cannot approve partner/channel readiness');
    expect(scale).toContain('AI/n8n/service actors cannot approve scale readiness');
    expect(runbook).toContain('AI/n8n/service actors cannot waive commercial governance evidence');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, governance, sales, scale, runbook]) {
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
