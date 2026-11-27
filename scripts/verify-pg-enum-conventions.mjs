#!/usr/bin/env node
/**
 * Ensures every schema *.enum.ts follows the value-object + pgEnum pattern
 * documented in DRIZZLE_CONVENTIONS.md (single source of truth for persisted enums).
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const schemaRoot = join(import.meta.dirname, '../src/database/schema');

async function collectEnumFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectEnumFiles(full)));
    } else if (entry.name.endsWith('.enum.ts')) {
      files.push(full);
    }
  }
  return files;
}

const VALUE_OBJECT_RE = /export const \w+ = \{[\s\S]*?\} as const;/;
const PG_ENUM_RE = /export const \w+Enum = pgEnum\(/;
const DERIVED_ARRAY_RE = /export const [A-Z][A-Z0-9_]* = \[/;

async function main() {
  const files = await collectEnumFiles(schemaRoot);
  if (files.length === 0) {
    console.error('No *.enum.ts files found under src/database/schema');
    process.exit(1);
  }

  const failures = [];
  for (const file of files) {
    const rel = file.replace(join(import.meta.dirname, '../'), '');
    const content = await readFile(file, 'utf8');
    const issues = [];
    if (!VALUE_OBJECT_RE.test(content)) {
      issues.push('missing `export const <name> = { ... } as const` value object');
    }
    if (!PG_ENUM_RE.test(content)) {
      issues.push('missing `export const <domain>Enum = pgEnum(...)`');
    }
    if (!DERIVED_ARRAY_RE.test(content)) {
      issues.push('missing derived `export const ALL_CAPS_VALUES = [...]` tuple');
    }
    if (issues.length > 0) {
      failures.push({ rel, issues });
    }
  }

  if (failures.length > 0) {
    console.error('PG enum convention violations:\n');
    for (const { rel, issues } of failures) {
      console.error(`  ${rel}`);
      for (const issue of issues) {
        console.error(`    - ${issue}`);
      }
    }
    console.error(
      '\nSee DRIZZLE_CONVENTIONS.md — PostgreSQL enum value objects.',
    );
    process.exit(1);
  }

  console.log(`PG enum conventions OK (${files.length} files).`);
}

await main();