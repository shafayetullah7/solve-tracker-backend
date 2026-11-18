#!/usr/bin/env node
/**
 * DISCOVER E3 gate — practice profile + public topic pages (D3).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(backendRoot, "..", "solve-tracker-frontend");

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith("_test")) {
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.",
  );
}

function run(command, args, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} exited ${code}`)),
    );
  });
}

const steps = [
  () => run("node", ["scripts/verify-discover-e2.mjs"], backendRoot, {
    ...process.env,
    TEST_DATABASE_URL: target,
  }),
  () => run("pnpm", ["typecheck"], frontendRoot),
  () => run("pnpm", ["vitest", "run"], frontendRoot),
];

for (const step of steps) {
  await step();
}

console.log("\nDISCOVER E3 — verify:discover-e3 passed.");