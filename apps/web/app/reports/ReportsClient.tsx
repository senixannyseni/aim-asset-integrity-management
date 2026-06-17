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
};

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ReportsClient() {
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [title, setTitle] = useState('Tank Integrity Professional Consultant Report');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  async function loadData() {
    const [runRes, reportRes] = await Promise.all([
      apiFetch('/api/v1/engineering/calculations', { cache: 'no-store' }),
      apiFetch('/api/v1/reports', { cache: 'no-store' })
    ]);
    const runPayload = await runRes.json();
    const reportPayload = await reportRes.json();
    if (runRes.ok) {
      const rows = (runPayload.data ?? []) as CalculationRun[];
      setRuns(rows);
      if (!calculationRunId && rows[0]?.calculation_run_id) setCalculationRunId(rows[0].calculation_run_id);
    }
    if (reportRes.ok) setReports((reportPayload.data ?? []) as ReportRecord[]);
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
      setMessage(payload?.error?.message ?? 'Failed to generate report.');
      setSelected(payload?.error ?? null);
      return;
    }
    setMessage(`Draft report generated: ${payload.data?.report_code ?? payload.data?.report_id}. Draft until approved.`);
    setSelected(payload.data ?? null);
    await loadData();
  }

  async function approveReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/approve`, { method: 'POST', body: '{}' });
    const payload = await response.json();
    setMessage(response.ok ? 'Report approved by senior engineer/admin role.' : payload?.error?.message ?? 'Approval failed.');
    setSelected(payload.data ?? payload.error ?? null);
    await loadData();
  }

  async function issueReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/issue`, { method: 'POST', body: '{}' });
    const payload = await response.json();
    setMessage(response.ok ? 'Report issued and locked.' : payload?.error?.message ?? 'Issue failed.');
    setSelected(payload.data ?? payload.error ?? null);
    await loadData();
  }

  return (
    <main>
      <p>Sprint 10</p>
      <h1>Tank Integrity Report Generation</h1>
      <p>Generate professional consultant-style DOCX/PDF draft reports from locked or review-ready calculation runs.</p>
      <nav>
        <Link href="/calculations">Calculations</Link> | <Link href="/reviews">Reviews</Link> | <Link href="/evidence">Evidence Repository</Link>
      </nav>

      <section>
        <h2>Generate Draft Report</h2>
        <p>Draft reports cite Formula Registry metadata, calculation run ID, input snapshot hash, evidence, validation warnings, FFS/RBI triggers, and review/approval records.</p>
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
        <h2>Generated Reports</h2>
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Status</th>
              <th>Version</th>
              <th>Calculation</th>
              <th>Outputs</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.report_id}>
                <td>{report.report_code}<br />{report.report_title}</td>
                <td>{report.report_status === 'draft' ? 'DRAFT — NOT APPROVED' : report.report_status}</td>
                <td>{report.report_version}</td>
                <td>{report.calculation_run_id}</td>
                <td>{report.docx_object_path ? 'DOCX ' : ''}{report.pdf_object_path ? 'PDF' : ''}</td>
                <td>
                  <button type="button" onClick={() => setSelected(report as unknown as Record<string, unknown>)}>View</button>
                  <button type="button" onClick={() => approveReport(report.report_id)}>Approve</button>
                  <button type="button" onClick={() => issueReport(report.report_id)}>Issue</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Report Detail / Traceability</h2>
        <pre>{selected ? renderJson(selected) : 'Select or generate a report.'}</pre>
      </section>
    </main>
  );
}
