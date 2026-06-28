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

type DetailPageProps = { params: { measurementId: string } };

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'invalid', 'rejected', 'missing', 'error'].some((token) => normalized.includes(token))) return 'badge badge-danger';
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

export default function NdtMeasurementDetailPage({ params }: DetailPageProps) {
  const [measurement, setMeasurement] = useState<NdtMeasurementDetail | null>(null);
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
      const response = await apiFetch(`/api/v1/ndt/measurements/${params.measurementId}`, { cache: 'no-store' });
      const payload = await response.json() as { data?: NdtMeasurementDetail } & ApiErrorPayload;
      if (response.status === 401 || response.status === 403) {
        setPermissionDenied(true);
        return;
      }
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) {
        setIssues(payloadIssues(payload, 'NDT measurement detail could not be loaded.'));
        throw new Error(payload.error?.message ?? 'NDT measurement detail could not be loaded.');
      }
      setMeasurement(payload.data ?? null);
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

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-D</p>
        <h1>NDT Measurement Detail</h1>
        <p>Display-only measurement metadata, evidence linkage, missing-evidence state, and audit traceability.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/ndt">NDT Data Room</Link>
        {measurement?.asset_id && <Link className="secondary-button" href={`/assets/${measurement.asset_id}`}>Asset</Link>}
        {measurement?.asset_id && <Link className="secondary-button" href={`/assets/${measurement.asset_id}/ndt`}>Asset NDT</Link>}
        <Link className="secondary-button" href={`/audit-logs?entity_type=ndt_measurement&entity_id=${params.measurementId}`}>Audit Trail</Link>
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
          <div className="action-row pagination-row">
            {measurement.evidence_file_id && <Link className="secondary-button" href={`/evidence/${measurement.evidence_file_id}`}>Open Evidence Detail</Link>}
            <Link className="secondary-button" href={`/calculations?ndt_measurement_id=${measurement.measurement_id}`}>Calculation Inputs</Link>
            <Link className="secondary-button" href={`/audit-logs?entity_type=ndt_measurement&entity_id=${measurement.measurement_id}`}>Audit Logs</Link>
          </div>
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Display-only Visualization</h2><p>Component/course/grid display uses existing stored measurement data and validation statuses only.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Component</th><th>Course</th><th>CML/TML</th><th>Grid</th><th>Elevation</th><th>Orientation</th><th>Thickness</th><th>Evidence</th><th>Status</th></tr></thead><tbody><tr><td>{measurement.component}</td><td>{displayValue(measurement.shell_course_no)}</td><td>{displayValue(measurement.cml_tml_id)}</td><td>{displayValue(measurement.grid_ref)}</td><td>{displayValue(measurement.elevation)} {measurement.elevation_unit ?? 'm'}</td><td>{displayValue(measurement.orientation)}</td><td>{displayValue(measurement.measured_thickness)} {measurement.measured_thickness_unit ?? 'mm'}</td><td>{evidenceIds.length > 0 ? <span className="badge">linked</span> : <span className="badge badge-warning">missing</span>}</td><td><span className={badgeClass(measurement.validation_status)}>{displayValue(measurement.validation_status)}</span></td></tr></tbody></table></div>
      </section>
    </>}
  </main>;
}
