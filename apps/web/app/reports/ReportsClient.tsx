'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../components/ModuleBranchNav';
import { ActionModal, CompactDataTable, DetailDrawer, DetailGrid, GateSummary, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type CalculationRun = { calculation_run_id: string; run_id: string; asset_id: string; run_status: string; review_status: string; approval_status: string; locked_flag: boolean };
type EvidenceRecord = { evidence_id: string; evidence_code?: string; original_filename?: string; file_name?: string };
type IntegrityDecision = { integrity_decision_id: string; decision_code?: string; calculation_run_id: string; decision_status: string; evidence_count?: number };
type ReportExport = { report_export_id: string; export_type?: string; export_format?: string; export_status?: string; download_status?: string; content_hash_sha256?: string; download_url?: string };
type ReportRecord = { report_id: string; report_code: string; report_title: string; report_status: string; report_version: number; calculation_run_id: string; docx_object_path?: string; pdf_object_path?: string; input_snapshot_hash?: string; locked_flag?: boolean };

const REPORT_BRANCHES: ModuleBranchItem[] = [
  { id: 'reports', label: 'Reports', description: 'Report register', icon: 'RP' },
  { id: 'issue', label: 'Gates', description: 'Issue gates', icon: 'IR' },
  { id: 'exports', label: 'Exports', description: 'DOCX/PDF/JSON', icon: 'EX' },
  { id: 'evidence', label: 'Evidence', description: 'Evidence gates', icon: 'EV' },
  { id: 'approval', label: 'Approval', description: 'Approved reports', icon: 'AH' },
  { id: 'audit', label: 'Audit', description: 'Report trail', icon: 'AU' }
];

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
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const [action, setAction] = useState<{ kind: 'approve' | 'issue' | 'export-json' | 'export-pdf'; report: ReportRecord } | null>(null);
  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const issued = reports.filter((report) => report.report_status === 'issued').length;
    const blocked = reports.filter((report) => !canIssue(report) && report.report_status !== 'issued').length;
    const ready = reports.filter(canIssue).length;
    return { total: reports.length, issued, blocked, ready };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, decisions]);
  const activeBranch = useActiveModuleBranch(REPORT_BRANCHES, 'reports');
  const branchReports = useMemo(() => reports.filter((report) => {
    if (activeBranch === 'issue' || activeBranch === 'gates') return report.report_status !== 'issued';
    if (activeBranch === 'evidence') return !canIssue(report) && report.report_status !== 'issued';
    if (activeBranch === 'approval') return ['approved', 'issued'].includes(report.report_status);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeBranch, reports, decisions]);

  function approvedDecisionForReport(report: ReportRecord): IntegrityDecision | undefined {
    return decisions.find((decision) => decision.calculation_run_id === report.calculation_run_id && decision.decision_status === 'approved');
  }

  function canIssue(report: ReportRecord): boolean {
    return report.report_status === 'approved' && Boolean(approvedDecisionForReport(report)) && !report.locked_flag;
  }

  function gateCounts(report: ReportRecord) {
    const hasDecision = Boolean(approvedDecisionForReport(report));
    return {
      pass: Number(report.report_status === 'approved') + Number(hasDecision) + Number(!report.locked_flag),
      warning: report.report_status === 'draft' ? 1 : 0,
      fail: canIssue(report) || report.report_status === 'issued' ? 0 : Number(!hasDecision || report.report_status !== 'approved')
    };
  }

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch('/api/v1/reports/generate', { method: 'POST', body: JSON.stringify({ calculation_run_id: calculationRunId, report_title: title, output_formats: ['docx', 'pdf'] }) });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(messageFromPayload(payload));
      return;
    }
    setMessage(`Draft report generated: ${payload.data?.report_code ?? payload.data?.report_id}. Draft until approved.`);
    setGenerateDrawerOpen(false);
    await loadData();
  }

  async function approveReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/approve`, { method: 'POST', body: JSON.stringify({ approval_comment: 'Report approval after calculation and integrity decision readiness were checked.' }) });
    const payload = await response.json();
    setMessage(response.ok ? 'Report approved by authorized reviewer.' : messageFromPayload(payload));
    setAction(null);
    await loadData();
  }

  async function createReportExport(reportId: string, exportType: 'json' | 'pdf') {
    const response = await apiFetch(`/api/v1/reports/${reportId}/exports`, { method: 'POST', body: JSON.stringify({ export_type: exportType }) });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(messageFromPayload(payload));
      setAction(null);
      return;
    }
    const exportData = payload.data as ReportExport;
    setMessage(`Report ${exportType.toUpperCase()} export created. Hash: ${exportData.content_hash_sha256 ?? 'recorded'}`);
    setAction(null);
    if (exportData.download_url) window.open(exportData.download_url, '_blank', 'noopener,noreferrer');
  }

  async function issueReport(reportId: string) {
    const response = await apiFetch(`/api/v1/reports/${reportId}/issue`, { method: 'POST', body: JSON.stringify({ issue_comment: 'Report issue after required evidence, calculation, integrity decision, and approval gates passed.' }) });
    const payload = await response.json();
    const missing = missingEvidenceFromPayload(payload);
    setMessage(response.ok ? 'Report issued and locked.' : `${messageFromPayload(payload)}${missing.length ? ` Missing evidence: ${missing.join(', ')}` : ''}`);
    setAction(null);
    await loadData();
  }

  async function linkEvidence(entityType: 'report' | 'calculation_run' | 'integrity_decision', entityId: string) {
    if (!evidenceId) {
      setMessage('Select evidence before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, { method: 'POST', body: JSON.stringify({ linked_entity_type: entityType, linked_entity_id: entityId, link_reason: `Direct evidence link for ${entityType} report issue gate.` }) });
    const payload = await response.json();
    setMessage(response.ok ? `Evidence linked to ${entityType}.` : messageFromPayload(payload));
    await loadData();
  }

  return (
    <main className="app-shell">
      <ModuleBranchNav
        items={REPORT_BRANCHES.map((branch) => ({
          ...branch,
          count: branch.id === 'reports' ? summary.total : branch.id === 'issue' ? summary.ready : branch.id === 'evidence' ? summary.blocked : branch.id === 'approval' ? summary.issued : undefined,
          status: branch.id === 'evidence' && summary.blocked > 0 ? 'blocked' : undefined
        }))}
        activeId={activeBranch}
      />
      <PageHeader
        eyebrow="Report issue gates"
        title="Reports"
        description="Track report status, gate readiness, and issue actions without exposing export hashes, report sections, or raw gate payloads on the main page."
        status={summary.blocked > 0 ? 'blocked' : summary.ready > 0 ? 'approved' : 'pending_review'}
        actions={<><button className="primary-button" type="button" onClick={() => setGenerateDrawerOpen(true)}>Generate Draft</button><Link className="secondary-button" href="/calculations">Calculations</Link><Link className="secondary-button" href="/integrity-decisions">Integrity Decisions</Link><Link className="secondary-button" href="/evidence">Evidence</Link></>}
      />

      {message && <div className="notice">{message}</div>}

      <section className="pd-kpi-grid" aria-label="Report summary">
        <KpiCard title="Reports" value={summary.total} helper="generated records" />
        <KpiCard title="Object Storage" value={summary.total} helper="object storage exports stay in detail workflow" status="pending_review" />
        <KpiCard title="Issue Ready" value={summary.ready} helper="backend gates appear passable" status={summary.ready > 0 ? 'approved' : 'pending_review'} />
        <KpiCard title="Blocked" value={summary.blocked} helper="missing approval/evidence gate" status={summary.blocked > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Issued" value={summary.issued} helper="locked formal reports" status="issued" />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Report Register</h2>
            <p>Issue button remains disabled unless the visible gate summary is passable; backend still controls final issue.</p>
          </div>
          <label><span>Evidence for Linking</span><select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">Select evidence</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} - {item.original_filename ?? item.file_name}</option>)}</select></label>
        </div>
        <CompactDataTable
          rows={branchReports}
          getRowKey={(report) => report.report_id}
          emptyTitle="No reports"
          emptyMessage="No reports found. Generate a draft after inspection and integrity decision records are ready."
          columns={[
            { header: 'Report Number', render: (report) => <Link href={`/reports/${report.report_id}`}>{report.report_code}</Link> },
            { header: 'Asset / Source', render: (report) => <span>{report.report_title}<br /><span className="muted-text">{report.calculation_run_id}</span></span> },
            { header: 'Status', render: (report) => <StatusBadge status={report.report_status} label={report.report_status === 'draft' ? 'draft' : report.report_status} /> },
            { header: 'Gate Summary', render: (report) => <GateSummary {...gateCounts(report)} /> },
            { header: 'Issue Readiness', render: (report) => <StatusBadge status={canIssue(report) ? 'approved' : report.report_status === 'issued' ? 'issued' : 'blocked'} label={canIssue(report) ? 'approved' : report.report_status === 'issued' ? 'issued' : 'blocked'} /> },
            { header: 'Primary Action', className: 'pd-cell-actions', render: (report) => <span className="pd-compact-actions"><Link className="secondary-button" href={`/reports/${report.report_id}`}>Detail</Link><button className="secondary-button" type="button" onClick={() => setSelected(report)}>Details</button><button className="primary-button" type="button" disabled={!canIssue(report)} onClick={() => setAction({ kind: 'issue', report })}>Issue</button></span> }
          ]}
        />
      </section>

      <DetailDrawer
        open={generateDrawerOpen}
        title="Generate draft report"
        subtitle="Draft report generation remains backend controlled and auditable."
        status="draft"
        onClose={() => setGenerateDrawerOpen(false)}
        tabs={[{
          id: 'overview',
          label: 'Overview',
          content: <form className="form-grid" onSubmit={generateReport}>
            <label><span>Calculation Run</span><select value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)}><option value="">Select calculation run</option>{runs.map((run) => <option key={run.calculation_run_id} value={run.calculation_run_id}>{run.run_id ?? run.calculation_run_id} - {run.run_status}/{run.review_status}/{run.approval_status}</option>)}</select></label>
            <label><span>Report Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <button className="primary-button wide-field" type="submit" disabled={!calculationRunId}>Generate DOCX/PDF Draft</button>
          </form>
        }]}
      />

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.report_code ?? 'Report details'}
        subtitle={selected?.report_title}
        status={selected?.report_status}
        onClose={() => setSelected(null)}
        tabs={selected ? [
          { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'Report ID', value: <code>{selected.report_id}</code> }, { label: 'Version', value: selected.report_version }, { label: 'Calculation Run', value: selected.calculation_run_id }, { label: 'Locked', value: selected.locked_flag ? 'yes' : 'no' }]} /> },
          { id: 'technical', label: 'Technical Data', content: <DetailGrid items={[{ label: 'DOCX Object', value: selected.docx_object_path ?? '-' }, { label: 'PDF Object', value: selected.pdf_object_path ?? '-' }, { label: 'Input Snapshot Hash', value: <code>{selected.input_snapshot_hash ?? '-'}</code> }]} /> },
          { id: 'evidence', label: 'Evidence', content: <div className="pd-compact-actions"><button className="secondary-button" type="button" onClick={() => void linkEvidence('report', selected.report_id)}>Link report</button><button className="secondary-button" type="button" onClick={() => void linkEvidence('calculation_run', selected.calculation_run_id)}>Link calculation</button>{approvedDecisionForReport(selected) && <button className="secondary-button" type="button" onClick={() => void linkEvidence('integrity_decision', approvedDecisionForReport(selected)!.integrity_decision_id)}>Link decision</button>}</div> },
          { id: 'gate', label: 'Gate Checklist', content: <GateSummary {...gateCounts(selected)} /> },
          { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=report&entity_id=${selected.report_id}`}>Open audit trail</Link> },
          { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={selected} /> }
        ] : []}
      />

      <ActionModal
        open={Boolean(action)}
        title={action ? `${action.kind.replace('-', ' ')} ${action.report.report_code}` : 'Report action'}
        subtitle="Focused auditable report action. Backend gates remain authoritative."
        status={action?.report.report_status}
        onClose={() => setAction(null)}
      >
        {action && <><GateSummary {...gateCounts(action.report)} /><label><span>Comment</span><input placeholder="Audit comment" defaultValue={action.kind === 'issue' ? 'Issue after final gate check.' : 'Report action after review.'} /></label><div className="action-row"><button className="primary-button" type="button" disabled={action.kind === 'issue' && !canIssue(action.report)} onClick={() => action.kind === 'approve' ? void approveReport(action.report.report_id) : action.kind === 'issue' ? void issueReport(action.report.report_id) : action.kind === 'export-json' ? void createReportExport(action.report.report_id, 'json') : void createReportExport(action.report.report_id, 'pdf')}>{action.kind}</button><button className="secondary-button" type="button" onClick={() => setAction({ kind: 'approve', report: action.report })}>Approve</button><button className="secondary-button" type="button" onClick={() => setAction({ kind: 'export-json', report: action.report })}>Export JSON</button><button className="secondary-button" type="button" disabled={action.report.report_status !== 'issued'} onClick={() => setAction({ kind: 'export-pdf', report: action.report })}>Export Final PDF</button></div></>}
      </ActionModal>
    </main>
  );
}
