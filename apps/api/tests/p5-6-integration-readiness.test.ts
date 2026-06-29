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

describe('P5-6 integration readiness evidence pack', () => {
  it('adds concrete P5-6 integration inventory, boundary, CMMS, notification, replay, and signoff records', () => {
    const pack = expectFile('docs/integrations/p5_6_integration_readiness_pack.md');
    const inventory = expectFile('docs/integrations/p5_6_integration_inventory_boundary_record.md');
    const cmms = expectFile('docs/integrations/p5_6_external_cmms_notification_readiness_record.md');
    const replay = expectFile('docs/integrations/p5_6_integration_failure_replay_record.md');
    const runbook = expectFile('docs/operations/p5_6_integration_readiness_runbook.md');

    expect(pack).toContain('P5-6 Integration Readiness Pack');
    expect(pack).toContain('P5-INT-001');
    expect(pack).toContain('P5-INT-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept integration evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve external CMMS cutover');

    expect(inventory).toContain('P5-6 Integration Inventory and Boundary Record');
    expect(inventory).toContain('AIM API Contract Boundary Review');
    expect(inventory).toContain('n8n Workflow Boundary Review');
    expect(inventory).toContain('n8n remains orchestration-only');
    expect(inventory).toContain('AIM remains the system of record');

    expect(cmms).toContain('P5-6 External CMMS and Notification Readiness Record');
    expect(cmms).toContain('External CMMS Readiness Decision');
    expect(cmms).toContain('Internal Work-Order Fallback');
    expect(cmms).toContain('Notification and Webhook Routing Readiness');
    expect(cmms).toContain('AI/n8n/service actors cannot approve external CMMS cutover');

    expect(replay).toContain('P5-6 Integration Failure, Replay, and Risk Record');
    expect(replay).toContain('Retry, Replay, and Idempotency Policy');
    expect(replay).toContain('Integration Error, Audit, and Correlation Logging');
    expect(replay).toContain('Integration Credential and Service-Account Review');
    expect(replay).toContain('AI/n8n/service actors cannot close integration gaps');

    expect(runbook).toContain('P5-6 Integration Readiness Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot approve integration readiness');
  });

  it('links P5-6 into Phase 5 status, acceptance gates, roadmap, backlog, and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('P5-6 Integration Readiness');
    expect(readme).toContain('P5-6 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept integration evidence');

    expect(sprint).toContain('P5-6 — Integration Readiness');
    expect(register).toContain('P5-6 Integration Readiness Mapping');
    expect(register).toContain('P5-INT-001');
    expect(register).toContain('P5-INT-012');
    expect(gates).toContain('P5-6 Execution Pack');
    expect(gates).toContain('P5-GATE-007 Integration readiness gate');
    expect(roadmap).toContain('P5-6 Execution Pack');
    expect(backlog).toContain('P5-6 Backlog Mapping');
  });

  it('preserves integration safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/integrations/p5_6_integration_readiness_pack.md');
    const inventory = read('docs/integrations/p5_6_integration_inventory_boundary_record.md');
    const cmms = read('docs/integrations/p5_6_external_cmms_notification_readiness_record.md');
    const replay = read('docs/integrations/p5_6_integration_failure_replay_record.md');
    const runbook = read('docs/operations/p5_6_integration_readiness_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('webhook secrets');
    expect(pack).toContain('CMMS credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(inventory).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(inventory).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(inventory).not.toContain('postgres://admin:password');
    expect(inventory).not.toContain('D:/AIM_UAT_Evidence');
    expect(inventory).not.toContain('mongodb+srv://');

    expect(cmms).not.toContain('postgres://admin:password');
    expect(cmms).not.toContain('D:/AIM_UAT_Evidence');
    expect(cmms).not.toMatch(/AKIA[0-9A-Z]{16}/);

    expect(replay).not.toContain('postgres://admin:password');
    expect(replay).not.toContain('D:/AIM_UAT_Evidence');
    expect(replay).not.toMatch(/AKIA[0-9A-Z]{16}/);

    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot approve integration readiness');
    expect(runbook).toContain('AI/n8n/service actors cannot approve external CMMS cutover');
    expect(runbook).toContain('n8n remains orchestration-only');
  });
});
