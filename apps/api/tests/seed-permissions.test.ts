import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS, type Role } from '../src/rbac/roles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Sprint 7 RBAC seed consistency', () => {
  const seed = readRepoFile('db/seeds/0001_foundation_seed.sql');

  it('seeds every implemented permission for DB-backed RBAC readiness', () => {
    for (const permission of PERMISSIONS) {
      expect(seed, `missing permission ${permission}`).toContain(`'${permission}'`);
    }
  });

  it('keeps ai_agent free of approval and finalization permissions', () => {
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('ffs.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('ffs.close');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('ndt.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('formula.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('calculation.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('integrity_decision.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('report.approve');
    expect(ROLE_PERMISSIONS.ai_agent).not.toContain('report.issue');
  });

  it('documents DB seed synchronization with TypeScript role map', () => {
    expect(seed).toContain('Sprint 7 governance hardening permission synchronization');
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      expect(seed).toContain(role);
    }
  });
});
