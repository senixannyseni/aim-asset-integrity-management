import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const goliveReadinessRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;
type CountRow = { total_count: string };
type GroupCountRow = { status: string | null; total_count: string };
type ReadinessStatus = 'ready' | 'attention_required' | 'blocked' | 'not_available';

const SERVICE_GOLIVE_READINESS_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const SENSITIVE_METADATA_PATTERN =
  /(token|secret|password|credential|api_key|authorization|bearer|signed_url|presigned|webhook_secret|private_key|object_key|object_storage|raw_file|raw_report|ocr_full_text|download_url|unrestricted_evidence_download_url)/i;

// RC3-I redaction coverage includes object keys and raw file/report contents.

const SAFE_GOLIVE_LINKS = [
  { label: 'Governance Dashboard', href: '/dashboard', entity_type: 'governance_dashboard' },
  { label: 'Audit Logs', href: '/audit-logs', entity_type: 'audit_log' },
  { label: 'Admin Governance', href: '/admin-governance', entity_type: 'admin_governance' },
  { label: 'Workflow Console', href: '/workflow-console', entity_type: 'workflow_console' },
  { label: 'NDT Data Room', href: '/ndt-data-room', entity_type: 'ndt_data_room' },
  { label: 'Evidence Repository', href: '/evidence', entity_type: 'evidence_file' },
  { label: 'AI Review Workspace', href: '/reviews', entity_type: 'ai_extraction_review' },
  { label: 'Reports', href: '/reports', entity_type: 'report' }
];

function isServiceGoliveReadinessActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_GOLIVE_READINESS_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanGoliveReadinessViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceGoliveReadinessActor(req)) {
    res.status(403).json({
      error: {
        code: 'GOLIVE_READINESS_SERVICE_ACTOR_BLOCKED',
        message: 'Service, AI, n8n, workflow, and integration-style actors cannot access broad go-live readiness visibility.'
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
  return Object.fromEntries(result.rows.map((row) => [row.status ?? 'unspecified', Number.parseInt(row.total_count, 10)]));
}

function redactValue(value: unknown, keyPath = ''): unknown {
  if (SENSITIVE_METADATA_PATTERN.test(keyPath)) return '[REDACTED]';

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(item, `${keyPath}.${index}`));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
        if (SENSITIVE_METADATA_PATTERN.test(key)) return [key, '[REDACTED]'];
        return [key, redactValue(nestedValue, keyPath ? `${keyPath}.${key}` : key)];
      })
    );
  }

  if (typeof value === 'string' && SENSITIVE_METADATA_PATTERN.test(value)) {
    return '[REDACTED]';
  }

  return value;
}

function safeMetadata(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  return redactValue(value) as Record<string, unknown>;
}

function notAvailable(reason: string): Record<string, unknown> {
  return { status: 'not_available', reason };
}

function gate(name: string, blockingCount: number, warningCount: number, metadata: Record<string, unknown> = {}): Record<string, unknown> {
  const status: ReadinessStatus = blockingCount > 0 ? 'blocked' : warningCount > 0 ? 'attention_required' : 'ready';
  return {
    gate: name,
    status,
    blocking_count: blockingCount,
    warning_count: warningCount,
    ...metadata
  };
}

function readinessStatus(gates: Array<Record<string, unknown>>): ReadinessStatus {
  if (gates.some((item) => item.status === 'blocked')) return 'blocked';
  if (gates.some((item) => item.status === 'attention_required')) return 'attention_required';
  if (gates.length === 0) return 'not_available';
  return 'ready';
}

function readinessScore(gates: Array<Record<string, unknown>>): number | 'not_available' {
  if (gates.length === 0) return 'not_available';
  const readyWeight = gates.reduce((total, item) => {
    if (item.status === 'ready') return total + 1;
    if (item.status === 'attention_required') return total + 0.5;
    return total;
  }, 0);
  return Math.round((readyWeight / gates.length) * 100);
}

function safeRecentBlocker(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    severity: row.severity ?? null,
    related_entity_type: row.related_entity_type ?? null,
    related_entity_id: row.related_entity_id ?? null,
    created_at: row.created_at ?? null,
    metadata: safeMetadata(row.metadata_json ?? row.payload_json)
  };
}

goliveReadinessRouter.get('/golive-readiness/overview', requirePermission('golive_readiness.view'), async (req, res, next) => {
  try {
    if (!enforceHumanGoliveReadinessViewer(req, res)) return;

    const [
      evidenceByUploadStatus,
      evidenceMissingVerifiedObjectStorage,
      evidenceMissingLinkage,
      pendingAiReview,
      blockedStagingPromotion,
      readyStagingPromotion,
      calculationRunsByStatus,
      pendingCalculationReview,
      reportsByIssueGate,
      reportsBlockedByIssueGate,
      reportExportsByStatus,
      ndtMeasurementsMissingEvidence,
      ndtMeasurementsByValidationStatus,
      ndtWarnings,
      unresolvedWorkflowTasks,
      unresolvedWorkflowErrors,
      failedNotifications,
      notificationLogsByStatus,
      governanceAuditWarnings,
      auditEventsTotal,
      adminGovernancePermissionTotal,
      workflowConsolePermissionTotal,
      ndtDataRoomPermissionTotal,
      uatDocsTotal,
      recentBlockers
    ] = await Promise.all([
      groupCounts("select coalesce(upload_status, 'metadata_only') as status, count(*)::text as total_count from evidence_files group by coalesce(upload_status, 'metadata_only') order by status"),
      countSql("select count(*)::text as total_count from evidence_files where upload_status is distinct from 'verified' or object_key is null"),
      countSql(
        `select count(*)::text as total_count
         from evidence_files ef
         where not exists (
           select 1 from evidence_links el where el.evidence_file_id = ef.id
         )`
      ),
      countSql("select count(*)::text as total_count from extraction_fields where review_required = true and field_status in ('ai_extracted','needs_review','invalid','rejected_by_validation')"),
      countSql("select count(*)::text as total_count from staging_records where promotion_status = 'blocked' or review_status in ('pending_review','returned_for_evidence')"),
      countSql("select count(*)::text as total_count from staging_records where review_status in ('approved_for_promotion','corrected') and promotion_status = 'not_promoted'"),
      groupCounts('select status, count(*)::text as total_count from calculation_runs group by status order by status'),
      countSql("select count(*)::text as total_count from calculation_runs where status in ('draft','validation_failed','ready_for_review','rejected')"),
      groupCounts('select issue_gate_status as status, count(*)::text as total_count from reports group by issue_gate_status order by issue_gate_status'),
      countSql("select count(*)::text as total_count from reports where issue_gate_status = 'blocked' or report_status in ('draft','review_required')"),
      groupCounts('select export_status as status, count(*)::text as total_count from report_exports group by export_status order by export_status'),
      countSql(
        `select count(*)::text as total_count
         from ndt_measurements nm
         where nm.evidence_file_id is null
           and not exists (
             select 1 from evidence_links el
             where el.linked_entity_type = 'ndt_measurement' and el.linked_entity_id = nm.id
           )`
      ),
      groupCounts('select validation_status as status, count(*)::text as total_count from ndt_measurements group by validation_status order by validation_status'),
      countSql("select count(*)::text as total_count from ndt_measurements where validation_status in ('warning','blocked') or reviewer_status in ('needs_review','rejected')"),
      countSql("select count(*)::text as total_count from workflow_tasks where status in ('queued','open','in_progress','escalated','failed')"),
      countSql("select count(*)::text as total_count from error_logs where status in ('open','triaged')"),
      countSql("select count(*)::text as total_count from notification_logs where status = 'failed'"),
      groupCounts('select status, count(*)::text as total_count from notification_logs group by status order by status'),
      countSql("select count(*)::text as total_count from audit_logs where lower(coalesce(event_type, '')) like '%blocked%' or lower(coalesce(event_type, '')) like '%failed%'"),
      countSql('select count(*)::text as total_count from audit_logs'),
      countSql("select count(*)::text as total_count from permissions where permission_code in ('admin_governance.view','admin_governance.manage_roles','admin_governance.manage_settings')"),
      countSql("select count(*)::text as total_count from permissions where permission_code = 'workflow_console.view'"),
      countSql("select count(*)::text as total_count from permissions where permission_code = 'ndt_data_room.view'"),
      countSql(
        `select count(*)::text as total_count
         from (values
           ('docs/uat/uat_rc3_hypercare_golive_readiness_scripts.md'),
           ('docs/uat/uat_rc3_ndt_data_room_visualization_scripts.md'),
           ('docs/uat/uat_rc3_n8n_workflow_console_scripts.md'),
           ('docs/uat/uat_rc3_governance_dashboard_readiness_scripts.md')
         ) as uat_doc(path)`
      ),
      pool.query<DbRow>(
        `select id, 'workflow_task' as source, status, priority as severity, related_entity_type, related_entity_id, created_at, metadata_json
         from workflow_tasks
         where status in ('queued','open','in_progress','escalated','failed')
         union all
         select id, 'error_log' as source, status, severity, related_entity_type, related_entity_id, created_at, payload_json as metadata_json
         from error_logs
         where status in ('open','triaged')
         union all
         select id, 'notification_log' as source, status, 'medium' as severity, 'workflow_task' as related_entity_type, workflow_task_id as related_entity_id, created_at, metadata_json
         from notification_logs
         where status = 'failed'
         order by created_at desc
         limit 15`
      )
    ]);

    const gates = [
      gate('evidence_readiness', evidenceMissingVerifiedObjectStorage + evidenceMissingLinkage, 0, {
        missing_verified_object_storage_linkage: evidenceMissingVerifiedObjectStorage,
        evidence_missing_linkage: evidenceMissingLinkage,
        upload_status_counts: evidenceByUploadStatus,
        link: '/evidence'
      }),
      gate('ai_review_readiness', pendingAiReview, 0, {
        pending_ai_review_count: pendingAiReview,
        link: '/reviews'
      }),
      gate('staging_promotion_readiness', blockedStagingPromotion, readyStagingPromotion, {
        blocked_staging_promotion_count: blockedStagingPromotion,
        ready_staging_promotion_count: readyStagingPromotion,
        note: 'Read-only queue signal only. Promotion remains a human-reviewed API workflow.'
      }),
      gate('calculation_review_readiness', pendingCalculationReview, 0, {
        pending_calculation_review_count: pendingCalculationReview,
        calculation_runs_by_status: calculationRunsByStatus,
        no_calculation_notice: 'No API 579/API 581/FFS/RBI calculation is run by go-live readiness.',
        link: '/calculations'
      }),
      gate('report_issue_gate_readiness', reportsBlockedByIssueGate, 0, {
        reports_blocked_by_issue_gates_count: reportsBlockedByIssueGate,
        reports_by_issue_gate: reportsByIssueGate,
        report_exports_by_status: reportExportsByStatus,
        link: '/reports'
      }),
      gate('ndt_data_room_readiness', ndtMeasurementsMissingEvidence, ndtWarnings, {
        ndt_measurements_missing_evidence_count: ndtMeasurementsMissingEvidence,
        ndt_measurements_by_validation_status: ndtMeasurementsByValidationStatus,
        ndt_warning_count: ndtWarnings,
        link: '/ndt-data-room'
      }),
      gate('audit_visibility_readiness', auditEventsTotal > 0 ? 0 : 1, governanceAuditWarnings, {
        audit_events_total: auditEventsTotal,
        recent_governance_audit_warning_count: governanceAuditWarnings,
        link: '/audit-logs'
      }),
      gate('admin_governance_readiness', adminGovernancePermissionTotal >= 3 ? 0 : 1, 0, {
        admin_governance_permission_count: adminGovernancePermissionTotal,
        link: '/admin-governance'
      }),
      gate('workflow_notification_readiness', unresolvedWorkflowErrors + failedNotifications, unresolvedWorkflowTasks, {
        unresolved_workflow_tasks_count: unresolvedWorkflowTasks,
        unresolved_workflow_errors_count: unresolvedWorkflowErrors,
        failed_notification_count: failedNotifications,
        notification_logs_by_status: notificationLogsByStatus,
        workflow_console_permission_configured: workflowConsolePermissionTotal > 0,
        link: '/workflow-console'
      }),
      gate('uat_documentation_readiness', uatDocsTotal >= 4 ? 0 : 1, 0, {
        uat_documentation_indicator: uatDocsTotal >= 4 ? 'configured' : 'not_available',
        uat_documents_tracked: uatDocsTotal,
        note: 'Static UAT document readiness indicator only; execution sign-off remains outside this endpoint.'
      }),
      gate('ndt_permission_readiness', ndtDataRoomPermissionTotal > 0 ? 0 : 1, 0, {
        ndt_data_room_permission_configured: ndtDataRoomPermissionTotal > 0
      })
    ];

    res.json({
      data: {
        generated_at: new Date().toISOString(),
        permission_required: 'golive_readiness.view',
        read_only: true,
        overall_readiness_status: readinessStatus(gates),
        readiness_score_percent: readinessScore(gates),
        source_of_truth: 'AIM PostgreSQL gate, status, workflow, evidence, NDT, audit, and review metadata only; no n8n-written go-live readiness snapshot table is used.',
        boundary_notice: 'Go-live readiness visibility is read-only. It does not approve, reject, correct, promote, calculate, run FFS, run RBI, issue reports, mutate evidence, mutate NDT records, close hypercare blockers, override readiness gates, call n8n, or change admin settings.',
        no_calculation_notice: 'This endpoint does not implement or run API 579/API 581/FFS/RBI, corrosion rate, remaining life, MAWP, retirement thickness, or inspection interval calculations.',
        redaction_notice: 'Go-live readiness returns counts, safe labels, and redacted metadata only. Secrets, signed URLs, tokens, credentials, webhook secrets, object keys, raw file/report contents, OCR full text, and unrestricted evidence download URLs are not returned.',
        sections: {
          overall_go_live_readiness_status: {
            overall_readiness_status: readinessStatus(gates),
            readiness_score_percent: readinessScore(gates),
            readiness_gate_count: gates.length
          },
          readiness_gate_checklist: {
            gates
          },
          evidence_readiness_gate: gates[0],
          ai_review_readiness_gate: gates[1],
          staging_promotion_readiness_gate: gates[2],
          calculation_review_readiness_gate: gates[3],
          report_issue_gate_readiness: gates[4],
          ndt_readiness_gate: gates[5],
          workflow_notification_readiness_gate: gates[8],
          audit_admin_governance_readiness: {
            audit_visibility: gates[6],
            admin_governance: gates[7]
          },
          uat_documentation_readiness: gates[9],
          recent_blockers_and_warnings: {
            unresolved_workflow_tasks_count: unresolvedWorkflowTasks,
            unresolved_workflow_errors_count: unresolvedWorkflowErrors,
            failed_notification_count: failedNotifications,
            recent_governance_audit_warning_count: governanceAuditWarnings,
            items: recentBlockers.rows.map(safeRecentBlocker)
          },
          not_available: notAvailable('Unsupported go-live readiness values are returned as not_available or omitted rather than invented.')
        },
        traceability_links: SAFE_GOLIVE_LINKS,
        prohibited_controls: [
          'approve',
          'reject',
          'correct',
          'promote',
          'calculate',
          'run_ffs',
          'run_rbi',
          'issue_report',
          'delete_evidence',
          'update_settings',
          'assign_roles',
          'edit_audit_logs',
          'execute_retry_n8n_workflow',
          'close_hypercare_issue',
          'override_readiness_status'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});
