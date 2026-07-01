'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../components/ModuleBranchNav';
import { CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type ValidationIssue = { field: string; message: string; severity?: 'error' | 'warning' | string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null };
type EvidenceOption = { evidence_id: string; evidence_code?: string | null; file_name?: string | null; asset_id?: string | null; status?: string | null; malware_scan_status?: string | null };
type NdtMeasurement = {
  measurement_id: string;
  measurement_code?: string | null;
  asset_id: string;
  inspection_event_id?: string | null;
  component: string;
  shell_course_no?: number | null;
  cml_tml_id?: string | null;
  grid_ref?: string | null;
  elevation?: number | null;
  elevation_unit?: string | null;
  orientation?: string | null;
  measured_thickness: number;
  measured_thickness_unit?: string | null;
  reading_date: string;
  method: string;
  confidence?: number | null;
  evidence_file_id?: string | null;
  extraction_source?: string | null;
  reviewer_status?: string | null;
  validation_status?: string | null;
  validation_message?: string | null;
  is_critical?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type NdtDataRoomClientProps = { fixedAssetId?: string; assetScoped?: boolean };

const METHOD_OPTIONS = ['UT', 'MFL', 'CML', 'TML', 'visual', 'NDT map'];
const NDT_BRANCHES: ModuleBranchItem[] = [
  { id: 'datasets', label: 'Datasets', description: 'Measurement datasets', icon: 'DS' },
  { id: 'measurements', label: 'Measures', description: 'Readings table', icon: 'ME' },
  { id: 'critical', label: 'Critical', description: 'Critical values', icon: 'CR' },
  { id: 'traceability', label: 'Trace', ariaLabel: 'Inspection Traceability Readiness', description: 'RC4-P gates', icon: 'TR' },
  { id: 'evidence', label: 'Evidence', description: 'Linked evidence', icon: 'EV' },
  { id: 'review', label: 'Review', description: 'Reviewer state', icon: 'RV' }
];

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function isEvidenceBlocked(evidence?: EvidenceOption): boolean {
  const scan = String(evidence?.malware_scan_status ?? '').toLowerCase();
  const status = String(evidence?.status ?? '').toLowerCase();
  return ['infected', 'blocked', 'quarantined', 'scan_failed'].includes(scan) || ['deleted', 'delete_requested'].includes(status);
}

function payloadIssues(payload: ApiErrorPayload, fallback: string): ValidationIssue[] {
  if (Array.isArray(payload.error?.details)) return payload.error.details;
  return [{ field: payload.error?.code ?? 'request', message: payload.error?.message ?? fallback, severity: 'error' }];
}

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}

function ErrorList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return <div className="error-list" role="alert">{issues.map((issue, index) => <p key={`${issue.field}-${issue.message}-${index}`}><strong>{issue.field}</strong>: {issue.message}</p>)}</div>;
}

export default function NdtDataRoomClient({ fixedAssetId, assetScoped = false }: NdtDataRoomClientProps) {
  const searchParams = useSearchParams();
  const initialAssetId = fixedAssetId ?? searchParams.get('asset_id') ?? '';
  const evidenceFilter = searchParams.get('evidence_id') ?? '';
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceOption[]>([]);
  const [measurements, setMeasurements] = useState<NdtMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [assetFilter, setAssetFilter] = useState(initialAssetId);
  const [componentFilter, setComponentFilter] = useState('');
  const [gridFilter, setGridFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [evidenceStateFilter, setEvidenceStateFilter] = useState(evidenceFilter ? 'linked' : '');
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<NdtMeasurement | null>(null);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.asset_id === (fixedAssetId ?? assetFilter)), [assets, assetFilter, fixedAssetId]);
  const assetEvidence = useMemo(() => evidenceFiles.filter((evidence) => !assetFilter || evidence.asset_id === assetFilter || !evidence.asset_id), [evidenceFiles, assetFilter]);

  async function loadPageData() {
    setLoading(true);
    setPermissionDenied(false);
    setPageError(null);
    try {
      const query = fixedAssetId ? `?asset_id=${encodeURIComponent(fixedAssetId)}` : '';
      const [assetResponse, evidenceResponse, ndtResponse] = await Promise.all([
        apiFetch('/api/v1/assets', { cache: 'no-store' }),
        apiFetch('/api/v1/evidence', { cache: 'no-store' }),
        apiFetch(`/api/v1/ndt/measurements${query}`, { cache: 'no-store' })
      ]);
      if ([assetResponse.status, evidenceResponse.status, ndtResponse.status].some((status) => status === 401 || status === 403)) {
        setPermissionDenied(true);
        return;
      }
      const [assetPayload, evidencePayload, ndtPayload] = await Promise.all([
        assetResponse.json(),
        evidenceResponse.json(),
        ndtResponse.json()
      ]) as [{ data?: AssetOption[] } & ApiErrorPayload, { data?: EvidenceOption[] } & ApiErrorPayload, { data?: NdtMeasurement[] } & ApiErrorPayload];
      if (!assetResponse.ok) throw new Error(assetPayload.error?.message ?? 'Asset list could not be loaded.');
      if (!evidenceResponse.ok) throw new Error(evidencePayload.error?.message ?? 'Evidence list could not be loaded.');
      if (!ndtResponse.ok) throw new Error(ndtPayload.error?.message ?? 'NDT measurements could not be loaded.');
      setAssets(assetPayload.data ?? []);
      setEvidenceFiles(evidencePayload.data ?? []);
      setMeasurements(ndtPayload.data ?? []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'NDT data room could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedAssetId]);

  const filteredMeasurements = useMemo(() => measurements.filter((measurement) => {
    if (fixedAssetId && measurement.asset_id !== fixedAssetId) return false;
    if (!fixedAssetId && assetFilter && measurement.asset_id !== assetFilter) return false;
    if (componentFilter && !measurement.component.toLowerCase().includes(componentFilter.toLowerCase())) return false;
    if (gridFilter) {
      const gridText = `${measurement.grid_ref ?? ''} ${measurement.cml_tml_id ?? ''}`.toLowerCase();
      if (!gridText.includes(gridFilter.toLowerCase())) return false;
    }
    if (methodFilter && measurement.method.toLowerCase() !== methodFilter.toLowerCase()) return false;
    if (evidenceFilter && measurement.evidence_file_id !== evidenceFilter) return false;
    if (evidenceStateFilter === 'linked' && !measurement.evidence_file_id) return false;
    if (evidenceStateFilter === 'missing' && measurement.evidence_file_id) return false;
    if (evidenceStateFilter === 'critical_missing' && (measurement.evidence_file_id || !measurement.is_critical)) return false;
    return true;
  }), [measurements, fixedAssetId, assetFilter, componentFilter, gridFilter, methodFilter, evidenceFilter, evidenceStateFilter]);

  const summary = useMemo(() => {
    const critical = filteredMeasurements.filter((measurement) => measurement.is_critical).length;
    const missingEvidence = filteredMeasurements.filter((measurement) => !measurement.evidence_file_id).length;
    const needsReview = filteredMeasurements.filter((measurement) => String(measurement.reviewer_status ?? measurement.validation_status ?? '').toLowerCase().includes('review')).length;
    return { total: filteredMeasurements.length, critical, missingEvidence, needsReview };
  }, [filteredMeasurements]);
  const activeBranch = useActiveModuleBranch(NDT_BRANCHES, 'datasets');
  const branchMeasurements = useMemo(() => filteredMeasurements.filter((measurement) => {
    if (activeBranch === 'critical') return Boolean(measurement.is_critical);
    if (activeBranch === 'evidence') return Boolean(measurement.evidence_file_id);
    if (activeBranch === 'review') return String(measurement.reviewer_status ?? measurement.validation_status ?? '').toLowerCase().includes('review');
    return true;
  }), [activeBranch, filteredMeasurements]);

  async function createMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIssues([]);
    const form = event.currentTarget;
    const measuredThickness = Number(fieldValue(form, 'measured_thickness'));
    const localIssues: ValidationIssue[] = [];
    if (!fieldValue(form, 'asset_id')) localIssues.push({ field: 'asset_id', message: 'asset_id is required.', severity: 'error' });
    if (!fieldValue(form, 'component')) localIssues.push({ field: 'component', message: 'component is required.', severity: 'error' });
    if (!Number.isFinite(measuredThickness) || measuredThickness <= 0) localIssues.push({ field: 'measured_thickness', message: 'measured_thickness must be positive.', severity: 'error' });
    if (!fieldValue(form, 'reading_date')) localIssues.push({ field: 'reading_date', message: 'reading_date is required.', severity: 'error' });
    if (fieldValue(form, 'is_critical') === 'true' && !fieldValue(form, 'evidence_file_id')) {
      localIssues.push({ field: 'evidence_file_id', message: 'Critical NDT measurement has no evidence link. Backend will keep the evidence gate blocked.', severity: 'warning' });
    }
    const blocking = localIssues.filter((issue) => issue.severity !== 'warning');
    if (blocking.length > 0) {
      setIssues(localIssues);
      return;
    }
    setIssues(localIssues.filter((issue) => issue.severity === 'warning'));

    const body = {
      asset_id: fieldValue(form, 'asset_id'),
      inspection_event_id: fieldValue(form, 'inspection_event_id') || undefined,
      component: fieldValue(form, 'component'),
      shell_course_no: fieldValue(form, 'shell_course_no') ? Number(fieldValue(form, 'shell_course_no')) : undefined,
      cml_tml_id: fieldValue(form, 'cml_tml_id') || undefined,
      grid_ref: fieldValue(form, 'grid_ref') || undefined,
      measured_thickness: measuredThickness,
      measured_thickness_unit: 'mm',
      reading_date: fieldValue(form, 'reading_date'),
      method: fieldValue(form, 'method') || 'UT',
      evidence_file_id: fieldValue(form, 'evidence_file_id') || undefined,
      extraction_source: 'manual',
      is_critical: fieldValue(form, 'is_critical') === 'true'
    };
    const response = await apiFetch('/api/v1/ndt/measurements', { method: 'POST', body: JSON.stringify(body) });
    const payload = await response.json() as { data?: NdtMeasurement; auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      setIssues(payloadIssues(payload, 'NDT measurement create failed.'));
      setMessage(payload.error?.message ?? 'NDT measurement create failed.');
      return;
    }
    setMessage(`NDT measurement ${payload.data?.measurement_code ?? payload.data?.measurement_id ?? ''} created. Audit log: ${payload.auditLogId ?? 'created'}.`);
    setEntryDrawerOpen(false);
    form.reset();
    await loadPageData();
  }

  function exportCsv() {
    const headers = ['measurement_id', 'asset_id', 'inspection_event_id', 'component', 'shell_course_no', 'cml_tml_id', 'grid_ref', 'measured_thickness', 'reading_date', 'method', 'evidence_file_id', 'reviewer_status', 'validation_status'];
    const csv = [headers.join(','), ...filteredMeasurements.map((measurement) => headers.map((header) => `"${String((measurement as unknown as Record<string, unknown>)[header] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aim-ndt-measurements-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className="app-shell">
    <ModuleBranchNav
      items={NDT_BRANCHES.map((branch) => ({
        ...branch,
        count: branch.id === 'datasets' || branch.id === 'measurements' || branch.id === 'traceability' ? summary.total : branch.id === 'critical' ? summary.critical : branch.id === 'evidence' ? summary.total - summary.missingEvidence : branch.id === 'review' ? summary.needsReview : undefined,
        status: branch.id === 'traceability' && summary.missingEvidence > 0 ? 'blocked' : undefined
      }))}
      activeId={activeBranch}
    />
    <PageHeader
      eyebrow="RC4-D"
      title={assetScoped ? 'Asset NDT Measurements' : 'NDT Data Room'}
      description={assetScoped ? `Measurements filtered to ${selectedAsset?.tank_tag ?? fixedAssetId}. Full readings, CML/TML grid references, evidence, and raw metadata are in detail drawers.` : 'Review UT thickness datasets with essential status visible by default. Entry and full reading detail are progressively disclosed.'}
      status={summary.missingEvidence > 0 ? 'blocked' : summary.needsReview > 0 ? 'pending_review' : 'approved'}
      actions={<><button className="primary-button" type="button" onClick={() => setEntryDrawerOpen(true)}>Create Measurement</button><Link className="secondary-button" href="/assets">Assets</Link><Link className="secondary-button" href="/evidence">Evidence</Link>{fixedAssetId && <Link className="secondary-button" href={`/assets/${fixedAssetId}`}>Back to Asset</Link>}</>}
    />

    {loading && <StatusPanel type="loading" title="Loading NDT data" message="Loading NDT measurements, assets, and evidence metadata from AIM." />}
    {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view or change NDT measurements." />}
    {pageError && <StatusPanel type="error" title="NDT data room error" message={pageError} />}

    {!loading && !permissionDenied && !pageError && <>
      <section className="pd-kpi-grid" aria-label="NDT summary">
        <KpiCard title="Datasets" value={summary.total} helper="measurements in current view" />
        <KpiCard title="Inspection Traceability Readiness" value={summary.total} helper="RC4-P adds measurement detail inspection traceability readiness" status="pending_review" />
        <KpiCard title="Bulk Import" value="CSV / XLSX" helper="/api/v1/ndt/measurements/bulk-import" status="pending_review" />
        <KpiCard title="Critical" value={summary.critical} helper="critical records remain visible" status={summary.critical > 0 ? 'needs_review' : 'approved'} />
        <KpiCard title="Missing Evidence" value={summary.missingEvidence} helper="blocks approval where required" status={summary.missingEvidence > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Needs Review" value={summary.needsReview} helper="review/validation states" status={summary.needsReview > 0 ? 'pending_review' : 'approved'} />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>NDT Measurements</h2>
            <p>Stored measurements only. No API/ASME calculations are performed here. Status badges display existing validation/reviewer values.</p>
          </div>
          <div className="action-row"><button className="secondary-button" type="button" onClick={exportCsv}>Export CSV</button></div>
        </div>
        <div className="form-grid">
          {!fixedAssetId && <label><span>Asset Filter</span><select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}><option value="">All assets</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} - {asset.asset_name ?? 'Unnamed asset'}</option>)}</select></label>}
          <label><span>Component Filter</span><input value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)} /></label>
          <label><span>CML/TML/Grid Filter</span><input value={gridFilter} onChange={(event) => setGridFilter(event.target.value)} /></label>
          <label><span>Method Filter</span><select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option value="">All methods</option>{METHOD_OPTIONS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label><span>Evidence State</span><select value={evidenceStateFilter} onChange={(event) => setEvidenceStateFilter(event.target.value)}><option value="">All</option><option value="linked">Evidence linked</option><option value="missing">Missing evidence</option><option value="critical_missing">Critical missing evidence</option></select></label>
        </div>
        <CompactDataTable
          rows={branchMeasurements}
          getRowKey={(measurement) => measurement.measurement_id}
          emptyTitle="No NDT measurements"
          emptyMessage="No measurements match the current filters."
          columns={[
            { header: 'Dataset', render: (measurement) => <Link href={`/ndt/${measurement.measurement_id}`}>{measurement.measurement_code ?? measurement.measurement_id}</Link> },
            { header: 'Asset', render: (measurement) => <Link href={`/assets/${measurement.asset_id}`}>{measurement.asset_id}</Link> },
            { header: 'Method', render: (measurement) => <span>{measurement.method}<br /><span className="muted-text">{measurement.component}</span></span> },
            { header: 'Status', render: (measurement) => <StatusBadge status={measurement.validation_status ?? 'pending_review'} /> },
            { header: 'Critical / Evidence', render: (measurement) => measurement.evidence_file_id ? <StatusBadge status="approved" label={measurement.is_critical ? 'critical linked' : 'linked'} /> : <StatusBadge status={measurement.is_critical ? 'blocked' : 'needs_review'} label={measurement.is_critical ? 'critical missing' : 'missing'} /> },
            { header: 'Review State', render: (measurement) => <StatusBadge status={measurement.reviewer_status ?? 'pending_review'} /> },
            { header: 'Action', className: 'pd-cell-actions', render: (measurement) => <button className="secondary-button" type="button" onClick={() => setSelectedMeasurement(measurement)}>Details</button> }
          ]}
        />
      </section>
    </>}

    <DetailDrawer
      open={entryDrawerOpen}
      title="Create NDT measurement"
      subtitle="Focused NDT entry. Backend validation and audit logging remain authoritative."
      status="draft"
      onClose={() => setEntryDrawerOpen(false)}
      tabs={[{
        id: 'overview',
        label: 'Overview',
        content: <form className="form-grid" onSubmit={createMeasurement}>
          <label><span>Asset</span><select name="asset_id" defaultValue={fixedAssetId ?? assetFilter} disabled={Boolean(fixedAssetId)} required><option value="">Select asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} - {asset.asset_name ?? 'Unnamed asset'}</option>)}</select></label>
          <label><span>Inspection Event ID</span><input name="inspection_event_id" /></label>
          <label><span>Component</span><input name="component" required /></label>
          <label><span>Shell Course No</span><input name="shell_course_no" type="number" min="0" /></label>
          <label><span>CML/TML ID</span><input name="cml_tml_id" /></label>
          <label><span>Grid Ref</span><input name="grid_ref" /></label>
          <label><span>Measured Thickness (mm)</span><input name="measured_thickness" type="number" step="0.001" required /></label>
          <label><span>Reading Date</span><input name="reading_date" type="date" required /></label>
          <label><span>Method</span><select name="method" defaultValue="UT">{METHOD_OPTIONS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label><span>Evidence</span><select name="evidence_file_id" defaultValue=""><option value="">No direct evidence</option>{assetEvidence.map((evidence) => <option key={evidence.evidence_id} value={evidence.evidence_id} disabled={isEvidenceBlocked(evidence)}>{evidence.evidence_code ?? evidence.evidence_id} - {evidence.file_name ?? 'evidence'}{isEvidenceBlocked(evidence) ? ' (blocked)' : ''}</option>)}</select></label>
          <label><span>Critical Record</span><select name="is_critical" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></label>
          <button className="primary-button wide-field" type="submit">Create NDT Measurement</button>
          <div className="wide-field"><ErrorList issues={issues} />{message && <div className="notice">{message}</div>}</div>
        </form>
      }]}
    />

    <DetailDrawer
      open={Boolean(selectedMeasurement)}
      title={selectedMeasurement?.measurement_code ?? selectedMeasurement?.measurement_id ?? 'NDT details'}
      subtitle={selectedMeasurement ? `${selectedMeasurement.asset_id} / ${selectedMeasurement.component}` : undefined}
      status={selectedMeasurement?.validation_status ?? selectedMeasurement?.reviewer_status}
      onClose={() => setSelectedMeasurement(null)}
      tabs={selectedMeasurement ? [
        {
          id: 'overview',
          label: 'Overview',
          content: <DetailGrid items={[{ label: 'Measurement ID', value: <code>{selectedMeasurement.measurement_id}</code> }, { label: 'Asset', value: selectedMeasurement.asset_id }, { label: 'Method', value: selectedMeasurement.method }, { label: 'Component', value: selectedMeasurement.component }, { label: 'Thickness', value: `${displayValue(selectedMeasurement.measured_thickness)} ${selectedMeasurement.measured_thickness_unit ?? 'mm'}` }, { label: 'Reading Date', value: dateValue(selectedMeasurement.reading_date) }]} />
        },
        {
          id: 'technical',
          label: 'Technical Data',
          content: <DetailGrid items={[{ label: 'Shell Course', value: displayValue(selectedMeasurement.shell_course_no) }, { label: 'CML/TML ID', value: displayValue(selectedMeasurement.cml_tml_id) }, { label: 'Grid Ref', value: displayValue(selectedMeasurement.grid_ref) }, { label: 'Elevation', value: `${displayValue(selectedMeasurement.elevation)} ${displayValue(selectedMeasurement.elevation_unit)}` }, { label: 'Orientation', value: displayValue(selectedMeasurement.orientation) }, { label: 'Confidence', value: displayValue(selectedMeasurement.confidence) }, { label: 'Extraction Source', value: displayValue(selectedMeasurement.extraction_source) }, { label: 'Validation Message', value: displayValue(selectedMeasurement.validation_message) }]} />
        },
        {
          id: 'evidence',
          label: 'Evidence',
          content: selectedMeasurement.evidence_file_id ? <Link className="secondary-button" href={`/evidence/${selectedMeasurement.evidence_file_id}`}>Open linked evidence</Link> : <StatusBadge status={selectedMeasurement.is_critical ? 'blocked' : 'needs_review'} label={selectedMeasurement.is_critical ? 'critical evidence missing' : 'evidence missing'} />
        },
        {
          id: 'gate',
          label: 'Gate Checklist',
          content: <DetailGrid items={[{ label: 'Validation Status', value: <StatusBadge status={selectedMeasurement.validation_status ?? 'pending_review'} /> }, { label: 'Reviewer Status', value: <StatusBadge status={selectedMeasurement.reviewer_status ?? 'pending_review'} /> }, { label: 'Critical Record', value: selectedMeasurement.is_critical ? 'yes' : 'no' }, { label: 'Evidence Gate', value: selectedMeasurement.evidence_file_id ? 'linked' : 'missing' }]} />
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          content: <Link className="secondary-button" href={`/audit-logs?entity_type=ndt_measurement&entity_id=${selectedMeasurement.measurement_id}`}>Open audit trail</Link>
        },
        {
          id: 'raw',
          label: 'Raw Metadata',
          content: <TechnicalJson value={selectedMeasurement} />
        }
      ] : []}
    />
  </main>;
}
