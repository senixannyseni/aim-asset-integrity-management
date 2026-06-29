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

describe('final production operations closure and continuous improvement backlog pack', () => {
  it('adds operations closure pack, authorization, KPI/SLA, backlog, and runbook records', () => {
    const pack = expectFile('docs/operations/final_production_operations_closure_pack.md');
    const authorization = expectFile('docs/operations/final_production_operations_closure_authorization_record.md');
    const backlog = expectFile('docs/operations/continuous_improvement_backlog_record.md');
    const kpi = expectFile('docs/operations/production_operations_kpi_sla_governance_record.md');
    const runbook = expectFile('docs/operations/final_production_operations_closure_runbook.md');

    expect(pack).toContain('Final Production Operations Closure and Continuous Improvement Backlog Pack');
    expect(pack).toContain('OPS-CLOSE-001');
    expect(pack).toContain('OPS-CLOSE-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept operations closure evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve continuous improvement priority');
    expect(pack).toContain('AI/n8n/service actors cannot sign final operations closure');

    expect(authorization).toContain('Final Production Operations Closure Authorization Record');
    expect(authorization).toContain('AI/n8n/service actors cannot close operations closure gaps');
    expect(authorization).toContain('AI/n8n/service actors cannot sign final operations closure');

    expect(backlog).toContain('Continuous Improvement Backlog and Prioritization Record');
    expect(backlog).toContain('CI-001');
    expect(backlog).toContain('AI/n8n/service actors cannot approve continuous improvement priority');
    expect(backlog).toContain('AI/n8n/service actors cannot approve enterprise-readiness carryover');

    expect(kpi).toContain('Production Operations KPI, SLA, and Governance Cadence Record');
    expect(kpi).toContain('AI/n8n/service actors cannot approve KPI/SLA exceptions');
    expect(kpi).toContain('AI/n8n/service actors cannot accept residual operational risks');
    expect(kpi).toContain('n8n remains orchestration-only');
    expect(kpi).toContain('AIM remains the system of record');

    expect(runbook).toContain('Final Production Operations Closure and Continuous Improvement Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot sign final operations closure');
  });

  it('links operations closure into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Final Production Operations Closure and Continuous Improvement Backlog Pack');
    expect(readme).toContain('Operations closure does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept operations closure evidence');

    expect(sprint).toContain('Final Production Operations Closure and Continuous Improvement Backlog Pack');
    expect(sprint).toContain('OPS-CLOSE-001');
    expect(sprint).toContain('OPS-CLOSE-012');

    expect(register).toContain('Final Production Operations Closure Mapping');
    expect(register).toContain('OPS-CLOSE-001');
    expect(register).toContain('OPS-CLOSE-012');
    expect(register).toContain('Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack');
    expect(register).toContain('Final Production Go-Live Authorization Evidence Pack');

    expect(gates).toContain('Final Production Operations Closure and Continuous Improvement Gate');
    expect(gates).toContain('OPS-CLOSE-001 through OPS-CLOSE-012');

    expect(roadmap).toContain('Final Production Operations Closure and Continuous Improvement Backlog Pack');
    expect(backlog).toContain('Final Production Operations Closure Backlog Mapping');
  });

  it('preserves operations closure safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/operations/final_production_operations_closure_pack.md');
    const authorization = read('docs/operations/final_production_operations_closure_authorization_record.md');
    const backlog = read('docs/operations/continuous_improvement_backlog_record.md');
    const kpi = read('docs/operations/production_operations_kpi_sla_governance_record.md');
    const runbook = read('docs/operations/final_production_operations_closure_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(authorization).toContain('AI/n8n/service actors cannot waive operations closure evidence');
    expect(backlog).toContain('AI/n8n/service actors cannot accept improvement backlog evidence');
    expect(kpi).toContain('AI/n8n/service actors cannot close production operations risks');
    expect(runbook).toContain('AI/n8n/service actors cannot close operations closure gaps');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, authorization, backlog, kpi, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
