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

describe('post-go-live hypercare and production stabilization evidence pack', () => {
  it('adds hypercare pack, plan, incident/problem/defect, BAU handoff, and runbook records', () => {
    const pack = expectFile('docs/hypercare/post_golive_hypercare_stabilization_pack.md');
    const plan = expectFile('docs/hypercare/post_golive_hypercare_plan.md');
    const incidents = expectFile('docs/hypercare/post_golive_incident_problem_defect_record.md');
    const handoff = expectFile('docs/hypercare/post_golive_stabilization_bau_handoff_record.md');
    const runbook = expectFile('docs/operations/post_golive_hypercare_stabilization_runbook.md');

    expect(pack).toContain('Post-Go-Live Hypercare and Production Stabilization Evidence Pack');
    expect(pack).toContain('HYPERCARE-001');
    expect(pack).toContain('HYPERCARE-012');
    expect(pack).toContain('Post-go-live hypercare is production stabilization evidence, not a substitute for human operational ownership');
    expect(pack).toContain('AI/n8n/service actors cannot accept hypercare evidence');
    expect(pack).toContain('AI/n8n/service actors cannot close production incidents');
    expect(pack).toContain('AI/n8n/service actors cannot approve BAU handoff');
    expect(pack).toContain('AI/n8n/service actors cannot sign hypercare closure');

    expect(plan).toContain('Post-Go-Live Hypercare Plan');
    expect(plan).toContain('HYPERCARE-001');
    expect(plan).toContain('HYPERCARE-010');
    expect(plan).toContain('n8n remains orchestration-only');
    expect(plan).toContain('AIM remains the system of record');

    expect(incidents).toContain('Post-Go-Live Incident, Problem, and Defect Record');
    expect(incidents).toContain('AI/n8n/service actors cannot close production incidents');
    expect(incidents).toContain('n8n direct PostgreSQL write attempt');

    expect(handoff).toContain('Post-Go-Live Stabilization and BAU Handoff Record');
    expect(handoff).toContain('AI/n8n/service actors cannot approve BAU handoff');
    expect(handoff).toContain('AI/n8n/service actors cannot sign hypercare closure');

    expect(runbook).toContain('Post-Go-Live Hypercare and Production Stabilization Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot accept hypercare evidence');
  });

  it('links hypercare into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Post-Go-Live Hypercare and Production Stabilization Evidence Pack');
    expect(readme).toContain('Post-go-live hypercare does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept hypercare evidence');

    expect(sprint).toContain('Post-Go-Live Hypercare and Production Stabilization Evidence Pack');
    expect(sprint).toContain('HYPERCARE-001');
    expect(sprint).toContain('HYPERCARE-012');

    expect(register).toContain('Post-Go-Live Hypercare and Production Stabilization Mapping');
    expect(register).toContain('HYPERCARE-001');
    expect(register).toContain('HYPERCARE-012');
    expect(register).toContain('Final Production Go-Live Authorization Evidence Pack');

    expect(gates).toContain('Post-Go-Live Hypercare and Production Stabilization Gate');
    expect(gates).toContain('HYPERCARE-001 through HYPERCARE-012');

    expect(roadmap).toContain('Post-Go-Live Hypercare and Production Stabilization Evidence Pack');
    expect(backlog).toContain('Post-Go-Live Hypercare Backlog Mapping');
  });

  it('preserves hypercare safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/hypercare/post_golive_hypercare_stabilization_pack.md');
    const plan = read('docs/hypercare/post_golive_hypercare_plan.md');
    const incidents = read('docs/hypercare/post_golive_incident_problem_defect_record.md');
    const handoff = read('docs/hypercare/post_golive_stabilization_bau_handoff_record.md');
    const runbook = read('docs/operations/post_golive_hypercare_stabilization_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(plan).toContain('AI/n8n/service actors cannot accept hypercare evidence');
    expect(incidents).toContain('AI/n8n/service actors cannot close hypercare defects');
    expect(handoff).toContain('AI/n8n/service actors cannot approve residual operational risk');
    expect(runbook).toContain('AI/n8n/service actors cannot sign hypercare closure');
    expect(runbook).toContain('Do not paste secrets');

    for (const content of [pack, plan, incidents, handoff, runbook]) {
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('D:/AIM_UAT_Evidence');
      expect(content).not.toContain('mongodb+srv://');
    }
  });
});
