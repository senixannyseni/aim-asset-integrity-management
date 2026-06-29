'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type ApiErrorPayload = { error?: { code?: string; message?: string } };
type Gate = { gate_type: string; gate_status: string; blocking?: boolean; message?: string };
type ChainStep = { step: string; href: string; count: number; authoritative_module: string };
type WorkspaceReadiness = {
  asset_id: string;
  ready_for_release_candidate_review?: boolean;
  gate_summary?: { total?: number; pass?: number; warning?: number; fail?: number; blocking?: number };
  asset?: Record<string, unknown>;
  readiness_gates?: Gate[];
  end_to_end_chain?: ChainStep[];
  module_traceability?: Record<string, Array<Record<string, unknown>> | Record<string, unknown> | null>;
  audit_events?: Array<Record<string, unknown>>;
  governance_notes?: string[];
};

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['fail', 'blocked', 'rejected', 'retired', 'draft'].includes(normalized)) return 'badge badge-danger';
  if (['warning', 'in_review', 'pending', 'inactive', 'watch'].includes(normalized)) return 'badge badge-warning';
  return 'badge';
}

function dateValue(value?: unknown): string {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '-';
}

function rowsFrom(value: Array<Record<string, unknown>> | Record<string, unknown> | null | undefined): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function TraceTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  return <section className="panel">
    <div className="panel-heading"><h2>{title}</h2><p>Read-only traceability records for the selected asset integrity package.</p></div>
    {rows.length === 0 ? <p className="muted-text">No linked records yet.</p> : <div className="table-wrap"><table><thead><tr><th>ID</th><th>Code / Title</th><th>Status</th><th>Date</th></tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${title}-${displayValue(row.id)}-${index}`}><td>{displayValue(row.id)}</td><td>{displayValue(row.code ?? row.title)}</td><td><span className={badgeClass(String(row.status ?? ''))}>{displayValue(row.status)}</span></td><td>{dateValue(row.created_at ?? row.reviewed_at ?? row.approved_at ?? row.issued_at ?? row.closed_at)}</td></tr>)}</tbody></table></div>}
  </section>;
}

export default function IntegrityWorkspaceDetailClient({ assetId }: { assetId: string }) {
  const [readiness, setReadiness] = useState<WorkspaceReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReadiness() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/integrity-workspace/assets/${assetId}/readiness`, { cache: 'no-store' });
      const payload = await response.json() as { data?: WorkspaceReadiness } & ApiErrorPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? 'End-to-end integrity package readiness could not be loaded.');
      setReadiness(payload.data ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'End-to-end integrity package readiness could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const asset = readiness?.asset ?? {};
  const trace = readiness?.module_traceability ?? {};

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-T</p>
        <h1>End-to-End Integrity Package Readiness</h1>
        <p>Consolidated release-candidate chain: Asset → Inspection → Evidence → NDT → Findings → Calculation → Review/Approval → Integrity Decision → FFS/RBI → Report → Work Order.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/integrity-workspace">Workspace</Link>
        <Link className="secondary-button" href={`/assets/${assetId}`}>Asset Readiness</Link>
        <Link className="secondary-button" href="/evidence-traceability">Evidence Traceability</Link>
        <Link className="secondary-button" href="/golive-readiness">Go-live Readiness</Link>
      </div>
    </header>

    {loading && <section className="notice"><h2>Loading</h2><p>Loading end-to-end readiness...</p></section>}
    {error && <section className="error-list" role="alert"><h2>Request failed</h2><p>{error}</p></section>}

    {readiness && <>
      <section className="cards">
        <article><h2>{displayValue(asset.tank_tag)}</h2><p>Tank tag</p></article>
        <article><h2>{readiness.ready_for_release_candidate_review ? 'Ready' : 'Not ready'}</h2><p>Release candidate review</p></article>
        <article><h2>{displayValue(readiness.gate_summary?.blocking ?? 0)}</h2><p>Blocking gates</p></article>
        <article><h2>{displayValue(readiness.gate_summary?.warning ?? 0)}</h2><p>Warning gates</p></article>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>End-to-End Integrity Chain</h2><p>Each step links back to the authoritative module. This consolidated workspace does not approve, calculate, issue, close, or finalize records.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Step</th><th>Count</th><th>Authoritative module</th><th>Link</th></tr></thead><tbody>{(readiness.end_to_end_chain ?? []).map((step) => <tr key={step.step}><td>{step.step}</td><td>{step.count}</td><td>{step.authoritative_module}</td><td><Link href={step.href}>Open module</Link></td></tr>)}</tbody></table></div>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Release Candidate Readiness Gates</h2><p>Read-only aggregation of package visibility gates. Module-specific gates remain authoritative.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead><tbody>{(readiness.readiness_gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{displayValue(gate.message)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid-two">
        <TraceTable title="Inspection Package Trace" rows={rowsFrom(trace.inspections)} />
        <TraceTable title="Evidence Traceability" rows={rowsFrom(trace.evidence_files)} />
        <TraceTable title="NDT Measurement Trace" rows={rowsFrom(trace.ndt_measurements)} />
        <TraceTable title="Findings / Anomaly Trace" rows={rowsFrom(trace.findings)} />
        <TraceTable title="Calculation Traceability" rows={rowsFrom(trace.calculation_runs)} />
        <TraceTable title="Review / Approval Trace" rows={[...rowsFrom(trace.engineering_reviews), ...rowsFrom(trace.approval_records)]} />
        <TraceTable title="Integrity Decision Trace" rows={rowsFrom(trace.integrity_decisions)} />
        <TraceTable title="FFS / RBI Trace" rows={[...rowsFrom(trace.ffs_cases), ...rowsFrom(trace.rbi_cases)]} />
        <TraceTable title="Report Issue Trace" rows={rowsFrom(trace.reports)} />
        <TraceTable title="Work Order Closure Trace" rows={rowsFrom(trace.work_orders)} />
      </section>

      <TraceTable title="Audit Timeline" rows={readiness.audit_events ?? []} />

      <section className="notice"><h2>Governance Notes</h2><ul>{(readiness.governance_notes ?? []).map((note) => <li key={note}>{note}</li>)}</ul></section>
    </>}
  </main>;
}
