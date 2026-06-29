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

describe('final production go-live authorization evidence pack', () => {
  it('adds final go-live authorization pack, records, and runbook', () => {
    const pack = expectFile('docs/golive/final_production_golive_authorization_pack.md');
    const authorization = expectFile('docs/golive/final_production_golive_authorization_record.md');
    const cutover = expectFile('docs/golive/final_cutover_hypercare_activation_record.md');
    const risk = expectFile('docs/golive/final_residual_risk_business_acceptance_record.md');
    const runbook = expectFile('docs/operations/final_production_golive_authorization_runbook.md');

    expect(pack).toContain('Final Production Go-Live Authorization Evidence Pack');
    expect(pack).toContain('GOLIVE-001');
    expect(pack).toContain('GOLIVE-012');
    expect(pack).toContain('Final production go-live authorization is the last human release decision');
    expect(pack).toContain('AI/n8n/service actors cannot approve final production go-live');
    expect(pack).toContain('AI/n8n/service actors cannot accept final residual risks');

    expect(authorization).toContain('Final Production Go-Live Authorization Record');
    expect(authorization).toContain('Final human production go-live authorization');
    expect(authorization).toContain('AI/n8n/service actors cannot authorize cutover');
    expect(authorization).toContain('AI/n8n/service actors cannot sign final production authorization');

    expect(cutover).toContain('Final Cutover and Hypercare Activation Record');
    expect(cutover).toContain('Hypercare must be active before production-wide go-live is authorized');
    expect(cutover).toContain('AI/n8n/service actors cannot approve hypercare activation');
    expect(cutover).toContain('n8n remains orchestration-only');
    expect(cutover).toContain('AIM remains the system of record');

    expect(risk).toContain('Final Residual Risk and Business Acceptance Record');
    expect(risk).toContain('RISK-GOLIVE-001');
    expect(risk).toContain('AI/n8n/service actors cannot accept final residual risks');
    expect(risk).toContain('full API 579');
    expect(risk).toContain('full API 581');

    expect(runbook).toContain('Final Production Go-Live Authorization Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot close go-live gaps');
  });

  it('links final go-live authorization into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Final Production Go-Live Authorization Evidence Pack');
    expect(readme).toContain('Final production go-live authorization does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot approve final production go-live');

    expect(sprint).toContain('Final Production Go-Live Authorization Evidence Pack');
    expect(sprint).toContain('GOLIVE-001');
    expect(sprint).toContain('GOLIVE-012');

    expect(register).toContain('Final Production Go-Live Authorization Mapping');
    expect(register).toContain('GOLIVE-001');
    expect(register).toContain('GOLIVE-012');
    expect(register).toContain('Production Pilot Evidence Execution Pack');
    expect(register).toContain('Phase 5 Final Production Hardening Closure Pack');

    expect(gates).toContain('Final Production Go-Live Authorization Gate');
    expect(gates).toContain('GOLIVE-001 through GOLIVE-012');

    expect(roadmap).toContain('Final Production Go-Live Authorization Evidence Pack');
    expect(backlog).toContain('Final Production Go-Live Authorization Backlog Mapping');
  });

  it('preserves final go-live safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/golive/final_production_golive_authorization_pack.md');
    const authorization = read('docs/golive/final_production_golive_authorization_record.md');
    const cutover = read('docs/golive/final_cutover_hypercare_activation_record.md');
    const risk = read('docs/golive/final_residual_risk_business_acceptance_record.md');
    const runbook = read('docs/operations/final_production_golive_authorization_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(authorization).toContain('AI/n8n/service actors cannot waive missing evidence');
    expect(cutover).toContain('AI/n8n/service actors cannot close go-live incidents');
    expect(risk).toContain('AI/n8n/service actors cannot approve business acceptance');
    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot sign final production authorization');

    for (const content of [pack, authorization, cutover, risk, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
