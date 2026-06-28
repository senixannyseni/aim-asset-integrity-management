'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type CurrentUser = { permissions?: string[]; roles?: string[] };
type ReportDetail = {
  report_id: string;
  report_code?: string;
  report_title?: string;
  report_status?: string;
  report_version?: number;
  asset_id?: string;
  calculation_run_id?: string;
  locked_flag?: boolean;
  generated_at?: string;
  approved_at?: string;
  issued_at?: string;
  traceability?: unknown;
  validation_warnings?: unknown;
  limitations?: unknown;
  sections?: Array<{ title?: string; body?: string[] }> | unknown;
  evidence_register?: unknown;
};
type ReportExport = {
  report_export_id: string;
  export_id?: string;
  export_format?: string;
  export_type?: string;
  export_status?: string;
  download_status?: string;
  content_hash_sha256?: string;
  created_at?: string;
};
type EvidenceRecord = { evidence_id: string; evidence_code?: string; original_filename?: string; file_name?: string };
type Gate = { gate_type: string; gate_status: string; blocking: boolean; message: string; metadata?: Record<string, unknown> };
type IssueReadiness = {
  ready_to_issue: boolean;
  ready_to_issue_after_comment: boolean;
  blocking_gate_count: number;
  blocking_gate_count_excluding_issue_comment: number;
  issue_comment_required: boolean;
  gates: Gate[];
  blocking_gates: Gate[];
  evidence_counts?: Record<string, number>;
  linked_context?: { calculation_run_id?: string | null; integrity_decision_id?: string | null; approved_integrity_decision_id?: string | null };
};

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function badgeClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('fail') || value.includes('reject') || value.includes('blocked')) return 'badge badge-danger';
  if (value.includes('draft') || value.includes('pending') || value.includes('approved')) return 'badge badge-warning';
  return 'badge';
}

function messageFromPayload(payload: Record<string, unknown>, fallback = 'Request failed.'): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? fallback;
}

function sectionRows(sections: unknown): Array<{ title?: string; body?: string[] }> {
  return Array.isArray(sections) ? sections as Array<{ title?: string; body?: string[] }> : [];
}

export default function ReportDetailClient({ reportId }: { reportId: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [readiness, setReadiness] = useState<IssueReadiness | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [evidenceId, setEvidenceId] = useState('');
  const [approvalComment, setApprovalComment] = useState('Senior/lead engineer approval after report traceability, evidence, calculation, and integrity decision readiness review.');
  const [issueComment, setIssueComment] = useState('Final issue after report issue readiness gates passed and required evidence links were verified.');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const canApprove = hasPermission(user, 'report.approve');
  const canIssue = hasPermission(user, 'report.issue');
  const canExport = hasPermission(user, 'report.export');
  const canLinkEvidence = hasPermission(user, 'evidence.link');
  const reportLocked = Boolean(detail?.locked_flag || detail?.report_status === 'issued');
  const openBlockingGates = useMemo(() => readiness?.blocking_gates?.filter((gate) => gate.gate_type !== 'approver_comment_present') ?? [], [readiness]);

  async function loadDetail() {
    const [meRes, detailRes, exportsRes, readinessRes, evidenceRes] = await Promise.all([
      apiFetch('/api/v1/auth/me', { cache: 'no-store' }),
      apiFetch(`/api/v1/reports/${reportId}`, { cache: 'no-store' }),
      apiFetch(`/api/v1/reports/${reportId}/exports`, { cache: 'no-store' }),
      apiFetch(`/api/v1/reports/${reportId}/issue-readiness`, { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' })
    ]);
    const [mePayload, detailPayload, exportsPayload, readinessPayload, evidencePayload] = await Promise.all([
      meRes.json().catch(() => ({})),
      detailRes.json().catch(() => ({})),
      exportsRes.json().catch(() => ({})),
      readinessRes.json().catch(() => ({})),
      evidenceRes.json().catch(() => ({}))
    ]);
    if (meRes.ok) setUser(mePayload.data?.user ?? null);
    if (detailRes.ok) setDetail(detailPayload.data as ReportDetail);
    else setMessage(messageFromPayload(detailPayload, 'Report detail could not be loaded.'));
    if (exportsRes.ok) setExports((exportsPayload.data ?? []) as ReportExport[]);
    if (readinessRes.ok) setReadiness(readinessPayload.data as IssueReadiness);
    if (evidenceRes.ok) {
      const rows = (evidencePayload.data ?? []) as EvidenceRecord[];
      setEvidence(rows);
      if (!evidenceId && rows[0]?.evidence_id) setEvidenceId(rows[0].evidence_id);
    }
  }

  useEffect(() => { void loadDetail(); }, [reportId]);

  async function approveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/reports/${reportId}/approve`, { method: 'POST', body: JSON.stringify({ approval_comment: approvalComment }) });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Report approved. Issue remains blocked until all issue gates pass.' : messageFromPayload(payload));
    await loadDetail();
  }

  async function issueReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/reports/${reportId}/issue`, { method: 'POST', body: JSON.stringify({ issue_comment: issueComment }) });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Report issued and locked.' : messageFromPayload(payload));
    await loadDetail();
  }

  async function createExport(exportType: 'pdf' | 'docx' | 'json' | 'html') {
    setMessage(null);
    const response = await apiFetch(`/api/v1/reports/${reportId}/exports`, { method: 'POST', body: JSON.stringify({ export_type: exportType }) });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? `Report ${exportType.toUpperCase()} export created with object-storage checksum.` : messageFromPayload(payload));
    await loadDetail();
  }

  async function openExport(exportId: string) {
    const response = await apiFetch(`/api/v1/report-exports/${exportId}/download-url`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    const downloadUrl = payload.data?.download_url;
    setSelected(payload.data ?? payload.error ?? null);
    if (response.ok && typeof downloadUrl === 'string') window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    else setMessage(messageFromPayload(payload, 'Export download URL could not be created.'));
  }

  async function linkEvidence(entityType: 'report' | 'calculation_run' | 'integrity_decision', entityId?: string | null) {
    if (!evidenceId || !entityId) {
      setMessage('Select evidence and ensure target entity exists before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, {
      method: 'POST',
      body: JSON.stringify({
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        link_reason: `RC4-K direct evidence link for report issue readiness gate: ${entityType}.`
      })
    });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? `Evidence linked to ${entityType}.` : messageFromPayload(payload));
    await loadDetail();
  }

  if (!detail) {
    return <main><p>Loading report detail...</p>{message && <p>{message}</p>}<Link href="/reports">Back to reports</Link></main>;
  }

  return (
    <main>
      <p>RC4-K report detail and issue readiness</p>
      <h1>{detail.report_code ?? detail.report_id}</h1>
      <p>{detail.report_title}</p>
      <nav><Link href="/reports">Reports</Link> | <Link href={`/calculations/${detail.calculation_run_id}`}>Calculation</Link> | <Link href="/integrity-decisions">Integrity Decisions</Link> | <Link href="/evidence">Evidence</Link></nav>

      <section className="panel-grid">
        <article className="summary-card"><strong>Status</strong><br /><span className={badgeClass(detail.report_status)}>{detail.report_status}</span>{reportLocked ? <p>Locked / immutable.</p> : <p>Draft/approved report can still progress through governed actions.</p>}</article>
        <article className="summary-card"><strong>Issue readiness</strong><br /><span className={badgeClass(readiness?.ready_to_issue_after_comment ? 'pass' : 'fail')}>{readiness?.ready_to_issue_after_comment ? 'Ready after issue comment' : 'Blocked'}</span><p>{readiness?.blocking_gate_count_excluding_issue_comment ?? '-'} blocking gate(s) excluding issue comment.</p></article>
        <article className="summary-card"><strong>Evidence counts</strong><pre>{renderJson(readiness?.evidence_counts ?? {})}</pre></article>
      </section>

      {message && <section><p>{message}</p></section>}

      <section>
        <h2>Issue Readiness Gates</h2>
        <p>Read-only preview from <code>/api/v1/reports/{'{reportId}'}/issue-readiness</code>. The issue endpoint remains authoritative and requires an issue comment.</p>
        <table>
          <thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead>
          <tbody>{(readiness?.gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{gate.message}</td></tr>)}</tbody>
        </table>
      </section>

      <section>
        <h2>Direct Evidence Links for Issue Gate</h2>
        <label>Evidence<select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">Select evidence</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} — {item.original_filename ?? item.file_name}</option>)}</select></label>
        <div className="button-row">
          <button type="button" disabled={!canLinkEvidence || reportLocked} onClick={() => linkEvidence('report', detail.report_id)}>Link to report</button>
          <button type="button" disabled={!canLinkEvidence || reportLocked} onClick={() => linkEvidence('calculation_run', detail.calculation_run_id)}>Link to calculation_run</button>
          <button type="button" disabled={!canLinkEvidence || reportLocked || !readiness?.linked_context?.approved_integrity_decision_id} onClick={() => linkEvidence('integrity_decision', readiness?.linked_context?.approved_integrity_decision_id)}>Link to approved integrity_decision</button>
        </div>
      </section>

      <section className="panel-grid">
        <article>
          <h2>Approve Report</h2>
          <form onSubmit={approveReport}>
            <label>Approval comment<textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} /></label>
            <button type="submit" disabled={!canApprove || reportLocked || detail.report_status === 'approved'}>Approve</button>
          </form>
        </article>
        <article>
          <h2>Issue Report</h2>
          <form onSubmit={issueReport}>
            <label>Issue comment<textarea value={issueComment} onChange={(event) => setIssueComment(event.target.value)} /></label>
            <button type="submit" disabled={!canIssue || reportLocked || !readiness?.ready_to_issue_after_comment || openBlockingGates.length > 0}>Issue and lock</button>
          </form>
        </article>
      </section>

      <section>
        <h2>Exports</h2>
        <div className="button-row">
          <button type="button" disabled={!canExport} onClick={() => createExport('json')}>Export JSON</button>
          <button type="button" disabled={!canExport} onClick={() => createExport('html')}>Export HTML</button>
          <button type="button" disabled={!canExport} onClick={() => createExport('docx')}>Export DOCX</button>
          <button type="button" disabled={!canExport || detail.report_status !== 'issued'} onClick={() => createExport('pdf')}>Export final PDF</button>
        </div>
        <table><thead><tr><th>Export</th><th>Status</th><th>Checksum</th><th>Action</th></tr></thead><tbody>{exports.map((item) => <tr key={item.report_export_id}><td>{item.export_format ?? item.export_type}</td><td>{item.export_status}/{item.download_status}</td><td>{item.content_hash_sha256 ?? '-'}</td><td><button type="button" disabled={!canExport} onClick={() => openExport(item.export_id ?? item.report_export_id)}>Open signed URL</button></td></tr>)}</tbody></table>
      </section>

      <section>
        <h2>Report Sections</h2>
        {sectionRows(detail.sections).map((section, index) => <article key={`${section.title}-${index}`}><h3>{section.title ?? `Section ${index + 1}`}</h3><ul>{(section.body ?? []).map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul></article>)}
      </section>

      <section>
        <h2>Traceability and Evidence Register</h2>
        <div className="grid-two"><article><h3>Traceability</h3><pre>{renderJson(detail.traceability)}</pre></article><article><h3>Evidence register</h3><pre>{renderJson(detail.evidence_register)}</pre></article></div>
      </section>

      <section><h2>Gate/API Response</h2><pre>{selected ? renderJson(selected) : renderJson(readiness)}</pre></section>
    </main>
  );
}
