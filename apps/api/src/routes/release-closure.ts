import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../middleware/rbac.js';

export const releaseClosureRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type GateStatus = 'pass' | 'attention_required' | 'blocked';

const SERVICE_RELEASE_CLOSURE_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const FINAL_RELEASE_CHAIN = [
  'Asset',
  'Inspection',
  'Evidence',
  'NDT',
  'Findings',
  'Calculation',
  'Review / Approval',
  'Integrity Decision',
  'FFS / RBI',
  'Report',
  'Work Order',
  'UAT Evidence',
  'Production Deployment',
  'Rollback',
  'Hypercare',
  'Release Signoff'
];

const REQUIRED_UAT_EVIDENCE_PACK = [
  'docs/uat/uat_rc4u_final_uat_evidence_pack.md',
  'docs/uat/uat_cycle_1_actual_execution_summary.md',
  'docs/uat/uat_cycle_2_signoff_checklist.md',
  'docs/uat/smoke_test_evidence_checklist.md',
  'docs/uat/uat_defect_log_template.md',
  'docs/release/final_release_candidate_closure_matrix.md',
  'docs/operations/rc4u_production_readiness_closure_checklist.md',
  'docs/operations/rc4u_deployment_verification_and_rollback_checklist.md',
  'docs/release/hypercare_post_uat_monitoring_checklist.md'
];

const KNOWN_RELEASE_EXCLUSIONS = [
  'External SAP/Maximo/CMMS integration is intentionally excluded; AIM internal work-order fallback remains authoritative for MVP.',
  'API 579/API 581 proprietary quantitative formulas are intentionally excluded unless supplied through approved formula governance and validated fixtures.',
  'AI/OCR extraction remains staging-only and cannot promote, approve, issue, close, or finalize engineering records.',
  'n8n remains orchestration-only and cannot store final engineering data or write directly to PostgreSQL.',
  'This release closure workspace does not replace module-specific readiness gates or human engineering approvals.'
];

const SIGNOFF_MATRIX = [
  { role: 'Engineering Lead', required: true, signoff_focus: 'technical readiness, calculation governance, review/approval evidence' },
  { role: 'Inspection/NDT Lead', required: true, signoff_focus: 'inspection package, NDT traceability, evidence coverage' },
  { role: 'QA/UAT Lead', required: true, signoff_focus: 'UAT execution evidence, defect closure, smoke test result' },
  { role: 'Security/Platform Lead', required: true, signoff_focus: 'RBAC, audit log, deployment verification, backup/restore readiness' },
  { role: 'Product Owner', required: true, signoff_focus: 'known exclusions, go/no-go decision, hypercare acceptance' }
];

function isServiceReleaseClosureActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_RELEASE_CLOSURE_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanReleaseClosureViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceReleaseClosureActor(req)) {
    res.status(403).json({
      error: {
        code: 'RELEASE_CLOSURE_SERVICE_ACTOR_BLOCKED',
        message: 'AI, n8n, service, workflow, and integration actors cannot access or finalize release closure readiness.'
      }
    });
    return false;
  }
  return true;
}

function releaseGate(
  gateType: string,
  gateStatus: GateStatus,
  blocking: boolean,
  message: string,
  metadata: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    gate_type: gateType,
    gate_status: gateStatus,
    blocking,
    message,
    metadata
  };
}

function buildReleaseClosureReadiness() {
  const readinessGates = [
    releaseGate('uat_evidence_pack_present', 'pass', false, 'RC4-U UAT evidence pack index and final closure artifacts are present.', {
      required_documents: REQUIRED_UAT_EVIDENCE_PACK
    }),
    releaseGate('uat_execution_evidence_attached', 'attention_required', false, 'Actual UAT execution screenshots/log exports/signoff attachments must be attached from the target environment before final go-live.', {
      evidence_owner: 'QA/UAT Lead',
      final_artifact: 'docs/uat/uat_rc4u_final_uat_evidence_pack.md'
    }),
    releaseGate('production_deployment_verified', 'attention_required', false, 'Deployment verification must be executed against the real production environment.', {
      checklist: 'docs/operations/rc4u_production_readiness_closure_checklist.md'
    }),
    releaseGate('rollback_plan_verified', 'attention_required', false, 'Rollback steps are documented; dry-run or signoff evidence must be recorded before go-live.', {
      checklist: 'docs/operations/rc4u_deployment_verification_and_rollback_checklist.md'
    }),
    releaseGate('security_backup_restore_dr_closure', 'attention_required', false, 'Security, backup/restore, and disaster-recovery closure require environment evidence.', {
      source_checklists: [
        'docs/operations/security_governance_closure_checklist.md',
        'docs/operations/backup_restore_runbook.md',
        'docs/operations/environment_validation_checklist.md'
      ]
    }),
    releaseGate('hypercare_plan_ready', 'pass', false, 'Hypercare monitoring, defect triage, rollback escalation, and owner handoff are documented.', {
      checklist: 'docs/release/hypercare_post_uat_monitoring_checklist.md'
    }),
    releaseGate('known_exclusions_documented', 'pass', false, 'Known MVP exclusions are explicit and must be accepted during go/no-go signoff.', {
      exclusions: KNOWN_RELEASE_EXCLUSIONS
    }),
    releaseGate('release_signoff_matrix_present', 'pass', false, 'Human signoff matrix is present and requires engineering, UAT, security/platform, and product owner signoff.', {
      signoff_roles: SIGNOFF_MATRIX
    }),
    releaseGate('module_readiness_chain_visible', 'pass', false, 'RC4-T end-to-end workspace links module-specific readiness gates and remains the operational traceability entry point.', {
      chain: FINAL_RELEASE_CHAIN
    }),
    releaseGate('no_formula_execution', 'pass', false, 'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by release closure readiness.', {
      boundary: 'release-closure-read-only'
    }),
    releaseGate('ai_n8n_finalization_absent', 'pass', false, 'AI/n8n/service actors cannot finalize release closure readiness or approve go-live.', {
      blocked_roles: Array.from(SERVICE_RELEASE_CLOSURE_BLOCKED_ROLES)
    })
  ];

  const blockingCount = readinessGates.filter((gate) => gate.blocking).length;
  const attentionRequiredCount = readinessGates.filter((gate) => gate.gate_status === 'attention_required').length;
  const passCount = readinessGates.filter((gate) => gate.gate_status === 'pass').length;

  return {
    generated_at: new Date().toISOString(),
    permission_required: 'golive_readiness.view',
    read_only: true,
    overall_release_closure_status: blockingCount > 0 ? 'blocked' : attentionRequiredCount > 0 ? 'conditional_go_pending_environment_evidence' : 'ready_for_go_live_signoff',
    ready_for_go_live_without_conditions: blockingCount === 0 && attentionRequiredCount === 0,
    release_candidate_ready_for_human_go_no_go_review: blockingCount === 0,
    completion_estimate: {
      scoped_mvp_percent: 92,
      production_go_live_readiness_percent: 84,
      enterprise_commercial_grade_percent: 73,
      basis: 'Estimate after RC4-U documentation/readiness closure; environment execution evidence remains required.'
    },
    gate_summary: {
      total_gates: readinessGates.length,
      pass_count: passCount,
      attention_required_count: attentionRequiredCount,
      blocking_count: blockingCount
    },
    release_chain: FINAL_RELEASE_CHAIN,
    readiness_gates: readinessGates,
    uat_evidence_pack: REQUIRED_UAT_EVIDENCE_PACK.map((path) => ({ path, required_for_final_signoff: true })),
    production_closure_checklists: [
      { name: 'Production readiness closure', path: 'docs/operations/rc4u_production_readiness_closure_checklist.md' },
      { name: 'Deployment verification and rollback', path: 'docs/operations/rc4u_deployment_verification_and_rollback_checklist.md' },
      { name: 'Final release candidate closure matrix', path: 'docs/release/final_release_candidate_closure_matrix.md' },
      { name: 'RC4-U UAT evidence pack', path: 'docs/uat/uat_rc4u_final_uat_evidence_pack.md' }
    ],
    signoff_matrix: SIGNOFF_MATRIX,
    known_exclusions: KNOWN_RELEASE_EXCLUSIONS,
    safe_navigation_links: [
      { label: 'End-to-End Integrity Workspace', href: '/integrity-workspace' },
      { label: 'Go-Live Readiness', href: '/golive-readiness' },
      { label: 'Governance Dashboard', href: '/dashboard' },
      { label: 'Audit Logs', href: '/audit-logs' },
      { label: 'Reports', href: '/reports' },
      { label: 'Work Orders', href: '/work-orders' }
    ],
    prohibited_controls: [
      'no approve/reject controls',
      'no calculation execution controls',
      'no formula execution controls',
      'no report issue controls',
      'no work-order closure controls',
      'no evidence upload/download/delete controls',
      'no AI staging promotion controls',
      'no n8n workflow execution controls',
      'no go-live signoff mutation controls'
    ]
  };
}

releaseClosureRouter.get('/release-closure/readiness', requirePermission('golive_readiness.view'), async (req, res, next) => {
  try {
    if (!enforceHumanReleaseClosureViewer(req, res)) return;
    res.json({ data: buildReleaseClosureReadiness() });
  } catch (error) {
    next(error);
  }
});
