'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type WorkflowSection = Record<string, unknown>;
type WorkflowConsoleOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  source_of_truth: string;
  boundary_notice: string;
  redaction_notice: string;
  sections: Record<string, WorkflowSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  workflow_task_summary: 'Workflow Task Summary',
  pending_human_follow_ups: 'Pending Human Follow-ups',
  notification_delivery_status: 'Notification Delivery Status',
  workflow_failure_error_summary: 'Workflow Failure / Error Summary',
  recent_workflow_events: 'Recent Workflow Events',
  n8n_boundary: 'n8n Boundary Reminder',
  not_available: 'Not Available'
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: WorkflowSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

export default function WorkflowConsoleClient() {
  const [overview, setOverview] = useState<WorkflowConsoleOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<{ key: string; section: WorkflowSection } | null>(null);

  useEffect(() => {
    async function loadWorkflowConsole() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/workflow-console/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load workflow console.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load workflow console. Confirm workflow_console.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadWorkflowConsole();
  }, []);

  const sectionRows = Object.entries(overview?.sections ?? {});
  const failedCount = sectionRows.filter(([key]) => key.includes('failure') || key.includes('error')).length;
  const followUpCount = sectionRows.filter(([key]) => key.includes('pending')).length;

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="RC3-G n8n workflow console"
        title="n8n Workflow Console / Orchestration Visibility"
        description="Read-only AIM-side workflow visibility. Payloads, error diagnostics, retry metadata, and prohibited controls are in drawers."
        status={failedCount > 0 ? 'failed' : followUpCount > 0 ? 'pending_review' : 'closed'}
        actions={<><Link className="secondary-button" href="/dashboard">Dashboard</Link><Link className="secondary-button" href="/audit-logs">Audit Logs</Link><Link className="secondary-button" href="/work-orders">Work Orders</Link></>}
      />

      {message && <div className="notice"><p>{message}</p></div>}
      {loading && <div className="notice"><p>Loading workflow console...</p></div>}

      {overview && (
        <>
          <section className="pd-kpi-grid" aria-label="Workflow summary">
            <KpiCard title="Sections" value={sectionRows.length} helper="backend-returned groups" />
            <KpiCard title="Pending Follow-ups" value={followUpCount} helper="human action queues" status={followUpCount > 0 ? 'pending_review' : 'closed'} />
            <KpiCard title="Failure Groups" value={failedCount} helper="diagnostics in drawer" status={failedCount > 0 ? 'failed' : 'closed'} />
            <KpiCard title="Boundary" value="AIM" helper={overview.permission_required} status="closed" />
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Workflow Events</h2>
                <p>{overview.source_of_truth}</p>
              </div>
              <StatusBadge status="closed" label="read-only" />
            </div>
            <div className="aim-alert aim-alert--blue">{overview.boundary_notice}</div>
            <CompactDataTable
              rows={sectionRows}
              getRowKey={([sectionKey]) => sectionKey}
              emptyTitle="No workflow sections"
              emptyMessage="No workflow console sections were returned."
              columns={[
                { header: 'Workflow ID', render: ([sectionKey]) => SECTION_TITLES[sectionKey] ?? sectionKey },
                { header: 'Status', render: ([sectionKey]) => <StatusBadge status={sectionKey.includes('failure') || sectionKey.includes('error') ? 'failed' : sectionKey.includes('pending') ? 'pending_review' : 'closed'} /> },
                { header: 'Severity', render: ([sectionKey]) => sectionKey.includes('failure') || sectionKey.includes('error') ? 'high' : 'normal' },
                { header: 'Owner', render: () => 'AIM backend' },
                { header: 'Last Event', render: () => overview.generated_at },
                { header: 'Action', className: 'pd-cell-actions', render: ([sectionKey, section]) => <button className="secondary-button" type="button" onClick={() => setSelectedSection({ key: sectionKey, section })}>View details</button> }
              ]}
            />
          </section>

          <section className="panel wide-panel">
            <h2>Safe AIM Links</h2>
            <div className="action-row">{overview.traceability_links.map((link) => <Link key={link.href} className="secondary-button" href={link.href}>{link.label}</Link>)}</div>
          </section>
        </>
      )}

      <DetailDrawer
        open={Boolean(selectedSection)}
        title={selectedSection ? SECTION_TITLES[selectedSection.key] ?? selectedSection.key : 'Workflow details'}
        subtitle={overview?.redaction_notice}
        status={selectedSection?.key.includes('failure') || selectedSection?.key.includes('error') ? 'failed' : 'pending_review'}
        onClose={() => setSelectedSection(null)}
        tabs={selectedSection ? [
          { id: 'overview', label: 'Overview', content: <DetailGrid items={visibleEntries(selectedSection.section).slice(0, 8).map(([key, value]) => ({ label: key.replaceAll('_', ' '), value: renderValue(value) }))} /> },
          { id: 'technical', label: 'Technical Data', content: <TechnicalJson value={selectedSection.section} /> },
          { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href="/audit-logs">Open audit logs</Link> },
          { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={{ section: selectedSection.section, prohibited_controls: overview?.prohibited_controls }} /> }
        ] : []}
      />
    </main>
  );
}
