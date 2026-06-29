import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..');
function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('RC4-W Security Review Evidence + Operational Monitoring Closure', () => {
  it('adds a read-only security monitoring API with human-only governance boundaries', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/security-monitoring.ts');

    expect(app).toContain('securityMonitoringRouter');
    expect(route).toContain("securityMonitoringRouter.get('/security-monitoring/readiness'");
    expect(route).toContain("requirePermission('golive_readiness.view')");
    expect(route).toContain('buildSecurityMonitoringReadiness');
    expect(route).toContain('enforceHumanSecurityMonitoringViewer');
    expect(route).toContain('SECURITY_MONITORING_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('AI, n8n, service, workflow, and integration actors cannot finalize security review, monitoring closure, or operational signoff');
    expect(route).toContain('secrets_configuration_reviewed');
    expect(route).toContain('rbac_permission_matrix_verified');
    expect(route).toContain('service_actor_boundary_verified');
    expect(route).toContain('audit_log_redaction_verified');
    expect(route).toContain('vulnerability_scan_reviewed');
    expect(route).toContain('dependency_license_reviewed');
    expect(route).toContain('security_headers_cors_reviewed');
    expect(route).toContain('monitoring_dashboard_verified');
    expect(route).toContain('alert_routing_verified');
    expect(route).toContain('incident_response_runbook_ready');
    expect(route).toContain('log_retention_backup_verified');
    expect(route).toContain('operational_access_review_signed_off');
    expect(route).toContain('no_formula_execution');
    expect(route).toContain('ai_n8n_finalization_absent');
    expect(route).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');

    const readinessStart = route.indexOf("'/security-monitoring/readiness'");
    const readinessRoute = route.slice(readinessStart);
    expect(readinessRoute).not.toContain('insert into');
    expect(readinessRoute).not.toContain('update ');
    expect(readinessRoute).not.toContain('delete from');
  });

  it('documents security review, monitoring, alert routing, incident response, and signoff evidence', () => {
    const route = readRepoFile('apps/api/src/routes/security-monitoring.ts');
    const security = readRepoFile('docs/security/rc4w_security_review_evidence.md');
    const monitoring = readRepoFile('docs/operations/rc4w_operational_monitoring_closure.md');
    const incident = readRepoFile('docs/operations/rc4w_incident_response_alert_routing_runbook.md');
    const signoff = readRepoFile('docs/release/rc4w_security_monitoring_signoff_evidence.md');

    expect(route).toContain('docs/security/rc4w_security_review_evidence.md');
    expect(route).toContain('docs/operations/rc4w_operational_monitoring_closure.md');
    expect(route).toContain('docs/operations/rc4w_incident_response_alert_routing_runbook.md');
    expect(route).toContain('docs/release/rc4w_security_monitoring_signoff_evidence.md');
    expect(route).toContain('secrets');
    expect(route).toContain('RBAC');
    expect(route).toContain('audit-log redaction');

    expect(security).toContain('Security Review Evidence');
    expect(security).toContain('Do not paste secrets, JWTs, passwords, signed URLs, object keys, private credentials, or vulnerability exploit details');
    expect(security).toContain('RBAC and service actor boundary verification');
    expect(monitoring).toContain('Operational Monitoring Closure');
    expect(monitoring).toContain('API health, frontend availability, database connectivity, object-storage connectivity, and error-rate visibility');
    expect(incident).toContain('Incident Response and Alert Routing Runbook');
    expect(incident).toContain('Incident escalation route');
    expect(signoff).toContain('Security Monitoring Signoff Evidence');
    expect(signoff).toContain('Go / Conditional Go / No-Go');
  });

  it('adds security monitoring frontend navigation and dashboard panels', () => {
    const home = readRepoFile('apps/web/app/page.tsx');
    const client = readRepoFile('apps/web/app/security-monitoring/SecurityMonitoringClient.tsx');
    const page = readRepoFile('apps/web/app/security-monitoring/page.tsx');

    expect(home).toContain("href: '/security-monitoring'");
    expect(page).toContain('SecurityMonitoringClient');
    expect(client).toContain('/api/v1/security-monitoring/readiness');
    expect(client).toContain('Security Monitoring Readiness');
    expect(client).toContain('Security Monitoring Closure Status');
    expect(client).toContain('Security Monitoring Closure Chain');
    expect(client).toContain('Security Monitoring Evidence Pack');
    expect(client).toContain('Monitoring Matrix');
    expect(client).toContain('Security / Operations Signoff Roles');
    expect(client).toContain('Read-only Controls Boundary');
  });

  it('updates OpenAPI, release docs, README, and sprint status', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const release = readRepoFile('docs/release/AIM_RC4W_security_review_operational_monitoring_closure_report.md');

    expect(openapi).toContain('/api/v1/security-monitoring/readiness');
    expect(openapi).toContain('SecurityMonitoringReadiness');
    expect(openapi).toContain('SecurityMonitoringReadinessGate');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('AI/n8n/service actors cannot finalize security review, monitoring closure, or operational signoff');
    expect(openapi).toContain('No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed');
    expect(readme).toContain('RC4-W Security Review Evidence + Operational Monitoring Closure');
    expect(sprint).toContain('RC4-W — Security Review Evidence + Operational Monitoring Closure');
    expect(release).toContain('RC4-W');
    expect(release).toContain('Scoped AIM MVP: approximately 94% complete');
    expect(release).toContain('AI/n8n/service actors cannot finalize security monitoring closure');
  });
});
