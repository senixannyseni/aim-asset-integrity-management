import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSIONS } from '../src/rbac/roles.js';
import { redactAuditMetadata } from '../src/modules/audit-log/redaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-D audit log governance visibility', () => {
  it('adds read-only audit log API routes with RBAC and service actor block', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/audit-logs.ts');

    expect(app).toContain("import { auditLogsRouter }");
    expect(app).toContain("app.use('/api/v1', auditLogsRouter)");
    expect(route).toContain("auditLogsRouter.get('/audit-logs'");
    expect(route).toContain("auditLogsRouter.get('/audit-logs/:auditLogId'");
    expect(route).toContain("requirePermission('audit_logs.view')");
    expect(route).toContain('AUDIT_LOG_SERVICE_ACTOR_BLOCKED');
    expect(route).not.toContain('auditLogsRouter.post(');
    expect(route).not.toContain('auditLogsRouter.patch(');
    expect(route).not.toContain('auditLogsRouter.delete(');
  });

  it('supports filters, pagination, safe search, and default created_at descending sort', () => {
    const route = readRepoFile('apps/api/src/routes/audit-logs.ts');
    for (const token of ['event_type', 'entity_type', 'entity_id', 'actor_user_id', 'from', 'to', 'search', 'limit', 'offset']) {
      expect(route).toContain(token);
    }
    expect(route).toContain('order by al.created_at desc, al.id desc');
    expect(route).toContain('MAX_LIMIT = 100');
    expect(route).toContain('has_next_page');
    expect(route).toContain('safe fields');
  });

  it('redacts sensitive audit metadata before API/UI display', () => {
    const redacted = redactAuditMetadata({
      token: 'abc',
      nested: {
        signed_url: 'https://bucket.local/file?X-Amz-Signature=secret',
        ok: 'visible'
      },
      authorization: 'Bearer demo',
      access_key: 'AKIA...'
    }) as Record<string, unknown>;

    expect(redacted.token).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).signed_url).toBe('[REDACTED]');
    expect((redacted.nested as Record<string, unknown>).ok).toBe('visible');
    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.access_key).toBe('[REDACTED]');
  });

  it('adds audit_logs.view permission but does not grant it to the AI agent role', () => {
    expect(PERMISSIONS).toContain('audit_logs.view');
    expect(hasPermission(['admin'], 'audit_logs.view')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'audit_logs.view')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'audit_logs.view')).toBe(true);
    expect(hasPermission(['ai_agent'], 'audit_logs.view')).toBe(false);
  });

  it('documents OpenAPI audit log endpoints, redaction, and permission marker', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/audit-logs:');
    expect(openapi).toContain('/api/v1/audit-logs/{auditLogId}:');
    expect(openapi).toContain('x-permission-required: audit_logs.view');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('x-redaction-required: true');
    expect(openapi).toContain('AuditLogEntry');
    expect(openapi).toContain('signed_url');
    expect(openapi).toContain('presigned_url');
  });

  it('adds read-only frontend page without mutation controls', () => {
    const page = readRepoFile('apps/web/app/audit-logs/AuditLogsClient.tsx');
    expect(page).toContain('Audit Log Governance');
    expect(page).toContain('/api/v1/audit-logs');
    expect(page).toContain('Read-only');
    expect(page).toContain('audit_logs.view');
    expect(page).toContain('redacted');
    expect(page).not.toContain('method: \'POST\'');
    expect(page).not.toContain('method: \'PATCH\'');
    expect(page).not.toContain('method: \'DELETE\'');
    expect(page).not.toContain('Approve');
    expect(page).not.toContain('Promote');
  });

  it('updates RC3-D UAT, release notes, and n8n API-only boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_audit_log_governance_visibility_scripts.md');
    const n8n = readRepoFile('05_n8n/rc3d_audit_log_governance_visibility_addendum.md');
    const release = readRepoFile('docs/release/AIM_RC3D_audit_log_governance_visibility_report.md');

    expect(uat).toContain('audit_logs.view');
    expect(uat).toContain('[REDACTED]');
    expect(uat).toContain('AUDIT_LOG_SERVICE_ACTOR_BLOCKED');
    expect(n8n).toContain('must not write directly to PostgreSQL');
    expect(n8n).toContain('must not edit audit logs');
    expect(release).toContain('RC3-D');
    expect(release).toContain('read-only');
  });
});
