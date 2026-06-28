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

describe('RC4-P NDT measurement detail inspection traceability readiness', () => {
  it('adds read-only backend NDT measurement readiness endpoint with governance gates', () => {
    const route = readRepoFile('apps/api/src/routes/ndt.ts');
    expect(route).toContain("ndtRouter.get('/ndt/measurements/:measurementId/readiness'");
    expect(route).toContain("requirePermission('ndt.read')");
    expect(route).toContain('buildNdtMeasurementReadiness');
    expect(route).toContain('ndt_measurement_recorded');
    expect(route).toContain('inspection_context_linked');
    expect(route).toContain('same_asset_evidence_linked');
    expect(route).toContain('critical_measurement_evidence_gate_satisfied');
    expect(route).toContain('reviewer_status_ready');
    expect(route).toContain('validation_not_blocked');
    expect(route).toContain('downstream_calculation_trace_visible');
    expect(route).toContain('finding_traceability_visible');
    expect(route).toContain('ai_n8n_finalization_absent');
    const readinessRouteStart = route.indexOf("'/ndt/measurements/:measurementId/readiness'");
    const readinessRouteEnd = route.indexOf("ndtRouter.get('/ndt/measurements/:measurementId',", readinessRouteStart + 1);
    const readinessRoute = route.slice(readinessRouteStart, readinessRouteEnd);
    expect(readinessRoute).not.toContain("method: 'POST'");
    expect(readinessRoute).not.toContain('NDT_MEASUREMENT_APPROVED');
  });

  it('surfaces evidence, inspection, findings, calculation usage, review approval, and audit traceability without formulas', () => {
    const route = readRepoFile('apps/api/src/routes/ndt.ts');
    expect(route).toContain('loadNdtEvidenceLinks');
    expect(route).toContain('inspection_events');
    expect(route).toContain('findings');
    expect(route).toContain('calculation_inputs');
    expect(route).toContain('engineering_reviews');
    expect(route).toContain('approval_records');
    expect(route).toContain('audit_logs');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is implemented');
    expect(route).not.toContain('remaining_life =');
    expect(route).not.toContain('corrosion_rate =');
  });

  it('enhances frontend NDT detail and list pages with inspection traceability readiness', () => {
    const detail = readRepoFile('apps/web/app/ndt/[measurementId]/page.tsx');
    const list = readRepoFile('apps/web/app/ndt/NdtDataRoomClient.tsx');
    expect(detail).toContain('/api/v1/ndt/measurements/${params.measurementId}/readiness');
    expect(detail).toContain('NDT Measurement Detail + Inspection Traceability Readiness');
    expect(detail).toContain('Inspection Traceability Readiness');
    expect(detail).toContain('Readiness Gates');
    expect(detail).toContain('Linked Evidence');
    expect(detail).toContain('Findings / Anomalies');
    expect(detail).toContain('Calculation Input Usage');
    expect(detail).toContain('Review / Approval Trace');
    expect(detail).toContain('Audit Timeline');
    expect(detail).toContain('AI/n8n/service actors cannot approve NDT measurements');
    expect(detail).not.toContain("method: 'POST'");
    expect(detail).not.toContain('runCalculation(');
    expect(list).toContain('RC4-P adds measurement detail inspection traceability readiness');
    expect(list).toContain('Inspection Traceability Readiness');
  });

  it('documents OpenAPI, UAT, release notes, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const uat = readRepoFile('docs/uat/uat_rc4p_ndt_measurement_detail_inspection_traceability.md');
    const release = readRepoFile('docs/release/AIM_RC4P_ndt_measurement_detail_inspection_traceability_report.md');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    expect(openapi).toContain('/api/v1/ndt/measurements/{measurementId}/readiness');
    expect(openapi).toContain('NdtMeasurementReadiness');
    expect(openapi).toContain('NdtMeasurementReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(uat).toContain('Inspection Traceability Readiness');
    expect(release).toContain('RC4-P');
    expect(readme).toContain('RC4-P NDT Measurement Detail + Inspection Traceability Readiness');
    expect(sprint).toContain('RC4-P — NDT Measurement Detail + Inspection Traceability Readiness');
  });
});
