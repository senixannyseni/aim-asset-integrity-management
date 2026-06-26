import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const routeMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readIfExists(relativePath: string): string {
  const target = path.join(repoRoot, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
}

function readMany(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readIfExists(relativePath)).join('\n');
}

type ImplementedRoute = {
  routeFile: string;
  method: string;
  path: string;
};

function implementedApiRoutes(): ImplementedRoute[] {
  const routesDir = path.join(repoRoot, 'apps/api/src/routes');
  const excluded = new Set(['health.ts', 'rbac-demo.ts']);
  return fs.readdirSync(routesDir)
    .filter((file) => file.endsWith('.ts') && !excluded.has(file))
    .flatMap((file): ImplementedRoute[] => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const routes: ImplementedRoute[] = [];

      for (const match of content.matchAll(/\.\s*(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g)) {
        const method = match[1];
        const routePath = match[2];
        if (!method || !routePath) continue;
        routes.push({
          routeFile: file,
          method,
          path: `/api/v1${routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`
        });
      }

      return routes;
    });
}

function openApiPathSet(openapi: string): Set<string> {
  const paths: string[] = [];
  for (const match of openapi.matchAll(/^  (\/api\/v1\/[^:]+):\s*$/gm)) {
    const apiPath = match[1];
    if (apiPath) paths.push(apiPath);
  }
  return new Set(paths);
}

function pathSection(openapi: string, apiPath: string): string {
  const startMarker = `  ${apiPath}:`;
  const start = openapi.indexOf(startMarker);
  if (start < 0) return '';
  const rest = openapi.slice(start + startMarker.length);
  const next = rest.search(/\n  \/api\/v1\//);
  return next >= 0 ? rest.slice(0, next) : rest;
}

function methodSection(openapi: string, apiPath: string, method: string): string {
  const section = pathSection(openapi, apiPath);
  const startMarker = `\n    ${method}:`;
  const start = section.indexOf(startMarker);
  if (start < 0) return '';
  const rest = section.slice(start + startMarker.length);
  const next = rest.search(new RegExp(`\\n    (${routeMethods.join('|')}):`));
  return next >= 0 ? rest.slice(0, next) : rest;
}

function expectContainsCaseInsensitive(content: string, token: string): void {
  expect(content.toLowerCase(), `missing token ${token}`).toContain(token.toLowerCase());
}

const sourceTruthTables = [
  'extraction_jobs',
  'extraction_fields',
  'staging_records',
  'manual_overrides',
  'data_quality_checks',
  'integrity_decisions',
  'review_gates',
  'internal_work_orders',
  'report_versions',
  'report_exports',
  'workflow_tasks',
  'notification_logs',
  'system_settings',
  'calculation_validation_cases',
  'formula_versions'
] as const;

const requiredSeedPermissions = [
  'ai_extraction.create',
  'ai_extraction.review',
  'ai_extraction.correct',
  'ai_extraction.promote',
  'staging.review',
  'staging.promote',
  'manual_override.create',
  'evidence.upload',
  'evidence.link',
  'evidence.download_url',
  'evidence.delete_request',
  'evidence.delete_approve',
  'calculation.run',
  'calculation.review',
  'calculation.approve',
  'report.approve',
  'report.issue',
  'work_order.create',
  'work_order.update',
  'work_order.close',
  'workflow_event.create',
  'error_log.create',
  'error_log.read',
  'audit.read'
] as const;

describe('Phase 1.7 final governance closure reconciliation', () => {
  it('keeps implemented production routes reconciled with OpenAPI permission and audit metadata', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const openapiPaths = openApiPathSet(openapi);
    const routes = implementedApiRoutes();

    const missingPaths = routes
      .filter((route) => !openapiPaths.has(route.path))
      .map((route) => `${route.method.toUpperCase()} ${route.path} (${route.routeFile})`);
    expect(missingPaths).toEqual([]);

    const missingPermissionMetadata = routes
      .filter((route) => !methodSection(openapi, route.path, route.method).includes('x-permission-required:'))
      .map((route) => `${route.method.toUpperCase()} ${route.path}`);
    expect(missingPermissionMetadata).toEqual([]);

    for (const [apiPath, method] of [
      ['/api/v1/reports/{reportId}/issue', 'post'],
      ['/api/v1/work-orders', 'post'],
      ['/api/v1/work-orders/{workOrderId}', 'patch'],
      ['/api/v1/work-orders/{workOrderId}/close', 'post']
    ] as const) {
      const operation = methodSection(openapi, apiPath, method);
      expect(operation).toContain('x-permission-required:');
      expect(operation).toContain('x-audit-event-generated:');
    }
  });

  it('reconciles Phase 1 migrations with the data dictionary and ERD source-of-truth entities', () => {
    const phaseMigrations = readMany([
      'db/migrations/0012_auth_rbac_skeleton.sql',
      'db/migrations/0013_source_truth_schema_closure.sql',
      'db/migrations/0014_phase1_3_ai_evidence_approval_governance.sql',
      'db/migrations/0015_phase1_5_calculation_governance_hardening.sql',
      'db/migrations/0016_phase1_6_report_issue_work_order_gates.sql'
    ]);
    const dataDictionary = readRepoFile('03_Database/data_dictionary_current.md');
    const erd = readRepoFile('docs/erd_current.md');

    for (const tableName of sourceTruthTables) {
      expectContainsCaseInsensitive(phaseMigrations, `create table if not exists ${tableName}`);
      expectContainsCaseInsensitive(dataDictionary, tableName);
      expectContainsCaseInsensitive(erd, tableName);
    }

    expect(phaseMigrations).toContain('auth_refresh_sessions');
    expect(phaseMigrations).toContain('formula_version_snapshot_json');
    expect(phaseMigrations).toContain('issue_gate_checklist_json');
    expect(phaseMigrations).toContain('gate_checklist_json');
  });

  it('verifies JWT/session auth, local-only demo auth, RBAC seeds, and service-user restrictions', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const authRoute = readRepoFile('apps/api/src/routes/auth.ts');
    const requestContext = readRepoFile('apps/api/src/middleware/request-context.ts');
    const config = readRepoFile('apps/api/src/config/env.ts');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');

    expect(app).toContain("import { authRouter } from");
    expect(app).toContain("app.use('/api/v1', authRouter)");
    for (const token of ["authRouter.post('/auth/login'", "authRouter.post('/auth/refresh'", "authRouter.post('/auth/logout'", "authRouter.get('/auth/me'"]) {
      expect(authRoute).toContain(token);
    }
    expect(requestContext).toContain('verifyAuthToken(token, \'access\')');
    expect(requestContext).toContain('loadUserContextById(payload.sub, payload.jti)');
    expect(requestContext).toContain('LOCAL-DEV ONLY');
    expect(config).toContain("appEnv === 'local' || appEnv === 'development' || appEnv === 'test'");
    expect(config).toContain('allowLocalDemoAuth = isLocalLikeEnv(appEnv)');

    for (const permission of requiredSeedPermissions) {
      expect(PERMISSIONS).toContain(permission);
      expect(seed).toContain(`'${permission}'`);
    }
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('calculation.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('report.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('report.issue');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('work_order.create');
  });

  it('verifies AI extraction remains staging-only, evidence-linked, and human-reviewed', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    const migration = readRepoFile('db/migrations/0013_source_truth_schema_closure.sql') + readRepoFile('db/migrations/0014_phase1_3_ai_evidence_approval_governance.sql');

    for (const token of ['extraction_jobs', 'extraction_fields', 'staging_records', 'manual_overrides', 'data_quality_checks']) {
      expect(route).toContain(token);
      expect(migration).toContain(token);
    }
    expect(route).toContain('staging_only_flag');
    expect(route).toContain('AI_ATTEMPTED_APPROVAL_OR_DECISION');
    expect(route).toContain('MISSING_EVIDENCE_REFERENCE');
    expect(route).toContain("requirePermission('ai_extraction.review')");
    expect(route).toContain("requirePermission('ai_extraction.promote')");
    expect(route).toContain('correction_reason');
    expect(route).toContain('manual_override.created');
    expect(route).toContain('engineer_review_evidence_gate');
    expect(route).toContain('staging_record.promoted');
  });

  it('verifies evidence governance controls remain available and linked to downstream gates', () => {
    const evidenceRoute = readRepoFile('apps/api/src/routes/evidence.ts');
    const evidenceValidation = readRepoFile('apps/api/src/modules/evidence/validation.ts');
    const calculationRoute = readRepoFile('apps/api/src/routes/calculations.ts');
    const reportRoute = readRepoFile('apps/api/src/routes/reports.ts');
    const workOrderRoute = readRepoFile('apps/api/src/routes/work-orders.ts');

    expect(evidenceRoute).toContain("/evidence/:evidenceId/download-url");
    expect(evidenceRoute).toContain('buildSignedEvidenceUrl');
    expect(evidenceRoute).toContain('EVIDENCE_SIGNED_URL_CREATED');
    expect(evidenceRoute).toContain('access_status');
    expect(evidenceRoute).toContain('malware_scan_status');
    expect(evidenceRoute).toContain('Linked evidence cannot be deleted');
    expect(evidenceRoute).toContain('EVIDENCE_DELETE_APPROVED');
    expect(evidenceValidation).toContain('SUPPORTED_EVIDENCE_FILE_TYPES');
    expect(evidenceValidation).toContain('isExpectedMimeForFileType');
    expect(evidenceValidation).toContain('file_size_bytes');
    expect(evidenceValidation).toContain('checksum must be a SHA-256 hex string');
    expect(calculationRoute).toContain('MISSING_EVIDENCE');
    expect(reportRoute).toContain('evidence_linked');
    expect(workOrderRoute).toContain('closure_evidence_required');
  });

  it('verifies deterministic calculation governance and validation-workbook behavior remain bounded', () => {
    const calculationRoute = readRepoFile('apps/api/src/routes/calculations.ts');
    const engine = readRepoFile('apps/api/src/modules/calculation-engine/deterministic-engine.ts');
    const migration = readRepoFile('db/migrations/0015_phase1_5_calculation_governance_hardening.sql');
    const tests = readRepoFile('apps/api/tests/calculation-engine.test.ts') + readRepoFile('apps/api/tests/phase1-5-calculation-governance.test.ts');

    expect(calculationRoute).toContain('formula_id is required. Silent/default formula selection is not allowed.');
    expect(calculationRoute).toContain('formula_version is required');
    expect(calculationRoute).toContain('getApprovedFormulaVersion');
    expect(calculationRoute).toContain('approved');
    expect(calculationRoute).toContain('locked');
    expect(calculationRoute).toContain('formula_version_snapshot_json');
    expect(calculationRoute).toContain('output_snapshot_json');
    expect(calculationRoute).toContain('final_use_blockers_json');
    expect(calculationRoute).toContain('calculation.run_requested');
    expect(calculationRoute).toContain('calculation.completed');
    expect(calculationRoute).toContain('calculation.final_use_blocked');
    expect(engine).toContain('Engineering review required before final use.');
    expect(engine).toContain('ZERO_CORROSION_RATE');
    expect(engine).toContain('NEGATIVE_CORROSION_RATE');
    expect(engine).toContain('MISSING_EVIDENCE');
    expect(engine).toContain('UNIT_REVIEW_REQUIRED');
    expect(migration).toContain('no silent formula default');
    expect(tests).toContain('calculates corrosion rate');
    expect(tests).toContain('missingEvidence');
    expect(tests).toContain('unitMismatch');
  });

  it('verifies report issue gates and internal work order fallback close the original Phase 1 scope', () => {
    const reportRoute = readRepoFile('apps/api/src/routes/reports.ts');
    const workOrderRoute = readRepoFile('apps/api/src/routes/work-orders.ts');

    for (const gateType of [
      'required_data_complete',
      'evidence_linked',
      'calculation_completed',
      'calculation_reviewed',
      'calculation_approved',
      'integrity_decision_created',
      'integrity_decision_approved',
      'report_approved',
      'unresolved_critical_warnings_absent',
      'workflow_errors_resolved',
      'approver_comment_present'
    ]) {
      expect(reportRoute).toContain(gateType);
    }
    expect(reportRoute).toContain('REPORT_ISSUE_COMMENT_REQUIRED');
    expect(reportRoute).toContain('REPORT_ISSUE_BLOCKED');
    expect(reportRoute).toContain('REPORT_GATES_NOT_SATISFIED');
    expect(reportRoute).toContain('HUMAN_APPROVER_REPORT_ISSUE_REQUIRED');
    expect(reportRoute).toContain('n8n_service');
    expect(reportRoute).toContain('ai_cannot_issue_report');
    expect(reportRoute).toContain('REPORT_ISSUED');

    expect(workOrderRoute).toContain("workOrdersRouter.post('/work-orders', requirePermission('work_order.create')");
    expect(workOrderRoute).toContain("workOrdersRouter.patch('/work-orders/:workOrderId', requirePermission('work_order.update')");
    expect(workOrderRoute).toContain("workOrdersRouter.post('/work-orders/:workOrderId/close', requirePermission('work_order.close')");
    expect(workOrderRoute).toContain('approved_integrity_decision');
    expect(workOrderRoute).toContain('issued_report_action');
    expect(workOrderRoute).toContain('preliminary_internal_mode');
    expect(workOrderRoute).toContain('external_cmms_reference: null');
    expect(workOrderRoute).toContain('WORK_ORDER_COMPLETION_NOTE_REQUIRED');
    expect(workOrderRoute).toContain('WORK_ORDER_CLOSURE_EVIDENCE_REQUIRED');
    expect(workOrderRoute).toContain('INTERNAL_WORK_ORDER_CREATED');
    expect(workOrderRoute).toContain('INTERNAL_WORK_ORDER_UPDATED');
    expect(workOrderRoute).toContain('INTERNAL_WORK_ORDER_CLOSED');
  });

  it('keeps out-of-scope features as explicit boundaries only', () => {
    const controlledContent = readMany([
      '04_API/openapi.yaml',
      '03_Database/data_dictionary_current.md',
      'docs/erd_current.md',
      'db/migrations/0013_source_truth_schema_closure.sql',
      'db/migrations/0015_phase1_5_calculation_governance_hardening.sql',
      'db/migrations/0016_phase1_6_report_issue_work_order_gates.sql',
      'apps/api/src/routes/reports.ts',
      'apps/api/src/routes/work-orders.ts',
      'apps/api/src/modules/calculation-engine/deterministic-engine.ts'
    ]);

    expect(controlledContent).not.toMatch(/x-full-api-579-implemented:\s*true/i);
    expect(controlledContent).not.toMatch(/x-full-api-581-implemented:\s*true/i);
    expect(controlledContent).not.toMatch(/x-cmms-integration-implemented:\s*true/i);
    expect(controlledContent).not.toMatch(/x-3d-processing-implemented:\s*true/i);
    expect(controlledContent).not.toMatch(/x-invented-api-asme-formulas?:\s*true/i);
    expect(controlledContent).not.toMatch(/https?:\/\/[^\s'"]*(sap|maximo|cmms)/i);
    expect(controlledContent).toMatch(/out-of-scope|No API 579|No API 581|no external SAP\/Maximo\/CMMS integration|No external CMMS/i);
  });

  it('records a final Phase 1 governance closure report', () => {
    const report = readRepoFile('docs/phase1_governance_closure_report.md');
    for (const token of [
      'Phase 1 Governance Closure Report',
      'Original Scope Closure Matrix',
      'Phase 1.1',
      'Phase 1.2',
      'Phase 1.3',
      'Phase 1.4',
      'Phase 1.5',
      'Phase 1.6',
      'Remaining Gaps',
      'Out-of-Scope Confirmation',
      'No full API 579',
      'No full API 581',
      'No external SAP/Maximo/CMMS integration',
      'No frontend UI',
      'No invented API/ASME formulas'
    ]) {
      expect(report).toContain(token);
    }
  });
});
