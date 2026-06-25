#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'coverage']);
const jwtLikePattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function hasGitRepository() {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function gitTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' });
  return output.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, '/'));
}

function walkFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute, relative));
    } else if (entry.isFile()) {
      files.push(relative.replace(/\\/g, '/'));
    }
  }
  return files;
}

const files = hasGitRepository() ? gitTrackedFiles() : walkFiles(repoRoot);
const failures = [];

function fail(message) {
  failures.push(message);
}

for (const file of files) {
  const basename = path.posix.basename(file);
  if (file.endsWith('.tsbuildinfo')) {
    fail(`Tracked TypeScript build cache is not allowed: ${file}`);
  }
  if ((basename === '.env' || basename === '.env.local' || /^\.env\.(?!example$).+/.test(basename)) && basename !== '.env.example') {
    fail(`Tracked environment secret file is not allowed: ${file}`);
  }
  if (file.endsWith('.dump')) {
    fail(`Tracked database dump is not allowed: ${file}`);
  }
  if (
    file.includes('AIM_UAT_Evidence/') ||
    file.includes('production_deployment/') ||
    file.includes('deployment_rehearsal/') ||
    file.includes('D:/AIM_UAT_Evidence')
  ) {
    fail(`Tracked local evidence/deployment artifact is not allowed: ${file}`);
  }
}

const textFileExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yaml', '.yml', '.sql', '.txt', '.env', '.example', '.csv'
]);

for (const file of files) {
  const ext = path.posix.extname(file);
  if (!textFileExtensions.has(ext) && path.posix.basename(file) !== '.env.example') continue;
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) continue;
  let content;
  try {
    content = fs.readFileSync(absolute, 'utf8');
  } catch {
    continue;
  }
  const matches = content.match(jwtLikePattern);
  if (matches) {
    fail(`JWT-like token found in tracked file: ${file}`);
  }
}

if (failures.length > 0) {
  console.error('Repository hygiene check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Repository hygiene check passed.');
