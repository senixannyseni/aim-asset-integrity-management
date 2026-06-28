'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';

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
type MeasurementInput = {
  asset_id: string;
  inspection_event_id: string;
  component: string;
  shell_course_no: string;
  cml_tml_id: string;
  grid_ref: string;
  elevation: string;
  elevation_unit: string;
  orientation: string;
  measured_thickness: string;
  measured_thickness_unit: string;
  reading_date: string;
  method: string;
  confidence: string;
  evidence_file_id: string;
  extraction_source: string;
  is_critical: string;
};
type BulkPreviewRow = { rowNumber: number; raw: Record<string, string>; payload: Record<string, unknown>; issues: ValidationIssue[] };
type ImportSummary = { createdCount: number; rejectedCount: number; auditLogId?: string; backendErrors: ValidationIssue[] };

type NdtDataRoomClientProps = { fixedAssetId?: string; assetScoped?: boolean };

const METHOD_OPTIONS = ['UT', 'MFL', 'CML', 'TML', 'visual', 'NDT map'];
const EXTRACTION_SOURCE_OPTIONS = ['manual', 'bulk_import', 'ai_staging', 'vendor_import'];
const CSV_COLUMNS = ['asset_id', 'inspection_event_id', 'component', 'shell_course_no', 'cml_tml_id', 'grid_ref', 'elevation', 'orientation', 'measured_thickness', 'reading_date', 'method', 'confidence', 'evidence_file_id', 'extraction_source'];

const emptyInput: MeasurementInput = {
  asset_id: '',
  inspection_event_id: '',
  component: '',
  shell_course_no: '',
  cml_tml_id: '',
  grid_ref: '',
  elevation: '',
  elevation_unit: 'm',
  orientation: '',
  measured_thickness: '',
  measured_thickness_unit: 'mm',
  reading_date: '',
  method: 'UT',
  confidence: '1',
  evidence_file_id: '',
  extraction_source: 'manual',
  is_critical: 'true'
};

function displayValue(value: unknown, fallback = '-'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

function fileSizeLabel(size?: number | null): string {
  if (!Number.isFinite(size ?? NaN)) return '-';
  const value = Number(size);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeMethod(value: string): string {
  const trimmed = value.trim();
  const match = METHOD_OPTIONS.find((method) => method.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocked', 'invalid', 'rejected', 'missing', 'error'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'needs_review', 'pending'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
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

function parseNumberField(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function measurementPayload(input: MeasurementInput, sourceOverride?: 'manual' | 'bulk_import'): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    asset_id: input.asset_id.trim(),
    component: input.component.trim(),
    measured_thickness: input.measured_thickness.trim(),
    measured_thickness_unit: input.measured_thickness_unit.trim() || 'mm',
    reading_date: input.reading_date.trim(),
    method: normalizeMethod(input.method),
    confidence: input.confidence.trim() || '1',
    extraction_source: (sourceOverride ?? input.extraction_source.trim()) || 'manual',
    is_critical: input.is_critical === 'true'
  };

  const optionalStrings: Array<keyof MeasurementInput> = ['inspection_event_id', 'cml_tml_id', 'grid_ref', 'orientation', 'evidence_file_id'];
  for (const field of optionalStrings) {
    const value = input[field].trim();
    if (value) payload[field] = value;
  }

  const shellCourseNo = parseNumberField(input.shell_course_no);
  if (shellCourseNo !== undefined) payload.shell_course_no = shellCourseNo;
  const elevation = parseNumberField(input.elevation);
  if (elevation !== undefined) {
    payload.elevation = elevation;
    payload.elevation_unit = input.elevation_unit.trim() || 'm';
  }

  return payload;
}

function validateInput(input: MeasurementInput, prefix = ''): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string, severity: 'error' | 'warning' = 'error') => issues.push({ field: `${prefix}${field}`, message, severity });

  if (!input.asset_id.trim()) add('asset_id', 'asset_id is required.');
  if (!input.component.trim()) add('component', 'component is required.');
  if (!input.measured_thickness.trim()) add('measured_thickness', 'measured_thickness is required.');
  const thickness = Number(input.measured_thickness);
  if (input.measured_thickness.trim() && (!Number.isFinite(thickness) || thickness <= 0)) add('measured_thickness', 'measured_thickness must be a positive number.');
  if (!input.reading_date.trim()) add('reading_date', 'reading_date is required.');
  if (input.reading_date.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(input.reading_date.trim())) add('reading_date', 'reading_date must use YYYY-MM-DD.');
  if (!input.method.trim()) add('method', 'method is required.');
  if (input.method.trim() && !METHOD_OPTIONS.some((method) => method.toLowerCase() === input.method.trim().toLowerCase())) add('method', `method should be one of: ${METHOD_OPTIONS.join(', ')}.`);
  const confidence = Number(input.confidence || '1');
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) add('confidence', 'confidence must be between 0 and 1.');
  if (!input.measured_thickness_unit.trim()) add('measured_thickness_unit', 'Measured thickness unit is required to avoid unit ambiguity.');
  if (input.is_critical === 'true' && !input.evidence_file_id.trim()) add('evidence_file_id', 'Critical NDT measurement has no evidence_file_id. Backend will keep the evidence gate blocked until evidence is linked.', 'warning');

  return issues;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function rowsFromCsv(text: string, fallbackAssetId: string): BulkPreviewRow[] {
  const rows = parseCsv(text);
  const headerRow = rows[0];
  if (!headerRow) return [];
  const headers = headerRow.map(normalizeHeader);
  return rows.slice(1).map((cells, index) => {
    const raw: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      raw[header] = cells[columnIndex] ?? '';
    });
    const input: MeasurementInput = {
      ...emptyInput,
      asset_id: raw.asset_id || fallbackAssetId,
      inspection_event_id: raw.inspection_event_id || raw.inspection_id || '',
      component: raw.component || '',
      shell_course_no: raw.shell_course_no || raw.course_no || '',
      cml_tml_id: raw.cml_tml_id || raw.cml_id || raw.tml_id || '',
      grid_ref: raw.grid_ref || raw.grid || '',
      elevation: raw.elevation || '',
      elevation_unit: raw.elevation_unit || 'm',
      orientation: raw.orientation || '',
      measured_thickness: raw.measured_thickness || raw.thickness || '',
      measured_thickness_unit: raw.measured_thickness_unit || raw.thickness_unit || 'mm',
      reading_date: raw.reading_date || raw.date || '',
      method: raw.method || 'UT',
      confidence: raw.confidence || '1',
      evidence_file_id: raw.evidence_file_id || raw.evidence_id || '',
      extraction_source: raw.extraction_source || 'bulk_import',
      is_critical: raw.is_critical || 'true'
    };
    return { rowNumber: index + 2, raw, payload: measurementPayload(input, 'bulk_import'), issues: validateInput(input, `row ${index + 2} `) };
  });
}

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}

function ErrorList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return <div className="error-list" role="alert">{issues.map((issue, index) => <p key={`${issue.field}-${issue.message}-${index}`}><strong>{issue.field}</strong>: {issue.message} {issue.severity === 'warning' ? '(warning)' : ''}</p>)}</div>;
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
  const [manualInput, setManualInput] = useState<MeasurementInput>({ ...emptyInput, asset_id: initialAssetId, extraction_source: 'manual' });
  const [assetFilter, setAssetFilter] = useState(initialAssetId);
  const [componentFilter, setComponentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [gridFilter, setGridFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [evidenceStateFilter, setEvidenceStateFilter] = useState(evidenceFilter ? 'linked' : '');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<BulkPreviewRow[]>([]);
  const [bulkIssues, setBulkIssues] = useState<ValidationIssue[]>([]);
  const [bulkSummary, setBulkSummary] = useState<ImportSummary | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const selectedAsset = useMemo(() => assets.find((asset) => asset.asset_id === (fixedAssetId ?? assetFilter)), [assets, assetFilter, fixedAssetId]);
  const assetEvidence = useMemo(() => evidenceFiles.filter((evidence) => !manualInput.asset_id || evidence.asset_id === manualInput.asset_id || !evidence.asset_id), [evidenceFiles, manualInput.asset_id]);
  const hasBulkBlockingErrors = bulkRows.some((row) => row.issues.some((issue) => issue.severity !== 'warning'));

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

  useEffect(() => {
    if (fixedAssetId) {
      setAssetFilter(fixedAssetId);
      setManualInput((current) => ({ ...current, asset_id: fixedAssetId }));
    }
  }, [fixedAssetId]);

  function updateManualField(field: keyof MeasurementInput, value: string) {
    setManualInput((current) => ({ ...current, [field]: value }));
  }

  const filteredMeasurements = useMemo(() => measurements.filter((measurement) => {
    if (fixedAssetId && measurement.asset_id !== fixedAssetId) return false;
    if (!fixedAssetId && assetFilter && measurement.asset_id !== assetFilter) return false;
    if (componentFilter && !measurement.component.toLowerCase().includes(componentFilter.toLowerCase())) return false;
    if (courseFilter && String(measurement.shell_course_no ?? '') !== courseFilter) return false;
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
  }), [measurements, fixedAssetId, assetFilter, componentFilter, courseFilter, gridFilter, methodFilter, evidenceFilter, evidenceStateFilter]);

  const groupedByMethod = useMemo(() => METHOD_OPTIONS.map((method) => ({ method, count: filteredMeasurements.filter((measurement) => measurement.method.toLowerCase() === method.toLowerCase()).length })).filter((item) => item.count > 0), [filteredMeasurements]);
  const gridRows = useMemo(() => filteredMeasurements.filter((measurement) => measurement.grid_ref || measurement.cml_tml_id), [filteredMeasurements]);

  async function createMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIssues([]);
    const validation = validateInput(manualInput);
    const blocking = validation.filter((issue) => issue.severity !== 'warning');
    if (blocking.length > 0) {
      setIssues(validation);
      return;
    }
    setIssues(validation.filter((issue) => issue.severity === 'warning'));

    const response = await apiFetch('/api/v1/ndt/measurements', {
      method: 'POST',
      body: JSON.stringify(measurementPayload(manualInput, 'manual'))
    });
    const payload = await response.json() as { data?: NdtMeasurement; auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      setIssues(payloadIssues(payload, 'NDT measurement create failed.'));
      setMessage(payload.error?.message ?? 'NDT measurement create failed.');
      return;
    }

    setMessage(`NDT measurement ${payload.data?.measurement_code ?? payload.data?.measurement_id ?? ''} created. Audit log: ${payload.auditLogId ?? 'created'}.`);
    setManualInput({ ...emptyInput, asset_id: fixedAssetId ?? assetFilter, extraction_source: 'manual' });
    await loadPageData();
  }

  async function handleBulkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setBulkFile(file);
    setBulkRows([]);
    setBulkIssues([]);
    setBulkSummary(null);
    if (!file) return;

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (extension === '.xlsx') {
      setBulkIssues([{ field: 'bulk_file', message: 'XLSX selection is shown for workflow visibility, but this frontend package does not add a heavy XLSX parser dependency. Convert the workbook to CSV for row preview and import.', severity: 'warning' }]);
      return;
    }
    if (extension !== '.csv') {
      setBulkIssues([{ field: 'bulk_file', message: 'Bulk import preview supports CSV. XLSX requires an existing parser dependency, which is not available in this frontend foundation.', severity: 'error' }]);
      return;
    }

    try {
      const text = await file.text();
      const parsedRows = rowsFromCsv(text, fixedAssetId ?? assetFilter);
      if (parsedRows.length === 0) {
        setBulkIssues([{ field: 'bulk_file', message: 'CSV has no data rows.', severity: 'error' }]);
        return;
      }
      setBulkRows(parsedRows);
      setBulkIssues(parsedRows.flatMap((row) => row.issues));
    } catch (error) {
      setBulkIssues([{ field: 'bulk_file', message: error instanceof Error ? error.message : 'CSV parsing failed.', severity: 'error' }]);
    }
  }

  async function commitBulkImport() {
    setBulkBusy(true);
    setBulkSummary(null);
    setBulkIssues([]);
    try {
      const frontendIssues = bulkRows.flatMap((row) => row.issues);
      const blocking = frontendIssues.filter((issue) => issue.severity !== 'warning');
      if (blocking.length > 0 || bulkRows.length === 0) {
        setBulkIssues(frontendIssues.length > 0 ? frontendIssues : [{ field: 'bulk_rows', message: 'No preview rows are ready to import.', severity: 'error' }]);
        return;
      }
      const response = await apiFetch('/api/v1/ndt/measurements/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows: bulkRows.map((row) => row.payload) })
      });
      const payload = await response.json() as { data?: { imported_count?: number; measurements?: NdtMeasurement[] }; auditLogId?: string } & ApiErrorPayload;
      if (!response.ok) {
        const backendErrors = payloadIssues(payload, 'Bulk import failed.');
        setBulkIssues(backendErrors);
        setBulkSummary({ createdCount: 0, rejectedCount: bulkRows.length, auditLogId: payload.auditLogId, backendErrors });
        return;
      }
      const createdCount = payload.data?.imported_count ?? payload.data?.measurements?.length ?? 0;
      setBulkSummary({ createdCount, rejectedCount: Math.max(0, bulkRows.length - createdCount), auditLogId: payload.auditLogId, backendErrors: [] });
      setMessage(`Bulk import completed: ${createdCount} row(s) created. Audit log: ${payload.auditLogId ?? 'created'}.`);
      await loadPageData();
    } finally {
      setBulkBusy(false);
    }
  }

  function cancelBulkImport() {
    setBulkFile(null);
    setBulkRows([]);
    setBulkIssues([]);
    setBulkSummary(null);
  }

  function exportCsv() {
    const headers = ['measurement_id', 'asset_id', 'inspection_event_id', 'component', 'shell_course_no', 'cml_tml_id', 'grid_ref', 'elevation', 'orientation', 'measured_thickness', 'reading_date', 'method', 'confidence', 'evidence_file_id', 'extraction_source', 'reviewer_status', 'validation_status', 'created_at', 'updated_at'];
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
    <header className="page-header">
      <div>
        <p className="eyebrow">RC4-D</p>
        <h1>{assetScoped ? 'Asset NDT Measurements' : 'NDT Data Room'}</h1>
        <p>{assetScoped ? `NDT measurements filtered to ${selectedAsset?.tank_tag ?? fixedAssetId}.` : 'Manual entry, CSV bulk import preview, evidence linkage visibility, and measurement detail access.'}</p>
      </div>
      <div className="action-row">
        <Link className="secondary-button" href="/assets">Assets</Link>
        <Link className="secondary-button" href="/evidence">Evidence Repository</Link>
        {fixedAssetId && <Link className="secondary-button" href={`/assets/${fixedAssetId}`}>Back to Asset</Link>}
      </div>
    </header>

    {loading && <StatusPanel type="loading" title="Loading NDT data" message="Loading NDT measurements, assets, and evidence metadata from AIM." />}
    {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view or change NDT measurements." />}
    {pageError && <StatusPanel type="error" title="NDT data room error" message={pageError} />}

    {!loading && !permissionDenied && !pageError && <>
      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createMeasurement}>
          <div className="panel-heading">
            <h2>Manual NDT Entry</h2>
            <p>Creates one NDT measurement through the existing AIM API. This UI does not approve measurements or calculate engineering status.</p>
          </div>
          <label><span>Asset</span><select name="asset_id" value={manualInput.asset_id} disabled={Boolean(fixedAssetId)} onChange={(event) => updateManualField('asset_id', event.target.value)} required><option value="">Select asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} — {asset.asset_name ?? 'Unnamed asset'}</option>)}</select></label>
          <label><span>Inspection Event ID</span><input value={manualInput.inspection_event_id} onChange={(event) => updateManualField('inspection_event_id', event.target.value)} placeholder="optional inspection_event_id" /></label>
          <label><span>Component</span><input value={manualInput.component} onChange={(event) => updateManualField('component', event.target.value)} placeholder="shell / floor / roof / nozzle" required /></label>
          <label><span>Shell Course No</span><input value={manualInput.shell_course_no} onChange={(event) => updateManualField('shell_course_no', event.target.value)} type="number" min="0" placeholder="1" /></label>
          <label><span>CML/TML ID</span><input value={manualInput.cml_tml_id} onChange={(event) => updateManualField('cml_tml_id', event.target.value)} placeholder="CML-001" /></label>
          <label><span>Grid Ref</span><input value={manualInput.grid_ref} onChange={(event) => updateManualField('grid_ref', event.target.value)} placeholder="A-01" /></label>
          <label><span>Elevation</span><input value={manualInput.elevation} onChange={(event) => updateManualField('elevation', event.target.value)} type="number" step="0.001" placeholder="2.5" /></label>
          <label><span>Elevation Unit</span><select value={manualInput.elevation_unit} onChange={(event) => updateManualField('elevation_unit', event.target.value)}><option value="m">m</option><option value="mm">mm</option><option value="cm">cm</option></select></label>
          <label><span>Orientation</span><input value={manualInput.orientation} onChange={(event) => updateManualField('orientation', event.target.value)} placeholder="90 deg" /></label>
          <label><span>Measured Thickness</span><input value={manualInput.measured_thickness} onChange={(event) => updateManualField('measured_thickness', event.target.value)} type="number" step="0.001" required /></label>
          <label><span>Thickness Unit</span><select value={manualInput.measured_thickness_unit} onChange={(event) => updateManualField('measured_thickness_unit', event.target.value)}><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option><option value="in">in</option></select></label>
          <label><span>Reading Date</span><input value={manualInput.reading_date} onChange={(event) => updateManualField('reading_date', event.target.value)} type="date" required /></label>
          <label><span>Method</span><select value={manualInput.method} onChange={(event) => updateManualField('method', event.target.value)}>{METHOD_OPTIONS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label><span>Confidence</span><input value={manualInput.confidence} onChange={(event) => updateManualField('confidence', event.target.value)} type="number" min="0" max="1" step="0.01" /></label>
          <label><span>Evidence</span><select value={manualInput.evidence_file_id} onChange={(event) => updateManualField('evidence_file_id', event.target.value)}><option value="">No direct evidence</option>{assetEvidence.map((evidence) => <option key={evidence.evidence_id} value={evidence.evidence_id} disabled={isEvidenceBlocked(evidence)}>{evidence.evidence_code ?? evidence.evidence_id} — {evidence.file_name ?? 'evidence'}{isEvidenceBlocked(evidence) ? ' (blocked)' : ''}</option>)}</select></label>
          <label><span>Extraction Source</span><select value={manualInput.extraction_source} onChange={(event) => updateManualField('extraction_source', event.target.value)}>{EXTRACTION_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
          <label><span>Critical Record</span><select value={manualInput.is_critical} onChange={(event) => updateManualField('is_critical', event.target.value)}><option value="true">true</option><option value="false">false</option></select></label>
          <div className="wide-field"><button className="primary-button" type="submit">Create NDT Measurement</button></div>
          <div className="wide-field"><ErrorList issues={issues} />{message && <div className="notice">{message}</div>}</div>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Bulk Import Preview</h2>
            <p>CSV rows are parsed and validated before commit. XLSX import is not parsed unless the project adds an approved parser dependency.</p>
          </div>
          <label><span>CSV/XLSX file</span><input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleBulkFile(event)} /></label>
          {bulkFile && <dl className="metadata-grid"><dt>File Name</dt><dd>{bulkFile.name}</dd><dt>File Size</dt><dd>{fileSizeLabel(bulkFile.size)}</dd><dt>File Type</dt><dd>{displayValue(bulkFile.type, 'browser did not report MIME')}</dd><dt>Expected Columns</dt><dd>{CSV_COLUMNS.join(', ')}</dd></dl>}
          <ErrorList issues={bulkIssues} />
          {bulkRows.length > 0 && <><div className="notice"><strong>{bulkRows.length}</strong> data row(s) parsed. Errors must be fixed before import. Warnings remain visible for engineering follow-up.</div><div className="table-wrap"><table><thead><tr><th>Row</th><th>Asset</th><th>Component</th><th>Thickness</th><th>Date</th><th>Method</th><th>Evidence</th><th>Validation</th></tr></thead><tbody>{bulkRows.slice(0, 20).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{displayValue(row.payload.asset_id)}</td><td>{displayValue(row.payload.component)}</td><td>{displayValue(row.payload.measured_thickness)} {displayValue(row.payload.measured_thickness_unit, 'mm')}</td><td>{displayValue(row.payload.reading_date)}</td><td>{displayValue(row.payload.method)}</td><td>{row.payload.evidence_file_id ? 'linked' : 'missing'}</td><td>{row.issues.length === 0 ? <span className="badge">ready</span> : row.issues.map((issue) => <span key={`${row.rowNumber}-${issue.field}-${issue.message}`} className={issue.severity === 'warning' ? 'badge badge-warning' : 'badge badge-danger'}>{issue.field}</span>)}</td></tr>)}</tbody></table></div><div className="action-row pagination-row"><button className="primary-button" type="button" disabled={bulkBusy || hasBulkBlockingErrors} onClick={() => void commitBulkImport()}>{bulkBusy ? 'Importing...' : 'Commit Bulk Import'}</button><button className="secondary-button" type="button" onClick={cancelBulkImport}>Cancel Import</button></div></>}
          {bulkSummary && <div className="notice"><strong>Import result:</strong> {bulkSummary.createdCount} created, {bulkSummary.rejectedCount} rejected/invalid. Audit log: {bulkSummary.auditLogId ?? 'not returned'}.</div>}
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>NDT Measurements</h2>
            <p>Stored measurements only. Status badges display existing validation/reviewer values; no API/ASME calculations are performed.</p>
          </div>
          <div className="action-row"><button className="secondary-button" type="button" onClick={exportCsv}>Export CSV</button></div>
        </div>
        <div className="form-grid">
          {!fixedAssetId && <label><span>Asset Filter</span><select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)}><option value="">All assets</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} — {asset.asset_name ?? 'Unnamed asset'}</option>)}</select></label>}
          <label><span>Component Filter</span><input value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)} placeholder="shell" /></label>
          <label><span>Shell Course Filter</span><input value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} placeholder="1" /></label>
          <label><span>CML/TML/Grid Filter</span><input value={gridFilter} onChange={(event) => setGridFilter(event.target.value)} placeholder="CML-001 or A-01" /></label>
          <label><span>Method Filter</span><select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option value="">All methods</option>{METHOD_OPTIONS.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label><span>Evidence State</span><select value={evidenceStateFilter} onChange={(event) => setEvidenceStateFilter(event.target.value)}><option value="">All</option><option value="linked">Evidence linked</option><option value="missing">Missing evidence</option><option value="critical_missing">Critical missing evidence</option></select></label>
        </div>
        {filteredMeasurements.length === 0 ? <StatusPanel type="empty" title="No NDT measurements" message="No measurements match the current filters." /> : <div className="table-wrap"><table><thead><tr><th>Measurement</th><th>Asset</th><th>Component / Course</th><th>CML/TML/Grid</th><th>Thickness</th><th>Date / Method</th><th>Evidence</th><th>Status</th></tr></thead><tbody>{filteredMeasurements.map((measurement) => <tr key={measurement.measurement_id}><td><Link href={`/ndt/${measurement.measurement_id}`}>{measurement.measurement_code ?? measurement.measurement_id}</Link></td><td><Link href={`/assets/${measurement.asset_id}`}>{measurement.asset_id}</Link>{' '}<Link href={`/assets/${measurement.asset_id}/ndt`} className="muted-text">asset NDT</Link></td><td>{measurement.component}<br /><span className="muted-text">Course {displayValue(measurement.shell_course_no)}</span></td><td>{displayValue(measurement.cml_tml_id)}<br /><span className="muted-text">Grid {displayValue(measurement.grid_ref)}</span></td><td>{displayValue(measurement.measured_thickness)} {measurement.measured_thickness_unit ?? 'mm'}</td><td>{dateValue(measurement.reading_date)}<br /><span className="badge">{measurement.method}</span></td><td>{measurement.evidence_file_id ? <Link href={`/evidence/${measurement.evidence_file_id}`}>linked</Link> : <span className={measurement.is_critical ? 'badge badge-danger' : 'badge badge-warning'}>{measurement.is_critical ? 'critical missing' : 'missing'}</span>}</td><td><span className={badgeClass(measurement.validation_status)}>{displayValue(measurement.validation_status)}</span><br /><span className={badgeClass(measurement.reviewer_status)}>{displayValue(measurement.reviewer_status)}</span></td></tr>)}</tbody></table></div>}
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>UT/MFL/Method Grouping</h2><p>Display-only grouping based on stored method values.</p></div>
          {groupedByMethod.length === 0 ? <StatusPanel type="empty" title="No method grouping" message="No measurements are available for the current filters." /> : <div className="table-wrap"><table><thead><tr><th>Method</th><th>Count</th></tr></thead><tbody>{groupedByMethod.map((item) => <tr key={item.method}><td>{item.method}</td><td>{item.count}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>CML/TML Grid View</h2><p>Display-only grid table where CML/TML or grid references exist.</p></div>
          {gridRows.length === 0 ? <StatusPanel type="empty" title="No CML/TML grid rows" message="No grid_ref or cml_tml_id values are available for the current filters." /> : <div className="table-wrap"><table><thead><tr><th>CML/TML</th><th>Grid</th><th>Component</th><th>Thickness</th><th>Evidence</th><th>Status</th></tr></thead><tbody>{gridRows.map((measurement) => <tr key={`grid-${measurement.measurement_id}`}><td>{displayValue(measurement.cml_tml_id)}</td><td>{displayValue(measurement.grid_ref)}</td><td>{measurement.component}</td><td>{displayValue(measurement.measured_thickness)} {measurement.measured_thickness_unit ?? 'mm'}</td><td>{measurement.evidence_file_id ? <span className="badge">linked</span> : <span className="badge badge-warning">missing</span>}</td><td><span className={badgeClass(measurement.validation_status)}>{displayValue(measurement.validation_status)}</span></td></tr>)}</tbody></table></div>}
        </section>
      </section>
    </>}
  </main>;
}
