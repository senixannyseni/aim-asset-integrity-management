'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type CalculationRunDetail = {
  calculation_run_id: string;
  run_id?: string | null;
  asset_id?: string | null;
  inspection_event_id?: string | null;
  formula_version_id?: string | null;
  formula_registry_id?: string | null;
  formula_set_version?: string | null;
  formula_version_snapshot?: Record<string, unknown> | null;
  input_snapshot_hash?: string | null;
  output_snapshot_hash?: string | null;
  input_snapshot_json?: Record<string, unknown> | null;
  output_snapshot?: Record<string, unknown> | null;
  output_snapshot_json?: Record<string, unknown> | null;
  output_summary?: Record<string, unknown> | null;
  validation_status?: string | null;
  run_status?: string | null;
  status?: string | null;
  review_status?: string | null;
  final_use_status?: string | null;
  final_use_disclaimer?: string | null;
  final_use_blockers?: unknown;
  warnings_json?: unknown;
  created_by?: string | null;
  created_at?: string | null;
  inputs?: Array<Record<string, unknown>>;
  outputs?: Array<Record<string, unknown>>;
  engineering_reviews?: Array<Record<string, unknown>>;
  approval_records?: Array<Record<string, unknown>>;
  audit_trail?: Array<Record<string, unknown>>;
};

type CalculationRunSummary = {
  calculation_run_id: string;
  run_id?: string | null;
  asset_id?: string | null;
  formula_set_version?: string | null;
  formula_version_id?: string | null;
  output_summary?: Record<string, unknown> | null;
  output_snapshot?: Record<string, unknown> | null;
  validation_status?: string | null;
  run_status?: string | null;
  created_at?: string | null;
};

type DifferenceRow = { field: string; current: string; previous: string };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function asArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function renderJson(value: unknown): string { try { return JSON.stringify(value, null, 2); } catch { return String(value); } }
function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function badgeClass(status?: string | null): string {
  const value = String(status ?? '').toLowerCase();
  if (['blocked', 'failed', 'rejected', 'retired', 'draft'].some((token) => value.includes(token))) return 'badge badge-danger';
  if (['warning', 'pending', 'review', 'requires'].some((token) => value.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function valueAsText(value: unknown): string { return typeof value === 'string' ? value : renderJson(value); }
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (!isRecord(value)) return prefix ? { [prefix]: valueAsText(value) } : {};
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (isRecord(child)) return { ...acc, ...flatten(child, next) };
    if (Array.isArray(child)) return { ...acc, [next]: renderJson(child) };
    acc[next] = valueAsText(child);
    return acc;
  }, {});
}
function diffObjects(current: unknown, previous: unknown): DifferenceRow[] {
  const left = flatten(current);
  const right = flatten(previous);
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
    .sort()
    .filter((key) => left[key] !== right[key])
    .slice(0, 40)
    .map((key) => ({ field: key, current: left[key] ?? '-', previous: right[key] ?? '-' }));
}
function asRecordFrom(value: unknown): Record<string, unknown> | null { return isRecord(value) ? value : null; }
function formulaValue(snapshot: Record<string, unknown> | null | undefined, key: string): string { const value = snapshot?.[key]; return value === undefined || value === null ? '-' : String(value); }

export default function CalculationDetailClient({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<CalculationRunDetail | null>(null);
  const [runs, setRuns] = useState<CalculationRunSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      setMessage(null);
      const response = await apiFetch(`/api/v1/engineering/calculations/${runId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        setPermissionDenied(true);
        return;
      }
      if (!response.ok) {
        setMessage(payload?.error?.message ?? 'Failed to load calculation detail.');
        return;
      }
      const data = payload.data as CalculationRunDetail;
      setDetail(data);
      if (data.asset_id) {
        const runResponse = await apiFetch(`/api/v1/engineering/calculations?asset_id=${encodeURIComponent(data.asset_id)}`, { cache: 'no-store' });
        const runPayload = await runResponse.json();
        if (runResponse.ok) setRuns(asArray<CalculationRunSummary>(runPayload.data));
      }
    }
    void loadDetail();
  }, [runId]);

  const formulaSnapshot = asRecordFrom(detail?.formula_version_snapshot);
  const outputSnapshot = detail?.output_snapshot_json ?? detail?.output_snapshot ?? null;
  const previousRun = useMemo(() => {
    if (!detail) return undefined;
    return runs
      .filter((run) => run.calculation_run_id !== detail.calculation_run_id)
      .filter((run) => !detail.formula_set_version || run.formula_set_version === detail.formula_set_version || run.asset_id === detail.asset_id)
      .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0];
  }, [detail, runs]);
  const outputDiff = useMemo(() => previousRun ? diffObjects(outputSnapshot, previousRun.output_snapshot ?? previousRun.output_summary ?? {}) : [], [outputSnapshot, previousRun]);
  const formulaDiff = useMemo(() => previousRun ? diffObjects(detail?.formula_version_snapshot, { formula_version_id: previousRun.formula_version_id, formula_set_version: previousRun.formula_set_version }) : [], [detail?.formula_version_snapshot, previousRun]);

  if (permissionDenied) return <main className="app-shell"><section className="error-list"><h2>Permission denied</h2><p>You do not have permission to read calculation detail.</p></section></main>;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-G Calculation Detail</p>
          <h1>Calculation Detail and Comparison</h1>
          <p>Traceable calculation metadata, formula version snapshot, input/output snapshots, warnings, blockers, and audit link. Results require engineering review before final use.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          {detail?.asset_id && <Link className="secondary-button" href={`/assets/${detail.asset_id}`}>Asset</Link>}
          {detail?.asset_id && <Link className="secondary-button" href={`/assets/${detail.asset_id}/calculations`}>Asset Calculations</Link>}
          <Link className="secondary-button" href={`/audit-logs?entity_type=calculation_run&entity_id=${encodeURIComponent(runId)}`}>Audit Logs</Link>
        </div>
      </header>

      {message && <section className="error-list"><h2>Calculation detail unavailable</h2><p>{message}</p></section>}
      {!detail && !message ? <section className="notice"><h2>Loading calculation audit trail</h2><p>Loading formula, inputs, outputs, warnings, blockers, reviews, and audit events.</p></section> : null}
      {detail && <>
        <section className="grid-two">
          <section className="panel">
            <div className="panel-heading"><h2>Calculation metadata</h2><p>Calculation output is deterministic and versioned, but not final-use approved.</p></div>
            <dl className="metadata-grid">
              <dt>Run ID</dt><dd>{detail.run_id ?? detail.calculation_run_id}</dd>
              <dt>Status</dt><dd><span className={badgeClass(detail.run_status ?? detail.status)}>{detail.run_status ?? detail.status ?? '-'}</span></dd>
              <dt>Validation</dt><dd><span className={badgeClass(detail.validation_status)}>{detail.validation_status ?? '-'}</span></dd>
              <dt>Final use</dt><dd><span className={badgeClass(detail.final_use_status)}>{detail.final_use_status ?? 'requires_engineering_review'}</span></dd>
              <dt>Review</dt><dd>{detail.review_status ?? 'not_reviewed'}</dd>
              <dt>Asset</dt><dd>{detail.asset_id ? <Link href={`/assets/${detail.asset_id}`}>{detail.asset_id}</Link> : '-'}</dd>
              <dt>Inspection</dt><dd>{detail.inspection_event_id ?? '-'}</dd>
              <dt>Created</dt><dd>{safeDate(detail.created_at)}</dd>
              <dt>Created by</dt><dd>{detail.created_by ?? '-'}</dd>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-heading"><h2>Formula version snapshot</h2><p>Snapshot is persisted with the run and tied to approved executable formula_versions.</p></div>
            <dl className="metadata-grid">
              <dt>Formula version ID</dt><dd>{detail.formula_version_id ?? formulaValue(formulaSnapshot, 'formula_version_id')}</dd>
              <dt>Formula code</dt><dd>{formulaValue(formulaSnapshot, 'formula_code')}</dd>
              <dt>Version</dt><dd>{formulaValue(formulaSnapshot, 'version')}</dd>
              <dt>Status</dt><dd><span className={badgeClass(formulaValue(formulaSnapshot, 'formula_status'))}>{formulaValue(formulaSnapshot, 'formula_status')}</span></dd>
              <dt>Approved by</dt><dd>{formulaValue(formulaSnapshot, 'approved_by')}</dd>
              <dt>Approved at</dt><dd>{safeDate(formulaValue(formulaSnapshot, 'approved_at'))}</dd>
              <dt>Formula Registry</dt><dd>{detail.formula_registry_id ?? formulaValue(formulaSnapshot, 'formula_registry_id')}</dd>
            </dl>
          </section>
        </section>

        <section className="grid-two">
          <section className="panel"><h2>Input snapshot</h2><p>Immutable input trace for deterministic repeatability.</p><pre className="json-panel">{renderJson(detail.input_snapshot_json ?? detail.inputs ?? {})}</pre></section>
          <section className="panel"><h2>Output snapshot</h2><p>Output is display-only until engineering review.</p><pre className="json-panel">{renderJson(outputSnapshot ?? detail.outputs ?? {})}</pre></section>
        </section>

        <section className="grid-two">
          <section className="panel"><h2>Warnings and blockers</h2><pre className="json-panel">{renderJson({ warnings: detail.warnings_json, blockers: detail.final_use_blockers, final_use_disclaimer: detail.final_use_disclaimer })}</pre></section>
          <section className="panel"><h2>Evidence and NDT linkage</h2><div className="table-wrap"><table><thead><tr><th>Input</th><th>Source</th><th>Evidence</th><th>Status</th></tr></thead><tbody>{(detail.inputs ?? []).map((input, index) => <tr key={`${String(input.input_name ?? 'input')}-${index}`}><td>{String(input.input_name ?? '-')}</td><td>{input.source_entity_id ? <Link href={`/ndt/${String(input.source_entity_id)}`}>{String(input.source_entity_id)}</Link> : '-'}</td><td>{input.evidence_file_id ? <Link href={`/evidence/${String(input.evidence_file_id)}`}>{String(input.evidence_file_id)}</Link> : <span className="badge badge-warning">Missing</span>}</td><td><span className={badgeClass(String(input.validation_status ?? 'not_validated'))}>{String(input.validation_status ?? 'not_validated')}</span></td></tr>)}{(detail.inputs ?? []).length === 0 && <tr><td colSpan={4}>No input linkage rows returned.</td></tr>}</tbody></table></div></section>
        </section>

        <section className="panel wide-panel">
          <div className="panel-heading"><h2>Comparison to previous calculation</h2><p>Differences are displayed only; AIM does not infer engineering acceptability or create FFS/RBI recommendations here.</p></div>
          {!previousRun ? <p>No previous calculation run available for comparison.</p> : <>
            <p><strong>Previous run:</strong> <Link href={`/calculations/${previousRun.calculation_run_id}`}>{previousRun.run_id ?? previousRun.calculation_run_id}</Link> · {safeDate(previousRun.created_at)}</p>
            <h3>Formula/input metadata differences</h3>
            <div className="table-wrap"><table><thead><tr><th>Field</th><th>Current</th><th>Previous</th></tr></thead><tbody>{formulaDiff.map((row) => <tr key={row.field}><td>{row.field}</td><td>{row.current}</td><td>{row.previous}</td></tr>)}{formulaDiff.length === 0 && <tr><td colSpan={3}>No formula metadata differences found from available previous-run summary.</td></tr>}</tbody></table></div>
            <h3>Output differences</h3>
            <div className="table-wrap"><table><thead><tr><th>Field</th><th>Current</th><th>Previous</th></tr></thead><tbody>{outputDiff.map((row) => <tr key={row.field}><td>{row.field}</td><td>{row.current}</td><td>{row.previous}</td></tr>)}{outputDiff.length === 0 && <tr><td colSpan={3}>No output differences found from available previous-run summary.</td></tr>}</tbody></table></div>
          </>}
        </section>

        <section className="panel wide-panel"><h2>Reviews, approvals, and audit trail</h2><div className="grid-two"><article><h2>{detail.engineering_reviews?.length ?? 0}</h2><p>Engineering reviews</p></article><article><h2>{detail.approval_records?.length ?? 0}</h2><p>Approval records</p></article><article><h2>{detail.audit_trail?.length ?? 0}</h2><p>Audit events</p></article></div><pre className="json-panel">{renderJson({ engineering_reviews: detail.engineering_reviews, approval_records: detail.approval_records, audit_trail: detail.audit_trail })}</pre></section>
      </>}
    </main>
  );
}
