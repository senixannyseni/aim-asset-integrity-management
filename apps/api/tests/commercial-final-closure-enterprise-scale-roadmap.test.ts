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

describe('commercial final closure and enterprise scale roadmap consolidation evidence pack', () => {
  it('adds commercial final closure, roadmap consolidation, residual gap, and runbook records', () => {
    const pack = expectFile('docs/commercial/commercial_final_closure_enterprise_scale_roadmap_pack.md');
    const closure = expectFile('docs/commercial/commercial_final_closure_authorization_record.md');
    const roadmap = expectFile('docs/commercial/enterprise_scale_roadmap_consolidation_record.md');
    const backlog = expectFile('docs/commercial/commercial_residual_gap_investment_backlog_record.md');
    const runbook = expectFile('docs/operations/commercial_final_closure_enterprise_scale_roadmap_runbook.md');

    expect(pack).toContain('Commercial Final Closure and Enterprise Scale Roadmap Consolidation Pack');
    expect(pack).toContain('COMM-FINAL-001');
    expect(pack).toContain('COMM-FINAL-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept commercial final closure evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve enterprise scale roadmap');
    expect(pack).toContain('AI/n8n/service actors cannot sign commercial final closure');

    expect(closure).toContain('Commercial Final Closure Authorization Record');
    expect(closure).toContain('AI/n8n/service actors cannot accept commercial final closure evidence');
    expect(closure).toContain('AI/n8n/service actors cannot waive missing commercial final evidence');
    expect(closure).toContain('AI/n8n/service actors cannot close commercial final closure gaps');

    expect(roadmap).toContain('Enterprise Scale Roadmap Consolidation Record');
    expect(roadmap).toContain('AI/n8n/service actors cannot approve enterprise scale roadmap');
    expect(roadmap).toContain('AI/n8n/service actors cannot approve customer/partner expansion commitments');
    expect(roadmap).toContain('AI/n8n/service actors cannot approve enterprise release cadence');

    expect(backlog).toContain('Commercial Residual Gap and Enterprise Investment Backlog Record');
    expect(backlog).toContain('AI/n8n/service actors cannot approve enterprise investment priority');
    expect(backlog).toContain('AI/n8n/service actors cannot accept enterprise scale gaps');
    expect(backlog).toContain('AI/n8n/service actors cannot approve commercial KPI/SLA exceptions');

    expect(runbook).toContain('Commercial Final Closure and Enterprise Scale Roadmap Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot waive commercial final evidence');
  });

  it('links commercial final closure into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Commercial Final Closure and Enterprise Scale Roadmap Consolidation Pack');
    expect(readme).toContain('Commercial final closure does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept commercial final closure evidence');

    expect(sprint).toContain('Commercial Final Closure and Enterprise Scale Roadmap Consolidation Pack');
    expect(sprint).toContain('COMM-FINAL-001');
    expect(sprint).toContain('COMM-FINAL-012');

    expect(register).toContain('Commercial Final Closure and Enterprise Scale Roadmap Mapping');
    expect(register).toContain('COMM-FINAL-001');
    expect(register).toContain('COMM-FINAL-012');
    expect(register).toContain('Commercial Scale Operating Model and Partner Implementation Readiness Pack');

    expect(gates).toContain('Commercial Final Closure and Enterprise Scale Roadmap Gate');
    expect(gates).toContain('COMM-FINAL-001 through COMM-FINAL-012');

    expect(roadmap).toContain('Commercial Final Closure and Enterprise Scale Roadmap Consolidation Pack');
    expect(backlog).toContain('Commercial Final Closure and Enterprise Scale Roadmap Backlog Mapping');
  });

  it('preserves commercial final closure safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/commercial/commercial_final_closure_enterprise_scale_roadmap_pack.md');
    const closure = read('docs/commercial/commercial_final_closure_authorization_record.md');
    const roadmap = read('docs/commercial/enterprise_scale_roadmap_consolidation_record.md');
    const backlog = read('docs/commercial/commercial_residual_gap_investment_backlog_record.md');
    const runbook = read('docs/operations/commercial_final_closure_enterprise_scale_roadmap_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
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

    expect(closure).toContain('AI/n8n/service actors cannot sign commercial final closure');
    expect(roadmap).toContain('AI/n8n/service actors cannot approve customer onboarding readiness');
    expect(backlog).toContain('AI/n8n/service actors cannot accept residual commercial scale risks');
    expect(runbook).toContain('AI/n8n/service actors cannot sign commercial final closure');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, closure, roadmap, backlog, runbook]) {
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
