import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-R Asset Detail + Asset Integrity Package Readiness', () => {
  it('adds a read-only asset integrity readiness API with package gates', () => {
    const route = readRepoFile('apps/api/src/routes/assets.ts');

    expect(route).toContain("assetsRouter.get('/assets/:assetId/readiness'");
    expect(route).toContain("requirePermission('asset.read')");
    expect(route).toContain('buildAssetIntegrityReadiness');
    expect(route).toContain('assetReadinessGate');
    expect(route).toContain('asset_master_data_complete');
    expect(route).toContain('geometry_recorded');
    expect(route).toContain('shell_courses_present');
    expect(route).toContain('evidence_package_linked');
    expect(route).toContain('inspection_history_visible');
    expect(route).toContain('ndt_measurement_coverage_visible');
    expect(route).toContain('finding_triage_visible');
    expect(route).toContain('calculation_traceability_visible');
    expect(route).toContain('integrity_decision_trace_visible');
    expect(route).toContain('report_work_order_trace_visible');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/assets/:assetId/readiness'");
    const readinessEnd = route.indexOf("assetsRouter.post('/assets'", readinessStart + 1);
    const readinessRoute = route.slice(readinessStart, readinessEnd);
    expect(readinessRoute).not.toContain('insert into');
    expect(readinessRoute).not.toContain('update assets');
    expect(readinessRoute).not.toContain('delete from');
  });

  it('renders asset detail page with package traceability sections', () => {
    const list = readRepoFile('apps/web/app/assets/page.tsx');
    const detail = readRepoFile('apps/web/app/assets/[assetId]/AssetDetailClient.tsx');
    const home = readRepoFile('apps/web/app/page.tsx');

    expect(list).toContain('Asset Integrity Package Readiness');
    expect(list).toContain('/assets/${asset.asset_id}');
    expect(detail).toContain('/api/v1/assets/${assetId}/readiness');
    expect(detail).toContain('Asset Detail + Asset Integrity Package Readiness');
    expect(detail).toContain('Asset Master Data');
    expect(detail).toContain('Asset Integrity Package Readiness Gates');
    expect(detail).toContain('Geometry Summary');
    expect(detail).toContain('Shell Course Summary');
    expect(detail).toContain('Evidence Coverage');
    expect(detail).toContain('Inspection History');
    expect(detail).toContain('NDT Measurement Coverage');
    expect(detail).toContain('Findings / Anomalies');
    expect(detail).toContain('Calculation Runs');
    expect(detail).toContain('Review / Approval Trace');
    expect(detail).toContain('Integrity Decisions');
    expect(detail).toContain('Reports and Work Orders');
    expect(detail).toContain('Audit Timeline');
    expect(home).toContain("href: '/assets'");
  });

  it('updates OpenAPI, docs, UAT, and release notes without expanding engineering calculation scope', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const uat = readRepoFile('docs/uat/uat_rc4r_asset_detail_integrity_package_readiness.md');
    const release = readRepoFile('docs/release/AIM_RC4R_asset_detail_integrity_package_readiness_report.md');

    expect(openapi).toContain('/api/v1/assets/{assetId}/readiness');
    expect(openapi).toContain('AssetIntegrityPackageReadiness');
    expect(openapi).toContain('AssetIntegrityPackageReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(readme).toContain('RC4-R Asset Detail + Asset Integrity Package Readiness');
    expect(sprint).toContain('RC4-R');
    expect(uat).toContain('Asset Integrity Package Readiness');
    expect(release).toContain('RC4-R');
    expect(release).toContain('AI/n8n/service actors cannot finalize asset integrity package readiness');
  });
});
