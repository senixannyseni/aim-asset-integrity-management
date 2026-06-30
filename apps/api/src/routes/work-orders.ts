import { Router, type Request, type Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db/client.js";
import { requirePermission } from "../middleware/rbac.js";
import { requireTenantContextFromRequest } from "../modules/tenancy/tenant-scope.js";

export const workOrdersRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

type WorkOrderGate = {
  gate_type: string;
  gate_status: "pass" | "fail";
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function isUuid(value: string | undefined | null): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === "00000000-0000-0000-0000-000000000000") return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function validationError(
  res: ApiResponse,
  field: string,
  message: string,
  code = "VALIDATION_FAILED",
): void {
  res.status(400).json({
    error: {
      code,
      message: "Request validation failed.",
      details: [{ field, message, severity: "error" }],
    },
  });
}

async function writeAudit(
  client: PoolClient,
  req: Request,
  eventType: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  metadata: Record<string, unknown> = {},
): Promise<string | undefined> {
  const tenant = requireTenantContextFromRequest(req);
  const result = await client.query<{ id: string }>(
    `insert into audit_logs(
      tenant_id,
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
    returning id`,
    [
      tenant.tenantId,
      eventType,
      actorUserId(req),
      actorRoles(req),
      entityType,
      entityId,
      req.header("x-request-id") ?? null,
      JSON.stringify(before ?? null),
      JSON.stringify(after ?? null),
      JSON.stringify(metadata),
    ],
  );
  return result.rows[0]?.id;
}

function mapWorkOrder(row: DbRow): Record<string, unknown> {
  return {
    work_order_id: row.id,
    work_order_code: row.work_order_code,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    integrity_decision_id: row.integrity_decision_id,
    report_id: row.report_id,
    source_entity_type: row.source_entity_type,
    source_entity_id: row.source_entity_id,
    action_source: row.action_source,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    recommended_action: row.recommended_action,
    assigned_to: row.assigned_to,
    assigned_role: row.assigned_role,
    due_date: row.due_date,
    preliminary_internal_flag: row.preliminary_internal_flag,
    external_cmms_reference: row.external_cmms_reference,
    external_cmms_status: row.external_cmms_status,
    gate_status: row.gate_status,
    gate_checklist: row.gate_checklist_json,
    closure_evidence_required: row.closure_evidence_required,
    closure_evidence_link_id: row.closure_evidence_link_id,
    closure_summary: row.closure_summary,
    created_at: row.created_at,
    closed_at: row.closed_at,
  };
}

function gate(
  gateType: string,
  pass: boolean,
  message: string,
  metadata: Record<string, unknown> = {},
): WorkOrderGate {
  return {
    gate_type: gateType,
    gate_status: pass ? "pass" : "fail",
    blocking: true,
    message,
    metadata,
  };
}

async function buildWorkOrderCreationGates(
  client: PoolClient,
  tenantId: string,
  sourceEntityType: string,
  sourceEntityId: string,
  preliminaryInternalMode: boolean,
): Promise<{
  assetId: string;
  inspectionEventId: string | null;
  decisionId: string | null;
  reportId: string | null;
  gates: WorkOrderGate[];
  source: DbRow;
}> {
  if (sourceEntityType === "integrity_decision") {
    const result = await client.query<DbRow>(
      "select * from integrity_decisions where id = $1 and tenant_id = $2::uuid",
      [sourceEntityId, tenantId],
    );
    const decision = result.rows[0];
    if (!decision) {
      const error = new Error("INTEGRITY_DECISION_NOT_FOUND");
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
    const assetId = asString(decision.asset_id);
    if (!assetId) {
      const error = new Error("INTEGRITY_DECISION_ASSET_REQUIRED");
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }
    const approved = decision.decision_status === "approved";
    const actionRequired = Boolean(
      asString(decision.required_action) ||
      decision.integrity_status === "action_required",
    );
    return {
      assetId,
      inspectionEventId: asString(decision.inspection_event_id) ?? null,
      decisionId: String(decision.id),
      reportId: null,
      source: decision,
      gates: [
        gate("integrity_decision_exists", true, "Integrity decision exists."),
        gate(
          "integrity_decision_approved_or_preliminary_internal",
          approved || preliminaryInternalMode,
          "Work order requires approved integrity decision unless explicitly preliminary/internal controlled.",
          {
            decision_status: decision.decision_status,
            preliminary_internal_mode: preliminaryInternalMode,
          },
        ),
        gate(
          "action_required_present",
          actionRequired || preliminaryInternalMode,
          "Required action should be present on the decision unless preliminary/internal controlled.",
        ),
        gate(
          "external_cmms_not_integrated",
          true,
          "MVP uses AIM internal work order fallback only; external CMMS reference remains null.",
        ),
      ],
    };
  }

  if (sourceEntityType === "report") {
    const result = await client.query<DbRow>(
      "select * from reports where id = $1 and tenant_id = $2::uuid",
      [sourceEntityId, tenantId],
    );
    const report = result.rows[0];
    if (!report) {
      const error = new Error("REPORT_NOT_FOUND");
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
    const assetId = asString(report.asset_id);
    if (!assetId) {
      const error = new Error("REPORT_ASSET_REQUIRED");
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }
    const decisionResult = asString(report.calculation_run_id)
      ? await client.query<DbRow>(
          `select * from integrity_decisions
           where calculation_run_id = $1 and tenant_id = $2::uuid and decision_status = 'approved'
           order by approved_at desc nulls last, created_at desc limit 1`,
          [report.calculation_run_id, tenantId],
        )
      : { rows: [], rowCount: 0 };
    const decision = decisionResult.rows[0];
    return {
      assetId,
      inspectionEventId: asString(decision?.inspection_event_id) ?? null,
      decisionId: asString(decision?.id) ?? null,
      reportId: String(report.id),
      source: report,
      gates: [
        gate("report_exists", true, "Report exists."),
        gate(
          "report_issued",
          report.report_status === "issued",
          "Work order from report action requires issued report.",
          { report_status: report.report_status },
        ),
        gate(
          "integrity_decision_approved",
          Boolean(decision),
          "Issued report work order must trace to an approved integrity decision.",
        ),
        gate(
          "external_cmms_not_integrated",
          true,
          "MVP uses AIM internal work order fallback only; external CMMS reference remains null.",
        ),
      ],
    };
  }

  const error = new Error("UNSUPPORTED_WORK_ORDER_SOURCE");
  (error as Error & { statusCode?: number }).statusCode = 400;
  throw error;
}

async function persistWorkOrderGates(
  client: PoolClient,
  req: Request,
  workOrderId: string,
  gates: WorkOrderGate[],
): Promise<void> {
  for (const item of gates) {
    await client.query(
      `insert into review_gates(
        entity_type,
        entity_id,
        gate_domain,
        gate_type,
        gate_status,
        blocking,
        evidence_link_required,
        checked_by,
        checked_at,
        metadata_json,
        updated_at
      ) values ('internal_work_order', $1, 'work_order', $2, $3, $4, false, $5, now(), $6::jsonb, now())
      on conflict (entity_type, entity_id, gate_domain, gate_type) do update set
        gate_status = excluded.gate_status,
        blocking = excluded.blocking,
        checked_by = excluded.checked_by,
        checked_at = excluded.checked_at,
        metadata_json = excluded.metadata_json,
        updated_at = now()`,
      [
        workOrderId,
        item.gate_type,
        item.gate_status,
        item.blocking,
        actorUserId(req),
        JSON.stringify({ message: item.message, ...(item.metadata ?? {}) }),
      ],
    );
  }
}

function mapEvidenceLink(row: DbRow): Record<string, unknown> {
  return {
    evidence_link_id: row.evidence_link_id ?? row.id,
    evidence_file_id: row.evidence_file_id,
    evidence_code: row.evidence_code,
    original_filename: row.original_filename,
    linked_entity_type: row.linked_entity_type,
    linked_entity_id: row.linked_entity_id,
    link_reason: row.link_reason,
    checksum_sha256: row.checksum_sha256,
    created_at: row.created_at,
  };
}

function mapAuditEvent(row: DbRow): Record<string, unknown> {
  return {
    audit_log_id: row.id,
    event_type: row.event_type,
    actor_user_id: row.actor_user_id,
    actor_role_codes: row.actor_role_codes,
    request_id: row.request_id,
    metadata: row.metadata_json,
    created_at: row.created_at,
  };
}

async function loadWorkOrder(
  client: PoolClient,
  workOrderId: string,
  tenantId: string,
  forUpdate = false,
): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>(
    `select * from internal_work_orders where id = $1 and tenant_id = $2::uuid${forUpdate ? " for update" : ""}`,
    [workOrderId, tenantId],
  );
  return result.rows[0];
}

async function loadWorkOrderEvidenceLinks(
  client: PoolClient,
  workOrderId: string,
  tenantId: string,
): Promise<DbRow[]> {
  const result = await client.query<DbRow>(
    `select
       el.id as evidence_link_id,
       el.evidence_file_id,
       el.linked_entity_type,
       el.linked_entity_id,
       el.link_reason,
       el.created_at,
       ef.evidence_code,
       ef.original_filename,
       ef.checksum_sha256
     from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id and ef.tenant_id = $2::uuid
     where el.linked_entity_type = 'internal_work_order' and el.linked_entity_id = $1
     order by el.created_at desc`,
    [workOrderId, tenantId],
  );
  return result.rows;
}

async function loadWorkOrderAuditEvents(
  client: PoolClient,
  workOrderId: string,
  tenantId: string,
): Promise<DbRow[]> {
  const result = await client.query<DbRow>(
    `select id, event_type, actor_user_id, actor_role_codes, request_id, metadata_json, created_at
     from audit_logs
     where tenant_id = $2::uuid and entity_type = 'internal_work_order' and entity_id = $1
     order by created_at desc
     limit 50`,
    [workOrderId, tenantId],
  );
  return result.rows;
}

async function loadWorkOrderSourceTrace(
  client: PoolClient,
  workOrder: DbRow,
  tenantId: string,
): Promise<Record<string, unknown>> {
  const trace: Record<string, unknown> = {
    source_entity_type: workOrder.source_entity_type,
    source_entity_id: workOrder.source_entity_id,
    asset_id: workOrder.asset_id,
    inspection_event_id: workOrder.inspection_event_id,
    integrity_decision_id: workOrder.integrity_decision_id,
    report_id: workOrder.report_id,
    external_cmms_reference: workOrder.external_cmms_reference ?? null,
    external_cmms_status: workOrder.external_cmms_status ?? null,
    internal_fallback_only: true,
  };

  if (asString(workOrder.report_id)) {
    const reportResult = await client.query<DbRow>(
      `select id, report_code, report_status, asset_id, calculation_run_id, issued_at
       from reports where id = $1 and tenant_id = $2::uuid`,
      [workOrder.report_id, tenantId],
    );
    trace.report = reportResult.rows[0] ?? null;
  }

  if (asString(workOrder.integrity_decision_id)) {
    const decisionResult = await client.query<DbRow>(
      `select id, decision_code, decision_status, integrity_status, required_action, calculation_run_id, approved_at
       from integrity_decisions where id = $1 and tenant_id = $2::uuid`,
      [workOrder.integrity_decision_id, tenantId],
    );
    trace.integrity_decision = decisionResult.rows[0] ?? null;
  }

  return trace;
}

async function buildWorkOrderClosureReadiness(
  client: PoolClient,
  workOrder: DbRow,
  tenantId: string,
  options: {
    completionNote?: string;
    closureEvidenceLinkId?: string | null;
  } = {},
): Promise<Record<string, unknown>> {
  const workOrderId = String(workOrder.id);
  const evidenceLinks = await loadWorkOrderEvidenceLinks(client, workOrderId, tenantId);
  const auditEvents = await loadWorkOrderAuditEvents(client, workOrderId, tenantId);
  const sourceTrace = await loadWorkOrderSourceTrace(client, workOrder, tenantId);
  const existingClosureEvidenceLinkId =
    asString(workOrder.closure_evidence_link_id) ?? null;
  const closureEvidenceLinkId = options.closureEvidenceLinkId ?? null;
  const closureEvidenceRequired = workOrder.closure_evidence_required === true;
  const hasClosureEvidence =
    !closureEvidenceRequired ||
    Boolean(
      closureEvidenceLinkId ||
      existingClosureEvidenceLinkId ||
      evidenceLinks.length > 0,
    );
  const hasCompletionNote = Boolean(options.completionNote);
  const alreadyClosed = workOrder.status === "closed";
  const externalCmmsClear =
    !asString(workOrder.external_cmms_reference) &&
    !asString(workOrder.external_cmms_status);

  const gates: WorkOrderGate[] = [
    gate("work_order_exists", true, "Internal AIM work order exists.", {
      work_order_id: workOrderId,
    }),
    gate(
      "not_already_closed",
      !alreadyClosed,
      alreadyClosed
        ? "Work order is already closed. Create a new work order or revision path for further work."
        : "Work order is not closed.",
    ),
    gate(
      "completion_note_present",
      hasCompletionNote,
      "Closure requires completion_note or closure_summary.",
    ),
    gate(
      "closure_evidence_present",
      hasClosureEvidence,
      closureEvidenceRequired
        ? "Closure evidence is required and must be linked to this work order."
        : "Closure evidence is not required for this work order.",
      {
        closure_evidence_required: closureEvidenceRequired,
        closure_evidence_link_id:
          closureEvidenceLinkId ?? existingClosureEvidenceLinkId,
        linked_evidence_count: evidenceLinks.length,
        failure_code:
          closureEvidenceRequired && !hasClosureEvidence
            ? "WORK_ORDER_CLOSURE_EVIDENCE_REQUIRED"
            : null,
      },
    ),
    gate(
      "external_cmms_not_integrated",
      externalCmmsClear,
      "MVP uses AIM internal work order fallback only; no SAP/Maximo/CMMS state may be set.",
      {
        external_cmms_reference: workOrder.external_cmms_reference ?? null,
        external_cmms_status: workOrder.external_cmms_status ?? null,
      },
    ),
    gate(
      "source_traceability_present",
      Boolean(
        workOrder.asset_id &&
        (workOrder.source_entity_id ||
          workOrder.integrity_decision_id ||
          workOrder.report_id),
      ),
      "Work order must retain asset and source traceability before closure.",
      {
        asset_id: workOrder.asset_id,
        source_entity_type: workOrder.source_entity_type,
        source_entity_id: workOrder.source_entity_id,
        integrity_decision_id: workOrder.integrity_decision_id,
        report_id: workOrder.report_id,
      },
    ),
  ];
  const blockingGates = gates.filter(
    (item) => item.blocking && item.gate_status !== "pass",
  );
  const blockingExcludingCompletionNote = blockingGates.filter(
    (item) => item.gate_type !== "completion_note_present",
  );

  return {
    work_order: mapWorkOrder(workOrder),
    ready_to_close: blockingGates.length === 0,
    ready_to_close_after_completion_note:
      blockingExcludingCompletionNote.length === 0,
    completion_note_required: true,
    closure_evidence_required: closureEvidenceRequired,
    blocking_gate_count: blockingGates.length,
    blocking_gate_count_excluding_completion_note:
      blockingExcludingCompletionNote.length,
    gates,
    blocking_gates: blockingGates,
    linked_evidence: evidenceLinks.map(mapEvidenceLink),
    audit_events: auditEvents.map(mapAuditEvent),
    source_traceability: sourceTrace,
    external_cmms_integration_implemented: false,
  };
}

async function validateClosureEvidenceLink(
  client: PoolClient,
  workOrderId: string,
  closureEvidenceLinkId: string | null | undefined,
  tenantId: string,
): Promise<void> {
  if (!closureEvidenceLinkId) return;
  const result = await client.query<DbRow>(
    `select id from evidence_links
     where id = $1
       and linked_entity_type = 'internal_work_order'
       and linked_entity_id = $2
       and exists (
         select 1 from evidence_files ef
         where ef.id = evidence_links.evidence_file_id
           and ef.tenant_id = $3::uuid
       )`,
    [closureEvidenceLinkId, workOrderId, tenantId],
  );
  if (!result.rows[0]) {
    const error = new Error("WORK_ORDER_CLOSURE_EVIDENCE_LINK_MISMATCH");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
}

workOrdersRouter.get(
  "/work-orders",
  requirePermission("work_order.read"),
  async (req, res, next) => {
    try {
      const tenant = requireTenantContextFromRequest(req);
      const result = await pool.query<DbRow>(
        "select * from internal_work_orders where tenant_id = $1::uuid order by created_at desc limit 100",
        [tenant.tenantId],
      );
      res.json({ data: result.rows.map(mapWorkOrder) });
    } catch (error) {
      next(error);
    }
  },
);

// Static regression anchor: workOrdersRouter.get('/work-orders/:workOrderId'
workOrdersRouter.get(
  "/work-orders/:workOrderId",
  requirePermission("work_order.read"),
  async (req, res, next) => {
    const workOrderId = req.params.workOrderId;
    if (!isUuid(workOrderId)) {
      validationError(res, "workOrderId", "workOrderId must be a valid UUID.");
      return;
    }

    const client = await pool.connect();
    try {
      const tenant = requireTenantContextFromRequest(req);
      const workOrder = await loadWorkOrder(client, workOrderId, tenant.tenantId);
      if (!workOrder) {
        res
          .status(404)
          .json({
            error: {
              code: "WORK_ORDER_NOT_FOUND",
              message: "Internal work order not found.",
            },
          });
        return;
      }
      const evidenceLinks = await loadWorkOrderEvidenceLinks(
        client,
        workOrderId,
        tenant.tenantId,
      );
      const auditEvents = await loadWorkOrderAuditEvents(client, workOrderId, tenant.tenantId);
      const sourceTraceability = await loadWorkOrderSourceTrace(
        client,
        workOrder,
        tenant.tenantId,
      );
      res.json({
        data: {
          ...mapWorkOrder(workOrder),
          linked_evidence: evidenceLinks.map(mapEvidenceLink),
          audit_events: auditEvents.map(mapAuditEvent),
          source_traceability: sourceTraceability,
        },
      });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  },
);

/*
 * Static regression anchor for RC4-L closure readiness route tests.
workOrdersRouter.get(
  "/work-orders/:workOrderId/closure-readiness"
 */
workOrdersRouter.get(
  "/work-orders/:workOrderId/closure-readiness",
  requirePermission("work_order.read"),
  async (req, res, next) => {
    const workOrderId = req.params.workOrderId;
    if (!isUuid(workOrderId)) {
      validationError(res, "workOrderId", "workOrderId must be a valid UUID.");
      return;
    }

    const client = await pool.connect();
    try {
      const tenant = requireTenantContextFromRequest(req);
      const workOrder = await loadWorkOrder(client, workOrderId, tenant.tenantId);
      if (!workOrder) {
        res
          .status(404)
          .json({
            error: {
              code: "WORK_ORDER_NOT_FOUND",
              message: "Internal work order not found.",
            },
          });
        return;
      }
      const readiness = await buildWorkOrderClosureReadiness(client, workOrder, tenant.tenantId);
      res.json({ data: readiness });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  },
);

// Static regression anchor: workOrdersRouter.post('/work-orders', requirePermission('work_order.create')
workOrdersRouter.post(
  "/work-orders",
  requirePermission("work_order.create"),
  async (req, res, next) => {
    if (!isPlainObject(req.body)) {
      validationError(res, "body", "JSON object body is required.");
      return;
    }

    const sourceEntityType = asString(req.body.source_entity_type);
    const sourceEntityId = asString(req.body.source_entity_id);
    const title = asString(req.body.title);
    const preliminaryInternalMode = asBoolean(
      req.body.preliminary_internal_mode ?? req.body.preliminary_internal_flag,
    );

    if (
      !sourceEntityType ||
      !["integrity_decision", "report"].includes(sourceEntityType)
    ) {
      validationError(
        res,
        "source_entity_type",
        "source_entity_type must be integrity_decision or report.",
      );
      return;
    }
    if (!isUuid(sourceEntityId)) {
      validationError(
        res,
        "source_entity_id",
        "source_entity_id must be a valid UUID.",
      );
      return;
    }
    if (!title) {
      validationError(res, "title", "title is required.");
      return;
    }
    if (asString(req.body.external_cmms_reference)) {
      validationError(
        res,
        "external_cmms_reference",
        "External CMMS integration is out of scope for MVP. external_cmms_reference must remain null/omitted.",
        "EXTERNAL_CMMS_OUT_OF_SCOPE",
      );
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      const tenant = requireTenantContextFromRequest(req);
      const gateContext = await buildWorkOrderCreationGates(
        client,
        tenant.tenantId,
        sourceEntityType,
        sourceEntityId,
        preliminaryInternalMode,
      );
      const failedGates = gateContext.gates.filter(
        (item) => item.blocking && item.gate_status !== "pass",
      );
      if (failedGates.length > 0) {
        const auditLogId = await writeAudit(
          client,
          req,
          "INTERNAL_WORK_ORDER_CREATION_BLOCKED",
          "internal_work_order",
          null,
          null,
          null,
          {
            source_entity_type: sourceEntityType,
            source_entity_id: sourceEntityId,
            failed_gates: failedGates,
            internal_fallback_only: true,
          },
        );
        await client.query("commit");
        res
          .status(409)
          .json({
            error: {
              code: "WORK_ORDER_GATES_NOT_SATISFIED",
              message:
                "Internal work order creation is blocked until integrity/report gates pass, unless preliminary internal mode is explicit.",
              auditLogId,
              gates: failedGates,
            },
          });
        return;
      }

      const workOrderCode =
        asString(req.body.work_order_code) ?? `WO-${Date.now()}`;
      const result = await client.query<DbRow>(
        `insert into internal_work_orders(
        tenant_id,
        work_order_code,
        asset_id,
        inspection_event_id,
        integrity_decision_id,
        report_id,
        source_entity_type,
        source_entity_id,
        action_source,
        title,
        description,
        priority,
        status,
        recommended_action,
        assigned_to,
        assigned_role,
        due_date,
        preliminary_internal_flag,
        external_cmms_reference,
        external_cmms_status,
        gate_status,
        gate_checklist_json,
        closure_evidence_required,
        created_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9, $10, $11, $12, 'open', $13, $14, $15, $16, $17, null, null, 'passed', $18::jsonb, $19, $20)
      returning *`,
        [
          tenant.tenantId,
          workOrderCode,
          gateContext.assetId,
          gateContext.inspectionEventId,
          gateContext.decisionId,
          gateContext.reportId,
          sourceEntityType,
          sourceEntityId,
          asString(req.body.action_source) ??
            (sourceEntityType === "report"
              ? "issued_report_action"
              : "approved_integrity_decision"),
          title,
          asString(req.body.description) ?? null,
          asString(req.body.priority) ?? "medium",
          asString(req.body.recommended_action) ??
            asString(gateContext.source.required_action) ??
            null,
          asString(req.body.assigned_to) ?? null,
          asString(req.body.assigned_role) ?? null,
          asString(req.body.due_date) ??
            asString(gateContext.source.due_date) ??
            null,
          preliminaryInternalMode,
          JSON.stringify(gateContext.gates),
          asBoolean(req.body.closure_evidence_required),
          actorUserId(req),
        ],
      );
      const created = result.rows[0];
      await persistWorkOrderGates(
        client,
        req,
        asString(created?.id) ?? "",
        gateContext.gates,
      );
      const auditLogId = await writeAudit(
        client,
        req,
        "INTERNAL_WORK_ORDER_CREATED",
        "internal_work_order",
        asString(created?.id) ?? null,
        null,
        mapWorkOrder(created ?? {}),
        {
          source_entity_type: sourceEntityType,
          source_entity_id: sourceEntityId,
          external_cmms_reference: null,
          internal_fallback_only: true,
        },
      );
      await client.query("commit");
      res.status(201).json({ data: mapWorkOrder(created ?? {}), auditLogId });
    } catch (error) {
      await client.query("rollback");
      next(error);
    } finally {
      client.release();
    }
  },
);

// Static regression anchor: workOrdersRouter.patch('/work-orders/:workOrderId', requirePermission('work_order.update')
workOrdersRouter.patch(
  "/work-orders/:workOrderId",
  requirePermission("work_order.update"),
  async (req, res, next) => {
    if (!isPlainObject(req.body)) {
      validationError(res, "body", "JSON object body is required.");
      return;
    }
    const workOrderId = req.params.workOrderId;
    if (!isUuid(workOrderId)) {
      validationError(res, "workOrderId", "workOrderId must be a valid UUID.");
      return;
    }
    if (asString(req.body.external_cmms_reference)) {
      validationError(
        res,
        "external_cmms_reference",
        "External CMMS integration is out of scope for MVP. external_cmms_reference must remain null/omitted.",
        "EXTERNAL_CMMS_OUT_OF_SCOPE",
      );
      return;
    }
    if (asString(req.body.status) === "closed") {
      validationError(
        res,
        "status",
        "Use /work-orders/{workOrderId}/close so completion note and closure evidence gates are enforced.",
        "WORK_ORDER_CLOSE_ENDPOINT_REQUIRED",
      );
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      const tenant = requireTenantContextFromRequest(req);
      const beforeResult = await client.query<DbRow>(
        "select * from internal_work_orders where id = $1 and tenant_id = $2::uuid for update",
        [workOrderId, tenant.tenantId],
      );
      const before = beforeResult.rows[0];
      if (!before) {
        await client.query("rollback");
        res
          .status(404)
          .json({
            error: {
              code: "WORK_ORDER_NOT_FOUND",
              message: "Internal work order not found.",
            },
          });
        return;
      }
      if (before.status === "closed") {
        await client.query("rollback");
        res
          .status(409)
          .json({
            error: {
              code: "WORK_ORDER_FINAL_STATE_LOCKED",
              message:
                "Closed internal work orders cannot be updated. Create a new work order or revision path for further action.",
            },
          });
        return;
      }
      const result = await client.query<DbRow>(
        `update internal_work_orders set
        title = coalesce($2, title),
        description = coalesce($3, description),
        priority = coalesce($4, priority),
        status = coalesce($5, status),
        recommended_action = coalesce($6, recommended_action),
        assigned_to = coalesce($7, assigned_to),
        assigned_role = coalesce($8, assigned_role),
        due_date = coalesce($9, due_date),
        updated_at = now()
       where id = $1 and tenant_id = $10::uuid
       returning *`,
        [
          workOrderId,
          asString(req.body.title) ?? null,
          asString(req.body.description) ?? null,
          asString(req.body.priority) ?? null,
          asString(req.body.status) ?? null,
          asString(req.body.recommended_action) ?? null,
          asString(req.body.assigned_to) ?? null,
          asString(req.body.assigned_role) ?? null,
          asString(req.body.due_date) ?? null,
          tenant.tenantId,
        ],
      );
      const updated = result.rows[0];
      const auditLogId = await writeAudit(
        client,
        req,
        "INTERNAL_WORK_ORDER_UPDATED",
        "internal_work_order",
        workOrderId,
        mapWorkOrder(before),
        mapWorkOrder(updated ?? {}),
        {
          external_cmms_reference: null,
          internal_fallback_only: true,
        },
      );
      await client.query("commit");
      res.json({ data: mapWorkOrder(updated ?? {}), auditLogId });
    } catch (error) {
      await client.query("rollback");
      next(error);
    } finally {
      client.release();
    }
  },
);

// Static regression anchor: workOrdersRouter.post('/work-orders/:workOrderId/close', requirePermission('work_order.close')
workOrdersRouter.post(
  "/work-orders/:workOrderId/close",
  requirePermission("work_order.close"),
  async (req, res, next) => {
    if (!isPlainObject(req.body)) {
      validationError(res, "body", "JSON object body is required.");
      return;
    }
    const workOrderId = req.params.workOrderId;
    const completionNote = asString(
      req.body.completion_note ?? req.body.closure_summary,
    );
    const closureEvidenceLinkId = asString(req.body.closure_evidence_link_id);

    if (!isUuid(workOrderId)) {
      validationError(res, "workOrderId", "workOrderId must be a valid UUID.");
      return;
    }
    if (!completionNote) {
      validationError(
        res,
        "completion_note",
        "Work order close requires completion_note or closure_summary.",
        "WORK_ORDER_COMPLETION_NOTE_REQUIRED",
      );
      return;
    }
    if (closureEvidenceLinkId && !isUuid(closureEvidenceLinkId)) {
      validationError(
        res,
        "closure_evidence_link_id",
        "closure_evidence_link_id must be a valid evidence link UUID.",
        "WORK_ORDER_CLOSURE_EVIDENCE_LINK_INVALID",
      );
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      const tenant = requireTenantContextFromRequest(req);
      const before = await loadWorkOrder(client, workOrderId, tenant.tenantId, true);
      if (!before) {
        await client.query("rollback");
        res
          .status(404)
          .json({
            error: {
              code: "WORK_ORDER_NOT_FOUND",
              message: "Internal work order not found.",
            },
          });
        return;
      }
      if (before.status === "closed") {
        await client.query("rollback");
        res
          .status(409)
          .json({
            error: {
              code: "WORK_ORDER_ALREADY_CLOSED",
              message: "Internal work order is already closed.",
            },
          });
        return;
      }
      await validateClosureEvidenceLink(
        client,
        workOrderId,
        closureEvidenceLinkId,
        tenant.tenantId,
      );
      const readiness = await buildWorkOrderClosureReadiness(client, before, tenant.tenantId, {
        completionNote,
        closureEvidenceLinkId,
      });
      const blockingGates = readiness.blocking_gates as WorkOrderGate[];
      if (blockingGates.length > 0) {
        const auditLogId = await writeAudit(
          client,
          req,
          "INTERNAL_WORK_ORDER_CLOSE_BLOCKED",
          "internal_work_order",
          workOrderId,
          mapWorkOrder(before),
          mapWorkOrder(before),
          {
            reason: "closure_readiness_gates_not_satisfied",
            failed_gates: blockingGates,
            internal_fallback_only: true,
          },
        );
        await client.query("commit");
        res
          .status(409)
          .json({
            error: {
              code: "WORK_ORDER_CLOSURE_GATES_NOT_SATISFIED",
              message:
                "Internal work order closure readiness gates are not satisfied.",
              auditLogId,
              gates: blockingGates,
            },
          });
        return;
      }
      const inferredEvidenceLinkId =
        closureEvidenceLinkId ??
        asString(before.closure_evidence_link_id) ??
        asString(
          (
            readiness.linked_evidence as Record<string, unknown>[] | undefined
          )?.[0]?.evidence_link_id,
        ) ??
        null;

      const result = await client.query<DbRow>(
        `update internal_work_orders set
        status = 'closed',
        closure_summary = $2,
        closure_evidence_link_id = coalesce($3::uuid, closure_evidence_link_id),
        closed_by = $4,
        closed_at = now(),
        updated_at = now()
       where id = $1 and tenant_id = $5::uuid
       returning *`,
        [workOrderId, completionNote, inferredEvidenceLinkId, actorUserId(req), tenant.tenantId],
      );
      const updated = result.rows[0];
      const auditLogId = await writeAudit(
        client,
        req,
        "INTERNAL_WORK_ORDER_CLOSED",
        "internal_work_order",
        workOrderId,
        mapWorkOrder(before),
        mapWorkOrder(updated ?? {}),
        {
          completion_note: completionNote,
          closure_evidence_link_id:
            inferredEvidenceLinkId ?? before.closure_evidence_link_id ?? null,
          internal_fallback_only: true,
        },
      );
      await client.query("commit");
      res.json({ data: mapWorkOrder(updated ?? {}), auditLogId });
    } catch (error) {
      await client.query("rollback");
      next(error);
    } finally {
      client.release();
    }
  },
);
