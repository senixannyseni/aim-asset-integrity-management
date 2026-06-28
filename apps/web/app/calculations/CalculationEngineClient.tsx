'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null; facility?: string | null; location?: string | null };
type FormulaVersionOption = {
  formula_version_id: string;
  formula_registry_id?: string | null;
  formula_code: string;
  formula_name?: string | null;
  version: string;
  formula_status?: string | null;
  deterministic_flag?: boolean | null;
  sync_status?: string | null;
  registry_status?: string | null;
  registry_formula_type?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  code_basis?: string | null;
  code_edition?: string | null;
};
type EvidenceOption = { evidence_id: string; evidence_code?: string | null; file_name?: string | null; asset_id?: string | null; upload_status?: string | null; malware_scan_status?: string | null; checksum_sha256?: string | null };
type NdtOption = {
  measurement_id: string;
  asset_id?: string | null;
  inspection_event_id?: string | null;
  component?: string | null;
  shell_course_no?: number | string | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  measured_thickness?: number | string | null;
  measured_thickness_mm?: number | string | null;
  measured_thickness_unit?: string | null;
  reading_date?: string | null;
  method?: string | null;
  evidence_file_id?: string | null;
  validation_status?: string | null;
  reviewer_status?: string | null;
};
type CalculationRun = {
  calculation_run_id: string;
  run_id?: string | null;
  asset_id?: string | null;
  formula_version_id?: string | null;
  formula_set_version?: string | null;
  run_status?: string | null;
  status?: string | null;
  validation_status?: string | null;
  final_use_status?: string | null;
  review_status?: string | null;
  created_at?: string | null;
  output_summary?: Record<string, unknown> | null;
  formula_version_snapshot?: Record<string, unknown> | null;
};
type CalculationResponse = CalculationRun & {
  calculation?: {
    validation_status?: string;
    validation_result?: { blocking_count?: number; warning_count?: number; info_count?: number; issues?: Array<Record<string, unknown>> };
    corrosion_rates?: Array<Record<string, unknown>>;
    remaining_life?: Array<Record<string, unknown>>;
    warnings?: Array<Record<string, unknown>>;
    final_use_blockers?: string[];
  };
  formula?: Record<string, unknown>;
  formula_version?: Record<string, unknown>;
  final_use_disclaimer?: string;
};

type CalculationEngineClientProps = { fixedAssetId?: string; assetScoped?: boolean };

type FormState = {
  asset_id: string;
  formula_version_id: string;
  calculation_scope: string;
  inspection_event_id: string;
  evidence_file_id: string;
  selected_ndt_ids: string[];
  retirement_thickness_mm: string;
  high_corrosion_rate_mm_per_year: string;
  low_remaining_life_years: string;
  notes: string;
};

const emptyForm: FormState = {
  asset_id: '',
  formula_version_id: '',
  calculation_scope: 'thickness_screening',
  inspection_event_id: '',
  evidence_file_id: '',
  selected_ndt_ids: [],
  retirement_thickness_mm: '8',
  high_corrosion_rate_mm_per_year: '0.5',
  low_remaining_life_years: '5',
  notes: ''
};

function asArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function renderJson(value: unknown): string { try { return JSON.stringify(value, null, 2); } catch { return String(value); } }
function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function numericValue(value: string): number | undefined { const trimmed = value.trim(); if (!trimmed) return undefined; const parsed = Number(trimmed); return Number.isFinite(parsed) ? parsed : undefined; }
function badgeClass(status?: string | null): string {
  const value = String(status ?? '').toLowerCase();
  if (['blocked', 'failed', 'rejected', 'retired', 'draft', 'not_approved'].some((token) => value.includes(token))) return 'badge badge-danger';
  if (['warning', 'pending', 'review', 'requires'].some((token) => value.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function displayAsset(asset?: AssetOption): string { return asset ? `${asset.tank_tag ?? asset.asset_id} — ${asset.asset_name ?? 'Unnamed tank'}` : '-'; }
function displayFormula(formula?: FormulaVersionOption): string { return formula ? `${formula.formula_code}@${formula.version} — ${formula.formula_name ?? 'Approved executable formula'}` : '-'; }
function displayNdt(row: NdtOption): string { return `${row.component ?? 'component'} / C${row.shell_course_no ?? '-'} / ${row.cml_tml_id ?? row.grid_ref ?? row.measurement_id} / ${row.measured_thickness_mm ?? row.measured_thickness ?? '-'} mm`; }

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}

export default function CalculationEngineClient({ fixedAssetId, assetScoped = false }: CalculationEngineClientProps) {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [formulaVersions, setFormulaVersions] = useState<FormulaVersionOption[]>([]);
  const [evidence, setEvidence] = useState<EvidenceOption[]>([]);
  const [ndtMeasurements, setNdtMeasurements] = useState<NdtOption[]>([]);
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [form, setForm] = useState<FormState>({ ...emptyForm, asset_id: fixedAssetId ?? '' });
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResponse | null>(null);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.asset_id === form.asset_id), [assets, form.asset_id]);
  const selectedFormula = useMemo(() => formulaVersions.find((formula) => formula.formula_version_id === form.formula_version_id), [formulaVersions, form.formula_version_id]);
  const selectedNdt = useMemo(() => ndtMeasurements.filter((row) => form.selected_ndt_ids.includes(row.measurement_id)), [ndtMeasurements, form.selected_ndt_ids]);
  const assetRuns = useMemo(() => runs.filter((run) => !form.asset_id || run.asset_id === form.asset_id), [runs, form.asset_id]);

  const readiness = useMemo(() => {
    const warnings: string[] = [];
    const blockers: string[] = [];
    if (!form.asset_id) blockers.push('asset_id is required.');
    if (!selectedFormula) blockers.push('An approved executable formula_version is required.');
    if (selectedFormula && !['approved', 'locked'].includes(String(selectedFormula.formula_status ?? '').toLowerCase())) blockers.push('Selected formula_version is not approved or locked.');
    if (selectedFormula && selectedFormula.deterministic_flag === false) blockers.push('Selected formula_version is not deterministic.');
    const retirementThickness = numericValue(form.retirement_thickness_mm);
    if (form.retirement_thickness_mm.trim() && retirementThickness === undefined) blockers.push('Retirement thickness must be numeric when provided.');
    if (retirementThickness !== undefined && retirementThickness <= 0) blockers.push('Retirement thickness must be greater than zero.');
    const highRate = numericValue(form.high_corrosion_rate_mm_per_year);
    if (form.high_corrosion_rate_mm_per_year.trim() && highRate === undefined) blockers.push('High corrosion-rate threshold must be numeric when provided.');
    const lowLife = numericValue(form.low_remaining_life_years);
    if (form.low_remaining_life_years.trim() && lowLife === undefined) blockers.push('Low remaining-life threshold must be numeric when provided.');
    if (selectedNdt.length === 0) warnings.push('No NDT rows selected. Backend may load all asset NDT rows, but linked rows make the request easier to review.');
    if (form.evidence_file_id.length === 0) warnings.push('No evidence file selected in the form. Backend evidence linkage remains authoritative.');
    return { blockers, warnings };
  }, [form, selectedFormula, selectedNdt.length]);

  const requestPayload = useMemo(() => {
    const formula = selectedFormula;
    const retirementThickness = numericValue(form.retirement_thickness_mm);
    const highRate = numericValue(form.high_corrosion_rate_mm_per_year);
    const lowLife = numericValue(form.low_remaining_life_years);
    const payload: Record<string, unknown> = {
      asset_id: form.asset_id,
      formula_id: formula?.formula_code ?? '',
      formula_version: formula?.version ?? '',
      formula_version_id: formula?.formula_version_id ?? '',
      calculation_scope: form.calculation_scope,
      inspection_event_id: form.inspection_event_id || undefined,
      calculation_request: {
        thickness_check_requested: true,
        retirement_thickness_mm: retirementThickness,
        selected_evidence_file_id: form.evidence_file_id || undefined,
        selected_ndt_measurement_ids: form.selected_ndt_ids,
        calculation_reason: form.notes || undefined,
        ffs_trigger_evaluation_requested: true,
        rbi_trigger_evaluation_requested: true
      },
      thresholds: {
        high_corrosion_rate_mm_per_year: highRate,
        low_remaining_life_years: lowLife
      },
      ndt_measurements: selectedNdt.map((row) => ({
        ...row,
        source_entity_id: row.measurement_id,
        measured_thickness_unit: row.measured_thickness_unit ?? 'mm',
        is_critical: true
      }))
    };
    return payload;
  }, [form, selectedFormula, selectedNdt]);

  async function loadAll(assetOverride?: string) {
    const targetAssetId = assetOverride ?? fixedAssetId ?? form.asset_id;
    setLoading(true);
    setPermissionDenied(false);
    setPageError(null);
    try {
      const assetPath = fixedAssetId ? `/api/v1/assets/${fixedAssetId}` : '/api/v1/assets';
      const [assetResponse, formulaResponse, evidenceResponse, ndtResponse, runResponse] = await Promise.all([
        apiFetch(assetPath, { cache: 'no-store' }),
        apiFetch('/api/v1/formula-versions/executable', { cache: 'no-store' }),
        apiFetch(`/api/v1/evidence${targetAssetId ? `?asset_id=${encodeURIComponent(targetAssetId)}` : ''}`, { cache: 'no-store' }),
        apiFetch(`/api/v1/ndt/measurements${targetAssetId ? `?asset_id=${encodeURIComponent(targetAssetId)}` : ''}`, { cache: 'no-store' }),
        apiFetch(`/api/v1/engineering/calculations${targetAssetId ? `?asset_id=${encodeURIComponent(targetAssetId)}` : ''}`, { cache: 'no-store' })
      ]);
      if ([assetResponse, formulaResponse, evidenceResponse, ndtResponse, runResponse].some((response) => response.status === 401 || response.status === 403)) {
        setPermissionDenied(true);
        return;
      }
      const [assetPayload, formulaPayload, evidencePayload, ndtPayload, runPayload] = await Promise.all([
        assetResponse.json(), formulaResponse.json(), evidenceResponse.json(), ndtResponse.json(), runResponse.json()
      ]);
      if (!assetResponse.ok) throw new Error(assetPayload?.error?.message ?? 'Failed to load asset context.');
      if (!formulaResponse.ok) throw new Error(formulaPayload?.error?.message ?? 'Failed to load executable formula versions.');
      if (!evidenceResponse.ok) throw new Error(evidencePayload?.error?.message ?? 'Failed to load evidence options.');
      if (!ndtResponse.ok) throw new Error(ndtPayload?.error?.message ?? 'Failed to load NDT options.');
      if (!runResponse.ok) throw new Error(runPayload?.error?.message ?? 'Failed to load calculation runs.');

      const assetRows = fixedAssetId ? [assetPayload.data as AssetOption] : asArray<AssetOption>(assetPayload.data);
      const formulaRows = asArray<FormulaVersionOption>(formulaPayload.data);
      setAssets(assetRows);
      setFormulaVersions(formulaRows);
      setEvidence(asArray<EvidenceOption>(evidencePayload.data));
      setNdtMeasurements(asArray<NdtOption>(ndtPayload.data));
      setRuns(asArray<CalculationRun>(runPayload.data));
      setForm((current) => ({
        ...current,
        asset_id: fixedAssetId ?? (current.asset_id || assetRows[0]?.asset_id || ''),
        formula_version_id: current.formula_version_id || formulaRows[0]?.formula_version_id || ''
      }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load calculation workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(fixedAssetId); }, [fixedAssetId]);

  async function runCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);
    if (readiness.blockers.length > 0) {
      setMessage(`Resolve blockers before run: ${readiness.blockers.join(' ')}`);
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/v1/engineering/calculate', {
        method: 'POST',
        body: JSON.stringify(requestPayload)
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 422) {
        setMessage(payload?.error?.message ?? 'Calculation failed.');
        return;
      }
      const data = payload.data as CalculationResponse;
      setResult(data);
      setMessage(response.status === 422 ? 'Calculation stored but blocked by backend validation/readiness gates.' : 'Calculation completed and stored for engineering review.');
      await loadAll(form.asset_id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Calculation failed.');
    } finally {
      setSaving(false);
    }
  }

  function setSelectedNdt(id: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      selected_ndt_ids: checked ? Array.from(new Set([...current.selected_ndt_ids, id])) : current.selected_ndt_ids.filter((item) => item !== id)
    }));
  }

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading calculation workspace" message="Loading assets, approved executable formula_versions, evidence, NDT, and calculation history." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="You do not have permission to access calculation workflow data." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Calculation workspace unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-G Guided Calculation</p>
          <h1>{assetScoped ? 'Asset Calculation Workspace' : 'Calculation Guided UI'}</h1>
          <p>Deterministic, versioned calculation workflow. Only approved executable formula_versions can be selected; engineering review is required before final use.</p>
        </div>
        <div className="action-row">
          {assetScoped && <Link className="secondary-button" href={`/assets/${fixedAssetId}`}>Back to Asset</Link>}
          <Link className="secondary-button" href="/formulas">Formula Registry</Link>
          <Link className="secondary-button" href="/validation">Validation</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
        </div>
      </header>

      {formulaVersions.length === 0 && <StatusPanel type="empty" title="No executable formula_versions" message="No approved synchronized formula_versions are available. Approve/sync a Formula Registry record before running calculations." />}

      <section className="grid-two">
        <form className="panel" onSubmit={runCalculation}>
          <div className="panel-heading">
            <h2>Guided calculation form</h2>
            <p>Frontend validation is UX-only. Backend validation, formula guardrails, evidence gates, and audit logging remain authoritative.</p>
          </div>
          <label>
            <span>Asset</span>
            <select value={form.asset_id} onChange={(event: ChangeEvent<HTMLSelectElement>) => { const asset_id = event.target.value; setForm((current) => ({ ...current, asset_id, selected_ndt_ids: [], evidence_file_id: '' })); void loadAll(asset_id); }} disabled={assetScoped} required>
              <option value="">Select asset</option>
              {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{displayAsset(asset)}</option>)}
            </select>
          </label>
          <label>
            <span>Approved executable formula_version</span>
            <select value={form.formula_version_id} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, formula_version_id: event.target.value }))} required>
              <option value="">Select approved executable formula_version</option>
              {formulaVersions.map((formula) => <option key={formula.formula_version_id} value={formula.formula_version_id}>{displayFormula(formula)}</option>)}
            </select>
          </label>
          {selectedFormula && <div className="notice"><strong>Selected formula:</strong> {displayFormula(selectedFormula)} <span className={badgeClass(selectedFormula.formula_status)}>{selectedFormula.formula_status}</span><p className="muted-text">Sync: {selectedFormula.sync_status ?? 'synchronized_to_executable'} · approved at {safeDate(selectedFormula.approved_at)} · registry status {selectedFormula.registry_status ?? '-'}</p></div>}
          <div className="form-grid">
            <label><span>Calculation type</span><select value={form.calculation_scope} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, calculation_scope: event.target.value }))}><option value="thickness_screening">Thickness screening</option><option value="corrosion_rate">Corrosion rate</option><option value="remaining_life">Remaining life</option><option value="inspection_interval_placeholder">Inspection interval placeholder</option></select></label>
            <label><span>Inspection event ID</span><input value={form.inspection_event_id} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, inspection_event_id: event.target.value }))} placeholder="Optional UUID" /></label>
            <label><span>Retirement thickness (mm)</span><input value={form.retirement_thickness_mm} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, retirement_thickness_mm: event.target.value }))} inputMode="decimal" /></label>
            <label><span>High corrosion rate warning (mm/year)</span><input value={form.high_corrosion_rate_mm_per_year} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, high_corrosion_rate_mm_per_year: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Low remaining life warning (years)</span><input value={form.low_remaining_life_years} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, low_remaining_life_years: event.target.value }))} inputMode="decimal" /></label>
            <label><span>Linked evidence</span><select value={form.evidence_file_id} onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((current) => ({ ...current, evidence_file_id: event.target.value }))}><option value="">Select evidence if applicable</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} — {item.file_name ?? 'evidence'}</option>)}</select></label>
            <label className="wide-field"><span>Calculation reason / notes</span><input value={form.notes} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Reason for run; does not approve output" /></label>
          </div>

          <section className="validation-group">
            <h3>NDT measurement selector</h3>
            <p className="muted-text">Select traceable NDT rows to include in the request snapshot. Backend asset context remains authoritative.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Use</th><th>Measurement</th><th>Method</th><th>Evidence</th><th>Status</th></tr></thead>
                <tbody>
                  {ndtMeasurements.slice(0, 12).map((row) => <tr key={row.measurement_id}><td><input type="checkbox" checked={form.selected_ndt_ids.includes(row.measurement_id)} onChange={(event: ChangeEvent<HTMLInputElement>) => setSelectedNdt(row.measurement_id, event.target.checked)} /></td><td>{displayNdt(row)}</td><td>{row.method ?? '-'}</td><td>{row.evidence_file_id ? <Link href={`/evidence/${row.evidence_file_id}`}>Linked</Link> : <span className="badge badge-warning">Missing</span>}</td><td><span className={badgeClass(row.validation_status)}>{row.validation_status ?? 'not_checked'}</span></td></tr>)}
                  {ndtMeasurements.length === 0 && <tr><td colSpan={5}>No NDT measurements found for this asset.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {(readiness.blockers.length > 0 || readiness.warnings.length > 0) && <section className={readiness.blockers.length > 0 ? 'error-list' : 'notice'}><h3>Readiness</h3>{readiness.blockers.map((item) => <p key={item}>Blocking: {item}</p>)}{readiness.warnings.map((item) => <p key={item}>Warning: {item}</p>)}</section>}
          <button className="primary-button" type="submit" disabled={saving || readiness.blockers.length > 0}>{saving ? 'Running...' : 'Run deterministic calculation'}</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading"><h2>Request preview and result</h2><p>Preview shows selected inputs only; it is not an engineering approval.</p></div>
          <h3>Request payload preview</h3>
          <pre className="json-panel">{renderJson(requestPayload)}</pre>
          <h3>Latest result</h3>
          {!result ? <p>No calculation run submitted in this session.</p> : <>
            <div className="cards compact-cards"><article><h2>{result.calculation?.corrosion_rates?.length ?? 0}</h2><p>Corrosion rows</p></article><article><h2>{result.calculation?.remaining_life?.length ?? 0}</h2><p>Remaining-life rows</p></article><article><h2>{result.calculation?.warnings?.length ?? 0}</h2><p>Warnings</p></article></div>
            <p><strong>Run:</strong> {result.run_id ?? result.calculation_run_id}</p>
            <p><strong>Status:</strong> <span className={badgeClass(result.run_status)}>{result.run_status}</span> <strong>Validation:</strong> <span className={badgeClass(result.validation_status)}>{result.validation_status}</span></p>
            <p><Link className="secondary-button" href={`/calculations/${result.calculation_run_id}`}>Open calculation detail</Link></p>
            <pre className="json-panel">{renderJson({ output_summary: result.output_summary, formula_version: result.formula_version, warnings: result.calculation?.warnings, blockers: result.calculation?.final_use_blockers })}</pre>
          </>}
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="row-between"><div><h2>{assetScoped ? 'Asset calculation run history' : 'Calculation run history'}</h2><p>{selectedAsset ? displayAsset(selectedAsset) : 'All loaded assets'}</p></div>{form.asset_id && <Link className="secondary-button" href={`/assets/${form.asset_id}/validation`}>Validation readiness</Link>}</div>
        <div className="table-wrap"><table><thead><tr><th>Run</th><th>Formula</th><th>Status</th><th>Validation</th><th>Final use</th><th>Created</th><th>Detail</th></tr></thead><tbody>{assetRuns.map((run) => <tr key={run.calculation_run_id}><td>{run.run_id ?? run.calculation_run_id}</td><td>{run.formula_set_version ?? run.formula_version_id ?? '-'}</td><td><span className={badgeClass(run.run_status)}>{run.run_status ?? run.status ?? '-'}</span></td><td><span className={badgeClass(run.validation_status)}>{run.validation_status ?? '-'}</span></td><td><span className={badgeClass(run.final_use_status)}>{run.final_use_status ?? 'requires_engineering_review'}</span></td><td>{safeDate(run.created_at)}</td><td><Link href={`/calculations/${run.calculation_run_id}`}>Open</Link></td></tr>)}{assetRuns.length === 0 && <tr><td colSpan={7}>No calculation runs found.</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
