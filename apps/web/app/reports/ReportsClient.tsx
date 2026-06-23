'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type CalculationRun = {
  calculation_run_id: string;
  run_id: string;
  asset_id: string;
  run_status: string;
  review_status: string;
  approval_status: string;
  locked_flag: boolean;
};

type EvidenceRecord = {
  evidence_id: string;
  evidence_code?: string;
  original_filename?: string;
  file_name?: string;
};

type IntegrityDecision = {
  integrity_decision_id: string;
  decision_code?: string;
  calculation_run_id: string;
  decision_status: string;
  evidence_count?: number;
};

type ReportRecord = {
  report_id: string;
  report_code: string;
  report_title: string;
  report_status: string;
  report_version: number;
  calculation_run_id: string;
  docx_object_path?: string;
  pdf_object_path?: string;
  input_snapshot_hash?: string;
  locked_flag?: boolean;
};

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function messageFromPayload(payload: Record<string, unknown>): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? 'Request failed.';
}

function missingEvidenceFromPayload(payload: Record<string, unknown>): string[] {
  const gates = (payload.error as { gates?: Array<{ metadata?: { missing_required_evidence?: string[] } }> } | undefined)?.gates ?? [];
  return gates.flatMap((gate) => gate.metadata?.missing_required_evidence ?? []);
}

export default function ReportsClient() {
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [decisions, setDecisions] = useState<IntegrityDecision[]>([]);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [title, setTitle] = useState('Tank Integrity Professional Consultant Report');
  const [evidenceId, setEvidenceId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  async function loadData() {
    const [runRes, reportRes, evidenceRes, decisionRes] = await Promise.all([
      apiFetch('/api/v1/engineering/calculations', { cache: 'no-store' }),
      apiFetch('/api/v1/reports', { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' }),
      apiFetch('/api/v1/integrity-decisions', { cache: 'no-store' })
    ]);
    const [runPayload, reportPayload, evidencePayload, decisionPayload] = await Promise.all([runRes.json(), reportRes.json(), evidenceRes.json(), decisionRes.json()]);
    if (runRes.ok) {
      const rows = (runPayload.data ?? []) as CalculationRun[];
      setRuns(rows);
      if (!calculationRunId && rows[0]?.calculation_run_id) setCalculationRunId(rows[0].calculation_run_id);
    }
    if (reportRes.ok) setReports((reportPayload.data ?? []) as ReportRecord[]);
    if (evidenceRes.ok) {
      const rows = (evidencePayload.data ?? []) as EvidenceRecord[];
      setEvidence(rows);
      if (!evidenceId && rows[0]?.evidence_id) setEvidenceId(rows[0].evidence_id);
    }
    if (decisionRes.ok) setDecisions((decisionPayload.data ?? []) as IntegrityDecision[]);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch('/api/v1/reports/generate', {
      method: 'POST',
      body: JSON.stringify({
        calculation_run_id: calculationRunId,
        report_title: title,
        output_formats: ['docx', 'pdf']
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(messageFromPayload(payload));
      setSelected(payload?.error ?? null);
      return;
    }
    setMessage(`Draft report generated: ${payload.data?.report_code ?? payload.data?.report_id}. Draft until approved.`);
    setSelected(payload.data ?? null);
    await loadData();
  }

  async function approveReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: 'RC2 report approval after calculation and integrity decision readiness were checked.' })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Report approved by senior engineer/admin role.' : messageFromPayload(payload));
    setSelected(payload.data ?? payload.error ?? null);
    await loadData();
  }

  async function issueReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ issue_comment: 'RC2 report issue after per-entity evidence, calculation, integrity decision, and approval gates passed.' })
    });
    const payload = await response.json();
    const missing = missingEvidenceFromPayload(payload);
    setMessage(response.ok ? 'Report issued and locked.' : `${messageFromPayload(payload)}${missing.length ? ` Missing evidence: ${missing.join(', ')}` : ''}`);
    setSelected(payload.data ?? payload.error ?? null);
    await loadData();
  }

  async function linkEvidence(entityType: 'report' | 'calculation_run' | 'integrity_decision', entityId: string) {
    if (!evidenceId) {
      setMessage('Select evidence before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, {
      method: 'POST',
      body: JSON.stringify({
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        link_reason: `RC2 direct evidence link for ${entityType} report issue gate.`
      })
    });
    const payload = await response.json();
    setMessage(response.ok ? `Evidence linked to ${entityType}.` : messageFromPayload(payload));
    setSelected(payload.data ?? payload.error ?? null);
    await loadData();
  }

  function approvedDecisionForReport(report: ReportRecord): IntegrityDecision | undefined {
    return decisions.find((decision) => decision.calculation_run_id === report.calculation_run_id && decision.decision_status === 'approved');
  }

  return (
    <main>
      <p>Sprint 10 / RC2</p>
      <h1>Tank Integrity Report Generation</h1>
      <p>Reports remain draft until senior approval and final issue gates pass. RC2 requires direct evidence links to report, calculation_run, and approved integrity_decision.</p>
      <nav>
        <Link href="/login">Login</Link> | <Link href="/calculations">Calculations</Link> | <Link href="/integrity-decisions">Integrity Decisions</Link> | <Link href="/work-orders">Work Orders</Link> | <Link href="/evidence">Evidence Repository</Link>
      </nav>

      <section>
        <h2>Generate Draft Report</h2>
        <form onSubmit={generateReport}>
          <label>
            Calculation Run
            <select value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)}>
              <option value="">Select calculation run</option>
              {runs.map((run) => (
                <option key={run.calculation_run_id} value={run.calculation_run_id}>
                  {run.run_id ?? run.calculation_run_id} — {run.run_status}/{run.review_status}/{run.approval_status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Report Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <button type="submit" disabled={!calculationRunId}>Generate DOCX/PDF Draft</button>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section>
        <h2>Evidence to Reuse Across Required Links</h2>
        <label>
          Evidence
          <select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}>
            <option value="">Select evidence</option>
            {evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} — {item.original_filename ?? item.file_name}</option>)}
          </select>
        </label>
      </section>

      <section>
        <h2>Generated Reports and Gate Actions</h2>
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Status</th>
              <th>Calculation</th>
              <th>Approved Integrity Decision</th>
              <th>Required Evidence Links</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const approvedDecision = approvedDecisionForReport(report);
              const canIssue = report.report_status === 'approved' && Boolean(approvedDecision) && !report.locked_flag;
              return (
                <tr key={report.report_id}>
                  <td>{report.report_code}<br />{report.report_title}</td>
                  <td>{report.report_status === 'draft' ? 'DRAFT — NOT APPROVED' : report.report_status}{report.locked_flag ? ' / locked' : ''}</td>
                  <td>{report.calculation_run_id}</td>
                  <td>{approvedDecision?.decision_code ?? approvedDecision?.integrity_decision_id ?? 'missing approved decision'}</td>
                  <td>
                    <button type="button" onClick={() => linkEvidence('report', report.report_id)}>Link report</button>
                    <button type="button" onClick={() => linkEvidence('calculation_run', report.calculation_run_id)}>Link calculation_run</button>
                    <button type="button" disabled={!approvedDecision} onClick={() => approvedDecision && linkEvidence('integrity_decision', approvedDecision.integrity_decision_id)}>Link integrity_decision</button>
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelected(report as unknown as Record<string, unknown>)}>View</button>
                    <button type="button" disabled={report.report_status === 'issued'} onClick={() => approveReport(report.report_id)}>Approve</button>
                    <button type="button" disabled={!canIssue} onClick={() => issueReport(report.report_id)}>Issue</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Gate Detail / Missing Evidence / Traceability</h2>
        <pre>{selected ? renderJson(selected) : 'Select, approve, issue, or link evidence to see gate detail.'}</pre>
      </section>
    </main>
  );
}
