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

describe('post-go-live hypercare closure and BAU transition authorization pack', () => {
  it('adds BAU transition pack, authorization, ownership, residual risk, and runbook records', () => {
    const pack = expectFile('docs/bau/post_golive_hypercare_closure_bau_transition_pack.md');
    const authorization = expectFile('docs/bau/post_golive_hypercare_closure_bau_transition_authorization_record.md');
    const ownership = expectFile('docs/bau/bau_operational_ownership_support_model_record.md');
    const risk = expectFile('docs/bau/bau_residual_risk_defect_carryover_record.md');
    const runbook = expectFile('docs/operations/post_golive_hypercare_closure_bau_transition_runbook.md');

    expect(pack).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack');
    expect(pack).toContain('BAU-001');
    expect(pack).toContain('BAU-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept BAU transition evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve BAU transition');
    expect(pack).toContain('AI/n8n/service actors cannot sign BAU transition authorization');

    expect(authorization).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Record');
    expect(authorization).toContain('AI/n8n/service actors cannot approve BAU transition');
    expect(authorization).toContain('AI/n8n/service actors cannot sign BAU transition authorization');

    expect(ownership).toContain('BAU Operational Ownership and Support Model Record');
    expect(ownership).toContain('AI/n8n/service actors cannot accept BAU ownership evidence');
    expect(ownership).toContain('AI/n8n/service actors cannot approve support handoff');
    expect(ownership).toContain('n8n remains orchestration-only');
    expect(ownership).toContain('AIM remains the system of record');

    expect(risk).toContain('BAU Residual Risk, Defect, and Carryover Record');
    expect(risk).toContain('BAU-RISK-001');
    expect(risk).toContain('AI/n8n/service actors cannot accept residual BAU risks');
    expect(risk).toContain('AI/n8n/service actors cannot close BAU defects');

    expect(runbook).toContain('Post-Go-Live Hypercare Closure and BAU Transition Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign BAU transition authorization');
  });

  it('links BAU transition into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack');
    expect(readme).toContain('BAU transition authorization does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept BAU transition evidence');

    expect(sprint).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack');
    expect(sprint).toContain('BAU-001');
    expect(sprint).toContain('BAU-012');

    expect(register).toContain('Post-Go-Live Hypercare Closure and BAU Transition Mapping');
    expect(register).toContain('BAU-001');
    expect(register).toContain('BAU-012');
    expect(register).toContain('Post-Go-Live Hypercare and Production Stabilization Evidence Pack');
    expect(register).toContain('Final Production Go-Live Authorization Evidence Pack');

    expect(gates).toContain('Post-Go-Live Hypercare Closure and BAU Transition Gate');
    expect(gates).toContain('BAU-001 through BAU-012');

    expect(roadmap).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack');
    expect(backlog).toContain('Post-Go-Live BAU Transition Backlog Mapping');
  });

  it('preserves BAU transition safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/bau/post_golive_hypercare_closure_bau_transition_pack.md');
    const authorization = read('docs/bau/post_golive_hypercare_closure_bau_transition_authorization_record.md');
    const ownership = read('docs/bau/bau_operational_ownership_support_model_record.md');
    const risk = read('docs/bau/bau_residual_risk_defect_carryover_record.md');
    const runbook = read('docs/operations/post_golive_hypercare_closure_bau_transition_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(authorization).toContain('AI/n8n/service actors cannot waive BAU transition evidence');
    expect(ownership).toContain('AI/n8n/service actors cannot close BAU ownership gaps');
    expect(risk).toContain('AI/n8n/service actors cannot approve carryover defects');
    expect(runbook).toContain('AI/n8n/service actors cannot close BAU transition gaps');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, authorization, ownership, risk, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
