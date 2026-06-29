import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../middleware/rbac.js';

export const productionValidationRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type GateStatus = 'pass' | 'attention_required' | 'blocked';

const SERVICE_PRODUCTION_VALIDATION_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const PRODUCTION_VALIDATION_CHAIN = [
  'Source control tag',
  'Build artifact',
  'Environment variables',
  'Database migration',
  'Object storage connectivity',
  'API smoke tests',
  'Frontend route smoke tests',
  'Audit log verification',
  'Backup and restore drill',
  'Monitoring and alerting',
  'Security checks',
  'Rollback drill',
  'Hypercare rota',
  'Human go/no-go signoff'
];

const REQUIRED_PRODUCTION_EVIDENCE = [
  'docs/operations/rc4v_production_environment_validation_evidence.md',
  'docs/operations/rc4v_smoke_test_execution_record.md',
  'docs/operations/rc4v_backup_restore_drill_record.md',
  'docs/operations/rc4v_monitoring_alerting_verification.md',
  'docs/release/rc4v_release_candidate_signoff_evidence.md',
  'docs/release/final_release_candidate_closure_matrix.md',
  'docs/operations/rc4u_deployment_verification_and_rollback_checklist.md',
  'docs/operations/rc4u_production_readiness_closure_checklist.md'
];

const FINAL_SIGNOFF_ROLES = [
  { role: 'Product Owner', required: true, evidence_required: 'Go / Conditional Go / No-Go decision recorded' },
  { role: 'Engineering Lead', required: true, evidence_required: 'API, calculation governance, and release tag validated' },
  { role: 'Platform/DevOps Lead', required: true, evidence_required: 'Deployment, rollback, backup/restore, monitoring validated' },
  { role: 'Security Lead', required: true, evidence_required: 'RBAC, audit log, secrets, and access checks validated' },
  { role: 'QA/UAT Lead', required: true, evidence_required: 'UAT evidence, smoke tests, and open defect disposition validated' }
];

function isServiceProductionValidationActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_PRODUCTION_VALIDATION_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanProductionValidationViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceProductionValidationActor(req)) {
    res.status(403).json({
      error: {
        code: 'PRODUCTION_VALIDATION_SERVICE_ACTOR_BLOCKED',
        message: 'AI, n8n, service, workflow, and integration actors cannot access or finalize production validation signoff.'
      }
    });
    return false;
  }
  return true;
}

function validationGate(
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

function buildProductionValidationReadiness() {
  const readinessGates = [
    validationGate('release_tag_verified', 'attention_required', false, 'Release tag must be verified against the exact deployed commit in the target environment.', {
      evidence_owner: 'Engineering Lead',
      expected_tag_pattern: 'rc4-u-final-uat-evidence-pack-production-readiness-closure or later release-candidate tag',
      evidence_phrase: 'release tag must match deployed commit'
    }),
    validationGate('build_artifact_verified', 'attention_required', false, 'The deployed API and frontend build artifact checksums/version identifiers must be captured.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    validationGate('environment_configuration_verified', 'attention_required', false, 'Environment variables, CORS, JWT, database URL, object-storage configuration, and secrets handling must be verified in the target environment.', {
      evidence_owner: 'Platform/DevOps Lead',
      no_secrets_in_evidence: true
    }),
    validationGate('database_migration_verified', 'attention_required', false, 'Database migration status and seed/demo-data boundary must be captured before go-live.', {
      evidence_owner: 'Engineering Lead'
    }),
    validationGate('object_storage_runtime_verified', 'attention_required', false, 'Evidence upload/download/object-key verification must be tested against the actual object-storage target.', {
      evidence_owner: 'Platform/DevOps Lead',
      object_storage_evidence_required: true
    }),
    validationGate('api_smoke_tests_passed', 'attention_required', false, 'API smoke tests for health, auth, release closure, integrity workspace, evidence, reports, and work orders must be executed in the target environment.', {
      smoke_test_scope: ['health', 'auth', 'release-closure', 'integrity-workspace', 'evidence', 'reports', 'work-orders']
    }),
    validationGate('frontend_route_smoke_tests_passed', 'attention_required', false, 'Frontend route smoke tests must confirm production navigation, login, release closure, and integrity workspace pages render.', {
      smoke_test_scope: ['/login', '/release-closure', '/production-validation', '/integrity-workspace', '/dashboard']
    }),
    validationGate('backup_restore_drill_verified', 'attention_required', false, 'Backup/restore drill evidence must show PostgreSQL recovery and object-storage evidence preservation.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    validationGate('monitoring_alerting_verified', 'attention_required', false, 'Monitoring, logging, alert routing, and incident escalation checks must be evidenced before go-live.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    validationGate('security_access_review_verified', 'attention_required', false, 'Security review must confirm RBAC, service actor boundaries, secrets handling, and audit log visibility.', {
      evidence_owner: 'Security Lead'
    }),
    validationGate('open_defect_disposition_recorded', 'attention_required', false, 'Open defects must be classified as closed, accepted with workaround, deferred, or go-live blocking.', {
      evidence_owner: 'QA/UAT Lead'
    }),
    validationGate('human_go_no_go_signoff_ready', 'attention_required', false, 'Final go/no-go decision requires human signoff by the release signoff matrix roles.', {
      signoff_roles: FINAL_SIGNOFF_ROLES
    }),
    validationGate('no_formula_execution', 'pass', false, 'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by production validation readiness.', {
      boundary: 'production-validation-read-only'
    }),
    validationGate('ai_n8n_finalization_absent', 'pass', false, 'AI/n8n/service actors cannot finalize production validation or approve go-live.', {
      blocked_roles: Array.from(SERVICE_PRODUCTION_VALIDATION_BLOCKED_ROLES)
    })
  ];

  const blockingCount = readinessGates.filter((gate) => gate.blocking).length;
  const attentionRequiredCount = readinessGates.filter((gate) => gate.gate_status === 'attention_required').length;
  const passCount = readinessGates.filter((gate) => gate.gate_status === 'pass').length;

  return {
    generated_at: new Date().toISOString(),
    permission_required: 'golive_readiness.view',
    read_only: true,
    production_validation_status: blockingCount > 0 ? 'blocked' : attentionRequiredCount > 0 ? 'conditional_go_pending_environment_evidence' : 'ready_for_go_live_signoff',
    ready_for_go_live_without_conditions: blockingCount === 0 && attentionRequiredCount === 0,
    release_candidate_ready_for_human_go_no_go_review: blockingCount === 0,
    completion_estimate: {
      scoped_mvp_percent: 93,
      production_go_live_readiness_percent: 87,
      enterprise_commercial_grade_percent: 74,
      basis: 'Estimate after RC4-V production-environment validation evidence pack; real target-environment evidence remains required.'
    },
    gate_summary: {
      total_gates: readinessGates.length,
      pass_count: passCount,
      attention_required_count: attentionRequiredCount,
      blocking_count: blockingCount
    },
    production_validation_chain: PRODUCTION_VALIDATION_CHAIN,
    readiness_gates: readinessGates,
    production_evidence_pack: REQUIRED_PRODUCTION_EVIDENCE.map((path) => ({ path, required_for_final_signoff: true })),
    final_signoff_roles: FINAL_SIGNOFF_ROLES,
    smoke_test_matrix: [
      { area: 'API health/auth', required: true, expected_evidence: 'health/auth response screenshots or logs from target environment' },
      { area: 'Release closure', required: true, expected_evidence: '/api/v1/release-closure/readiness and /release-closure validated' },
      { area: 'Production validation', required: true, expected_evidence: '/api/v1/production-validation/readiness and /production-validation validated' },
      { area: 'Integrity workspace', required: true, expected_evidence: 'asset-to-work-order chain visible in target environment' },
      { area: 'Evidence object storage', required: true, expected_evidence: 'upload/download/object-key preservation proven without exposing signed URLs' },
      { area: 'Audit log', required: true, expected_evidence: 'audit event visibility and redaction verified' }
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
      'no production go-live signoff mutation controls'
    ],
    safe_navigation_links: [
      { label: 'Release Closure', href: '/release-closure' },
      { label: 'End-to-End Integrity Workspace', href: '/integrity-workspace' },
      { label: 'Go-Live Readiness', href: '/golive-readiness' },
      { label: 'Governance Dashboard', href: '/dashboard' },
      { label: 'Audit Logs', href: '/audit-logs' }
    ]
  };
}

productionValidationRouter.get('/production-validation/readiness', requirePermission('golive_readiness.view'), async (req, res, next) => {
  try {
    if (!enforceHumanProductionValidationViewer(req, res)) return;
    res.json({ data: buildProductionValidationReadiness() });
  } catch (error) {
    next(error);
  }
});
