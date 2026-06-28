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

describe('RC4-L work order detail and closure readiness workflow', () => {
  it('adds a work order detail route with closure readiness panels and governed actions', () => {
    const page = readRepoFile('apps/web/app/work-orders/[workOrderId]/page.tsx');
    const client = readRepoFile('apps/web/app/work-orders/[workOrderId]/WorkOrderDetailClient.tsx');
    expect(page).toContain('WorkOrderDetailClient');
    expect(client).toContain('RC4-L work order detail and closure readiness');
    expect(client).toContain('/closure-readiness');
    expect(client).toContain('Closure Readiness Gates');
    expect(client).toContain('ready_to_close_after_completion_note');
    expect(client).toContain('Linked Closure Evidence');
    expect(client).toContain('Audit Timeline');
    expect(client).toContain('No SAP/Maximo/CMMS write');
  });

  it('keeps work order detail actions permission-aware and backend-authoritative', () => {
    const client = readRepoFile('apps/web/app/work-orders/[workOrderId]/WorkOrderDetailClient.tsx');
    expect(client).toContain("apiFetch('/api/v1/auth/me'");
    expect(client).toContain("hasPermission(user, 'work_order.update')");
    expect(client).toContain("hasPermission(user, 'work_order.close')");
    expect(client).toContain('workOrderClosed');
    expect(client).toContain('completion_note');
    expect(client).toContain('closure_evidence_link_id');
    expect(client).toContain('/api/v1/work-orders/${workOrderId}/close');
  });

  it('adds a read-only backend closure readiness endpoint and aligned close gates', () => {
    const route = readRepoFile('apps/api/src/routes/work-orders.ts');
    const normalizedRoute = route.replace(/\r\n/g, '\n');
    expect(normalizedRoute).toContain("workOrdersRouter.get(\n  \"/work-orders/:workOrderId/closure-readiness\"");
    expect(route).toContain("requirePermission(\"work_order.read\")");
    expect(route).toContain('buildWorkOrderClosureReadiness');
    expect(route).toContain('ready_to_close_after_completion_note');
    expect(route).toContain('blocking_gate_count_excluding_completion_note');
    expect(route).toContain('WORK_ORDER_CLOSURE_GATES_NOT_SATISFIED');
    expect(route).toContain('WORK_ORDER_ALREADY_CLOSED');
    const readinessRoute = normalizedRoute.slice(
      normalizedRoute.indexOf('"/work-orders/:workOrderId/closure-readiness"'),
      normalizedRoute.indexOf('workOrdersRouter.post(\n  \"/work-orders\"'),
    );
    expect(readinessRoute).not.toContain('INTERNAL_WORK_ORDER_CLOSED');
    expect(readinessRoute).not.toContain('update internal_work_orders set');
    expect(readinessRoute).not.toContain('insert into review_gates');
  });

  it('keeps closure evidence and CMMS boundaries explicit', () => {
    const route = readRepoFile('apps/api/src/routes/work-orders.ts');
    expect(route).toContain('validateClosureEvidenceLink');
    expect(route).toContain('WORK_ORDER_CLOSURE_EVIDENCE_LINK_MISMATCH');
    expect(route).toContain('external_cmms_not_integrated');
    expect(route).toContain('source_traceability_present');
    expect(route).toContain('external_cmms_integration_implemented: false');
    expect(route).toContain("linked_entity_type = 'internal_work_order'");
  });

  it('links list rows to closure readiness detail workflow', () => {
    const list = readRepoFile('apps/web/app/work-orders/WorkOrdersClient.tsx');
    expect(list).toContain('RC4-L adds detail-level closure readiness before close');
    expect(list).toContain('href={`/work-orders/${order.work_order_id}`}');
    expect(list).toContain('Closure readiness</Link>');
  });

  it('documents RC4-L OpenAPI, release, UAT, and sprint controls', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const release = readRepoFile('docs/release/AIM_RC4L_work_order_detail_closure_readiness_report.md');
    const uat = readRepoFile('docs/uat/uat_rc4l_work_order_detail_closure_readiness.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    expect(openapi).toContain('/api/v1/work-orders/{workOrderId}/closure-readiness:');
    expect(openapi).toContain('InternalWorkOrderClosureReadiness');
    expect(openapi).toContain('Read-only closure readiness preview');
    expect(release).toContain('RC4-L Work Order Detail and Closure Readiness');
    expect(uat).toContain('RC4-L Work Order Detail and Closure Readiness UAT');
    expect(sprint).toContain('RC4-L Work Order Detail and Closure Readiness');
  });
});
