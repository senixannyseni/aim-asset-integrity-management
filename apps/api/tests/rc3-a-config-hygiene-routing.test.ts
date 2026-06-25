import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const originalEnv = { ...process.env };

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_ENV: 'production',
    PORT: '4000',
    CORS_ORIGIN: 'https://aim.example.test',
    DATABASE_URL: 'postgresql://aim_user:aim_password@db.example.test:5432/aim_tank_integrity',
    AUTH_JWT_SECRET: 'strong-production-secret-value-1234567890',
    AUTH_TOKEN_ISSUER: 'aim-api-production',
    AUTH_ACCESS_TOKEN_TTL_SECONDS: '900',
    AUTH_REFRESH_TOKEN_TTL_SECONDS: '604800',
    AUTH_REQUIRE_STRONG_SECRET_IN_PRODUCTION: 'true',
    AUTH_ALLOW_LOCAL_DEMO: 'false',
    OBJECT_STORAGE_PROVIDER: 's3-compatible',
    OBJECT_STORAGE_ENDPOINT: 'https://object-storage.example.test',
    OBJECT_STORAGE_REGION: 'ap-southeast-1',
    OBJECT_STORAGE_BUCKET: 'aim-evidence-production',
    OBJECT_STORAGE_ACCESS_KEY_ID: 'production-access-key-id',
    OBJECT_STORAGE_SECRET_ACCESS_KEY: 'production-secret-access-key',
    OBJECT_STORAGE_FORCE_PATH_STYLE: 'true',
    OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: '900',
    EVIDENCE_MAX_FILE_SIZE_BYTES: '104857600',
    EVIDENCE_ALLOWED_MIME_TYPES: 'application/pdf,image/jpeg,image/png',
    EVIDENCE_ALLOWED_EXTENSIONS: '.pdf,.jpg,.jpeg,.png',
    N8N_FILE_INTAKE_WEBHOOK_URL: 'https://n8n.example.test/webhook/aim-file-intake',
    N8N_VALIDATION_NOTIFICATION_WEBHOOK_URL: 'https://n8n.example.test/webhook/aim-validation-notification',
    N8N_REVIEW_NOTIFICATION_WEBHOOK_URL: 'https://n8n.example.test/webhook/aim-review-notification',
    N8N_REPORT_GENERATION_WEBHOOK_URL: 'https://n8n.example.test/webhook/aim-report-generation',
    N8N_ERROR_QUEUE_WEBHOOK_URL: 'https://n8n.example.test/webhook/aim-error-queue',
    REPORT_GENERATOR_BASE_URL: 'https://report-generator.example.test',
    REPORT_GENERATOR_API_KEY: 'strong-report-generator-api-key',
    REPORT_TEMPLATE_BUCKET: 'aim-report-templates',
    REPORT_OUTPUT_BUCKET: 'aim-report-output',
    REPORT_DEFAULT_TEMPLATE_ID: 'tank-integrity-mvp-v1',
    REPORT_GENERATION_TIMEOUT_SECONDS: '120',
    ...overrides
  };
}

async function importAppWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...originalEnv, ...env };
  return import('../src/app.js');
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('RC3-A environment/config alignment', () => {
  it('documents the actual auth and object storage variable names in .env.example', () => {
    const envExample = readRepoFile('.env.example');
    for (const variableName of [
      'AUTH_TOKEN_ISSUER',
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
      'AUTH_REFRESH_TOKEN_TTL_SECONDS',
      'AUTH_ALLOW_LOCAL_DEMO',
      'AUTH_LOCAL_DEMO_PASSWORD',
      'AUTH_REQUIRE_STRONG_SECRET_IN_PRODUCTION',
      'OBJECT_STORAGE_ACCESS_KEY_ID',
      'OBJECT_STORAGE_SECRET_ACCESS_KEY',
      'EVIDENCE_MAX_FILE_SIZE_BYTES',
      'EVIDENCE_ALLOWED_MIME_TYPES',
      'EVIDENCE_ALLOWED_EXTENSIONS'
    ]) {
      expect(envExample).toContain(variableName);
    }
    expect(envExample).not.toContain('AUTH_JWT_ISSUER=');
    expect(envExample).not.toContain('AUTH_JWT_AUDIENCE=');
    expect(envExample).not.toContain('AUTH_SESSION_COOKIE_NAME=');
  });

  it('rejects weak JWT secrets in production-like environments', () => {
    expect(() => loadConfig(productionEnv({ AUTH_JWT_SECRET: 'change-me' }))).toThrow(/AUTH_JWT_SECRET must be a strong secret/);
  });

  it('rejects missing object-storage config in production-like environments', () => {
    expect(() => loadConfig(productionEnv({ OBJECT_STORAGE_ENDPOINT: undefined }))).toThrow(/OBJECT_STORAGE_ENDPOINT/);
    expect(() => loadConfig(productionEnv({ OBJECT_STORAGE_ACCESS_KEY_ID: undefined }))).toThrow(/OBJECT_STORAGE_ACCESS_KEY_ID/);
  });

  it('keeps local demo auth disabled in production-like environments even if requested', () => {
    const cfg = loadConfig(productionEnv({ AUTH_ALLOW_LOCAL_DEMO: 'true' }));
    expect(cfg.allowLocalDemoAuth).toBe(false);
  });
});

describe('RC3-A repository hygiene and frontend root route', () => {
  it('passes repository hygiene checks', () => {
    const output = execFileSync('node', ['scripts/repo-hygiene.mjs'], { cwd: repoRoot, encoding: 'utf8' });
    expect(output).toContain('Repository hygiene check passed');
  });

  it('adds a frontend root route so / no longer falls through to 404', () => {
    const rootPage = readRepoFile('apps/web/app/page.tsx');
    expect(rootPage).toContain('AIM Tank Integrity');
    expect(rootPage).toContain("href=\"/login\"");
    expect(rootPage).toContain("href=\"/integrity-decisions\"");
    expect(rootPage).toContain('Controlled engineering workspace');
  });
});

describe('RC3-A RBAC demo route and demo header gating', () => {
  it('keeps RBAC demo routes available in explicit local demo mode', async () => {
    const { createApp } = await importAppWithEnv({
      APP_ENV: 'local',
      AUTH_ALLOW_LOCAL_DEMO: 'true',
      AUTH_JWT_SECRET: 'local-dev-secret-change-me-32-chars-minimum',
      AUTH_TOKEN_ISSUER: 'aim-api-local'
    });

    await request(createApp())
      .get('/api/v1/rbac/demo/asset-read')
      .set('x-aim-demo-roles', 'admin')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ ok: true, permission: 'asset.read' });
      });
  });

  it('does not mount RBAC demo routes in production-like environments', async () => {
    const { createApp } = await importAppWithEnv(productionEnv({ AUTH_ALLOW_LOCAL_DEMO: 'true' }));

    await request(createApp())
      .get('/api/v1/rbac/demo/asset-read')
      .set('x-aim-demo-roles', 'admin')
      .expect(404);
  });

  it('does not allow demo headers in production-like CORS responses', async () => {
    const { createApp } = await importAppWithEnv(productionEnv({ AUTH_ALLOW_LOCAL_DEMO: 'true' }));

    await request(createApp())
      .options('/api/v1/assets')
      .expect(204)
      .expect((res) => {
        const allowedHeaders = res.header['access-control-allow-headers'] ?? '';
        expect(allowedHeaders).toContain('Authorization');
        expect(allowedHeaders).not.toContain('x-aim-demo-roles');
        expect(allowedHeaders).not.toContain('x-aim-demo-user-id');
        expect(allowedHeaders).not.toContain('x-aim-demo-email');
      });
  });
});
