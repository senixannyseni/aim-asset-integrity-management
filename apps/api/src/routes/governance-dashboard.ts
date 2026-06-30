import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest } from '../modules/tenancy/tenant-scope.js';

export const governanceDashboardRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

type CountRow = { total_count: string };
type GroupCountRow = { status: string | null; total_count: string };

const SERVICE_DASHBOARD_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const SAFE_DASHBOARD_LINKS = [
  { label: 'Evidence Repository', href: '/evidence', entity_type: 'evidence_file' },
  { label: 'AI Review Workspace', href: '/reviews', entity_type: 'ai_extraction_review' },
  { label: 'Reports', href: '/reports', entity_type: 'report' },
  { label: 'Audit Logs', href: '/audit-logs', entity_type: 'audit_log' },
  { label: 'Admin Governance', href: '/admin-governance', entity_type: 'admin_governance' },
  { label: 'Work Orders', href: '/work-orders', entity_type: 'internal_work_order' }
];

function isServiceDashboardActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_DASHBOARD_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanDashboardViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceDashboardActor(req)) {
    res.status(403).json({
      error: {
        code: 'DASHBOARD_SERVICE_ACTOR_BLOCKED',
        message: 'Service, AI, n8n, and integration-style actors cannot access broad governance dashboard visibility.'
      }
    });
    return false;
  }
  return true;
}

function asCount(row: CountRow | undefined): number {
  return Number.parseInt(row?.total_count ?? '0', 10);
}

async function countSql(sql: string, values: unknown[] = []): Promise<number> {
  const result = await pool.query<CountRow>(sql, values);
  return asCount(result.rows[0]);
}

async function groupCounts(sql: string, values: unknown[] = []): Promise<Record<string, number>> {
  const result = await pool.query<GroupCountRow>(sql, values);
  return Object.fromEntries(
    result.rows.map((row) => [row.status ?? 'unspecified', Number.parseInt(row.total_count, 10)])
  );
}

function notAvailable(reason: string): Record<string, unknown> {
  return { status: 'not_available', reason };
}

governanceDashboardRouter.get('/governance-dashboard/overview', requirePermission('dashboard.view'), async (req, res, next) => {
  try {
    if (!enforceHumanDashboardViewer(req, res)) return;
    const tenant = requireTenantContextFromRequest(req);
    const tenantValues = [tenant.tenantId];

    const [
      assetsTotal,
      inspectionsTotal,
      evidenceByUploadStatus,
      verifiedEvidenceTotal,
      evidenceMissingVerifiedObjectStorage,
      extractionJobsByStatus,
      aiFieldsPendingReview,
      aiStagingBlocked,
      aiStagingReady,
      manualOverridesTotal,
      calculationRunsByStatus,
      reportVersionsByStatus,
      reportsByIssueGate,
      reportsBlockedByIssueGate,
      reportExportsByStatus,
      workOrdersByStatus,
      unresolvedWorkflowTasks,
      unresolvedErrorLogs,
      recentAuditResult
    ] = await Promise.all([
      countSql('select count(*)::text as total_count from assets where tenant_id = $1::uuid', tenantValues),
      countSql('select count(*)::text as total_count from inspection_events where tenant_id = $1::uuid', tenantValues),
      groupCounts("select coalesce(upload_status, 'metadata_only') as status, count(*)::text as total_count from evidence_files where tenant_id = $1::uuid group by coalesce(upload_status, 'metadata_only') order by status", tenantValues),
      countSql("select count(*)::text as total_count from evidence_files where tenant_id = $1::uuid and upload_status = 'verified' and object_key is not null", tenantValues),
      countSql("select count(*)::text as total_count from evidence_files where tenant_id = $1::uuid and (upload_status is distinct from 'verified' or object_key is null)", tenantValues),
      groupCounts('select ej.status, count(*)::text as total_count from extraction_jobs ej join assets a on a.id = ej.asset_id where a.tenant_id = $1::uuid group by ej.status order by ej.status', tenantValues),
      countSql("select count(*)::text as total_count from extraction_fields ef join extraction_jobs ej on ej.id = ef.extraction_job_id join assets a on a.id = ej.asset_id where a.tenant_id = $1::uuid and ef.review_required = true and ef.field_status in ('ai_extracted','needs_review','invalid','rejected_by_validation')", tenantValues),
      countSql("select count(*)::text as total_count from staging_records sr join extraction_jobs ej on ej.id = sr.extraction_job_id join assets a on a.id = ej.asset_id where a.tenant_id = $1::uuid and sr.promotion_status = 'blocked'", tenantValues),
      countSql("select count(*)::text as total_count from staging_records sr join extraction_jobs ej on ej.id = sr.extraction_job_id join assets a on a.id = ej.asset_id where a.tenant_id = $1::uuid and sr.review_status in ('approved_for_promotion','corrected') and sr.promotion_status = 'not_promoted'", tenantValues),
      countSql('select count(*)::text as total_count from manual_overrides mo left join staging_records sr on sr.id = mo.staging_record_id left join extraction_fields ef on ef.id = mo.extraction_field_id join extraction_jobs ej on ej.id = coalesce(sr.extraction_job_id, ef.extraction_job_id) join assets a on a.id = ej.asset_id where a.tenant_id = $1::uuid', tenantValues),
      groupCounts('select status, count(*)::text as total_count from calculation_runs where tenant_id = $1::uuid group by status order by status', tenantValues),
      groupCounts('select rv.version_status as status, count(*)::text as total_count from report_versions rv join reports r on r.id = rv.report_id where r.tenant_id = $1::uuid group by rv.version_status order by rv.version_status', tenantValues),
      groupCounts('select issue_gate_status as status, count(*)::text as total_count from reports where tenant_id = $1::uuid group by issue_gate_status order by issue_gate_status', tenantValues),
      countSql("select count(*)::text as total_count from reports where tenant_id = $1::uuid and issue_gate_status = 'blocked'", tenantValues),
      groupCounts('select export_status as status, count(*)::text as total_count from report_exports where tenant_id = $1::uuid group by export_status order by export_status', tenantValues),
      groupCounts('select status, count(*)::text as total_count from internal_work_orders where tenant_id = $1::uuid group by status order by status', tenantValues),
      countSql("select count(*)::text as total_count from workflow_tasks wt join workflow_events we on we.id = wt.workflow_event_id where we.tenant_id = $1::uuid and wt.status in ('queued','open','in_progress','escalated','failed')", tenantValues),
      countSql("select count(*)::text as total_count from error_logs where tenant_id = $1::uuid and status in ('open','triaged')", tenantValues),
      pool.query<DbRow>(
        `select event_type, entity_type, count(*)::text as total_count, max(created_at) as latest_at
         from audit_logs
         where tenant_id = $1::uuid
           and event_type in (
           'EVIDENCE_UPLOAD_URL_CREATED',
           'EVIDENCE_UPLOAD_COMPLETED',
           'EVIDENCE_ACCESS_BLOCKED',
           'REPORT_EXPORT_CREATED',
           'REPORT_ISSUE_BLOCKED',
           'REPORT_ISSUED',
           'AI_FIELD_APPROVED',
           'AI_FIELD_CORRECTED',
           'AI_FIELD_REJECTED',
           'AI_STAGING_PROMOTION_BLOCKED',
           'AI_STAGING_PROMOTED',
           'ADMIN_SYSTEM_SETTING_UPDATED',
           'ADMIN_USER_ROLE_ASSIGNED'
         )
         group by event_type, entity_type
         order by latest_at desc
         limit 10`,
        tenantValues
      )
    ]);

    res.json({
      data: {
        generated_at: new Date().toISOString(),
        permission_required: 'dashboard.view',
        read_only: true,
        source_of_truth: 'AIM PostgreSQL metadata and governed AIM APIs only; no n8n-written dashboard snapshot table is used.',
        redaction_notice: 'Dashboard overview returns counts and safe labels only. Secrets, signed URLs, tokens, object-storage credentials, passwords, private keys, and raw evidence/report contents are never returned.',
        sections: {
          asset_inspection_coverage: {
            assets_total: assetsTotal,
            inspections_total: inspectionsTotal,
            link: '/'
          },
          evidence_readiness: {
            upload_status_counts: evidenceByUploadStatus,
            verified_object_storage_evidence_total: verifiedEvidenceTotal,
            missing_verified_object_storage_linkage: evidenceMissingVerifiedObjectStorage,
            link: '/evidence'
          },
          ai_extraction_review_queue: {
            extraction_jobs_by_status: extractionJobsByStatus,
            ai_fields_pending_review: aiFieldsPendingReview,
            manual_overrides_total: manualOverridesTotal,
            link: '/reviews'
          },
          staging_promotion_readiness: {
            blocked_from_promotion: aiStagingBlocked,
            ready_for_promotion: aiStagingReady,
            note: 'Read-only summary only. Promotion remains an engineer-reviewed API workflow.'
          },
          calculation_review_readiness: {
            calculation_runs_by_status: calculationRunsByStatus,
            note: 'Counts only; no deterministic calculation is run by the dashboard.',
            link: '/calculations'
          },
          report_issue_readiness: {
            report_versions_by_status: reportVersionsByStatus,
            reports_by_issue_gate: reportsByIssueGate,
            reports_blocked_by_issue_gate: reportsBlockedByIssueGate,
            report_exports_by_status: reportExportsByStatus,
            link: '/reports'
          },
          work_order_follow_up: {
            work_orders_by_status: workOrdersByStatus,
            link: '/work-orders'
          },
          governance_warnings: {
            unresolved_workflow_tasks: unresolvedWorkflowTasks,
            unresolved_error_logs: unresolvedErrorLogs,
            audit_log_summary: recentAuditResult.rows.map((row) => ({
              event_type: row.event_type,
              entity_type: row.entity_type ?? null,
              total_count: Number.parseInt(String(row.total_count ?? '0'), 10),
              latest_at: row.latest_at ?? null
            })),
            link: '/audit-logs'
          },
          not_available: notAvailable('Unsupported dashboard values are omitted rather than invented.')
        },
        traceability_links: SAFE_DASHBOARD_LINKS,
        prohibited_controls: [
          'approve',
          'reject',
          'correct',
          'promote',
          'issue_report',
          'delete_evidence',
          'update_settings',
          'assign_roles',
          'edit_audit_logs',
          'run_calculations',
          'n8n_workflow_execution'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});
