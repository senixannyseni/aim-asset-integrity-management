import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateNdtMeasurementPayload } from '../src/modules/ndt/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Phase 2.5 RC2 runtime and frontend closure', () => {
  it('hardens FFS and RBI calculation-run lookup without uuid/text mixed comparison', () => {
    const ffs = readRepoFile('apps/api/src/routes/ffs.ts');
    const rbi = readRepoFile('apps/api/src/routes/rbi.ts');

    for (const route of [ffs, rbi]) {
      expect(route).toContain('loadCalculationRunByIdentifier');
      expect(route).toContain('where id = $1::uuid');
      expect(route).toContain('where run_id = $1');
      expect(route).not.toContain('where id = $1 or run_id = $1');
    }
  });

  it('keeps integrity decision approval evidence gate and list API for frontend', () => {
    const route = readRepoFile('apps/api/src/routes/integrity-decisions.ts');
    const openapi = readRepoFile('04_API/openapi.yaml');

    expect(route).toContain("integrityDecisionsRouter.get('/integrity-decisions'");
    expect(route).toContain("countLinkedEvidence(client, 'integrity_decision', decisionId)");
    expect(route).toContain('INTEGRITY_DECISION_EVIDENCE_REQUIRED');
    expect(openapi).toContain('summary: List integrity decisions');
  });

  it('keeps report issue per-entity evidence gates and stale error resolution', () => {
    const reports = readRepoFile('apps/api/src/routes/reports.ts');

    expect(reports).toContain('reportEvidenceCount');
    expect(reports).toContain('calculationRunEvidenceCount');
    expect(reports).toContain('integrityDecisionEvidenceCount');
    expect(reports).toContain('missing_required_evidence');
    expect(reports).toContain("error_code = 'REPORT_ISSUE_GATE_BLOCKED'");
    expect(reports).toContain("status = 'resolved'");
  });

  it('returns controlled NDT validation for invalid extraction_source before database constraints', () => {
    const issues = validateNdtMeasurementPayload({
      asset_id: '22000000-0000-4000-8000-000000000001',
      component: 'SHELL_COURSE_1',
      measured_thickness: 7.2,
      reading_date: '2026-06-23',
      method: 'UT_THICKNESS',
      extraction_source: 'manual_uat'
    });

    expect(issues).toContainEqual({
      field: 'extraction_source',
      message: 'extraction_source must be one of: manual, bulk_import, ai_staging, vendor_import.',
      severity: 'error'
    });
  });

  it('hardens frontend auth so demo headers are opt-in and bearer token is default', () => {
    const client = readRepoFile('apps/web/lib/api-client.ts');
    const login = readRepoFile('apps/web/app/login/page.tsx');

    expect(client).toContain('NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED');
    expect(client).toContain('Authorization');
    expect(client).toContain('Bearer');
    expect(client).toContain('payload?.data?.accessToken');
    expect(login).toContain('AIM Login');
    expect(login).toContain('Demo headers are disabled unless NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true');
  });

  it('adds frontend workflow closure pages for integrity decisions, work orders, and report gates', () => {
    const integrityClient = readRepoFile('apps/web/app/integrity-decisions/IntegrityDecisionsClient.tsx');
    const workOrderClient = readRepoFile('apps/web/app/work-orders/WorkOrdersClient.tsx');
    const reportClient = readRepoFile('apps/web/app/reports/ReportsClient.tsx');
    const workOrdersRoute = readRepoFile('apps/api/src/routes/work-orders.ts');

    expect(integrityClient).toContain('INTEGRITY_DECISION_EVIDENCE_REQUIRED');
    expect(integrityClient).toContain("linked_entity_type: 'integrity_decision'");
    expect(workOrderClient).toContain('External CMMS rejection');
    expect(workOrderClient).toContain('external_cmms_reference');
    expect(workOrdersRoute).toContain("workOrdersRouter.get('/work-orders/:workOrderId'");
    expect(reportClient).toContain("linkEvidence('report'");
    expect(reportClient).toContain("linkEvidence('calculation_run'");
    expect(reportClient).toContain("linkEvidence('integrity_decision'");
    expect(reportClient).toContain('Missing evidence:');
  });

  it('adds UAT Cycle 2 procedure documents and keeps source-of-truth constraints explicit', () => {
    const plan = readRepoFile('docs/uat/uat_cycle_2_execution_plan.md');
    const scripts = readRepoFile('docs/uat/uat_cycle_2_runtime_regression_scripts.md');
    const walkthrough = readRepoFile('docs/uat/uat_cycle_2_frontend_walkthrough.md');
    const checklist = readRepoFile('docs/uat/uat_cycle_2_signoff_checklist.md');

    for (const doc of [plan, scripts, walkthrough, checklist]) {
      expect(doc).toContain('UAT Cycle 2');
      expect(doc).toContain('AI must not approve');
      expect(doc).toContain('External CMMS');
      expect(doc).toContain('n8n');
    }
    expect(plan).toContain('JWT/RBAC');
    expect(scripts).toContain('manual_uat');
    expect(walkthrough).toContain('/integrity-decisions');
    expect(checklist).toContain('PASS / FAIL');
  });
});
