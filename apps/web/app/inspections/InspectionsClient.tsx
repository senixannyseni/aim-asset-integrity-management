'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type InspectionEvent = {
  inspection_event_id: string;
  inspection_code?: string | null;
  asset_id?: string | null;
  asset_tag?: string | null;
  asset_name?: string | null;
  inspection_type?: string | null;
  inspection_date?: string | null;
  status?: string | null;
  summary?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiErrorPayload = { error?: { code?: string; message?: string } };

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'rejected', 'draft'].includes(normalized)) return 'badge badge-danger';
  if (['in_review', 'pending', 'warning'].includes(normalized)) return 'badge badge-warning';
  return 'badge';
}

export default function InspectionsClient() {
  const [inspections, setInspections] = useState<InspectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadInspections() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/v1/inspections', { cache: 'no-store' });
      const payload = await response.json() as { data?: InspectionEvent[] } & ApiErrorPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? 'Inspection events could not be loaded.');
      setInspections(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Inspection events could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInspections();
  }, []);

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-Q</p>
        <h1>Inspection Packages</h1>
        <p>RC4-Q adds Inspection Package Readiness for inspection event detail, evidence coverage, NDT coverage, findings, calculations, reviews, and downstream traceability.</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/evidence-traceability">Evidence Traceability</Link>
        <Link className="secondary-button" href="/ndt">NDT Measurements</Link>
      </div>
    </header>

    <section className="panel">
      <div className="panel-heading row-between">
        <div>
          <h2>Inspection Event List</h2>
          <p>Open a package to preview inspection readiness. The preview is read-only and does not approve, calculate, issue reports, or close work orders.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadInspections()} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <div className="error-list" role="alert"><p>{error}</p></div>}
      {loading && <p className="muted-text">Loading inspection events...</p>}
      {!loading && inspections.length === 0 && <p className="muted-text">No inspection events found.</p>}
      {inspections.length > 0 && <div className="table-wrap"><table><thead><tr><th>Inspection</th><th>Asset</th><th>Type</th><th>Status</th><th>Date</th><th>Readiness</th></tr></thead><tbody>{inspections.map((inspection) => <tr key={inspection.inspection_event_id}><td><Link href={`/inspections/${inspection.inspection_event_id}`}>{displayValue(inspection.inspection_code)}</Link><br /><span className="muted-text">{inspection.inspection_event_id}</span></td><td>{displayValue(inspection.asset_tag ?? inspection.asset_name ?? inspection.asset_id)}</td><td>{displayValue(inspection.inspection_type)}</td><td><span className={badgeClass(inspection.status)}>{displayValue(inspection.status)}</span></td><td>{dateValue(inspection.inspection_date)}</td><td><Link className="secondary-button" href={`/inspections/${inspection.inspection_event_id}`}>Inspection Package Readiness</Link></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
