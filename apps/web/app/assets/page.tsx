'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ValidationIssue = { field: string; message: string; severity?: string };

type TankAsset = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
  facility: string;
  location: string;
  service_fluid: string;
  tank_type: string;
  construction_year: number | null;
  original_design_code: string;
  current_assessment_code: string;
  code_edition: string;
  owner: string;
  operating_status: string;
  inspection_due_date: string;
  record_status?: string;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: ValidationIssue[];
  };
};

const operatingStatusOptions = [
  { value: 'in_service', label: 'In service' },
  { value: 'out_of_service', label: 'Out of service' },
  { value: 'mothballed', label: 'Mothballed' },
  { value: 'retired', label: 'Retired' }
];

const defaultAssetValues = {
  tank_tag: '',
  asset_name: '',
  facility: '',
  location: '',
  service_fluid: '',
  tank_type: 'aboveground_storage_tank',
  construction_year: '',
  original_design_code: 'API 650',
  current_assessment_code: 'API 653',
  code_edition: '',
  owner: '',
  operating_status: 'in_service',
  inspection_due_date: ''
};

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '-';
}

function normalizePayloadError(payload: ApiErrorPayload, fallback: string): { message: string; issues: ValidationIssue[] } {
  return {
    message: payload.error?.message ?? fallback,
    issues: payload.error?.details ?? []
  };
}

function validateAssetForm(form: HTMLFormElement): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredFields = ['tank_tag', 'asset_name', 'facility', 'location', 'service_fluid', 'tank_type', 'original_design_code', 'current_assessment_code', 'code_edition', 'owner', 'operating_status'];
  for (const field of requiredFields) {
    if (!fieldValue(form, field)) {
      issues.push({ field, message: `${field} is required.`, severity: 'error' });
    }
  }

  const year = Number(fieldValue(form, 'construction_year'));
  const maxYear = new Date().getFullYear() + 5;
  if (!Number.isInteger(year) || year <= 1800 || year > maxYear) {
    issues.push({ field: 'construction_year', message: `construction_year must be a valid year between 1801 and ${maxYear}.`, severity: 'error' });
  }

  const dueDate = fieldValue(form, 'inspection_due_date');
  if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
    issues.push({ field: 'inspection_due_date', message: 'inspection_due_date is required and must be a valid date.', severity: 'error' });
  }

  return issues;
}

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return (
    <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

function ErrorList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="error-list" role="alert">
      {issues.map((issue) => (
        <p key={`${issue.field}-${issue.message}`}><strong>{issue.field}</strong>: {issue.message}</p>
      ))}
    </div>
  );
}

export default function TankAssetRegisterPage() {
  const [assets, setAssets] = useState<TankAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => [asset.asset_id, asset.tank_tag, asset.asset_name, asset.facility, asset.location, asset.service_fluid, asset.owner, asset.operating_status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [assets, search]);

  async function loadAssets() {
    setLoading(true);
    setPermissionDenied(false);
    setPageError(null);
    try {
      const response = await apiFetch('/api/v1/assets', { cache: 'no-store' });
      const payload = await response.json() as { data?: TankAsset[] } & ApiErrorPayload;
      if (response.status === 401 || response.status === 403) {
        setPermissionDenied(true);
        setAssets([]);
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? 'Asset register could not be loaded.');
      }
      setAssets(payload.data ?? []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Asset register could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  async function createAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const validationIssues = validateAssetForm(form);
    if (validationIssues.length > 0) {
      setErrors(validationIssues);
      setMessage('Please correct the highlighted asset master data fields before submitting.');
      return;
    }

    const payload = {
      tank_tag: fieldValue(form, 'tank_tag'),
      asset_name: fieldValue(form, 'asset_name'),
      facility: fieldValue(form, 'facility'),
      location: fieldValue(form, 'location'),
      service_fluid: fieldValue(form, 'service_fluid'),
      tank_type: fieldValue(form, 'tank_type'),
      construction_year: Number(fieldValue(form, 'construction_year')),
      original_design_code: fieldValue(form, 'original_design_code'),
      current_assessment_code: fieldValue(form, 'current_assessment_code'),
      code_edition: fieldValue(form, 'code_edition'),
      owner: fieldValue(form, 'owner'),
      operating_status: fieldValue(form, 'operating_status'),
      inspection_due_date: fieldValue(form, 'inspection_due_date')
    };

    setCreating(true);
    try {
      const response = await apiFetch('/api/v1/assets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.json() as { data?: TankAsset; auditLogId?: string } & ApiErrorPayload;
      if (!response.ok) {
        const normalized = normalizePayloadError(result, 'Tank asset creation failed.');
        setMessage(normalized.message);
        setErrors(normalized.issues);
        return;
      }

      setMessage(`Tank asset ${result.data?.tank_tag ?? payload.tank_tag} created. Backend validation and audit logging remain authoritative.`);
      form.reset();
      await loadAssets();
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-B</p>
          <h1>Tank Asset Register</h1>
          <p>Manage tank asset master data through AIM APIs. Frontend validation improves UX only; backend validation remains authoritative.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          <Link className="secondary-button" href="/reports">Reports</Link>
        </div>
      </header>

      {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view the Tank Asset Register. Backend RBAC is authoritative." />}
      {pageError && <StatusPanel type="error" title="Asset register error" message={pageError} />}

      {!permissionDenied && !pageError && (
        <section className="grid-two">
          <form className="panel form-grid" onSubmit={createAsset}>
            <div className="panel-heading">
              <h2>Create Tank Asset</h2>
              <p>Create a controlled asset master record. No formulas, calculations, evidence files, or final engineering decisions are created here.</p>
            </div>
            <label><span>Tank Tag</span><input name="tank_tag" defaultValue={defaultAssetValues.tank_tag} placeholder="TANK-T-02" required /></label>
            <label><span>Asset Name</span><input name="asset_name" defaultValue={defaultAssetValues.asset_name} placeholder="Solar Storage Tank T-02" required /></label>
            <label><span>Facility</span><input name="facility" defaultValue={defaultAssetValues.facility} placeholder="Fuel Terminal A" required /></label>
            <label><span>Location</span><input name="location" defaultValue={defaultAssetValues.location} placeholder="Tank Farm 1" required /></label>
            <label><span>Service Fluid</span><input name="service_fluid" defaultValue={defaultAssetValues.service_fluid} placeholder="Diesel / water / crude" required /></label>
            <label><span>Tank Type</span><input name="tank_type" defaultValue={defaultAssetValues.tank_type} required /></label>
            <label><span>Construction Year</span><input name="construction_year" type="number" min="1801" max={new Date().getFullYear() + 5} defaultValue={defaultAssetValues.construction_year} required /></label>
            <label><span>Original Design Code</span><input name="original_design_code" defaultValue={defaultAssetValues.original_design_code} required /></label>
            <label><span>Current Assessment Code</span><input name="current_assessment_code" defaultValue={defaultAssetValues.current_assessment_code} required /></label>
            <label><span>Code Edition</span><input name="code_edition" defaultValue={defaultAssetValues.code_edition} placeholder="Engineer-entered edition/reference" required /></label>
            <label><span>Owner</span><input name="owner" defaultValue={defaultAssetValues.owner} placeholder="Operations / client owner" required /></label>
            <label>
              <span>Operating Status</span>
              <select name="operating_status" defaultValue={defaultAssetValues.operating_status} required>
                {operatingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label><span>Inspection Due Date</span><input name="inspection_due_date" type="date" defaultValue={defaultAssetValues.inspection_due_date} required /></label>
            <button className="primary-button" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Tank Asset'}</button>
          </form>

          <section className="panel">
            <div className="panel-heading">
              <h2>Asset List</h2>
              <p>Search and open asset detail records for geometry, shell-course, material, evidence, NDT, calculation, audit, and report context.</p>
            </div>
            <div className="search-row">
              <label className="wide-field">
                <span>Search / Filter</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tag, name, facility, fluid, owner, status" />
              </label>
              <button className="secondary-button" type="button" onClick={() => void loadAssets()}>Refresh</button>
            </div>
            {message && <div className="notice">{message}</div>}
            <ErrorList issues={errors} />
            {loading ? (
              <StatusPanel type="loading" title="Loading assets" message="Loading tank asset master data from AIM." />
            ) : filteredAssets.length === 0 ? (
              <StatusPanel type="empty" title="No tank assets" message="No assets match the current filter. Create a tank asset or clear the search field." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset ID</th>
                      <th>Tank Tag</th>
                      <th>Asset Name</th>
                      <th>Facility / Location</th>
                      <th>Service / Type</th>
                      <th>Construction Year</th>
                      <th>Codes</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th>Related</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => (
                      <tr key={asset.asset_id}>
                        <td><span className="badge">{asset.asset_id}</span></td>
                        <td><Link href={`/assets/${asset.asset_id}`}>{asset.tank_tag}</Link></td>
                        <td>{asset.asset_name}</td>
                        <td>{asset.facility}<br /><span className="muted-text">{asset.location}</span></td>
                        <td>{asset.service_fluid}<br /><span className="muted-text">{asset.tank_type}</span></td>
                        <td>{asset.construction_year ?? '-'}</td>
                        <td>{asset.original_design_code} / {asset.current_assessment_code}<br /><span className="muted-text">Edition: {asset.code_edition}</span></td>
                        <td>{asset.owner}</td>
                        <td><span className="badge">{asset.operating_status}</span></td>
                        <td>{normalizeDate(asset.inspection_due_date)}</td>
                        <td>
                          <div className="action-row">
                            <Link href={`/assets/${asset.asset_id}`}>Detail</Link>
                            <Link href={`/evidence?asset_id=${asset.asset_id}`}>Evidence</Link>
                            <Link href={`/ndt?asset_id=${asset.asset_id}`}>NDT</Link>
                            <Link href={`/calculations?asset_id=${asset.asset_id}`}>Calculations</Link>
                            <Link href={`/reports?asset_id=${asset.asset_id}`}>Reports</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
