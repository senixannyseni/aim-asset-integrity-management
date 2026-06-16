'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type Severity = 'info' | 'warning' | 'blocking';
type ValidationIssue = {
  group: string;
  field_name: string;
  label: string;
  severity: Severity;
  message: string;
  suggested_fix: string;
  engineering_note?: string;
};

type ValidationResponse = {
  validation_run_id: string;
  run_code: string;
  ok: boolean;
  blocking_count: number;
  warning_count: number;
  info_count: number;
  issues: ValidationIssue[];
  grouped: Record<string, ValidationIssue[]>;
};

type DictionaryField = {
  field_id: string;
  group_name: string;
  field_name: string;
  label: string;
  unit?: string;
  data_type: string;
  required_status: string;
  validation_severity: Severity;
  engineering_note: string;
};

const defaultPayload = JSON.stringify(
  {
    validation_scope: 'final_approval',
    asset: {
      tank_tag: 'TK-001',
      asset_name: 'Demo Tank',
      original_design_code: 'API 650',
      current_assessment_code: 'API 653'
    },
    geometry: {
      diameter: null,
      shell_height: null
    },
    shell_courses: [
      {
        course_no: 1,
        nominal_thickness: 12,
        material_specification: 'A36'
      }
    ],
    ndt_measurements: [
      {
        measurement_id: 'demo-ndt-001',
        component: 'shell',
        measured_thickness: 10.5,
        measured_thickness_unit: 'mm',
        is_critical: true
      }
    ],
    evidence_links: [],
    calculation_request: {
      thickness_check_requested: true
    },
    formula_registry: [],
    approval_request: {
      final_approval_requested: true
    }
  },
  null,
  2
);

const groups = ['asset', 'geometry', 'shell_course', 'material', 'ndt', 'evidence', 'formula', 'approval'];

function severityClass(severity: Severity): string {
  if (severity === 'blocking') return 'badge badge-danger';
  if (severity === 'warning') return 'badge badge-warning';
  return 'badge';
}

export default function ValidationPanelClient() {
  const [dictionary, setDictionary] = useState<DictionaryField[]>([]);
  const [payloadText, setPayloadText] = useState(defaultPayload);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dictionaryByGroup = useMemo(() => {
    return dictionary.reduce<Record<string, DictionaryField[]>>((acc, field) => {
      acc[field.group_name] = [...(acc[field.group_name] ?? []), field];
      return acc;
    }, {});
  }, [dictionary]);

  useEffect(() => {
    async function loadDictionary() {
      const response = await apiFetch('/api/v1/engineering/data-dictionary', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) setDictionary(payload.data ?? []);
    }
    void loadDictionary();
  }, []);

  async function runValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setResult(null);

    let body: unknown;
    try {
      body = JSON.parse(payloadText);
    } catch {
      setMessage('Payload must be valid JSON.');
      setSaving(false);
      return;
    }

    const response = await apiFetch('/api/v1/engineering/validate-input', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const apiResult = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(apiResult?.error?.message ?? 'Validation failed.');
      return;
    }

    setResult(apiResult.data);
    setMessage(apiResult.data.ok ? 'Validation completed with no blocking issues.' : 'Validation completed with blocking issues.');
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 4</p>
          <h1>Engineering Validation Panel</h1>
          <p>Deterministic validation for asset, geometry, shell course, material, NDT, evidence, formula readiness, and approval gates.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/assets">Assets</Link>
          <Link className="secondary-button" href="/evidence">Evidence</Link>
          <Link className="secondary-button" href="/ndt">NDT</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel" onSubmit={runValidation}>
          <div className="panel-heading">
            <h2>Run Validation</h2>
            <p>Use an asset_id to validate stored data, or provide a JSON context payload directly. This does not run calculations.</p>
          </div>
          <label>
            <span>Validation payload JSON</span>
            <textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} rows={22} />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Validating...' : 'Run Engineering Validation'}</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Validation Result</h2>
            <p>Blocking issues prevent calculation or approval as configured.</p>
          </div>

          {!result ? (
            <p>No validation run yet.</p>
          ) : (
            <>
              <div className="cards compact-cards">
                <article><h2>{result.blocking_count}</h2><p>Blocking</p></article>
                <article><h2>{result.warning_count}</h2><p>Warnings</p></article>
                <article><h2>{result.info_count}</h2><p>Info</p></article>
              </div>
              <p><strong>Run:</strong> {result.run_code}</p>
              <p><strong>Status:</strong> {result.ok ? 'OK' : 'Blocked'}</p>
              {groups.map((group) => {
                const issues = result.grouped?.[group] ?? [];
                return (
                  <section key={group} className="validation-group">
                    <h3>{group.replaceAll('_', ' ')}</h3>
                    {issues.length === 0 ? <p>No issues.</p> : issues.map((issue) => (
                      <article key={`${issue.field_name}-${issue.message}`} className="issue-card">
                        <div className="row-between">
                          <strong>{issue.label}</strong>
                          <span className={severityClass(issue.severity)}>{issue.severity}</span>
                        </div>
                        <p><strong>Field:</strong> {issue.field_name}</p>
                        <p>{issue.message}</p>
                        <p><strong>Suggested fix:</strong> {issue.suggested_fix}</p>
                        {issue.engineering_note && <p><strong>Engineering note:</strong> {issue.engineering_note}</p>}
                      </article>
                    ))}
                  </section>
                );
              })}
            </>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Engineering Data Dictionary</h2>
          <p>Current deterministic validation field registry.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Group</th><th>Field</th><th>Label</th><th>Unit</th><th>Required</th><th>Severity</th><th>Engineering Note</th></tr>
            </thead>
            <tbody>
              {Object.entries(dictionaryByGroup).flatMap(([group, fields]) => fields.map((field) => (
                <tr key={field.field_id}>
                  <td>{group}</td>
                  <td>{field.field_name}</td>
                  <td>{field.label}</td>
                  <td>{field.unit ?? '-'}</td>
                  <td>{field.required_status}</td>
                  <td><span className={severityClass(field.validation_severity)}>{field.validation_severity}</span></td>
                  <td>{field.engineering_note}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
