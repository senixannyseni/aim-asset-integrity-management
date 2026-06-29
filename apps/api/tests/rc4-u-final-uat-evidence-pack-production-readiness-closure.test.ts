import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-U Final UAT Evidence Pack + Production Readiness Closure', () => {
  it('adds a read-only release closure API with human-only governance boundaries', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/release-closure.ts');

    expect(app).toContain('releaseClosureRouter');
    expect(route).toContain("releaseClosureRouter.get('/release-closure/readiness'");
    expect(route).toContain("requirePermission('golive_readiness.view')");
    expect(route).toContain('buildReleaseClosureReadiness');
    expect(route).toContain('enforceHumanReleaseClosureViewer');
    expect(route).toContain('RELEASE_CLOSURE_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('AI, n8n, service, workflow, and integration actors cannot access or finalize release closure readiness');
    expect(route).toContain('uat_evidence_pack_present');
    expect(route).toContain('uat_execution_evidence_attached');
    expect(route).toContain('production_deployment_verified');
    expect(route).toContain('rollback_plan_verified');
    expect(route).toContain('security_backup_restore_dr_closure');
    expect(route).toContain('hypercare_plan_ready');
    expect(route).toContain('known_exclusions_documented');
    expect(route).toContain('release_signoff_matrix_present');
    expect(route).toContain('module_readiness_chain_visible');
    expect(route).toContain('no_formula_execution');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/release-closure/readiness'");
    const readinessRoute = route.slice(readinessStart);
    expect(readinessRoute).not.toContain('insert into');
    expect(readinessRoute).not.toContain('update ');
    expect(readinessRoute).not.toContain('delete from');
  });

  it('documents final UAT evidence, production readiness, rollback, hypercare, signoff, and exclusions', () => {
    const route = readRepoFile('apps/api/src/routes/release-closure.ts');
    const uat = readRepoFile('docs/uat/uat_rc4u_final_uat_evidence_pack.md');
    const production = readRepoFile('docs/operations/rc4u_production_readiness_closure_checklist.md');
    const rollback = readRepoFile('docs/operations/rc4u_deployment_verification_and_rollback_checklist.md');
    const matrix = readRepoFile('docs/release/final_release_candidate_closure_matrix.md');

    expect(route).toContain('docs/uat/uat_rc4u_final_uat_evidence_pack.md');
    expect(route).toContain('docs/operations/rc4u_production_readiness_closure_checklist.md');
    expect(route).toContain('docs/operations/rc4u_deployment_verification_and_rollback_checklist.md');
    expect(route).toContain('docs/release/final_release_candidate_closure_matrix.md');
    expect(route).toContain('External SAP/Maximo/CMMS integration is intentionally excluded');
    expect(route).toContain('API 579/API 581 proprietary quantitative formulas are intentionally excluded');
    expect(route).toContain('AI/OCR extraction remains staging-only');
    expect(route).toContain('n8n remains orchestration-only');

    expect(uat).toContain('Final UAT Evidence Pack');
    expect(uat).toContain('Asset-to-work-order chain walkthrough');
    expect(uat).toContain('Human signoff matrix');
    expect(production).toContain('Production Readiness Closure Checklist');
    expect(production).toContain('Object storage');
    expect(production).toContain('Backup');
    expect(rollback).toContain('Deployment Verification and Rollback Checklist');
    expect(rollback).toContain('Rollback does not delete or rewrite evidence objects');
    expect(matrix).toContain('Final Release Candidate Closure Matrix');
    expect(matrix).toContain('Final decision: Go / Conditional Go / No-Go');
  });

  it('adds release closure frontend navigation and dashboard panels', () => {
    const home = readRepoFile('apps/web/app/page.tsx');
    const client = readRepoFile('apps/web/app/release-closure/ReleaseClosureClient.tsx');
    const page = readRepoFile('apps/web/app/release-closure/page.tsx');

    expect(home).toContain("href: '/release-closure'");
    expect(page).toContain('ReleaseClosureClient');
    expect(client).toContain('/api/v1/release-closure/readiness');
    expect(client).toContain('Release Closure Readiness');
    expect(client).toContain('Final Release Closure Status');
    expect(client).toContain('Release Candidate Consolidation Chain');
    expect(client).toContain('UAT Evidence Pack');
    expect(client).toContain('Production Closure Checklists');
    expect(client).toContain('Release Signoff Matrix');
    expect(client).toContain('Known Exclusions');
    expect(client).toContain('Read-only Controls Boundary');
  });

  it('updates OpenAPI, release docs, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const release = readRepoFile('docs/release/AIM_RC4U_final_uat_evidence_pack_production_readiness_closure_report.md');

    expect(openapi).toContain('/api/v1/release-closure/readiness');
    expect(openapi).toContain('ReleaseClosureReadiness');
    expect(openapi).toContain('ReleaseClosureReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('AI/n8n/service actors cannot finalize release closure readiness or approve go-live');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(readme).toContain('RC4-U Final UAT Evidence Pack + Production Readiness Closure');
    expect(sprint).toContain('RC4-U — Final UAT Evidence Pack + Production Readiness Closure');
    expect(release).toContain('RC4-U');
    expect(release).toContain('Scoped AIM MVP: approximately 92% complete');
    expect(release).toContain('AI/n8n/service actors cannot finalize release closure readiness');
  });
});
