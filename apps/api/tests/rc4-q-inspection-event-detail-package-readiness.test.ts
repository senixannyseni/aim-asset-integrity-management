import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-Q Inspection Event Detail + Inspection Package Readiness', () => {
  it('registers a read-only inspection package readiness API and app route', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/inspections.ts');

    expect(app).toContain('inspectionsRouter');
    expect(route).toContain("inspectionsRouter.get('/inspections'");
    expect(route).toContain("inspectionsRouter.get('/inspections/:inspectionEventId/readiness'");
    expect(route).toContain("requirePermission('inspection.read')");
    expect(route).toContain('buildInspectionPackageReadiness');
    expect(route).toContain('inspectionReadinessGate');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(route).not.toContain('insert into');
    expect(route).not.toContain('update inspection_events');
    expect(route).not.toContain('delete from');
  });

  it('renders inspection list and detail pages with traceability sections', () => {
    const list = readRepoFile('apps/web/app/inspections/InspectionsClient.tsx');
    const detail = readRepoFile('apps/web/app/inspections/[inspectionEventId]/InspectionEventDetailClient.tsx');
    const home = readRepoFile('apps/web/app/page.tsx');

    expect(list).toContain('Inspection Package Readiness');
    expect(list).toContain('/api/v1/inspections');
    expect(detail).toContain('/api/v1/inspections/${inspectionEventId}/readiness');
    expect(detail).toContain('Inspection Event Detail + Inspection Package Readiness');
    expect(detail).toContain('Evidence Coverage');
    expect(detail).toContain('NDT Measurement Coverage');
    expect(detail).toContain('Findings / Anomalies');
    expect(detail).toContain('Calculation Runs');
    expect(detail).toContain('Review / Approval Trace');
    expect(detail).toContain('Downstream Decisions, Reports, and Work Orders');
    expect(detail).toContain('Audit Timeline');
    expect(home).toContain("href: '/inspections'");
  });

  it('updates OpenAPI and docs without expanding engineering calculation scope', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const uat = readRepoFile('docs/uat/uat_rc4q_inspection_event_detail_package_readiness.md');
    const release = readRepoFile('docs/release/AIM_RC4Q_inspection_event_detail_package_readiness_report.md');

    expect(openapi).toContain('/api/v1/inspections/{inspectionEventId}/readiness');
    expect(openapi).toContain('InspectionPackageReadiness');
    expect(openapi).toContain('InspectionPackageReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(readme).toContain('RC4-Q Inspection Event Detail + Inspection Package Readiness');
    expect(sprint).toContain('RC4-Q');
    expect(uat).toContain('Inspection Package Readiness');
    expect(release).toContain('RC4-Q');
    expect(release).toContain('AI/n8n/service actors cannot finalize inspection package readiness');
  });
});
