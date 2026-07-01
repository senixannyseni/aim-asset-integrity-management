'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ModuleBranchNav, useActiveModuleBranch, type ModuleBranchItem } from '../components/ModuleBranchNav';
import { ActionModal, CompactDataTable, DetailDrawer, DetailGrid, GateSummary, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type ReviewCard = {
  id: string;
  title: string;
  evidence: string;
  asset: string;
  page: string;
  component: string;
  defect: string;
  confidence: number;
  status: 'needs_review' | 'blocked' | 'pending_review' | 'approved';
  validationFlags: string[];
  sourceReference: string;
  rawValue: Record<string, unknown>;
};

const PHOTO_BRANCHES: ModuleBranchItem[] = [
  { id: 'jobs', label: 'Jobs', description: 'Extraction jobs', icon: 'JB' },
  { id: 'fields_review', label: 'Review', description: 'Validation flags', icon: 'FR' },
  { id: 'approved', label: 'Approved', description: 'Reviewed fields', icon: 'AP' },
  { id: 'corrected', label: 'Corrected', description: 'Correction queue', icon: 'CO' },
  { id: 'rejected', label: 'Rejected', description: 'Rejected or blocked', icon: 'RJ' },
  { id: 'promotion', label: 'Promote', description: 'Gate summary', icon: 'PR' },
  { id: 'audit', label: 'Audit', description: 'Review trail', icon: 'AU' }
];

const reviewCards: ReviewCard[] = [
  { id: 'photo-12', title: 'Photo 12', evidence: 'EVD-2024-000001', asset: 'AST-0042', page: 'p. 12', component: 'Shell', defect: 'Coating defect', confidence: 0.82, status: 'needs_review', validationFlags: ['component_match'], sourceReference: 'Photo appendix p. 12', rawValue: { model_label: 'coating defect', bbox: [120, 42, 320, 188], prompt_version: 'photo-defect-v1' } },
  { id: 'photo-15', title: 'Photo 15', evidence: 'EVD-2024-000001', asset: 'AST-0042', page: 'p. 16', component: 'Shell', defect: 'Corrosion', confidence: 0.55, status: 'blocked', validationFlags: ['low_confidence', 'source_reference_missing'], sourceReference: 'Needs source confirmation', rawValue: { model_label: 'corrosion staining', bbox: [80, 52, 210, 180], prompt_version: 'photo-defect-v1' } },
  { id: 'photo-18', title: 'Photo 18', evidence: 'EVD-2024-000002', asset: 'AST-0043', page: 'p. 27', component: 'Foundation', defect: 'Crack', confidence: 0.85, status: 'needs_review', validationFlags: ['severity_required'], sourceReference: 'Photo appendix p. 27', rawValue: { model_label: 'foundation crack', bbox: [14, 75, 240, 166], prompt_version: 'photo-defect-v1' } },
  { id: 'photo-19', title: 'Photo 19', evidence: 'EVD-2025-000001', asset: 'AST-0042', page: 'p. 27', component: 'Dike', defect: 'Housekeeping', confidence: 0.76, status: 'pending_review', validationFlags: ['non_integrity_observation'], sourceReference: 'Photo appendix p. 27', rawValue: { model_label: 'housekeeping', bbox: [8, 35, 260, 210], prompt_version: 'photo-defect-v1' } }
];

function confidenceStatus(confidence: number): 'approved' | 'needs_review' | 'blocked' {
  if (confidence >= 0.8) return 'approved';
  if (confidence >= 0.65) return 'needs_review';
  return 'blocked';
}

export default function AiPhotoExtractionPage() {
  const [selected, setSelected] = useState<ReviewCard | null>(null);
  const [actionTarget, setActionTarget] = useState<ReviewCard | null>(null);

  const summary = useMemo(() => {
    const blocked = reviewCards.filter((card) => card.status === 'blocked').length;
    const needsReview = reviewCards.filter((card) => card.status === 'needs_review' || card.status === 'pending_review').length;
    const reviewed = reviewCards.filter((card) => card.status === 'approved').length;
    const fieldsNeedingReview = reviewCards.reduce((total, card) => total + card.validationFlags.length, 0);
    return { total: reviewCards.length, blocked, needsReview, reviewed, fieldsNeedingReview };
  }, []);
  const activeBranch = useActiveModuleBranch(PHOTO_BRANCHES, 'jobs');
  const branchCards = useMemo(() => reviewCards.filter((card) => {
    if (activeBranch === 'fields_review') return card.validationFlags.length > 0;
    if (activeBranch === 'approved') return card.status === 'approved';
    if (activeBranch === 'corrected') return card.status === 'pending_review';
    if (activeBranch === 'rejected') return card.status === 'blocked';
    return true;
  }), [activeBranch]);

  return (
    <main className="app-shell">
      <ModuleBranchNav
        items={PHOTO_BRANCHES.map((branch) => ({
          ...branch,
          count: branch.id === 'jobs' ? summary.total : branch.id === 'fields_review' ? summary.fieldsNeedingReview : branch.id === 'rejected' ? summary.blocked : branch.id === 'approved' ? summary.reviewed : undefined,
          status: branch.id === 'promotion' ? 'review' : branch.id === 'rejected' && summary.blocked > 0 ? 'blocked' : undefined
        }))}
        activeId={activeBranch}
      />
      <PageHeader
        eyebrow="Photo staging review"
        title="Photo Extraction Review"
        description="Photo extraction output is staging/review data only. Field values, raw extraction output, source references, and validation flags are disclosed after selecting a job."
        status={summary.blocked > 0 ? 'blocked' : 'pending_review'}
        actions={<><Link className="secondary-button" href="/evidence">Evidence Repository</Link><Link className="secondary-button" href="/reviews">Photo Field Review</Link><Link className="secondary-button" href="/audit-logs">Audit Logs</Link></>}
      />

      <div className="aim-alert aim-alert--amber">AI output is staging data only. Engineer review is required before promotion.</div>

      {activeBranch !== 'audit' && <section className="pd-kpi-grid" aria-label="Photo extraction summary">
        <KpiCard title="Extraction Jobs" value="3" helper="evidence packages processed" />
        <KpiCard title="Needs Review" value={summary.needsReview} helper="fields requiring human attention" status="needs_review" />
        <KpiCard title="Blocked" value={summary.blocked} helper="source or confidence gate failed" status={summary.blocked > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Review Fields" value={summary.fieldsNeedingReview} helper="validation flags in staging data" status="pending_review" />
      </section>}

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Review Queue</h2>
            <p>Compact staging queue. Extracted field values, raw model output, and source details are in the drawer.</p>
          </div>
          <StatusBadge status="pending_review" label="staging/review" />
        </div>
        {activeBranch === 'promotion' ? (
          <GateSummary pass={summary.reviewed} warning={summary.needsReview} fail={summary.blocked} label="Promotion readiness for photo extraction staging data" />
        ) : activeBranch === 'audit' ? (
          <div className="module-branch-panel"><p className="muted-text">Audit trail for extraction review and promotion readiness stays in immutable audit logs.</p><Link className="secondary-button" href="/audit-logs?entity_type=ai_extraction_job">Open audit logs</Link></div>
        ) : <CompactDataTable
          rows={branchCards}
          getRowKey={(card) => card.id}
          emptyTitle="No extraction jobs"
          emptyMessage="No photo extraction jobs found. Start from Evidence Room or create a new extraction job."
          columns={[
            { header: 'Job', render: (card) => card.title },
            { header: 'Asset / Inspection', render: (card) => <span>{card.asset}<br /><span className="muted-text">{card.evidence}</span></span> },
            { header: 'Status', render: (card) => <StatusBadge status={card.status} /> },
            { header: 'Confidence', render: (card) => <span>{Math.round(card.confidence * 100)}%<br /><StatusBadge status={confidenceStatus(card.confidence)} label={confidenceStatus(card.confidence)} /></span> },
            { header: 'Fields Needing Review', render: (card) => card.validationFlags.length },
            { header: 'Action', className: 'pd-cell-actions', render: (card) => <span className="pd-compact-actions"><button className="secondary-button" type="button" onClick={() => setSelected(card)}>Details</button><button className="secondary-button" type="button" onClick={() => setActionTarget(card)}>Review</button></span> }
          ]}
        />}
      </section>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.title ?? 'Photo extraction details'}
        subtitle={selected ? `${selected.asset} / ${selected.evidence}` : undefined}
        status={selected?.status}
        onClose={() => setSelected(null)}
        tabs={selected ? [
          {
            id: 'overview',
            label: 'Overview',
            content: <DetailGrid items={[
              { label: 'Evidence', value: selected.evidence },
              { label: 'Asset', value: selected.asset },
              { label: 'Component', value: selected.component },
              { label: 'Candidate Finding', value: selected.defect },
              { label: 'Confidence', value: `${Math.round(selected.confidence * 100)}%` },
              { label: 'Source', value: selected.sourceReference }
            ]} />
          },
          {
            id: 'technical',
            label: 'Technical Data',
            content: <DetailGrid items={[
              { label: 'Extracted Value', value: selected.defect },
              { label: 'Normalized Value', value: selected.defect.toLowerCase().replaceAll(' ', '_') },
              { label: 'Source Reference', value: selected.sourceReference },
              { label: 'Validation Flags', value: selected.validationFlags.join(', ') || '-' }
            ]} />
          },
          {
            id: 'evidence',
            label: 'Evidence',
            content: <div className="pd-compact-actions"><Link className="secondary-button" href="/evidence">Open evidence</Link><Link className="secondary-button" href="/findings">Open findings</Link></div>
          },
          {
            id: 'gate',
            label: 'Gate Checklist',
            content: <GateSummary pass={selected.status === 'blocked' ? 1 : 2} warning={selected.status === 'needs_review' || selected.status === 'pending_review' ? 1 : 0} fail={selected.status === 'blocked' ? 1 : 0} />
          },
          {
            id: 'audit',
            label: 'Audit Trail',
            content: <Link className="secondary-button" href="/audit-logs?entity_type=ai_extraction_job">Open audit trail</Link>
          },
          {
            id: 'raw',
            label: 'Raw Metadata',
            content: <TechnicalJson value={selected.rawValue} />
          }
        ] : []}
      />

      <ActionModal
        open={Boolean(actionTarget)}
        title={actionTarget ? `Review ${actionTarget.title}` : 'Review photo field'}
        subtitle="Approve, reject, or correct staging data. Backend remains authoritative for final promotion."
        status={actionTarget?.status}
        onClose={() => setActionTarget(null)}
      >
        <DetailGrid items={[
          { label: 'Candidate Value', value: actionTarget?.defect ?? '-' },
          { label: 'Confidence', value: actionTarget ? `${Math.round(actionTarget.confidence * 100)}%` : '-' },
          { label: 'Source', value: actionTarget?.sourceReference ?? '-' },
          { label: 'Validation Flags', value: actionTarget?.validationFlags.join(', ') || '-' }
        ]} />
        <label><span>Decision</span><select defaultValue="correct"><option value="approve">approve</option><option value="correct">correct</option><option value="reject">reject</option></select></label>
        <label><span>Reviewer Comment</span><input placeholder="Reason required for correction or rejection" /></label>
        <div className="action-row">
          <button className="primary-button" type="button" disabled>Submit review via backend</button>
          <span className="muted-text">No backend review endpoint is called from this UX preview.</span>
        </div>
      </ActionModal>
    </main>
  );
}
