import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-V Production Environment Validation + Release Candidate Signoff Evidence', () => {
  it('adds a read-only production validation API with human-only governance boundaries', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/production-validation.ts');

    expect(app).toContain('productionValidationRouter');
    expect(route).toContain("productionValidationRouter.get('/production-validation/readiness'");
    expect(route).toContain("requirePermission('golive_readiness.view')");
    expect(route).toContain('buildProductionValidationReadiness');
    expect(route).toContain('enforceHumanProductionValidationViewer');
    expect(route).toContain('PRODUCTION_VALIDATION_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('AI, n8n, service, workflow, and integration actors cannot access or finalize production validation signoff');
    expect(route).toContain('release_tag_verified');
    expect(route).toContain('build_artifact_verified');
    expect(route).toContain('environment_configuration_verified');
    expect(route).toContain('database_migration_verified');
    expect(route).toContain('object_storage_runtime_verified');
    expect(route).toContain('api_smoke_tests_passed');
    expect(route).toContain('frontend_route_smoke_tests_passed');
    expect(route).toContain('backup_restore_drill_verified');
    expect(route).toContain('monitoring_alerting_verified');
    expect(route).toContain('security_access_review_verified');
    expect(route).toContain('open_defect_disposition_recorded');
    expect(route).toContain('human_go_no_go_signoff_ready');
    expect(route).toContain('no_formula_execution');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/production-validation/readiness'");
    const readinessRoute = route.slice(readinessStart);
    expect(readinessRoute).not.toContain('insert into');
    expect(readinessRoute).not.toContain('update ');
    expect(readinessRoute).not.toContain('delete from');
  });

  it('documents production environment validation, smoke tests, backup/restore, monitoring, security, and signoff evidence', () => {
    const route = readRepoFile('apps/api/src/routes/production-validation.ts');
    const environment = readRepoFile('docs/operations/rc4v_production_environment_validation_evidence.md');
    const smoke = readRepoFile('docs/operations/rc4v_smoke_test_execution_record.md');
    const backup = readRepoFile('docs/operations/rc4v_backup_restore_drill_record.md');
    const monitoring = readRepoFile('docs/operations/rc4v_monitoring_alerting_verification.md');
    const signoff = readRepoFile('docs/release/rc4v_release_candidate_signoff_evidence.md');

    expect(route).toContain('docs/operations/rc4v_production_environment_validation_evidence.md');
    expect(route).toContain('docs/operations/rc4v_smoke_test_execution_record.md');
    expect(route).toContain('docs/operations/rc4v_backup_restore_drill_record.md');
    expect(route).toContain('docs/operations/rc4v_monitoring_alerting_verification.md');
    expect(route).toContain('docs/release/rc4v_release_candidate_signoff_evidence.md');
    expect(route).toContain('release tag');
    expect(route).toContain('object-storage target');
    expect(route).toContain('PostgreSQL recovery');

    expect(environment).toContain('Production Environment Validation Evidence');
    expect(environment).toContain('Do not paste secrets, JWTs, passwords, signed URLs, object keys, or private credentials');
    expect(environment).toContain('Release tag / commit verification');
    expect(smoke).toContain('Smoke Test Execution Record');
    expect(smoke).toContain('/api/v1/production-validation/readiness');
    expect(backup).toContain('Backup and Restore Drill Record');
    expect(backup).toContain('Rollback does not delete or rewrite evidence objects');
    expect(monitoring).toContain('Monitoring and Alerting Verification');
    expect(monitoring).toContain('Incident escalation route');
    expect(signoff).toContain('Release Candidate Signoff Evidence');
    expect(signoff).toContain('Go / Conditional Go / No-Go');
  });

  it('adds production validation frontend navigation and dashboard panels', () => {
    const home = readRepoFile('apps/web/app/page.tsx');
    const client = readRepoFile('apps/web/app/production-validation/ProductionValidationClient.tsx');
    const page = readRepoFile('apps/web/app/production-validation/page.tsx');

    expect(home).toContain("href: '/production-validation'");
    expect(page).toContain('ProductionValidationClient');
    expect(client).toContain('/api/v1/production-validation/readiness');
    expect(client).toContain('Production Validation Readiness');
    expect(client).toContain('Production Environment Validation Status');
    expect(client).toContain('Production Validation Chain');
    expect(client).toContain('Production Evidence Pack');
    expect(client).toContain('Smoke Test Matrix');
    expect(client).toContain('Final Human Signoff Roles');
    expect(client).toContain('Read-only Controls Boundary');
  });

  it('updates OpenAPI, release docs, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const release = readRepoFile('docs/release/AIM_RC4V_production_environment_validation_release_candidate_signoff_report.md');

    expect(openapi).toContain('/api/v1/production-validation/readiness');
    expect(openapi).toContain('ProductionValidationReadiness');
    expect(openapi).toContain('ProductionValidationReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('AI/n8n/service actors cannot finalize production validation or approve go-live');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(readme).toContain('RC4-V Production Environment Validation + Release Candidate Signoff Evidence');
    expect(sprint).toContain('RC4-V — Production Environment Validation + Release Candidate Signoff Evidence');
    expect(release).toContain('RC4-V');
    expect(release).toContain('Scoped AIM MVP: approximately 93% complete');
    expect(release).toContain('AI/n8n/service actors cannot finalize production validation');
  });
});
