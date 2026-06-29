import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-S FFS case detail disposition readiness', () => {
  it('adds a read-only FFS disposition readiness API with governance gates', () => {
    const route = readRepoFile('apps/api/src/routes/ffs.ts');

    expect(route).toContain("ffsRouter.get('/ffs/cases/:caseId/readiness'");
    expect(route).toContain("requirePermission('ffs.read')");
    expect(route).toContain('buildFfsDispositionReadiness');
    expect(route).toContain('ffs_case_recorded');
    expect(route).toContain('trigger_context_present');
    expect(route).toContain('supporting_evidence_linked');
    expect(route).toContain('calculation_trigger_trace_visible');
    expect(route).toContain('engineering_review_trace_present');
    expect(route).toContain('final_disposition_approval_present');
    expect(route).toContain('downstream_report_or_work_order_trace_visible');
    expect(route).toContain('no_api_579_formula_execution');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/ffs/cases/:caseId/readiness'");
    const readinessEnd = route.indexOf("ffsRouter.post('/ffs/cases'", readinessStart + 1);
    const readinessRoute = route.slice(readinessStart, readinessEnd);
    expect(readinessRoute).not.toContain('insert into ffs_cases');
    expect(readinessRoute).not.toContain('update ffs_cases');
    expect(readinessRoute).not.toContain('FFS_CASE_FINAL_DISPOSITION_APPROVED');
  });

  it('surfaces evidence, calculation trigger, review approval, downstream, and audit traceability', () => {
    const route = readRepoFile('apps/api/src/routes/ffs.ts');

    expect(route).toContain('evidence_links');
    expect(route).toContain('engineering_reviews');
    expect(route).toContain('approval_records');
    expect(route).toContain('calculation_runs');
    expect(route).toContain('reports');
    expect(route).toContain('internal_work_orders');
    expect(route).toContain('audit_logs');
    expect(route).toContain('AI, n8n, and service actors cannot approve final FFS disposition');
  });

  it('adds FFS detail UI and links the list/home navigation to disposition readiness', () => {
    const list = readRepoFile('apps/web/app/ffs/FfsWorkflowClient.tsx');
    const detail = readRepoFile('apps/web/app/ffs/[caseId]/FfsCaseDetailClient.tsx');
    const page = readRepoFile('apps/web/app/ffs/[caseId]/page.tsx');
    const home = readRepoFile('apps/web/app/page.tsx');

    expect(list).toContain('RC4-S detail-level FFS Disposition Readiness');
    expect(list).toContain('Open FFS Disposition Readiness');
    expect(list).toContain('href={`/ffs/${item.id}`}');
    expect(page).toContain('FfsCaseDetailClient');
    expect(detail).toContain('/api/v1/ffs/cases/${encodeURIComponent(caseId)}/readiness');
    expect(detail).toContain('FFS Disposition Readiness');
    expect(detail).toContain('Final Disposition Action');
    expect(detail).toContain('Evidence Linkage');
    expect(detail).toContain('Calculation Trigger Trace');
    expect(detail).toContain('Review / Approval Trace');
    expect(detail).toContain('Downstream Traceability');
    expect(detail).toContain('Audit Timeline');
    expect(detail).toContain('AI/n8n/service actors cannot approve final FFS disposition');
    expect(home).toContain("href: '/ffs'");
  });

  it('updates OpenAPI, docs, UAT, release notes, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const uat = readRepoFile('docs/uat/uat_rc4s_ffs_case_detail_disposition_readiness.md');
    const release = readRepoFile('docs/release/AIM_RC4S_ffs_case_detail_disposition_readiness_report.md');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');

    expect(openapi).toContain('/api/v1/ffs/cases/{caseId}/readiness');
    expect(openapi).toContain('FfsDispositionReadiness');
    expect(openapi).toContain('FfsDispositionReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(openapi).toContain('AI/n8n/service actors');
    expect(uat).toContain('FFS Disposition Readiness');
    expect(release).toContain('RC4-S');
    expect(readme).toContain('RC4-S FFS Case Detail + FFS Disposition Readiness');
    expect(sprint).toContain('RC4-S — FFS Case Detail + FFS Disposition Readiness');
  });
});
