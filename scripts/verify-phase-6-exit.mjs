#!/usr/bin/env node
/**
 * Phase 6 overall exit criteria — automated gates mapped to plan §exit criteria.
 * Requires TEST_DATABASE_URL ending in _test for PostgreSQL evidence (criterion 9).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(backendRoot, "..", "solve-tracker-frontend");

const criteria = [
  { id: 1, summary: "Two accounts; same URL allowed across accounts", gate: "problems-integration" },
  { id: 2, summary: "Cross-account GET/PATCH/DELETE → 404", gate: "problems-integration" },
  { id: 3, summary: "Duplicate URL → 409 create + patch", gate: "problems-integration" },
  { id: 4, summary: "Owned topics only; deduped associations", gate: "problems-integration" },
  { id: 5, summary: "Delete topic drops joins; problem remains", gate: "problems-integration" },
  { id: 6, summary: "Delete problem removes row and joins", gate: "problems-integration" },
  { id: 7, summary: "Frontend problems routes use API module only", gate: "no-raw-fetch" },
  { id: 8, summary: "OpenAPI / generated types drift-clean", gate: "api-check" },
  { id: 9, summary: "Real PostgreSQL integration (not mocks-only)", gate: "problems-integration" },
];

const gates = {
  "problems-integration": false,
  "no-raw-fetch": false,
  "api-check": false,
  "backend-unit": false,
  "frontend-unit": false,
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

function checkNoRawFetchInProblemsRoutes() {
  const routesDir = path.join(frontendRoot, "src", "routes", "app", "problems");
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".tsx"));
  for (const file of files) {
    const text = fs.readFileSync(path.join(routesDir, file), "utf8");
    if (/\bfetch\s*\(/.test(text))
      throw new Error(`Raw fetch in routes/app/problems/${file}`);
    if (!text.includes("createProblemsApi") && file !== "problems.tsx")
      throw new Error(`routes/app/problems/${file} should use createProblemsApi`);
  }
  gates["no-raw-fetch"] = true;
  console.log("OK: criterion 7 — no raw fetch in routes/app/problems");
}

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith("_test")) {
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test (e.g. practice_tracker_test).",
    );
  }

  console.log("Phase 6 exit verification — backend unit …");
  await run("pnpm", ["lint"], backendRoot);
  await run("pnpm", ["test"], backendRoot);
  gates["backend-unit"] = true;

  console.log("Phase 6 exit verification — backend build + OpenAPI …");
  await run("pnpm", ["build"], backendRoot);
  await run("pnpm", ["api:check"], backendRoot);
  gates["api-check"] = true;

  console.log("Phase 6 exit verification — problems PostgreSQL/HTTP …");
  await run("node", ["scripts/test-problems-integration.mjs"], backendRoot);
  gates["problems-integration"] = true;

  console.log("Phase 6 exit verification — frontend …");
  await run("pnpm", ["exec", "tsc", "--noEmit"], frontendRoot);
  await run("pnpm", ["lint"], frontendRoot);
  await run("pnpm", ["test", "--run"], frontendRoot);
  await run("pnpm", ["api:check"], frontendRoot);
  gates["frontend-unit"] = true;

  checkNoRawFetchInProblemsRoutes();

  console.log("\n--- Phase 6 exit criteria (overall) ---");
  for (const item of criteria) {
    const pass = gates[item.gate];
    console.log(`[${pass ? "PASS" : "FAIL"}] ${item.id}. ${item.summary}`);
  }
  const allPass = criteria.every((item) => gates[item.gate]);
  if (!allPass) process.exit(1);
  console.log("\nAll Phase 6 overall exit criteria satisfied by automated gates.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});