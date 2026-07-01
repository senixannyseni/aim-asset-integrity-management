'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';
import { CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type ValidationIssue = { field: string; message: string; severity?: string };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: ValidationIssue[] | Record<string, unknown> } };
type AssetOption = { asset_id: string; tank_tag?: string | null; asset_name?: string | null };
type EvidenceFile = {
  evidence_id: string;
  evidence_code?: string | null;
  file_name?: string | null;
  original_filename?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  asset_id?: string | null;
  inspection_id?: string | null;
  inspection_event_id?: string | null;
  method?: string | null;
  component?: string | null;
  location?: string | null;
  page_or_sheet_ref?: string | null;
  uploaded_by?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
  checksum?: string | null;
  checksum_sha256?: string | null;
  upload_status?: string | null;
  malware_scan_status?: string | null;
  access_status?: string | null;
  status?: string | null;
  evidence_status?: string | null;
  storage_provider?: string | null;
  storage_bucket?: string | null;
  file_size_bytes?: number | null;
  size_bytes?: number | null;
};
type UploadMetadata = {
  asset_id: string;
  inspection_id: string;
  method: string;
  component: string;
  location: string;
  inspection_date: string;
  page_or_sheet_ref: string;
  description: string;
};
type UploadUrlResponse = { data?: { upload_session_id?: string; upload_url?: string; expires_at?: string; required_headers?: Record<string, string> } } & ApiErrorPayload;
type CompleteUploadResponse = { data?: EvidenceFile; auditLogId?: string } & ApiErrorPayload;

const MAX_CLIENT_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx', '.dwg', '.dxf', '.stl', '.zip'];
const fallbackMimeByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.dwg': 'application/octet-stream',
  '.dxf': 'application/octet-stream',
  '.stl': 'application/octet-stream',
  '.zip': 'application/zip'
};

function safeString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

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

function evidenceFileName(evidence: EvidenceFile): string {
  return evidence.file_name ?? evidence.original_filename ?? '-';
}

function evidenceChecksum(evidence: EvidenceFile): string {
  return evidence.checksum ?? evidence.checksum_sha256 ?? '-';
}

function evidenceSize(evidence: EvidenceFile): number | null | undefined {
  return evidence.size_bytes ?? evidence.file_size_bytes;
}

function extensionForFileName(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

function mimeForFile(file: File): string {
  return file.type || fallbackMimeByExtension[extensionForFileName(file.name)] || 'application/octet-stream';
}

function isBlockedEvidence(evidence: Pick<EvidenceFile, 'malware_scan_status' | 'access_status' | 'status' | 'evidence_status'>): boolean {
  const scan = String(evidence.malware_scan_status ?? '').toLowerCase();
  const access = String(evidence.access_status ?? '').toLowerCase();
  const status = String(evidence.status ?? evidence.evidence_status ?? '').toLowerCase();
  return ['infected', 'blocked', 'quarantined', 'scan_failed'].includes(scan) || access === 'blocked' || ['deleted', 'delete_requested'].includes(status);
}

function issuesFromPayload(payload: ApiErrorPayload, field: string, message: string): ValidationIssue[] {
  return Array.isArray(payload.error?.details) ? payload.error.details : [{ field, message: payload.error?.message ?? message, severity: 'error' }];
}

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}

function ErrorList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return <div className="error-list" role="alert">{issues.map((issue) => <p key={`${issue.field}-${issue.message}`}><strong>{issue.field}</strong>: {issue.message}</p>)}</div>;
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function uploadWithProgress(input: { url: string; file: File; headers: Record<string, string>; onProgress: (progress: number) => void }): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', input.url);
    for (const [key, value] of Object.entries(input.headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) input.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? (input.onProgress(100), resolve()) : reject(new Error(`Object-storage upload failed with HTTP ${xhr.status}.`));
    xhr.onerror = () => reject(new Error('Object-storage upload failed before completion.'));
    xhr.send(input.file);
  });
}

function EvidenceRepositoryPageClient() {
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('asset_id') ?? '';
  const initialInspectionId = searchParams.get('inspection_id') ?? searchParams.get('inspection_event_id') ?? '';
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileChecksum, setSelectedFileChecksum] = useState('');
  const [metadata, setMetadata] = useState<UploadMetadata>({ asset_id: initialAssetId, inspection_id: initialInspectionId, method: '', component: '', location: '', inspection_date: '', page_or_sheet_ref: '', description: '' });
  const [assetFilter, setAssetFilter] = useState(initialAssetId);
  const [inspectionFilter, setInspectionFilter] = useState(initialInspectionId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('idle');
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceFile | null>(null);

  const visibleEvidence = useMemo(() => {
    const query = search.trim().toLowerCase();
    return evidenceFiles.filter((evidence) => {
      const inspectionText = String(evidence.inspection_event_id ?? evidence.inspection_id ?? '');
      if (inspectionFilter && !inspectionText.includes(inspectionFilter)) return false;
      if (!query) return true;
      return [
        evidence.evidence_id,
        evidence.evidence_code,
        evidence.file_name,
        evidence.original_filename,
        evidence.asset_id,
        evidence.method,
        evidence.component,
        evidence.location,
        evidence.page_or_sheet_ref,
        evidence.upload_status,
        evidence.malware_scan_status
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    });
  }, [evidenceFiles, inspectionFilter, search]);

  const evidenceSummary = useMemo(() => {
    const blocked = evidenceFiles.filter(isBlockedEvidence).length;
    const verified = evidenceFiles.filter((evidence) => ['verified', 'approved', 'complete', 'completed'].includes(String(evidence.status ?? evidence.upload_status ?? '').toLowerCase())).length;
    const pendingScan = evidenceFiles.filter((evidence) => !evidence.malware_scan_status || String(evidence.malware_scan_status).toLowerCase().includes('pending')).length;
    return { total: evidenceFiles.length, blocked, verified, pendingScan };
  }, [evidenceFiles]);

  async function loadPageData(assetId = assetFilter) {
    setLoading(true);
    setPermissionDenied(false);
    setPageError(null);
    try {
      const query = new URLSearchParams();
      if (assetId) query.set('asset_id', assetId);
      const [assetResponse, evidenceResponse] = await Promise.all([
        apiFetch('/api/v1/assets', { cache: 'no-store' }),
        apiFetch(`/api/v1/evidence${query.toString() ? `?${query}` : ''}`, { cache: 'no-store' })
      ]);
      const assetPayload = await assetResponse.json() as { data?: AssetOption[] } & ApiErrorPayload;
      const evidencePayload = await evidenceResponse.json() as { data?: EvidenceFile[] } & ApiErrorPayload;
      if ([401, 403].includes(assetResponse.status) || [401, 403].includes(evidenceResponse.status)) {
        setPermissionDenied(true);
        setAssets([]);
        setEvidenceFiles([]);
        return;
      }
      if (!assetResponse.ok) throw new Error(assetPayload.error?.message ?? 'Asset options could not be loaded.');
      if (!evidenceResponse.ok) throw new Error(evidencePayload.error?.message ?? 'Evidence repository could not be loaded.');
      setAssets(assetPayload.data ?? []);
      setEvidenceFiles(evidencePayload.data ?? []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Evidence repository could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData(initialAssetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateMetadata(field: keyof UploadMetadata, value: string) {
    setMetadata((current) => ({ ...current, [field]: value }));
    if (field === 'asset_id') setAssetFilter(value);
  }

  function validateSelectedFile(file: File | null = selectedFile): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!file) return [{ field: 'file', message: 'Select an evidence file before requesting an upload URL.', severity: 'error' }];
    const extension = extensionForFileName(file.name);
    if (!extension || !supportedExtensions.includes(extension)) issues.push({ field: 'file_extension', message: `Unsupported file extension ${extension || '(none)'}.`, severity: 'error' });
    if (file.size <= 0) issues.push({ field: 'file_size_bytes', message: 'File size must be greater than zero bytes.', severity: 'error' });
    if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) issues.push({ field: 'file_size_bytes', message: `File exceeds client-side limit of ${fileSizeLabel(MAX_CLIENT_FILE_SIZE_BYTES)}.`, severity: 'error' });
    return issues;
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    setErrors([]);
    setMessage(null);
    setSelectedFileChecksum('');
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (!file) return;
    const validation = validateSelectedFile(file);
    if (validation.length) {
      setErrors(validation);
      return;
    }
    try {
      setUploadStage('calculating-checksum');
      setSelectedFileChecksum(await sha256Hex(file));
      setUploadStage('ready');
    } catch {
      setUploadStage('checksum-failed');
      setErrors([{ field: 'checksum_sha256', message: 'Browser could not calculate SHA-256 checksum.', severity: 'error' }]);
    }
  }

  function validateUploadMetadata(): ValidationIssue[] {
    const issues = validateSelectedFile(selectedFile);
    for (const field of ['asset_id', 'method', 'component', 'inspection_date'] as Array<keyof UploadMetadata>) {
      if (!metadata[field]) issues.push({ field, message: `${field} is required for evidence metadata.`, severity: 'error' });
    }
    if (metadata.inspection_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(metadata.inspection_id)) {
      issues.push({ field: 'inspection_id', message: 'inspection_id must be a UUID when provided.', severity: 'error' });
    }
    if (!selectedFileChecksum) issues.push({ field: 'checksum_sha256', message: 'SHA-256 checksum must be calculated before requesting upload URL.', severity: 'error' });
    return issues;
  }

  async function submitObjectStorageUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const validationIssues = validateUploadMetadata();
    if (validationIssues.length || !selectedFile) {
      setErrors(validationIssues);
      setMessage('Please correct the evidence upload fields.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const mimeType = mimeForFile(selectedFile);
      setUploadStage('requesting-upload-url');
      const uploadResponse = await apiFetch('/api/v1/evidence/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: metadata.asset_id,
          inspection_id: metadata.inspection_id || undefined,
          filename: selectedFile.name,
          mime_type: mimeType,
          size_bytes: selectedFile.size,
          checksum_sha256: selectedFileChecksum,
          method: metadata.method,
          component: metadata.component,
          location: metadata.location,
          inspection_date: metadata.inspection_date,
          page_or_sheet_ref: metadata.page_or_sheet_ref,
          description: metadata.description
        })
      });
      const uploadPayload = await uploadResponse.json() as UploadUrlResponse;
      if (!uploadResponse.ok || !uploadPayload.data?.upload_url || !uploadPayload.data.upload_session_id) {
        setErrors(issuesFromPayload(uploadPayload, 'upload-url', 'Upload URL request failed.'));
        setMessage(uploadPayload.error?.message ?? 'Upload URL request failed.');
        return;
      }
      setUploadStage('uploading-object');
      await uploadWithProgress({ url: uploadPayload.data.upload_url, file: selectedFile, headers: uploadPayload.data.required_headers ?? { 'Content-Type': mimeType }, onProgress: setUploadProgress });
      setUploadStage('completing-upload');
      const completeResponse = await apiFetch('/api/v1/evidence/complete-upload', {
        method: 'POST',
        body: JSON.stringify({
          upload_session_id: uploadPayload.data.upload_session_id,
          checksum_sha256: selectedFileChecksum,
          asset_id: metadata.asset_id,
          inspection_id: metadata.inspection_id || undefined,
          method: metadata.method,
          component: metadata.component,
          location: metadata.location,
          inspection_date: metadata.inspection_date,
          page_or_sheet_ref: metadata.page_or_sheet_ref,
          description: metadata.description
        })
      });
      const completePayload = await completeResponse.json() as CompleteUploadResponse;
      if (!completeResponse.ok) {
        setErrors(issuesFromPayload(completePayload, 'complete-upload', 'Complete upload failed.'));
        setMessage(completePayload.error?.message ?? 'Complete upload failed.');
        return;
      }
      setUploadStage('completed');
      setUploadProgress(100);
      setUploadDrawerOpen(false);
      setMessage(`Evidence ${completePayload.data?.evidence_code ?? completePayload.data?.evidence_id ?? 'record'} completed through object-storage upload flow.`);
      setSelectedFile(null);
      setSelectedFileChecksum('');
      const fileInput = document.getElementById('evidence-file-picker') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await loadPageData(metadata.asset_id);
    } catch (error) {
      setUploadStage('failed');
      setMessage(error instanceof Error ? error.message : 'Object-storage upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function openEvidence(evidence: EvidenceFile) {
    setErrors([]);
    setMessage(null);
    if (isBlockedEvidence(evidence)) {
      setErrors([{ field: 'malware_scan_status', message: 'Blocked/infected evidence cannot be opened from the frontend.', severity: 'error' }]);
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidence.evidence_id}/download-url`, { cache: 'no-store' });
    const payload = await response.json() as { data?: { download_url?: string; signed_url?: string } } & ApiErrorPayload;
    if (!response.ok) {
      setErrors(issuesFromPayload(payload, 'download-url', 'Could not create audited evidence access URL.'));
      setMessage(payload.error?.message ?? 'Could not create audited evidence access URL.');
      return;
    }
    const url = payload.data?.download_url ?? payload.data?.signed_url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    setMessage('Audited evidence access URL created by AIM. Signed URL is opened but not displayed.');
  }

  async function legacyRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const formData = new FormData(event.currentTarget);
    const body = {
      asset_id: safeString(formData.get('legacy_asset_id')),
      file_name: safeString(formData.get('legacy_file_name')),
      file_type: safeString(formData.get('legacy_file_type')),
      mime_type: safeString(formData.get('legacy_mime_type')),
      file_size_bytes: Number(safeString(formData.get('legacy_file_size_bytes')) || 0),
      checksum: safeString(formData.get('legacy_checksum')),
      inspection_date: safeString(formData.get('legacy_inspection_date')),
      method: safeString(formData.get('legacy_method')),
      component: safeString(formData.get('legacy_component')),
      location: safeString(formData.get('legacy_location')),
      page_or_sheet_ref: safeString(formData.get('legacy_page_or_sheet_ref'))
    };
    const response = await apiFetch('/api/v1/evidence/upload', { method: 'POST', body: JSON.stringify(body) });
    const payload = await response.json() as { data?: EvidenceFile } & ApiErrorPayload;
    if (!response.ok) {
      setErrors(issuesFromPayload(payload, 'legacy-upload', 'Legacy/manual evidence registration failed.'));
      setMessage(payload.error?.message ?? 'Legacy/manual evidence registration failed.');
      return;
    }
    setUploadDrawerOpen(false);
    setMessage(`Legacy/manual evidence ${payload.data?.evidence_code ?? payload.data?.evidence_id ?? 'record'} registered. This did not upload a new object-storage file.`);
    event.currentTarget.reset();
    await loadPageData(body.asset_id);
  }

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="RC4-C"
        title="Evidence Repository"
        description="Browse evidence by code, file, type, status, linked entity, and upload date. Checksums and object-storage metadata stay in detail drawers."
        status={evidenceSummary.blocked > 0 ? 'blocked' : 'pending_review'}
        actions={(
          <>
            <button className="primary-button" type="button" onClick={() => setUploadDrawerOpen(true)}>Upload Evidence</button>
            <Link className="secondary-button" href="/assets">Assets</Link>
            <Link className="secondary-button" href="/ndt">NDT</Link>
            <Link className="secondary-button" href="/reports">Reports</Link>
          </>
        )}
      />

      {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view or upload evidence. Backend RBAC is authoritative." />}
      {pageError && <StatusPanel type="error" title="Evidence repository error" message={pageError} />}

      {!permissionDenied && !pageError && (
        <>
          <section className="pd-kpi-grid" aria-label="Evidence summary">
            <KpiCard title="Evidence Files" value={evidenceSummary.total} helper="metadata records" />
            <KpiCard title="Verified / Complete" value={evidenceSummary.verified} helper="backend-owned state" status="approved" />
            <KpiCard title="Pending Scan" value={evidenceSummary.pendingScan} helper="requires access follow-up" status="pending_review" />
            <KpiCard title="Blocked" value={evidenceSummary.blocked} helper="safety-critical access state" status={evidenceSummary.blocked > 0 ? 'blocked' : 'approved'} />
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Evidence Files</h2>
                <p>Original files remain in object storage. Open a drawer for checksum, source reference, technical metadata, and audit links.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => void loadPageData()}>Refresh</button>
            </div>
            <div className="search-row">
              <label className="wide-field"><span>Asset Filter</span><select value={assetFilter} onChange={(event) => { setAssetFilter(event.target.value); void loadPageData(event.target.value); }}><option value="">All assets</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} - {asset.asset_name ?? 'asset'}</option>)}</select></label>
              <label className="wide-field"><span>Inspection / Event Filter</span><input value={inspectionFilter} onChange={(event) => setInspectionFilter(event.target.value)} /></label>
              <label className="wide-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="code, file, method, component" /></label>
            </div>
            {message && <div className="notice">{message}</div>}
            <ErrorList issues={errors} />
            {loading ? (
              <StatusPanel type="loading" title="Loading evidence" message="Loading evidence metadata from AIM." />
            ) : (
              <CompactDataTable
                rows={visibleEvidence}
                getRowKey={(evidence) => evidence.evidence_id}
                emptyTitle="No evidence"
                emptyMessage="No evidence records match the current filters."
                columns={[
                  { header: 'Evidence Code', render: (evidence) => <Link href={`/evidence/${evidence.evidence_id}`}>{evidence.evidence_code ?? evidence.evidence_id}</Link> },
                  { header: 'File Name', render: (evidence) => evidenceFileName(evidence) },
                  { header: 'Type', render: (evidence) => displayValue(evidence.file_type ?? evidence.mime_type) },
                  { header: 'Status', render: (evidence) => <span><StatusBadge status={isBlockedEvidence(evidence) ? 'blocked' : evidence.status ?? evidence.upload_status} /><br /><StatusBadge status={evidence.malware_scan_status ?? 'pending_review'} /></span> },
                  { header: 'Linked Entity', render: (evidence) => <span>{displayValue(evidence.asset_id)}<br /><span className="muted-text">{displayValue(evidence.inspection_event_id ?? evidence.inspection_id)}</span></span> },
                  { header: 'Uploaded', render: (evidence) => dateValue(evidence.uploaded_at ?? evidence.created_at) },
                  { header: 'Action', className: 'pd-cell-actions', render: (evidence) => <button className="secondary-button" type="button" onClick={() => setSelectedEvidence(evidence)}>View details</button> }
                ]}
              />
            )}
          </section>
        </>
      )}

      <DetailDrawer
        open={uploadDrawerOpen}
        title="Upload evidence"
        subtitle="Focused upload and metadata capture. Signed URLs and raw object keys are not displayed."
        status="pending_review"
        onClose={() => setUploadDrawerOpen(false)}
        tabs={[
          {
            id: 'upload',
            label: 'Overview',
            content: (
              <form className="form-grid" onSubmit={submitObjectStorageUpload}>
                <label className="wide-field"><span>Evidence File</span><input id="evidence-file-picker" type="file" onChange={onFileSelected} accept={supportedExtensions.join(',')} required /></label>
                {selectedFile && <div className="notice wide-field"><p><strong>File:</strong> {selectedFile.name}</p><p><strong>Size:</strong> {fileSizeLabel(selectedFile.size)} | <strong>MIME:</strong> {mimeForFile(selectedFile)} | <strong>Extension:</strong> {extensionForFileName(selectedFile.name) || '-'}</p><p><strong>SHA-256:</strong> {selectedFileChecksum || uploadStage}</p></div>}
                <label><span>Asset</span><select value={metadata.asset_id} onChange={(event) => updateMetadata('asset_id', event.target.value)} required><option value="">Select asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} - {asset.asset_name ?? 'asset'}</option>)}</select></label>
                <label><span>Inspection / Event ID</span><input value={metadata.inspection_id} onChange={(event) => updateMetadata('inspection_id', event.target.value)} placeholder="Optional UUID" /></label>
                <label><span>Method</span><input value={metadata.method} onChange={(event) => updateMetadata('method', event.target.value)} required /></label>
                <label><span>Component</span><input value={metadata.component} onChange={(event) => updateMetadata('component', event.target.value)} required /></label>
                <label><span>Location</span><input value={metadata.location} onChange={(event) => updateMetadata('location', event.target.value)} /></label>
                <label><span>Inspection Date</span><input type="date" value={metadata.inspection_date} onChange={(event) => updateMetadata('inspection_date', event.target.value)} required /></label>
                <label><span>Page or Sheet Ref</span><input value={metadata.page_or_sheet_ref} onChange={(event) => updateMetadata('page_or_sheet_ref', event.target.value)} /></label>
                <label><span>Description / Notes</span><input value={metadata.description} onChange={(event) => updateMetadata('description', event.target.value)} /></label>
                <div className="wide-field upload-progress" aria-live="polite"><div className="row-between"><span><strong>Upload status:</strong> {uploadStage}</span><span>{uploadProgress}%</span></div><progress value={uploadProgress} max={100}>{uploadProgress}%</progress></div>
                <button className="primary-button wide-field" type="submit" disabled={uploading || uploadStage === 'calculating-checksum'}>{uploading ? 'Uploading Evidence...' : 'Upload Evidence via Object Storage'}</button>
              </form>
            )
          },
          {
            id: 'legacy',
            label: 'Technical Data',
            content: (
              <form className="form-grid" onSubmit={legacyRegister}>
                <div className="wide-field"><p className="muted-text">Legacy fallback registers metadata only and does not upload a new object-storage file.</p></div>
                <label><span>Asset</span><select name="legacy_asset_id" defaultValue={metadata.asset_id || assets[0]?.asset_id || ''} required>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag ?? asset.asset_id} - {asset.asset_name ?? 'asset'}</option>)}</select></label>
                <label><span>File Name</span><input name="legacy_file_name" required /></label>
                <label><span>File Type</span><select name="legacy_file_type" defaultValue="PDF" required>{['PDF', 'XLSX', 'CSV', 'JPG', 'JPEG', 'PNG', 'DWG', 'DXF', 'STL', 'ZIP'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label><span>MIME Type</span><input name="legacy_mime_type" defaultValue="application/pdf" required /></label>
                <label><span>File Size Bytes</span><input name="legacy_file_size_bytes" type="number" min="0" required /></label>
                <label><span>Checksum SHA-256</span><input name="legacy_checksum" required /></label>
                <label><span>Inspection Date</span><input name="legacy_inspection_date" type="date" required /></label>
                <label><span>Method</span><input name="legacy_method" required /></label>
                <label><span>Component</span><input name="legacy_component" required /></label>
                <label><span>Location</span><input name="legacy_location" /></label>
                <label><span>Page or Sheet Ref</span><input name="legacy_page_or_sheet_ref" /></label>
                <button className="secondary-button wide-field" type="submit">Register Legacy Metadata</button>
              </form>
            )
          }
        ]}
      />

      <DetailDrawer
        open={Boolean(selectedEvidence)}
        title={selectedEvidence?.evidence_code ?? selectedEvidence?.evidence_id ?? 'Evidence details'}
        subtitle={selectedEvidence ? evidenceFileName(selectedEvidence) : undefined}
        status={selectedEvidence ? (isBlockedEvidence(selectedEvidence) ? 'blocked' : selectedEvidence.status ?? selectedEvidence.upload_status) : undefined}
        onClose={() => setSelectedEvidence(null)}
        tabs={selectedEvidence ? [
          {
            id: 'overview',
            label: 'Overview',
            content: <DetailGrid items={[
              { label: 'Evidence ID', value: <code>{selectedEvidence.evidence_id}</code> },
              { label: 'File', value: evidenceFileName(selectedEvidence) },
              { label: 'File Type', value: displayValue(selectedEvidence.file_type) },
              { label: 'Asset', value: displayValue(selectedEvidence.asset_id) },
              { label: 'Inspection', value: displayValue(selectedEvidence.inspection_event_id ?? selectedEvidence.inspection_id) },
              { label: 'Uploaded', value: dateValue(selectedEvidence.uploaded_at ?? selectedEvidence.created_at) }
            ]} />
          },
          {
            id: 'technical',
            label: 'Technical Data',
            content: <DetailGrid items={[
              { label: 'MIME Type', value: displayValue(selectedEvidence.mime_type) },
              { label: 'Size', value: fileSizeLabel(evidenceSize(selectedEvidence)) },
              { label: 'Checksum', value: <code>{evidenceChecksum(selectedEvidence)}</code> },
              { label: 'Method', value: displayValue(selectedEvidence.method) },
              { label: 'Component', value: displayValue(selectedEvidence.component) },
              { label: 'Location', value: displayValue(selectedEvidence.location) },
              { label: 'Page / Sheet', value: displayValue(selectedEvidence.page_or_sheet_ref) },
              { label: 'Storage Summary', value: `${displayValue(selectedEvidence.storage_provider)} / ${displayValue(selectedEvidence.storage_bucket)}` }
            ]} />
          },
          {
            id: 'evidence',
            label: 'Evidence',
            content: <div className="pd-compact-actions"><button className="secondary-button" type="button" disabled={isBlockedEvidence(selectedEvidence)} onClick={() => void openEvidence(selectedEvidence)}>Open audited file</button>{selectedEvidence.asset_id && <Link className="secondary-button" href={`/assets/${selectedEvidence.asset_id}`}>Asset</Link>}<Link className="secondary-button" href={`/ndt?evidence_id=${selectedEvidence.evidence_id}`}>NDT</Link><Link className="secondary-button" href={`/reports?evidence_id=${selectedEvidence.evidence_id}`}>Reports</Link></div>
          },
          {
            id: 'audit',
            label: 'Audit Trail',
            content: <Link className="secondary-button" href={`/audit-logs?entity_type=evidence_file&entity_id=${selectedEvidence.evidence_id}`}>Open audit trail</Link>
          },
          {
            id: 'raw',
            label: 'Raw Metadata',
            content: <TechnicalJson value={selectedEvidence} />
          }
        ] : []}
      />
    </main>
  );
}

export default function EvidenceRepositoryPage() {
  return (
    <Suspense fallback={<main className="container"><section className="notice">Loading evidence repository...</section></main>}>
      <EvidenceRepositoryPageClient />
    </Suspense>
  );
}
