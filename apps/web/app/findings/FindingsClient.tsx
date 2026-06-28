'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';

type ValidationIssue = { field: string; message: string; severity?: string };
type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null };
type EvidenceOption = { evidence_id: string; evidence_code?: string | null; file_name?: string | null; asset_id?: string | null };
type NdtOption = { measurement_id: string; measurement_code?: string | null; asset_id?: string | null; component?: string | null; grid_ref?: string | null };
type CalculationOption = { calculation_run_id?: string; run_id?: string | null; id?: string; asset_id?: string | null; formula_code?: string | null };
type Finding = {
  finding_id: string;
  finding_code?: string | null;
  asset_id: string;
  asset_tag?: string | null;
  asset_name?: string | null;
  inspection_event_id?: string | null;
  title: string;
  description?: string | null;
  finding_type: string;
  component?: string | null;
  shell_course_no?: number | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  elevation?: string | null;
  orientation?: string | null;
  severity: string;
  status: string;
  source_type?: string | null;
  source_entity_id?: string | null;
  evidence_file_id?: string | null;
  ndt_measurement_id?: string | null;
  calculation_run_id?: string | null;
  validation_run_id?: string | null;
  identified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  closure_reason?: string | null;
  evidence_code?: string | null;
  evidence_file_name?: string | null;
  ndt_measurement_code?: string | null;
  calculation_run_code?: string | null;
  linkage_status?: {
    has_evidence?: boolean;
    has_ndt?: boolean;
    has_calculation?: boolean;
    missing_evidence?: boolean;
    critical_missing_evidence?: boolean;
  };
};

type FindingsClientProps = { fixedAssetId?: string; assetScoped?: boolean };

const FINDING_TYPES = ['corrosion', 'wall_loss', 'pitting', 'crack', 'deformation', 'settlement', 'coating_defect', 'weld_defect', 'nozzle_issue', 'roof_issue', 'floor_issue', 'documentation_gap', 'data_quality_issue', 'other'];
const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'under_review', 'disposition_required', 'linked_to_ffs_candidate', 'linked_to_rbi_candidate', 'resolved', 'closed', 'rejected_duplicate'];
const SOURCE_TYPES = ['manual', 'evidence_review', 'ndt_measurement', 'calculation_warning', 'validation_warning', 'inspection_report'];

const emptyForm = {
  asset_id: '',
  inspection_event_id: '',
  title: '',
  description: '',
  finding_type: 'corrosion',
  component: '',
  shell_course_no: '',
  cml_tml_id: '',
  grid_ref: '',
  elevation: '',
  orientation: '',
  severity: 'medium',
  status: 'open',
  source_type: 'manual',
  source_entity_id: '',
  evidence_file_id: '',
  ndt_measurement_id: '',
  calculation_run_id: '',
  identified_at: ''
};

type FindingForm = typeof emptyForm;

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['critical', 'blocked', 'failed', 'closed', 'rejected'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['high', 'warning', 'open', 'review', 'disposition'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}

function payloadFromForm(form: FindingForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    asset_id: form.asset_id.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    finding_type: form.finding_type,
    component: form.component.trim(),
    severity: form.severity,
    status: form.status,
    source_type: form.source_type,
    identified_at: form.identified_at.trim()
  };
  const optional = ['inspection_event_id', 'cml_tml_id', 'grid_ref', 'elevation', 'orientation', 'source_entity_id', 'evidence_file_id', 'ndt_measurement_id', 'calculation_run_id'] as const;
  for (const key of optional) {
    const value = form[key].trim();
    if (value) payload[key] = value;
  }
  if (form.shell_course_no.trim()) payload.shell_course_no = Number(form.shell_course_no);
  return payload;
}

function validateForm(form: FindingForm): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!form.asset_id.trim()) issues.push({ field: 'asset_id', message: 'asset_id is required.', severity: 'error' });
  if (!form.title.trim()) issues.push({ field: 'title', message: 'title is required.', severity: 'error' });
  if (!form.finding_type.trim()) issues.push({ field: 'finding_type', message: 'finding_type is required.', severity: 'error' });
  if (!form.severity.trim()) issues.push({ field: 'severity', message: 'severity is required.', severity: 'error' });
  if (form.shell_course_no.trim() && (!Number.isInteger(Number(form.shell_course_no)) || Number(form.shell_course_no) <= 0)) issues.push({ field: 'shell_course_no', message: 'shell_course_no must be a positive integer.', severity: 'error' });
  if (form.severity === 'critical' && !form.evidence_file_id.trim()) issues.push({ field: 'evidence_file_id', message: 'Critical finding has no direct evidence. Backend will block closure until evidence is linked.', severity: 'warning' });
  return issues;
}

function selectedAssetMismatch(assetId: string, entity?: { asset_id?: string | null }): boolean {
  return Boolean(assetId && entity?.asset_id && entity.asset_id !== assetId);
}

export default function FindingsClient({ fixedAssetId, assetScoped = false }: FindingsClientProps) {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [evidence, setEvidence] = useState<EvidenceOption[]>([]);
  const [ndt, setNdt] = useState<NdtOption[]>([]);
  const [calculations, setCalculations] = useState<CalculationOption[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [form, setForm] = useState<FindingForm>({ ...emptyForm, asset_id: fixedAssetId ?? '' });
  const [filters, setFilters] = useState({ asset_id: fixedAssetId ?? searchParams.get('asset_id') ?? '', component: '', severity: searchParams.get('severity') ?? '', status: searchParams.get('status') ?? '', finding_type: searchParams.get('finding_type') ?? '', source_type: searchParams.get('source_type') ?? '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);

  const selectedAssetId = fixedAssetId ?? form.asset_id;
  const selectedEvidence = useMemo(() => evidence.find((item) => item.evidence_id === form.evidence_file_id), [evidence, form.evidence_file_id]);
  const selectedNdt = useMemo(() => ndt.find((item) => item.measurement_id === form.ndt_measurement_id), [ndt, form.ndt_measurement_id]);
  const selectedCalculation = useMemo(() => calculations.find((item) => (item.calculation_run_id ?? item.id) === form.calculation_run_id), [calculations, form.calculation_run_id]);
  const visibleFindings = useMemo(() => {
    return findings.filter((finding) => {
      if (filters.asset_id && finding.asset_id !== filters.asset_id) return false;
      if (filters.component && String(finding.component ?? '').toLowerCase().indexOf(filters.component.toLowerCase()) === -1) return false;
      if (filters.severity && finding.severity !== filters.severity) return false;
      if (filters.status && finding.status !== filters.status) return false;
      if (filters.finding_type && finding.finding_type !== filters.finding_type) return false;
      if (filters.source_type && finding.source_type !== filters.source_type) return false;
      const evidenceFilter = searchParams.get('evidence_file_id');
      const ndtFilter = searchParams.get('ndt_measurement_id');
      const calculationFilter = searchParams.get('calculation_run_id');
      if (evidenceFilter && finding.evidence_file_id !== evidenceFilter) return false;
      if (ndtFilter && finding.ndt_measurement_id !== ndtFilter) return false;
      if (calculationFilter && finding.calculation_run_id !== calculationFilter) return false;
      return true;
    });
  }, [findings, filters, searchParams]);

  async function loadData() {
    setLoading(true);
    setErrors([]);
    try {
      const findingsPath = fixedAssetId ? `/api/v1/assets/${fixedAssetId}/findings` : '/api/v1/findings';
      const [assetsResponse, findingsResponse, evidenceResponse, ndtResponse, calculationsResponse] = await Promise.all([
        apiFetch('/api/v1/assets', { cache: 'no-store' }),
        apiFetch(findingsPath, { cache: 'no-store' }),
        apiFetch(fixedAssetId ? `/api/v1/evidence?asset_id=${encodeURIComponent(fixedAssetId)}` : '/api/v1/evidence', { cache: 'no-store' }),
        apiFetch(fixedAssetId ? `/api/v1/ndt/measurements?asset_id=${encodeURIComponent(fixedAssetId)}` : '/api/v1/ndt/measurements', { cache: 'no-store' }),
        apiFetch(fixedAssetId ? `/api/v1/calculations?asset_id=${encodeURIComponent(fixedAssetId)}` : '/api/v1/calculations', { cache: 'no-store' })
      ]);
      const [assetsPayload, findingsPayload, evidencePayload, ndtPayload, calculationsPayload] = await Promise.all([
        assetsResponse.json(), findingsResponse.json(), evidenceResponse.json(), ndtResponse.json(), calculationsResponse.json()
      ]);
      if (!findingsResponse.ok) throw findingsPayload;
      setAssets(assetsPayload.data ?? []);
      setFindings(findingsPayload.data ?? []);
      setEvidence(evidencePayload.data ?? []);
      setNdt(ndtPayload.data ?? []);
      setCalculations(calculationsPayload.data ?? []);
    } catch (error) {
      const payload = error as { error?: { message?: string; details?: ValidationIssue[] } };
      setErrors(payload.error?.details ?? [{ field: 'request', message: payload.error?.message ?? 'Could not load findings.', severity: 'error' }]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [fixedAssetId]);

  async function createFinding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formForSubmit = { ...form, asset_id: fixedAssetId ?? form.asset_id };
    const localIssues = validateForm(formForSubmit);
    setErrors(localIssues);
    if (localIssues.some((issue) => issue.severity !== 'warning')) return;
    const response = await apiFetch('/api/v1/findings', {
      method: 'POST',
      body: JSON.stringify(payloadFromForm(formForSubmit))
    });
    const payload = await response.json();
    if (!response.ok) {
      setErrors(payload.error?.details ?? [{ field: payload.error?.code ?? 'request', message: payload.error?.message ?? 'Could not create finding.', severity: 'error' }]);
      return;
    }
    setMessage(`Finding ${payload.data?.finding_code ?? ''} created. Audit log: ${payload.auditLogId ?? 'created'}.`);
    setForm({ ...emptyForm, asset_id: fixedAssetId ?? '' });
    await loadData();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-H Findings / Anomaly Foundation</p>
          <h1>{assetScoped ? 'Asset Findings / Anomalies' : 'Findings / Anomalies'}</h1>
          <p>Traceable engineering findings linked to assets, evidence, NDT, calculations, and validation. Findings do not create FFS/RBI cases or final integrity decisions automatically.</p>
        </div>
        <div className="action-row">
          {fixedAssetId && <Link className="secondary-button" href={`/assets/${fixedAssetId}`}>Back to asset</Link>}
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
          <Link className="secondary-button" href="/calculations">Calculations</Link>
        </div>
      </header>

      <section className="notice">
        Findings may identify candidate concern areas, but they do not determine fitness-for-service, RBI risk, report issue readiness, or final integrity decisions. Human engineering review and evidence linkage remain mandatory.
      </section>

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createFinding}>
          <div className="panel-heading">
            <h2>Create finding</h2>
            <p>Record a manual inspection/NDT/calculation/validation anomaly. Backend validation remains authoritative.</p>
          </div>

          <label>
            <span>Asset</span>
            <select value={fixedAssetId ?? form.asset_id} onChange={(event) => setForm({ ...form, asset_id: event.target.value })} disabled={Boolean(fixedAssetId)} required>
              <option value="">Select asset</option>
              {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{displayValue(asset.tank_tag)} — {displayValue(asset.asset_name)}</option>)}
            </select>
          </label>
          <label><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label><span>Finding type</span><select value={form.finding_type} onChange={(event) => setForm({ ...form, finding_type: event.target.value })}>{FINDING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Severity</span><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Source type</span><select value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value })}>{SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Inspection event ID</span><input value={form.inspection_event_id} onChange={(event) => setForm({ ...form, inspection_event_id: event.target.value })} /></label>
          <label><span>Component</span><input value={form.component} onChange={(event) => setForm({ ...form, component: event.target.value })} placeholder="shell / floor / roof" /></label>
          <label><span>Shell course no.</span><input value={form.shell_course_no} onChange={(event) => setForm({ ...form, shell_course_no: event.target.value })} /></label>
          <label><span>CML/TML ID</span><input value={form.cml_tml_id} onChange={(event) => setForm({ ...form, cml_tml_id: event.target.value })} /></label>
          <label><span>Grid ref</span><input value={form.grid_ref} onChange={(event) => setForm({ ...form, grid_ref: event.target.value })} /></label>
          <label><span>Elevation</span><input value={form.elevation} onChange={(event) => setForm({ ...form, elevation: event.target.value })} /></label>
          <label><span>Orientation</span><input value={form.orientation} onChange={(event) => setForm({ ...form, orientation: event.target.value })} /></label>
          <label><span>Identified at</span><input type="datetime-local" value={form.identified_at} onChange={(event) => setForm({ ...form, identified_at: event.target.value })} /></label>
          <label><span>Evidence</span><select value={form.evidence_file_id} onChange={(event) => setForm({ ...form, evidence_file_id: event.target.value })}><option value="">No direct evidence selected</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{displayValue(item.evidence_code)} — {displayValue(item.file_name)}</option>)}</select></label>
          <label><span>NDT measurement</span><select value={form.ndt_measurement_id} onChange={(event) => setForm({ ...form, ndt_measurement_id: event.target.value })}><option value="">No NDT link</option>{ndt.map((item) => <option key={item.measurement_id} value={item.measurement_id}>{displayValue(item.measurement_code)} — {displayValue(item.component)} {displayValue(item.grid_ref)}</option>)}</select></label>
          <label><span>Calculation run</span><select value={form.calculation_run_id} onChange={(event) => setForm({ ...form, calculation_run_id: event.target.value })}><option value="">No calculation link</option>{calculations.map((item, index) => { const calculationId = item.calculation_run_id ?? item.id ?? String(index); return <option key={calculationId} value={calculationId}>{displayValue(item.run_id ?? calculationId)} — {displayValue(item.formula_code)}</option>; })}</select></label>
          <label className="full-width"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} /></label>

          {(selectedAssetMismatch(selectedAssetId, selectedEvidence) || selectedAssetMismatch(selectedAssetId, selectedNdt) || selectedAssetMismatch(selectedAssetId, selectedCalculation)) && (
            <div className="error-list full-width">Cross-asset linkage warning: selected evidence/NDT/calculation appears to belong to a different asset. Backend will reject this linkage.</div>
          )}
          <button className="primary-button" type="submit">Create finding</button>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Filters</h2>
            <p>Filter findings by asset, severity, status, type, component, and source.</p>
          </div>
          {!fixedAssetId && <label><span>Asset</span><select value={filters.asset_id} onChange={(event) => setFilters({ ...filters, asset_id: event.target.value })}><option value="">All assets</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{displayValue(asset.tank_tag)} — {displayValue(asset.asset_name)}</option>)}</select></label>}
          <label><span>Component</span><input value={filters.component} onChange={(event) => setFilters({ ...filters, component: event.target.value })} /></label>
          <label><span>Severity</span><select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}><option value="">All</option>{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Type</span><select value={filters.finding_type} onChange={(event) => setFilters({ ...filters, finding_type: event.target.value })}><option value="">All</option>{FINDING_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Source</span><select value={filters.source_type} onChange={(event) => setFilters({ ...filters, source_type: event.target.value })}><option value="">All</option>{SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <div className="metadata-grid">
            <dt>Visible</dt><dd>{visibleFindings.length}</dd>
            <dt>Critical open</dt><dd>{visibleFindings.filter((finding) => finding.severity === 'critical' && !['closed', 'resolved', 'rejected_duplicate'].includes(finding.status)).length}</dd>
            <dt>Missing evidence</dt><dd>{visibleFindings.filter((finding) => !finding.evidence_file_id).length}</dd>
          </div>
        </section>
      </section>

      {message && <section className="notice">{message}</section>}
      {errors.length > 0 && (
        <section className="error-list">
          {errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>Findings list</h2>
          <p>Evidence/NDT/calculation linkage markers are traceability indicators, not approval decisions.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Finding</th><th>Asset</th><th>Type</th><th>Component</th><th>Severity</th><th>Status</th><th>Links</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8}>Loading findings...</td></tr> : visibleFindings.length === 0 ? <tr><td colSpan={8}>No findings found.</td></tr> : visibleFindings.map((finding) => (
                <tr key={finding.finding_id}>
                  <td><Link href={`/findings/${finding.finding_id}`}>{displayValue(finding.finding_code)} — {finding.title}</Link></td>
                  <td><Link href={`/assets/${finding.asset_id}`}>{displayValue(finding.asset_tag ?? finding.asset_id)}</Link></td>
                  <td>{finding.finding_type}</td>
                  <td>{displayValue(finding.component)}</td>
                  <td><span className={badgeClass(finding.severity)}>{finding.severity}</span></td>
                  <td><span className={badgeClass(finding.status)}>{finding.status}</span></td>
                  <td>
                    <span className={finding.evidence_file_id ? 'badge' : 'badge badge-warning'}>{finding.evidence_file_id ? 'evidence-linked' : 'missing-evidence'}</span>{' '}
                    <span className={finding.ndt_measurement_id ? 'badge' : 'badge badge-warning'}>{finding.ndt_measurement_id ? 'ndt-linked' : 'no-ndt'}</span>{' '}
                    <span className={finding.calculation_run_id ? 'badge' : 'badge badge-warning'}>{finding.calculation_run_id ? 'calculation-linked' : 'no-calculation'}</span>
                    {finding.linkage_status?.critical_missing_evidence && <span className="badge badge-danger">critical evidence required</span>}
                  </td>
                  <td>{dateValue(finding.updated_at ?? finding.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
