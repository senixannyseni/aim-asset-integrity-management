import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const ndtDataRoomRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;
type CountRow = { total_count: string };
type GroupCountRow = { status: string | null; total_count: string };

const SERVICE_NDT_DATA_ROOM_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

const SENSITIVE_METADATA_PATTERN = /(token|secret|password|credential|api[_-]?key|authorization|bearer|signed[_-]?url|presigned|private[_-]?key|object[_-]?key|raw[_-]?file|raw[_-]?report|ocr[_-]?full[_-]?text|download[_-]?url|object[_-]?storage[_-]?path)/i;

const SAFE_NDT_LINKS = [
  { label: 'NDT Workspace', href: '/ndt', entity_type: 'ndt_measurement' },
  { label: 'Evidence Repository', href: '/evidence', entity_type: 'evidence_file' },
  { label: 'AI Review Workspace', href: '/reviews', entity_type: 'ai_extraction_review' },
  { label: 'Audit Logs', href: '/audit-logs', entity_type: 'audit_log' },
  { label: 'Reports', href: '/reports', entity_type: 'report' }
];

function isServiceNdtDataRoomActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';

  return (
    roles.some((role) => SERVICE_NDT_DATA_ROOM_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanNdtDataRoomViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceNdtDataRoomActor(req)) {
    res.status(403).json({
      error: {
        code: 'NDT_DATA_ROOM_SERVICE_ACTOR_BLOCKED',
        message: 'Service, AI, n8n, workflow, and integration-style actors cannot access broad NDT data room visibility.'
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

function safeMeasurement(row: DbRow): Record<string, unknown> {
  return {
    measurement_id: row.id,
    measurement_code: row.measurement_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id ?? null,
    component: row.component,
    method: row.method,
    cml_tml_id: row.cml_tml_id ?? null,
    grid_ref: row.grid_ref ?? null,
    shell_course_no: row.shell_course_no ?? null,
    measured_thickness_mm: row.measured_thickness_mm,
    reading_date: row.reading_date,
    reviewer_status: row.reviewer_status,
    validation_status: row.validation_status,
    is_critical: row.is_critical,
    evidence_linked: Boolean(row.evidence_file_id) || Number.parseInt(String(row.evidence_link_count ?? '0'), 10) > 0,
    evidence_file_id: row.evidence_file_id ?? null,
    evidence_code: row.evidence_code ?? null,
    evidence_status: row.evidence_status ?? null,
    metadata: safeMetadata(row.metadata_json)
  };
}

ndtDataRoomRouter.get('/ndt-data-room/overview', requirePermission('ndt_data_room.view'), async (req, res, next) => {
  try {
    if (!enforceHumanNdtDataRoomViewer(req, res)) return;

    const [
      measurementsTotal,
      measurementsByMethod,
      measurementsByComponent,
      measurementsByReviewerStatus,
      measurementsByValidationStatus,
      linkedDirectEvidenceTotal,
      linkedNormalizedEvidenceTotal,
      missingEvidenceLinkageTotal,
      linkedInspectionTotal,
      latestMeasurementDate,
      cmlCoverageTotal,
      tmlCoverageTotal,
      gridCoverageTotal,
      criticalMeasurementsTotal,
      blockedOrWarningMeasurementsTotal,
      pendingReviewTotal,
      rejectedTotal,
      latestMeasurements,
      evidenceLinkAuditSummary
    ] = await Promise.all([
      countSql('select count(*)::text as total_count from ndt_measurements'),
      groupCounts('select method as status, count(*)::text as total_count from ndt_measurements group by method order by method'),
      groupCounts('select component as status, count(*)::text as total_count from ndt_measurements group by component order by component'),
      groupCounts('select reviewer_status as status, count(*)::text as total_count from ndt_measurements group by reviewer_status order by reviewer_status'),
      groupCounts('select validation_status as status, count(*)::text as total_count from ndt_measurements group by validation_status order by validation_status'),
      countSql('select count(*)::text as total_count from ndt_measurements where evidence_file_id is not null'),
      countSql("select count(distinct linked_entity_id)::text as total_count from evidence_links where linked_entity_type = 'ndt_measurement'"),
      countSql(
        `select count(*)::text as total_count
         from ndt_measurements nm
         where nm.evidence_file_id is null
           and not exists (
             select 1 from evidence_links el
             where el.linked_entity_type = 'ndt_measurement' and el.linked_entity_id = nm.id
           )`
      ),
      countSql('select count(*)::text as total_count from ndt_measurements where inspection_event_id is not null'),
      pool.query<{ latest_measurement_date: string | null }>('select max(reading_date)::text as latest_measurement_date from ndt_measurements'),
      countSql("select count(*)::text as total_count from ndt_measurements where cml_tml_id is not null and upper(cml_tml_id) like 'CML%'"),
      countSql("select count(*)::text as total_count from ndt_measurements where cml_tml_id is not null and upper(cml_tml_id) like 'TML%'"),
      countSql('select count(*)::text as total_count from ndt_measurements where grid_ref is not null'),
      countSql('select count(*)::text as total_count from ndt_measurements where is_critical = true'),
      countSql("select count(*)::text as total_count from ndt_measurements where validation_status in ('warning','blocked')"),
      countSql("select count(*)::text as total_count from ndt_measurements where reviewer_status in ('needs_review','rejected') or validation_status in ('warning','blocked')"),
      countSql("select count(*)::text as total_count from ndt_measurements where reviewer_status = 'rejected'"),
      pool.query<DbRow>(
        `select nm.id, nm.measurement_code, nm.asset_id, nm.inspection_event_id, nm.component, nm.method,
                nm.cml_tml_id, nm.grid_ref, nm.shell_course_no, nm.measured_thickness_mm, nm.reading_date,
                nm.reviewer_status, nm.validation_status, nm.is_critical, nm.evidence_file_id,
                ef.evidence_code, coalesce(ef.upload_status, ef.status, ef.evidence_status, 'metadata_only') as evidence_status,
                count(el.id)::text as evidence_link_count,
                '{}'::jsonb as metadata_json
         from ndt_measurements nm
         left join evidence_files ef on ef.id = nm.evidence_file_id
         left join evidence_links el on el.linked_entity_type = 'ndt_measurement' and el.linked_entity_id = nm.id
         group by nm.id, ef.evidence_code, coalesce(ef.upload_status, ef.status, ef.evidence_status, 'metadata_only')
         order by nm.reading_date desc, nm.created_at desc
         limit 10`
      ),
      pool.query<DbRow>(
        `select event_type, entity_type, count(*)::text as total_count, max(created_at) as latest_at
         from audit_logs
         where entity_type in ('ndt_measurement', 'evidence_link', 'evidence_file')
            or lower(coalesce(event_type, '')) like '%ndt%'
            or lower(coalesce(metadata_json::text, '')) like '%ndt%'
         group by event_type, entity_type
         order by latest_at desc
         limit 10`
      )
    ]);

    res.json({
      data: {
        generated_at: new Date().toISOString(),
        permission_required: 'ndt_data_room.view',
        read_only: true,
        source_of_truth: 'AIM PostgreSQL NDT measurement metadata, evidence linkage metadata, inspection references, and governed AIM APIs only; no n8n-written NDT data room snapshot table is used.',
        boundary_notice: 'NDT data room visibility is read-only. It does not approve, reject, correct, promote, calculate, run FFS, run RBI, issue reports, mutate evidence, call n8n, or change admin settings.',
        no_calculation_notice: 'This endpoint does not calculate corrosion rate, remaining life, FFS, RBI, MAWP, retirement thickness, inspection interval, API 579, or API 581 outputs. Existing measurement values are displayed as stored records only.',
        redaction_notice: 'NDT data room responses avoid secrets, signed URLs, tokens, credentials, object-storage credentials, private keys, object keys, raw evidence/report contents, OCR full text, and unrestricted evidence download URLs.',
        sections: {
          ndt_method_summary: {
            measurements_total: measurementsTotal,
            measurements_by_method: measurementsByMethod,
            latest_measurement_date: latestMeasurementDate.rows[0]?.latest_measurement_date ?? null,
            link: '/ndt'
          },
          component_coverage_summary: {
            measurements_by_component: measurementsByComponent,
            critical_measurements_total: criticalMeasurementsTotal,
            inspection_linked_measurements_total: linkedInspectionTotal,
            link: '/ndt'
          },
          cml_tml_grid_coverage_summary: {
            cml_reference_count: cmlCoverageTotal,
            tml_reference_count: tmlCoverageTotal,
            grid_reference_count: gridCoverageTotal,
            note: 'Coverage counts are based on stored CML/TML/Grid references only; missing references are not invented.'
          },
          evidence_linkage_status: {
            direct_evidence_linked_measurements: linkedDirectEvidenceTotal,
            normalized_evidence_linked_measurements: linkedNormalizedEvidenceTotal,
            measurements_missing_evidence: missingEvidenceLinkageTotal,
            link: '/evidence'
          },
          measurement_readiness: {
            reviewer_status_counts: measurementsByReviewerStatus,
            validation_status_counts: measurementsByValidationStatus,
            pending_review_or_blocked_measurements: pendingReviewTotal,
            rejected_measurements: rejectedTotal,
            warning_or_blocked_measurements: blockedOrWarningMeasurementsTotal
          },
          latest_measurements: {
            latest_measurements: latestMeasurements.rows.map(safeMeasurement),
            note: 'Stored measurements only; no engineering formula or final decision is computed here.'
          },
          governance_warnings: {
            missing_evidence_linkage: missingEvidenceLinkageTotal,
            warning_or_blocked_measurements: blockedOrWarningMeasurementsTotal,
            audit_summary: evidenceLinkAuditSummary.rows.map((row) => ({
              event_type: row.event_type,
              entity_type: row.entity_type ?? null,
              total_count: Number.parseInt(String(row.total_count ?? '0'), 10),
              latest_at: row.latest_at ?? null
            })),
            link: '/audit-logs'
          },
          not_available: notAvailable('Unsupported NDT data room values are omitted rather than invented. No API 579/API 581/FFS/RBI calculation is performed.')
        },
        traceability_links: SAFE_NDT_LINKS,
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
          'execute_n8n_workflow',
          'upload_or_change_ndt_data'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});
