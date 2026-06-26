'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

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
  traceability?: {
    frontend_href?: string | null;
    note?: string | null;
  };
  created_at: string;
  redaction_notice?: string;
  read_only?: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total_count: number;
  has_next_page: boolean;
};

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function compactJson(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const text = JSON.stringify(value, null, 2);
  return text.length > 700 ? `${text.slice(0, 700)}\n...` : text;
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
      <header className="page-header">
        <div>
          <p className="eyebrow">RC3-D Governance Visibility</p>
          <h1>Audit Log Governance</h1>
          <p>Read-only visibility into AIM audit events with RBAC enforcement, metadata redaction, and traceability context.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/">Home</Link>
          <Link className="secondary-button" href="/reports">Reports</Link>
        </div>
      </header>

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
            <p>Permission required: <strong>audit_logs.view</strong>. Service, AI, and n8n actors are blocked from broad audit UI visibility.</p>
          </div>
          <span className="badge">Read-only</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Request</th>
                <th>Traceability</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6}>Loading audit logs...</td></tr> : entries.length === 0 ? <tr><td colSpan={6}>No audit logs matched the filters.</td></tr> : entries.map((entry) => (
                <tr key={entry.audit_log_id}>
                  <td>{entry.created_at ? new Date(entry.created_at).toLocaleString() : '-'}</td>
                  <td><button className="link-button" type="button" onClick={() => openAuditDetail(entry.audit_log_id)}>{entry.event_type}</button></td>
                  <td>{entry.entity_type ?? '-'}<br /><code>{entry.entity_id ?? '-'}</code></td>
                  <td>{entry.actor_full_name ?? entry.actor_email ?? entry.actor_user_id ?? 'system'}</td>
                  <td>{entry.request_id ?? '-'}</td>
                  <td>{entry.traceability?.frontend_href ? <Link href={entry.traceability.frontend_href}>Open related page</Link> : 'Entity ID only'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="row-between pagination-row">
            <p>Page {pagination.page} · {pagination.total_count} total</p>
            <div className="action-row">
              <button className="secondary-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <button className="secondary-button" type="button" disabled={!pagination.has_next_page} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>

      {selected && (
        <section className="panel detail-panel">
          <div className="panel-heading row-between">
            <div>
              <h2>Audit Event Detail</h2>
              <p>{selected.event_type} · {selected.audit_log_id}</p>
            </div>
            <span className="badge">Immutable / read-only</span>
          </div>
          <dl className="metadata-grid">
            <dt>Entity</dt><dd>{selected.entity_type ?? '-'} / {selected.entity_id ?? '-'}</dd>
            <dt>Actor</dt><dd>{selected.actor_full_name ?? selected.actor_email ?? selected.actor_user_id ?? 'system'}</dd>
            <dt>Roles</dt><dd>{selected.actor_role_codes?.join(', ') || '-'}</dd>
            <dt>Created At</dt><dd>{selected.created_at}</dd>
            <dt>Traceability</dt><dd>{selected.traceability?.frontend_href ? <Link href={selected.traceability.frontend_href}>Open related AIM route</Link> : selected.traceability?.note ?? '-'}</dd>
            <dt>Redaction Notice</dt><dd>{selected.redaction_notice ?? 'Sensitive values are redacted.'}</dd>
          </dl>
          <div className="grid-two">
            <div>
              <h3>Metadata</h3>
              <pre className="json-panel">{compactJson(selected.metadata)}</pre>
            </div>
            <div>
              <h3>Before / After</h3>
              <pre className="json-panel">{compactJson({ before: selected.before, after: selected.after })}</pre>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
