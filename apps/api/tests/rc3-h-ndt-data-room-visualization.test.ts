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

describe('RC3-H NDT data room / visualization governance', () => {
  it('adds a read-only NDT data room API route with RBAC and service actor blocking', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    const route = readRepoFile('apps/api/src/routes/ndt-data-room.ts');
    expect(app).toContain('ndtDataRoomRouter');
    expect(app).toContain("app.use('/api/v1', ndtDataRoomRouter)");
    expect(route).toContain("ndtDataRoomRouter.get('/ndt-data-room/overview'");
    expect(route).toContain("requirePermission('ndt_data_room.view')");
    expect(route).toContain('NDT_DATA_ROOM_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('SERVICE_NDT_DATA_ROOM_BLOCKED_ROLES');
    expect(route).not.toContain('ndtDataRoomRouter.post(');
    expect(route).not.toContain('ndtDataRoomRouter.patch(');
    expect(route).not.toContain('ndtDataRoomRouter.delete(');
  });

  it('adds NDT data room visibility permission without granting service mutation/action permissions', () => {
    expect(hasPermission(['admin'], 'ndt_data_room.view')).toBe(true);
    expect(hasPermission(['engineer'], 'ndt_data_room.view')).toBe(true);
    expect(hasPermission(['management'], 'ndt_data_room.view')).toBe(true);
    expect(ROLE_PERMISSIONS.ai_agent as readonly string[]).not.toContain('ndt_data_room.view');

    const roles = readRepoFile('apps/api/src/rbac/roles.ts');
    expect(roles).toContain('ndt_data_room.view');
    expect(roles).not.toContain('ndt_data_room.approve');
    expect(roles).not.toContain('ndt_data_room.calculate');
    expect(roles).not.toContain('ndt_data_room.manage');

    const route = readRepoFile('apps/api/src/routes/ndt-data-room.ts');
    expect(route).toContain('n8n_service');
    expect(route).toContain('integration_service');
    expect(route).toContain('workflow_service');
    expect(route).toContain('system_service');
  });

  it('summarizes existing NDT/measurement state and redacts sensitive metadata without calculations', () => {
    const route = readRepoFile('apps/api/src/routes/ndt-data-room.ts');
    for (const token of [
      'ndt_method_summary',
      'component_coverage_summary',
      'cml_tml_grid_coverage_summary',
      'evidence_linkage_status',
      'measurement_readiness',
      'latest_measurements',
      'governance_warnings'
    ]) {
      expect(route).toContain(token);
    }
    expect(route).toContain('ndt_measurements');
    expect(route).toContain('evidence_links');
    expect(route).toContain('evidence_files');
    expect(route).toContain('inspection_event_id');
    expect(route).toContain('SENSITIVE_METADATA_PATTERN');
    expect(route).toContain('signed URLs');
    expect(route).toContain('object keys');
    expect(route).toContain('raw evidence/report contents');
    expect(route).toContain('OCR full text');
    expect(route).toContain('no n8n-written NDT data room snapshot table');
    expect(route).toContain('This endpoint does not calculate corrosion rate, remaining life, FFS, RBI, MAWP, retirement thickness, inspection interval, API 579, or API 581 outputs');
    expect(route).not.toContain('create table ndt_data_room');
    expect(route).not.toContain('remaining_life =');
    expect(route).not.toContain('corrosion_rate =');
  });

  it('adds read-only frontend NDT data room page without calculation or mutation controls', () => {
    const page = readRepoFile('apps/web/app/ndt-data-room/NdtDataRoomClient.tsx');
    expect(page).toContain('NDT Data Room / Visualization Governance');
    expect(page).toContain('/api/v1/ndt-data-room/overview');
    expect(page).toContain('Read-only');
    expect(page).toContain('NDT Method Summary');
    expect(page).toContain('Component Coverage Summary');
    expect(page).toContain('CML/TML/Grid Coverage Summary');
    expect(page).toContain('Evidence Linkage Status');
    expect(page).not.toContain("method: 'POST'");
    expect(page).not.toContain("method: 'PATCH'");
    expect(page).not.toContain("method: 'DELETE'");
    expect(page).not.toContain('Hypercare Dashboard');
    expect(page).not.toContain('runCalculation(');
  });

  it('documents OpenAPI NDT data room endpoint and read-only permission marker', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('/api/v1/ndt-data-room/overview:');
    expect(openapi).toContain('x-permission-required: ndt_data_room.view');
    expect(openapi).toContain('x-read-only: true');
    expect(openapi).toContain('x-ndt-data-room-visualization: true');
    expect(openapi).toContain('NdtDataRoomOverviewEnvelope');
    expect(openapi).toContain('x-no-calculation-boundary');
    expect(openapi).toContain('API 579/API 581/FFS/RBI');
    expect(openapi).toContain('object_key');
    expect(openapi).toContain('n8n must not write directly to PostgreSQL');
  });

  it('updates RC3-H UAT, release notes, README, migration tracking, seed, and n8n API-only boundary', () => {
    const uat = readRepoFile('docs/uat/uat_rc3_ndt_data_room_visualization_scripts.md');
    const release = readRepoFile('docs/release/AIM_RC3H_ndt_data_room_visualization_report.md');
    const n8n = readRepoFile('05_n8n/rc3h_ndt_data_room_boundary_addendum.md');
    const readme = readRepoFile('README.md');
    const migrationTest = readRepoFile('apps/api/tests/migration-sequence.test.ts');
    const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');
    const migration = readRepoFile('db/migrations/0025_ndt_data_room_visualization.sql');

    expect(uat).toContain('confirm NDT method summary appears');
    expect(uat).toContain('confirm component coverage summary appears');
    expect(uat).toContain('confirm evidence linkage status appears');
    expect(uat).toContain('confirm no secrets/signed URLs/tokens/credentials/object keys are displayed');
    expect(uat).toContain('confirm no approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls exist');
    expect(uat).toContain('confirm no API 579/API 581/FFS/RBI calculation implementation is introduced');
    expect(uat).toContain('confirm n8n boundary remains API-only and cannot write NDT data room state directly to PostgreSQL');
    expect(release).toContain('RC3-H');
    expect(readme).toContain('RC3-H NDT Data Room / Visualization Governance');
    expect(n8n).toContain('n8n must not write directly to PostgreSQL');
    expect(n8n).toContain('n8n must not compute or store NDT data room state as final AIM data');
    expect(n8n).toContain('perform corrosion rate, remaining life, FFS, RBI, or API 579/API 581 calculations');
    expect(migrationTest).toContain('0025_ndt_data_room_visualization.sql');
    expect(seed).toContain('ndt_data_room.view');
    expect(migration).toContain('ndt_data_room.view');
  });
});
