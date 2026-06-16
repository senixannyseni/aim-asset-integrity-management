'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUrl } from '../../lib/api-client';

type AssetOption = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
};

type EvidenceFile = {
  evidence_id: string;
  evidence_code: string;
  asset_id: string;
  file_name: string;
  file_type: string;
  object_storage_path: string;
  inspection_date: string;
  method: string;
  component: string;
  location?: string;
  page_or_sheet_ref?: string;
  checksum: string;
  status: string;
};

type ValidationIssue = { field: string; message: string; severity: string };

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}

export default function EvidenceRepositoryClient() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const firstAssetId = useMemo(() => assets[0]?.asset_id ?? '', [assets]);

  async function loadPageData() {
    setLoading(true);
    const [assetResponse, evidenceResponse] = await Promise.all([
      apiFetch('/api/v1/assets', { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' })
    ]);
    const assetPayload = await assetResponse.json();
    const evidencePayload = await evidenceResponse.json();
    setAssets(assetPayload.data ?? []);
    setEvidenceFiles(evidencePayload.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const payload = {
      asset_id: fieldValue(form, 'asset_id'),
      file_name: fieldValue(form, 'file_name'),
      file_type: fieldValue(form, 'file_type'),
      inspection_date: fieldValue(form, 'inspection_date'),
      method: fieldValue(form, 'method'),
      component: fieldValue(form, 'component'),
      location: fieldValue(form, 'location'),
      page_or_sheet_ref: fieldValue(form, 'page_or_sheet_ref'),
      checksum: fieldValue(form, 'checksum'),
      file_size_bytes: Number(fieldValue(form, 'file_size_bytes') || 0)
    };

    const response = await apiFetch('/api/v1/evidence/upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Evidence upload failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }

    setMessage(`Evidence ${result.data.evidence_code} registered. Audit log: ${result.auditLogId ?? 'created'}`);
    form.reset();
    await loadPageData();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 3</p>
          <h1>Evidence Repository</h1>
          <p>Register evidence metadata, preserve object-storage path lineage, and link evidence to engineering records.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/assets">Assets</Link>
          <Link className="secondary-button" href="/ndt">NDT Data Room</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={uploadEvidence}>
          <div className="panel-heading">
            <h2>Register Evidence</h2>
            <p>Local MVP captures metadata and object-storage-compatible path. Binary upload/presigned URL is planned for production.</p>
          </div>

          <label>
            <span>Asset</span>
            <select name="asset_id" defaultValue={firstAssetId} required>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag} — {asset.asset_name}</option>
              ))}
            </select>
          </label>

          <label><span>File Name</span><input name="file_name" placeholder="ex. TK-001_UT_Report.pdf" required /></label>
          <label>
            <span>File Type</span>
            <select name="file_type" defaultValue="PDF" required>
              {['PDF', 'XLSX', 'CSV', 'JPG', 'PNG', 'DWG', 'DXF', 'STL', 'ZIP'].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label><span>Inspection Date</span><input name="inspection_date" type="date" required /></label>
          <label><span>Method</span><input name="method" placeholder="ex. UT thickness" required /></label>
          <label><span>Component</span><input name="component" placeholder="ex. shell course 1" required /></label>
          <label><span>Location</span><input name="location" placeholder="ex. 90 deg / 2.5 m elevation" /></label>
          <label><span>Page or Sheet Ref</span><input name="page_or_sheet_ref" placeholder="ex. p. 12 / Sheet UT-01" /></label>
          <label><span>Checksum</span><input name="checksum" placeholder="demo-checksum-sha256" required /></label>
          <label><span>File Size Bytes</span><input name="file_size_bytes" type="number" placeholder="0" /></label>
          <button className="primary-button" type="submit">Register Evidence</button>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Evidence Files</h2>
            <p>Open an evidence record to inspect metadata and object-storage path.</p>
          </div>

          {message && <div className="notice">{message}</div>}
          {errors.length > 0 && (
            <div className="error-list">
              {errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Code</th><th>File</th><th>Type</th><th>Method</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5}>Loading evidence...</td></tr> : evidenceFiles.length === 0 ? <tr><td colSpan={5}>No evidence registered.</td></tr> : evidenceFiles.map((evidence) => (
                  <tr key={evidence.evidence_id}>
                    <td><button className="link-button" type="button" onClick={() => setSelectedEvidence(evidence)}>{evidence.evidence_code}</button></td>
                    <td>{evidence.file_name}</td>
                    <td>{evidence.file_type}</td>
                    <td>{evidence.method}</td>
                    <td><span className="badge">{evidence.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedEvidence && (
        <section className="panel detail-panel">
          <div className="panel-heading row-between">
            <div>
              <h2>Evidence Viewer Panel</h2>
              <p>{selectedEvidence.evidence_code} — {selectedEvidence.file_name}</p>
            </div>
            <a className="secondary-button" href={apiUrl(`/api/v1/evidence/${selectedEvidence.evidence_id}/open`)} target="_blank" rel="noreferrer">Open Evidence</a>
          </div>
          <dl className="metadata-grid">
            <dt>Object Path</dt><dd>{selectedEvidence.object_storage_path}</dd>
            <dt>Checksum</dt><dd>{selectedEvidence.checksum}</dd>
            <dt>Inspection Date</dt><dd>{selectedEvidence.inspection_date?.slice(0, 10)}</dd>
            <dt>Component</dt><dd>{selectedEvidence.component}</dd>
            <dt>Location</dt><dd>{selectedEvidence.location ?? '-'}</dd>
            <dt>Page / Sheet</dt><dd>{selectedEvidence.page_or_sheet_ref ?? '-'}</dd>
          </dl>
        </section>
      )}
    </main>
  );
}
