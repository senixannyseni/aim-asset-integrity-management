'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type ValidationIssue = { field: string; message: string; severity?: string };

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: ValidationIssue[];
  };
};

type MaterialOption = {
  material_id: string;
  material_code: string;
  material_name: string;
  material_specification: string;
  material_family?: string | null;
};

type TankGeometry = {
  geometry_id?: string;
  diameter?: number | null;
  diameter_unit?: string;
  shell_height?: number | null;
  shell_height_unit?: string;
  number_of_courses?: number | null;
  design_liquid_level?: number | null;
  design_liquid_level_unit?: string;
  nominal_capacity?: number | null;
  nominal_capacity_unit?: string;
  specific_gravity?: number | null;
  design_temperature?: number | null;
  design_temperature_unit?: string;
  design_pressure?: number | null;
  design_pressure_unit?: string;
  vacuum_design_basis?: string | null;
  bottom_type?: string | null;
  roof_type?: string | null;
  foundation_type?: string | null;
};

type ShellCourse = {
  shell_course_id: string;
  course_no: number;
  course_height: number | null;
  course_height_unit?: string;
  course_height_mm?: number | null;
  nominal_thickness: number | null;
  nominal_thickness_unit?: string;
  measured_min_thickness: number | null;
  measured_min_thickness_unit?: string;
  material_id: string | null;
  material_code?: string | null;
  material_name?: string | null;
  material_specification?: string | null;
  joint_efficiency: number | null;
  corrosion_allowance: number | null;
  corrosion_allowance_unit?: string;
  coating_lining_status: string | null;
};

type TankAssetBundle = {
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
  geometry: TankGeometry | null;
  shell_courses: ShellCourse[];
};

type PageParams = { params: { assetId: string } };

const operatingStatusOptions = [
  { value: 'in_service', label: 'In service' },
  { value: 'out_of_service', label: 'Out of service' },
  { value: 'mothballed', label: 'Mothballed' },
  { value: 'retired', label: 'Retired' }
];

const lengthUnitOptions = ['m', 'mm'];
const thicknessUnitOptions = ['mm'];

function fieldValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalNumber(value: number | null | undefined): string | number {
  return value === null || value === undefined ? '' : value;
}

function normalizeDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function normalizePayloadError(payload: ApiErrorPayload, fallback: string): { message: string; issues: ValidationIssue[] } {
  return {
    message: payload.error?.message ?? fallback,
    issues: payload.error?.details ?? []
  };
}

function requiredFieldIssues(form: HTMLFormElement, fields: string[]): ValidationIssue[] {
  return fields
    .filter((field) => !fieldValue(form, field))
    .map((field) => ({ field, message: `${field} is required.`, severity: 'error' }));
}

function validateAssetForm(form: HTMLFormElement): ValidationIssue[] {
  const issues = requiredFieldIssues(form, ['tank_tag', 'asset_name', 'facility', 'location', 'service_fluid', 'tank_type', 'original_design_code', 'current_assessment_code', 'code_edition', 'owner', 'operating_status']);
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

function validateGeometryForm(form: HTMLFormElement): ValidationIssue[] {
  const issues = requiredFieldIssues(form, ['diameter', 'diameter_unit', 'shell_height', 'shell_height_unit', 'number_of_courses', 'design_liquid_level', 'design_liquid_level_unit', 'nominal_capacity', 'specific_gravity', 'design_temperature', 'design_pressure', 'vacuum_design_basis', 'bottom_type', 'roof_type', 'foundation_type']);
  const numericFields = ['diameter', 'shell_height', 'design_liquid_level', 'nominal_capacity', 'specific_gravity', 'design_temperature', 'design_pressure'];
  for (const field of numericFields) {
    const value = Number(fieldValue(form, field));
    if (!Number.isFinite(value)) {
      issues.push({ field, message: `${field} must be numeric.`, severity: 'error' });
    }
  }
  const diameter = Number(fieldValue(form, 'diameter'));
  if (Number.isFinite(diameter) && diameter <= 0) issues.push({ field: 'diameter', message: 'diameter must be greater than 0 and must include a unit.', severity: 'error' });
  const shellHeight = Number(fieldValue(form, 'shell_height'));
  if (Number.isFinite(shellHeight) && shellHeight <= 0) issues.push({ field: 'shell_height', message: 'shell_height must be greater than 0 and must include a unit.', severity: 'error' });
  const numberOfCourses = Number(fieldValue(form, 'number_of_courses'));
  if (!Number.isInteger(numberOfCourses) || numberOfCourses < 1 || numberOfCourses > 30) {
    issues.push({ field: 'number_of_courses', message: 'number_of_courses must be an integer between 1 and 30.', severity: 'error' });
  }
  if (Number(fieldValue(form, 'specific_gravity')) <= 0) issues.push({ field: 'specific_gravity', message: 'specific_gravity must be greater than 0.', severity: 'error' });
  return issues;
}

function validateShellCourseForm(form: HTMLFormElement): ValidationIssue[] {
  const issues = requiredFieldIssues(form, ['course_no', 'course_height', 'course_height_unit', 'nominal_thickness', 'nominal_thickness_unit', 'measured_min_thickness', 'measured_min_thickness_unit', 'material_id', 'joint_efficiency', 'corrosion_allowance', 'corrosion_allowance_unit', 'coating_lining_status']);
  const courseNo = Number(fieldValue(form, 'course_no'));
  if (!Number.isInteger(courseNo) || courseNo <= 0) issues.push({ field: 'course_no', message: 'course_no is required and must be a positive integer.', severity: 'error' });
  const courseHeight = Number(fieldValue(form, 'course_height'));
  if (!Number.isFinite(courseHeight) || courseHeight <= 0) issues.push({ field: 'course_height', message: 'course_height is required, numeric, greater than 0, and must include a unit.', severity: 'error' });
  const nominalThickness = Number(fieldValue(form, 'nominal_thickness'));
  if (!Number.isFinite(nominalThickness) || nominalThickness <= 0) issues.push({ field: 'nominal_thickness', message: 'nominal_thickness is required and must be greater than 0 mm.', severity: 'error' });
  const measuredMinThickness = Number(fieldValue(form, 'measured_min_thickness'));
  if (!Number.isFinite(measuredMinThickness) || measuredMinThickness <= 0) issues.push({ field: 'measured_min_thickness', message: 'measured_min_thickness is required and must be greater than 0 mm.', severity: 'error' });
  const jointEfficiency = Number(fieldValue(form, 'joint_efficiency'));
  if (!Number.isFinite(jointEfficiency) || jointEfficiency <= 0 || jointEfficiency > 1) issues.push({ field: 'joint_efficiency', message: 'joint_efficiency is required and must be greater than 0 and less than or equal to 1.', severity: 'error' });
  if (!fieldValue(form, 'material_id')) issues.push({ field: 'material_id', message: 'material selection is required for each shell course.', severity: 'error' });
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

function materialLabel(material: MaterialOption): string {
  return `${material.material_code} — ${material.material_name} (${material.material_specification})`;
}

export default function TankAssetDetailPage({ params }: PageParams) {
  const assetId = params.assetId;
  const [asset, setAsset] = useState<TankAssetBundle | null>(null);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ShellCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);

  const firstMaterialId = useMemo(() => materials[0]?.material_id ?? '', [materials]);

  async function loadAssetDetail() {
    setLoading(true);
    setPermissionDenied(false);
    setNotFound(false);
    setPageError(null);
    try {
      const [assetResponse, materialsResponse] = await Promise.all([
        apiFetch(`/api/v1/assets/${assetId}`, { cache: 'no-store' }),
        apiFetch('/api/v1/materials', { cache: 'no-store' })
      ]);
      const assetPayload = await assetResponse.json() as { data?: TankAssetBundle } & ApiErrorPayload;
      const materialsPayload = await materialsResponse.json() as { data?: MaterialOption[] } & ApiErrorPayload;
      if (assetResponse.status === 401 || assetResponse.status === 403 || materialsResponse.status === 401 || materialsResponse.status === 403) {
        setPermissionDenied(true);
        return;
      }
      if (assetResponse.status === 404) {
        setNotFound(true);
        return;
      }
      if (!assetResponse.ok) throw new Error(assetPayload.error?.message ?? 'Asset detail could not be loaded.');
      if (!materialsResponse.ok) throw new Error(materialsPayload.error?.message ?? 'Material master options could not be loaded.');
      setAsset(assetPayload.data ?? null);
      setMaterials(materialsPayload.data ?? []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Asset detail could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssetDetail();
  }, [assetId]);

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const validationIssues = validateAssetForm(form);
    if (validationIssues.length > 0) {
      setErrors(validationIssues);
      setMessage('Please correct the highlighted asset fields before saving.');
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

    const response = await apiFetch(`/api/v1/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    const result = await response.json() as { data?: TankAssetBundle; auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      const normalized = normalizePayloadError(result, 'Asset update failed.');
      setMessage(normalized.message);
      setErrors(normalized.issues);
      return;
    }
    setMessage(`Asset ${result.data?.tank_tag ?? payload.tank_tag} updated. Audit log: ${result.auditLogId ?? 'created'}.`);
    await loadAssetDetail();
  }

  async function saveGeometry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const validationIssues = validateGeometryForm(form);
    if (validationIssues.length > 0) {
      setErrors(validationIssues);
      setMessage('Please correct the highlighted tank geometry fields before saving.');
      return;
    }
    const payload = {
      construction_year: asset?.construction_year ?? Number(fieldValue(form, 'construction_year') || new Date().getFullYear()),
      diameter: Number(fieldValue(form, 'diameter')),
      diameter_unit: fieldValue(form, 'diameter_unit'),
      shell_height: Number(fieldValue(form, 'shell_height')),
      shell_height_unit: fieldValue(form, 'shell_height_unit'),
      number_of_courses: Number(fieldValue(form, 'number_of_courses')),
      design_liquid_level: Number(fieldValue(form, 'design_liquid_level')),
      design_liquid_level_unit: fieldValue(form, 'design_liquid_level_unit'),
      nominal_capacity: Number(fieldValue(form, 'nominal_capacity')),
      specific_gravity: Number(fieldValue(form, 'specific_gravity')),
      design_temperature: Number(fieldValue(form, 'design_temperature')),
      design_pressure: Number(fieldValue(form, 'design_pressure')),
      vacuum_design_basis: fieldValue(form, 'vacuum_design_basis'),
      bottom_type: fieldValue(form, 'bottom_type'),
      roof_type: fieldValue(form, 'roof_type'),
      foundation_type: fieldValue(form, 'foundation_type')
    };

    const response = await apiFetch(`/api/v1/assets/${assetId}/geometry`, { method: 'PUT', body: JSON.stringify(payload) });
    const result = await response.json() as { data?: TankGeometry; auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      const normalized = normalizePayloadError(result, 'Geometry update failed.');
      setMessage(normalized.message);
      setErrors(normalized.issues);
      return;
    }
    setMessage(`Tank geometry saved. Length values are unit-normalized by the backend. Audit log: ${result.auditLogId ?? 'created'}.`);
    await loadAssetDetail();
  }

  async function saveShellCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrors([]);
    const form = event.currentTarget;
    const validationIssues = validateShellCourseForm(form);
    if (validationIssues.length > 0) {
      setErrors(validationIssues);
      setMessage('Please correct the highlighted shell-course fields before saving.');
      return;
    }
    const selectedMaterial = materials.find((material) => material.material_id === fieldValue(form, 'material_id'));
    const payload = {
      course_no: Number(fieldValue(form, 'course_no')),
      course_height: Number(fieldValue(form, 'course_height')),
      course_height_unit: fieldValue(form, 'course_height_unit'),
      nominal_thickness: Number(fieldValue(form, 'nominal_thickness')),
      nominal_thickness_unit: fieldValue(form, 'nominal_thickness_unit'),
      measured_min_thickness: Number(fieldValue(form, 'measured_min_thickness')),
      measured_min_thickness_unit: fieldValue(form, 'measured_min_thickness_unit'),
      material_id: fieldValue(form, 'material_id'),
      material_specification: fieldValue(form, 'material_specification') || selectedMaterial?.material_specification,
      joint_efficiency: Number(fieldValue(form, 'joint_efficiency')),
      corrosion_allowance: Number(fieldValue(form, 'corrosion_allowance')),
      corrosion_allowance_unit: fieldValue(form, 'corrosion_allowance_unit'),
      coating_lining_status: fieldValue(form, 'coating_lining_status')
    };

    const method = selectedCourse ? 'PATCH' : 'POST';
    const path = selectedCourse
      ? `/api/v1/assets/${assetId}/shell-courses/${selectedCourse.shell_course_id}`
      : `/api/v1/assets/${assetId}/shell-courses`;
    const response = await apiFetch(path, { method, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: ShellCourse; auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      const normalized = normalizePayloadError(result, 'Shell-course save failed.');
      setMessage(normalized.message);
      setErrors(normalized.issues);
      return;
    }
    setMessage(`Shell course ${result.data?.course_no ?? payload.course_no} ${selectedCourse ? 'updated' : 'added'}. Audit log: ${result.auditLogId ?? 'created'}.`);
    setSelectedCourse(null);
    form.reset();
    await loadAssetDetail();
  }

  async function deleteShellCourse(course: ShellCourse) {
    setMessage(null);
    setErrors([]);
    const response = await apiFetch(`/api/v1/assets/${assetId}/shell-courses/${course.shell_course_id}`, { method: 'DELETE' });
    const result = await response.json() as { auditLogId?: string } & ApiErrorPayload;
    if (!response.ok) {
      const normalized = normalizePayloadError(result, 'Shell-course delete failed.');
      setMessage(normalized.message);
      setErrors(normalized.issues);
      return;
    }
    setMessage(`Shell course ${course.course_no} deleted through backend-supported shell-course endpoint. Audit log: ${result.auditLogId ?? 'created'}.`);
    if (selectedCourse?.shell_course_id === course.shell_course_id) setSelectedCourse(null);
    await loadAssetDetail();
  }

  const geometry = asset?.geometry;
  const selectedMaterialSpec = selectedCourse?.material_specification ?? materials.find((material) => material.material_id === firstMaterialId)?.material_specification ?? '';

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-B</p>
          <h1>{asset ? asset.tank_tag : 'Tank Asset Detail'}</h1>
          <p>Asset master data, geometry, shell courses, and material selection remain governed by AIM backend APIs and audit logging.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/assets">Back to Assets</Link>
          <Link className="secondary-button" href={`/audit-logs?entity_type=asset&entity_id=${assetId}`}>Audit Logs</Link>
          <Link className="secondary-button" href={`/evidence?asset_id=${assetId}`}>Evidence</Link>
          <Link className="secondary-button" href={`/ndt?asset_id=${assetId}`}>NDT</Link>
          <Link className="secondary-button" href={`/calculations?asset_id=${assetId}`}>Calculations</Link>
          <Link className="secondary-button" href={`/assets/${assetId}/findings`}>Findings</Link>
          <Link className="secondary-button" href={`/reports?asset_id=${assetId}`}>Reports</Link>
        </div>
      </header>

      {loading && <StatusPanel type="loading" title="Loading asset" message="Loading asset, geometry, shell courses, and material master options from AIM." />}
      {permissionDenied && <StatusPanel type="denied" title="Permission denied" message="You do not have permission to view or edit this asset. Backend RBAC is authoritative." />}
      {notFound && <StatusPanel type="empty" title="Asset not found" message="The requested tank asset was not found or is no longer active." />}
      {pageError && <StatusPanel type="error" title="Asset detail error" message={pageError} />}

      {message && <div className="notice">{message}</div>}
      <ErrorList issues={errors} />

      {asset && !loading && !permissionDenied && !pageError && (
        <>
          <section className="panel detail-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Asset Summary</h2>
                <p>{asset.asset_name} — {asset.facility} / {asset.location}</p>
              </div>
              <span className="badge">{asset.operating_status}</span>
            </div>
            <dl className="metadata-grid">
              <dt>Asset ID</dt><dd>{asset.asset_id}</dd>
              <dt>Tank Tag</dt><dd>{asset.tank_tag}</dd>
              <dt>Service Fluid</dt><dd>{asset.service_fluid}</dd>
              <dt>Tank Type</dt><dd>{asset.tank_type}</dd>
              <dt>Construction Year</dt><dd>{asset.construction_year ?? '-'}</dd>
              <dt>Original Design Code</dt><dd>{asset.original_design_code}</dd>
              <dt>Current Assessment Code</dt><dd>{asset.current_assessment_code}</dd>
              <dt>Code Edition</dt><dd>{asset.code_edition}</dd>
              <dt>Owner</dt><dd>{asset.owner}</dd>
              <dt>Inspection Due Date</dt><dd>{normalizeDate(asset.inspection_due_date) || '-'}</dd>
            </dl>
          </section>

          <section className="grid-two">
            <form className="panel form-grid" onSubmit={saveAsset}>
              <div className="panel-heading">
                <h2>Edit Asset Master Data</h2>
                <p>Required fields are validated in the UI and revalidated by the backend.</p>
              </div>
              <label><span>Tank Tag</span><input name="tank_tag" defaultValue={asset.tank_tag} required /></label>
              <label><span>Asset Name</span><input name="asset_name" defaultValue={asset.asset_name} required /></label>
              <label><span>Facility</span><input name="facility" defaultValue={asset.facility} required /></label>
              <label><span>Location</span><input name="location" defaultValue={asset.location} required /></label>
              <label><span>Service Fluid</span><input name="service_fluid" defaultValue={asset.service_fluid} required /></label>
              <label><span>Tank Type</span><input name="tank_type" defaultValue={asset.tank_type} required /></label>
              <label><span>Construction Year</span><input name="construction_year" type="number" min="1801" max={new Date().getFullYear() + 5} defaultValue={asset.construction_year ?? ''} required /></label>
              <label><span>Original Design Code</span><input name="original_design_code" defaultValue={asset.original_design_code} required /></label>
              <label><span>Current Assessment Code</span><input name="current_assessment_code" defaultValue={asset.current_assessment_code} required /></label>
              <label><span>Code Edition</span><input name="code_edition" defaultValue={asset.code_edition} required /></label>
              <label><span>Owner</span><input name="owner" defaultValue={asset.owner} required /></label>
              <label>
                <span>Operating Status</span>
                <select name="operating_status" defaultValue={asset.operating_status} required>
                  {operatingStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label><span>Inspection Due Date</span><input name="inspection_due_date" type="date" defaultValue={normalizeDate(asset.inspection_due_date)} required /></label>
              <button className="primary-button" type="submit">Save Asset</button>
            </form>

            <form className="panel form-grid" onSubmit={saveGeometry}>
              <div className="panel-heading">
                <h2>Tank Geometry</h2>
                <p>No calculations are run. Geometry values are saved through the existing backend geometry endpoint.</p>
              </div>
              <label><span>Diameter</span><input name="diameter" type="number" step="0.001" defaultValue={optionalNumber(geometry?.diameter)} required /></label>
              <label>
                <span>Diameter Unit</span>
                <select name="diameter_unit" defaultValue={geometry?.diameter_unit ?? 'm'} required>
                  {lengthUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label><span>Shell Height</span><input name="shell_height" type="number" step="0.001" defaultValue={optionalNumber(geometry?.shell_height)} required /></label>
              <label>
                <span>Shell Height Unit</span>
                <select name="shell_height_unit" defaultValue={geometry?.shell_height_unit ?? 'm'} required>
                  {lengthUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label><span>Number Of Courses</span><input name="number_of_courses" type="number" min="1" max="30" defaultValue={optionalNumber(geometry?.number_of_courses)} required /></label>
              <label><span>Design Liquid Level</span><input name="design_liquid_level" type="number" step="0.001" defaultValue={optionalNumber(geometry?.design_liquid_level)} required /></label>
              <label>
                <span>Design Liquid Level Unit</span>
                <select name="design_liquid_level_unit" defaultValue={geometry?.design_liquid_level_unit ?? 'm'} required>
                  {lengthUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label><span>Nominal Capacity m3</span><input name="nominal_capacity" type="number" step="0.001" defaultValue={optionalNumber(geometry?.nominal_capacity)} required /></label>
              <label><span>Specific Gravity</span><input name="specific_gravity" type="number" step="0.001" defaultValue={optionalNumber(geometry?.specific_gravity)} required /></label>
              <label><span>Design Temperature C</span><input name="design_temperature" type="number" step="0.001" defaultValue={optionalNumber(geometry?.design_temperature)} required /></label>
              <label><span>Design Pressure kPa</span><input name="design_pressure" type="number" step="0.001" defaultValue={optionalNumber(geometry?.design_pressure)} required /></label>
              <label><span>Vacuum Design Basis</span><input name="vacuum_design_basis" defaultValue={geometry?.vacuum_design_basis ?? ''} required /></label>
              <label><span>Bottom Type</span><input name="bottom_type" defaultValue={geometry?.bottom_type ?? ''} required /></label>
              <label><span>Roof Type</span><input name="roof_type" defaultValue={geometry?.roof_type ?? ''} required /></label>
              <label><span>Foundation Type</span><input name="foundation_type" defaultValue={geometry?.foundation_type ?? ''} required /></label>
              <button className="primary-button" type="submit">Save Geometry</button>
            </form>
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading row-between">
              <div>
                <h2>Shell-Course Table Editor</h2>
                <p>List, add, edit, and delete shell-course records where supported by the existing backend. Material selection uses the material master API.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSelectedCourse(null)}>New Shell Course</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Course No</th>
                    <th>Course Height</th>
                    <th>Nominal Thickness</th>
                    <th>Measured Min</th>
                    <th>Material</th>
                    <th>Joint Efficiency</th>
                    <th>Corrosion Allowance</th>
                    <th>Coating / Lining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.shell_courses.length === 0 ? (
                    <tr><td colSpan={9}>No shell courses have been registered for this tank.</td></tr>
                  ) : asset.shell_courses.map((course) => (
                    <tr key={course.shell_course_id}>
                      <td>{course.course_no}</td>
                      <td>{course.course_height ?? '-'} {course.course_height_unit ?? 'm'}</td>
                      <td>{course.nominal_thickness ?? '-'} {course.nominal_thickness_unit ?? 'mm'}</td>
                      <td>{course.measured_min_thickness ?? '-'} {course.measured_min_thickness_unit ?? 'mm'}</td>
                      <td>{course.material_code ?? '-'}<br /><span className="muted-text">{course.material_specification ?? course.material_name ?? '-'}</span></td>
                      <td>{course.joint_efficiency ?? '-'}</td>
                      <td>{course.corrosion_allowance ?? '-'} {course.corrosion_allowance_unit ?? 'mm'}</td>
                      <td>{course.coating_lining_status ?? '-'}</td>
                      <td>
                        <div className="action-row">
                          <button className="secondary-button" type="button" onClick={() => setSelectedCourse(course)}>Edit</button>
                          <button className="secondary-button" type="button" onClick={() => void deleteShellCourse(course)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form className="panel form-grid wide-panel" onSubmit={saveShellCourse} key={selectedCourse?.shell_course_id ?? 'new-shell-course'}>
            <div className="panel-heading">
              <h2>{selectedCourse ? `Edit Shell Course ${selectedCourse.course_no}` : 'Add Shell Course'}</h2>
              <p>Material selector is loaded from the existing material master API. Backend validation remains authoritative.</p>
            </div>
            <label><span>Course No</span><input name="course_no" type="number" min="1" defaultValue={optionalNumber(selectedCourse?.course_no)} required /></label>
            <label><span>Course Height</span><input name="course_height" type="number" step="0.001" defaultValue={optionalNumber(selectedCourse?.course_height)} required /></label>
            <label>
              <span>Course Height Unit</span>
              <select name="course_height_unit" defaultValue={selectedCourse?.course_height_unit ?? 'm'} required>
                {lengthUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label><span>Nominal Thickness</span><input name="nominal_thickness" type="number" step="0.001" defaultValue={optionalNumber(selectedCourse?.nominal_thickness)} required /></label>
            <label>
              <span>Nominal Thickness Unit</span>
              <select name="nominal_thickness_unit" defaultValue={selectedCourse?.nominal_thickness_unit ?? 'mm'} required>
                {thicknessUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label><span>Measured Min Thickness</span><input name="measured_min_thickness" type="number" step="0.001" defaultValue={optionalNumber(selectedCourse?.measured_min_thickness)} required /></label>
            <label>
              <span>Measured Min Thickness Unit</span>
              <select name="measured_min_thickness_unit" defaultValue={selectedCourse?.measured_min_thickness_unit ?? 'mm'} required>
                {thicknessUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              <span>Material Master Selector</span>
              <select name="material_id" defaultValue={selectedCourse?.material_id ?? firstMaterialId} required>
                {materials.length === 0 ? <option value="">No active material options</option> : materials.map((material) => <option key={material.material_id} value={material.material_id}>{materialLabel(material)}</option>)}
              </select>
            </label>
            <label><span>Material Specification</span><input name="material_specification" defaultValue={selectedCourse?.material_specification ?? selectedMaterialSpec} placeholder="Auto-filled from selected material where backend supports it" /></label>
            <label><span>Joint Efficiency</span><input name="joint_efficiency" type="number" step="0.001" min="0.001" max="1" defaultValue={optionalNumber(selectedCourse?.joint_efficiency)} required /></label>
            <label><span>Corrosion Allowance</span><input name="corrosion_allowance" type="number" step="0.001" defaultValue={optionalNumber(selectedCourse?.corrosion_allowance)} required /></label>
            <label>
              <span>Corrosion Allowance Unit</span>
              <select name="corrosion_allowance_unit" defaultValue={selectedCourse?.corrosion_allowance_unit ?? 'mm'} required>
                {thicknessUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label><span>Coating Lining Status</span><input name="coating_lining_status" defaultValue={selectedCourse?.coating_lining_status ?? ''} placeholder="coated / uncoated / lined / unknown" required /></label>
            <button className="primary-button" type="submit">{selectedCourse ? 'Update Shell Course' : 'Add Shell Course'}</button>
          </form>

          <section className="panel wide-panel">
            <div className="panel-heading">
              <h2>Related Links</h2>
              <p>Links use safe application routes and do not expose raw object keys, signed URLs, secrets, or evidence contents.</p>
            </div>
            <div className="action-row">
              <Link className="secondary-button" href={`/audit-logs?entity_type=asset&entity_id=${assetId}`}>Audit Log</Link>
              <Link className="secondary-button" href={`/evidence?asset_id=${assetId}`}>Evidence</Link>
              <Link className="secondary-button" href={`/ndt?asset_id=${assetId}`}>NDT</Link>
              <Link className="secondary-button" href={`/calculations?asset_id=${assetId}`}>Calculation</Link>
              <Link className="secondary-button" href={`/assets/${assetId}/findings`}>Findings</Link>
              <Link className="secondary-button" href={`/reports?asset_id=${assetId}`}>Report</Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
