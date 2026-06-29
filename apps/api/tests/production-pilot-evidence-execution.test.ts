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

describe('production pilot evidence execution pack', () => {
  it('adds pilot execution pack, plan, validation, readiness, defect/risk, and runbook records', () => {
    const pack = expectFile('docs/pilot/production_pilot_evidence_execution_pack.md');
    const plan = expectFile('docs/pilot/production_pilot_execution_plan.md');
    const business = expectFile('docs/pilot/production_pilot_uat_business_validation_record.md');
    const operations = expectFile('docs/pilot/production_pilot_operational_readiness_record.md');
    const decision = expectFile('docs/pilot/production_pilot_defect_risk_decision_record.md');
    const runbook = expectFile('docs/operations/production_pilot_evidence_execution_runbook.md');

    expect(pack).toContain('Production Pilot Evidence Execution Pack');
    expect(pack).toContain('PILOT-001');
    expect(pack).toContain('PILOT-012');
    expect(pack).toContain('Production pilot evidence execution is not production-wide go-live approval');
    expect(pack).toContain('AI/n8n/service actors cannot accept production pilot evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve pilot completion');
    expect(pack).toContain('AI/n8n/service actors cannot approve production-wide go-live');

    expect(plan).toContain('Production Pilot Execution Plan');
    expect(plan).toContain('PILOT-SCN-001');
    expect(plan).toContain('PILOT-SCN-012');
    expect(plan).toContain('n8n remains orchestration-only');
    expect(plan).toContain('AIM remains the system of record');

    expect(business).toContain('Production Pilot UAT and Business Validation Record');
    expect(business).toContain('Pilot KPI Scorecard');
    expect(business).toContain('AI/n8n/service actors cannot approve business validation');

    expect(operations).toContain('Production Pilot Operational Readiness Record');
    expect(operations).toContain('AI/n8n/service actors cannot accept operational readiness evidence');
    expect(operations).toContain('AI/n8n/service actors cannot close pilot incidents');

    expect(decision).toContain('Production Pilot Defect, Risk, and Decision Record');
    expect(decision).toContain('Proceed to wider go/no-go meeting');
    expect(decision).toContain('AI/n8n/service actors cannot accept residual pilot risks');

    expect(runbook).toContain('Production Pilot Evidence Execution Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
  });

  it('links production pilot execution into README, sprint status, release evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Production Pilot Evidence Execution Pack');
    expect(readme).toContain('Production pilot evidence execution does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept production pilot evidence');

    expect(sprint).toContain('Production Pilot Evidence Execution Pack');
    expect(sprint).toContain('PILOT-001');
    expect(sprint).toContain('PILOT-012');

    expect(register).toContain('Production Pilot Evidence Execution Mapping');
    expect(register).toContain('PILOT-001');
    expect(register).toContain('PILOT-012');
    expect(register).toContain('Production pilot evidence execution is not production-wide go-live approval');

    expect(gates).toContain('Production Pilot Evidence Execution Pack');
    expect(gates).toContain('PILOT-001 through PILOT-012');

    expect(roadmap).toContain('Production Pilot Evidence Execution Pack');
    expect(backlog).toContain('Production Pilot Evidence Execution Backlog Mapping');
  });

  it('preserves pilot safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/pilot/production_pilot_evidence_execution_pack.md');
    const plan = read('docs/pilot/production_pilot_execution_plan.md');
    const operations = read('docs/pilot/production_pilot_operational_readiness_record.md');
    const decision = read('docs/pilot/production_pilot_defect_risk_decision_record.md');
    const runbook = read('docs/operations/production_pilot_evidence_execution_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(plan).toContain('AI/n8n/service actors cannot accept production pilot evidence');
    expect(operations).toContain('n8n remains orchestration-only');
    expect(operations).toContain('AIM remains the system of record');
    expect(decision).toContain('AI/n8n/service actors cannot sign the final pilot decision');
    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot close pilot defects or accept residual pilot risks');

    for (const content of [pack, plan, operations, decision, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
