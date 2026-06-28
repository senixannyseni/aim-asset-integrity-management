'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ApiErrorPayload = { error?: { code?: string; message?: string } };
type DictionaryField = {
  field_id?: string;
  group_name: string;
  field_name: string;
  label: string;
  unit?: string | null;
  data_type: string;
  allowed_range?: unknown;
  required_status?: string | null;
  source_preference?: string | null;
  validation_severity?: string | null;
  engineering_note?: string | null;
  entity_table?: string;
  api_payload?: string;
  frontend_page?: string;
  evidence_linkage_requirement?: string;
};

const rc4eDictionaryExpansion: DictionaryField[] = [
  { group_name: 'Asset Register', field_name: 'asset_id', label: 'Asset ID', data_type: 'uuid', required_status: 'required', entity_table: 'assets', api_payload: 'asset_id', frontend_page: '/assets, /assets/{assetId}/validation', evidence_linkage_requirement: 'Evidence and NDT records must reference the same asset where applicable.', engineering_note: 'AIM/PostgreSQL system-of-record identifier.' },
  { group_name: 'Asset Register', field_name: 'asset_tag', label: 'Tank tag', data_type: 'text', required_status: 'required', entity_table: 'assets', api_payload: 'tank_tag / asset_tag', frontend_page: '/assets', engineering_note: 'Human-readable tank identifier; validation must not infer missing tags.' },
  { group_name: 'Tank Geometry', field_name: 'diameter', label: 'Tank diameter', data_type: 'number', unit: 'm', required_status: 'required', entity_table: 'tank_geometry', api_payload: 'diameter, diameter_unit', frontend_page: '/assets/{assetId}', engineering_note: 'Unit-normalized by backend; no engineering calculation is performed by RC4-E.' },
  { group_name: 'Tank Geometry', field_name: 'shell_height', label: 'Shell height', data_type: 'number', unit: 'm', required_status: 'required', entity_table: 'tank_geometry', api_payload: 'shell_height, shell_height_unit', frontend_page: '/assets/{assetId}', engineering_note: 'Missing or ambiguous unit blocks readiness where backend marks it blocking.' },
  { group_name: 'Shell Course', field_name: 'course_no', label: 'Course number', data_type: 'integer', required_status: 'required', entity_table: 'shell_courses', api_payload: 'course_no', frontend_page: '/assets/{assetId}', engineering_note: 'Shell course completeness is a readiness control only.' },
  { group_name: 'Shell Course', field_name: 'nominal_thickness', label: 'Nominal thickness', data_type: 'number', unit: 'mm', required_status: 'conditional', entity_table: 'shell_courses', api_payload: 'nominal_thickness, nominal_thickness_unit', frontend_page: '/assets/{assetId}', engineering_note: 'Displayed for traceability; RC4-E adds no minimum-thickness formula.' },
  { group_name: 'Material Master', field_name: 'material_id', label: 'Material ID', data_type: 'uuid', required_status: 'conditional', entity_table: 'materials, shell_courses', api_payload: 'material_id', frontend_page: '/assets/{assetId}/validation', engineering_note: 'Material completeness is visible; AIM must not infer material properties.' },
  { group_name: 'Material Master', field_name: 'joint_efficiency', label: 'Joint efficiency', data_type: 'number', required_status: 'conditional', entity_table: 'shell_courses', api_payload: 'joint_efficiency', frontend_page: '/assets/{assetId}/validation', engineering_note: 'Engineer-entered basis only; no standard clause is reproduced.' },
  { group_name: 'Inspection Event', field_name: 'inspection_event_id', label: 'Inspection/event ID', data_type: 'uuid', required_status: 'conditional', entity_table: 'inspection_events', api_payload: 'inspection_event_id / inspection_id', frontend_page: '/evidence, /ndt', evidence_linkage_requirement: 'Evidence and NDT may reference inspection context where available.', engineering_note: 'Inspection context improves traceability but is not an approval.' },
  { group_name: 'Evidence File', field_name: 'evidence_file_id', label: 'Evidence file ID', data_type: 'uuid', required_status: 'conditional', entity_table: 'evidence_files', api_payload: 'evidence_file_id', frontend_page: '/evidence/{evidenceId}, /assets/{assetId}/validation', evidence_linkage_requirement: 'Mandatory for findings, NDT, calculations, decisions, and reports where governance requires evidence.', engineering_note: 'Raw object keys and signed URLs must not be displayed.' },
  { group_name: 'Evidence File', field_name: 'checksum_sha256', label: 'SHA-256 checksum', data_type: 'text', required_status: 'required', entity_table: 'evidence_files', api_payload: 'checksum_sha256', frontend_page: '/evidence', engineering_note: 'Checksum supports object-storage evidence integrity.' },
  { group_name: 'Evidence Object Storage', field_name: 'malware_scan_status', label: 'Malware scan status', data_type: 'status', required_status: 'required', entity_table: 'evidence_files', api_payload: 'malware_scan_status', frontend_page: '/evidence/{evidenceId}', engineering_note: 'Blocked/infected evidence cannot be previewed or opened.' },
  { group_name: 'Evidence Linkage', field_name: 'linked_entity_type', label: 'Linked entity type', data_type: 'enum', required_status: 'required', entity_table: 'evidence_links', api_payload: 'linked_entity_type', frontend_page: '/evidence/{evidenceId}, /assets/{assetId}/validation', evidence_linkage_requirement: 'Same-asset boundary must be enforced by backend.', engineering_note: 'Evidence linkage is traceability, not approval.' },
  { group_name: 'NDT Measurement', field_name: 'measured_thickness', label: 'Measured thickness', data_type: 'number', unit: 'mm', required_status: 'conditional', entity_table: 'ndt_measurements', api_payload: 'measured_thickness, measured_thickness_unit', frontend_page: '/ndt, /ndt/{measurementId}, /assets/{assetId}/validation', evidence_linkage_requirement: 'Critical NDT must link to evidence before final engineering use.', engineering_note: 'RC4-E displays unit issues only; it does not calculate acceptability.' },
  { group_name: 'NDT Import', field_name: 'grid_ref', label: 'Grid/CML/TML reference', data_type: 'text', required_status: 'conditional', entity_table: 'ndt_measurements', api_payload: 'grid_ref / cml_tml_id', frontend_page: '/ndt', engineering_note: 'Used for visualization and traceability only.' },
  { group_name: 'Validation Run', field_name: 'validation_run_id', label: 'Validation run ID', data_type: 'uuid', required_status: 'required', entity_table: 'validation_runs', api_payload: 'validation_run_id', frontend_page: '/validation/history', engineering_note: 'Validation snapshots are read-only history records.' },
  { group_name: 'Validation Run', field_name: 'blocking_count', label: 'Blocking count', data_type: 'integer', required_status: 'required', entity_table: 'validation_runs', api_payload: 'blocking_count', frontend_page: '/validation, /assets/{assetId}/validation', engineering_note: 'Blocking validation prevents readiness but does not approve or reject data by itself.' },
  { group_name: 'Calculation Input', field_name: 'calculation_input_snapshot', label: 'Calculation input snapshot reference', data_type: 'json/hash reference', required_status: 'conditional', entity_table: 'calculation_runs, calculation_inputs', api_payload: 'input_snapshot_hash / calculation_run_id', frontend_page: '/calculations', evidence_linkage_requirement: 'Calculation input should preserve evidence and source-entity traceability.', engineering_note: 'RC4-E does not execute calculation logic.' },
  { group_name: 'Formula Version', field_name: 'formula_version_id', label: 'Formula version ID', data_type: 'uuid/text', required_status: 'conditional', entity_table: 'formula_registry', api_payload: 'formula_version_id / formula_id', frontend_page: '/formulas, /validation', engineering_note: 'Only approved formula versions may be used by calculation workflows.' },
  { group_name: 'Review Gate', field_name: 'reviewer_status', label: 'Reviewer status', data_type: 'status', required_status: 'conditional', entity_table: 'engineering_reviews, ndt_measurements', api_payload: 'reviewer_status', frontend_page: '/reviews, /ndt/{measurementId}', engineering_note: 'AI/service actors cannot approve engineering data.' },
  { group_name: 'Integrity Decision', field_name: 'decision_status', label: 'Integrity decision status', data_type: 'status', required_status: 'conditional', entity_table: 'integrity_decisions', api_payload: 'decision_status', frontend_page: '/integrity-decisions', evidence_linkage_requirement: 'Integrity decisions require evidence and review gates before issue.', engineering_note: 'Decision approval remains human-controlled.' },
  { group_name: 'Report Version', field_name: 'report_version_id', label: 'Report version ID', data_type: 'uuid', required_status: 'conditional', entity_table: 'report_versions, report_exports', api_payload: 'report_id / export_id', frontend_page: '/reports', evidence_linkage_requirement: 'Issued reports must satisfy evidence, calculation, and review gates.', engineering_note: 'RC4-E does not change report issue gates.' },
  { group_name: 'Audit Log', field_name: 'audit_log_id', label: 'Audit log ID', data_type: 'uuid', required_status: 'required for governed actions', entity_table: 'audit_logs', api_payload: 'audit_log_id', frontend_page: '/audit-logs', engineering_note: 'Validation, correction, approval, report issue, and work-order actions must remain auditable.' }
];

function StatusPanel({ type, title, message }: { type: 'loading' | 'empty' | 'error' | 'denied'; title: string; message: string }) {
  const className = type === 'error' || type === 'denied' ? 'error-list' : 'notice';
  return <section className={className} role={type === 'error' || type === 'denied' ? 'alert' : 'status'}><h2>{title}</h2><p>{message}</p></section>;
}
function badgeClass(value?: string | null): string {
  const normalized = String(value ?? '').toLowerCase();
  if (['blocking', 'required'].some((token) => normalized.includes(token))) return 'badge badge-danger';
  if (['warning', 'conditional'].some((token) => normalized.includes(token))) return 'badge badge-warning';
  return 'badge';
}
function mergeDictionaryFields(apiFields: DictionaryField[]): DictionaryField[] {
  const map = new Map<string, DictionaryField>();
  for (const field of rc4eDictionaryExpansion) map.set(`${field.group_name}:${field.field_name}`, field);
  for (const field of apiFields) {
    const key = `${field.group_name}:${field.field_name}`;
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, ...field } : field);
  }
  return Array.from(map.values()).sort((a, b) => `${a.group_name}:${a.field_name}`.localeCompare(`${b.group_name}:${b.field_name}`));
}

export default function DataDictionaryClient() {
  const [apiFields, setApiFields] = useState<DictionaryField[]>([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const dictionary = useMemo(() => mergeDictionaryFields(apiFields), [apiFields]);
  const domains = useMemo(() => Array.from(new Set(dictionary.map((field) => field.group_name))).sort(), [dictionary]);
  const visibleFields = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dictionary.filter((field) => {
      if (domainFilter && field.group_name !== domainFilter) return false;
      if (!query) return true;
      return [field.group_name, field.field_name, field.label, field.unit, field.data_type, field.required_status, field.validation_severity, field.source_preference, field.entity_table, field.api_payload, field.frontend_page, field.evidence_linkage_requirement, field.engineering_note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [dictionary, domainFilter, search]);

  async function loadDictionary() {
    setLoading(true); setPermissionDenied(false); setPageError(null);
    try {
      const response = await apiFetch('/api/v1/engineering/data-dictionary', { cache: 'no-store' });
      const payload = await response.json() as { data?: DictionaryField[] } & ApiErrorPayload;
      if (response.status === 401 || response.status === 403) { setPermissionDenied(true); return; }
      if (!response.ok) throw new Error(payload.error?.message ?? 'Engineering data dictionary could not be loaded.');
      setApiFields(payload.data ?? []);
    } catch (error) { setPageError(error instanceof Error ? error.message : 'Engineering data dictionary could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadDictionary(); }, []);

  if (loading) return <main className="app-shell"><StatusPanel type="loading" title="Loading data dictionary" message="Loading backend validation dictionary and RC4-E documentation expansion." /></main>;
  if (permissionDenied) return <main className="app-shell"><StatusPanel type="denied" title="Permission denied" message="Your role does not have data dictionary visibility." /></main>;
  if (pageError) return <main className="app-shell"><StatusPanel type="error" title="Data dictionary unavailable" message={pageError} /></main>;

  return (
    <main className="app-shell">
      <header className="page-header"><div><p className="eyebrow">RC4-E Data Dictionary</p><h1>Engineering Data Dictionary</h1><p>Searchable field dictionary for asset, evidence, NDT, validation, calculation, review, report, and audit traceability.</p></div><div className="action-row"><Link className="secondary-button" href="/validation">Validation overview</Link><Link className="secondary-button" href="/validation/history">Validation history</Link></div></header>

      <section className="panel">
        <div className="panel-heading"><h2>Search and filter</h2><p>No secrets, object keys, signed URLs, tokens, or sensitive config values are included.</p></div>
        <div className="form-grid"><label><span>Search</span><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="field, label, unit, source, rule, page" /></label><label><span>Domain</span><select value={domainFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDomainFilter(event.target.value)}><option value="">All domains</option>{domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></label></div>
      </section>

      <section className="cards compact-cards">{domains.map((domain) => <article key={domain}><h2>{dictionary.filter((field) => field.group_name === domain).length}</h2><p>{domain}</p></article>)}</section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Dictionary fields</h2><p>{visibleFields.length} field(s) shown. Backend validation remains authoritative; this page is documentation/traceability UX.</p></div>
        {visibleFields.length === 0 ? <StatusPanel type="empty" title="No fields match" message="Adjust search or domain filter." /> : <div className="table-wrap"><table><thead><tr><th>Domain</th><th>Field</th><th>Label</th><th>Required</th><th>Type</th><th>Unit</th><th>Validation rule summary</th><th>Source table/entity</th><th>Evidence linkage</th><th>Frontend/API</th><th>Governance note</th></tr></thead><tbody>{visibleFields.map((field) => <tr key={`${field.group_name}-${field.field_name}`}><td>{field.group_name}</td><td>{field.field_name}</td><td>{field.label}</td><td><span className={badgeClass(field.required_status)}>{field.required_status ?? '-'}</span></td><td>{field.data_type}</td><td>{field.unit ?? '-'}</td><td><span className={badgeClass(field.validation_severity)}>{field.validation_severity ?? 'documented'}</span></td><td>{field.entity_table ?? field.source_preference ?? '-'}</td><td>{field.evidence_linkage_requirement ?? '-'}</td><td><strong>UI:</strong> {field.frontend_page ?? '-'}<br /><strong>API:</strong> {field.api_payload ?? field.field_name}</td><td>{field.engineering_note ?? '-'}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}
