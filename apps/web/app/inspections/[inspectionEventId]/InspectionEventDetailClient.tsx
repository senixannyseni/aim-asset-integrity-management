'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type ApiErrorPayload = { error?: { code?: string; message?: string } };
type ReadinessGate = { gate_type: string; gate_status: 'pass' | 'warning' | 'fail' | string; blocking?: boolean; message?: string; metadata?: Record<string, unknown> };
type InspectionEventRecord = { inspection_event_id: string; inspection_code?: string | null; asset_id?: string | null; asset_tag?: string | null; asset_name?: string | null; inspection_type?: string | null; inspection_date?: string | null; status?: string | null; summary?: string | null; created_at?: string | null; updated_at?: string | null };
type InspectionReadiness = {
  inspection_event_id: string;
  inspection_code?: string | null;
  asset_id?: string | null;
  ready_for_downstream_use?: boolean;
  gate_summary?: { total?: number; pass?: number; warning?: number; fail?: number; blocking?: number };
  inspection_event?: InspectionEventRecord;
  readiness_gates?: ReadinessGate[];
  evidence_traceability?: { direct_evidence_count?: number; linked_evidence?: Array<Record<string, unknown>> };
  package_counts?: Record<string, number>;
  linked_context?: Record<string, Array<Record<string, unknown>>>;
  audit_events?: Array<Record<string, unknown>>;
  governance_notes?: string[];
};

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['fail', 'blocked', 'rejected', 'draft'].includes(normalized)) return 'badge badge-danger';
  if (['warning', 'in_review', 'pending'].includes(normalized)) return 'badge badge-warning';
  return 'badge';
}

function TraceTable({ title, rows, emptyMessage }: { title: string; rows: Array<Record<string, unknown>>; emptyMessage: string }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2><p>{emptyMessage}</p></div>{rows.length === 0 ? <p className="muted-text">No linked records yet.</p> : <div className="table-wrap"><table><thead><tr><th>ID</th><th>Code / Name</th><th>Status</th><th>Date</th></tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${title}-${displayValue(row.id ?? row.evidence_file_id)}-${index}`}><td>{displayValue(row.id ?? row.evidence_file_id)}</td><td>{displayValue(row.code ?? row.title ?? row.original_filename ?? row.component)}</td><td><span className={badgeClass(String(row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status ?? ''))}>{displayValue(row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status)}</span></td><td>{dateValue(String(row.created_at ?? row.reviewed_at ?? row.approved_at ?? row.issued_at ?? row.closed_at ?? ''))}</td></tr>)}</tbody></table></div>}</section>;
}

export default function InspectionEventDetailClient({ inspectionEventId }: { inspectionEventId: string }) {
  const [readiness, setReadiness] = useState<InspectionReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReadiness() {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await apiFetch(`/api/v1/inspections/${inspectionEventId}/readiness`, { cache: 'no-store' });
      const payload = await response.json() as { data?: InspectionReadiness } & ApiErrorPayload;
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw new Error(payload.error?.message ?? 'Inspection package readiness could not be loaded.');
      setReadiness(payload.data ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Inspection package readiness could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionEventId]);

  const inspection = readiness?.inspection_event;
  const context = readiness?.linked_context ?? {};
  const evidenceRows = readiness?.evidence_traceability?.linked_evidence ?? [];
  const auditRows = readiness?.audit_events ?? [];

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-Q</p>
        <h1>Inspection Event Detail + Inspection Package Readiness</h1>
        <p>Read-only package detail for inspection scope, evidence coverage, NDT coverage, findings, calculations, reviews, and downstream traceability.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/inspections">Inspection Packages</Link>
        <Link className="secondary-button" href={`/evidence-traceability?inspection_event_id=${inspectionEventId}`}>Evidence Traceability</Link>
        <Link className="secondary-button" href={`/audit-logs?entity_type=inspection_event&entity_id=${inspectionEventId}`}>Audit Trail</Link>
        {inspection?.asset_id && <Link className="secondary-button" href={`/assets/${inspection.asset_id}`}>Asset</Link>}
      </div>
    </header>

    {loading && <section className="notice"><h2>Loading</h2><p>Loading inspection package readiness...</p></section>}
    {notFound && <section className="error-list"><h2>Not found</h2><p>Inspection event was not found.</p></section>}
    {error && <section className="error-list" role="alert"><h2>Request failed</h2><p>{error}</p></section>}

    {readiness && <>
      <section className="cards">
        <article><h2>{displayValue(inspection?.inspection_code)}</h2><p>Inspection code</p></article>
        <article><h2>{readiness.ready_for_downstream_use ? 'Ready' : 'Not ready'}</h2><p>Downstream readiness</p></article>
        <article><h2>{displayValue(readiness.gate_summary?.blocking ?? 0)}</h2><p>Blocking gates</p></article>
        <article><h2>{displayValue(readiness.evidence_traceability?.direct_evidence_count ?? 0)}</h2><p>Linked evidence</p></article>
      </section>

      <section className="panel">
        <div className="panel-heading row-between"><div><h2>Inspection Scope</h2><p>Inspection package metadata from AIM PostgreSQL.</p></div><span className={badgeClass(inspection?.status)}>{displayValue(inspection?.status)}</span></div>
        <dl className="detail-grid">
          <dt>Inspection Event ID</dt><dd>{inspectionEventId}</dd>
          <dt>Asset</dt><dd>{displayValue(inspection?.asset_tag ?? inspection?.asset_name ?? inspection?.asset_id)}</dd>
          <dt>Type</dt><dd>{displayValue(inspection?.inspection_type)}</dd>
          <dt>Date</dt><dd>{dateValue(inspection?.inspection_date)}</dd>
          <dt>Summary</dt><dd>{displayValue(inspection?.summary)}</dd>
          <dt>Created / Updated</dt><dd>{dateValue(inspection?.created_at)} / {dateValue(inspection?.updated_at)}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Inspection Package Readiness Gates</h2><p>Preview-only gates. This page does not approve, calculate, issue reports, or close work orders.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead><tbody>{(readiness.readiness_gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{displayValue(gate.message)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="cards">
        {Object.entries(readiness.package_counts ?? {}).map(([key, value]) => <article key={key}><h2>{value}</h2><p>{key.replaceAll('_', ' ')}</p></article>)}
      </section>

      <TraceTable title="Evidence Coverage" rows={evidenceRows} emptyMessage="Direct same-asset evidence linked to the inspection package." />
      <TraceTable title="NDT Measurement Coverage" rows={context.ndt_measurements ?? []} emptyMessage="NDT measurements linked to this inspection event." />
      <TraceTable title="Findings / Anomalies" rows={context.findings ?? []} emptyMessage="Findings raised from this inspection package." />
      <TraceTable title="Calculation Runs" rows={context.calculation_runs ?? []} emptyMessage="Deterministic calculation runs using this inspection context." />
      <TraceTable title="Review / Approval Trace" rows={[...(context.engineering_reviews ?? []), ...(context.approval_records ?? [])]} emptyMessage="Human engineering review and approval trace." />
      <TraceTable title="Downstream Decisions, Reports, and Work Orders" rows={[...(context.integrity_decisions ?? []), ...(context.reports ?? []), ...(context.internal_work_orders ?? [])]} emptyMessage="Downstream engineering outputs linked to this inspection package." />
      <TraceTable title="Audit Timeline" rows={auditRows} emptyMessage="Audit events for the inspection package and related engineering records." />

      <section className="notice"><h2>Governance Notes</h2><ul>{(readiness.governance_notes ?? []).map((note) => <li key={note}>{note}</li>)}</ul></section>
    </>}
  </main>;
}
