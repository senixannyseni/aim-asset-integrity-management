import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const workflowConsoleRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

type CountRow = { total_count: string };
type GroupCountRow = { status: string | null; total_count: string };

const SERVICE_WORKFLOW_CONSOLE_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const SENSITIVE_METADATA_PATTERN = /(token|secret|password|credential|api[_-]?key|authorization|bearer|signed[_-]?url|presigned|webhook[_-]?secret|private[_-]?key|object[_-]?key|raw[_-]?file|raw[_-]?report|file[_-]?content|report[_-]?content)/i;

const SAFE_WORKFLOW_LINKS = [
  { label: 'Governance Dashboard', href: '/dashboard', entity_type: 'governance_dashboard' },
  { label: 'Engineering Review Workspace', href: '/reviews', entity_type: 'engineering_review' },
  { label: 'Evidence Repository', href: '/evidence', entity_type: 'evidence_file' },
  { label: 'Reports', href: '/reports', entity_type: 'report' },
  { label: 'Audit Logs', href: '/audit-logs', entity_type: 'audit_log' },
  { label: 'Work Orders', href: '/work-orders', entity_type: 'internal_work_order' }
];

function isServiceWorkflowConsoleActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_WORKFLOW_CONSOLE_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration') ||
    email.includes('workflow')
  );
}

function enforceHumanWorkflowConsoleViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceWorkflowConsoleActor(req)) {
    res.status(403).json({
      error: {
        code: 'WORKFLOW_CONSOLE_SERVICE_ACTOR_BLOCKED',
        message: 'Service, AI, n8n, workflow, and integration-style actors cannot access broad workflow console visibility.'
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

function safeRecentTask(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    task_type: row.task_type,
    status: row.status,
    priority: row.priority,
    owner_role: row.owner_role ?? null,
    related_entity_type: row.related_entity_type ?? null,
    related_entity_id: row.related_entity_id ?? null,
    due_at: row.due_at ?? null,
    created_at: row.created_at ?? null,
    metadata: safeMetadata(row.metadata_json)
  };
}

function safeRecentNotification(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    channel: row.channel,
    recipient: '[REDACTED_RECIPIENT]',
    subject: row.subject ?? null,
    status: row.status,
    failure_message: row.failure_message ? '[REDACTED_FAILURE_MESSAGE]' : null,
    created_at: row.created_at ?? null,
    metadata: safeMetadata(row.metadata_json)
  };
}

function safeRecentWorkflowEvent(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    workflow_name: row.workflow_name ?? null,
    event_type: row.event_type,
    event_status: row.event_status,
    source_system: row.source_system,
    related_entity_type: row.related_entity_type ?? null,
    related_entity_id: row.related_entity_id ?? null,
    created_at: row.created_at ?? null,
    payload: safeMetadata(row.payload_json)
  };
}

workflowConsoleRouter.get('/workflow-console/overview', requirePermission('workflow_console.view'), async (req, res, next) => {
  try {
    if (!enforceHumanWorkflowConsoleViewer(req, res)) return;

    const [
      workflowTasksByStatus,
      workflowTasksByTaskType,
      pendingHumanFollowUps,
      overdueWorkflowTasks,
      workflowErrorsByStatus,
      workflowErrorsBySeverity,
      notificationLogsByStatus,
      notificationLogsByChannel,
      recentNotificationFailures,
      recentWorkflowTasks,
      recentWorkflowEvents,
      n8nAuditEvents
    ] = await Promise.all([
      groupCounts('select status, count(*)::text as total_count from workflow_tasks group by status order by status'),
      groupCounts('select task_type as status, count(*)::text as total_count from workflow_tasks group by task_type order by task_type'),
      countSql("select count(*)::text as total_count from workflow_tasks where status in ('queued','open','in_progress','escalated') and (owner_role is not null or assigned_to is not null)"),
      countSql("select count(*)::text as total_count from workflow_tasks where due_at is not null and due_at < now() and status in ('queued','open','in_progress','escalated','failed')"),
      groupCounts('select status, count(*)::text as total_count from error_logs group by status order by status'),
      groupCounts('select severity as status, count(*)::text as total_count from error_logs group by severity order by severity'),
      groupCounts('select status, count(*)::text as total_count from notification_logs group by status order by status'),
      groupCounts('select channel as status, count(*)::text as total_count from notification_logs group by channel order by channel'),
      pool.query<DbRow>(
        `select id, channel, recipient, subject, status, failure_message, metadata_json, created_at
         from notification_logs
         where status = 'failed'
         order by created_at desc
         limit 10`
      ),
      pool.query<DbRow>(
        `select id, task_type, status, priority, owner_role, related_entity_type, related_entity_id, due_at, created_at, metadata_json
         from workflow_tasks
         order by created_at desc
         limit 10`
      ),
      pool.query<DbRow>(
        `select id, workflow_id, workflow_name, event_type, event_status, source_system, related_entity_type, related_entity_id, created_at, payload_json
         from workflow_events
         where lower(source_system) = 'n8n' or lower(coalesce(workflow_id, '')) like '%n8n%' or lower(coalesce(workflow_name, '')) like '%n8n%'
         order by created_at desc
         limit 10`
      ),
      pool.query<DbRow>(
        `select event_type, entity_type, count(*)::text as total_count, max(created_at) as latest_at
         from audit_logs
         where lower(coalesce(metadata_json::text, '')) like '%n8n%'
            or lower(coalesce(metadata_json::text, '')) like '%workflow%'
            or lower(coalesce(entity_type, '')) like '%workflow%'
            or lower(coalesce(event_type, '')) like '%workflow%'
         group by event_type, entity_type
         order by latest_at desc
         limit 10`
      )
    ]);

    res.json({
      data: {
        generated_at: new Date().toISOString(),
        permission_required: 'workflow_console.view',
        read_only: true,
        source_of_truth: 'AIM PostgreSQL metadata and governed AIM APIs only; no n8n-written workflow console snapshot table is used.',
        boundary_notice: 'This AIM-side workflow console is visibility only. It does not execute n8n workflows, retry workflows, call n8n APIs, approve, reject, correct, promote, issue reports, run calculations, mutate evidence, or change admin settings.',
        redaction_notice: 'Workflow console overview redacts token, secret, password, credential, api_key, authorization, bearer, signed URLs, presigned URLs, webhook secrets, private keys, object keys, raw file contents, and raw report contents.',
        sections: {
          workflow_task_summary: {
            workflow_tasks_by_status: workflowTasksByStatus,
            workflow_tasks_by_task_type: workflowTasksByTaskType,
            recent_workflow_tasks: recentWorkflowTasks.rows.map(safeRecentTask),
            link: '/workflow-console'
          },
          pending_human_follow_ups: {
            pending_human_follow_up_total: pendingHumanFollowUps,
            overdue_workflow_tasks: overdueWorkflowTasks,
            note: 'Counts only. Human follow-up still occurs through governed AIM review/work-order/report workflows.'
          },
          notification_delivery_status: {
            notification_logs_by_status: notificationLogsByStatus,
            notification_logs_by_channel: notificationLogsByChannel,
            recent_failed_notifications: recentNotificationFailures.rows.map(safeRecentNotification)
          },
          workflow_failure_error_summary: {
            workflow_errors_by_status: workflowErrorsByStatus,
            workflow_errors_by_severity: workflowErrorsBySeverity,
            note: 'Read-only error visibility only; no retry or workflow execution control is exposed.'
          },
          recent_workflow_events: {
            n8n_related_workflow_events: recentWorkflowEvents.rows.map(safeRecentWorkflowEvent),
            n8n_audit_event_summary: n8nAuditEvents.rows.map((row) => ({
              event_type: row.event_type,
              entity_type: row.entity_type ?? null,
              total_count: Number.parseInt(String(row.total_count ?? '0'), 10),
              latest_at: row.latest_at ?? null
            }))
          },
          n8n_boundary: {
            api_only_orchestration: true,
            direct_postgresql_writes_allowed: false,
            workflow_execution_from_aim_ui_allowed: false,
            credential_or_webhook_secret_editor_available: false,
            note: 'n8n must call AIM backend APIs only and must not write directly to PostgreSQL.'
          },
          not_available: notAvailable('Unsupported workflow console values are omitted rather than invented.')
        },
        traceability_links: SAFE_WORKFLOW_LINKS,
        prohibited_controls: [
          'execute_workflow',
          'retry_workflow',
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
          'create_n8n_workflow',
          'edit_n8n_workflow',
          'edit_webhook_or_credential_secrets'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});
