#!/usr/bin/env node
/**
 * Phase 7F — static safe-logging audit for learning surfaces (no server).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = [
  path.join(backendRoot, 'src/modules/learning'),
  path.join(backendRoot, 'src/modules/assessments'),
];

const bannedPatterns = [
  { name: 'Logger import/usage', re: /\bLogger\b/ },
  { name: 'console.log', re: /\bconsole\.log\s*\(/ },
  { name: 'console.error', re: /\bconsole\.error\s*\(/ },
  { name: 'console.debug', re: /\bconsole\.debug\s*\(/ },
  { name: 'logger with JSON.stringify body', re: /logger\.(log|warn|error|debug)\([^)]*JSON\.stringify/ },
];

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

let failures = 0;

for (const root of scanRoots) {
  for (const file of walkTsFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
  for (const { name, re } of bannedPatterns) {
      if (re.test(text)) {
        console.error(`FAIL [${name}]: ${path.relative(backendRoot, file)}`);
        failures++;
      }
    }
  }
}

const authFilter = path.join(
  backendRoot,
  'src/modules/auth/auth-error.filter.ts',
);
const filterText = fs.readFileSync(authFilter, 'utf8');
if (!filterText.includes("this.logger.error('Unexpected request failure.');")) {
  console.error('FAIL: auth-error.filter 5xx log must use fixed message only');
  failures++;
}
if (/this\.logger\.error\([^'"]/.test(filterText)) {
  console.error('FAIL: auth-error.filter must not interpolate into logger.error');
  failures++;
}

if (failures > 0) {
  console.error(`\nLearning safe-logging audit failed (${failures} issue(s)).`);
  process.exit(1);
}

console.log('OK: learning/assessments modules have no application loggers; auth 5xx log is fixed text.');