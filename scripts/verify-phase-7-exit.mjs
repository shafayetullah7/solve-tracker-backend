#!/usr/bin/env node
/**
 * Phase 7 overall exit criteria — automated gates mapped to PHASE_7_PLAN §exit criteria.
 * Requires TEST_DATABASE_URL ending in _test for PostgreSQL evidence (criterion 7).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(backendRoot, "..", "solve-tracker-frontend");
const criteria = [
  {
    id: 1,
    summary:
      "Completion: solve, idempotent solved, revert, solve-again-new-timestamp",
    gate: "problems-integration",
  },
  {
    id: 2,
    summary:
      "Search/filter: q, status, platform, topics, untagged, sort, pagination totals",
    gate: "problems-integration",
  },
  {
    id: 3,
    summary: "Progress: GET /progress aggregates + per-topic % + isolation",
    gate: "problems-integration",
  },
  {
    id: 4,
    summary: "Ownership on list/detail/write/progress (two accounts)",
    gate: "problems-integration",
  },
  {
    id: 5,
    summary: "Client: problems + progress APIs; no raw fetch in product routes",
    gate: "no-raw-fetch",
  },
  { id: 6, summary: "OpenAPI / generated types drift-clean", gate: "api-check" },
  {
    id: 7,
    summary:
      "Build/type/lint/unit/e2e + live PostgreSQL (not mocks-only)",
    gate: "full-matrix",
  },
];

const gates = {
  "problems-integration": false,
  "no-raw-fetch": false,
  "api-check": false,
  "full-matrix": false,
};

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });
}

function assertNoRawFetchInDir(relDir, apiMarkers) {
  const dir = path.join(frontendRoot, "src", "routes", relDir);
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === "string" && f.endsWith(".tsx"));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const text = fs.readFileSync(filePath, "utf8");
    if (/\bfetch\s*\(/.test(text))
      throw new Error(`Raw fetch in routes/${relDir}/${file}`);
    const marker = apiMarkers.find((m) => text.includes(m));
    if (!marker && !file.endsWith("problems.tsx"))
      throw new Error(
        `routes/${relDir}/${file} should use ${apiMarkers.join(" or ")}`,
      );
  }
}

function checkClientBoundaries() {
  const problemsApi = path.join(
    frontendRoot,
    "src/lib/api/modules/problems.api.ts",
  );
  const progressApi = path.join(
    frontendRoot,
    "src/lib/api/modules/progress.api.ts",
  );
  if (!fs.existsSync(problemsApi)) throw new Error("Missing problems.api.ts");
  if (!fs.existsSync(progressApi)) throw new Error("Missing progress.api.ts");

  assertNoRawFetchInDir("problems", ["createProblemsApi"]);
  assertNoRawFetchInDir("topics", ["createTopicsApi", "createProgressApi"]);

  const topicsIndex = path.join(frontendRoot, "src/routes/topics/index.tsx");
  const problemsIndex = path.join(frontendRoot, "src/routes/problems/index.tsx");
  for (const [label, file, needle] of [
    ["topics/index", topicsIndex, "createProgressApi"],
    ["problems/index", problemsIndex, "createProgressApi"],
  ]) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes(needle))
      throw new Error(`${label} should use ${needle} for FR-05 UI`);
  }

  const openapi = path.join(backendRoot, "openapi.json");
  const doc = JSON.parse(fs.readFileSync(openapi, "utf8"));
  if (!doc.paths?.["/progress"])
    throw new Error("openapi.json missing /progress");

  gates["no-raw-fetch"] = true;
  console.log("OK: criteria 5 — API modules and route boundaries");
}

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith("_test")) {
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test (e.g. practice_tracker_test).",
    );
  }

  console.log("Phase 7 exit verification — backend unit + e2e …");
  await run("pnpm", ["lint"], backendRoot);
  await run("pnpm", ["test"], backendRoot);
  await run("pnpm", ["test:e2e"], backendRoot);

  console.log("Phase 7 exit verification — backend build + OpenAPI …");
  await run("pnpm", ["build"], backendRoot);
  await run("pnpm", ["api:check"], backendRoot);
  gates["api-check"] = true;

  console.log("Phase 7 exit verification — problems PostgreSQL/HTTP (Phase 7 matrix) …");
  await run("node", ["scripts/test-problems-integration.mjs"], backendRoot);
  gates["problems-integration"] = true;

  console.log("Phase 7 exit verification — frontend …");
  await run("pnpm", ["exec", "tsc", "--noEmit"], frontendRoot);
  await run("pnpm", ["lint"], frontendRoot);
  await run("pnpm", ["test", "--run"], frontendRoot);
  await run("pnpm", ["build"], frontendRoot);
  await run("pnpm", ["api:check"], frontendRoot);

  checkClientBoundaries();
  gates["full-matrix"] = true;

  console.log("\nPhase 7 smoke — Phase 5/6 exit verifiers …");
  await run("pnpm", ["verify:phase-5"], backendRoot);
  await run("pnpm", ["verify:phase-6"], backendRoot);

  console.log("\n--- Phase 7 exit criteria (overall) ---");
  for (const item of criteria) {
    const pass = gates[item.gate];
    console.log(`[${pass ? "PASS" : "FAIL"}] ${item.id}. ${item.summary}`);
  }
  const allPass = criteria.every((item) => gates[item.gate]);
  if (!allPass) process.exit(1);
  console.log("\nAll Phase 7 overall exit criteria satisfied by automated gates.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});