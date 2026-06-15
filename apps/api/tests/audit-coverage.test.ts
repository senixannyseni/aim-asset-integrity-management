import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('audit log coverage for implemented critical actions', () => {
  it('keeps asset and master-data audit events wired in asset routes', () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/assets.ts'), 'utf8');
    for (const event of [
      'ASSET_CREATED',
      'ASSET_UPDATED',
      'ASSET_DELETED',
      'TANK_GEOMETRY_CREATED',
      'TANK_GEOMETRY_UPDATED',
      'SHELL_COURSE_CREATED',
      'SHELL_COURSE_UPDATED',
      'SHELL_COURSE_DELETED'
    ]) {
      expect(content).toContain(event);
    }
  });

  it('keeps workflow and error logging audit events wired through AIM API routes', () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/operations.ts'), 'utf8');
    expect(content).toContain('WORKFLOW_EVENT_RECEIVED');
    expect(content).toContain('ERROR_LOG_CREATED');
  });
});
