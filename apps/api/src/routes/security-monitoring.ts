import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../middleware/rbac.js';

export const securityMonitoringRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type GateStatus = 'pass' | 'attention_required' | 'blocked';

const SERVICE_SECURITY_MONITORING_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const SECURITY_MONITORING_CLOSURE_CHAIN = [
  'Secrets and environment configuration',
  'RBAC and service-actor boundary',
  'audit-log redaction verification',
  'Security headers and CORS verification',
  'Vulnerability and dependency scan evidence',
  'Monitoring dashboard verification',
  'Alert routing and incident escalation',
  'Log retention and backup evidence',
  'Operational access review',
  'Human security/operations signoff'
];

const REQUIRED_SECURITY_MONITORING_EVIDENCE = [
  'docs/security/rc4w_security_review_evidence.md',
  'docs/operations/rc4w_operational_monitoring_closure.md',
  'docs/operations/rc4w_incident_response_alert_routing_runbook.md',
  'docs/release/rc4w_security_monitoring_signoff_evidence.md',
  'docs/operations/rc4v_monitoring_alerting_verification.md',
  'docs/operations/rc4v_production_environment_validation_evidence.md'
];

const SECURITY_MONITORING_SIGNOFF_ROLES = [
  { role: 'Security Lead', required: true, evidence_required: 'Vulnerability scan, RBAC, service actor, and secrets checks reviewed' },
  { role: 'Platform/DevOps Lead', required: true, evidence_required: 'Monitoring dashboard, alert routing, logs, and backup evidence verified' },
  { role: 'Engineering Lead', required: true, evidence_required: 'Security boundary and read-only endpoint governance verified' },
  { role: 'Product Owner', required: true, evidence_required: 'Known residual operational risks accepted or deferred' }
];

function isServiceSecurityMonitoringActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_SECURITY_MONITORING_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanSecurityMonitoringViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceSecurityMonitoringActor(req)) {
    res.status(403).json({
      error: {
        code: 'SECURITY_MONITORING_SERVICE_ACTOR_BLOCKED',
        message: 'AI, n8n, service, workflow, and integration actors cannot finalize security review, monitoring closure, or operational signoff.'
      }
    });
    return false;
  }
  return true;
}

function monitoringGate(
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

function buildSecurityMonitoringReadiness() {
  const readinessGates = [
    monitoringGate('secrets_configuration_reviewed', 'attention_required', false, 'Secrets, JWT settings, database URL handling, object-storage credentials, CORS, and environment configuration must be reviewed without exposing sensitive values.', {
      evidence_owner: 'Security Lead',
      no_secrets_in_evidence: true
    }),
    monitoringGate('rbac_permission_matrix_verified', 'attention_required', false, 'RBAC permissions for release closure, production validation, audit logs, reports, work orders, evidence, and engineering approvals must be verified against intended roles.', {
      evidence_owner: 'Security Lead',
      permission_focus: ['golive_readiness.view', 'audit_logs.view', 'report.issue', 'work_order.close', 'engineering_review.approve']
    }),
    monitoringGate('service_actor_boundary_verified', 'attention_required', false, 'AI/n8n/service/integration actors must remain blocked from approvals, finalization, formula execution, report issue, work-order closure, and production signoff.', {
      evidence_owner: 'Security Lead',
      blocked_roles: Array.from(SERVICE_SECURITY_MONITORING_BLOCKED_ROLES)
    }),
    monitoringGate('audit_log_redaction_verified', 'attention_required', false, 'Audit log visibility and redaction must be verified so sensitive evidence, signed URLs, credentials, and secrets are not exposed.', {
      evidence_owner: 'Engineering Lead'
    }),
    monitoringGate('vulnerability_scan_reviewed', 'attention_required', false, 'Dependency, container, infrastructure, and application vulnerability scan results must be attached or referenced before unconditional go-live.', {
      evidence_owner: 'Security Lead',
      severity_policy: 'critical/high issues require closure, accepted risk, or conditional-go disposition'
    }),
    monitoringGate('dependency_license_reviewed', 'attention_required', false, 'Dependency and license review evidence must be captured for production release acceptance.', {
      evidence_owner: 'Security Lead'
    }),
    monitoringGate('security_headers_cors_reviewed', 'attention_required', false, 'Helmet/security headers and CORS configuration must be verified against the production domain and API clients.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    monitoringGate('monitoring_dashboard_verified', 'attention_required', false, 'Monitoring dashboard must show API health, frontend availability, database connectivity, object-storage connectivity, and error-rate visibility.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    monitoringGate('alert_routing_verified', 'attention_required', false, 'Alert routing, severity mapping, incident escalation route, and on-call contacts must be validated.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    monitoringGate('incident_response_runbook_ready', 'attention_required', false, 'Incident response runbook must cover authentication failure, object-storage failure, database outage, report issue blocker, and evidence integrity concern.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    monitoringGate('log_retention_backup_verified', 'attention_required', false, 'Log retention, backup retention, restore evidence, and audit trail preservation must be verified.', {
      evidence_owner: 'Platform/DevOps Lead'
    }),
    monitoringGate('operational_access_review_signed_off', 'attention_required', false, 'Production access review must list human operators, service accounts, role assignments, emergency access, and reviewer signoff.', {
      evidence_owner: 'Security Lead'
    }),
    monitoringGate('no_formula_execution', 'pass', false, 'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by security monitoring readiness.', {
      boundary: 'security-monitoring-read-only'
    }),
    monitoringGate('ai_n8n_finalization_absent', 'pass', false, 'AI/n8n/service actors cannot finalize security monitoring closure, operational signoff, or production launch readiness.', {
      blocked_roles: Array.from(SERVICE_SECURITY_MONITORING_BLOCKED_ROLES)
    })
  ];

  const blockingCount = readinessGates.filter((gate) => gate.blocking).length;
  const attentionRequiredCount = readinessGates.filter((gate) => gate.gate_status === 'attention_required').length;
  const passCount = readinessGates.filter((gate) => gate.gate_status === 'pass').length;

  return {
    generated_at: new Date().toISOString(),
    permission_required: 'golive_readiness.view',
    read_only: true,
    security_monitoring_status: blockingCount > 0 ? 'blocked' : attentionRequiredCount > 0 ? 'conditional_go_pending_security_monitoring_evidence' : 'ready_for_security_operations_signoff',
    ready_for_unconditional_go_live_without_security_conditions: blockingCount === 0 && attentionRequiredCount === 0,
    release_candidate_ready_for_security_operations_review: blockingCount === 0,
    completion_estimate: {
      scoped_mvp_percent: 94,
      production_go_live_readiness_percent: 89,
      enterprise_commercial_grade_percent: 75,
      basis: 'Estimate after RC4-W security review and operational monitoring closure evidence pack; real scan/dashboard/signoff evidence remains required.'
    },
    gate_summary: {
      total_gates: readinessGates.length,
      pass_count: passCount,
      attention_required_count: attentionRequiredCount,
      blocking_count: blockingCount
    },
    security_monitoring_closure_chain: SECURITY_MONITORING_CLOSURE_CHAIN,
    readiness_gates: readinessGates,
    security_monitoring_evidence_pack: REQUIRED_SECURITY_MONITORING_EVIDENCE.map((path) => ({ path, required_for_security_operations_signoff: true })),
    signoff_roles: SECURITY_MONITORING_SIGNOFF_ROLES,
    monitoring_matrix: [
      { area: 'API and frontend availability', required: true, expected_evidence: 'health endpoint, API route, and frontend uptime visibility' },
      { area: 'Database and object storage', required: true, expected_evidence: 'connectivity, latency, error, and backup indicators visible' },
      { area: 'Audit logs and security events', required: true, expected_evidence: 'audit event generation, redaction, and alert visibility verified' },
      { area: 'Authentication and RBAC', required: true, expected_evidence: 'failed login, forbidden access, and service actor boundary checks visible' },
      { area: 'Incident escalation', required: true, expected_evidence: 'alert recipient, severity, escalation route, and response owner captured' }
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
      'no security signoff mutation controls',
      'no production go-live mutation controls'
    ],
    safe_navigation_links: [
      { label: 'Production Validation', href: '/production-validation' },
      { label: 'Release Closure', href: '/release-closure' },
      { label: 'Governance Dashboard', href: '/dashboard' },
      { label: 'Audit Logs', href: '/audit-logs' },
      { label: 'End-to-End Integrity Workspace', href: '/integrity-workspace' }
    ]
  };
}

securityMonitoringRouter.get('/security-monitoring/readiness', requirePermission('golive_readiness.view'), async (req, res, next) => {
  try {
    if (!enforceHumanSecurityMonitoringViewer(req, res)) return;
    res.json({ data: buildSecurityMonitoringReadiness() });
  } catch (error) {
    next(error);
  }
});
