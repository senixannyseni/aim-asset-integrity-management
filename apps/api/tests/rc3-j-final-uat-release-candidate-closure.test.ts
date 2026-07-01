import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function repoFileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

describe('RC3-J final UAT / release candidate closure', () => {
  it('adds required RC3-J final UAT, release, operations, backup, smoke, handover, and security closure docs', () => {
    for (const requiredFile of [
      'docs/uat/uat_rc3_master_execution_index.md',
      'docs/release/AIM_RC3J_final_release_candidate_closure_report.md',
      'docs/operations/production_deployment_checklist.md',
      'docs/operations/environment_validation_checklist.md',
      'docs/operations/backup_restore_runbook.md',
      'docs/operations/production_smoke_test_checklist.md',
      'docs/operations/operational_handover_checklist.md',
      'docs/operations/security_governance_closure_checklist.md'
    ]) {
      expect(repoFileExists(requiredFile), `${requiredFile} should exist`).toBe(true);
    }
  });

  it('updates README and sprint status for RC3-J closure', () => {
    const readme = readRepoFile('README.md');
    const sprintStatus = readRepoFile('docs/sprint-status.md');

    expect(readme).toContain('RC3-A through RC3-J implemented as scoped hardening packages');
    expect(readme).toContain('RC3-J Final UAT / Release Candidate Closure & Production Operations Readiness');
    expect(sprintStatus).toContain('RC3-J Final UAT / Release Candidate Closure & Production Operations Readiness');
    expect(sprintStatus).toContain('no API route');
    expect(sprintStatus).toContain('no frontend page');
    expect(sprintStatus).toContain('no migration');
  });

  it('documents RC3-B through RC3-I UAT coverage and final end-to-end UAT scenario', () => {
    const uatMaster = readRepoFile('docs/uat/uat_rc3_master_execution_index.md');

    for (const token of [
      'RC3-B object storage UAT',
      'RC3-C AI staging promotion UAT',
      'RC3-D audit log visibility UAT',
      'RC3-E admin governance UAT',
      'RC3-F governance dashboard UAT',
      'RC3-G n8n workflow console UAT',
      'RC3-H NDT data room UAT',
      'RC3-I hypercare/go-live readiness UAT'
    ]) {
      expect(uatMaster).toContain(token);
    }

    expect(uatMaster).toContain('evidence upload → AI staging → engineer review → promotion → calculation/review gate → report issue gate → work order follow-up → audit trail → dashboard/readiness visibility');
    expect(uatMaster).toContain('Final End-to-End UAT Scenario');
  });

  it('documents final release candidate acceptance, rollback, and go/no-go criteria', () => {
    const release = readRepoFile('docs/release/AIM_RC3J_final_release_candidate_closure_report.md');

    expect(release).toContain('RC3-A through RC3-I Completion Summary');
    expect(release).toContain('Final RC3-J Closure Checklist');
    expect(release).toContain('Known Limitations');
    expect(release).toContain('Out-of-Scope List');
    expect(release).toContain('Release Candidate Acceptance Criteria');
    expect(release).toContain('Rollback Criteria');
    expect(release).toContain('Go/No-Go Criteria');
  });

  it('documents production deployment and environment validation controls', () => {
    const deployment = readRepoFile('docs/operations/production_deployment_checklist.md');
    const environment = readRepoFile('docs/operations/environment_validation_checklist.md');

    for (const token of ['PostgreSQL', 'object storage', 'RBAC', 'audit logging', 'rollback']) {
      expect(deployment).toContain(token);
    }
    for (const token of ['API base URL', 'frontend base URL', 'PostgreSQL connection', 'object storage bucket/endpoint', 'object storage signed URL policy', 'JWT secret presence', 'CORS policy', 'file size/MIME policy', 'audit logging enabled']) {
      expect(environment).toContain(token);
    }
    expect(environment).toContain('n8n must not write directly to PostgreSQL');
    expect(environment).toContain('no direct n8n PostgreSQL writes');
  });

  it('documents backup/restore, smoke test, handover, and security/governance closure controls', () => {
    const backup = readRepoFile('docs/operations/backup_restore_runbook.md');
    const smoke = readRepoFile('docs/operations/production_smoke_test_checklist.md');
    const handover = readRepoFile('docs/operations/operational_handover_checklist.md');
    const security = readRepoFile('docs/operations/security_governance_closure_checklist.md');

    expect(backup).toContain('PostgreSQL backup');
    expect(backup).toContain('PostgreSQL restore validation');
    expect(backup).toContain('object storage backup/export verification');
    expect(backup).toContain('checksum verification');
    expect(backup).toContain('evidence/report artifact restore considerations');

    for (const token of ['login', 'RBAC menu visibility', 'go-live readiness', 'NDT data room', 'workflow console', 'governance dashboard', 'audit log', 'admin governance', 'no unauthorized mutation controls visible']) {
      expect(smoke).toContain(token);
    }

    for (const token of ['admin user handover', 'engineer reviewer handover', 'evidence manager handover', 'report approver handover', 'operations/hypercare owner handover', 'incident escalation path', 'known limitations', 'support contact fields', 'training completion checklist']) {
      expect(handover).toContain(token);
    }

    for (const token of ['RBAC verified', 'SoD verified', 'AI/n8n/service actor restrictions verified', 'audit log immutability verified', 'secret redaction verified', 'object storage policy verified', 'report issue gates verified', 'evidence linkage verified', 'backup/restore verified', 'n8n direct DB write prohibition verified']) {
      expect(security).toContain(token);
    }
  });

  it('adds no RC3-J runtime feature, API route, frontend page, migration, or calculation implementation', () => {
    const routeFiles = fs.readdirSync(path.join(repoRoot, 'apps/api/src/routes'));
    const appPages = fs.readdirSync(path.join(repoRoot, 'apps/web/app'));
    const migrations = fs.readdirSync(path.join(repoRoot, 'db/migrations'));
    const changedRuntimeSearch = [
      ...routeFiles.map((name) => `apps/api/src/routes/${name}`),
      ...appPages.map((name) => `apps/web/app/${name}`),
      ...migrations.map((name) => `db/migrations/${name}`)
    ].join('\n');

    expect(changedRuntimeSearch).not.toContain('rc3-j');
    expect(changedRuntimeSearch).not.toContain('release-candidate');
    expect(changedRuntimeSearch).not.toContain('final-uat');
    expect(changedRuntimeSearch).not.toContain('operations-readiness');
    expect(migrations).not.toContain('0027_final_uat_release_candidate_closure.sql');

    const repoText = [
      readRepoFile('README.md'),
      readRepoFile('docs/sprint-status.md'),
      readRepoFile('docs/release/AIM_RC3J_final_release_candidate_closure_report.md'),
      readRepoFile('docs/uat/uat_rc3_master_execution_index.md')
    ].join('\n');
    expect(repoText).toContain('No API 579/API 581/FFS/RBI formula implementation may be invented');
    expect(repoText).not.toContain('function calculateApi579');
    expect(repoText).not.toContain('function calculateApi581');
    expect(repoText).not.toContain('runFfsCalculation(');
    expect(repoText).not.toContain('runRbiCalculation(');
  });
});
