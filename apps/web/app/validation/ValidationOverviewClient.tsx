'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ValidationIssue = { field?: string; message?: string; severity?: string; group?: string; field_name?: string; label?: string; suggested_fix?: string; engineering_note?: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null; facility?: string | null; location?: string | null };
type DictionaryField = { field_id?: string; group_name: string; field_name: string; label: string; unit?: string | null; data_type: string; required_status?: string; validation_severity?: string; engineering_note?: string };
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
  checked_at?: string | null;
  created_at?: string | null;
  latest_message?: string | null;
};

type StatusName = 'passed' | 'warning' | 'failed' | 'blocked' | 'not_checked';

const suggestedCategories = [
  'Asset required fields', 'Asset geometry', 'Shell course completeness', 'Material master completeness', 'Evidence metadata completeness',
  'Evidence linkage', 'NDT required fields', 'NDT unit normalization', 'NDT evidence linkage', 'Calculation input completeness',
  'Formula version approval dependency', 'Report issue gate readiness', 'Review gate completeness'
];

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}
function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'blocking', 'failed', 'fail', 'invalid', 'error'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'warn', 'needs_review', 'not_checked', 'pending'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function normalizeStatus(run: ValidationRun | undefined): StatusName {
  if (!run) return 'not_checked';
  const status = String(run.status ?? '').toLowerCase();
  if (status.includes('block')) return 'blocked';
  if (status.includes('fail')) return 'failed';
  if (status.includes('warn')) return 'warning';
  if ((run.blocking_count ?? 0) > 0) return 'blocked';
  if ((run.warning_count ?? 0) > 0) return 'warning';
  return 'passed';
}
function dateValue(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function categoryLookupKey(category: string): string { return category.toLowerCase().split(' ')[0] ?? category.toLowerCase(); }
function payloadIssues(payload: ApiErrorPayload, fallback: string): ValidationIssue[] {
  return Array.isArray(payload.error?.details) ? payload.error.details : [{ field: payload.error?.code ?? 'request', message: payload.error?.message ?? fallback, severity: 'error' }];
}

export default function ValidationOverviewClient() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [dictionary, setDictionary] = useState<DictionaryField[]>([]);
  const [history, setHistory] = useState<ValidationRun[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [running, setRunning] = useState(false);

  const dictionaryByGroup = useMemo(() => dictionary.reduce<Record<string, DictionaryField[]>>((acc, field) => {
    acc[field.group_name] = [...(acc[field.group_name] ?? []), field];
    return acc;
  }, {}), [dictionary]);

  const counts = useMemo<Record<StatusName, number>>(() => {
    const base: Record<StatusName, number> = { passed: 0, warning: 0, failed: 0, blocked: 0, not_checked: assets.length };
    const latestByAsset = new Map<string, ValidationRun>();
    for (const run of history) {
      if (run.asset_id && !latestByAsset.has(run.asset_id)) latestByAsset.set(run.asset_id, run);
    }
    for (const run of history.filter((item) => !item.asset_id)) base[normalizeStatus(run)] += 1;
    for (const asset of assets) {
      const latest = latestByAsset.get(asset.asset_id);
      if (latest) {
        base.not_checked = Math.max(0, base.not_checked - 1);
        base[normalizeStatus(latest)] += 1;
      }
    }
    return base;
  }, [assets, history]);

  const affectedCounts = useMemo(() => {
    return history.reduce<Record<string, number>>((acc, run) => {
      for (const entity of run.affected_entity_types ?? []) acc[entity] = (acc[entity] ?? 0) + 1;
      return acc;
    }, {});
  }, [history]);

  async function loadPageData() {
    setLoading(true); setPageError(null); setPermissionDenied(false); setIssues([]);
    try {
      const [assetsResponse, dictionaryResponse, historyResponse] = await Promise.all([
        apiFetch('/api/v1/assets', { cache: 'no-store' }),
        apiFetch('/api/v1/engineering/data-dictionary', { cache: 'no-store' }),
        apiFetch('/api/v1/engineering/validation-history?limit=50', { cache: 'no-store' })
      ]);
      const assetsPayload = await assetsResponse.json() as { data?: AssetOption[] } & ApiErrorPayload;
      const dictionaryPayload = await dictionaryResponse.json() as { data?: DictionaryField[] } & ApiErrorPayload;
      const historyPayload = await historyResponse.json() as { data?: ValidationRun[] } & ApiErrorPayload;
      if ([assetsResponse.status, dictionaryResponse.status, historyResponse.status].some((status) => status === 401 || status === 403)) {
        setPermissionDenied(true); return;
      }
      if (!assetsResponse.ok) throw new Error(assetsPayload.error?.message ?? 'Asset list could not be loaded.');
      if (!dictionaryResponse.ok) throw new Error(dictionaryPayload.error?.message ?? 'Validation rule dictionary could not be loaded.');
      if (!historyResponse.ok) throw new Error(historyPayload.error?.message ?? 'Validation history could not be loaded.');
      setAssets(assetsPayload.data ?? []); setDictionary(dictionaryPayload.data ?? []); setHistory(historyPayload.data ?? []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Validation dashboard could not be loaded.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadPageData(); }, []);

  async function runAssetValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setIssues([]);
    if (!selectedAssetId) { setIssues([{ field: 'asset_id', message: 'Select an asset before running validation.', severity: 'error' }]); return; }
    setRunning(true);
    try {
      const response = await apiFetch('/api/v1/engineering/validate-input', {
        method: 'POST',
        body: JSON.stringify({ asset_id: selectedAssetId, validation_scope: 'calculation_readiness', target_action: 'asset_validation_refresh', source: 'manual' })
      });
      const payload = await response.json() as { data?: { validation_run_id?: string; blocking_count?: number; warning_count?: number; info_count?: number } } & ApiErrorPayload;
      if (!response.ok) { setIssues(payloadIssues(payload, 'Validation run failed.')); setMessage(payload.error?.message ?? 'Validation run failed.'); return; }
      setMessage(`Validation run ${payload.data?.validation_run_id ?? ''} completed: ${payload.data?.blocking_count ?? 0} blocking, ${payload.data?.warning_count ?? 0} warning, ${payload.data?.info_count ?? 0} info.`);
      await loadPageData();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Validation run failed.'); }
    finally { setRunning(false); }
  }

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading validation dashboard" message="Loading validation rules, asset list, and latest validation history." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="Your role does not have validation.read or validation.run access." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Validation dashboard unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-E Validation Control Layer</p>
          <h1>Validation by Asset</h1>
          <p>Validation flags, warns, blocks, and routes issues to review. It is not engineering approval and does not execute engineering calculations.</p>
        </div>
        <div className="action-row"><Link className="secondary-button" href="/validation/history">History</Link><Link className="secondary-button" href="/data-dictionary">Data Dictionary</Link><Link className="secondary-button" href="/assets">Assets</Link></div>
      </header>

      <section className="cards compact-cards">
        {Object.entries(counts).map(([status, count]) => <article key={status}><h2>{count}</h2><p><span className={badgeClass(status)}>{status.replace('_', ' ')}</span></p></article>)}
      </section>

      <section className="grid-two">
        <form className="panel" onSubmit={runAssetValidation}>
          <div className="panel-heading"><h2>Run asset validation</h2><p>Uses the existing deterministic backend validation engine and stores a validation snapshot.</p></div>
          <label><span>Asset</span><select value={selectedAssetId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedAssetId(event.target.value)}><option value="">Select asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} — {asset.asset_name ?? 'Unnamed asset'}</option>)}</select></label>
          <button className="primary-button" type="submit" disabled={running}>{running ? 'Running validation...' : 'Run / refresh validation'}</button>
          {selectedAssetId && <Link className="secondary-button" href={`/assets/${selectedAssetId}/validation`}>Open selected asset validation</Link>}
          {message && <div className="notice">{message}</div>}
          {issues.length > 0 && <div className="error-list" role="alert">{issues.map((issue, index) => <p key={`${issue.field}-${index}`}><strong>{issue.field ?? 'request'}</strong>: {issue.message}</p>)}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading"><h2>Affected domains</h2><p>Counts are grouped from stored validation run issue groups.</p></div>
          {Object.keys(affectedCounts).length === 0 ? <p>No affected entities in recent validation history.</p> : <div className="cards compact-cards">{Object.entries(affectedCounts).map(([entity, count]) => <article key={entity}><h2>{count}</h2><p>{entity.replaceAll('_', ' ')}</p></article>)}</div>}
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Validation categories</h2><p>Rule categories are traceability/readiness controls only. No pass/fail thickness thresholds are invented here.</p></div>
        <div className="cards compact-cards">{suggestedCategories.map((category) => <article key={category}><h2>{category}</h2><p>{dictionaryByGroup[categoryLookupKey(category)]?.length ?? 0} registered field references where available.</p></article>)}</div>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Latest validation runs</h2><p>Read-only validation snapshots from the backend.</p></div>
        {history.length === 0 ? <StatusPanel type="empty" title="No validation history" message="Run asset validation to create the first validation snapshot." /> : <div className="table-wrap"><table><thead><tr><th>Run</th><th>Asset</th><th>Status</th><th>Blocking</th><th>Warning</th><th>Info</th><th>Source</th><th>Checked</th><th>Links</th></tr></thead><tbody>{history.slice(0, 10).map((run) => <tr key={run.validation_run_id}><td>{run.run_code ?? run.validation_run_id}</td><td>{run.asset_id ?? '-'}</td><td><span className={badgeClass(normalizeStatus(run))}>{normalizeStatus(run).replace('_', ' ')}</span></td><td>{run.blocking_count ?? 0}</td><td>{run.warning_count ?? 0}</td><td>{run.info_count ?? 0}</td><td>{run.source ?? '-'}</td><td>{dateValue(run.checked_at ?? run.created_at)}</td><td className="action-row">{run.asset_id && <Link href={`/assets/${run.asset_id}/validation`}>Asset validation</Link>}<Link href="/validation/history">History</Link></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}
