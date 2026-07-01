'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../components/ModuleBranchNav';
import { CompactDataTable, DetailDrawer, DetailGrid, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type DashboardSection = Record<string, unknown>;

type DashboardOverview = {
  generated_at: string;
  permission_required: string;
  read_only: boolean;
  source_of_truth: string;
  redaction_notice: string;
  sections: Record<string, DashboardSection>;
  traceability_links: Array<{ label: string; href: string; entity_type: string }>;
  prohibited_controls: string[];
};

const SECTION_TITLES: Record<string, string> = {
  asset_inspection_coverage: 'Asset & Inspection Coverage',
  evidence_readiness: 'Evidence Readiness',
  ai_extraction_review_queue: 'Photo Extraction Review Queue',
  staging_promotion_readiness: 'Staging Readiness',
  calculation_review_readiness: 'Calculation / Review Readiness',
  report_issue_readiness: 'Report Gate Readiness',
  work_order_follow_up: 'Work Order Follow-up',
  governance_warnings: 'Governance / Audit Warnings',
  not_available: 'Not Available'
};

const DASHBOARD_BRANCHES: ModuleBranchItem[] = [
  { id: 'overview', label: 'Overview', description: 'Top status and KPIs', icon: 'OV' },
  { id: 'reviews', label: 'Reviews', description: 'Pending approvals', icon: 'RQ' },
  { id: 'blocked_reports', label: 'Blocked', description: 'Issue gate blockers', icon: 'BR' },
  { id: 'evidence_gaps', label: 'Gaps', description: 'Missing evidence paths', icon: 'EG' },
  { id: 'workflow_errors', label: 'Errors', description: 'Workflow warnings', icon: 'WE' },
  { id: 'recent_audit', label: 'Audit', description: 'Governance sections', icon: 'AU' }
];

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function visibleEntries(section: DashboardSection): Array<[string, unknown]> {
  return Object.entries(section).filter(([key]) => key !== 'link');
}

function firstNumber(section: DashboardSection | undefined, fallback: number): number {
  if (!section) return fallback;
  for (const value of Object.values(section)) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  }
  return fallback;
}

export default function GovernanceDashboardClient() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<{ key: string; section: DashboardSection } | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setMessage(null);
      try {
        const response = await apiFetch('/api/v1/governance-dashboard/overview', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? 'Could not load governance dashboard.');
        setOverview(payload.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load governance dashboard. Confirm dashboard.view permission.');
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  const sections = overview?.sections;
  const kpis = useMemo(() => {
    const assetCount = firstNumber(sections?.asset_inspection_coverage, 4);
    const actionCount = firstNumber(sections?.governance_warnings, 1);
    const reportReady = firstNumber(sections?.report_issue_readiness, 2);
    const workOrders = firstNumber(sections?.work_order_follow_up, 2);
    const aiQueue = firstNumber(sections?.ai_extraction_review_queue, 7);
    const calculations = firstNumber(sections?.calculation_review_readiness, 5);

    return { assetCount, actionCount, reportReady, workOrders, aiQueue, calculations };
  }, [sections]);
  const activeBranch = useActiveModuleBranch(DASHBOARD_BRANCHES);
  const branchItems = DASHBOARD_BRANCHES.map((branch) => ({
    ...branch,
    count: branch.id === 'overview' ? kpis.assetCount : branch.id === 'reviews' ? kpis.calculations : branch.id === 'blocked_reports' ? kpis.reportReady : branch.id === 'evidence_gaps' ? firstNumber(sections?.evidence_readiness, 0) : branch.id === 'workflow_errors' ? kpis.actionCount : undefined,
    status: branch.id === 'blocked_reports' || branch.id === 'workflow_errors' ? 'watch' : undefined
  }));

  return (
    <div className="aim-preview-dashboard">
      <h1 className="sr-only">Governance Dashboard Readiness Overview</h1>
      {message && <div className="aim-alert aim-alert--amber">⚠ {message}</div>}
      {loading && <div className="aim-alert aim-alert--blue">Loading governance dashboard from AIM backend…</div>}
      <ModuleBranchNav items={branchItems} activeId={activeBranch} />

      {activeBranch === 'overview' && <section className="aim-preview-grid-4" aria-label="AIM integrity status summary">
        <Link className="aim-kpi aim-kpi--navy" href="/assets">
          <span className="aim-kpi__value">{kpis.assetCount}</span>
          <span className="aim-kpi__label">Total Assets</span>
          <span className="aim-kpi__sub">registered asset packages</span>
        </Link>
        <Link className="aim-kpi aim-kpi--red" href="/integrity-decisions">
          <span className="aim-kpi__value">{kpis.actionCount}</span>
          <span className="aim-kpi__label">Action Required</span>
          <span className="aim-kpi__sub">blocked or critical governance items</span>
        </Link>
        <Link className="aim-kpi aim-kpi--amber" href="/calculations">
          <span className="aim-kpi__value">{kpis.calculations}</span>
          <span className="aim-kpi__label">Pending Review</span>
          <span className="aim-kpi__sub">calculation / review readiness items</span>
        </Link>
        <Link className="aim-kpi aim-kpi--green" href="/reports">
          <span className="aim-kpi__value">{kpis.reportReady}</span>
          <span className="aim-kpi__label">Report Readiness</span>
          <span className="aim-kpi__sub">report gate indicators</span>
        </Link>
      </section>}

      {activeBranch === 'reviews' && <section className="aim-preview-grid-4" aria-label="Operational queues">
        <Link className="aim-mini-card" href="/reviews">
          <span className="aim-mini-card__icon" style={{ background: '#fffbeb' }}>⏱</span>
          <span><span className="aim-mini-card__value">{kpis.calculations}</span><span className="aim-mini-card__label">Pending Approvals</span></span>
        </Link>
        <Link className="aim-mini-card" href="/findings">
          <span className="aim-mini-card__icon" style={{ background: '#fef2f2' }}>⚠</span>
          <span><span className="aim-mini-card__value">{kpis.actionCount}</span><span className="aim-mini-card__label">Critical Findings</span></span>
        </Link>
        <Link className="aim-mini-card" href="/work-orders">
          <span className="aim-mini-card__icon" style={{ background: '#eff6ff' }}>🔧</span>
          <span><span className="aim-mini-card__value">{kpis.workOrders}</span><span className="aim-mini-card__label">Open Work Orders</span></span>
        </Link>
        <Link className="aim-mini-card" href="/ai-extraction">
          <span className="aim-mini-card__icon" style={{ background: '#f0fdfa' }}>📷</span>
          <span><span className="aim-mini-card__value">{kpis.aiQueue}</span><span className="aim-mini-card__label">Photo Review Queue</span></span>
        </Link>
      </section>}

      {activeBranch === 'reviews' && <section className="aim-split-panels">
        <div className="aim-panel">
          <div className="aim-panel__head"><span>⏱</span><span className="aim-panel__title">Pending Tasks</span><span className="badge badge-warning">Review</span></div>
          <Link className="aim-activity-row" href="/calculations"><span>🔢</span><span><strong>Calculation review readiness</strong><br /><small>Formula version, input evidence, warning, and approval gates</small></span></Link>
          <Link className="aim-activity-row" href="/evidence"><span>📁</span><span><strong>Evidence readiness</strong><br /><small>Evidence metadata, linkage, verification, and audit trail</small></span></Link>
          <Link className="aim-activity-row" href="/reports"><span>📄</span><span><strong>Report issue readiness</strong><br /><small>Report remains blocked until backend gates pass</small></span></Link>
          <Link className="aim-activity-row" href="/reviews"><span>🤖</span><span><strong>Photo staging review queue</strong><br /><small>Extraction output remains assistive and requires human review</small></span></Link>
        </div>

        <div className="aim-panel">
          <div className="aim-panel__head"><span>🛡</span><span className="aim-panel__title">Governance Boundary</span><Link className="aim-panel__link" href="/audit-logs">Audit →</Link></div>
          <div className="aim-panel__body">
            <p>{overview?.source_of_truth ?? 'AIM remains the system of record. n8n orchestrates only through AIM APIs.'}</p>
            <p>{overview?.redaction_notice ?? 'Final engineering data, reports, and approvals remain backend-gated and auditable.'}</p>
            <div className="aim-alert aim-alert--blue">Read-only dashboard · permission: {overview?.permission_required ?? 'dashboard.view'}</div>
          </div>
        </div>

        <div className="aim-panel">
          <div className="aim-panel__head"><span>⚡</span><span className="aim-panel__title">Quick Access</span></div>
          <Link className="aim-activity-row" href="/workflow-console"><span>⚡</span><span><strong>Workflow Console</strong><br /><small>n8n event visibility through AIM</small></span></Link>
          <Link className="aim-activity-row" href="/ndt"><span>📡</span><span><strong>NDT Data Room</strong><br /><small>UT, CML/TML, grid and evidence-linked measurements</small></span></Link>
          <Link className="aim-activity-row" href="/integrity-decisions"><span>🛡</span><span><strong>Integrity Decisions</strong><br /><small>Human-owned engineering decision records</small></span></Link>
          <Link className="aim-activity-row" href="/work-orders"><span>🔧</span><span><strong>Work Orders</strong><br /><small>Internal fallback before external CMMS</small></span></Link>
        </div>
      </section>}

      {activeBranch === 'blocked_reports' && (
        <section className="aim-panel">
          <div className="aim-panel__head"><span className="aim-panel__title">Blocked Reports</span><Link className="aim-panel__link" href="/reports">Open reports</Link></div>
          <div className="aim-panel__body">
            <p>{kpis.reportReady} report gate indicator(s) need issue-readiness review. The issue action stays backend-gated until report, evidence, calculation, decision, and approval checks pass.</p>
          </div>
        </section>
      )}

      {activeBranch === 'evidence_gaps' && (
        <section className="aim-panel">
          <div className="aim-panel__head"><span className="aim-panel__title">Evidence Gaps</span><Link className="aim-panel__link" href="/evidence-traceability">Traceability</Link></div>
          <div className="aim-panel__body">
            <p>Evidence readiness remains visible because missing links can block calculation review, integrity decisions, report issue, and work-order closure.</p>
            <div className="action-row"><Link className="secondary-button" href="/evidence">Evidence Repository</Link><Link className="secondary-button" href="/evidence-traceability">Evidence Traceability</Link></div>
          </div>
        </section>
      )}

      {activeBranch === 'workflow_errors' && (
        <section className="aim-panel">
          <div className="aim-panel__head"><span className="aim-panel__title">Workflow Errors</span><Link className="aim-panel__link" href="/workflow-console">Workflow console</Link></div>
          <div className="aim-panel__body">
            <p>{overview?.source_of_truth ?? 'AIM remains the system of record. n8n orchestrates only through AIM APIs.'}</p>
            <p>{overview?.redaction_notice ?? 'Final engineering data, reports, and approvals remain backend-gated and auditable.'}</p>
            <div className="aim-alert aim-alert--blue">Read-only dashboard · permission: {overview?.permission_required ?? 'dashboard.view'}</div>
          </div>
        </section>
      )}

      {activeBranch === 'recent_audit' && overview && (
        <section className="aim-panel">
          <div className="aim-panel__head"><span>📊</span><span className="aim-panel__title">Backend Governance Sections</span></div>
          <div className="aim-panel__body">
            <CompactDataTable
              rows={Object.entries(overview.sections)}
              getRowKey={([sectionKey]) => sectionKey}
              emptyTitle="No dashboard sections"
              emptyMessage="No governance sections were returned by the backend."
              columns={[
                { header: 'Queue', render: ([sectionKey]) => SECTION_TITLES[sectionKey] ?? sectionKey },
                { header: 'Status', render: ([sectionKey]) => <StatusBadge status={sectionKey.includes('warning') ? 'needs_review' : sectionKey.includes('report') ? 'blocked' : 'pending_review'} /> },
                { header: 'Summary', render: ([, section]) => `${visibleEntries(section).length} fields returned` },
                { header: 'Next Action', render: ([, section]) => typeof section.link === 'string' ? <Link href={section.link}>Open workspace</Link> : <span className="muted-text">No route</span> },
                { header: 'Details', className: 'pd-cell-actions', render: ([sectionKey, section]) => <button className="secondary-button" type="button" onClick={() => setSelectedSection({ key: sectionKey, section })}>Details</button> }
              ]}
            />
          </div>
        </section>
      )}
      <DetailDrawer
        open={Boolean(selectedSection)}
        title={selectedSection ? SECTION_TITLES[selectedSection.key] ?? selectedSection.key : 'Dashboard details'}
        subtitle="Backend-returned dashboard detail. The main dashboard stays summary-only."
        status={selectedSection?.key.includes('warning') ? 'needs_review' : 'pending_review'}
        onClose={() => setSelectedSection(null)}
        tabs={selectedSection ? [
          {
            id: 'overview',
            label: 'Overview',
            content: <DetailGrid items={visibleEntries(selectedSection.section).slice(0, 8).map(([key, value]) => ({ label: key.replaceAll('_', ' '), value: renderValue(value) }))} />
          },
          {
            id: 'technical',
            label: 'Technical Data',
            content: <TechnicalJson value={selectedSection.section} />
          },
          {
            id: 'audit',
            label: 'Audit Trail',
            content: <Link className="secondary-button" href="/audit-logs">Open audit logs</Link>
          }
        ] : []}
      />
    </div>
  );
}
