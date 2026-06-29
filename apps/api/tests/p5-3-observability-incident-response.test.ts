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

describe('P5-3 observability and incident response evidence pack', () => {
  it('adds concrete P5-3 monitoring, alerting, incident response, and hypercare records', () => {
    const pack = expectFile('docs/operations/p5_3_observability_incident_response_pack.md');
    const monitoring = expectFile('docs/operations/p5_3_monitoring_alerting_evidence_record.md');
    const incident = expectFile('docs/operations/p5_3_incident_response_escalation_record.md');
    const handoff = expectFile('docs/operations/p5_3_hypercare_observability_handoff_record.md');
    const runbook = expectFile('docs/operations/p5_3_observability_incident_response_runbook.md');

    expect(pack).toContain('P5-3 Observability and Incident Response Pack');
    expect(pack).toContain('P5-OBS-001');
    expect(pack).toContain('P5-OBS-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept observability evidence');

    expect(monitoring).toContain('P5-3 Monitoring and Alerting Evidence Record');
    expect(monitoring).toContain('Alert Routing Verification');
    expect(monitoring).toContain('Dashboard Baseline');
    expect(monitoring).toContain('n8n remains orchestration-only');

    expect(incident).toContain('P5-3 Incident Response and Escalation Record');
    expect(incident).toContain('incident response tabletop');
    expect(incident).toContain('Escalation Matrix');
    expect(incident).toContain('AI/n8n/service actors cannot close incidents');

    expect(handoff).toContain('P5-3 Hypercare Observability Handoff Record');
    expect(handoff).toContain('Hypercare Cadence');
    expect(handoff).toContain('Rollback owner');

    expect(runbook).toContain('P5-3 Observability and Incident Response Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot approve monitoring readiness');
  });

  it('links P5-3 into Phase 5 status, acceptance gates, roadmap, backlog, and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('P5-3 Observability and Incident Response');
    expect(readme).toContain('P5-3 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept observability evidence');

    expect(sprint).toContain('P5-3 — Observability and Incident Response');
    expect(register).toContain('P5-3 Observability and Incident Response Mapping');
    expect(register).toContain('P5-OBS-001');
    expect(register).toContain('P5-OBS-012');
    expect(gates).toContain('P5-3 Execution Pack');
    expect(gates).toContain('P5-GATE-004 Observability gate');
    expect(roadmap).toContain('P5-3 Execution Pack');
    expect(backlog).toContain('P5-3 Backlog Mapping');
  });

  it('preserves observability safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/operations/p5_3_observability_incident_response_pack.md');
    const monitoring = read('docs/operations/p5_3_monitoring_alerting_evidence_record.md');
    const runbook = read('docs/operations/p5_3_observability_incident_response_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(monitoring).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(monitoring).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(monitoring).not.toContain('postgres://admin:password');
    expect(monitoring).not.toContain('D:/AIM_UAT_Evidence');

    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot approve monitoring readiness');
  });
});
