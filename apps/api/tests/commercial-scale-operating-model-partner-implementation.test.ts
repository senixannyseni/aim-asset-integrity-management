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

describe('commercial scale operating model and partner implementation readiness evidence pack', () => {
  it('adds scale operating model, partner implementation, rollout support capacity, and runbook records', () => {
    const pack = expectFile('docs/commercial/commercial_scale_operating_model_partner_implementation_pack.md');
    const delivery = expectFile('docs/commercial/scale_operating_model_delivery_governance_record.md');
    const partner = expectFile('docs/commercial/partner_implementation_readiness_record.md');
    const rollout = expectFile('docs/commercial/multi_customer_rollout_support_capacity_record.md');
    const runbook = expectFile('docs/operations/commercial_scale_operating_model_partner_implementation_runbook.md');

    expect(pack).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Pack');
    expect(pack).toContain('SCALE-OPS-001');
    expect(pack).toContain('SCALE-OPS-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept scale operating model evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve partner implementation readiness');
    expect(pack).toContain('AI/n8n/service actors cannot sign scale operating model closure');

    expect(delivery).toContain('Scale Operating Model and Delivery Governance Record');
    expect(delivery).toContain('AI/n8n/service actors cannot approve delivery role assignments');
    expect(delivery).toContain('AI/n8n/service actors cannot approve implementation methodology');
    expect(delivery).toContain('AI/n8n/service actors cannot approve scale operating model readiness');

    expect(partner).toContain('Partner Implementation Readiness Record');
    expect(partner).toContain('AI/n8n/service actors cannot approve partner implementation readiness');
    expect(partner).toContain('AI/n8n/service actors cannot accept partner implementation evidence');
    expect(partner).toContain('AI/n8n/service actors cannot approve partner access scope');

    expect(rollout).toContain('Multi-Customer Rollout and Support Capacity Record');
    expect(rollout).toContain('AI/n8n/service actors cannot approve support escalation handoff');
    expect(rollout).toContain('AI/n8n/service actors cannot approve multi-customer rollout readiness');
    expect(rollout).toContain('AI/n8n/service actors cannot accept scale operating risks');

    expect(runbook).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot waive scale operating evidence');
  });

  it('links scale operating model into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Pack');
    expect(readme).toContain('Commercial scale operating model does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept scale operating model evidence');

    expect(sprint).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Pack');
    expect(sprint).toContain('SCALE-OPS-001');
    expect(sprint).toContain('SCALE-OPS-012');

    expect(register).toContain('Commercial Scale Operating Model and Partner Implementation Mapping');
    expect(register).toContain('SCALE-OPS-001');
    expect(register).toContain('SCALE-OPS-012');
    expect(register).toContain('Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack');

    expect(gates).toContain('Commercial Scale Operating Model and Partner Implementation Gate');
    expect(gates).toContain('SCALE-OPS-001 through SCALE-OPS-012');

    expect(roadmap).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Pack');
    expect(backlog).toContain('Commercial Scale Operating Model and Partner Implementation Backlog Mapping');
  });

  it('preserves scale operating model safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/commercial/commercial_scale_operating_model_partner_implementation_pack.md');
    const delivery = read('docs/commercial/scale_operating_model_delivery_governance_record.md');
    const partner = read('docs/commercial/partner_implementation_readiness_record.md');
    const rollout = read('docs/commercial/multi_customer_rollout_support_capacity_record.md');
    const runbook = read('docs/operations/commercial_scale_operating_model_partner_implementation_runbook.md');

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
    expect(pack).toContain('partner credentials');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(delivery).toContain('AI/n8n/service actors cannot sign scale operating model closure');
    expect(partner).toContain('AI/n8n/service actors cannot accept scale operating risks');
    expect(rollout).toContain('AI/n8n/service actors cannot approve SLA exceptions');
    expect(runbook).toContain('AI/n8n/service actors cannot sign scale operating model closure');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, delivery, partner, rollout, runbook]) {
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
