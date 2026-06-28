'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

type ValidationIssue = { group?: string; field_name?: string; label?: string; severity?: string; message?: string; suggested_fix?: string; engineering_note?: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type AssetSummary = { asset_id: string; tank_tag?: string | null; asset_name?: string | null; facility?: string | null; location?: string | null; service_fluid?: string | null; operating_status?: string | null };
type ValidationRun = {
  validation_run_id: string;
  run_code?: string | null;
  validation_scope?: string | null;
  status?: string | null;
  blocking_count?: number | null;
  warning_count?: number | null;
  info_count?: number | null;
  checked_at?: string | null;
  created_at?: string | null;
  issues?: ValidationIssue[];
  grouped?: Record<string, ValidationIssue[]>;
  latest_message?: string | null;
};
type AssetValidationPayload = { asset?: AssetSummary | null; latest_validation_run?: ValidationRun | null; history?: ValidationRun[] };

type AssetValidationProps = { assetId: string };

const groupLabels: Record<string, string> = {
  asset: 'Asset identity and tank metadata',
  geometry: 'Geometry',
  shell_course: 'Shell courses',
  material: 'Material master completeness',
  evidence: 'Evidence linkage',
  ndt: 'NDT measurements',
  formula: 'Calculation readiness',
  approval: 'Review/report gates'
};

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}
function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'blocking', 'failed', 'fail', 'invalid', 'error'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'warn', 'needs_review', 'pending'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function dateValue(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function statusFromRun(run: ValidationRun | null | undefined): string {
  if (!run) return 'not_checked';
  if ((run.blocking_count ?? 0) > 0) return 'blocked';
  if ((run.warning_count ?? 0) > 0) return 'warning';
  return run.status ?? 'passed';
}
function issueKey(issue: ValidationIssue, index: number): string { return `${issue.group}-${issue.field_name}-${issue.message}-${index}`; }
function unitRelated(issue: ValidationIssue): boolean {
  const text = `${issue.field_name ?? ''} ${issue.message ?? ''} ${issue.suggested_fix ?? ''}`.toLowerCase();
  return ['unit', 'normalized', 'diameter', 'height', 'thickness', 'mm', 'meter'].some((token) => text.includes(token));
}

export default function AssetValidationClient({ assetId }: AssetValidationProps) {
  const [asset, setAsset] = useState<AssetSummary | null>(null);
  const [latestRun, setLatestRun] = useState<ValidationRun | null>(null);
  const [history, setHistory] = useState<ValidationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const groupedIssues = useMemo(() => {
    const grouped = latestRun?.grouped;
    if (grouped && Object.keys(grouped).length > 0) return grouped;
    return (latestRun?.issues ?? []).reduce<Record<string, ValidationIssue[]>>((acc, issue) => {
      const group = issue.group ?? 'general';
      acc[group] = [...(acc[group] ?? []), issue];
      return acc;
    }, {});
  }, [latestRun]);

  const unitIssues = useMemo(() => (latestRun?.issues ?? []).filter(unitRelated), [latestRun]);
  const materialIssues = useMemo(() => (groupedIssues.material ?? []).filter((issue) => issue.severity === 'blocking' || issue.severity === 'warning'), [groupedIssues]);

  async function loadValidation() {
    setLoading(true); setNotFound(false); setPermissionDenied(false); setPageError(null);
    try {
      const response = await apiFetch(`/api/v1/assets/${assetId}/validation`, { cache: 'no-store' });
      const payload = await response.json() as { data?: AssetValidationPayload } & ApiErrorPayload;
      if (response.status === 401 || response.status === 403) { setPermissionDenied(true); return; }
      if (response.status === 404) { setNotFound(true); return; }
      if (!response.ok) throw new Error(payload.error?.message ?? 'Asset validation could not be loaded.');
      setAsset(payload.data?.asset ?? null); setLatestRun(payload.data?.latest_validation_run ?? null); setHistory(payload.data?.history ?? []);
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Asset validation could not be loaded.'); }
    finally { setLoading(false); }
  }

  async function runValidation() {
    setRunning(true); setMessage(null);
    try {
      const response = await apiFetch('/api/v1/engineering/validate-input', {
        method: 'POST',
        body: JSON.stringify({ asset_id: assetId, validation_scope: 'calculation_readiness', target_action: 'asset_validation_refresh', source: 'manual' })
      });
      const payload = await response.json() as { data?: { validation_run_id?: string; blocking_count?: number; warning_count?: number; info_count?: number } } & ApiErrorPayload;
      if (!response.ok) { setMessage(payload.error?.message ?? 'Validation run failed.'); return; }
      setMessage(`Validation run ${payload.data?.validation_run_id ?? ''} completed: ${payload.data?.blocking_count ?? 0} blocking, ${payload.data?.warning_count ?? 0} warning, ${payload.data?.info_count ?? 0} info.`);
      await loadValidation();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Validation run failed.'); }
    finally { setRunning(false); }
  }

  useEffect(() => { void loadValidation(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [assetId]);

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading asset validation" message="Loading latest validation run and validation history for this asset." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="Your role does not have asset validation visibility." /></main>;
  if (notFound) return <main className="app-shell"><StatusPanel type="empty" title="Asset not found" message="The asset could not be found or has been deleted." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Asset validation unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <header className="page-header"><div><p className="eyebrow">RC4-E Asset Validation</p><h1>{asset?.tank_tag ?? assetId} validation</h1><p>{asset?.asset_name ?? 'Asset-specific validation readiness'} — validation is a control layer and does not approve engineering data.</p></div><div className="action-row"><Link className="secondary-button" href={`/assets/${assetId}`}>Asset detail</Link><Link className="secondary-button" href={`/assets/${assetId}/ndt`}>NDT</Link><Link className="secondary-button" href={`/evidence?asset_id=${assetId}`}>Evidence</Link><Link className="secondary-button" href="/validation/history">History</Link></div></header>

      <section className="grid-two">
        <section className="panel"><div className="panel-heading"><h2>Asset context</h2><p>Validation context is loaded from existing AIM asset, geometry, shell-course, NDT, and evidence tables.</p></div><p><strong>Asset ID:</strong> {assetId}</p><p><strong>Facility:</strong> {asset?.facility ?? '-'}</p><p><strong>Location:</strong> {asset?.location ?? '-'}</p><p><strong>Service fluid:</strong> {asset?.service_fluid ?? '-'}</p><p><strong>Operating status:</strong> {asset?.operating_status ?? '-'}</p><button className="primary-button" type="button" onClick={() => void runValidation()} disabled={running}>{running ? 'Running validation...' : 'Run / refresh validation'}</button>{message && <div className="notice">{message}</div>}</section>
        <section className="panel"><div className="panel-heading"><h2>Latest result</h2><p>Stored backend validation snapshot for this asset.</p></div>{!latestRun ? <StatusPanel type="empty" title="No validation run" message="Run validation to create an asset-specific validation snapshot." /> : <><p><strong>Status:</strong> <span className={badgeClass(statusFromRun(latestRun))}>{statusFromRun(latestRun)}</span></p><p><strong>Run:</strong> {latestRun.run_code ?? latestRun.validation_run_id}</p><p><strong>Checked:</strong> {dateValue(latestRun.checked_at ?? latestRun.created_at)}</p><p><strong>Counts:</strong> {latestRun.blocking_count ?? 0} blocking / {latestRun.warning_count ?? 0} warning / {latestRun.info_count ?? 0} info</p></>}</section>
      </section>

      <section className="panel wide-panel"><div className="panel-heading"><h2>Grouped validation checks</h2><p>Field-level messages are grouped by validation domain. Backend validation remains authoritative.</p></div>{!latestRun ? <p>No grouped validation checks yet.</p> : Object.entries(groupLabels).map(([group, title]) => { const issues = groupedIssues[group] ?? []; return <section className="validation-group" key={group}><div className="row-between"><h3>{title}</h3><span className={badgeClass(issues.some((issue) => issue.severity === 'blocking') ? 'blocking' : issues.some((issue) => issue.severity === 'warning') ? 'warning' : 'passed')}>{issues.length === 0 ? 'passed / no issues' : `${issues.length} issue(s)`}</span></div>{issues.length === 0 ? <p>No issues returned for this group.</p> : <div className="table-wrap"><table><thead><tr><th>Field</th><th>Label</th><th>Severity</th><th>Message</th><th>Suggested fix</th><th>Governance note</th></tr></thead><tbody>{issues.map((issue, index) => <tr key={issueKey(issue, index)}><td>{issue.field_name ?? '-'}</td><td>{issue.label ?? '-'}</td><td><span className={badgeClass(issue.severity)}>{issue.severity ?? '-'}</span></td><td>{issue.message ?? '-'}</td><td>{issue.suggested_fix ?? '-'}</td><td>{issue.engineering_note ?? '-'}</td></tr>)}</tbody></table></div>}</section>; })}</section>

      <section className="grid-two">
        <section className="panel"><div className="panel-heading"><h2>Unit validation readability</h2><p>Unit warnings/errors are displayed from backend validation output only.</p></div>{unitIssues.length === 0 ? <p>No unit-related warnings or errors returned.</p> : unitIssues.map((issue, index) => <article key={issueKey(issue, index)}><div className="row-between"><strong>{issue.label ?? issue.field_name}</strong><span className={badgeClass(issue.severity)}>{issue.severity}</span></div><p>{issue.message}</p><p><strong>Suggested fix:</strong> {issue.suggested_fix ?? '-'}</p></article>)}</section>
        <section className="panel"><div className="panel-heading"><h2>Material completeness visibility</h2><p>Shows material master and shell-course linkage completeness issues where data is available.</p></div>{materialIssues.length === 0 ? <p>No material completeness warnings or blockers returned.</p> : materialIssues.map((issue, index) => <article key={issueKey(issue, index)}><div className="row-between"><strong>{issue.label ?? issue.field_name}</strong><span className={badgeClass(issue.severity)}>{issue.severity}</span></div><p>{issue.message}</p><p><strong>Suggested fix:</strong> {issue.suggested_fix ?? '-'}</p></article>)}</section>
      </section>

      <section className="panel wide-panel"><div className="panel-heading"><h2>Related links</h2><p>Safe navigation to related AIM records. No signed URLs, object keys, or evidence contents are exposed here.</p></div><div className="action-row"><Link href={`/assets/${assetId}`}>Asset</Link><Link href={`/evidence?asset_id=${assetId}`}>Evidence</Link><Link href={`/assets/${assetId}/ndt`}>NDT measurements</Link><Link href={`/calculations?asset_id=${assetId}`}>Calculations</Link><Link href={`/reports?asset_id=${assetId}`}>Reports</Link><Link href={`/audit-logs?entity_type=validation_run&asset_id=${assetId}`}>Audit logs</Link></div></section>

      <section className="panel wide-panel"><div className="panel-heading"><h2>Validation history for asset</h2><p>Read-only validation snapshots for this asset.</p></div>{history.length === 0 ? <p>No stored validation history for this asset.</p> : <div className="table-wrap"><table><thead><tr><th>Run</th><th>Status</th><th>Blocking</th><th>Warning</th><th>Info</th><th>Checked</th></tr></thead><tbody>{history.map((run) => <tr key={run.validation_run_id}><td>{run.run_code ?? run.validation_run_id}</td><td><span className={badgeClass(statusFromRun(run))}>{statusFromRun(run)}</span></td><td>{run.blocking_count ?? 0}</td><td>{run.warning_count ?? 0}</td><td>{run.info_count ?? 0}</td><td>{dateValue(run.checked_at ?? run.created_at)}</td></tr>)}</tbody></table></div>}</section>
    </main>
  );
}
