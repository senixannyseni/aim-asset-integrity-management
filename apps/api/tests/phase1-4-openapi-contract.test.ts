import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const routeMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

type ImplementedRoute = {
  routeFile: string;
  method: string;
  path: string;
};

function implementedApiRoutes(): ImplementedRoute[] {
  const routesDir = path.join(repoRoot, 'apps/api/src/routes');
  const excluded = new Set(['health.ts', 'rbac-demo.ts']);
  return fs.readdirSync(routesDir)
    .filter((file) => file.endsWith('.ts') && !excluded.has(file))
    .flatMap((file): ImplementedRoute[] => {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const matches = Array.from(content.matchAll(/\.\s*(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g));
      const routes: ImplementedRoute[] = [];

      for (const match of matches) {
        const method = match[1];
        const routePath = match[2];
        if (!method || !routePath) continue;
        routes.push({
          routeFile: file,
          method,
          path: `/api/v1${routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`
        });
      }

      return routes;
    });
}

function openApiPathSet(openapi: string): Set<string> {
  const paths: string[] = [];

  for (const match of openapi.matchAll(/^  (\/api\/v1\/[^:]+):\s*$/gm)) {
    const openapiPath = match[1];
    if (openapiPath) paths.push(openapiPath);
  }

  return new Set<string>(paths);
}

function pathSection(openapi: string, apiPath: string): string {
  const startMarker = `  ${apiPath}:`;
  const start = openapi.indexOf(startMarker);
  if (start < 0) return '';
  const rest = openapi.slice(start + startMarker.length);
  const next = rest.search(/\n  \/api\/v1\//);
  return next >= 0 ? rest.slice(0, next) : rest;
}

function methodSection(openapi: string, apiPath: string, method: string): string {
  const section = pathSection(openapi, apiPath);
  const startMarker = `\n    ${method}:`;
  const start = section.indexOf(startMarker);
  if (start < 0) return '';
  const rest = section.slice(start + startMarker.length);
  const next = rest.search(new RegExp(`\\n    (${routeMethods.join('|')}):`));
  return next >= 0 ? rest.slice(0, next) : rest;
}

describe('Phase 1.4 OpenAPI contract alignment', () => {
  it('covers every implemented production API route in OpenAPI', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const openapiPaths = openApiPathSet(openapi);
    const missing = implementedApiRoutes()
      .filter((route) => !openapiPaths.has(route.path))
      .map((route) => `${route.method.toUpperCase()} ${route.path} (${route.routeFile})`);

    expect(missing).toEqual([]);
  });

  it('requires permission metadata for every implemented protected operation', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const missing = implementedApiRoutes()
      .filter((route) => !methodSection(openapi, route.path, route.method).includes('x-permission-required:'))
      .map((route) => `${route.method.toUpperCase()} ${route.path}`);

    expect(missing).toEqual([]);
    expect(methodSection(openapi, '/api/v1/auth/login', 'post')).toContain('x-permission-required: public');
  });

  it('marks approval, rejection, correction, promotion, deletion approval, and report issue operations as audited', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const auditedRoutes = implementedApiRoutes().filter((route) =>
      /approve|reject|review|promote|issue|delete-approve/.test(route.path)
    );
    const missing = auditedRoutes
      .filter((route) => !methodSection(openapi, route.path, route.method).includes('x-audit-event-generated:'))
      .map((route) => `${route.method.toUpperCase()} ${route.path}`);

    expect(missing).toEqual([]);
    expect(methodSection(openapi, '/api/v1/extraction-fields/{fieldId}/review', 'post')).toContain('manual_override.created');
  });

  it('marks AI extraction contract paths as staging-only and human-review controlled', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const route of implementedApiRoutes().filter((candidate) =>
      candidate.path.includes('/extraction-jobs') ||
      candidate.path.includes('/extraction-fields') ||
      candidate.path.includes('/staging-records')
    )) {
      const operation = methodSection(openapi, route.path, route.method);
      expect(operation, `${route.method.toUpperCase()} ${route.path}`).toContain('x-ai-output-staging-only: true');
      expect(operation, `${route.method.toUpperCase()} ${route.path}`).toContain('x-human-review-required: true');
    }
  });

  it('marks promotion and report issue as evidence-gated human actions', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const [apiPath, method] of [
      ['/api/v1/staging-records/{stagingRecordId}/promote', 'post'],
      ['/api/v1/reports/{reportId}/issue', 'post']
    ] as const) {
      const operation = methodSection(openapi, apiPath, method);
      expect(operation).toContain('x-human-review-required: true');
      expect(operation).toContain('x-evidence-link-required: true');
      expect(operation).toContain('x-audit-event-generated:');
    }
  });

  it('defines Phase 1.4 request/response schemas and avoids claiming out-of-scope implementations', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const schemaName of [
      'AuthLoginRequest',
      'AuthTokenResponse',
      'ExtractionJobCreateRequest',
      'ExtractionFieldReviewRequest',
      'StagingPromotionRequest',
      'ManualOverride',
      'DataQualityFlag',
      'EvidenceSignedUrlResponse',
      'EvidenceDeleteRequest',
      'ApprovalActionRequest',
      'ReportIssueRequest',
      'AuditEventEnvelope',
      'ErrorEnvelope'
    ]) {
      expect(openapi).toContain(`${schemaName}:`);
    }

    expect(openapi).not.toMatch(/x-full-api-579-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-full-api-581-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-cmms-integration-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-3d-processing-implemented:\s*true/i);
    expect(openapi).not.toMatch(/x-invented-api-asme-formulas?:\s*true/i);
  });
});
