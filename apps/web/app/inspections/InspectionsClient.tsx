'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

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
  const [selectedInspection, setSelectedInspection] = useState<InspectionEvent | null>(null);
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

  const pendingCount = inspections.filter((inspection) => ['pending_review', 'in_review', 'needs_review'].includes(String(inspection.status ?? '').toLowerCase())).length;
  const approvedCount = inspections.filter((inspection) => String(inspection.status ?? '').toLowerCase() === 'approved').length;
  const blockedCount = inspections.filter((inspection) => ['blocked', 'rejected', 'failed'].includes(String(inspection.status ?? '').toLowerCase())).length;

  return <main className="app-shell">
    <PageHeader
      eyebrow="RC4-Q"
      title="Inspection Packages"
      description="Plan and review inspection records with package readiness available on demand instead of exposing full scope, evidence, and trace history in the table."
      status={blockedCount > 0 ? 'blocked' : pendingCount > 0 ? 'pending_review' : 'approved'}
      actions={<><Link className="secondary-button" href="/evidence-traceability">Evidence Traceability</Link><Link className="secondary-button" href="/ndt">NDT Measurements</Link></>}
    />

    <section className="pd-kpi-grid" aria-label="Inspection summary">
      <KpiCard title="Inspections" value={inspections.length} helper="loaded packages" />
      <KpiCard title="Pending Review" value={pendingCount} helper="human action required" status="pending_review" />
      <KpiCard title="Approved" value={approvedCount} helper="review complete" status="approved" />
      <KpiCard title="Blocked or Rejected" value={blockedCount} helper="visible safety gate state" status={blockedCount > 0 ? 'blocked' : 'approved'} />
    </section>

    <section className="panel">
      <div className="panel-heading row-between">
        <div>
          <h2>Inspection Event List</h2>
          <p>Essential list view. Scope, notes, evidence coverage, workflow history, and audit context are in the drawer.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadInspections()} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {error && <div className="error-list" role="alert"><p>{error}</p></div>}
      {loading && <p className="muted-text">Loading inspection events...</p>}
      {!loading && (
        <CompactDataTable
          rows={inspections}
          getRowKey={(inspection) => inspection.inspection_event_id}
          emptyTitle="No inspection events"
          emptyMessage="No inspections found. Create an inspection for a registered tank asset."
          columns={[
            { header: 'Inspection', render: (inspection) => <Link href={`/inspections/${inspection.inspection_event_id}`}>{displayValue(inspection.inspection_code, inspection.inspection_event_id)}</Link> },
            { header: 'Asset', render: (inspection) => displayValue(inspection.asset_tag ?? inspection.asset_name ?? inspection.asset_id) },
            { header: 'Status', render: (inspection) => <StatusBadge status={inspection.status} /> },
            { header: 'Due / Date', render: (inspection) => dateValue(inspection.inspection_date) },
            { header: 'Assigned Role', render: (inspection) => displayValue(inspection.inspection_type, 'inspection') },
            { header: 'Next Action', className: 'pd-cell-actions', render: (inspection) => <button className="secondary-button" type="button" onClick={() => setSelectedInspection(inspection)}>View details</button> }
          ]}
        />
      )}
    </section>

    <DetailDrawer
      open={Boolean(selectedInspection)}
      title={selectedInspection?.inspection_code ?? selectedInspection?.inspection_event_id ?? 'Inspection details'}
      subtitle={selectedInspection ? displayValue(selectedInspection.asset_tag ?? selectedInspection.asset_name ?? selectedInspection.asset_id) : undefined}
      status={selectedInspection?.status}
      onClose={() => setSelectedInspection(null)}
      tabs={selectedInspection ? [
        {
          id: 'overview',
          label: 'Overview',
          content: <DetailGrid items={[
            { label: 'Inspection ID', value: <code>{selectedInspection.inspection_event_id}</code> },
            { label: 'Asset', value: displayValue(selectedInspection.asset_tag ?? selectedInspection.asset_name ?? selectedInspection.asset_id) },
            { label: 'Type', value: displayValue(selectedInspection.inspection_type) },
            { label: 'Inspection Date', value: dateValue(selectedInspection.inspection_date) },
            { label: 'Created', value: dateValue(selectedInspection.created_at) },
            { label: 'Updated', value: dateValue(selectedInspection.updated_at) }
          ]} />
        },
        {
          id: 'technical',
          label: 'Technical Data',
          content: <div className="pd-drawer-section"><h3>Scope and Notes</h3><p>{displayValue(selectedInspection.summary, 'No long scope or notes returned in the list response.')}</p></div>
        },
        {
          id: 'evidence',
          label: 'Evidence',
          content: <div className="pd-compact-actions"><Link className="secondary-button" href={`/evidence?inspection_event_id=${selectedInspection.inspection_event_id}`}>Evidence</Link><Link className="secondary-button" href={`/ndt?inspection_event_id=${selectedInspection.inspection_event_id}`}>NDT</Link></div>
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          content: <Link className="secondary-button" href={`/audit-logs?entity_type=inspection_event&entity_id=${selectedInspection.inspection_event_id}`}>Open audit trail</Link>
        },
        {
          id: 'raw',
          label: 'Raw Metadata',
          content: <TechnicalJson value={selectedInspection} />
        }
      ] : []}
    />
  </main>;
}
