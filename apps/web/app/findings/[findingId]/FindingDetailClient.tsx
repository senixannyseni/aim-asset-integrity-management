'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type LinkedEvidence = { evidence_id: string; evidence_code?: string | null; file_name?: string | null; file_type?: string | null; status?: string | null; asset_id?: string | null };
type FindingDetail = {
  finding_id: string;
  finding_code?: string | null;
  asset_id: string;
  asset_tag?: string | null;
  asset_name?: string | null;
  inspection_event_id?: string | null;
  title: string;
  description?: string | null;
  finding_type: string;
  component?: string | null;
  shell_course_no?: number | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  elevation?: string | null;
  orientation?: string | null;
  severity: string;
  status: string;
  source_type?: string | null;
  source_entity_id?: string | null;
  evidence_file_id?: string | null;
  ndt_measurement_id?: string | null;
  calculation_run_id?: string | null;
  validation_run_id?: string | null;
  identified_at?: string | null;
  closed_at?: string | null;
  closure_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  evidence_code?: string | null;
  evidence_file_name?: string | null;
  ndt_measurement_code?: string | null;
  calculation_run_code?: string | null;
  linked_evidence?: LinkedEvidence[];
  related_links?: Record<string, string | null>;
  linkage_status?: { has_evidence?: boolean; has_ndt?: boolean; has_calculation?: boolean; missing_evidence?: boolean; critical_missing_evidence?: boolean };
};

type FindingDetailClientProps = { findingId: string };

type ValidationIssue = { field: string; message: string; severity?: string };

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['critical', 'blocked', 'failed', 'closed', 'rejected'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['high', 'warning', 'open', 'review', 'disposition'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}

export default function FindingDetailClient({ findingId }: FindingDetailClientProps) {
  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [closureReason, setClosureReason] = useState('');
  const [nextStatus, setNextStatus] = useState('closed');

  async function loadFinding() {
    setLoading(true);
    setErrors([]);
    setNotFound(false);
    try {
      const response = await apiFetch(`/api/v1/findings/${findingId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw payload;
      setFinding(payload.data ?? null);
    } catch (error) {
      const payload = error as { error?: { message?: string; details?: ValidationIssue[] } };
      setErrors(payload.error?.details ?? [{ field: 'request', message: payload.error?.message ?? 'Could not load finding detail.', severity: 'error' }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinding();
  }, [findingId]);

  async function closeFinding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    if (!closureReason.trim()) {
      setErrors([{ field: 'closure_reason', message: 'closure_reason is required when closing or resolving a finding.', severity: 'error' }]);
      return;
    }
    const response = await apiFetch(`/api/v1/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus, closure_reason: closureReason.trim() })
    });
    const payload = await response.json();
    if (!response.ok) {
      setErrors(payload.error?.details ?? [{ field: payload.error?.code ?? 'request', message: payload.error?.message ?? 'Could not close finding.', severity: 'error' }]);
      return;
    }
    setMessage(`Finding status changed to ${payload.data?.status}. Audit log: ${payload.auditLogId ?? 'created'}.`);
    setClosureReason('');
    await loadFinding();
  }

  if (loading) return <main className="app-shell"><section className="panel">Loading finding...</section></main>;
  if (notFound) return <main className="app-shell"><section className="panel"><h1>Finding not found</h1><Link href="/findings">Back to findings</Link></section></main>;
  if (!finding) return <main className="app-shell"><section className="panel">Unable to load finding.</section></main>;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-H Finding Detail</p>
          <h1>{displayValue(finding.finding_code)} — {finding.title}</h1>
          <p>Finding/anomaly traceability record. Closure does not approve calculations, issue reports, create FFS/RBI cases, or make final integrity decisions.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/findings">All findings</Link>
          <Link className="secondary-button" href={`/assets/${finding.asset_id}`}>Asset</Link>
          <Link className="secondary-button" href={`/assets/${finding.asset_id}/findings`}>Asset findings</Link>
        </div>
      </header>

      {message && <section className="notice">{message}</section>}
      {errors.length > 0 && <section className="error-list">{errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}</section>}
      {finding.linkage_status?.critical_missing_evidence && <section className="error-list"><strong>Critical missing-evidence warning:</strong> critical findings require traceable evidence before closure.</section>}

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Finding metadata</h2><p>Status and classification.</p></div>
          <dl className="metadata-grid">
            <dt>Finding code</dt><dd>{displayValue(finding.finding_code)}</dd>
            <dt>Severity</dt><dd><span className={badgeClass(finding.severity)}>{finding.severity}</span></dd>
            <dt>Status</dt><dd><span className={badgeClass(finding.status)}>{finding.status}</span></dd>
            <dt>Type</dt><dd>{finding.finding_type}</dd>
            <dt>Source</dt><dd>{displayValue(finding.source_type)}</dd>
            <dt>Component</dt><dd>{displayValue(finding.component)}</dd>
            <dt>Shell course</dt><dd>{displayValue(finding.shell_course_no)}</dd>
            <dt>CML/TML</dt><dd>{displayValue(finding.cml_tml_id)}</dd>
            <dt>Grid</dt><dd>{displayValue(finding.grid_ref)}</dd>
            <dt>Elevation</dt><dd>{displayValue(finding.elevation)}</dd>
            <dt>Orientation</dt><dd>{displayValue(finding.orientation)}</dd>
            <dt>Identified</dt><dd>{dateValue(finding.identified_at)}</dd>
            <dt>Updated</dt><dd>{dateValue(finding.updated_at)}</dd>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading"><h2>Description / disposition</h2><p>Engineering notes without automatic FFS/RBI disposition.</p></div>
          <p>{displayValue(finding.description, 'No description recorded.')}</p>
          <dl className="metadata-grid">
            <dt>Closure reason</dt><dd>{displayValue(finding.closure_reason, 'Not closed')}</dd>
            <dt>Closed at</dt><dd>{dateValue(finding.closed_at)}</dd>
          </dl>
        </section>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Evidence linkage</h2><p>Evidence links are traceability controls and do not approve findings.</p></div>
          {finding.evidence_file_id ? <p><Link href={`/evidence/${finding.evidence_file_id}`}>{displayValue(finding.evidence_code ?? finding.evidence_file_id)} — {displayValue(finding.evidence_file_name)}</Link></p> : <p><span className="badge badge-warning">missing-evidence</span> Link evidence before final engineering use.</p>}
          {(finding.linked_evidence ?? []).length > 0 && (
            <ul>{(finding.linked_evidence ?? []).map((item) => <li key={item.evidence_id}><Link href={`/evidence/${item.evidence_id}`}>{displayValue(item.evidence_code)} — {displayValue(item.file_name)}</Link></li>)}</ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading"><h2>NDT / calculation linkage</h2><p>Related source records.</p></div>
          <dl className="metadata-grid">
            <dt>NDT</dt><dd>{finding.ndt_measurement_id ? <Link href={`/ndt/${finding.ndt_measurement_id}`}>{displayValue(finding.ndt_measurement_code ?? finding.ndt_measurement_id)}</Link> : <span className="badge badge-warning">no NDT link</span>}</dd>
            <dt>Calculation</dt><dd>{finding.calculation_run_id ? <Link href={`/calculations/${finding.calculation_run_id}`}>{displayValue(finding.calculation_run_code ?? finding.calculation_run_id)}</Link> : <span className="badge badge-warning">no calculation link</span>}</dd>
            <dt>Validation</dt><dd><Link href={`/validation/history?entity_type=finding&entity_id=${finding.finding_id}`}>Validation history</Link></dd>
            <dt>Audit</dt><dd><Link href={`/audit-logs?entity_type=finding&entity_id=${finding.finding_id}`}>Audit log</Link></dd>
          </dl>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Closure panel</h2><p>Only authorized human roles may close findings. AI/n8n/service actors are blocked. Critical findings require evidence linkage.</p></div>
        <form className="form-grid" onSubmit={closeFinding}>
          <label><span>Next status</span><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}><option value="closed">closed</option><option value="resolved">resolved</option></select></label>
          <label className="full-width"><span>Closure reason</span><textarea value={closureReason} onChange={(event) => setClosureReason(event.target.value)} rows={3} placeholder="Required. Explain why this finding can be closed/resolved." /></label>
          <button className="primary-button" type="submit">Submit closure request</button>
        </form>
      </section>
    </main>
  );
}
