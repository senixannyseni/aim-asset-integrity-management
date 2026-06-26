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

describe('RC3-F governance dashboard readiness overview', () => {
  it('adds a read-only governance dashboard API route with RBAC and service actor blocking', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/governance-dashboard.ts');
    expect(app).toContain('governanceDashboardRouter');
    expect(app).toContain("app.use('/api/v1', governanceDashboardRouter)");
    expect(route).toContain("governanceDashboardRouter.get('/governance-dashboard/overview'");
    expect(route).toContain("requirePermission('dashboard.view')");
    expect(route).toContain('DASHBOARD_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('SERVICE_DASHBOARD_BLOCKED_ROLES');
    expect(route).not.toContain('governanceDashboardRouter.post(');
    expect(route).not.toContain('governanceDashboardRouter.patch(');
    expect(route).not.toContain('governanceDashboardRouter.delete(');
  });

  it('does not grant dashboard permissions to ai_agent or service-style roles', () => {
    expect(hasPermission(['admin'], 'dashboard.view')).toBe(true);
    expect(hasPermission(['management'], 'dashboard.view')).toBe(true);
    expect(ROLE_PERMISSIONS.ai_agent as readonly string[]).not.toContain('dashboard.view');
    const route = readRepoFile('apps/api/src/routes/governance-dashboard.ts');
    expect(route).toContain('n8n_service');
    expect(route).toContain('integration_service');
    expect(route).toContain('system_service');
  });

  it('summarizes existing AIM state without secrets or dashboard snapshot storage', () => {
    const route = readRepoFile('apps/api/src/routes/governance-dashboard.ts');
    for (const token of [
      'asset_inspection_coverage',
      'evidence_readiness',
      'ai_extraction_review_queue',
      'staging_promotion_readiness',
      'calculation_review_readiness',
      'report_issue_readiness',
      'work_order_follow_up',
      'governance_warnings'
    ]) {
      expect(route).toContain(token);
    }
    expect(route).toContain('signed URLs');
    expect(route).toContain('object-storage credentials');
    expect(route).toContain('raw evidence/report contents');
    expect(route).toContain('no n8n-written dashboard snapshot table');
    expect(route).not.toContain('create table dashboard');
  });

  it('adds read-only frontend dashboard page without mutation controls', () => {
    const page = readRepoFile('apps/web/app/dashboard/GovernanceDashboardClient.tsx');
    expect(page).toContain('Governance Dashboard Readiness Overview');
    expect(page).toContain('/api/v1/governance-dashboard/overview');
    expect(page).toContain('Read-only');
    expect(page).toContain('Evidence Readiness');
    expect(page).toContain('AI Extraction Review Queue');
    expect(page).toContain('Report Gate Readiness');
    expect(page).toContain('Work Order Follow-up');
    expect(page).not.toContain("method: 'POST'");
    expect(page).not.toContain("method: 'PATCH'");
    expect(page).not.toContain("method: 'DELETE'");
    expect(page).not.toContain('Hypercare Dashboard');
    expect(page).not.toContain('NDT Visualization');
  });

  it('documents OpenAPI dashboard endpoint and read-only permission marker', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/governance-dashboard/overview:');
    expect(openapi).toContain('x-permission-required: dashboard.view');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('x-dashboard-readiness-overview: true');
    expect(openapi).toContain('GovernanceDashboardOverviewEnvelope');
    expect(openapi).toContain('signed_url');
    expect(openapi).toContain('presigned_url');
  });

  it('updates RC3-F UAT, release notes, README, and n8n API-only boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_governance_dashboard_readiness_scripts.md');
    const release = readRepoFile('docs/release/AIM_RC3F_governance_dashboard_readiness_report.md');
    const n8n = readRepoFile('05_n8n/rc3f_governance_dashboard_boundary_addendum.md');
    const readme = readRepoFile('README.md');
    expect(uat).toContain('confirm evidence readiness summary appears');
    expect(uat).toContain('confirm no approve/reject/correct/promote/report issue/delete/admin mutation controls exist');
    expect(release).toContain('RC3-F');
    expect(readme).toContain('RC3-F Governance Dashboard Readiness Overview');
    expect(n8n).toContain('n8n must not write directly to PostgreSQL');
    expect(n8n).toContain('n8n must not compute or store dashboard state as final AIM data');
    expect(n8n).toContain('create a separate n8n dashboard data store');
  });
});
