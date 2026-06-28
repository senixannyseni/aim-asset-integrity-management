'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type ValidationIssue = { group?: string; field_name?: string; label?: string; severity?: string; message?: string; suggested_fix?: string; engineering_note?: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type ValidationRun = {
  validation_run_id: string;
  run_code?: string | null;
  validation_scope?: string | null;
  asset_id?: string | null;
  status?: string | null;
  blocking_count?: number | null;
  warning_count?: number | null;
  info_count?: number | null;
  issue_count?: number | null;
  affected_entity_types?: string[];
  source?: string | null;
  checked_by?: string | null;
  triggered_by?: string | null;
  checked_at?: string | null;
  created_at?: string | null;
  latest_message?: string | null;
  issues?: ValidationIssue[];
};

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}
function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'blocking', 'failed', 'fail', 'error'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'warn', 'pending', 'not_checked'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function statusFromRun(run: ValidationRun): string {
  if ((run.blocking_count ?? 0) > 0) return 'blocked';
  if ((run.warning_count ?? 0) > 0) return 'warning';
  return run.status ?? 'passed';
}
function dateValue(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }

export default function ValidationHistoryClient() {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ValidationRun | null>(null);
  const [filters, setFilters] = useState({ asset_id: '', entity_type: '', status: '', severity: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const filteredRuns = useMemo(() => runs.filter((run) => {
    const status = statusFromRun(run);
    const entityMatch = !filters.entity_type || (run.affected_entity_types ?? []).includes(filters.entity_type);
    const severityMatch = !filters.severity || status === filters.severity || (run.issues ?? []).some((issue) => issue.severity === filters.severity);
    const dateText = run.checked_at ?? run.created_at ?? '';
    return (!filters.asset_id || String(run.asset_id ?? '').includes(filters.asset_id))
      && (!filters.status || status === filters.status)
      && entityMatch
      && severityMatch
      && (!filters.date_from || dateText >= filters.date_from)
      && (!filters.date_to || dateText.slice(0, 10) <= filters.date_to);
  }), [filters, runs]);

  async function loadHistory() {
    setLoading(true); setPageError(null); setPermissionDenied(false);
    try {
      const response = await apiFetch('/api/v1/engineering/validation-history?limit=200', { cache: 'no-store' });
      const payload = await response.json() as { data?: ValidationRun[] } & ApiErrorPayload;
      if (response.status === 401 || response.status === 403) { setPermissionDenied(true); setRuns([]); return; }
      if (!response.ok) throw new Error(payload.error?.message ?? 'Validation history could not be loaded.');
      setRuns(payload.data ?? []);
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Validation history could not be loaded.'); }
    finally { setLoading(false); }
  }

  async function openRun(runId: string) {
    setDetailLoading(true); setSelectedRun(null);
    try {
      const response = await apiFetch(`/api/v1/engineering/validation-history/${runId}`, { cache: 'no-store' });
      const payload = await response.json() as { data?: ValidationRun } & ApiErrorPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? 'Validation run detail could not be loaded.');
      setSelectedRun(payload.data ?? null);
    } catch (error) { setSelectedRun({ validation_run_id: runId, latest_message: error instanceof Error ? error.message : 'Validation run detail could not be loaded.', issues: [] }); }
    finally { setDetailLoading(false); }
  }

  useEffect(() => { void loadHistory(); }, []);

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading validation history" message="Loading stored validation snapshots." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="Your role does not have validation history access." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Validation history unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <header className="page-header"><div><p className="eyebrow">RC4-E Validation History</p><h1>Validation History</h1><p>Read-only visibility into validation snapshots. Historical validation records cannot be edited here.</p></div><div className="action-row"><Link className="secondary-button" href="/validation">Validation overview</Link><Link className="secondary-button" href="/data-dictionary">Data dictionary</Link></div></header>

      <section className="panel">
        <div className="panel-heading"><h2>Filters</h2><p>Filter by asset, entity group, status, severity, and date range where available.</p></div>
        <div className="form-grid">
          <label><span>asset_id</span><input value={filters.asset_id} onChange={(event: ChangeEvent<HTMLInputElement>) => setFilters((current) => ({ ...current, asset_id: event.target.value }))} placeholder="UUID or partial" /></label>
          <label><span>entity_type</span><select value={filters.entity_type} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilters((current) => ({ ...current, entity_type: event.target.value }))}><option value="">All</option>{['asset','geometry','shell_course','material','ndt','evidence','formula','approval'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>status</span><select value={filters.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All</option>{['passed','warning','blocked','failed'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>severity</span><select value={filters.severity} onChange={(event: ChangeEvent<HTMLSelectElement>) => setFilters((current) => ({ ...current, severity: event.target.value }))}><option value="">All</option>{['info','warning','blocking'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>date from</span><input type="date" value={filters.date_from} onChange={(event: ChangeEvent<HTMLInputElement>) => setFilters((current) => ({ ...current, date_from: event.target.value }))} /></label>
          <label><span>date to</span><input type="date" value={filters.date_to} onChange={(event: ChangeEvent<HTMLInputElement>) => setFilters((current) => ({ ...current, date_to: event.target.value }))} /></label>
        </div>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Validation runs</h2><p>{filteredRuns.length} run(s) shown. This table is read-only.</p></div>
        {filteredRuns.length === 0 ? <StatusPanel type="empty" title="No validation runs match" message="Adjust the filters or run validation from an asset validation page." /> : <div className="table-wrap"><table><thead><tr><th>Run ID</th><th>Run code</th><th>Asset</th><th>Entity groups</th><th>Status</th><th>Severity counts</th><th>Message</th><th>Checked at</th><th>Source</th><th>Action</th></tr></thead><tbody>{filteredRuns.map((run) => <tr key={run.validation_run_id}><td>{run.validation_run_id}</td><td>{run.run_code ?? '-'}</td><td>{run.asset_id ? <Link href={`/assets/${run.asset_id}/validation`}>{run.asset_id}</Link> : '-'}</td><td>{(run.affected_entity_types ?? []).join(', ') || '-'}</td><td><span className={badgeClass(statusFromRun(run))}>{statusFromRun(run)}</span></td><td>{run.blocking_count ?? 0} blocking / {run.warning_count ?? 0} warning / {run.info_count ?? 0} info</td><td>{run.latest_message ?? '-'}</td><td>{dateValue(run.checked_at ?? run.created_at)}</td><td>{run.source ?? '-'}</td><td><button type="button" onClick={() => void openRun(run.validation_run_id)}>Details</button></td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Run detail</h2><p>Expandable detail exposes field-level validation messages without editing historical records.</p></div>
        {detailLoading ? <p>Loading run detail...</p> : !selectedRun ? <p>Select a validation run to view field-level details.</p> : <><p><strong>Run:</strong> {selectedRun.run_code ?? selectedRun.validation_run_id}</p><p><strong>Status:</strong> <span className={badgeClass(statusFromRun(selectedRun))}>{statusFromRun(selectedRun)}</span></p>{(selectedRun.issues ?? []).length === 0 ? <p>{selectedRun.latest_message ?? 'No field-level issues were returned for this run.'}</p> : <div className="table-wrap"><table><thead><tr><th>Group</th><th>Field</th><th>Label</th><th>Severity</th><th>Message</th><th>Suggested fix</th></tr></thead><tbody>{(selectedRun.issues ?? []).map((issue, index) => <tr key={`${issue.field_name}-${index}`}><td>{issue.group ?? '-'}</td><td>{issue.field_name ?? '-'}</td><td>{issue.label ?? '-'}</td><td><span className={badgeClass(issue.severity)}>{issue.severity ?? '-'}</span></td><td>{issue.message ?? '-'}</td><td>{issue.suggested_fix ?? '-'}</td></tr>)}</tbody></table></div>}</>}
      </section>
    </main>
  );
}
