import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("RC4-O calculation run detail and formula traceability readiness workflow", () => {
  it("adds a read-only backend calculation readiness endpoint", () => {
    const route = readRepoFile("apps/api/src/routes/calculations.ts");
    const normalizedRoute = route.replace(/\r\n/g, "\n");
    expect(normalizedRoute).toContain(
      'calculationsRouter.get(\n  "/engineering/calculations/:runId/readiness"',
    );
    expect(normalizedRoute).toContain('requirePermission("calculation.read")');
    expect(normalizedRoute).toContain("buildCalculationRunReadiness");
    expect(normalizedRoute).toContain("approved_formula_version_snapshot_present");
    expect(normalizedRoute).toContain("deterministic_output_snapshot_present");
    expect(normalizedRoute).toContain("input_or_direct_evidence_linked");
    expect(normalizedRoute).toContain("approval_for_final_use_present");
    expect(normalizedRoute).toContain("ai_n8n_finalization_absent");
    const endpointStart = normalizedRoute.indexOf(
      '"/engineering/calculations/:runId/readiness"',
    );
    const endpointEnd = normalizedRoute.indexOf(
      'calculationsRouter.get(\n  "/engineering/calculations/:runId"',
      endpointStart + 1,
    );
    const endpoint = normalizedRoute.slice(endpointStart, endpointEnd);
    expect(endpoint).not.toContain("insert into");
    expect(endpoint).not.toContain("update calculation_runs");
    expect(endpoint).not.toContain("writeAudit(");
  });

  it("extends calculation detail with evidence, formula traceability, and downstream context", () => {
    const route = readRepoFile("apps/api/src/routes/calculations.ts");
    expect(route).toContain("loadCalculationEvidenceLinks");
    expect(route).toContain("formula_traceability");
    expect(route).toContain("input_output_traceability");
    expect(route).toContain("linked_evidence");
    expect(route).toContain("downstream_integrity_decisions");
    expect(route).toContain("downstream_reports");
    expect(route).toContain("downstream_work_orders");
    expect(route).toContain(
      "Formula traceability is based on the persisted formula_version_snapshot_json",
    );
    expect(route).toContain(
      "Engineering review and senior-human approval remain required before final engineering use.",
    );
  });

  it("adds a product-facing calculation detail readiness UI and list link", () => {
    const page = readRepoFile("apps/web/app/calculations/[runId]/page.tsx");
    const client = readRepoFile(
      "apps/web/app/calculations/[runId]/CalculationDetailClient.tsx",
    );
    const list = readRepoFile(
      "apps/web/app/calculations/CalculationEngineClient.tsx",
    );
    expect(page).toContain("CalculationDetailClient");
    expect(client).toContain(
      "RC4-O calculation run detail and formula traceability readiness",
    );
    expect(client).toContain(
      "/api/v1/engineering/calculations/${runId}/readiness",
    );
    expect(client).toContain("Formula Traceability Readiness");
    expect(client).toContain("Calculation Readiness Gates");
    expect(client).toContain("Linked Evidence");
    expect(client).toContain("Downstream Traceability");
    expect(client).toContain("AI/n8n/service actors cannot approve");
    expect(list).toContain(
      "RC4-O adds detail-level formula traceability readiness",
    );
    expect(list).toContain("Formula readiness");
  });

  it("documents RC4-O in OpenAPI, release, UAT, README, and sprint status", () => {
    const openapi = readRepoFile("04_API/openapi.yaml");
    const release = readRepoFile(
      "docs/release/AIM_RC4O_calculation_run_detail_formula_traceability_report.md",
    );
    const uat = readRepoFile(
      "docs/uat/uat_rc4o_calculation_run_detail_formula_traceability.md",
    );
    const readme = readRepoFile("README.md");
    const sprint = readRepoFile("docs/sprint-status.md");
    expect(openapi).toContain(
      "/api/v1/engineering/calculations/{runId}/readiness:",
    );
    expect(openapi).toContain("CalculationRunReadiness");
    expect(openapi).toContain(
      "Read-only RC4-O calculation run readiness preview",
    );
    expect(release).toContain(
      "RC4-O Calculation Run Detail and Formula Traceability Readiness",
    );
    expect(uat).toContain(
      "RC4-O Calculation Run Detail and Formula Traceability UAT",
    );
    expect(readme).toContain(
      "RC4-O Calculation Run Detail and Formula Traceability Readiness",
    );
    expect(sprint).toContain(
      "RC4-O Calculation Run Detail and Formula Traceability Readiness",
    );
  });
});
