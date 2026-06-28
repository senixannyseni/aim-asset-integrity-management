'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type ValidationIssue = { field: string; message: string; severity?: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type EvidenceGate = { status?: 'pass' | 'warning' | 'blocked' | string; reason?: string };
type EvidenceMetadata = { evidence_id?: string | null; evidence_code?: string | null; file_name?: string | null; file_type?: string | null; checksum?: string | null; status?: string | null } | null;
type NdtMeasurementDetail = {
  measurement_id: string;
  measurement_code?: string | null;
  asset_id: string;
  inspection_event_id?: string | null;
  component: string;
  shell_course_no?: number | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  elevation?: number | null;
  elevation_unit?: string | null;
  orientation?: string | null;
  measured_thickness: number;
  measured_thickness_unit?: string | null;
  reading_date: string;
  method: string;
  confidence?: number | null;
  evidence_file_id?: string | null;
  evidence?: EvidenceMetadata;
  extraction_source?: string | null;
  reviewer_status?: string | null;
  validation_status?: string | null;
  validation_message?: string | null;
  is_critical?: boolean | null;
  linked_evidence_file_ids?: string[];
  valid_linked_evidence_file_ids?: string[];
  invalid_linked_evidence_file_ids?: string[];
  evidence_gate?: EvidenceGate;
  created_at?: string | null;
  updated_at?: string | null;
};
type ReadinessGate = { gate_type: string; gate_status: 'pass' | 'warning' | 'fail' | string; blocking?: boolean; message?: string; metadata?: Record<string, unknown> };
type NdtMeasurementReadiness = {
  measurement_id: string;
  measurement_code?: string | null;
  asset_id: string;
  inspection_event_id?: string | null;
  ready_for_downstream_calculation?: boolean;
  ready_for_finding_triage?: boolean;
  gate_summary?: { total?: number; pass?: number; warning?: number; fail?: number; blocking?: number };
  readiness_gates?: ReadinessGate[];
  evidence_traceability?: { linked_evidence?: Array<Record<string, unknown>>; cross_asset_evidence_file_ids?: string[]; evidence_gate?: EvidenceGate; same_asset_evidence_count?: number };
  inspection_traceability?: Record<string, unknown>;
  linked_context?: { findings?: Array<Record<string, unknown>>; calculation_inputs?: Array<Record<string, unknown>>; engineering_reviews?: Array<Record<string, unknown>>; approval_records?: Array<Record<string, unknown>> };
  audit_events?: Array<Record<string, unknown>>;
  governance_notes?: string[];
};

type DetailPageProps = { params: { measurementId: string } };

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'invalid', 'rejected', 'missing', 'error', 'fail'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'needs_review', 'pending'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}

function payloadIssues(payload: ApiErrorPayload, fallback: string): ValidationIssue[] {
  if (Array.isArray(payload.error?.details)) return payload.error.details;
  return [{ field: payload.error?.code ?? 'request', message: payload.error?.message ?? fallback, severity: 'error' }];
}

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}

function ErrorList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return <div className="error-list" role="alert">{issues.map((issue, index) => <p key={`${issue.field}-${issue.message}-${index}`}><strong>{issue.field}</strong>: {issue.message}</p>)}</div>;
}

function TraceTable({ title, rows, emptyMessage }: { title: string; rows: Array<Record<string, unknown>>; emptyMessage: string }) {
  return <section className="panel">
    <div className="panel-heading"><h2>{title}</h2><p>{emptyMessage}</p></div>
    {rows.length === 0 ? <p className="muted-text">No linked records yet.</p> : <div className="table-wrap"><table><thead><tr><th>ID</th><th>Code / Name</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${title}-${displayValue(row.id ?? row.calculation_run_id ?? row.evidence_file_id)}-${index}`}><td>{displayValue(row.id ?? row.calculation_run_id ?? row.evidence_file_id)}</td><td>{displayValue(row.code ?? row.run_id ?? row.input_name ?? row.title ?? row.original_filename)}</td><td><span className={badgeClass(String(row.status ?? row.validation_status ?? row.review_status ?? row.approval_status ?? ''))}>{displayValue(row.status ?? row.validation_status ?? row.review_status ?? row.approval_status)}</span></td><td>{dateValue(String(row.created_at ?? ''))}</td></tr>)}</tbody></table></div>}
  </section>;
}

export default function NdtMeasurementDetailPage({ params }: DetailPageProps) {
  const [measurement, setMeasurement] = useState<NdtMeasurementDetail | null>(null);
  const [readiness, setReadiness] = useState<NdtMeasurementReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  async function loadMeasurement() {
    setLoading(true);
    setNotFound(false);
    setPermissionDenied(false);
    setPageError(null);
    setIssues([]);
    try {
      const [detailResponse, readinessResponse] = await Promise.all([
        apiFetch(`/api/v1/ndt/measurements/${params.measurementId}`, { cache: 'no-store' }),
        apiFetch(`/api/v1/ndt/measurements/${params.measurementId}/readiness`, { cache: 'no-store' })
      ]);
      const detailPayload = await detailResponse.json() as { data?: NdtMeasurementDetail } & ApiErrorPayload;
      const readinessPayload = await readinessResponse.json() as { data?: NdtMeasurementReadiness } & ApiErrorPayload;
      if (detailResponse.status === 401 || detailResponse.status === 403 || readinessResponse.status === 401 || readinessResponse.status === 403) {
        setPermissionDenied(true);
        return;
      }
      if (detailResponse.status === 404 || readinessResponse.status === 404) {
        setNotFound(true);
        return;
      }
      if (!detailResponse.ok) {
        setIssues(payloadIssues(detailPayload, 'NDT measurement detail could not be loaded.'));
        throw new Error(detailPayload.error?.message ?? 'NDT measurement detail could not be loaded.');
      }
      if (!readinessResponse.ok) {
        setIssues(payloadIssues(readinessPayload, 'NDT measurement readiness could not be loaded.'));
        throw new Error(readinessPayload.error?.message ?? 'NDT measurement readiness could not be loaded.');
      }
      setMeasurement(detailPayload.data ?? null);
      setReadiness(readinessPayload.data ?? null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'NDT measurement detail could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMeasurement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.measurementId]);

  const evidenceIds = measurement ? Array.from(new Set([measurement.evidence_file_id, ...(measurement.valid_linked_evidence_file_ids ?? [])].filter((id): id is string => typeof id === 'string' && id.length > 0))) : [];
  const gateStatus = measurement?.evidence_gate?.status ?? measurement?.validation_status;
  const missingEvidence = measurement ? evidenceIds.length === 0 : false;
  const blockingEvidence = measurement ? measurement.evidence_gate?.status === 'blocked' || (measurement.is_critical && missingEvidence) : false;
  const linkedContext = readiness?.linked_context ?? {};
  const linkedEvidence = readiness?.evidence_traceability?.linked_evidence ?? [];
  const auditEvents = readiness?.audit_events ?? [];

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-P</p>
        <h1>NDT Measurement Detail + Inspection Traceability Readiness</h1>
        <p>Display-only NDT measurement detail, inspection context, evidence coverage, downstream calculation/finding traceability, and readiness gates.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/ndt">NDT Data Room</Link>
        <Link className="secondary-button" href="/ndt-data-room">NDT Visualization</Link>
        {measurement?.asset_id && <Link className="secondary-button" href={`/assets/${measurement.asset_id}`}>Asset</Link>}
        {measurement?.asset_id && <Link className="secondary-button" href={`/assets/${measurement.asset_id}/ndt`}>Asset NDT</Link>}
        <Link className="secondary-button" href={`/audit-logs?entity_type=ndt_measurement&entity_id=${params.measurementId}`}>Audit Trail</Link>
        <Link className="secondary-button" href={`/findings?ndt_measurement_id=${params.measurementId}`}>Findings</Link>
      </div>
    </header>

    {loading && <StatusPanel type="loading" title="Loading measurement" message="Loading NDT measurement metadata from AIM." />}
    {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view this NDT measurement." />}
    {notFound && <StatusPanel type="empty" title="NDT measurement not found" message="The requested NDT measurement was not found in AIM." />}
    {pageError && <StatusPanel type="error" title="NDT detail error" message={pageError} />}
    <ErrorList issues={issues} />

    {measurement && !loading && !permissionDenied && !notFound && !pageError && <>
      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading row-between">
            <div>
              <h2>{measurement.measurement_code ?? measurement.measurement_id}</h2>
              <p>Stored NDT measurement values only. No minimum-thickness, FFS, RBI, or API/ASME formula is computed here.</p>
            </div>
            <span className={badgeClass(gateStatus)}>{displayValue(gateStatus)}</span>
          </div>
          <dl className="metadata-grid">
            <dt>Measurement ID</dt><dd>{measurement.measurement_id}</dd>
            <dt>Measurement Code</dt><dd>{displayValue(measurement.measurement_code)}</dd>
            <dt>Asset</dt><dd><Link href={`/assets/${measurement.asset_id}`}>{measurement.asset_id}</Link></dd>
            <dt>Inspection / Event</dt><dd>{displayValue(measurement.inspection_event_id)}</dd>
            <dt>Component</dt><dd>{measurement.component}</dd>
            <dt>Shell Course</dt><dd>{displayValue(measurement.shell_course_no)}</dd>
            <dt>CML/TML ID</dt><dd>{displayValue(measurement.cml_tml_id)}</dd>
            <dt>Grid Ref</dt><dd>{displayValue(measurement.grid_ref)}</dd>
            <dt>Elevation</dt><dd>{displayValue(measurement.elevation)} {measurement.elevation_unit ?? 'm'}</dd>
            <dt>Orientation</dt><dd>{displayValue(measurement.orientation)}</dd>
            <dt>Measured Thickness</dt><dd><strong>{displayValue(measurement.measured_thickness)} {measurement.measured_thickness_unit ?? 'mm'}</strong></dd>
            <dt>Reading Date</dt><dd>{dateValue(measurement.reading_date)}</dd>
            <dt>Method</dt><dd><span className="badge">{measurement.method}</span></dd>
            <dt>Confidence</dt><dd>{displayValue(measurement.confidence)}</dd>
            <dt>Extraction Source</dt><dd>{displayValue(measurement.extraction_source)}</dd>
            <dt>Reviewer Status</dt><dd><span className={badgeClass(measurement.reviewer_status)}>{displayValue(measurement.reviewer_status)}</span></dd>
            <dt>Validation Status</dt><dd><span className={badgeClass(measurement.validation_status)}>{displayValue(measurement.validation_status)}</span></dd>
            <dt>Validation Message</dt><dd>{displayValue(measurement.validation_message)}</dd>
            <dt>Created / Updated</dt><dd>{dateValue(measurement.created_at)} / {dateValue(measurement.updated_at)}</dd>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading row-between">
            <div>
              <h2>Inspection Traceability Readiness</h2>
              <p>Read-only RC4-P preview. Review and approval endpoints remain the authoritative mutation paths.</p>
            </div>
            <span className={readiness?.ready_for_downstream_calculation ? 'badge' : 'badge badge-warning'}>{readiness?.ready_for_downstream_calculation ? 'ready for downstream calculation' : 'attention required'}</span>
          </div>
          <dl className="metadata-grid">
            <dt>Total Gates</dt><dd>{displayValue(readiness?.gate_summary?.total)}</dd>
            <dt>Pass / Warning / Fail</dt><dd>{displayValue(readiness?.gate_summary?.pass)} / {displayValue(readiness?.gate_summary?.warning)} / {displayValue(readiness?.gate_summary?.fail)}</dd>
            <dt>Blocking Gates</dt><dd><span className={readiness?.gate_summary?.blocking ? 'badge badge-danger' : 'badge'}>{displayValue(readiness?.gate_summary?.blocking, '0')}</span></dd>
            <dt>Finding Triage Ready</dt><dd>{readiness?.ready_for_finding_triage ? 'yes' : 'no'}</dd>
            <dt>Inspection Context</dt><dd>{readiness?.inspection_traceability?.has_same_asset_inspection_event ? 'same-asset inspection event linked' : 'not linked'}</dd>
            <dt>Same-asset Evidence Count</dt><dd>{displayValue(readiness?.evidence_traceability?.same_asset_evidence_count)}</dd>
          </dl>
        </section>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading">
            <h2>Evidence Linkage</h2>
            <p>Evidence links route to the RC4-C evidence detail page, where preview/open controls enforce malware and access status.</p>
          </div>
          {blockingEvidence && <div className="error-list"><p><strong>Blocking evidence state:</strong> Critical NDT measurement has no traceable evidence. Review/approval gates remain blocked by backend governance.</p></div>}
          {!blockingEvidence && missingEvidence && <div className="notice"><strong>Missing evidence:</strong> Non-critical or not-yet-linked measurement needs engineering follow-up before downstream use.</div>}
          <dl className="metadata-grid">
            <dt>Evidence Gate</dt><dd><span className={badgeClass(measurement.evidence_gate?.status)}>{displayValue(measurement.evidence_gate?.status)}</span></dd>
            <dt>Gate Reason</dt><dd>{displayValue(measurement.evidence_gate?.reason)}</dd>
            <dt>Direct Evidence</dt><dd>{measurement.evidence_file_id ? <Link href={`/evidence/${measurement.evidence_file_id}`}>{measurement.evidence_file_id}</Link> : '-'}</dd>
            <dt>Direct Evidence Metadata</dt><dd>{measurement.evidence ? `${displayValue(measurement.evidence.evidence_code)} — ${displayValue(measurement.evidence.file_name)}` : '-'}</dd>
            <dt>Valid Linked Evidence</dt><dd>{(measurement.valid_linked_evidence_file_ids ?? []).length === 0 ? '-' : measurement.valid_linked_evidence_file_ids?.map((id) => <span key={id}><Link href={`/evidence/${id}`}>{id}</Link><br /></span>)}</dd>
            <dt>Invalid Cross-Asset Evidence</dt><dd>{(measurement.invalid_linked_evidence_file_ids ?? []).length === 0 ? '-' : measurement.invalid_linked_evidence_file_ids?.join(', ')}</dd>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading"><h2>Readiness Gates</h2><p>These gates preview whether the measurement is traceable enough for downstream use; they do not mutate NDT state.</p></div>
          {(readiness?.readiness_gates ?? []).length === 0 ? <p className="muted-text">No readiness gates returned.</p> : <div className="table-wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead><tbody>{readiness?.readiness_gates?.map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{displayValue(gate.message)}</td></tr>)}</tbody></table></div>}
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Display-only Visualization</h2><p>Component/course/grid display uses existing stored measurement data and validation statuses only.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Component</th><th>Course</th><th>CML/TML</th><th>Grid</th><th>Elevation</th><th>Orientation</th><th>Thickness</th><th>Evidence</th><th>Status</th></tr></thead><tbody><tr><td>{measurement.component}</td><td>{displayValue(measurement.shell_course_no)}</td><td>{displayValue(measurement.cml_tml_id)}</td><td>{displayValue(measurement.grid_ref)}</td><td>{displayValue(measurement.elevation)} {measurement.elevation_unit ?? 'm'}</td><td>{displayValue(measurement.orientation)}</td><td>{displayValue(measurement.measured_thickness)} {measurement.measured_thickness_unit ?? 'mm'}</td><td>{evidenceIds.length > 0 ? <span className="badge">linked</span> : <span className="badge badge-warning">missing</span>}</td><td><span className={badgeClass(measurement.validation_status)}>{displayValue(measurement.validation_status)}</span></td></tr></tbody></table></div>
      </section>

      <section className="grid-two">
        <TraceTable title="Linked Evidence" rows={linkedEvidence} emptyMessage="Same-asset direct/linked evidence supporting this measurement." />
        <TraceTable title="Findings / Anomalies" rows={linkedContext.findings ?? []} emptyMessage="Findings created from this NDT measurement appear here." />
        <TraceTable title="Calculation Input Usage" rows={linkedContext.calculation_inputs ?? []} emptyMessage="Deterministic calculation inputs that consumed this measurement appear here." />
        <TraceTable title="Review / Approval Trace" rows={[...(linkedContext.engineering_reviews ?? []), ...(linkedContext.approval_records ?? [])]} emptyMessage="Human engineering reviews and approvals for this measurement appear here." />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Audit Timeline</h2><p>Recent audit events linked to this NDT measurement, its review, and its approval trace.</p></div>
        {auditEvents.length === 0 ? <p className="muted-text">No audit events returned.</p> : <div className="table-wrap"><table><thead><tr><th>Event</th><th>Entity</th><th>Actor</th><th>Created</th></tr></thead><tbody>{auditEvents.map((event, index) => <tr key={`${displayValue(event.audit_log_id)}-${index}`}><td>{displayValue(event.event_type)}</td><td>{displayValue(event.entity_type)} / {displayValue(event.entity_id)}</td><td>{displayValue(event.actor_user_id)}</td><td>{dateValue(String(event.created_at ?? ''))}</td></tr>)}</tbody></table></div>}
        <div className="notice"><strong>Governance:</strong> No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed on this page. AI/n8n/service actors cannot approve NDT measurements or final engineering decisions.</div>
      </section>
    </>}
  </main>;
}
