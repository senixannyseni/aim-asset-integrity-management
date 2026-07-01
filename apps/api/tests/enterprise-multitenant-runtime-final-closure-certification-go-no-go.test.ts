import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_ROUTE_FILES,
  TENANT_ROUTE_REGISTRY,
  routeFilesMissingFromRegistry,
  tenantScopedRoutesWithoutBoundary
} from '../src/modules/tenancy/tenant-route-registry.js';
import { buildTenantRouteRegressionSummary } from '../src/modules/tenancy/tenant-regression-harness.js';

const repoRoot = path.resolve(__dirname, '../../..');

function assertRelativePath(relativePath: string | undefined, label = 'relative path'): string {
  expect(relativePath, `${label} should be defined`).toBeTypeOf('string');
  if (!relativePath) {
    throw new Error(`${label} should be defined`);
  }
  return relativePath;
}

function read(relativePath: string | undefined): string {
  const safeRelativePath = assertRelativePath(relativePath);
  return fs.readFileSync(path.join(repoRoot, safeRelativePath), 'utf8');
}

function expectFile(relativePath: string | undefined): string {
  const safeRelativePath = assertRelativePath(relativePath);
  const absolutePath = path.join(repoRoot, safeRelativePath);
  expect(fs.existsSync(absolutePath), `${safeRelativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

function routeFilesFromDisk(): string[] {
  return fs
    .readdirSync(path.join(repoRoot, 'apps/api/src/routes'))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `apps/api/src/routes/${file}`)
    .sort();
}

const finalDocs = [
  'docs/enterprise/enterprise_multitenant_runtime_final_closure_certification_go_no_go_pack.md',
  'docs/enterprise/tenant_isolation_certification_matrix.md',
  'docs/enterprise/multitenant_final_residual_risk_exception_register.md',
  'docs/enterprise/multitenant_runtime_final_go_no_go_decision_record.md',
  'docs/release/enterprise_multitenant_runtime_final_closure_evidence_index.md',
  'docs/operations/enterprise_multitenant_runtime_final_closure_runbook.md'
];

describe('enterprise multi-tenant runtime final closure certification and go/no-go pack', () => {
  it('adds final closure docs, evidence index, runbook, and human go/no-go records', () => {
    const pack = expectFile(finalDocs[0]);
    const matrix = expectFile(finalDocs[1]);
    const risk = expectFile(finalDocs[2]);
    const decision = expectFile(finalDocs[3]);
    const index = expectFile(finalDocs[4]);
    const runbook = expectFile(finalDocs[5]);

    expect(pack).toContain('Enterprise Multi-Tenant Runtime Final Closure — Tenant Isolation Certification and Go/No-Go Pack');
    expect(pack).toContain('MT-FC-001');
    expect(pack).toContain('MT-FC-012');
    expect(pack).toContain('ready for controlled enterprise tenant pilot');
    expect(matrix).toContain('Tenant Isolation Certification Matrix');
    expect(matrix).toContain('MT-FC-009');
    expect(risk).toContain('MT-FC-RISK-001');
    expect(decision).toContain('GO for controlled enterprise tenant pilot');
    expect(index).toContain('Enterprise Multi-Tenant Runtime Final Closure Evidence Index');
    expect(index).toContain('MT-FC-012');
    expect(runbook).toContain('enterprise-multitenant-runtime-final-closure-certification-go-no-go.test.ts');
    expect(runbook).toContain('pnpm db:migrate');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
  });

  it('reconciles Sprint 0 through Sprint 6 evidence and keeps final closure human-only', () => {
    const pack = read(finalDocs[0]);
    const matrix = read(finalDocs[1]);
    const decision = read(finalDocs[3]);

    for (const evidence of ['MT-S0-001', 'MT-S1-001', 'MT-S2-001', 'MT-S3-001', 'MT-S4-001', 'MT-S5-001', 'MT-S6-001']) {
      expect(pack).toContain(evidence);
    }

    expect(pack).toContain('AI/n8n/service actors cannot accept multi-tenant final closure evidence');
    expect(pack).toContain('cannot approve enterprise tenant isolation certification');
    expect(pack).toContain('cannot sign enterprise multi-tenant final closure');
    expect(matrix).toContain('AI/n8n/service actors cannot approve enterprise tenant isolation certification');
    expect(decision).toContain('AI/n8n/service actors cannot approve final go/no-go');
  });

  it('keeps route registry certification complete for current production routes', () => {
    const actualRouteFiles = routeFilesFromDisk();
    expect(actualRouteFiles).toEqual(PRODUCTION_ROUTE_FILES);
    expect(TENANT_ROUTE_REGISTRY.length).toBe(actualRouteFiles.length);
    expect(routeFilesMissingFromRegistry(actualRouteFiles)).toEqual([]);
    expect(tenantScopedRoutesWithoutBoundary()).toEqual([]);

    const summary = buildTenantRouteRegressionSummary({ actualRouteFiles });
    expect(summary.registryStatus).toBe('pass');
    expect(summary.routesMissingFromRegistry).toEqual([]);
    expect(summary.tenantScopedRoutesWithoutBoundary).toEqual([]);
  });

  it('does not rewrite enterprise multi-tenant historical migration scope while allowing later feature migrations', () => {
    const migrationFiles = fs.readdirSync(path.join(repoRoot, 'db/migrations')).filter((file) => file.endsWith('.sql')).sort();
    expect(migrationFiles).toContain('0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql');
    expect(migrationFiles.filter((file) => file.startsWith('0034'))).toEqual([
      '0034_calculation_formula_library_runtime_bridge.sql',
    ]);
    expect(migrationFiles.filter((file) => file.startsWith('0028')).length).toBe(1);
    expect(migrationFiles.filter((file) => file.startsWith('0029')).length).toBe(1);
    expect(migrationFiles.filter((file) => file.startsWith('0030')).length).toBe(1);
    expect(migrationFiles.filter((file) => file.startsWith('0031')).length).toBe(1);
    expect(migrationFiles.filter((file) => file.startsWith('0032')).length).toBe(1);
    expect(migrationFiles.filter((file) => file.startsWith('0033')).length).toBe(1);

    const index = read(finalDocs[4]);
    expect(index).toContain('No database migration is added by final closure');
    expect(index).toContain('does not rewrite 0028, 0029, 0030, 0031, 0032, or 0033');
  });

  it('links final closure into README, sprint status, evidence register, gates, roadmap, and backlog', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('Enterprise Multi-Tenant Runtime Final Closure — Tenant Isolation Certification and Go/No-Go Pack');
    expect(sprint).toContain('MT-FC-001 through MT-FC-012');
    expect(register).toContain('Enterprise Multi-Tenant Runtime Final Closure Certification and Go/No-Go Mapping');
    expect(gates).toContain('Enterprise Multi-Tenant Runtime Final Closure Certification Gate');
    expect(roadmap).toContain('MT Final Closure closes the enterprise multi-tenant runtime implementation track');
    expect(backlog).toContain('Enterprise Multi-Tenant Runtime Final Closure Backlog Mapping');
  });

  it('avoids unsafe evidence examples and keeps formula/standard boundaries intact', () => {
    for (const relativePath of finalDocs) {
      const content = read(relativePath);
      expect(content).toContain('AI/n8n/service actors cannot');
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(content).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(content).not.toContain('postgres://admin:password');
      expect(content).not.toContain('mongodb+srv://');
      expect(content).not.toContain('4111 1111 1111 1111');
    }

    const pack = read(finalDocs[0]);
    expect(pack).toContain('tenant credentials');
    expect(pack).toContain('customer PII');
    expect(pack).toContain('real customer data');
    expect(pack).toContain('tenant billing details');
    expect(pack).toContain('payment processing data');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');
  });
});
