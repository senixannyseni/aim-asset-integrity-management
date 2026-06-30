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

describe('source-of-truth OpenAPI synchronization', () => {
  it('keeps the source-of-truth OpenAPI mirror identical to the active implementation contract', () => {
    const activeContract = readRepoFile('04_API/openapi.yaml');
    const sourceTruthMirror = readRepoFile('docs/source-of-truth/api/openapi.yaml');

    expect(sourceTruthMirror).toBe(activeContract);
  });
});
