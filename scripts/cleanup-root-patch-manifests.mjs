import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const destinationDir = path.join(repoRoot, 'docs', 'release', 'patch-manifests');
fs.mkdirSync(destinationDir, { recursive: true });

const manifestPattern = /^RC[34].*PATCH_MANIFEST\.md$/;
const rootManifestFiles = fs.readdirSync(repoRoot).filter((fileName) => manifestPattern.test(fileName));

for (const fileName of rootManifestFiles) {
  const sourcePath = path.join(repoRoot, fileName);
  const destinationPath = path.join(destinationDir, fileName);
  fs.copyFileSync(sourcePath, destinationPath);
  fs.rmSync(sourcePath);
}

console.log(`Moved ${rootManifestFiles.length} root patch manifest file(s) to docs/release/patch-manifests.`);
