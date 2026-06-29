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

describe('P5-4 backup, restore, and DR evidence pack', () => {
  it('adds concrete P5-4 backup, restore, RPO/RTO, escalation, and DR signoff records', () => {
    const pack = expectFile('docs/operations/p5_4_backup_restore_dr_pack.md');
    const backup = expectFile('docs/operations/p5_4_backup_restore_evidence_record.md');
    const rehearsal = expectFile('docs/operations/p5_4_dr_rehearsal_rpo_rto_record.md');
    const ownership = expectFile('docs/operations/p5_4_recovery_ownership_escalation_record.md');
    const runbook = expectFile('docs/operations/p5_4_backup_restore_dr_runbook.md');

    expect(pack).toContain('P5-4 Backup, Restore, and DR Pack');
    expect(pack).toContain('P5-DR-001');
    expect(pack).toContain('P5-DR-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept backup evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve restore readiness');

    expect(backup).toContain('P5-4 Backup and Restore Evidence Record');
    expect(backup).toContain('PostgreSQL Restore Rehearsal');
    expect(backup).toContain('Object-Storage Restore Rehearsal');
    expect(backup).toContain('n8n remains orchestration-only');

    expect(rehearsal).toContain('P5-4 DR Rehearsal and RPO/RTO Record');
    expect(rehearsal).toContain('RPO/RTO Targets');
    expect(rehearsal).toContain('Governance Recovery Validation');
    expect(rehearsal).toContain('AI/n8n/service actors cannot close DR gaps');

    expect(ownership).toContain('P5-4 Recovery Ownership and Escalation Record');
    expect(ownership).toContain('Escalation Matrix');
    expect(ownership).toContain('AI/n8n/service actors cannot approve DR signoff');

    expect(runbook).toContain('P5-4 Backup, Restore, and DR Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot approve restore readiness');
  });

  it('links P5-4 into Phase 5 status, acceptance gates, roadmap, backlog, and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('P5-4 Backup, Restore, and DR');
    expect(readme).toContain('P5-4 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept backup evidence');

    expect(sprint).toContain('P5-4 — Backup, Restore, and DR');
    expect(register).toContain('P5-4 Backup, Restore, and DR Mapping');
    expect(register).toContain('P5-DR-001');
    expect(register).toContain('P5-DR-012');
    expect(gates).toContain('P5-4 Execution Pack');
    expect(gates).toContain('P5-GATE-005 Backup/restore/DR gate');
    expect(roadmap).toContain('P5-4 Execution Pack');
    expect(backlog).toContain('P5-4 Backlog Mapping');
  });

  it('preserves backup/restore/DR safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/operations/p5_4_backup_restore_dr_pack.md');
    const backup = read('docs/operations/p5_4_backup_restore_evidence_record.md');
    const runbook = read('docs/operations/p5_4_backup_restore_dr_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('database dumps');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(backup).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(backup).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(backup).not.toContain('postgres://admin:password');
    expect(backup).not.toContain('D:/AIM_UAT_Evidence');
    expect(backup).not.toContain('mongodb+srv://');

    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot approve restore readiness');
  });
});
