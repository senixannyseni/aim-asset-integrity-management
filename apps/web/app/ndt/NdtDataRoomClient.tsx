'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type AssetOption = { asset_id: string; tank_tag: string; asset_name: string };
type EvidenceOption = { evidence_id: string; evidence_code: string; file_name: string; asset_id: string };
type NdtMeasurement = {
  measurement_id: string;
  measurement_code: string;
  asset_id: string;
  component: string;
  shell_course_no?: number;
  cml_tml_id?: string;
  grid_ref?: string;
  elevation?: number;
  orientation?: string;
  measured_thickness: number;
  reading_date: string;
  method: string;
  confidence: number;
  evidence_file_id?: string;
  reviewer_status: string;
  validation_status: string;
  validation_message?: string;
};

type ValidationIssue = { field: string; message: string; severity: string };

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}

export default function NdtDataRoomClient() {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceOption[]>([]);
  const [measurements, setMeasurements] = useState<NdtMeasurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<NdtMeasurement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const firstAssetId = useMemo(() => assets[0]?.asset_id ?? '', [assets]);

  async function loadPageData() {
    const [assetResponse, evidenceResponse, ndtResponse] = await Promise.all([
      apiFetch('/api/v1/assets', { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' }),
      apiFetch('/api/v1/ndt/measurements', { cache: 'no-store' })
    ]);
    const assetPayload = await assetResponse.json();
    const evidencePayload = await evidenceResponse.json();
    const ndtPayload = await ndtResponse.json();
    setAssets(assetPayload.data ?? []);
    setEvidenceFiles(evidencePayload.data ?? []);
    setMeasurements(ndtPayload.data ?? []);
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  async function createMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const evidenceFileId = fieldValue(form, 'evidence_file_id');
    const payload = {
      asset_id: fieldValue(form, 'asset_id'),
      component: fieldValue(form, 'component'),
      shell_course_no: Number(fieldValue(form, 'shell_course_no') || 0),
      cml_tml_id: fieldValue(form, 'cml_tml_id'),
      grid_ref: fieldValue(form, 'grid_ref'),
      elevation: Number(fieldValue(form, 'elevation') || 0),
      elevation_unit: 'm',
      orientation: fieldValue(form, 'orientation'),
      measured_thickness: Number(fieldValue(form, 'measured_thickness')),
      measured_thickness_unit: 'mm',
      reading_date: fieldValue(form, 'reading_date'),
      method: fieldValue(form, 'method'),
      confidence: Number(fieldValue(form, 'confidence') || 1),
      evidence_file_id: evidenceFileId || undefined,
      extraction_source: 'manual',
      is_critical: fieldValue(form, 'is_critical') === 'true'
    };

    const response = await apiFetch('/api/v1/ndt/measurements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'NDT measurement create failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }

    setMessage(`NDT measurement ${result.data.measurement_code} created. Audit log: ${result.auditLogId ?? 'created'}`);
    form.reset();
    await loadPageData();
  }

  async function approveMeasurement(measurementId: string) {
    const response = await apiFetch(`/api/v1/ndt/measurements/${measurementId}/approve`, { method: 'POST' });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'NDT approval failed.');
      return;
    }
    setMessage(`NDT measurement approved. Audit log: ${result.auditLogId ?? 'approved'}`);
    await loadPageData();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 3</p>
          <h1>NDT Data Room</h1>
          <p>Manual and bulk thickness data entry with evidence traceability gates for critical NDT records.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/assets">Assets</Link>
          <Link className="secondary-button" href="/evidence">Evidence Repository</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={createMeasurement}>
          <div className="panel-heading">
            <h2>Manual Thickness Entry</h2>
            <p>Critical measurements without evidence are blocked from approval.</p>
          </div>
          <label><span>Asset</span><select name="asset_id" defaultValue={firstAssetId} required>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.tank_tag} — {asset.asset_name}</option>)}</select></label>
          <label><span>Component</span><input name="component" placeholder="shell" required /></label>
          <label><span>Shell Course No</span><input name="shell_course_no" type="number" placeholder="1" /></label>
          <label><span>CML/TML ID</span><input name="cml_tml_id" placeholder="CML-001" /></label>
          <label><span>Grid Ref</span><input name="grid_ref" placeholder="A-01" /></label>
          <label><span>Elevation m</span><input name="elevation" type="number" step="0.001" placeholder="2.5" /></label>
          <label><span>Orientation</span><input name="orientation" placeholder="90 deg" /></label>
          <label><span>Measured Thickness mm</span><input name="measured_thickness" type="number" step="0.001" required /></label>
          <label><span>Reading Date</span><input name="reading_date" type="date" required /></label>
          <label><span>Method</span><input name="method" placeholder="UT thickness" required /></label>
          <label><span>Confidence</span><input name="confidence" type="number" step="0.01" min="0" max="1" defaultValue="1" /></label>
          <label><span>Evidence</span><select name="evidence_file_id" defaultValue=""><option value="">No direct evidence</option>{evidenceFiles.map((evidence) => <option key={evidence.evidence_id} value={evidence.evidence_id}>{evidence.evidence_code} — {evidence.file_name}</option>)}</select></label>
          <label><span>Critical Record</span><select name="is_critical" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></label>
          <button className="primary-button" type="submit">Create NDT Measurement</button>
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Thickness Measurements</h2>
            <p>Review validation state, evidence state, and approval status.</p>
          </div>
          {message && <div className="notice">{message}</div>}
          {errors.length > 0 && <div className="error-list">{errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}</div>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Component</th><th>Thickness</th><th>Evidence</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {measurements.length === 0 ? <tr><td colSpan={6}>No NDT measurements yet.</td></tr> : measurements.map((measurement) => (
                  <tr key={measurement.measurement_id}>
                    <td><button className="link-button" type="button" onClick={() => setSelectedMeasurement(measurement)}>{measurement.measurement_code}</button></td>
                    <td>{measurement.component}</td>
                    <td>{measurement.measured_thickness} mm</td>
                    <td>{measurement.evidence_file_id ? 'linked' : 'missing'}</td>
                    <td><span className="badge">{measurement.reviewer_status} / {measurement.validation_status}</span></td>
                    <td><button className="secondary-button" type="button" onClick={() => void approveMeasurement(measurement.measurement_id)}>Approve</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedMeasurement && (
        <section className="panel detail-panel">
          <h2>NDT Measurement Detail</h2>
          <dl className="metadata-grid">
            <dt>Measurement</dt><dd>{selectedMeasurement.measurement_code}</dd>
            <dt>CML/TML</dt><dd>{selectedMeasurement.cml_tml_id ?? '-'}</dd>
            <dt>Grid</dt><dd>{selectedMeasurement.grid_ref ?? '-'}</dd>
            <dt>Validation</dt><dd>{selectedMeasurement.validation_status}: {selectedMeasurement.validation_message ?? '-'}</dd>
            <dt>Evidence Link</dt><dd>{selectedMeasurement.evidence_file_id ? 'Direct evidence_file_id linked' : 'Missing direct evidence. Link evidence before critical approval.'}</dd>
            <dt>Calculation Snapshot Readiness</dt><dd>Future calculation input snapshots must reference this measurement and its evidence state.</dd>
          </dl>
        </section>
      )}
    </main>
  );
}
