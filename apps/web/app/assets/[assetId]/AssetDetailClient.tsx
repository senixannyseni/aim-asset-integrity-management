'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type Material = {
  material_id: string;
  material_code: string;
  material_name: string;
  material_specification: string;
};

type ShellCourse = {
  shell_course_id: string;
  course_no: number;
  course_height: number;
  nominal_thickness: number;
  measured_min_thickness: number;
  material_id: string;
  material_code: string;
  material_specification: string;
  joint_efficiency: number;
  corrosion_allowance: number;
  coating_lining_status: string;
};

type TankAssetBundle = {
  asset_id: string;
  tank_tag: string;
  asset_name: string;
  facility: string;
  location: string;
  service_fluid: string;
  original_design_code: string;
  current_assessment_code: string;
  code_edition: string;
  owner: string;
  operating_status: string;
  geometry: Record<string, string | number | null> | null;
  shell_courses: ShellCourse[];
};

type ValidationIssue = { field: string; message: string; severity: string };

function value(form: HTMLFormElement, name: string): string {
  const data = new FormData(form).get(name);
  return typeof data === 'string' ? data : '';
}

function n(form: HTMLFormElement, name: string): number {
  return Number(value(form, name));
}

export default function AssetDetailClient({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<TankAssetBundle | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [assetResponse, materialResponse] = await Promise.all([
      apiFetch(`/api/v1/assets/${assetId}`, { cache: 'no-store' }),
      apiFetch('/api/v1/materials', { cache: 'no-store' })
    ]);
    const assetPayload = await assetResponse.json();
    const materialPayload = await materialResponse.json();
    setAsset(assetPayload.data ?? null);
    setMaterials(materialPayload.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [assetId]);

  async function submitGeometry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage(null);
    const form = event.currentTarget;
    const payload = {
      diameter: n(form, 'diameter'),
      diameter_unit: 'm',
      shell_height: n(form, 'shell_height'),
      shell_height_unit: 'm',
      number_of_courses: n(form, 'number_of_courses'),
      design_liquid_level: n(form, 'design_liquid_level'),
      design_liquid_level_unit: 'm',
      nominal_capacity: n(form, 'nominal_capacity'),
      specific_gravity: n(form, 'specific_gravity'),
      design_temperature: n(form, 'design_temperature'),
      design_pressure: n(form, 'design_pressure'),
      vacuum_design_basis: value(form, 'vacuum_design_basis'),
      bottom_type: value(form, 'bottom_type'),
      roof_type: value(form, 'roof_type'),
      foundation_type: value(form, 'foundation_type'),
      construction_year: Number(asset?.geometry?.construction_year ?? asset?.geometry?.construction_year ?? 2015)
    };

    const response = await apiFetch(`/api/v1/assets/${assetId}/geometry`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Geometry update failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }
    setMessage(`Geometry saved. Audit log: ${result.auditLogId ?? 'created'}`);
    await load();
  }

  async function submitShellCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage(null);
    const form = event.currentTarget;
    const materialId = value(form, 'material_id');
    const material = materials.find((item) => item.material_id === materialId);
    const payload = {
      course_no: n(form, 'course_no'),
      course_height: n(form, 'course_height'),
      course_height_unit: 'm',
      nominal_thickness: n(form, 'nominal_thickness'),
      nominal_thickness_unit: 'mm',
      measured_min_thickness: n(form, 'measured_min_thickness'),
      measured_min_thickness_unit: 'mm',
      material_id: materialId,
      material_specification: material?.material_specification ?? '',
      joint_efficiency: n(form, 'joint_efficiency'),
      corrosion_allowance: n(form, 'corrosion_allowance'),
      corrosion_allowance_unit: 'mm',
      coating_lining_status: value(form, 'coating_lining_status')
    };

    const response = await apiFetch(`/api/v1/assets/${assetId}/shell-courses`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? 'Shell course create failed.');
      setErrors(result?.error?.details ?? []);
      return;
    }
    setMessage(`Shell course ${result.data.course_no} saved. Audit log: ${result.auditLogId ?? 'created'}`);
    form.reset();
    await load();
  }

  if (loading) {
    return <main className="app-shell"><p>Loading tank asset...</p></main>;
  }

  if (!asset) {
    return <main className="app-shell"><p>Tank asset not found.</p><Link href="/assets">Back to register</Link></main>;
  }

  const geometry = asset.geometry ?? {};
  const nextCourseNo = (asset.shell_courses?.length ?? 0) + 1;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Tank Master Data</p>
          <h1>{asset.tank_tag} — {asset.asset_name}</h1>
          <p>{asset.facility} / {asset.location}. Codes: {asset.original_design_code} + {asset.current_assessment_code}, edition: {asset.code_edition}.</p>
        </div>
        <Link className="secondary-button" href="/assets">Back to Asset Register</Link>
      </header>

      {message && <div className="notice">{message}</div>}
      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((error) => <p key={`${error.field}-${error.message}`}><strong>{error.field}</strong>: {error.message}</p>)}
        </div>
      )}

      <section className="grid-two">
        <form className="panel form-grid" onSubmit={submitGeometry}>
          <div className="panel-heading">
            <h2>Tank Geometry</h2>
            <p>Length is entered in meters and normalized internally. Capacity is m³, pressure kPa, temperature °C.</p>
          </div>
          <label><span>diameter (m)</span><input name="diameter" type="number" step="0.001" defaultValue={String(geometry.diameter ?? 20)} required /></label>
          <label><span>shell_height (m)</span><input name="shell_height" type="number" step="0.001" defaultValue={String(geometry.shell_height ?? 12)} required /></label>
          <label><span>number_of_courses</span><input name="number_of_courses" type="number" defaultValue={String(geometry.number_of_courses ?? 3)} required /></label>
          <label><span>design_liquid_level (m)</span><input name="design_liquid_level" type="number" step="0.001" defaultValue={String(geometry.design_liquid_level ?? 11.5)} required /></label>
          <label><span>nominal_capacity (m³)</span><input name="nominal_capacity" type="number" step="0.001" defaultValue={String(geometry.nominal_capacity ?? 3500)} required /></label>
          <label><span>specific_gravity</span><input name="specific_gravity" type="number" step="0.001" defaultValue={String(geometry.specific_gravity ?? 1)} required /></label>
          <label><span>design_temperature (°C)</span><input name="design_temperature" type="number" step="0.001" defaultValue={String(geometry.design_temperature ?? 60)} required /></label>
          <label><span>design_pressure (kPa)</span><input name="design_pressure" type="number" step="0.001" defaultValue={String(geometry.design_pressure ?? 0)} required /></label>
          <label><span>vacuum_design_basis</span><input name="vacuum_design_basis" defaultValue={String(geometry.vacuum_design_basis ?? 'Not specified - engineering review required')} required /></label>
          <label><span>bottom_type</span><input name="bottom_type" defaultValue={String(geometry.bottom_type ?? 'flat_bottom')} required /></label>
          <label><span>roof_type</span><input name="roof_type" defaultValue={String(geometry.roof_type ?? 'fixed_roof')} required /></label>
          <label><span>foundation_type</span><input name="foundation_type" defaultValue={String(geometry.foundation_type ?? 'ringwall')} required /></label>
          <button className="primary-button" type="submit">Save Geometry</button>
        </form>

        <form className="panel form-grid" onSubmit={submitShellCourse}>
          <div className="panel-heading">
            <h2>Add Shell Course</h2>
            <p>Course height is entered in meters and stored internally in mm. Thickness is stored in mm.</p>
          </div>
          <label><span>course_no</span><input name="course_no" type="number" defaultValue={nextCourseNo} required /></label>
          <label><span>course_height (m)</span><input name="course_height" type="number" step="0.001" defaultValue="4" required /></label>
          <label><span>nominal_thickness (mm)</span><input name="nominal_thickness" type="number" step="0.001" defaultValue="10" required /></label>
          <label><span>measured_min_thickness (mm)</span><input name="measured_min_thickness" type="number" step="0.001" defaultValue="9.5" required /></label>
          <label>
            <span>material</span>
            <select name="material_id" required>
              <option value="">Select material</option>
              {materials.map((material) => <option key={material.material_id} value={material.material_id}>{material.material_code} — {material.material_specification}</option>)}
            </select>
          </label>
          <label><span>joint_efficiency</span><input name="joint_efficiency" type="number" step="0.0001" min="0.0001" max="1" defaultValue="1" required /></label>
          <label><span>corrosion_allowance (mm)</span><input name="corrosion_allowance" type="number" step="0.001" defaultValue="1" required /></label>
          <label><span>coating_lining_status</span><input name="coating_lining_status" defaultValue="unknown" required /></label>
          <button className="primary-button" type="submit">Add Shell Course</button>
        </form>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading">
          <h2>Shell Course Table</h2>
          <p>Material, thickness, coating/lining and joint efficiency are required before future calculation approval.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Height</th>
                <th>Nominal t</th>
                <th>Measured min t</th>
                <th>Material</th>
                <th>Joint eff.</th>
                <th>CA</th>
                <th>Coating/Lining</th>
              </tr>
            </thead>
            <tbody>
              {asset.shell_courses.length === 0 ? (
                <tr><td colSpan={8}>No shell course data yet.</td></tr>
              ) : asset.shell_courses.map((course) => (
                <tr key={course.shell_course_id}>
                  <td>{course.course_no}</td>
                  <td>{course.course_height} m</td>
                  <td>{course.nominal_thickness} mm</td>
                  <td>{course.measured_min_thickness} mm</td>
                  <td>{course.material_code ?? course.material_specification}</td>
                  <td>{course.joint_efficiency}</td>
                  <td>{course.corrosion_allowance} mm</td>
                  <td><span className="badge">{course.coating_lining_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
