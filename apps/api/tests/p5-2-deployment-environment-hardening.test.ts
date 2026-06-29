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

describe('P5-2 deployment and environment hardening evidence pack', () => {
  it('adds concrete P5-2 deployment, environment, migration, smoke, and rollback records', () => {
    const pack = expectFile('docs/deployment/p5_2_deployment_environment_hardening_pack.md');
    const environment = expectFile('docs/deployment/p5_2_environment_configuration_evidence_record.md');
    const migration = expectFile('docs/deployment/p5_2_migration_seed_validation_record.md');
    const smoke = expectFile('docs/deployment/p5_2_deployment_smoke_rollback_record.md');
    const runbook = expectFile('docs/operations/p5_2_deployment_environment_evidence_runbook.md');

    expect(pack).toContain('P5-2 Deployment and Environment Hardening Pack');
    expect(pack).toContain('P5-ENV-001');
    expect(pack).toContain('P5-ENV-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept deployment evidence');

    expect(environment).toContain('P5-2 Environment Configuration Evidence Record');
    expect(environment).toContain('Environment Variable Inventory');
    expect(environment).toContain('n8n has no direct PostgreSQL write access');
    expect(environment).toContain('no direct n8n PostgreSQL writes are configured or permitted');

    expect(migration).toContain('P5-2 Migration and Seed Validation Record');
    expect(migration).toContain('Migration and seed rehearsal');
    expect(migration).toContain('rollback plan');

    expect(smoke).toContain('P5-2 Deployment Smoke and Rollback Evidence Record');
    expect(smoke).toContain('Deployment Smoke and Rollback Evidence Record');
    expect(smoke).toContain('Report issue gate');
    expect(smoke).toContain('Work-order closure gate');

    expect(runbook).toContain('P5-2 Deployment and Environment Evidence Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
  });

  it('links P5-2 into Phase 5 status, acceptance gates, roadmap, and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('P5-2 Deployment and Environment Hardening');
    expect(readme).toContain('P5-2 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept deployment evidence');

    expect(sprint).toContain('P5-2 — Deployment and Environment Hardening');
    expect(register).toContain('P5-2 Deployment and Environment Hardening Mapping');
    expect(register).toContain('P5-ENV-001');
    expect(register).toContain('P5-ENV-012');
    expect(gates).toContain('P5-2 Execution Pack');
    expect(gates).toContain('P5-GATE-002 Deployment gate');
    expect(gates).toContain('P5-GATE-003 Environment gate');
    expect(roadmap).toContain('P5-2 Execution Pack');
    expect(backlog).toContain('P5-2 Backlog Mapping');
  });

  it('preserves deployment safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/deployment/p5_2_deployment_environment_hardening_pack.md');
    const environment = read('docs/deployment/p5_2_environment_configuration_evidence_record.md');
    const runbook = read('docs/operations/p5_2_deployment_environment_evidence_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(environment).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(environment).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(environment).not.toContain('postgres://admin:password');
    expect(environment).not.toContain('D:/AIM_UAT_Evidence');

    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot approve environment readiness');
  });
});
