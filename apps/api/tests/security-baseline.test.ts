import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Sprint 7 security hardening baseline', () => {
  it('marks demo header authentication as local-development only', () => {
    const docs = readRepoFile('docs/security-baseline.md');
    const middleware = readRepoFile('apps/api/src/middleware/request-context.ts');
    expect(docs).toContain('Demo header authentication is local-development only');
    expect(docs).toContain('JWT/session');
    expect(middleware).toContain('LOCAL-DEV ONLY');
  });

  it('does not expose raw internal error messages in production mode', () => {
    const app = readRepoFile('apps/api/src/app.ts');
    expect(app).toContain("config.appEnv === 'local'");
    expect(app).toContain('Internal server error.');
    expect(app).toContain('requestId');
  });


  it('makes OpenAPI dev/internal route scope explicit', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('x-internal-routes-excluded');
    expect(openapi).toContain('/health');
    expect(openapi).toContain('/rbac/demo/asset-read');
  });
});
