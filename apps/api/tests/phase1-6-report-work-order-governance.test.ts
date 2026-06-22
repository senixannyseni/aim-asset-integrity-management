import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const reportIssueGateTypes = [
  'required_data_complete',
  'evidence_linked',
  'calculation_completed',
  'calculation_reviewed',
  'calculation_approved',
  'integrity_decision_created',
  'integrity_decision_approved',
  'report_approved',
  'unresolved_critical_warnings_absent',
  'workflow_errors_resolved',
  'approver_comment_present'
];

describe('Phase 1.6 report issue and internal work order governance', () => {
  it('hardens report issue with required data, evidence, calculation, integrity, approval, workflow, and comment gates', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    for (const gateType of reportIssueGateTypes) {
      expect(route).toContain(gateType);
    }
    expect(route).toContain('buildReportGateChecklist');
    expect(route).toContain('persistReportGateChecklist');
    expect(route).toContain('REPORT_GATES_NOT_SATISFIED');
    expect(route).toContain('REPORT_ISSUE_BLOCKED');
    expect(route).toContain('REPORT_ISSUED');
    expect(route).toContain('writeReportIssueBlockedError');
    expect(route).toContain('HUMAN_APPROVER_REPORT_ISSUE_REQUIRED');
    expect(route).toContain('n8n_service');
    expect(route).toContain('ai_cannot_issue_report');
    expect(route).toContain('SEGREGATION_OF_DUTY_BLOCKED');
  });

  it('adds internal AIM work order fallback routes without external CMMS integration', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/work-orders.ts');

    expect(app).toContain("import { workOrdersRouter } from './routes/work-orders.js';");
    expect(app).toContain("app.use('/api/v1', workOrdersRouter);");
    expect(route).toContain("workOrdersRouter.post('/work-orders', requirePermission('work_order.create')");
    expect(route).toContain("workOrdersRouter.patch('/work-orders/:workOrderId', requirePermission('work_order.update')");
    expect(route).toContain("workOrdersRouter.post('/work-orders/:workOrderId/close', requirePermission('work_order.close')");
    expect(route).toContain('approved_integrity_decision');
    expect(route).toContain('issued_report_action');
    expect(route).toContain('preliminary_internal_mode');
    expect(route).toContain('EXTERNAL_CMMS_OUT_OF_SCOPE');
    expect(route).toContain('external_cmms_reference: null');
  });

  it('blocks unsafe work order creation and closure unless required gates pass', () => {
    const route = readRepoFile('apps/api/src/routes/work-orders.ts');
    expect(route).toContain('WORK_ORDER_GATES_NOT_SATISFIED');
    expect(route).toContain('INTERNAL_WORK_ORDER_CREATION_BLOCKED');
    expect(route).toContain('integrity_decision_approved_or_preliminary_internal');
    expect(route).toContain('report_issued');
    expect(route).toContain('WORK_ORDER_CLOSE_ENDPOINT_REQUIRED');
    expect(route).toContain('WORK_ORDER_COMPLETION_NOTE_REQUIRED');
    expect(route).toContain('WORK_ORDER_CLOSURE_EVIDENCE_REQUIRED');
    expect(route).toContain('INTERNAL_WORK_ORDER_CLOSE_BLOCKED');
    expect(route).toContain('INTERNAL_WORK_ORDER_CLOSED');
  });

  it('keeps RBAC human-controlled and leaves ai_agent unable to issue reports or create work orders', () => {
    expect(hasPermission(['approver'], 'report.issue')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'report.issue')).toBe(true);
    expect(hasPermission(['engineer'], 'work_order.create')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'work_order.close')).toBe(true);
    expect(hasPermission(['ai_agent'], 'report.issue')).toBe(false);
    expect(hasPermission(['ai_agent'], 'work_order.create')).toBe(false);
    expect(ROLE_PERMISSIONS.approver).toContain('work_order.read');
  });

  it('updates migration, API examples, and OpenAPI contract for Phase 1.6 scope', () => {
    const migration = readRepoFile('db/migrations/0016_phase1_6_report_issue_work_order_gates.sql');
    const openapi = readRepoFile('04_API/openapi.yaml');
    const issuePayload = readRepoFile('04_API/api_payload_examples/issue_report_phase1_6.json');
    const createPayload = readRepoFile('04_API/api_payload_examples/create_internal_work_order.json');

    expect(migration).toContain('issue_gate_checklist_json');
    expect(migration).toContain('gate_checklist_json');
    expect(migration).toContain('external_cmms_reference remains nullable for future integration reference');
    expect(issuePayload).toContain('approver_comment_present');
    expect(createPayload).toContain('No external CMMS call is made');

    for (const apiPath of [
      '/api/v1/reports/{reportId}/issue:',
      '/api/v1/work-orders:',
      '/api/v1/work-orders/{workOrderId}:',
      '/api/v1/work-orders/{workOrderId}/close:'
    ]) {
      expect(openapi).toContain(apiPath);
    }
    expect(openapi).toContain('x-permission-required: report.issue');
    expect(openapi).toContain('x-permission-required: work_order.create');
    expect(openapi).toContain('InternalWorkOrderCreateRequest');
    expect(openapi).toContain('No SAP/Maximo/CMMS integration is implemented');
    expect(openapi).not.toMatch(/x-cmms-integration-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-full-api-579-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-full-api-581-implemented:\s*true/i);
  });
});
