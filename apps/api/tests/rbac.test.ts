import { describe, expect, it } from 'vitest';
import { hasPermission, permissionsForRoles } from '../src/rbac/roles.js';

describe('RBAC permission mapping', () => {
  it('grants admin all critical approval permissions', () => {
    expect(hasPermission(['admin'], 'calculation.approve')).toBe(true);
    expect(hasPermission(['admin'], 'report.issue')).toBe(true);
    expect(hasPermission(['admin'], 'admin.manage')).toBe(true);
  });

  it('blocks ai_agent from engineering approval permissions', () => {
    expect(hasPermission(['ai_agent'], 'calculation.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'integrity_decision.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'report.issue')).toBe(false);
    expect(hasPermission(['ai_agent'], 'ai_extraction.create')).toBe(true);
  });

  it('keeps client_viewer read-only', () => {
    const permissions = permissionsForRoles(['client_viewer']);
    expect(permissions.has('asset.read')).toBe(true);
    expect(permissions.has('evidence.read')).toBe(true);
    expect(permissions.has('asset.update')).toBe(false);
    expect(permissions.has('work_order.create')).toBe(false);
  });

  it('allows engineer to run but not approve calculations', () => {
    expect(hasPermission(['engineer'], 'calculation.run')).toBe(true);
    expect(hasPermission(['engineer'], 'calculation.approve')).toBe(false);
  });

  it('allows senior_engineer to approve calculation and integrity decisions', () => {
    expect(hasPermission(['senior_engineer'], 'calculation.approve')).toBe(true);
    expect(hasPermission(['senior_engineer'], 'integrity_decision.approve')).toBe(true);
  });
});
