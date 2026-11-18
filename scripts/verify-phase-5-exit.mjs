#!/usr/bin/env node
/**
 * Phase 5 overall exit criteria — automated gates mapped to plan §exit criteria.
 * Requires TEST_DATABASE_URL ending in _test for PostgreSQL evidence (criterion 7).
 *
 * Criterion 5 (Phase 6 delete retest): when VERIFY_PHASE6_TOPIC_DELETE=1 (default),
 * also runs test-problems-integration.mjs topic-delete assertion.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(backendRoot, "..", "solve-tracker-frontend");

const runPhase6Retest = (process.env.VERIFY_PHASE6_TOPIC_DELETE ?? "1") !== "0";

const criteria = [
  { id: 1, summary: "Two accounts; identical names across accounts allowed", gate: "topics-integration" },
  { id: 2, summary: "Cross-account mutate by id → 404", gate: "topics-integration" },
  { id: 3, summary: "Duplicate name → 409 on create and rename", gate: "topics-integration" },
  { id: 4, summary: "Frontend topics routes use API module only", gate: "no-raw-fetch" },
  {
    id: 5,
    summary: "Delete removes topic; Phase 6 join retest (optional)",
    gate: runPhase6Retest ? "phase6-topic-delete" : "topics-integration",
  },
  { id: 6, summary: "OpenAPI / generated types drift-clean", gate: "api-check" },
  { id: 7, summary: "Real PostgreSQL integration (not mocks-only)", gate: "topics-integration" },
];

const gates = {
  "topics-integration": false,
  "phase6-topic-delete": false,
  "no-raw-fetch": false,
  "api-check": false,
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
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });
}

function checkNoRawFetchInTopicsRoutes() {
  const routesDir = path.join(frontendRoot, "src", "routes", "app", "topics");
  const layout = path.join(frontendRoot, "src", "routes", "app", "topics.tsx");
  for (const filePath of [
    layout,
    ...fs.readdirSync(routesDir).map((f) => path.join(routesDir, f)),
  ]) {
    if (!filePath.endsWith(".tsx")) continue;
    const text = fs.readFileSync(filePath, "utf8");
    if (/\bfetch\s*\(/.test(text)) throw new Error(`Raw fetch in ${filePath}`);
  }
  const indexText = fs.readFileSync(path.join(routesDir, "index.tsx"), "utf8");
  if (!indexText.includes("createTopicsApi"))
    throw new Error("routes/app/topics/index.tsx should use createTopicsApi");
  gates["no-raw-fetch"] = true;
  console.log("OK: criterion 4 — no raw fetch in routes/app/topics");
}

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith("_test")) {
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test (e.g. practice_tracker_test).",
    );
  }

  console.log("Phase 5 exit verification — backend unit …");
  await run("pnpm", ["lint"], backendRoot);
  await run("pnpm", ["test"], backendRoot);

  console.log("Phase 5 exit verification — backend build + OpenAPI …");
  await run("pnpm", ["build"], backendRoot);
  await run("pnpm", ["api:check"], backendRoot);
  gates["api-check"] = true;

  console.log("Phase 5 exit verification — topics PostgreSQL/HTTP …");
  await run("node", ["scripts/test-topics-integration.mjs"], backendRoot);
  gates["topics-integration"] = true;

  if (runPhase6Retest) {
    console.log(
      "Phase 5 criterion 5 — Phase 6 topic-delete retest (problems integration) …",
    );
    await run("node", ["scripts/test-problems-integration.mjs"], backendRoot);
    gates["phase6-topic-delete"] = true;
  }

  console.log("Phase 5 exit verification — frontend …");
  await run("pnpm", ["typecheck"], frontendRoot);
  await run("pnpm", ["lint"], frontendRoot);
  await run("pnpm", ["test", "--run"], frontendRoot);
  await run("pnpm", ["api:check"], frontendRoot);

  checkNoRawFetchInTopicsRoutes();

  console.log("\n--- Phase 5 exit criteria (overall) ---");
  for (const item of criteria) {
    const pass = gates[item.gate];
    console.log(`[${pass ? "PASS" : "FAIL"}] ${item.id}. ${item.summary}`);
  }
  const allPass = criteria.every((item) => gates[item.gate]);
  if (!allPass) process.exit(1);
  console.log("\nAll Phase 5 overall exit criteria satisfied by automated gates.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});