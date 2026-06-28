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

describe('RC4-K report detail and issue readiness workflow', () => {
  it('adds a report detail route with issue readiness preview and governed actions', () => {
    const page = readRepoFile('apps/web/app/reports/[reportId]/page.tsx');
    const client = readRepoFile('apps/web/app/reports/[reportId]/ReportDetailClient.tsx');
    expect(page).toContain('ReportDetailClient');
    expect(client).toContain('RC4-K report detail and issue readiness');
    expect(client).toContain('/issue-readiness');
    expect(client).toContain('Issue Readiness Gates');
    expect(client).toContain('ready_to_issue_after_comment');
    expect(client).toContain('Direct Evidence Links for Issue Gate');
    expect(client).toContain('approved_integrity_decision_id');
    expect(client).toContain('Open signed URL');
  });

  it('keeps report detail actions permission-aware and backend-authoritative', () => {
    const client = readRepoFile('apps/web/app/reports/[reportId]/ReportDetailClient.tsx');
    expect(client).toContain("apiFetch('/api/v1/auth/me'");
    expect(client).toContain("hasPermission(user, 'report.approve')");
    expect(client).toContain("hasPermission(user, 'report.issue')");
    expect(client).toContain("hasPermission(user, 'report.export')");
    expect(client).toContain("hasPermission(user, 'evidence.link')");
    expect(client).toContain('reportLocked');
    expect(client).toContain('issue_comment');
    expect(client).toContain("/api/v1/reports/${reportId}/issue");
  });

  it('adds a read-only backend readiness endpoint without mutating report state', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    expect(route).toContain("reportsRouter.get('/reports/:reportId/issue-readiness'");
    expect(route).toContain("requirePermission('report.read')");
    expect(route).toContain('buildReportGateChecklist(context, false)');
    expect(route).toContain('ready_to_issue_after_comment');
    expect(route).toContain('blocking_gate_count_excluding_issue_comment');
    expect(route).toContain('approved_integrity_decision_id');
    const readinessRoute = route.slice(route.indexOf("reportsRouter.get('/reports/:reportId/issue-readiness'"), route.indexOf("reportsRouter.get('/reports/:reportId/exports'"));
    expect(readinessRoute).not.toContain('insert into review_gates');
    expect(readinessRoute).not.toContain('REPORT_ISSUED');
    expect(readinessRoute).not.toContain('REPORT_APPROVED');
  });

  it('links report list rows to the detail workflow', () => {
    const list = readRepoFile('apps/web/app/reports/ReportsClient.tsx');
    expect(list).toContain('href={`/reports/${report.report_id}`}');
    expect(list).toContain('Detail</Link>');
  });

  it('documents the RC4-K OpenAPI contract and release/UAT controls', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const release = readRepoFile('docs/release/AIM_RC4K_report_detail_issue_readiness_report.md');
    const uat = readRepoFile('docs/uat/uat_rc4k_report_detail_issue_readiness.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    expect(openapi).toContain('/api/v1/reports/{reportId}/issue-readiness:');
    expect(openapi).toContain('ReportIssueReadiness');
    expect(openapi).toContain('Read-only readiness preview only');
    expect(release).toContain('RC4-K Report Detail and Issue Readiness');
    expect(uat).toContain('RC4-K Report Detail and Issue Readiness UAT');
    expect(sprint).toContain('RC4-K Report Detail and Issue Readiness');
  });

  it('removes stale merge-conflict markers from Phase 2 readiness documentation', () => {
    const phase20 = readRepoFile('docs/release/phase2_0_release_readiness_report.md');
    expect(phase20).not.toContain('<<<<<<<');
    expect(phase20).not.toContain('=======');
    expect(phase20).not.toContain('>>>>>>>');
    expect(phase20).toContain('Phase 2.1 Follow-Up: Controlled UAT Execution Support');
  });

});
