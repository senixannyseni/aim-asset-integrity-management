import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const openApiPath = path.resolve(process.cwd(), '../../04_API/openapi.yaml');

describe('OpenAPI implemented endpoint alignment', () => {
  it('documents the implemented /api/v1 asset and governance endpoints', () => {
    const content = fs.readFileSync(openApiPath, 'utf8');
    const requiredPaths = [
      '/api/v1/assets:',
      '/api/v1/assets/{assetId}:',
      '/api/v1/assets/{assetId}/geometry:',
      '/api/v1/assets/{assetId}/shell-courses:',
      '/api/v1/assets/{assetId}/shell-courses/{courseId}:',
      '/api/v1/materials:',
      '/api/v1/workflow-events:',
      '/api/v1/error-logs:'
    ];

    for (const endpoint of requiredPaths) {
      expect(content).toContain(endpoint);
    }
  });

  it('does not claim implemented AI extraction, calculation, report, evidence, or NDT APIs before those sprints are applied', () => {
    const content = fs.readFileSync(openApiPath, 'utf8');
    expect(content).not.toContain('/api/v1/ai-extraction');
    expect(content).not.toContain('/api/v1/calculations/run');
    expect(content).not.toContain('/api/v1/reports/generate');
    expect(content).not.toContain('/api/v1/evidence/upload');
    expect(content).not.toContain('/api/v1/ndt/measurements');
  });
});
