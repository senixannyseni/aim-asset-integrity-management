import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-E admin governance console', () => {
  it('adds admin governance API routes with authentication, RBAC, and service actor blocking', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/admin-governance.ts');
    expect(app).toContain('adminGovernanceRouter');
    for (const endpoint of [
      "'/admin-governance/users'",
      "'/admin-governance/roles'",
      "'/admin-governance/permissions'",
      "'/admin-governance/role-permissions'",
      "'/admin-governance/user-roles'",
      "'/admin-governance/system-settings'",
      "'/admin-governance/system-settings/:settingKey'"
    ]) {
      expect(route).toContain(endpoint);
    }
    expect(route).toContain("requirePermission('admin_governance.view')");
    expect(route).toContain("requirePermission('admin_governance.manage_roles')");
    expect(route).toContain("requirePermission('admin_governance.manage_settings')");
    expect(route).toContain('ADMIN_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('isServiceAdminActor');
  });

  it('does not expose credential fields in user/system-setting responses and blocks secret settings', () => {
    const route = readRepoFile('apps/api/src/routes/admin-governance.ts');
    expect(route).toContain('password_hash');
    expect(route).toContain('password_hash_algorithm');
    expect(route).toContain('refresh_tokens');
    expect(route).toContain('mfa_secret');
    expect(route).toContain('SENSITIVE_SETTING_PATTERN');
    expect(route).toContain('secret_blocked');
    expect(route).toContain('ADMIN_SYSTEM_SETTING_UPDATE_BLOCKED');
    expect(route).toContain('redactAuditMetadata');
  });

  it('adds safe admin mutation controls with reason, audit events, self-escalation, and last-admin guards', () => {
    const route = readRepoFile('apps/api/src/routes/admin-governance.ts');
    expect(route).toContain('ADMIN_USER_ROLE_ASSIGNED');
    expect(route).toContain('ADMIN_USER_ROLE_REMOVED');
    expect(route).toContain('ADMIN_SYSTEM_SETTING_UPDATED');
    expect(route).toContain('ADMIN_SELF_ESCALATION_BLOCKED');
    expect(route).toContain('LAST_ADMIN_REMOVAL_BLOCKED');
    expect(route).toContain('ADMIN_REASON_REQUIRED');
    expect(route).toContain('isMeaningfulReason');
    expect(route).toContain('begin');
    expect(route).toContain('commit');
    expect(route).toContain('rollback');
  });

  it('adds admin governance permissions but does not grant them to ai_agent', () => {
    const roles = readRepoFile('apps/api/src/rbac/roles.ts');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');
    const migration = readRepoFile('db/migrations/0023_admin_governance_console.sql');
    for (const permission of ['admin_governance.view', 'admin_governance.manage_roles', 'admin_governance.manage_settings']) {
      expect(roles).toContain(permission);
      expect(seed).toContain(permission);
      expect(migration).toContain(permission);
      expect(ROLE_PERMISSIONS.ai_agent as readonly string[]).not.toContain(permission);
    }
  });

  it('documents admin governance OpenAPI endpoints and permission markers', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const apiPath of [
      '/api/v1/admin-governance/users',
      '/api/v1/admin-governance/roles',
      '/api/v1/admin-governance/permissions',
      '/api/v1/admin-governance/role-permissions',
      '/api/v1/admin-governance/user-roles',
      '/api/v1/admin-governance/system-settings',
      '/api/v1/admin-governance/system-settings/{settingKey}'
    ]) {
      expect(openapi).toContain(apiPath);
    }
    expect(openapi).toContain('x-permission-required: admin_governance.view');
    expect(openapi).toContain('x-permission-required: admin_governance.manage_roles');
    expect(openapi).toContain('x-permission-required: admin_governance.manage_settings');
    expect(openapi).toContain('AdminUserRoleChangeRequest');
    expect(openapi).toContain('AdminSystemSettingUpdateRequest');
  });

  it('adds frontend admin governance page and avoids out-of-scope controls', () => {
    const page = readRepoFile('apps/web/app/admin-governance/AdminGovernanceClient.tsx');
    expect(page).toContain('Admin Governance Console');
    expect(page).toContain('/api/v1/admin-governance/users');
    expect(page).toContain('/api/v1/admin-governance/system-settings');
    expect(page).toContain('direct database editor');
    expect(page).toContain('n8n workflow console');
    expect(page).not.toContain('Hypercare Dashboard');
    expect(page).not.toContain('NDT Visualization');
    expect(page).not.toContain('Secret Editor');
  });

  it('updates RC3-E UAT, release notes, and n8n boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_admin_governance_console_scripts.md');
    const release = readRepoFile('docs/release/AIM_RC3E_admin_governance_console_report.md');
    const n8n = readRepoFile('05_n8n/rc3e_admin_governance_console_boundary_addendum.md');
    expect(uat).toContain('attempt secret setting update and confirm blocked');
    expect(uat).toContain('confirm no audit log edit/delete controls exist');
    expect(release).toContain('RC3-E');
    expect(n8n).toContain('n8n must not write directly to PostgreSQL');
    expect(n8n).toContain('assign roles');
    expect(n8n).toContain('update system settings');
  });
});
