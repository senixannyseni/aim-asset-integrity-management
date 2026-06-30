import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TENANT_ROUTE_REGISTRY,
  tenantScopedRouteEntries
} from '../src/modules/tenancy/tenant-route-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function compact(relativePath: string): string {
  return read(relativePath).replace(/\s+/g, ' ');
}

function expectSnippets(relativePath: string, snippets: string[]): void {
  const content = compact(relativePath);
  for (const snippet of snippets) {
    expect(content, `${relativePath} should contain ${snippet}`).toContain(snippet.replace(/\s+/g, ' '));
  }
}

describe('enterprise multi-tenant runtime route hardening', () => {
  it('requires tenant runtime context in every tenant-scoped registry route', () => {
    for (const entry of tenantScopedRouteEntries()) {
      expect(read(entry.routeFile), `${entry.routeFile} must require tenant context at runtime`).toContain('requireTenantContextFromRequest');
    }
  });

  it('keeps global system routes out of tenant-scoped runtime behavior', () => {
    const globalRoutes = TENANT_ROUTE_REGISTRY.filter((entry) => entry.scopeStatus === 'global_system');
    expect(globalRoutes.length).toBeGreaterThan(0);
    for (const entry of globalRoutes) {
      expect(read(entry.routeFile), `${entry.routeFile} should remain an explicit control-plane route`).not.toContain('requireTenantContextFromRequest');
      expect(entry.boundaryMode).toBe('system_observability_boundary');
    }
  });

  it('tenant-filters cross-tenant reads for asset, inspection, NDT, findings, calculations, reviews, reports, and work orders', () => {
    expectSnippets('apps/api/src/routes/assets.ts', [
      'appendTenantWhereClause',
      'tenantIdForInsert'
    ]);
    expectSnippets('apps/api/src/routes/inspections.ts', [
      'ie.tenant_id = $1::uuid',
      'where ie.id = $1::uuid and ie.tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/ndt.ts', [
      'nm.tenant_id = $1::uuid',
      'where nm.id = $1 and nm.tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/findings.ts', [
      'f.tenant_id = $1::uuid',
      'where f.id = $1 and f.tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/calculations.ts', [
      'tenant_id = $1::uuid',
      'where id = $1 and tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/engineering-reviews.ts', [
      "const clauses: string[] = ['tenant_id = $1::uuid'];",
      'select * from approval_records where ${clauses.join'
    ]);
    expectSnippets('apps/api/src/routes/reports.ts', [
      'from reports where tenant_id = $1::uuid',
      'select * from reports where id = $1 and tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/work-orders.ts', [
      'from internal_work_orders where tenant_id = $1::uuid',
      'where id = $1 and tenant_id = $2::uuid'
    ]);
  });

  it('tenant-filters updates, approvals, issue gates, promotions, and parent-scoped FFS/RBI mutations', () => {
    expectSnippets('apps/api/src/routes/findings.ts', [
      'where id = $23 and tenant_id = $24::uuid returning *',
      'exists ( select 1 from evidence_files ef where ef.id = evidence_links.evidence_file_id and ef.tenant_id = $3::uuid )'
    ]);
    expectSnippets('apps/api/src/routes/engineering-reviews.ts', [
      'update engineering_reviews set review_status = $2',
      'where id = $1 and tenant_id = $5::uuid returning *',
      'update approval_records'
    ]);
    expectSnippets('apps/api/src/routes/reports.ts', [
      "update reports set report_status = 'approved'",
      'where id = $1 and tenant_id = $3::uuid returning *',
      "update reports set report_status = 'issued'",
      "error_code = 'REPORT_ISSUE_GATE_BLOCKED' and tenant_id = $2::uuid"
    ]);
    expectSnippets('apps/api/src/routes/work-orders.ts', [
      'where id = $1 and tenant_id = $10::uuid returning *',
      'where id = $1 and tenant_id = $5::uuid returning *',
    ]);
    expectSnippets('apps/api/src/routes/ffs.ts', [
      'where a.id = ffs_cases.asset_id and a.tenant_id = $6::uuid',
      'insert into approval_records(tenant_id, entity_type, entity_id, approval_status, approver_id, approval_comment)',
      'where a.id = ffs_cases.asset_id and a.tenant_id = $5::uuid'
    ]);
    expectSnippets('apps/api/src/routes/rbi.ts', [
      'join assets a on a.id = rc.asset_id',
      'where a.id = rbi_cases.asset_id and a.tenant_id = $4::uuid',
      'tenantId: tenant.tenantId'
    ]);
    expectSnippets('apps/api/src/routes/ai-extraction.ts', [
      'join extraction_jobs ej on ej.id = sr.extraction_job_id join assets a on a.id = ej.asset_id',
      'where ej.id = staging_records.extraction_job_id and a.tenant_id = $4::uuid',
      'findVerifiedEvidenceReference(client, { tenantId: tenant.tenantId'
    ]);
  });

  it('assigns authenticated tenant_id on tenant-column inserts and tenant-scopes parent-owned inserts', () => {
    for (const relativePath of [
      'apps/api/src/routes/ndt.ts',
      'apps/api/src/routes/findings.ts',
      'apps/api/src/routes/calculations.ts',
      'apps/api/src/routes/engineering-reviews.ts',
      'apps/api/src/routes/integrity-decisions.ts',
      'apps/api/src/routes/work-orders.ts',
      'apps/api/src/routes/reports.ts'
    ]) {
      expect(compact(relativePath), `${relativePath} should insert tenant_id`).toContain('insert into');
      expect(compact(relativePath), `${relativePath} should insert tenant_id`).toContain('tenant_id,');
    }

    expectSnippets('apps/api/src/routes/ffs.ts', [
      'select id from assets where id = $1 and tenant_id = $2::uuid',
      'select * from calculation_runs where id = $1::uuid and tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/rbi.ts', [
      'select id from assets where id = $1::uuid and tenant_id = $2::uuid',
      'select * from calculation_runs where id = $1::uuid and tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/ai-extraction.ts', [
      'select id from assets where id = $1 and tenant_id = $2::uuid',
      'select id from evidence_files where id = $1 and asset_id = $2 and tenant_id = $3::uuid'
    ]);
  });

  it('tenant-filters audit-log visibility, dashboard aggregates, workflow console reads, and AI evidence references', () => {
    expectSnippets('apps/api/src/routes/audit-logs.ts', [
      'al.tenant_id = $1::uuid',
      'where al.id = $1 and al.tenant_id = $2::uuid'
    ]);
    expectSnippets('apps/api/src/routes/governance-dashboard.ts', [
      'where tenant_id = $1::uuid',
      'join assets a on a.id = ej.asset_id'
    ]);
    expectSnippets('apps/api/src/routes/workflow-console.ts', [
      'join workflow_events we on we.id = wt.workflow_event_id',
      'we.tenant_id = $1::uuid',
      'from audit_logs where tenant_id = $1::uuid'
    ]);
    expectSnippets('apps/api/src/routes/ai-extraction.ts', [
      'ef.tenant_id = $5::uuid',
      'a.tenant_id = $1::uuid',
      'from extraction_jobs ej join assets a on a.id = ej.asset_id'
    ]);
  });
});
