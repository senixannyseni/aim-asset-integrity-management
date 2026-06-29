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

describe('Phase 5 final production hardening closure pack', () => {
  it('adds final Phase 5 closure pack, evidence index, decision record, and runbook', () => {
    const pack = expectFile('docs/release/phase5_final_production_hardening_closure_pack.md');
    const index = expectFile('docs/release/phase5_final_evidence_closure_index.md');
    const decision = expectFile('docs/release/phase5_final_closure_decision_record.md');
    const runbook = expectFile('docs/operations/phase5_final_production_hardening_closure_runbook.md');

    expect(pack).toContain('Phase 5 Final Production Hardening Closure Pack');
    expect(pack).toContain('P5-FINAL-001');
    expect(pack).toContain('P5-FINAL-012');
    expect(pack).toContain('P5-1 through P5-6 are closed as evidence-control baseline');
    expect(pack).toContain('Phase 5 final closure is not production go-live approval');
    expect(pack).toContain('AI/n8n/service actors cannot accept Phase 5 closure evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve production go-live');

    expect(index).toContain('Phase 5 Final Evidence Closure Index');
    expect(index).toContain('P5-SEC-001 through P5-SEC-012');
    expect(index).toContain('P5-ENV-001 through P5-ENV-012');
    expect(index).toContain('P5-OBS-001 through P5-OBS-012');
    expect(index).toContain('P5-DR-001 through P5-DR-012');
    expect(index).toContain('P5-PERF-001 through P5-PERF-012');
    expect(index).toContain('P5-INT-001 through P5-INT-012');
    expect(index).toContain('P5-FINAL-001 through P5-FINAL-012');
    expect(index).toContain('P5-GATE-001 Security gate');
    expect(index).toContain('P5-GATE-008 Enterprise readiness gate');

    expect(decision).toContain('Phase 5 Final Closure Decision Record');
    expect(decision).toContain('proceed to production-pilot go/no-go meeting');
    expect(decision).toContain('Final human closure signoff');
    expect(decision).toContain('AI/n8n/service actors cannot approve this decision record');

    expect(runbook).toContain('Phase 5 Final Production Hardening Closure Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot close Phase 5 final closure gaps');
    expect(runbook).toContain('n8n remains orchestration-only');
    expect(runbook).toContain('AIM remains the system of record');
  });

  it('links final closure into README, sprint status, release evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Phase 5 Final Production Hardening Closure Pack');
    expect(readme).toContain('Phase 5 final closure does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept Phase 5 closure evidence');

    expect(sprint).toContain('Phase 5 Final Production Hardening Closure Pack');
    expect(sprint).toContain('P5-FINAL-001');
    expect(sprint).toContain('P5-FINAL-012');

    expect(register).toContain('Phase 5 Final Production Hardening Closure Mapping');
    expect(register).toContain('P5-FINAL-001');
    expect(register).toContain('P5-FINAL-012');
    expect(register).toContain('P5-1 through P5-6 are closed as evidence-control baseline');

    expect(gates).toContain('Phase 5 Final Closure Execution Pack');
    expect(gates).toContain('P5-GATE-001 through P5-GATE-008');
    expect(gates).toContain('P5-FINAL-001 through P5-FINAL-012');

    expect(roadmap).toContain('Phase 5 Final Closure Execution Pack');
    expect(backlog).toContain('Phase 5 Final Closure Backlog Mapping');
  });

  it('preserves closure safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/release/phase5_final_production_hardening_closure_pack.md');
    const index = read('docs/release/phase5_final_evidence_closure_index.md');
    const decision = read('docs/release/phase5_final_closure_decision_record.md');
    const runbook = read('docs/operations/phase5_final_production_hardening_closure_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(index).toContain('AI/n8n/service actors cannot accept Phase 5 closure evidence');
    expect(index).toContain('AI/n8n/service actors cannot approve production go-live');
    expect(decision).toContain('AI/n8n/service actors cannot accept Phase 5 closure evidence');
    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot sign Phase 5 final closure');

    for (const content of [pack, index, decision, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
