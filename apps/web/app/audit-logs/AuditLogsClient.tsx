'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../components/ModuleBranchNav';
import { CompactDataTable, DetailDrawer, DetailGrid, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type AuditLogEntry = {
  audit_log_id: string;
  event_type: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_full_name?: string | null;
  actor_role_codes?: string[];
  entity_type?: string | null;
  entity_id?: string | null;
  request_id?: string | null;
  metadata?: unknown;
  before?: unknown;
  after?: unknown;
  traceability?: { frontend_href?: string | null; note?: string | null };
  created_at: string;
  redaction_notice?: string;
  read_only?: boolean;
};
type Pagination = { page: number; limit: number; total_count: number; has_next_page: boolean };

const AUDIT_BRANCHES: ModuleBranchItem[] = [
  { id: 'timeline', label: 'Timeline', description: 'Latest events', icon: 'TL' },
  { id: 'entity', label: 'Entity', description: 'Entity-specific', icon: 'EA' },
  { id: 'users', label: 'User', description: 'Human actors', icon: 'UA' },
  { id: 'approvals', label: 'Approval', description: 'Review approvals', icon: 'AP' },
  { id: 'security', label: 'Security', description: 'Auth and access', icon: 'SE' },
  { id: 'raw', label: 'Metadata', description: 'Drawer-only values', icon: 'RM' }
];

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export default function AuditLogsClient() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '25');
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [filters, page]);
  const activeBranch = useActiveModuleBranch(AUDIT_BRANCHES, 'timeline');
  const branchEntries = useMemo(() => entries.filter((entry) => {
    const event = String(entry.event_type ?? '').toLowerCase();
    if (activeBranch === 'entity') return Boolean(entry.entity_type || entry.entity_id);
    if (activeBranch === 'users') return Boolean(entry.actor_user_id || entry.actor_email || entry.actor_full_name);
    if (activeBranch === 'approvals') return event.includes('approval') || event.includes('review');
    if (activeBranch === 'security') return event.includes('auth') || event.includes('login') || event.includes('security') || event.includes('permission');
    return true;
  }), [activeBranch, entries]);

  async function loadAuditLogs() {
    setLoading(true);
    setMessage(null);
    const response = await apiFetch(`/api/v1/audit-logs?${queryString}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Could not load audit logs. Confirm audit_logs.view permission.');
      setEntries([]);
      setPagination(null);
      setLoading(false);
      return;
    }
    setEntries(payload.data ?? []);
    setPagination(payload.pagination ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  async function openAuditDetail(auditLogId: string) {
    setMessage(null);
    const response = await apiFetch(`/api/v1/audit-logs/${auditLogId}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Could not open audit log detail.');
      setSelected(null);
      return;
    }
    setSelected(payload.data ?? null);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPage(1);
    setFilters({
      event_type: fieldValue(form, 'event_type'),
      entity_type: fieldValue(form, 'entity_type'),
      entity_id: fieldValue(form, 'entity_id'),
      actor_user_id: fieldValue(form, 'actor_user_id'),
      from: fieldValue(form, 'from'),
      to: fieldValue(form, 'to'),
      search: fieldValue(form, 'search')
    });
  }

  function resetFilters(form: HTMLFormElement) {
    form.reset();
    setPage(1);
    setFilters({});
  }

  return (
    <main className="app-shell">
      <ModuleBranchNav
        items={AUDIT_BRANCHES.map((branch) => ({
          ...branch,
          count: branch.id === 'timeline' || branch.id === 'raw' ? entries.length : undefined,
          status: branch.id === 'raw' ? 'drawer' : undefined
        }))}
        activeId={activeBranch}
      />
      <PageHeader
        eyebrow="RC3-D governance visibility"
        title="Audit Log Governance"
        description="Read-only compact audit timeline. Before/after values and raw metadata are available only in the detail drawer."
        status="closed"
        actions={<><Link className="secondary-button" href="/dashboard">Dashboard</Link><Link className="secondary-button" href="/reports">Reports</Link></>}
      />

      <section className="panel wide-panel">
        <div className="panel-heading">
          <h2>Filters</h2>
          <p>No mutation controls are provided. Audit logs are immutable and displayed with sensitive metadata redacted.</p>
        </div>
        <form className="form-grid" onSubmit={submitFilters}>
          <label><span>Event Type</span><input name="event_type" placeholder="AI_STAGING_PROMOTED" /></label>
          <label><span>Entity Type</span><input name="entity_type" placeholder="extraction_job" /></label>
          <label><span>Entity ID</span><input name="entity_id" placeholder="UUID" /></label>
          <label><span>Actor User ID</span><input name="actor_user_id" placeholder="UUID" /></label>
          <label><span>From</span><input name="from" type="datetime-local" /></label>
          <label><span>To</span><input name="to" type="datetime-local" /></label>
          <label className="wide-field"><span>Search Safe Fields</span><input name="search" placeholder="event, entity type, request ID, actor name/email" /></label>
          <div className="action-row">
            <button className="primary-button" type="submit">Apply Filters</button>
            <button className="secondary-button" type="button" onClick={(event) => resetFilters(event.currentTarget.form as HTMLFormElement)}>Reset</button>
          </div>
        </form>
      </section>

      {message && <div className="error-list"><p>{message}</p></div>}

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Audit Events</h2>
            <p>Permission required: <strong>audit_logs.view</strong>. Service, AI, and n8n actors are restricted by backend RBAC.</p>
          </div>
          <StatusBadge status="closed" label="read-only" />
        </div>
        {loading ? <p className="muted-text">Loading audit logs...</p> : (
          <CompactDataTable
            rows={branchEntries}
            getRowKey={(entry) => entry.audit_log_id}
            emptyTitle="No audit logs"
            emptyMessage="No audit logs matched the filters."
            columns={[
              { header: 'Timestamp', render: (entry) => entry.created_at ? new Date(entry.created_at).toLocaleString() : '-' },
              { header: 'Event', render: (entry) => <button className="link-button" type="button" onClick={() => void openAuditDetail(entry.audit_log_id)}>{entry.event_type}</button> },
              { header: 'Entity', render: (entry) => <span>{entry.entity_type ?? '-'}<br /><code>{entry.entity_id ?? '-'}</code></span> },
              { header: 'Actor', render: (entry) => entry.actor_full_name ?? entry.actor_email ?? entry.actor_user_id ?? 'system' },
              { header: 'Request', render: (entry) => entry.request_id ?? '-' },
              { header: 'Traceability', render: (entry) => entry.traceability?.frontend_href ? <Link href={entry.traceability.frontend_href}>Open page</Link> : 'Entity ID only' }
            ]}
          />
        )}
        {pagination && (
          <div className="row-between pagination-row">
            <p>Page {pagination.page} / {pagination.total_count} total</p>
            <div className="action-row">
              <button className="secondary-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="secondary-button" type="button" disabled={!pagination.has_next_page} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.event_type ?? 'Audit event detail'}
        subtitle={selected?.audit_log_id}
        status="closed"
        onClose={() => setSelected(null)}
        tabs={selected ? [
          {
            id: 'overview',
            label: 'Overview',
            content: <DetailGrid items={[
              { label: 'Entity', value: `${selected.entity_type ?? '-'} / ${selected.entity_id ?? '-'}` },
              { label: 'Actor', value: selected.actor_full_name ?? selected.actor_email ?? selected.actor_user_id ?? 'system' },
              { label: 'Roles', value: selected.actor_role_codes?.join(', ') || '-' },
              { label: 'Created At', value: selected.created_at },
              { label: 'Traceability', value: selected.traceability?.frontend_href ? <Link href={selected.traceability.frontend_href}>Open related AIM route</Link> : selected.traceability?.note ?? '-' },
              { label: 'Redaction', value: selected.redaction_notice ?? 'Sensitive values are redacted.' }
            ]} />
          },
          { id: 'technical', label: 'Technical Data', content: <TechnicalJson value={selected.metadata} /> },
          { id: 'audit', label: 'Audit Trail', content: <TechnicalJson value={{ before: selected.before, after: selected.after }} /> },
          { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={selected} /> }
        ] : []}
      />
    </main>
  );
}
