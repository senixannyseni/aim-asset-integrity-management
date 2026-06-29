import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation', () => {
  it('adds read-only consolidated workspace APIs with governance boundaries', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/integrity-workspace.ts');

    expect(app).toContain('integrityWorkspaceRouter');
    expect(route).toContain("integrityWorkspaceRouter.get('/integrity-workspace'");
    expect(route).toContain("integrityWorkspaceRouter.get('/integrity-workspace/assets/:assetId/readiness'");
    expect(route).toContain("requirePermission('asset.read')");
    expect(route).toContain('buildIntegrityWorkspaceReadiness');
    expect(route).toContain('enforceHumanWorkspaceViewer');
    expect(route).toContain('INTEGRITY_WORKSPACE_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('AI, n8n, service, workflow, and integration actors cannot access the consolidated integrity package workspace');
    expect(route).toContain('asset_integrity_package_visible');
    expect(route).toContain('inspection_package_trace_visible');
    expect(route).toContain('evidence_traceability_visible');
    expect(route).toContain('ndt_measurement_trace_visible');
    expect(route).toContain('findings_triage_trace_visible');
    expect(route).toContain('calculation_traceability_visible');
    expect(route).toContain('engineering_review_trace_visible');
    expect(route).toContain('integrity_decision_trace_visible');
    expect(route).toContain('ffs_rbi_trace_visible');
    expect(route).toContain('report_issue_trace_visible');
    expect(route).toContain('work_order_closure_trace_visible');
    expect(route).toContain('audit_trail_visible');
    expect(route).toContain('no_formula_execution');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/integrity-workspace/assets/:assetId/readiness'");
    const readinessRoute = route.slice(readinessStart);
    expect(readinessRoute).not.toContain('insert into');
    expect(readinessRoute).not.toContain('update ');
    expect(readinessRoute).not.toContain('delete from');
  });

  it('consolidates the full asset-to-work-order chain without replacing module authority', () => {
    const route = readRepoFile('apps/api/src/routes/integrity-workspace.ts');

    expect(route).toContain('Asset');
    expect(route).toContain('Inspection');
    expect(route).toContain('Evidence');
    expect(route).toContain('NDT');
    expect(route).toContain('Findings');
    expect(route).toContain('Calculation');
    expect(route).toContain('Review / Approval');
    expect(route).toContain('Integrity Decision');
    expect(route).toContain('FFS / RBI');
    expect(route).toContain('Report');
    expect(route).toContain('Work Order');
    expect(route).toContain('RC4-R Asset Integrity Package Readiness');
    expect(route).toContain('RC4-Q Inspection Package Readiness');
    expect(route).toContain('RC4-M Evidence Traceability Matrix');
    expect(route).toContain('RC4-P NDT Measurement Readiness');
    expect(route).toContain('RC4-O Calculation Formula Traceability Readiness');
    expect(route).toContain('RC4-N Integrity Decision Readiness');
    expect(route).toContain('RC4-S FFS and RC4-I RBI interface readiness');
    expect(route).toContain('RC4-K Report Issue Readiness');
    expect(route).toContain('RC4-L Work Order Closure Readiness');
  });

  it('adds consolidated frontend workspace and detail navigation', () => {
    const home = readRepoFile('apps/web/app/page.tsx');
    const list = readRepoFile('apps/web/app/integrity-workspace/IntegrityWorkspaceClient.tsx');
    const listPage = readRepoFile('apps/web/app/integrity-workspace/page.tsx');
    const detail = readRepoFile('apps/web/app/integrity-workspace/[assetId]/IntegrityWorkspaceDetailClient.tsx');
    const detailPage = readRepoFile('apps/web/app/integrity-workspace/[assetId]/page.tsx');

    expect(home).toContain("href: '/integrity-workspace'");
    expect(listPage).toContain('IntegrityWorkspaceClient');
    expect(detailPage).toContain('IntegrityWorkspaceDetailClient');
    expect(list).toContain('/api/v1/integrity-workspace');
    expect(list).toContain('End-to-End Integrity Package Workspace');
    expect(list).toContain('Release Candidate Consolidation Chain');
    expect(list).toContain('Open End-to-End Readiness');
    expect(list).toContain('href={`/integrity-workspace/${row.asset.asset_id}`}');
    expect(detail).toContain('/api/v1/integrity-workspace/assets/${assetId}/readiness');
    expect(detail).toContain('End-to-End Integrity Package Readiness');
    expect(detail).toContain('Release Candidate Readiness Gates');
    expect(detail).toContain('Inspection Package Trace');
    expect(detail).toContain('Evidence Traceability');
    expect(detail).toContain('NDT Measurement Trace');
    expect(detail).toContain('Findings / Anomaly Trace');
    expect(detail).toContain('Calculation Traceability');
    expect(detail).toContain('Review / Approval Trace');
    expect(detail).toContain('Integrity Decision Trace');
    expect(detail).toContain('FFS / RBI Trace');
    expect(detail).toContain('Report Issue Trace');
    expect(detail).toContain('Work Order Closure Trace');
    expect(detail).toContain('Audit Timeline');
  });

  it('updates OpenAPI, docs, UAT, release notes, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const uat = readRepoFile('docs/uat/uat_rc4t_end_to_end_integrity_workspace_release_consolidation.md');
    const release = readRepoFile('docs/release/AIM_RC4T_end_to_end_integrity_workspace_release_consolidation_report.md');

    expect(openapi).toContain('/api/v1/integrity-workspace');
    expect(openapi).toContain('/api/v1/integrity-workspace/assets/{assetId}/readiness');
    expect(openapi).toContain('IntegrityWorkspaceOverview');
    expect(openapi).toContain('EndToEndIntegrityPackageReadiness');
    expect(openapi).toContain('IntegrityWorkspaceReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(openapi).toContain('AI/n8n/service actors cannot finalize end-to-end integrity package readiness');
    expect(readme).toContain('RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation');
    expect(sprint).toContain('RC4-T — End-to-End Integrity Package Workspace + Release Candidate Consolidation');
    expect(uat).toContain('End-to-End Integrity Package Workspace');
    expect(release).toContain('RC4-T');
    expect(release).toContain('AI/n8n/service actors cannot finalize release candidate readiness');
  });
});
