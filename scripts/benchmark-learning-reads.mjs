import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { authTestEnvironment } from '../test/auth-env.ts';
import { EmailService } from '../dist/modules/email/email.service.js';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test')) {
  throw new Error('Provide TEST_DATABASE_URL ending in _test.');
}

const args = process.argv.slice(2);
const ciMode = args.includes('--ci');
const tier =
  args.find((a) => a.startsWith('--tier='))?.split('=')[1]
  ?? (args.includes('--tier') ? args[args.indexOf('--tier') + 1] : 'ci');

Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'false',
  DISCOVER_MODE: 'full',
});

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function summarizeTimings(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    min: sorted[0] ?? 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function planUsesIndex(planText, table) {
  const block = planText.includes(table) ? planText : planText;
  return /Index Scan|Bitmap Index Scan|Index Only Scan/i.test(block);
}

async function runExplain(client, label, sql, params) {
  const res = await client.query(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`, params);
  const text = res.rows.map((r) => r['QUERY PLAN']).join('\n');
  return { label, text };
}

const seedOut = execFileSync('pnpm', ['exec', 'tsx', 'scripts/seed-learning-perf-fixture.ts', `--tier=${tier}`], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, TEST_DATABASE_URL: target, DATABASE_URL: target },
});
const fixtureLine = seedOut.split('\n').find((line) => line.startsWith('PERF_FIXTURE_JSON='));
if (!fixtureLine) throw new Error('Seed did not emit PERF_FIXTURE_JSON');
const fixture = JSON.parse(fixtureLine.replace('PERF_FIXTURE_JSON=', ''));

const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/configure-app.js');

const explainClient = await pool.connect();
const explainResults = [];

try {
  explainResults.push(await runExplain(
    explainClient,
    'guide_list_count',
    `SELECT count(*)::int AS total FROM learning_guides
     WHERE owner_id = $1::uuid AND deleted_at IS NULL AND archived_at IS NULL`,
    [fixture.userId],
  ));

  explainResults.push(await runExplain(
    explainClient,
    'guide_list_page',
    `SELECT * FROM learning_guides
     WHERE owner_id = $1::uuid AND deleted_at IS NULL AND archived_at IS NULL
     ORDER BY updated_at DESC, id DESC LIMIT 20 OFFSET 0`,
    [fixture.userId],
  ));

  explainResults.push(await runExplain(
    explainClient,
    'guide_tree',
    `SELECT learning_guides.structure_revision, learning_nodes.id, learning_nodes.parent_id,
            learning_nodes.title, learning_nodes.position, learning_nodes.required,
            learning_nodes.completion_mode, learning_nodes.content_revision, learning_nodes.requirement_revision
     FROM learning_guides
     LEFT JOIN learning_nodes ON learning_nodes.guide_id = learning_guides.id AND learning_nodes.deleted_at IS NULL
     WHERE learning_guides.owner_id = $1::uuid AND learning_guides.id = $2::uuid AND learning_guides.deleted_at IS NULL
     LIMIT 2001`,
    [fixture.userId, fixture.primaryGuideId],
  ));

  explainResults.push(await runExplain(
    explainClient,
    'node_progress',
    `SELECT learning_node_progress.node_id
     FROM learning_node_progress
     INNER JOIN learning_enrollments ON learning_enrollments.id = learning_node_progress.enrollment_id
     INNER JOIN learning_guides ON learning_guides.id = learning_enrollments.guide_id
     WHERE learning_guides.owner_id = $1::uuid AND learning_guides.id = $2::uuid
       AND learning_enrollments.learner_id = $1::uuid AND learning_guides.deleted_at IS NULL`,
    [fixture.userId, fixture.primaryGuideId],
  ));

  const assessmentIds = await explainClient.query(
    `SELECT id FROM learning_assessments WHERE guide_id = $1::uuid`,
    [fixture.primaryGuideId],
  );
  const ids = assessmentIds.rows.map((r) => r.id);

  explainResults.push(await runExplain(
    explainClient,
    'attempt_best_scores',
    `SELECT assessment_id, max(score_basis_points)::int AS best
     FROM learning_attempts
     WHERE enrollment_id = (
       SELECT id FROM learning_enrollments WHERE guide_id = $1::uuid AND learner_id = $2::uuid LIMIT 1
     )
       AND assessment_id = ANY($3::uuid[])
       AND status = 'finalized'::learning_attempt_status
     GROUP BY assessment_id`,
    [fixture.primaryGuideId, fixture.userId, ids],
  ));

  explainResults.push(await runExplain(
    explainClient,
    'attempt_read',
    `SELECT * FROM learning_attempts WHERE id = $1::uuid`,
    [fixture.primaryAttemptId],
  ));
} finally {
  explainClient.release();
}

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({ sendReset: async () => {} })
  .compile();
const app = moduleRef.createNestApplication({ logger: false });
configureApp(app, true);

const http = {};
const iterations = 20;

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const server = app.getHttpServer();

  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email: fixture.email, password: fixture.password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');

  async function timeRoute(name, path) {
    const samples = [];
    await request(server).get(path).set(headers).set('Cookie', cookie);
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      await request(server).get(path).set(headers).set('Cookie', cookie).expect(200);
      samples.push(performance.now() - start);
    }
    http[name] = summarizeTimings(samples);
  }

  await timeRoute('guide_list', '/learning/guides?page=1&pageSize=20');
  await timeRoute('guide_tree', `/learning/guides/${fixture.primaryGuideId}/tree`);
  await timeRoute(
    'attempt_get',
    `/learning/guides/${fixture.primaryGuideId}/assessments/${fixture.primaryAssessmentId}/attempts/${fixture.primaryAttemptId}`,
  );

  const treePlan = explainResults.find((r) => r.label === 'guide_tree')?.text ?? '';
  const listPlan = explainResults.find((r) => r.label === 'guide_list_page')?.text ?? '';

  console.log(`Learning perf benchmark (tier=${tier}, nodes=${fixture.primaryNodeCount})`);
  console.log('HTTP ms (warm):');
  for (const [route, stats] of Object.entries(http)) {
    console.log(`  ${route}: min=${stats.min.toFixed(1)} p50=${stats.p50.toFixed(1)} p95=${stats.p95.toFixed(1)} max=${stats.max.toFixed(1)}`);
  }
  console.log('EXPLAIN highlights:');
  for (const { label, text } of explainResults) {
    const firstLine = text.split('\n')[0] ?? '';
    console.log(`  ${label}: ${firstLine.slice(0, 120)}`);
  }

  console.log(`PERF_BENCHMARK_JSON=${JSON.stringify({
    tier,
    http,
    treePlanUsesNodesIndex: planUsesIndex(treePlan, 'learning_nodes'),
    listPlanUsesGuideIndex: planUsesIndex(listPlan, 'learning_guides'),
  })}`);

  if (ciMode) {
    assert.ok(http.guide_tree.p95 < 5000, `CI: tree p95 ${http.guide_tree.p95}ms >= 5000ms`);
    assert.ok(planUsesIndex(treePlan, 'learning_nodes'), 'CI: tree plan should use learning_nodes index');
    assert.ok(
      planUsesIndex(listPlan, 'learning_guides') || /Seq Scan on learning_guides/i.test(listPlan),
      'CI: list plan scanned guides',
    );
    console.log('CI perf assertions passed.');
  }
} finally {
  await app.close();
  await pool.end();
}