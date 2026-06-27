import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, hasPermission } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-G n8n workflow console / orchestration visibility', () => {
  it('adds a read-only workflow console API route with RBAC and service actor blocking', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/workflow-console.ts');
    expect(app).toContain('workflowConsoleRouter');
    expect(app).toContain("app.use('/api/v1', workflowConsoleRouter)");
    expect(route).toContain("workflowConsoleRouter.get('/workflow-console/overview'");
    expect(route).toContain("requirePermission('workflow_console.view')");
    expect(route).toContain('WORKFLOW_CONSOLE_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('SERVICE_WORKFLOW_CONSOLE_BLOCKED_ROLES');
    expect(route).not.toContain('workflowConsoleRouter.post(');
    expect(route).not.toContain('workflowConsoleRouter.patch(');
    expect(route).not.toContain('workflowConsoleRouter.delete(');
  });

  it('adds workflow console visibility permission without granting service mutation/action permissions', () => {
    expect(hasPermission(['admin'], 'workflow_console.view')).toBe(true);
    expect(hasPermission(['it_admin'], 'workflow_console.view')).toBe(true);
    expect(ROLE_PERMISSIONS.ai_agent as readonly string[]).not.toContain('workflow_console.view');

    const roles = readRepoFile('apps/api/src/rbac/roles.ts');
    expect(roles).toContain('workflow_console.view');
    expect(roles).not.toContain('workflow_console.execute');
    expect(roles).not.toContain('workflow_console.retry');
    expect(roles).not.toContain('workflow_console.manage');

    const route = readRepoFile('apps/api/src/routes/workflow-console.ts');
    expect(route).toContain('n8n_service');
    expect(route).toContain('integration_service');
    expect(route).toContain('workflow_service');
    expect(route).toContain('system_service');
  });

  it('summarizes existing workflow/orchestration state and redacts sensitive metadata', () => {
    const route = readRepoFile('apps/api/src/routes/workflow-console.ts');
    for (const token of [
      'workflow_task_summary',
      'pending_human_follow_ups',
      'notification_delivery_status',
      'workflow_failure_error_summary',
      'recent_workflow_events',
      'n8n_boundary'
    ]) {
      expect(route).toContain(token);
    }
    expect(route).toContain('workflow_tasks');
    expect(route).toContain('notification_logs');
    expect(route).toContain('workflow_events');
    expect(route).toContain('error_logs');
    expect(route).toContain('audit_logs');
    expect(route).toContain('SENSITIVE_METADATA_PATTERN');
    expect(route).toContain('webhook secrets');
    expect(route).toContain('signed URLs');
    expect(route).toContain('raw file contents');
    expect(route).toContain('no n8n-written workflow console snapshot table');
    expect(route).not.toContain('create table workflow_console');
  });

  it('adds read-only frontend workflow console page without execution or mutation controls', () => {
    const page = readRepoFile('apps/web/app/workflow-console/WorkflowConsoleClient.tsx');
    expect(page).toContain('n8n Workflow Console / Orchestration Visibility');
    expect(page).toContain('/api/v1/workflow-console/overview');
    expect(page).toContain('Read-only');
    expect(page).toContain('Workflow Task Summary');
    expect(page).toContain('Pending Human Follow-ups');
    expect(page).toContain('Notification Delivery Status');
    expect(page).toContain('Recent Workflow Events');
    expect(page).not.toContain("method: 'POST'");
    expect(page).not.toContain("method: 'PATCH'");
    expect(page).not.toContain("method: 'DELETE'");
    expect(page).not.toContain('Hypercare Dashboard');
    expect(page).not.toContain('NDT Visualization');
  });

  it('documents OpenAPI workflow console endpoint and read-only permission marker', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/workflow-console/overview:');
    expect(openapi).toContain('x-permission-required: workflow_console.view');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('x-workflow-console-visibility: true');
    expect(openapi).toContain('WorkflowConsoleOverviewEnvelope');
    expect(openapi).toContain('webhook_secret');
    expect(openapi).toContain('signed_url');
    expect(openapi).toContain('n8n must not write directly to PostgreSQL');
  });

  it('updates RC3-G UAT, release notes, README, migration tracking, and n8n API-only boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_n8n_workflow_console_scripts.md');
    const release = readRepoFile('docs/release/AIM_RC3G_n8n_workflow_console_report.md');
    const n8n = readRepoFile('05_n8n/rc3g_workflow_console_boundary_addendum.md');
    const readme = readRepoFile('README.md');
    const migrationTest = readRepoFile('apps/api/tests/migration-sequence.test.ts');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');
    const migration = readRepoFile('db/migrations/0024_workflow_console_visibility.sql');

    expect(uat).toContain('confirm workflow task summary appears');
    expect(uat).toContain('confirm no execute/retry/approve/reject/correct/promote/report issue/delete/admin mutation controls exist');
    expect(uat).toContain('confirm n8n boundary remains API-only and cannot write workflow console state directly to PostgreSQL');
    expect(release).toContain('RC3-G');
    expect(readme).toContain('RC3-G n8n Workflow Console / Orchestration Visibility');
    expect(n8n).toContain('n8n must not write directly to PostgreSQL');
    expect(n8n).toContain('n8n must not compute or store workflow console state as final AIM data');
    expect(n8n).toContain('execute or edit n8n workflows from the AIM UI');
    expect(migrationTest).toContain('0024_workflow_console_visibility.sql');
    expect(seed).toContain('workflow_console.view');
    expect(migration).toContain('workflow_console.view');
  });
});
