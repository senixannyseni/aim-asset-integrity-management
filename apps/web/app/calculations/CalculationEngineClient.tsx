'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { CompactDataTable, DetailDrawer, DetailGrid, GateSummary, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null; facility?: string | null; location?: string | null };
type FormulaVersionOption = {
  formula_version_id: string;
  formula_code: string;
  formula_name?: string | null;
  version: string;
  formula_status?: string | null;
  deterministic_flag?: boolean | null;
  sync_status?: string | null;
  registry_status?: string | null;
  approved_at?: string | null;
};
type EvidenceOption = { evidence_id: string; evidence_code?: string | null; file_name?: string | null; asset_id?: string | null };
type NdtOption = {
  measurement_id: string;
  asset_id?: string | null;
  component?: string | null;
  shell_course_no?: number | string | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  measured_thickness?: number | string | null;
  measured_thickness_mm?: number | string | null;
  measured_thickness_unit?: string | null;
  evidence_file_id?: string | null;
  validation_status?: string | null;
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
type CalculationEngineClientProps = { fixedAssetId?: string; assetScoped?: boolean };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeDate(value?: string | null): string {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function displayAsset(asset?: AssetOption): string {
  return asset ? `${asset.tank_tag ?? asset.asset_id} - ${asset.asset_name ?? 'Unnamed tank'}` : '-';
}

function displayFormula(formula?: FormulaVersionOption): string {
  return formula ? `${formula.formula_code}@${formula.version} - ${formula.formula_name ?? 'Executable formula'}` : '-';
}

function displayNdt(row: NdtOption): string {
  return `${row.component ?? 'component'} / C${row.shell_course_no ?? '-'} / ${row.cml_tml_id ?? row.grid_ref ?? row.measurement_id} / ${row.measured_thickness_mm ?? row.measured_thickness ?? '-'} mm`;
}

function numericValue(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [runDrawerOpen, setRunDrawerOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<CalculationRun | null>(null);
  const [assetId, setAssetId] = useState(fixedAssetId ?? '');
  const [formulaVersionId, setFormulaVersionId] = useState('');
  const [selectedNdtIds, setSelectedNdtIds] = useState<string[]>([]);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.asset_id === assetId), [assets, assetId]);
  const selectedFormula = useMemo(() => formulaVersions.find((formula) => formula.formula_version_id === formulaVersionId), [formulaVersions, formulaVersionId]);
  const selectedNdt = useMemo(() => ndtMeasurements.filter((row) => selectedNdtIds.includes(row.measurement_id)), [ndtMeasurements, selectedNdtIds]);
  const assetRuns = useMemo(() => runs.filter((run) => !assetId || run.asset_id === assetId), [runs, assetId]);

  const readiness = useMemo(() => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (!assetId) blockers.push('asset_id is required.');
    if (!selectedFormula) blockers.push('An approved executable formula_version is required.');
    if (selectedFormula && !['approved', 'locked'].includes(String(selectedFormula.formula_status ?? '').toLowerCase())) blockers.push('Selected formula_version is not approved or locked.');
    if (selectedFormula && selectedFormula.deterministic_flag === false) blockers.push('Selected formula_version is not deterministic.');
    if (selectedNdt.length === 0) warnings.push('No NDT rows selected. Backend asset context remains authoritative, but selected rows improve traceability.');
    return { blockers, warnings };
  }, [assetId, selectedFormula, selectedNdt.length]);

  const summary = useMemo(() => {
    const blocked = assetRuns.filter((run) => ['blocked', 'failed', 'rejected'].some((token) => String(run.final_use_status ?? run.validation_status ?? run.run_status ?? '').toLowerCase().includes(token))).length;
    const pending = assetRuns.filter((run) => String(run.review_status ?? run.final_use_status ?? '').toLowerCase().includes('review')).length;
    const approved = assetRuns.filter((run) => String(run.review_status ?? run.final_use_status ?? '').toLowerCase().includes('approved')).length;
    return { total: assetRuns.length, blocked, pending, approved };
  }, [assetRuns]);

  async function loadAll(assetOverride?: string) {
    const targetAssetId = assetOverride ?? fixedAssetId ?? assetId;
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
      const [assetPayload, formulaPayload, evidencePayload, ndtPayload, runPayload] = await Promise.all([assetResponse.json(), formulaResponse.json(), evidenceResponse.json(), ndtResponse.json(), runResponse.json()]);
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
      setAssetId(fixedAssetId ?? (targetAssetId || assetRows[0]?.asset_id || ''));
      setFormulaVersionId((current) => current || formulaRows[0]?.formula_version_id || '');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load calculation workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(fixedAssetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedAssetId]);

  function setSelectedNdt(id: string, checked: boolean) {
    setSelectedNdtIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  }

  async function runCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (readiness.blockers.length > 0) {
      setMessage(`Resolve blockers before run: ${readiness.blockers.join(' ')}`);
      return;
    }
    const form = event.currentTarget;
    const retirementThickness = numericValue(fieldValue(form, 'retirement_thickness_mm'));
    const highRate = numericValue(fieldValue(form, 'high_corrosion_rate_mm_per_year'));
    const lowLife = numericValue(fieldValue(form, 'low_remaining_life_years'));
    const payload = {
      asset_id: assetId,
      formula_id: selectedFormula?.formula_code ?? '',
      formula_version: selectedFormula?.version ?? '',
      formula_version_id: formulaVersionId,
      calculation_scope: fieldValue(form, 'calculation_scope') || 'thickness_screening',
      inspection_event_id: fieldValue(form, 'inspection_event_id') || undefined,
      calculation_request: {
        thickness_check_requested: true,
        retirement_thickness_mm: retirementThickness,
        selected_evidence_file_id: fieldValue(form, 'evidence_file_id') || undefined,
        selected_ndt_measurement_ids: selectedNdtIds,
        calculation_reason: fieldValue(form, 'notes') || undefined,
        ffs_trigger_evaluation_requested: true,
        rbi_trigger_evaluation_requested: true
      },
      thresholds: {
        high_corrosion_rate_mm_per_year: highRate,
        low_remaining_life_years: lowLife
      },
      ndt_measurements: selectedNdt.map((row) => ({ ...row, source_entity_id: row.measurement_id, measured_thickness_unit: row.measured_thickness_unit ?? 'mm', is_critical: true }))
    };
    setSaving(true);
    try {
      const response = await apiFetch('/api/v1/engineering/calculate', { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok && response.status !== 422) {
        setMessage(result?.error?.message ?? 'Calculation failed.');
        return;
      }
      setMessage(response.status === 422 ? 'Calculation stored but blocked by backend validation/readiness gates.' : 'Calculation completed and stored for engineering review.');
      setRunDrawerOpen(false);
      await loadAll(assetId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Calculation failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading calculation workspace" message="Loading assets, formula versions, evidence, NDT, and calculation history." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="You do not have permission to access calculation workflow data." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Calculation workspace unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="RC4-G guided calculation"
        title={assetScoped ? 'Asset Calculation Workspace' : 'Calculation Workbook'}
        description="Run deterministic calculations with approved formula versions. Input snapshots, output details, hashes, and evidence links are in drawers."
        status={summary.blocked > 0 ? 'blocked' : summary.pending > 0 ? 'pending_review' : 'approved'}
        actions={<><button className="primary-button" type="button" disabled={formulaVersions.length === 0} onClick={() => setRunDrawerOpen(true)}>Run Calculation</button>{assetScoped && <Link className="secondary-button" href={`/assets/${fixedAssetId}`}>Back to Asset</Link>}<Link className="secondary-button" href="/formulas">Formula Registry</Link><Link className="secondary-button" href="/ndt">NDT</Link></>}
      />

      {message && <div className="notice">{message}</div>}
      {formulaVersions.length === 0 && <StatusPanel type="empty" title="No executable formula versions" message="No approved synchronized formula_versions are available." />}

      <section className="pd-kpi-grid" aria-label="Calculation summary">
        <KpiCard title="Runs" value={summary.total} helper={selectedAsset ? displayAsset(selectedAsset) : 'loaded context'} />
        <KpiCard title="Formula readiness" value={formulaVersions.length} helper="RC4-O adds detail-level formula traceability readiness" status={formulaVersions.length > 0 ? 'approved' : 'blocked'} />
        <KpiCard title="Pending Review" value={summary.pending} helper="human engineering action" status={summary.pending > 0 ? 'pending_review' : 'approved'} />
        <KpiCard title="Blocked / Failed" value={summary.blocked} helper="validation or final-use blockers" status={summary.blocked > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Approved" value={summary.approved} helper="reviewed calculation runs" status="approved" />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Calculation Runs</h2>
            <p>Essential run state only. Select a row for formula snapshot, input/output summary, evidence, and audit detail.</p>
          </div>
          {assetId && <Link className="secondary-button" href={`/assets/${assetId}/validation`}>Validation readiness</Link>}
        </div>
        {!assetScoped && <label className="wide-field"><span>Asset</span><select value={assetId} onChange={(event) => { setAssetId(event.target.value); setSelectedNdtIds([]); void loadAll(event.target.value); }}><option value="">All loaded assets</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{displayAsset(asset)}</option>)}</select></label>}
        <CompactDataTable
          rows={assetRuns}
          getRowKey={(run) => run.calculation_run_id}
          emptyTitle="No calculation runs"
          emptyMessage="No calculation runs found for this context."
          columns={[
            { header: 'Calculation Run', render: (run) => <Link href={`/calculations/${run.calculation_run_id}`}>{run.run_id ?? run.calculation_run_id}</Link> },
            { header: 'Formula Version', render: (run) => run.formula_set_version ?? run.formula_version_id ?? '-' },
            { header: 'Status', render: (run) => <StatusBadge status={run.run_status ?? run.status} /> },
            { header: 'Result Summary', render: (run) => run.output_summary ? `${Object.keys(run.output_summary).length} fields` : '-' },
            { header: 'Warnings', render: (run) => <StatusBadge status={String(run.final_use_status ?? run.validation_status ?? '').includes('block') ? 'blocked' : 'pending_review'} label={run.final_use_status ?? run.validation_status ?? 'requires_review'} /> },
            { header: 'Action', className: 'pd-cell-actions', render: (run) => <button className="secondary-button" type="button" onClick={() => setSelectedRun(run)}>View details</button> }
          ]}
        />
      </section>

      <DetailDrawer
        open={runDrawerOpen}
        title="Run calculation"
        subtitle="Focused calculation request. Backend validation, formula guardrails, evidence gates, and audit logging remain authoritative."
        status={readiness.blockers.length > 0 ? 'blocked' : 'pending_review'}
        onClose={() => setRunDrawerOpen(false)}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <form className="form-grid" onSubmit={runCalculation}>
              <div className="notice wide-field"><strong>Formula readiness:</strong> Only approved executable formula_versions can be selected. Request payload preview is kept in the detail drawer.</div>
              <label><span>Asset</span><select value={assetId} onChange={(event) => { setAssetId(event.target.value); setSelectedNdtIds([]); void loadAll(event.target.value); }} disabled={assetScoped} required><option value="">Select asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{displayAsset(asset)}</option>)}</select></label>
              <label><span>Approved Formula Version</span><select value={formulaVersionId} onChange={(event) => setFormulaVersionId(event.target.value)} required><option value="">Select formula_version</option>{formulaVersions.map((formula) => <option key={formula.formula_version_id} value={formula.formula_version_id}>{displayFormula(formula)}</option>)}</select></label>
              <label><span>Calculation Type</span><select name="calculation_scope" defaultValue="thickness_screening"><option value="thickness_screening">Thickness screening</option><option value="corrosion_rate">Corrosion rate</option><option value="remaining_life">Remaining life</option></select></label>
              <label><span>Inspection Event ID</span><input name="inspection_event_id" placeholder="Optional UUID" /></label>
              <label><span>Retirement Thickness (mm)</span><input name="retirement_thickness_mm" defaultValue="8" inputMode="decimal" /></label>
              <label><span>High Corrosion Rate (mm/year)</span><input name="high_corrosion_rate_mm_per_year" defaultValue="0.5" inputMode="decimal" /></label>
              <label><span>Low Remaining Life (years)</span><input name="low_remaining_life_years" defaultValue="5" inputMode="decimal" /></label>
              <label><span>Linked Evidence</span><select name="evidence_file_id" defaultValue=""><option value="">Select evidence if applicable</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} - {item.file_name ?? 'evidence'}</option>)}</select></label>
              <label className="wide-field"><span>Calculation Reason</span><input name="notes" placeholder="Reason for run; does not approve output" /></label>
              {(readiness.blockers.length > 0 || readiness.warnings.length > 0) && <section className={readiness.blockers.length > 0 ? 'error-list wide-field' : 'notice wide-field'}><h3>Readiness</h3>{readiness.blockers.map((item) => <p key={item}>Blocking: {item}</p>)}{readiness.warnings.map((item) => <p key={item}>Warning: {item}</p>)}</section>}
              <button className="primary-button wide-field" type="submit" disabled={saving || readiness.blockers.length > 0}>{saving ? 'Running...' : 'Run deterministic calculation'}</button>
            </form>
          },
          {
            id: 'technical',
            label: 'Technical Data',
            content: <CompactDataTable rows={ndtMeasurements.slice(0, 16)} getRowKey={(row) => row.measurement_id} emptyTitle="No NDT rows" emptyMessage="No NDT measurements found for this asset." columns={[{ header: 'Use', render: (row) => <input type="checkbox" checked={selectedNdtIds.includes(row.measurement_id)} onChange={(event) => setSelectedNdt(row.measurement_id, event.target.checked)} /> }, { header: 'Measurement', render: displayNdt }, { header: 'Evidence', render: (row) => row.evidence_file_id ? <Link href={`/evidence/${row.evidence_file_id}`}>Linked</Link> : <StatusBadge status="needs_review" label="missing" /> }, { header: 'Status', render: (row) => <StatusBadge status={row.validation_status ?? 'pending_review'} /> }]} />
          }
        ]}
      />

      <DetailDrawer
        open={Boolean(selectedRun)}
        title={selectedRun?.run_id ?? selectedRun?.calculation_run_id ?? 'Calculation details'}
        subtitle={selectedRun?.formula_set_version ?? selectedRun?.formula_version_id ?? undefined}
        status={selectedRun?.run_status ?? selectedRun?.status}
        onClose={() => setSelectedRun(null)}
        tabs={selectedRun ? [
          {
            id: 'overview',
            label: 'Overview',
            content: <DetailGrid items={[{ label: 'Run ID', value: <code>{selectedRun.calculation_run_id}</code> }, { label: 'Asset', value: selectedRun.asset_id ?? '-' }, { label: 'Formula', value: selectedRun.formula_set_version ?? selectedRun.formula_version_id ?? '-' }, { label: 'Run Status', value: <StatusBadge status={selectedRun.run_status ?? selectedRun.status} /> }, { label: 'Review Status', value: <StatusBadge status={selectedRun.review_status ?? 'pending_review'} /> }, { label: 'Created', value: safeDate(selectedRun.created_at) }]} />
          },
          {
            id: 'technical',
            label: 'Technical Data',
            content: <TechnicalJson value={{ output_summary: selectedRun.output_summary, formula_version_snapshot: selectedRun.formula_version_snapshot }} />
          },
          {
            id: 'evidence',
            label: 'Evidence',
            content: <div className="pd-compact-actions"><Link className="secondary-button" href={`/evidence?asset_id=${selectedRun.asset_id ?? ''}`}>Evidence</Link><Link className="secondary-button" href={`/ndt?asset_id=${selectedRun.asset_id ?? ''}`}>NDT Inputs</Link></div>
          },
          {
            id: 'gate',
            label: 'Gate Checklist',
            content: <GateSummary pass={selectedRun.final_use_status?.includes('approved') ? 2 : 1} warning={selectedRun.review_status?.includes('review') ? 1 : 0} fail={selectedRun.final_use_status?.includes('block') || selectedRun.validation_status?.includes('fail') ? 1 : 0} />
          },
          {
            id: 'audit',
            label: 'Audit Trail',
            content: <Link className="secondary-button" href={`/audit-logs?entity_type=calculation_run&entity_id=${selectedRun.calculation_run_id}`}>Open audit trail</Link>
          },
          {
            id: 'raw',
            label: 'Raw Metadata',
            content: <TechnicalJson value={selectedRun} />
          }
        ] : []}
      />
    </main>
  );
}
