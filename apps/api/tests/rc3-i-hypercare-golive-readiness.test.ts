import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, hasPermission } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-I hypercare / go-live readiness dashboard', () => {
  it('adds a read-only go-live readiness API route with RBAC and service actor blocking', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/golive-readiness.ts');
    expect(app).toContain('goliveReadinessRouter');
    expect(app).toContain("app.use('/api/v1', goliveReadinessRouter)");
    expect(route).toContain("goliveReadinessRouter.get('/golive-readiness/overview'");
    expect(route).toContain("requirePermission('golive_readiness.view')");
    expect(route).toContain('GOLIVE_READINESS_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('SERVICE_GOLIVE_READINESS_BLOCKED_ROLES');
    expect(route).not.toContain('goliveReadinessRouter.post(');
    expect(route).not.toContain('goliveReadinessRouter.patch(');
    expect(route).not.toContain('goliveReadinessRouter.delete(');
  });

  it('adds go-live readiness visibility permission without granting service mutation/action permissions', () => {
    expect(hasPermission(['admin'], 'golive_readiness.view')).toBe(true);
    expect(hasPermission(['engineer'], 'golive_readiness.view')).toBe(true);
    expect(hasPermission(['management'], 'golive_readiness.view')).toBe(true);
    expect(ROLE_PERMISSIONS.ai_agent as readonly string[]).not.toContain('golive_readiness.view');

    const roles = readRepoFile('apps/api/src/rbac/roles.ts');
    expect(roles).toContain('golive_readiness.view');
    expect(roles).not.toContain('golive_readiness.manage');
    expect(roles).not.toContain('golive_readiness.approve');
    expect(roles).not.toContain('golive_readiness.override');
    expect(roles).not.toContain('golive_readiness.close');

    const route = readRepoFile('apps/api/src/routes/golive-readiness.ts');
    expect(route).toContain('ai_agent');
    expect(route).toContain('n8n_service');
    expect(route).toContain('integration_service');
    expect(route).toContain('workflow_service');
    expect(route).toContain('system_service');
  });

  it('summarizes existing AIM readiness state, blockers, gates, and redacted metadata without calculations or snapshots', () => {
    const route = readRepoFile('apps/api/src/routes/golive-readiness.ts');
    for (const token of [
      'overall_readiness_status',
      'readiness_gate_checklist',
      'evidence_readiness_gate',
      'ai_review_readiness_gate',
      'staging_promotion_readiness_gate',
      'calculation_review_readiness_gate',
      'report_issue_gate_readiness',
      'ndt_readiness_gate',
      'workflow_notification_readiness_gate',
      'audit_admin_governance_readiness',
      'uat_documentation_readiness',
      'recent_blockers_and_warnings'
    ]) {
      expect(route).toContain(token);
    }
    for (const tableName of [
      'evidence_files',
      'evidence_links',
      'extraction_fields',
      'staging_records',
      'calculation_runs',
      'reports',
      'report_exports',
      'ndt_measurements',
      'workflow_tasks',
      'notification_logs',
      'error_logs',
      'audit_logs',
      'permissions'
    ]) {
      expect(route).toContain(tableName);
    }
    expect(route).toContain('SENSITIVE_METADATA_PATTERN');
    expect(route).toContain('webhook_secret');
    expect(route).toContain('object keys');
    expect(route).toContain('raw file/report contents');
    expect(route).toContain('OCR full text');
    expect(route).toContain('no n8n-written go-live readiness snapshot table');
    expect(route).toContain('This endpoint does not implement or run API 579/API 581/FFS/RBI');
    expect(route).not.toContain('create table golive_readiness');
    expect(route).not.toContain('golive_readiness.manage');
    expect(route).not.toContain('closeHypercareIssue(');
    expect(route).not.toContain('overrideReadinessStatus(');
  });

  it('adds read-only frontend go-live readiness page without mutation or closure controls', () => {
    const page = readRepoFile('apps/web/app/golive-readiness/GoliveReadinessClient.tsx');
    expect(page).toContain('Hypercare / Go-Live Readiness Dashboard');
    expect(page).toContain('/api/v1/golive-readiness/overview');
    expect(page).toContain('Read-only');
    expect(page).toContain('Overall Go-Live Readiness Status');
    expect(page).toContain('Readiness Gate Checklist');
    expect(page).toContain('Evidence Readiness Gate');
    expect(page).toContain('AI Review Readiness Gate');
    expect(page).toContain('NDT Readiness Gate');
    expect(page).toContain('UAT Documentation Readiness');
    expect(page).not.toContain("method: 'POST'");
    expect(page).not.toContain("method: 'PATCH'");
    expect(page).not.toContain("method: 'DELETE'");
    expect(page).not.toContain('closeHypercareIssue(');
    expect(page).not.toContain('overrideReadinessStatus(');
    expect(page).not.toContain('runCalculation(');
  });

  it('documents OpenAPI go-live readiness endpoint and read-only permission marker', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/golive-readiness/overview:');
    expect(openapi).toContain('x-permission-required: golive_readiness.view');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('x-hypercare-golive-readiness: true');
    expect(openapi).toContain('GoliveReadinessOverviewEnvelope');
    expect(openapi).toContain('x-no-approval-no-mutation-boundary');
    expect(openapi).toContain('x-no-calculation-boundary');
    expect(openapi).toContain('API 579/API 581/FFS/RBI');
    expect(openapi).toContain('webhook_secret');
    expect(openapi).toContain('object_key');
    expect(openapi).toContain('n8n must not write directly to PostgreSQL');
  });

  it('updates RC3-I UAT, release notes, README, migration tracking, seed, and n8n API-only boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_hypercare_golive_readiness_scripts.md');
    const release = readRepoFile('docs/release/AIM_RC3I_hypercare_golive_readiness_report.md');
    const n8n = readRepoFile('05_n8n/rc3i_hypercare_golive_boundary_addendum.md');
    const readme = readRepoFile('README.md');
    const migrationTest = readRepoFile('apps/api/tests/migration-sequence.test.ts');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');
    const migration = readRepoFile('db/migrations/0026_hypercare_golive_readiness.sql');

    expect(uat).toContain('confirm overall readiness status appears');
    expect(uat).toContain('confirm evidence readiness gate appears');
    expect(uat).toContain('confirm AI review readiness gate appears');
    expect(uat).toContain('confirm staging promotion readiness gate appears');
    expect(uat).toContain('confirm calculation/review readiness gate appears');
    expect(uat).toContain('confirm report issue gate readiness appears');
    expect(uat).toContain('confirm NDT readiness gate appears');
    expect(uat).toContain('confirm workflow/notification readiness gate appears');
    expect(uat).toContain('confirm audit/admin governance readiness appears');
    expect(uat).toContain('confirm UAT documentation readiness appears');
    expect(uat).toContain('confirm no secrets/signed URLs/tokens/credentials/object keys/webhook secrets are displayed');
    expect(uat).toContain('confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist');
    expect(uat).toContain('confirm no API 579/API 581/FFS/RBI calculation implementation is introduced');
    expect(uat).toContain('confirm n8n boundary remains API-only and cannot write go-live readiness state directly to PostgreSQL');
    expect(release).toContain('RC3-I');
    expect(readme).toContain('RC3-I Hypercare / Go-Live Readiness Dashboard');
    expect(n8n).toContain('n8n must not write directly to PostgreSQL');
    expect(n8n).toContain('n8n must not compute or store go-live readiness state as final AIM data');
    expect(n8n).toContain('Override readiness gates');
    expect(n8n).toContain('Close hypercare blockers directly');
    expect(migrationTest).toContain('0026_hypercare_golive_readiness.sql');
    expect(seed).toContain('golive_readiness.view');
    expect(migration).toContain('golive_readiness.view');
  });
});
