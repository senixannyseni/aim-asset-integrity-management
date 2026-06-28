"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api-client";

type CalculationReadinessGate = {
  gate_type?: string;
  gate_status?: string;
  blocking?: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
};
type CalculationRunReadiness = {
  calculation_run_id?: string;
  ready_for_final_use?: boolean;
  ready_for_downstream_decision?: boolean;
  gate_summary?: Record<string, unknown>;
  readiness_gates?: CalculationReadinessGate[];
  formula_traceability?: Record<string, unknown>;
  input_output_traceability?: Record<string, unknown>;
  linked_evidence?: Array<Record<string, unknown>>;
  linked_context?: {
    engineering_reviews?: Array<Record<string, unknown>>;
    approval_records?: Array<Record<string, unknown>>;
    downstream_integrity_decisions?: Array<Record<string, unknown>>;
    downstream_reports?: Array<Record<string, unknown>>;
    downstream_work_orders?: Array<Record<string, unknown>>;
  };
  audit_events?: Array<Record<string, unknown>>;
  governance_notes?: string[];
};

type CalculationRunDetail = {
  calculation_run_id: string;
  run_id?: string | null;
  asset_id?: string | null;
  inspection_event_id?: string | null;
  formula_version_id?: string | null;
  formula_registry_id?: string | null;
  formula_set_version?: string | null;
  formula_version_snapshot?: Record<string, unknown> | null;
  input_snapshot_hash?: string | null;
  output_snapshot_hash?: string | null;
  input_snapshot_json?: Record<string, unknown> | null;
  output_snapshot?: Record<string, unknown> | null;
  output_snapshot_json?: Record<string, unknown> | null;
  output_summary?: Record<string, unknown> | null;
  validation_status?: string | null;
  run_status?: string | null;
  status?: string | null;
  review_status?: string | null;
  final_use_status?: string | null;
  final_use_disclaimer?: string | null;
  final_use_blockers?: unknown;
  warnings_json?: unknown;
  created_by?: string | null;
  created_at?: string | null;
  inputs?: Array<Record<string, unknown>>;
  outputs?: Array<Record<string, unknown>>;
  engineering_reviews?: Array<Record<string, unknown>>;
  approval_records?: Array<Record<string, unknown>>;
  linked_evidence?: Array<Record<string, unknown>>;
  linked_context?: CalculationRunReadiness["linked_context"];
  formula_traceability?: Record<string, unknown>;
  readiness?: CalculationRunReadiness;
  audit_trail?: Array<Record<string, unknown>>;
};

type CalculationRunSummary = {
  calculation_run_id: string;
  run_id?: string | null;
  asset_id?: string | null;
  formula_set_version?: string | null;
  formula_version_id?: string | null;
  output_summary?: Record<string, unknown> | null;
  output_snapshot?: Record<string, unknown> | null;
  validation_status?: string | null;
  run_status?: string | null;
  created_at?: string | null;
};

type DifferenceRow = { field: string; current: string; previous: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function safeDate(value?: string | null): string {
  return value ? value.slice(0, 19).replace("T", " ") : "-";
}
function badgeClass(status?: string | null): string {
  const value = String(status ?? "").toLowerCase();
  if (
    ["blocked", "failed", "rejected", "retired", "draft"].some((token) =>
      value.includes(token),
    )
  )
    return "badge badge-danger";
  if (
    ["warning", "pending", "review", "requires"].some((token) =>
      value.includes(token),
    )
  )
    return "badge badge-warning";
  return "badge";
}
function valueAsText(value: unknown): string {
  return typeof value === "string" ? value : renderJson(value);
}
function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (!isRecord(value)) return prefix ? { [prefix]: valueAsText(value) } : {};
  return Object.entries(value).reduce<Record<string, string>>(
    (acc, [key, child]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      if (isRecord(child)) return { ...acc, ...flatten(child, next) };
      if (Array.isArray(child)) return { ...acc, [next]: renderJson(child) };
      acc[next] = valueAsText(child);
      return acc;
    },
    {},
  );
}
function diffObjects(current: unknown, previous: unknown): DifferenceRow[] {
  const left = flatten(current);
  const right = flatten(previous);
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)]))
    .sort()
    .filter((key) => left[key] !== right[key])
    .slice(0, 40)
    .map((key) => ({
      field: key,
      current: left[key] ?? "-",
      previous: right[key] ?? "-",
    }));
}
function asRecordFrom(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
function formulaValue(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = snapshot?.[key];
  return value === undefined || value === null ? "-" : String(value);
}
function auditEventLabel(event: Record<string, unknown>): string {
  return String(event.event_type ?? event.action_type ?? "audit.event");
}
function auditEventTime(event: Record<string, unknown>): string {
  return safeDate(String(event.created_at ?? event.timestamp ?? ""));
}
function auditEventActor(event: Record<string, unknown>): string {
  const roles = Array.isArray(event.actor_role_codes)
    ? event.actor_role_codes.join(", ")
    : String(event.actor_role_codes ?? "");
  return roles || String(event.actor_user_id ?? "system");
}

export default function CalculationDetailClient({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<CalculationRunDetail | null>(null);
  const [runs, setRuns] = useState<CalculationRunSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<CalculationRunReadiness | null>(
    null,
  );
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      setMessage(null);
      const response = await apiFetch(
        `/api/v1/engineering/calculations/${runId}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (response.status === 401 || response.status === 403) {
        setPermissionDenied(true);
        return;
      }
      if (!response.ok) {
        setMessage(
          payload?.error?.message ?? "Failed to load calculation detail.",
        );
        return;
      }
      const data = payload.data as CalculationRunDetail;
      setDetail(data);
      setReadiness(data.readiness ?? null);
      const readinessResponse = await apiFetch(
        `/api/v1/engineering/calculations/${runId}/readiness`,
        { cache: "no-store" },
      );
      if (readinessResponse.ok) {
        const readinessPayload = await readinessResponse.json();
        setReadiness(readinessPayload.data as CalculationRunReadiness);
      }
      if (data.asset_id) {
        const runResponse = await apiFetch(
          `/api/v1/engineering/calculations?asset_id=${encodeURIComponent(data.asset_id)}`,
          { cache: "no-store" },
        );
        const runPayload = await runResponse.json();
        if (runResponse.ok)
          setRuns(asArray<CalculationRunSummary>(runPayload.data));
      }
    }
    void loadDetail();
  }, [runId]);

  const formulaSnapshot = asRecordFrom(detail?.formula_version_snapshot);
  const outputSnapshot =
    detail?.output_snapshot_json ?? detail?.output_snapshot ?? null;
  const previousRun = useMemo(() => {
    if (!detail) return undefined;
    return runs
      .filter((run) => run.calculation_run_id !== detail.calculation_run_id)
      .filter(
        (run) =>
          !detail.formula_set_version ||
          run.formula_set_version === detail.formula_set_version ||
          run.asset_id === detail.asset_id,
      )
      .sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      )[0];
  }, [detail, runs]);
  const outputDiff = useMemo(
    () =>
      previousRun
        ? diffObjects(
            outputSnapshot,
            previousRun.output_snapshot ?? previousRun.output_summary ?? {},
          )
        : [],
    [outputSnapshot, previousRun],
  );
  const formulaDiff = useMemo(
    () =>
      previousRun
        ? diffObjects(detail?.formula_version_snapshot, {
            formula_version_id: previousRun.formula_version_id,
            formula_set_version: previousRun.formula_set_version,
          })
        : [],
    [detail?.formula_version_snapshot, previousRun],
  );

  if (permissionDenied)
    return (
      <main className="app-shell">
        <section className="error-list">
          <h2>Permission denied</h2>
          <p>You do not have permission to read calculation detail.</p>
        </section>
      </main>
    );

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            RC4-O calculation run detail and formula traceability readiness
          </p>
          <h1>Calculation Run Detail and Formula Traceability Readiness</h1>
          <p>
            Traceable formula version, input/output snapshots, evidence, review,
            approval, downstream decisions, and readiness gates. AI/n8n/service
            actors cannot approve calculation final use.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">
            Calculations
          </Link>
          {detail?.asset_id && (
            <Link
              className="secondary-button"
              href={`/assets/${detail.asset_id}`}
            >
              Asset
            </Link>
          )}
          {detail?.asset_id && (
            <Link
              className="secondary-button"
              href={`/assets/${detail.asset_id}/calculations`}
            >
              Asset Calculations
            </Link>
          )}
          <Link
            className="secondary-button"
            href={`/audit-logs?entity_type=calculation_run&entity_id=${encodeURIComponent(runId)}`}
          >
            Audit Logs
          </Link>
          <Link
            className="secondary-button"
            href={`/findings?calculation_run_id=${encodeURIComponent(runId)}`}
          >
            Findings
          </Link>
        </div>
      </header>

      {message && (
        <section className="error-list">
          <h2>Calculation detail unavailable</h2>
          <p>{message}</p>
        </section>
      )}
      {!detail && !message ? (
        <section className="notice">
          <h2>Loading calculation audit trail</h2>
          <p>
            Loading formula, inputs, outputs, warnings, blockers, reviews, and
            audit events.
          </p>
        </section>
      ) : null}
      {detail && (
        <>
          <section className="grid-two">
            <section className="panel">
              <div className="panel-heading">
                <h2>Formula Traceability Readiness</h2>
                <p>
                  Read-only RC4-O preview; this panel does not approve, lock, or
                  mutate calculation runs.
                </p>
              </div>
              <dl className="metadata-grid">
                <dt>Final-use ready</dt>
                <dd>
                  <span
                    className={badgeClass(
                      readiness?.ready_for_final_use
                        ? "approved"
                        : "requires_review",
                    )}
                  >
                    {readiness?.ready_for_final_use ? "ready" : "not ready"}
                  </span>
                </dd>
                <dt>Decision-ready</dt>
                <dd>
                  <span
                    className={badgeClass(
                      readiness?.ready_for_downstream_decision
                        ? "approved"
                        : "requires_review",
                    )}
                  >
                    {readiness?.ready_for_downstream_decision
                      ? "ready"
                      : "not ready"}
                  </span>
                </dd>
                <dt>Passed gates</dt>
                <dd>
                  {String(readiness?.gate_summary?.passed_gates ?? "-")} /{" "}
                  {String(readiness?.gate_summary?.total_gates ?? "-")}
                </dd>
                <dt>Blocking failures</dt>
                <dd>
                  {String(readiness?.gate_summary?.blocking_failures ?? "-")}
                </dd>
                <dt>Linked evidence</dt>
                <dd>
                  {readiness?.linked_evidence?.length ??
                    detail.linked_evidence?.length ??
                    0}
                </dd>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Formula and Snapshot Hashes</h2>
                <p>
                  Formula traceability is from persisted calculation metadata,
                  not recalculated in the UI.
                </p>
              </div>
              <dl className="metadata-grid">
                <dt>Formula version</dt>
                <dd>
                  {String(
                    readiness?.formula_traceability?.formula_version_id ??
                      detail.formula_version_id ??
                      "-",
                  )}
                </dd>
                <dt>Formula registry</dt>
                <dd>
                  {String(
                    readiness?.formula_traceability?.formula_registry_id ??
                      detail.formula_registry_id ??
                      "-",
                  )}
                </dd>
                <dt>Formula set</dt>
                <dd>
                  {String(
                    readiness?.formula_traceability?.formula_set_version ??
                      detail.formula_set_version ??
                      "-",
                  )}
                </dd>
                <dt>Input hash</dt>
                <dd>
                  {String(
                    readiness?.formula_traceability?.input_snapshot_hash ??
                      detail.input_snapshot_hash ??
                      "-",
                  )}
                </dd>
                <dt>Output hash</dt>
                <dd>
                  {String(
                    readiness?.formula_traceability?.output_snapshot_hash ??
                      detail.output_snapshot_hash ??
                      "-",
                  )}
                </dd>
              </dl>
            </section>
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading">
              <h2>Calculation Readiness Gates</h2>
              <p>
                Readiness gates show blockers before engineering review,
                final-use approval, report issue, or downstream integrity
                decision use.
              </p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Status</th>
                    <th>Blocking</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(readiness?.readiness_gates ?? []).map((gate) => (
                    <tr key={String(gate.gate_type)}>
                      <td>{String(gate.gate_type ?? "-")}</td>
                      <td>
                        <span
                          className={badgeClass(String(gate.gate_status ?? ""))}
                        >
                          {String(gate.gate_status ?? "-")}
                        </span>
                      </td>
                      <td>{gate.blocking ? "Yes" : "No"}</td>
                      <td>{String(gate.message ?? "-")}</td>
                    </tr>
                  ))}
                  {(readiness?.readiness_gates ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        Readiness gates are loading or unavailable.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid-two">
            <section className="panel">
              <div className="panel-heading">
                <h2>Calculation metadata</h2>
                <p>
                  Calculation output is deterministic and versioned, but not
                  final-use approved.
                </p>
              </div>
              <dl className="metadata-grid">
                <dt>Run ID</dt>
                <dd>{detail.run_id ?? detail.calculation_run_id}</dd>
                <dt>Status</dt>
                <dd>
                  <span
                    className={badgeClass(detail.run_status ?? detail.status)}
                  >
                    {detail.run_status ?? detail.status ?? "-"}
                  </span>
                </dd>
                <dt>Validation</dt>
                <dd>
                  <span className={badgeClass(detail.validation_status)}>
                    {detail.validation_status ?? "-"}
                  </span>
                </dd>
                <dt>Final use</dt>
                <dd>
                  <span className={badgeClass(detail.final_use_status)}>
                    {detail.final_use_status ?? "requires_engineering_review"}
                  </span>
                </dd>
                <dt>Review</dt>
                <dd>{detail.review_status ?? "not_reviewed"}</dd>
                <dt>Asset</dt>
                <dd>
                  {detail.asset_id ? (
                    <Link href={`/assets/${detail.asset_id}`}>
                      {detail.asset_id}
                    </Link>
                  ) : (
                    "-"
                  )}
                </dd>
                <dt>Inspection</dt>
                <dd>{detail.inspection_event_id ?? "-"}</dd>
                <dt>Created</dt>
                <dd>{safeDate(detail.created_at)}</dd>
                <dt>Created by</dt>
                <dd>{detail.created_by ?? "-"}</dd>
              </dl>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Formula version snapshot</h2>
                <p>
                  Snapshot is persisted with the run and tied to approved
                  executable formula_versions.
                </p>
              </div>
              <dl className="metadata-grid">
                <dt>Formula version ID</dt>
                <dd>
                  {detail.formula_version_id ??
                    formulaValue(formulaSnapshot, "formula_version_id")}
                </dd>
                <dt>Formula code</dt>
                <dd>{formulaValue(formulaSnapshot, "formula_code")}</dd>
                <dt>Version</dt>
                <dd>{formulaValue(formulaSnapshot, "version")}</dd>
                <dt>Status</dt>
                <dd>
                  <span
                    className={badgeClass(
                      formulaValue(formulaSnapshot, "formula_status"),
                    )}
                  >
                    {formulaValue(formulaSnapshot, "formula_status")}
                  </span>
                </dd>
                <dt>Approved by</dt>
                <dd>{formulaValue(formulaSnapshot, "approved_by")}</dd>
                <dt>Approved at</dt>
                <dd>
                  {safeDate(formulaValue(formulaSnapshot, "approved_at"))}
                </dd>
                <dt>Formula Registry</dt>
                <dd>
                  {detail.formula_registry_id ??
                    formulaValue(formulaSnapshot, "formula_registry_id")}
                </dd>
              </dl>
            </section>
          </section>

          <section className="grid-two">
            <section className="panel">
              <h2>Input snapshot</h2>
              <p>Immutable input trace for deterministic repeatability.</p>
              <pre className="json-panel">
                {renderJson(detail.input_snapshot_json ?? detail.inputs ?? {})}
              </pre>
            </section>
            <section className="panel">
              <h2>Output snapshot</h2>
              <p>Output is display-only until engineering review.</p>
              <pre className="json-panel">
                {renderJson(outputSnapshot ?? detail.outputs ?? {})}
              </pre>
            </section>
          </section>

          <section className="grid-two">
            <section className="panel">
              <h2>Warnings and blockers</h2>
              <pre className="json-panel">
                {renderJson({
                  warnings: detail.warnings_json,
                  blockers: detail.final_use_blockers,
                  final_use_disclaimer: detail.final_use_disclaimer,
                })}
              </pre>
            </section>
            <section className="panel">
              <h2>Evidence and NDT linkage</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Input</th>
                      <th>Source</th>
                      <th>Evidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.inputs ?? []).map((input, index) => (
                      <tr
                        key={`${String(input.input_name ?? "input")}-${index}`}
                      >
                        <td>{String(input.input_name ?? "-")}</td>
                        <td>
                          {input.source_entity_id ? (
                            <Link
                              href={`/ndt/${String(input.source_entity_id)}`}
                            >
                              {String(input.source_entity_id)}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {input.evidence_file_id ? (
                            <Link
                              href={`/evidence/${String(input.evidence_file_id)}`}
                            >
                              {String(input.evidence_file_id)}
                            </Link>
                          ) : (
                            <span className="badge badge-warning">Missing</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={badgeClass(
                              String(
                                input.validation_status ?? "not_validated",
                              ),
                            )}
                          >
                            {String(input.validation_status ?? "not_validated")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(detail.inputs ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4}>No input linkage rows returned.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          <section className="grid-two">
            <section className="panel">
              <h2>Linked Evidence</h2>
              <p>
                Direct evidence_links for the calculation run remain separate
                from approval.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Evidence</th>
                      <th>File</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      readiness?.linked_evidence ??
                      detail.linked_evidence ??
                      []
                    ).map((link) => (
                      <tr
                        key={String(
                          link.evidence_link_id ?? link.evidence_file_id,
                        )}
                      >
                        <td>
                          {link.evidence_file_id ? (
                            <Link
                              href={`/evidence/${String(link.evidence_file_id)}`}
                            >
                              {String(
                                link.evidence_code ?? link.evidence_file_id,
                              )}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{String(link.original_filename ?? "-")}</td>
                        <td>
                          <span
                            className={badgeClass(
                              String(
                                link.upload_status ??
                                  link.evidence_status ??
                                  "",
                              ),
                            )}
                          >
                            {String(
                              link.upload_status ?? link.evidence_status ?? "-",
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(
                      readiness?.linked_evidence ??
                      detail.linked_evidence ??
                      []
                    ).length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          No direct calculation evidence links returned.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <h2>Downstream Traceability</h2>
              <p>
                Downstream links are display-only and do not create decisions,
                reports, or work orders.
              </p>
              <dl className="metadata-grid">
                <dt>Integrity decisions</dt>
                <dd>
                  {readiness?.linked_context?.downstream_integrity_decisions
                    ?.length ??
                    detail.linked_context?.downstream_integrity_decisions
                      ?.length ??
                    0}
                </dd>
                <dt>Reports</dt>
                <dd>
                  {readiness?.linked_context?.downstream_reports?.length ??
                    detail.linked_context?.downstream_reports?.length ??
                    0}
                </dd>
                <dt>Work orders</dt>
                <dd>
                  {readiness?.linked_context?.downstream_work_orders?.length ??
                    detail.linked_context?.downstream_work_orders?.length ??
                    0}
                </dd>
                <dt>Governance</dt>
                <dd>AI/n8n/service actors cannot approve</dd>
              </dl>
            </section>
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading">
              <h2>Comparison to previous calculation</h2>
              <p>
                Differences are displayed only; AIM does not infer engineering
                acceptability or create FFS/RBI recommendations here.
              </p>
            </div>
            {!previousRun ? (
              <p>No previous calculation run available for comparison.</p>
            ) : (
              <>
                <p>
                  <strong>Previous run:</strong>{" "}
                  <Link
                    href={`/calculations/${previousRun.calculation_run_id}`}
                  >
                    {previousRun.run_id ?? previousRun.calculation_run_id}
                  </Link>{" "}
                  · {safeDate(previousRun.created_at)}
                </p>
                <h3>Formula/input metadata differences</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Current</th>
                        <th>Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formulaDiff.map((row) => (
                        <tr key={row.field}>
                          <td>{row.field}</td>
                          <td>{row.current}</td>
                          <td>{row.previous}</td>
                        </tr>
                      ))}
                      {formulaDiff.length === 0 && (
                        <tr>
                          <td colSpan={3}>
                            No formula metadata differences found from available
                            previous-run summary.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <h3>Output differences</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Current</th>
                        <th>Previous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputDiff.map((row) => (
                        <tr key={row.field}>
                          <td>{row.field}</td>
                          <td>{row.current}</td>
                          <td>{row.previous}</td>
                        </tr>
                      ))}
                      {outputDiff.length === 0 && (
                        <tr>
                          <td colSpan={3}>
                            No output differences found from available
                            previous-run summary.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="panel wide-panel">
            <div className="panel-heading">
              <h2>Reviews, approvals, and readable audit timeline</h2>
              <p>
                RC4-J replaces the raw JSON-only audit block with a readable
                lifecycle view. Raw JSON remains available only as a fallback.
              </p>
            </div>
            <div className="grid-two">
              <article>
                <h2>{detail.engineering_reviews?.length ?? 0}</h2>
                <p>Engineering reviews</p>
              </article>
              <article>
                <h2>{detail.approval_records?.length ?? 0}</h2>
                <p>Approval records</p>
              </article>
              <article>
                <h2>{detail.audit_trail?.length ?? 0}</h2>
                <p>Audit events</p>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Record</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.engineering_reviews ?? []).map((review) => (
                    <tr key={String(review.id ?? review.review_id)}>
                      <td>Review</td>
                      <td>
                        {review.id ? (
                          <Link href={`/reviews/${String(review.id)}`}>
                            {String(review.review_code ?? review.id)}
                          </Link>
                        ) : (
                          String(review.review_code ?? "-")
                        )}
                      </td>
                      <td>
                        <span
                          className={badgeClass(
                            String(review.review_status ?? ""),
                          )}
                        >
                          {String(review.review_status ?? "-")}
                        </span>
                      </td>
                      <td>{String(review.review_type ?? "-")}</td>
                    </tr>
                  ))}
                  {(detail.approval_records ?? []).map((approval) => (
                    <tr
                      key={String(approval.id ?? approval.approval_record_id)}
                    >
                      <td>Approval</td>
                      <td>
                        {String(approval.approval_code ?? approval.id ?? "-")}
                      </td>
                      <td>
                        <span
                          className={badgeClass(
                            String(approval.approval_status ?? ""),
                          )}
                        >
                          {String(approval.approval_status ?? "-")}
                        </span>
                      </td>
                      <td>{String(approval.approval_type ?? "-")}</td>
                    </tr>
                  ))}
                  {(detail.engineering_reviews ?? []).length === 0 &&
                    (detail.approval_records ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          No review or approval records returned.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
            <h3>Decision / Report / Work Order trace</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Record</th>
                    <th>Status</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    readiness?.linked_context?.downstream_integrity_decisions ??
                    []
                  ).map((row) => (
                    <tr key={`decision-${String(row.id)}`}>
                      <td>Decision</td>
                      <td>
                        {row.id ? (
                          <Link href={`/integrity-decisions/${String(row.id)}`}>
                            {String(row.code ?? row.id)}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className={badgeClass(String(row.status ?? ""))}>
                          {String(row.status ?? "-")}
                        </span>
                      </td>
                      <td>{String(row.title ?? "-")}</td>
                    </tr>
                  ))}
                  {(readiness?.linked_context?.downstream_reports ?? []).map(
                    (row) => (
                      <tr key={`report-${String(row.id)}`}>
                        <td>Report</td>
                        <td>
                          {row.id ? (
                            <Link href={`/reports/${String(row.id)}`}>
                              {String(row.code ?? row.id)}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <span
                            className={badgeClass(String(row.status ?? ""))}
                          >
                            {String(row.status ?? "-")}
                          </span>
                        </td>
                        <td>{String(row.title ?? "-")}</td>
                      </tr>
                    ),
                  )}
                  {(
                    readiness?.linked_context?.downstream_work_orders ?? []
                  ).map((row) => (
                    <tr key={`wo-${String(row.id)}`}>
                      <td>Work Order</td>
                      <td>
                        {row.id ? (
                          <Link href={`/work-orders/${String(row.id)}`}>
                            {String(row.code ?? row.id)}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className={badgeClass(String(row.status ?? ""))}>
                          {String(row.status ?? "-")}
                        </span>
                      </td>
                      <td>{String(row.title ?? "-")}</td>
                    </tr>
                  ))}
                  {(readiness?.linked_context?.downstream_integrity_decisions
                    ?.length ?? 0) +
                    (readiness?.linked_context?.downstream_reports?.length ??
                      0) +
                    (readiness?.linked_context?.downstream_work_orders
                      ?.length ?? 0) ===
                    0 && (
                    <tr>
                      <td colSpan={4}>
                        No downstream decision, report, or work-order trace
                        returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <h3>Audit timeline</h3>
            <div className="timeline-list">
              {(detail.audit_trail ?? []).map((event, index) => (
                <article
                  className="issue-card"
                  key={`${String(event.id ?? index)}-${auditEventLabel(event)}`}
                >
                  <strong>{auditEventLabel(event)}</strong>
                  <p>
                    {auditEventTime(event)} · {auditEventActor(event)}
                  </p>
                  <p className="muted-text">
                    {String(event.entity_type ?? "")}{" "}
                    {String(event.entity_id ?? "")}
                  </p>
                </article>
              ))}
              {(detail.audit_trail ?? []).length === 0 && (
                <p>No audit events returned.</p>
              )}
            </div>
            <details>
              <summary>Raw audit fallback</summary>
              <pre className="json-panel">
                {renderJson({
                  engineering_reviews: detail.engineering_reviews,
                  approval_records: detail.approval_records,
                  audit_trail: detail.audit_trail,
                })}
              </pre>
            </details>
          </section>
        </>
      )}
    </main>
  );
}
