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

describe('Phase 5 production hardening planning pack', () => {
  it('adds the Phase 5 roadmap, backlog, acceptance gates, and security plan', () => {
    const roadmap = expectFile('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = expectFile('docs/roadmap/phase5_backlog_prioritization_matrix.md');
    const gates = expectFile('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const security = expectFile('docs/security/phase5_security_hardening_plan.md');

    expect(roadmap).toContain('Phase 5 Production Hardening Roadmap');
    expect(roadmap).toContain('Security hardening');
    expect(roadmap).toContain('CI/CD and deployment automation');
    expect(roadmap).toContain('Observability and alerting');
    expect(roadmap).toContain('Backup/restore/DR maturity');
    expect(roadmap).toContain('External integration readiness');
    expect(roadmap).toContain('Enterprise/commercial readiness');

    expect(backlog).toContain('P5-001');
    expect(backlog).toContain('P5-030');
    expect(backlog).toContain('P0');
    expect(backlog).toContain('P1');
    expect(backlog).toContain('P2');

    expect(gates).toContain('P5-GATE-001');
    expect(gates).toContain('P5-GATE-008');
    expect(gates).toContain('AI/n8n/service actors cannot approve Phase 5 gates');

    expect(security).toContain('SEC-P5-001');
    expect(security).toContain('SEC-P5-006');
    expect(security).toContain('Do not allow n8n direct PostgreSQL writes');
  });

  it('updates repository status and final handoff without reopening RC4 runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const handoff = read('docs/release/final_release_handoff_record.md');

    expect(readme).toContain('RC4-Y Final Release Operations Evidence Collection');
    expect(readme).toContain('RC4-Z Final Go/No-Go Signoff Preparation');
    expect(readme).toContain('AIM MVP Final Go/No-Go Evidence Bundle');
    expect(readme).toContain('Phase 5 Production Hardening Roadmap');
    expect(readme).toContain('AI/n8n/service actors cannot approve engineering data, sign release evidence, or authorize production go-live');

    expect(sprint).toContain('Phase 5 — Production Hardening Roadmap');
    expect(handoff).toContain('Phase 5 Production Hardening Handoff');
    expect(handoff).toContain('phase5_production_hardening_roadmap.md');
  });

  it('preserves documentation-only planning scope and formula/integration exclusions', () => {
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');

    expect(roadmap).toContain('does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration');
    expect(roadmap).toContain('full API 579');
    expect(roadmap).toContain('full API 581');
    expect(roadmap).toContain('copied API/API-ASME formulas');
    expect(gates).not.toContain('production_' + 'deployment/');
    expect(gates).not.toContain('D:/AIM_' + 'UAT_Evidence');
  });
});
