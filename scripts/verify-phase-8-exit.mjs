#!/usr/bin/env node
/**
 * Phase 8 overall exit — regression, auth, security greps, persistence (no Playwright).
 * Requires TEST_DATABASE_URL ending in _test.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.resolve(backendRoot, "..", "solve-tracker-frontend");
const docsRoot = path.resolve(backendRoot, "docs");

const routeDirs = [
  { dir: path.join("app", "problems"), markers: ["createProblemsApi"] },
  { dir: path.join("app", "topics"), markers: ["createTopicsApi", "createProgressApi"] },
  {
    dir: "",
    files: [
      "login.tsx",
      "register.tsx",
      "forgot-password.tsx",
      "reset-password.tsx",
      "account.tsx",
    ],
    markers: ["useAuth", "RequireSession"],
  },
];

function run(command, args, cwd = backendRoot) {
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

function assertNoRawFetch(filePath, label) {
  const text = fs.readFileSync(filePath, "utf8");
  if (/\bfetch\s*\(/.test(text))
    throw new Error(`Raw fetch in ${label}`);
}

function checkClientBoundaries() {
  for (const entry of routeDirs) {
    if (entry.files) {
      for (const file of entry.files) {
        const filePath = path.join(frontendRoot, "src", "routes", file);
        assertNoRawFetch(filePath, `routes/${file}`);
        const text = fs.readFileSync(filePath, "utf8");
        const marker = entry.markers.find((m) => text.includes(m));
        if (!marker)
          throw new Error(`routes/${file} should reference ${entry.markers.join(" or ")}`);
      }
      continue;
    }
    const dir = path.join(frontendRoot, "src", "routes", entry.dir);
    const files = fs
      .readdirSync(dir, { recursive: true })
      .filter((f) => typeof f === "string" && f.endsWith(".tsx"));
    for (const file of files) {
      const filePath = path.join(dir, file);
      assertNoRawFetch(filePath, `routes/${entry.dir}/${file}`);
      const text = fs.readFileSync(filePath, "utf8");
      const marker = entry.markers.find((m) => text.includes(m));
      if (!marker && !String(file).endsWith("problems.tsx"))
        throw new Error(
          `routes/${entry.dir}/${file} should use ${entry.markers.join(" or ")}`,
        );
    }
  }

  const homeIndex = path.join(frontendRoot, "src/routes/index.tsx");
  const homeText = fs.readFileSync(homeIndex, "utf8");
  if (!homeText.includes("paths.app()"))
    throw new Error("Home route should redirect authenticated users to the app shell");

  for (const file of ["login.tsx", "register.tsx"]) {
    const text = fs.readFileSync(
      path.join(frontendRoot, "src", "routes", file),
      "utf8",
    );
    if (!text.includes("isGoogleOAuthEnabled"))
      throw new Error(`routes/${file} should gate Google OAuth UI`);
  }

  const authNav = path.join(frontendRoot, "src/components/auth/AuthNav.tsx");
  const navText = fs.readFileSync(authNav, "utf8");
  if (
    !navText.includes("import.meta.env.DEV") &&
    navText.includes("Template examples")
  )
    throw new Error("Template nav link should be dev-only or removed");

  console.log("OK: Phase 8 client route boundaries and product shell checks");
}

function checkAcceptanceWorkbook() {
  const workbook = path.join(docsRoot, "PHASE_8_ACCEPTANCE.md");
  if (!fs.existsSync(workbook))
    throw new Error("Missing docs/PHASE_8_ACCEPTANCE.md");
  const text = fs.readFileSync(workbook, "utf8");
  if (!text.includes("MVP acceptance matrix"))
    throw new Error("PHASE_8_ACCEPTANCE.md missing acceptance matrix section");
  if (!/Appendix A/.test(text) || !/Appendix B/.test(text))
    throw new Error("PHASE_8_ACCEPTANCE.md missing appendices");
  const rows = [...text.matchAll(/^\| (\d{1,2}) \|/gm)].map((m) => Number(m[1]));
  const unique = new Set(rows.filter((n) => n >= 1 && n <= 20));
  if (unique.size < 20)
    throw new Error(`PHASE_8_ACCEPTANCE.md traces ${unique.size}/20 criteria rows`);
  console.log("OK: acceptance workbook present (20 criteria traced)");
}

function checkNoObviousSecretLogs() {
  const srcRoot = path.join(backendRoot, "src");
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".ts")) {
        const text = fs.readFileSync(full, "utf8");
        if (
          /console\.(log|debug|info|warn)\s*\(/.test(text) &&
          /password|refreshToken|accessToken|authorization/i.test(text)
        ) {
          hits.push(path.relative(backendRoot, full));
        }
      }
    }
  };
  walk(srcRoot);
  if (hits.length) {
    throw new Error(
      `Possible secret logging in backend/src: ${hits.join(", ")}`,
    );
  }
  console.log("OK: no obvious password/token console logging in backend/src");
}

async function main() {
  const testDb = process.env.TEST_DATABASE_URL;
  if (!testDb || !new URL(testDb).pathname.endsWith("_test")) {
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test.",
    );
  }

  checkAcceptanceWorkbook();
  checkClientBoundaries();
  checkNoObviousSecretLogs();

  console.log("\nPhase 8 — regression umbrella (Phase 7) …");
  await run("node", ["scripts/verify-phase-7-exit.mjs"], backendRoot);

  console.log("\nPhase 8 — auth integration …");
  await run("pnpm", ["build"], backendRoot);
  await run("node", ["scripts/test-auth-integration.mjs"], backendRoot);

  console.log("\nPhase 8 — Google OAuth regression …");
  await run("node", ["scripts/verify-google-oauth.mjs"], backendRoot);
  await run("node", ["scripts/verify-google-oauth-exit.mjs"], backendRoot);

  console.log("\nPhase 8 — frontend check (post-Google) …");
  await run("pnpm", ["check"], frontendRoot);

  console.log("\nPhase 8 — schema check …");
  await run("pnpm", ["db:check"]);

  console.log("\nPhase 8 — backend restart persistence …");
  await run("node", ["scripts/test-backend-restart-persistence.mjs"]);

  console.log("\n--- Phase 8 automated exit criteria ---");
  console.log("[PASS] Regression: verify-phase-7-exit.mjs");
  console.log("[PASS] Auth: test-auth-integration.mjs");
  console.log("[PASS] Google OAuth: verify-google-oauth*.mjs");
  console.log("[PASS] Frontend: pnpm check");
  console.log("[PASS] Client boundaries + acceptance workbook");
  console.log("[PASS] Persistence: test-backend-restart-persistence.mjs");
  console.log("[WAIVER] Browser E2E not required for Phase 8 (see PHASE_8_RESULTS.md).");
  console.log("\nPhase 8 automated gate passed. Sign manual items in PHASE_8_RESULTS.md.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});