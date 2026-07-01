'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../../components/ModuleBranchNav';

type ApiErrorPayload = { error?: { code?: string; message?: string } };
type ReadinessGate = { gate_type: string; gate_status: 'pass' | 'warning' | 'fail' | string; blocking?: boolean; message?: string; metadata?: Record<string, unknown> };
type AssetRecord = { asset_id: string; tank_tag?: string | null; asset_name?: string | null; facility?: string | null; location?: string | null; service_fluid?: string | null; tank_type?: string | null; construction_year?: number | null; original_design_code?: string | null; current_assessment_code?: string | null; code_edition?: string | null; owner?: string | null; operating_status?: string | null; inspection_due_date?: string | null; record_status?: string | null };
type AssetReadiness = {
  asset_id: string;
  tank_tag?: string | null;
  ready_for_integrity_use?: boolean;
  gate_summary?: { total?: number; pass?: number; warning?: number; fail?: number; blocking?: number };
  asset?: AssetRecord;
  geometry?: Record<string, unknown> | null;
  shell_courses?: Array<Record<string, unknown>>;
  readiness_gates?: ReadinessGate[];
  evidence_traceability?: { direct_evidence_count?: number; linked_evidence?: Array<Record<string, unknown>> };
  package_counts?: Record<string, number>;
  linked_context?: Record<string, Array<Record<string, unknown>>>;
  audit_events?: Array<Record<string, unknown>>;
  governance_notes?: string[];
};

const ASSET_DETAIL_BRANCHES: ModuleBranchItem[] = [
  { id: 'overview', label: 'Overview', description: 'Master data summary', icon: 'OV' },
  { id: 'readiness', label: 'Condition', ariaLabel: 'Asset Integrity Package Readiness', description: 'Package gates', icon: 'RD' },
  { id: 'evidence', label: 'Evidence', description: 'Evidence coverage', icon: 'EV' },
  { id: 'ndt', label: 'NDT', description: 'NDT coverage', icon: 'ND' },
  { id: 'calculations', label: 'Calc', description: 'Run traceability', icon: 'CA' },
  { id: 'decisions', label: 'Decision', description: 'Integrity decisions', icon: 'DE' },
  { id: 'reports', label: 'Report', description: 'Report trace', icon: 'RP' },
  { id: 'work_orders', label: 'Work', description: 'Action trace', icon: 'WO' },
  { id: 'audit', label: 'Audit', description: 'Audit timeline', icon: 'AU' }
];

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['fail', 'blocked', 'rejected', 'retired', 'draft'].includes(normalized)) return 'badge badge-danger';
  if (['warning', 'in_review', 'pending', 'inactive', 'watch'].includes(normalized)) return 'badge badge-warning';
  return 'badge';
}

function TraceTable({ title, rows, emptyMessage }: { title: string; rows: Array<Record<string, unknown>>; emptyMessage: string }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2><p>{emptyMessage}</p></div>{rows.length === 0 ? <p className="muted-text">No linked records yet.</p> : <div className="table-wrap"><table><thead><tr><th>ID</th><th>Code / Name</th><th>Status</th><th>Date</th></tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${title}-${displayValue(row.id ?? row.evidence_file_id)}-${index}`}><td>{displayValue(row.id ?? row.evidence_file_id)}</td><td>{displayValue(row.code ?? row.title ?? row.original_filename ?? row.component)}</td><td><span className={badgeClass(String(row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status ?? row.decision_status ?? row.evidence_status ?? ''))}>{displayValue(row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status ?? row.decision_status ?? row.evidence_status)}</span></td><td>{dateValue(String(row.created_at ?? row.reviewed_at ?? row.approved_at ?? row.issued_at ?? row.closed_at ?? row.inspection_date ?? ''))}</td></tr>)}</tbody></table></div>}</section>;
}

export default function AssetDetailClient({ assetId }: { assetId: string }) {
  const [readiness, setReadiness] = useState<AssetReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReadiness() {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const response = await apiFetch(`/api/v1/assets/${assetId}/readiness`, { cache: 'no-store' });
      const payload = await response.json() as { data?: AssetReadiness } & ApiErrorPayload;
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      if (!response.ok) throw new Error(payload.error?.message ?? 'Asset integrity package readiness could not be loaded.');
      setReadiness(payload.data ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Asset integrity package readiness could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const asset = readiness?.asset;
  const context = readiness?.linked_context ?? {};
  const evidenceRows = readiness?.evidence_traceability?.linked_evidence ?? [];
  const auditRows = readiness?.audit_events ?? [];
  const activeBranch = useActiveModuleBranch(ASSET_DETAIL_BRANCHES);

  return <main className="app-shell">
    <ModuleBranchNav
      items={ASSET_DETAIL_BRANCHES.map((branch) => ({
        ...branch,
        count: branch.id === 'evidence' ? evidenceRows.length : branch.id === 'audit' ? auditRows.length : branch.id === 'readiness' ? readiness?.gate_summary?.blocking ?? 0 : undefined,
        status: branch.id === 'readiness' && (readiness?.gate_summary?.blocking ?? 0) > 0 ? 'blocked' : undefined
      }))}
      activeId={activeBranch}
    />
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-R</p>
        <h1>Asset Detail + Asset Integrity Package Readiness</h1>
        <p>Read-only asset integrity package detail for master data, geometry, shell courses, evidence, inspections, NDT, findings, calculations, decisions, reports, work orders, and audit traceability.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/assets">Asset Register</Link>
        <Link className="secondary-button" href={`/evidence-traceability?asset_id=${assetId}`}>Evidence Traceability</Link>
        <Link className="secondary-button" href={`/inspections?asset_id=${assetId}`}>Inspections</Link>
        <Link className="secondary-button" href={`/assets/${assetId}/validation`}>Validation</Link>
        <Link className="secondary-button" href={`/assets/${assetId}/calculations`}>Calculations</Link>
        <Link className="secondary-button" href={`/assets/${assetId}/findings`}>Findings</Link>
        <Link className="secondary-button" href={`/audit-logs?entity_type=asset&entity_id=${assetId}`}>Audit Trail</Link>
      </div>
    </header>

    {loading && <section className="notice"><h2>Loading</h2><p>Loading asset integrity package readiness...</p></section>}
    {notFound && <section className="error-list"><h2>Not found</h2><p>Tank asset was not found.</p></section>}
    {error && <section className="error-list" role="alert"><h2>Request failed</h2><p>{error}</p></section>}

    {readiness && <>
      {activeBranch === 'overview' && <section className="cards">
        <article><h2>{displayValue(asset?.tank_tag ?? readiness.tank_tag)}</h2><p>Tank tag</p></article>
        <article><h2>{readiness.ready_for_integrity_use ? 'Ready' : 'Not ready'}</h2><p>Integrity package readiness</p></article>
        <article><h2>{displayValue(readiness.gate_summary?.blocking ?? 0)}</h2><p>Blocking gates</p></article>
        <article><h2>{displayValue(readiness.evidence_traceability?.direct_evidence_count ?? 0)}</h2><p>Linked evidence</p></article>
      </section>}

      {activeBranch === 'overview' && <section className="panel">
        <div className="panel-heading row-between"><div><h2>Asset Master Data</h2><p>AIM asset record and operating context from PostgreSQL.</p></div><span className={badgeClass(asset?.record_status ?? asset?.operating_status)}>{displayValue(asset?.record_status ?? asset?.operating_status)}</span></div>
        <dl className="detail-grid">
          <dt>Asset ID</dt><dd>{assetId}</dd>
          <dt>Name</dt><dd>{displayValue(asset?.asset_name)}</dd>
          <dt>Facility / Location</dt><dd>{displayValue(asset?.facility)} / {displayValue(asset?.location)}</dd>
          <dt>Service / Type</dt><dd>{displayValue(asset?.service_fluid)} / {displayValue(asset?.tank_type)}</dd>
          <dt>Codes</dt><dd>{displayValue(asset?.original_design_code)} / {displayValue(asset?.current_assessment_code)} / {displayValue(asset?.code_edition)}</dd>
          <dt>Owner</dt><dd>{displayValue(asset?.owner)}</dd>
          <dt>Inspection due date</dt><dd>{dateValue(asset?.inspection_due_date)}</dd>
        </dl>
      </section>}

      {activeBranch === 'readiness' && <section className="panel">
        <div className="panel-heading"><h2>Asset Integrity Package Readiness Gates</h2><p>Preview-only gates. This page does not update assets, upload evidence, approve records, calculate, issue reports, or close work orders.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead><tbody>{(readiness.readiness_gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{displayValue(gate.message)}</td></tr>)}</tbody></table></div>
      </section>}

      {activeBranch === 'overview' && <section className="grid-two">
        <section className="panel"><div className="panel-heading"><h2>Geometry Summary</h2><p>Tank geometry context used for traceability only.</p></div><dl className="detail-grid">{Object.entries(readiness.geometry ?? {}).slice(0, 12).map(([key, value]) => <><dt key={`${key}-dt`}>{key.replaceAll('_', ' ')}</dt><dd key={`${key}-dd`}>{displayValue(value)}</dd></>)}</dl></section>
        <section className="panel"><div className="panel-heading"><h2>Shell Course Summary</h2><p>Shell-course and material traceability for asset integrity package context.</p></div>{(readiness.shell_courses ?? []).length === 0 ? <p className="muted-text">No shell courses recorded yet.</p> : <div className="table-wrap"><table><thead><tr><th>Course</th><th>Nominal t</th><th>Min measured t</th><th>Material</th></tr></thead><tbody>{(readiness.shell_courses ?? []).map((course) => <tr key={displayValue(course.shell_course_id)}><td>{displayValue(course.course_no)}</td><td>{displayValue(course.nominal_thickness)} mm</td><td>{displayValue(course.measured_min_thickness)} mm</td><td>{displayValue(course.material_code ?? course.material_name ?? course.material_id)}</td></tr>)}</tbody></table></div>}</section>
      </section>}

      {activeBranch === 'overview' && <section className="cards">
        {Object.entries(readiness.package_counts ?? {}).map(([key, value]) => <article key={key}><h2>{value}</h2><p>{key.replaceAll('_', ' ')}</p></article>)}
      </section>}

      {activeBranch === 'evidence' && <TraceTable title="Evidence Coverage" rows={evidenceRows} emptyMessage="Direct same-asset evidence linked to the asset integrity package." />}
      {activeBranch === 'ndt' && <><TraceTable title="Inspection History" rows={context.inspection_events ?? []} emptyMessage="Inspection events linked to this asset." /><TraceTable title="NDT Measurement Coverage" rows={context.ndt_measurements ?? []} emptyMessage="NDT measurements linked to this asset." /><TraceTable title="Findings / Anomalies" rows={context.findings ?? []} emptyMessage="Findings raised for this asset." /></>}
      {activeBranch === 'calculations' && <><TraceTable title="Calculation Runs" rows={context.calculation_runs ?? []} emptyMessage="Deterministic calculation runs using this asset context." /><TraceTable title="Review / Approval Trace" rows={[...(context.engineering_reviews ?? []), ...(context.approval_records ?? [])]} emptyMessage="Human engineering review and approval trace." /></>}
      {activeBranch === 'decisions' && <TraceTable title="Integrity Decisions" rows={context.integrity_decisions ?? []} emptyMessage="Integrity decisions linked to this asset." />}
      {activeBranch === 'reports' && <TraceTable title="Reports and Work Orders" rows={[...(context.reports ?? []), ...(context.internal_work_orders ?? [])]} emptyMessage="Downstream reports and internal work-order fallback traceability." />}
      {activeBranch === 'work_orders' && <TraceTable title="Work Orders" rows={context.internal_work_orders ?? []} emptyMessage="Internal work-order fallback traceability for this asset." />}
      {activeBranch === 'audit' && <TraceTable title="Audit Timeline" rows={auditRows} emptyMessage="Audit events for the asset package and related engineering records." />}

      {activeBranch === 'readiness' && <section className="notice"><h2>Governance Notes</h2><ul>{(readiness.governance_notes ?? []).map((note) => <li key={note}>{note}</li>)}</ul></section>}
    </>}
  </main>;
}
