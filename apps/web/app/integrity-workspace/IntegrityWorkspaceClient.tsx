'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ApiErrorPayload = { error?: { code?: string; message?: string } };
type WorkspaceAsset = {
  asset: {
    asset_id: string;
    tank_tag?: string | null;
    asset_name?: string | null;
    facility?: string | null;
    location?: string | null;
    service_fluid?: string | null;
    operating_status?: string | null;
  };
  counts: Record<string, number>;
  links?: Record<string, string>;
};
type WorkspacePayload = {
  generated_at?: string;
  read_only?: boolean;
  workspace?: string;
  summary?: Record<string, number>;
  assets?: WorkspaceAsset[];
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

export default function IntegrityWorkspaceClient() {
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/v1/integrity-workspace', { cache: 'no-store' });
      const payload = await response.json() as { data?: WorkspacePayload } & ApiErrorPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? 'End-to-end integrity package workspace could not be loaded.');
      setWorkspace(payload.data ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'End-to-end integrity package workspace could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const summary = workspace?.summary ?? {};
  const assets = workspace?.assets ?? [];

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-T</p>
        <h1>End-to-End Integrity Package Workspace</h1>
        <p>Release candidate consolidation view linking Asset → Inspection → Evidence → NDT → Findings → Calculation → Review/Approval → Integrity Decision → FFS/RBI → Report → Work Order.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/dashboard">Governance Dashboard</Link>
        <Link className="secondary-button" href="/assets">Assets</Link>
        <Link className="secondary-button" href="/evidence-traceability">Evidence Traceability</Link>
        <Link className="secondary-button" href="/golive-readiness">Go-live Readiness</Link>
      </div>
    </header>

    {loading && <section className="notice"><h2>Loading</h2><p>Loading consolidated package coverage...</p></section>}
    {error && <section className="error-list" role="alert"><h2>Request failed</h2><p>{error}</p></section>}

    {workspace && <>
      <section className="cards">
        <article><h2>{displayValue(summary.assets_total ?? 0)}</h2><p>Total assets</p></article>
        <article><h2>{displayValue(summary.assets_with_inspection ?? 0)}</h2><p>Assets with inspection</p></article>
        <article><h2>{displayValue(summary.assets_with_evidence ?? 0)}</h2><p>Assets with evidence</p></article>
        <article><h2>{displayValue(summary.assets_with_calculations ?? 0)}</h2><p>Assets with calculations</p></article>
        <article><h2>{displayValue(summary.assets_with_integrity_decisions ?? 0)}</h2><p>Assets with decisions</p></article>
        <article><h2>{displayValue(summary.assets_with_reports ?? 0)}</h2><p>Assets with reports</p></article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Release Candidate Consolidation Chain</h2>
          <p>Each row links to the asset-level consolidated readiness preview. Module-specific gates remain authoritative in their own pages.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
                <th>Inspection</th>
                <th>Evidence</th>
                <th>NDT</th>
                <th>Findings</th>
                <th>Calculations</th>
                <th>Decisions</th>
                <th>Reports</th>
                <th>Work Orders</th>
                <th>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((row) => <tr key={row.asset.asset_id}>
                <td><strong>{displayValue(row.asset.tank_tag)}</strong><br /><span className="muted-text">{displayValue(row.asset.asset_name)}</span></td>
                <td><span className={badgeClass(row.asset.operating_status)}>{displayValue(row.asset.operating_status)}</span></td>
                <td>{displayValue(row.counts.inspections ?? 0)}</td>
                <td>{displayValue(row.counts.evidence_files ?? 0)}</td>
                <td>{displayValue(row.counts.ndt_measurements ?? 0)}</td>
                <td>{displayValue(row.counts.findings ?? 0)}</td>
                <td>{displayValue(row.counts.calculation_runs ?? 0)}</td>
                <td>{displayValue(row.counts.integrity_decisions ?? 0)}</td>
                <td>{displayValue(row.counts.reports ?? 0)}</td>
                <td>{displayValue(row.counts.work_orders ?? 0)}</td>
                <td><Link href={`/integrity-workspace/${row.asset.asset_id}`}>Open End-to-End Readiness</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="notice">
        <h2>Governance Notes</h2>
        <ul>{(workspace.governance_notes ?? []).map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
    </>}
  </main>;
}
