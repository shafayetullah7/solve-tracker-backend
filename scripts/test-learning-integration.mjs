import 'reflect-metadata';
import 'dotenv/config';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { authTestEnvironment } from '../test/auth-env.ts';
import { EmailService } from '../dist/modules/email/email.service.js';

const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).pathname.endsWith('_test'))
  throw new Error(
    'Provide a dedicated TEST_DATABASE_URL ending in _test; no application DATABASE_URL fallback is allowed.',
  );

Object.assign(process.env, authTestEnvironment, {
  NODE_ENV: 'test',
  DATABASE_URL: target,
  PORT: '3000',
  HOST: '127.0.0.1',
  SWAGGER_ENABLED: 'true',
  LEARNING_RATE_LIMIT_IMPORT_PER_HOUR: '3',
});

const pool = new pg.Pool({ connectionString: target });
const { AppModule } = await import('../dist/app.module.js');
const { configureApp, createApiDocument } = await import('../dist/configure-app.js');

const headers = {
  Origin: 'http://localhost:3001',
  'X-Requested-With': 'practice',
};

const emails = [];
let count = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  count++;
};

async function registerAndLogin(server, label) {
  const email = `learning-${label}-${randomUUID()}@example.test`;
  const password = 'a long testing passphrase 🌱';
  emails.push(email);
  await request(server)
    .post('/auth/register')
    .set(headers)
    .send({ name: `User ${label}`, email, password })
    .expect(201);
  const login = await request(server)
    .post('/auth/login')
    .set(headers)
    .send({ email, password })
    .expect(200);
  const cookie = login.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
  return { email, cookie };
}

async function createGuide(server, cookie, title) {
  const op = randomUUID();
  const created = await request(server)
    .post('/learning/guides')
    .set(headers)
    .set('Cookie', cookie)
    .send({ title, description: '', operationId: op })
    .expect(201);
  const guide = await request(server)
    .get(`/learning/guides/${created.body.resourceId}`)
    .set(headers)
    .set('Cookie', cookie)
    .expect(200);
  return { guideId: created.body.resourceId, guide: guide.body };
}

async function createNode(server, cookie, guideId, structureRevision, title, parentId = null) {
  const body = {
    title,
    parentId,
    beforeNodeId: null,
    expectedStructureRevision: structureRevision,
    operationId: randomUUID(),
  };
  const res = await request(server)
    .post(`/learning/guides/${guideId}/nodes`)
    .set(headers)
    .set('Cookie', cookie)
    .send(body);
  return res;
}

const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailService)
  .useValue({ sendReset: async () => {} })
  .compile();
const app = module.createNestApplication({ logger: false });
configureApp(app, true);

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });
  await app.init();
  const server = app.getHttpServer();

  const userA = await registerAndLogin(server, 'A');
  const userB = await registerAndLogin(server, 'B');

  const emptyList = await request(server)
    .get('/learning/guides')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(emptyList.body.meta.total === 0, 'Empty guide library');

  const { guideId, guide: guideMeta } = await createGuide(server, userA.cookie, 'Algorithms');
  check(guideMeta.structureRevision === '1', 'New guide structure revision');

  const emptyTree = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(emptyTree.body.nodes.length === 0, 'Empty guide tree');

  await request(server)
    .get(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(404);

  const enrollCross = await request(server)
    .get(`/learning/guides/${guideId}/enrollment`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(enrollCross.status === 404, 'Other user cannot read enrollment');

  let structureRevision = emptyTree.body.structureRevision;
  const root = await createNode(server, userA.cookie, guideId, structureRevision, 'Introduction');
  check(root.status === 201, 'Create root node');
  structureRevision = String(BigInt(structureRevision) + 1n);

  const tree1 = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(tree1.body.nodes.length === 1, 'Tree has root');
  const rootId = tree1.body.nodes[0].id;

  const child = await createNode(server, userA.cookie, guideId, tree1.body.structureRevision, 'Arrays', rootId);
  check(child.status === 201, 'Create child node');
  const tree2 = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const childId = tree2.body.nodes.find((n) => n.parentId === rootId)?.id;
  check(Boolean(childId), 'Child exists in tree');

  const stale = await createNode(server, userA.cookie, guideId, '1', 'Stale');
  check(stale.status === 409 && stale.body.code === 'LEARNING_REVISION_CONFLICT', 'Stale structure revision → 409');

  const cycle = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${rootId}/placement`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      parentId: childId,
      beforeNodeId: null,
      expectedStructureRevision: tree2.body.structureRevision,
      operationId: randomUUID(),
    });
  check(
    cycle.status === 409 && cycle.body.code === 'LEARNING_INVALID_PLACEMENT',
    'Move under descendant rejected',
  );

  const treeBeforeSibling = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const sibling = await createNode(
    server,
    userA.cookie,
    guideId,
    treeBeforeSibling.body.structureRevision,
    'Sibling',
    rootId,
  );
  check(sibling.status === 201, 'Create sibling node');
  const treeAfterSibling = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const siblingId = treeAfterSibling.body.nodes.find(
    (n) => n.parentId === rootId && n.title === 'Sibling',
  )?.id;
  check(Boolean(siblingId), 'Sibling listed in tree');

  const moveOp = randomUUID();
  const moveOk = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}/placement`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      parentId: rootId,
      beforeNodeId: siblingId,
      expectedStructureRevision: treeAfterSibling.body.structureRevision,
      operationId: moveOp,
    });
  check(moveOk.status === 200, 'Successful node reorder/move');

  const moveReplay = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}/placement`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      parentId: rootId,
      beforeNodeId: siblingId,
      expectedStructureRevision: treeAfterSibling.body.structureRevision,
      operationId: moveOp,
    });
  check(moveReplay.status === 200 && moveReplay.body.replayed === true, 'Operation replay idempotent');

  const staleMove = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}/placement`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      parentId: rootId,
      beforeNodeId: null,
      expectedStructureRevision: '1',
      operationId: randomUUID(),
    });
  check(
    staleMove.status === 409 && staleMove.body.code === 'LEARNING_REVISION_CONFLICT',
    'Stale structure revision on placement → 409',
  );

  const treeBeforePatch = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const patched = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Dynamic arrays',
      expectedStructureRevision: treeBeforePatch.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(200);
  check(patched.body.resourceId === childId, 'Patch node metadata');

  const treeForContent = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const nodeRow = treeForContent.body.nodes.find((n) => n.id === childId);
  const putContent = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: nodeRow.contentRevision,
      operationId: randomUUID(),
      blocks: [
        { type: 'text', payload: { body: 'Hello <script>x</script>' } },
        { type: 'code', payload: { language: 'ts', body: 'const x = 1;' } },
      ],
    });
  check(putContent.status === 200, 'Replace node content');

  const content = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(content.body.blocks.length === 2, 'Content blocks returned');
  check(content.body.blocks[0].payload.body === 'Hello', 'Text payload sanitized on read');

  const crossContentGet = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(crossContentGet.status === 404, 'Other user cannot read node content');

  const crossPatchNode = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({
      title: 'Hijack',
      expectedStructureRevision: structureRevision,
      operationId: randomUUID(),
    });
  check(crossPatchNode.status === 404, 'Other user cannot patch node');

  const crossPutContent = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({
      expectedContentRevision: content.body.contentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'text', payload: { body: 'Blocked' } }],
    });
  check(crossPutContent.status === 404, 'Other user cannot replace node content');

  const treeProblemBlock = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const problemContentRevision = treeProblemBlock.body.nodes.find(
    (n) => n.id === childId,
  ).contentRevision;

  const invalidProblemUrl = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: problemContentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'problem', payload: { url: 'not-a-url', label: 'Bad' } }],
    });
  check(
    invalidProblemUrl.status === 400 && invalidProblemUrl.body.code === 'PROBLEM_URL_INVALID',
    'Problem block rejects invalid URL',
  );

  const unsupportedProblem = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: problemContentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'problem', payload: { url: 'https://example.com/p', label: 'Other' } }],
    });
  check(
    unsupportedProblem.status === 400 &&
      unsupportedProblem.body.code === 'PROBLEM_PLATFORM_UNSUPPORTED',
    'Problem block rejects unsupported platform host',
  );

  const invalidLink = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: problemContentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'link', payload: { url: 'javascript:alert(1)', label: 'Bad' } }],
    });
  check(invalidLink.status === 400, 'Link block rejects non-http URL scheme');

  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: problemContentRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: {
            url: 'https://leetcode.com/problems/two-sum/',
            label: 'Two Sum',
          },
        },
      ],
    })
    .expect(200);

  const problemContent = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(problemContent.body.blocks.length === 1, 'Problem block saved');
  check(problemContent.body.blocks[0].type === 'problem', 'Problem block type on read');
  check(
    problemContent.body.blocks[0].payload.normalizedUrl ===
      'https://leetcode.com/problems/two-sum/',
    'Problem block stores normalized URL',
  );
  check(
    problemContent.body.blocks[0].problemResolution === 'unresolved',
    'Problem block unresolved without library row',
  );
  check(
    problemContent.body.blocks[0].problemId === undefined,
    'No problemId when unresolved',
  );

  const treeWithProblem = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const childWithProblem = treeWithProblem.body.nodes.find((n) => n.id === childId);
  check(
    childWithProblem?.problemBlocks?.length === 1 &&
      childWithProblem.problemBlocks[0].problemResolution === 'unresolved',
    'Tree exposes unresolved problemBlocks summary',
  );

  const createdProblem = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      topicIds: [],
    })
    .expect(201);
  const libraryProblemId = createdProblem.body.id;

  const linkedContent = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    linkedContent.body.blocks[0].problemResolution === 'linked_unsolved',
    'Problem block linked_unsolved after library create',
  );
  check(
    linkedContent.body.blocks[0].problemId === libraryProblemId,
    'Problem block returns owned problemId',
  );

  await request(server)
    .patch(`/problems/${libraryProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);

  const solvedContent = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    solvedContent.body.blocks[0].problemResolution === 'solved',
    'Problem block solved after library update',
  );

  const treeDupSource = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const treeDupRevision = treeDupSource.body.nodes.find((n) => n.id === childId).contentRevision;
  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: treeDupRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: {
            url: 'https://leetcode.com/problems/two-sum/',
            label: 'Two Sum A',
          },
        },
        {
          type: 'problem',
          payload: {
            url: 'https://leetcode.com/problems/two-sum/',
            label: 'Two Sum B',
          },
        },
      ],
    })
    .expect(200);

  const duplicateBlocksContent = await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(duplicateBlocksContent.body.blocks.length === 2, 'Two problem blocks saved');
  check(
    duplicateBlocksContent.body.blocks.every((block) => block.problemResolution === 'solved'),
    'Duplicate URL blocks share solved resolution',
  );
  check(
    duplicateBlocksContent.body.blocks[0].problemId === libraryProblemId &&
      duplicateBlocksContent.body.blocks[1].problemId === libraryProblemId,
    'Duplicate URL blocks share problemId',
  );

  const guideB = await createGuide(server, userB.cookie, 'B Problem Guide');
  let treeB = await request(server)
    .get(`/learning/guides/${guideB.guideId}/tree`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  const rootBRes = await createNode(
    server,
    userB.cookie,
    guideB.guideId,
    treeB.body.structureRevision,
    'Root B',
  );
  check(rootBRes.status === 201, 'Create root for user B guide');
  treeB = await request(server)
    .get(`/learning/guides/${guideB.guideId}/tree`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  const rootB = treeB.body.nodes[0]?.id;
  if (!rootB) throw new Error('Guide B missing root node.');
  const nodeBRes = await createNode(
    server,
    userB.cookie,
    guideB.guideId,
    treeB.body.structureRevision,
    'Practice step',
    rootB,
  );
  check(nodeBRes.status === 201, 'Create node for user B guide');
  const nodeB = nodeBRes.body.resourceId;
  const treeB2 = await request(server)
    .get(`/learning/guides/${guideB.guideId}/tree`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  const nodeBRow = treeB2.body.nodes.find((n) => n.id === nodeB);
  await request(server)
    .put(`/learning/guides/${guideB.guideId}/nodes/${nodeB}/content`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({
      expectedContentRevision: nodeBRow.contentRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: {
            url: 'https://leetcode.com/problems/two-sum/',
            label: 'Two Sum',
          },
        },
      ],
    })
    .expect(200);
  const problemB = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({
      title: 'Two Sum B',
      url: 'https://leetcode.com/problems/two-sum/',
      topicIds: [],
      status: 'unsolved',
    })
    .expect(201);
  const contentB = await request(server)
    .get(`/learning/guides/${guideB.guideId}/nodes/${nodeB}/content`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  check(
    contentB.body.blocks[0].problemResolution === 'linked_unsolved',
    'Learner B resolution is scoped to B library',
  );
  check(
    contentB.body.blocks[0].problemId === problemB.body.id,
    'Learner B problemId is not user A problem',
  );
  check(
    contentB.body.blocks[0].problemId !== libraryProblemId,
    'Cross-account problem ids differ',
  );

  const linkRows = await pool.query(
    'select block_id from learning_problem_links where guide_id = $1',
    [guideId],
  );
  check(linkRows.rowCount === 2, 'learning_problem_links rows for duplicate blocks');

  const treeClearProblem = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const clearRevision = treeClearProblem.body.nodes.find((n) => n.id === childId).contentRevision;

  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: clearRevision,
      operationId: randomUUID(),
      blocks: [
        { type: 'text', payload: { body: 'Hello' } },
        { type: 'code', payload: { language: 'ts', body: 'const x = 1;' } },
      ],
    })
    .expect(200);

  const linksAfterClear = await pool.query(
    'select block_id from learning_problem_links where guide_id = $1',
    [guideId],
  );
  check(linksAfterClear.rowCount === 0, 'Problem link removed when block replaced');

  await request(server)
    .get(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(404);

  const treeBeforeComplete = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      completionMode: 'manual',
      expectedStructureRevision: treeBeforeComplete.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(200);

  const completeOp = randomUUID();
  const completion = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}/completion`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: completeOp, complete: true });
  check(completion.status === 200, 'Mark node complete');

  const treeProgress = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(treeProgress.body.progress.completedRequired >= 1, 'Progress summary reflects completion');
  check(
    treeProgress.body.nodes.find((n) => n.id === childId)?.completed === true,
    'Completed flag on tree node',
  );

  const enrollmentBefore = await request(server)
    .get(`/learning/guides/${guideId}/enrollment`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(enrollmentBefore.body.guideId === guideId, 'Owner enrollment exists');

  const tree3 = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);

  await request(server)
    .patch(`/learning/guides/${guideId}/enrollment/resume`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      nodeId: childId,
      expectedStructureRevision: tree3.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(200);

  const enrollmentAfter = await request(server)
    .get(`/learning/guides/${guideId}/enrollment`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(enrollmentAfter.body.resumeNodeId === childId, 'Resume position updated');

  const correctOptionId = randomUUID();
  const wrongOptionId = randomUUID();
  const createAssessmentOp = randomUUID();
  const assessmentCreate = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Integration quiz', operationId: createAssessmentOp })
    .expect(201);
  const assessmentId = assessmentCreate.body.id;
  const createReplay = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Integration quiz', operationId: createAssessmentOp });
  check(
    createReplay.status === 201 && createReplay.body.id === assessmentId,
    'Assessment create idempotent replay returns same resource',
  );
  const createConflict = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Different title', operationId: createAssessmentOp });
  check(
    createConflict.status === 409 && createConflict.body.code === 'LEARNING_OPERATION_CONFLICT',
    'Assessment create rejects operationId reuse with different payload',
  );
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'single_choice',
      prompt: {
        stem: 'Pick one',
        options: [
          { id: correctOptionId, label: 'Right' },
          { id: wrongOptionId, label: 'Wrong' },
        ],
      },
      gradingConfig: { correctOptionId },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);
  const wrongOnlyId = randomUUID();
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'single_choice',
      prompt: {
        stem: 'Pick two',
        options: [
          { id: wrongOnlyId, label: 'No' },
          { id: randomUUID(), label: 'Also no' },
        ],
      },
      gradingConfig: { correctOptionId: wrongOnlyId },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);
  const publishOp = randomUUID();
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/revisions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 4000, operationId: publishOp })
    .expect(201);
  const publishReplay = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/publish`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 4000, operationId: publishOp });
  check(publishReplay.status === 201, 'Publish idempotent replay');

  const draftOnly = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Draft gate quiz', operationId: randomUUID() })
    .expect(201);
  const draftAssessmentId = draftOnly.body.id;
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${draftAssessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'true_false',
      prompt: { stem: 'True?' },
      gradingConfig: { correctValue: true },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);

  const treeForGate = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      completionMode: 'gated',
      expectedStructureRevision: treeForGate.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(200);

  const treeGateContent = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const gatedNode = treeGateContent.body.nodes.find((n) => n.id === childId);
  const bogusLink = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: gatedNode.contentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'assessment', payload: { assessmentId: randomUUID(), label: 'Bad' } }],
    });
  check(bogusLink.status === 404, 'Assessment block rejects unknown assessmentId');
  const unpublishedLink = await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: gatedNode.contentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'assessment', payload: { assessmentId: draftAssessmentId, label: 'Draft' } }],
    });
  check(
    unpublishedLink.status === 409 && unpublishedLink.body.code === 'ASSESSMENT_UNPUBLISHED',
    'Assessment block rejects unpublished assessment',
  );
  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${childId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: gatedNode.contentRevision,
      operationId: randomUUID(),
      blocks: [{ type: 'assessment', payload: { assessmentId, label: 'Quiz' } }],
    })
    .expect(200);

  const treeBeforePass = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeBeforePass.body.nodes.find((n) => n.id === childId)?.completed === false,
    'Gated node incomplete before pass',
  );

  const attemptStart = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(201);
  const attemptId = attemptStart.body.id;
  const attemptResume = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(attemptResume.body.id === attemptId, 'Resume in-progress attempt returns 200');
  const questionId = attemptStart.body.questions[0].id;
  const saveOp = randomUUID();
  await request(server)
    .patch(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/answers`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      questionId,
      response: { selectedOptionId: correctOptionId },
      operationId: saveOp,
    })
    .expect(200);
  const saveConflict = await request(server)
    .patch(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/answers`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      questionId,
      response: { value: false },
      operationId: saveOp,
    });
  check(
    saveConflict.status === 409 && saveConflict.body.code === 'LEARNING_OPERATION_CONFLICT',
    'Save rejects operationId reuse with different payload',
  );
  const crossGet = await request(server)
    .get(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(crossGet.status === 404, 'Other user cannot read attempt');
  const crossStartAttempt = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(crossStartAttempt.status === 404, 'Other user cannot start attempt on foreign guide');
  const submitOp = randomUUID();
  const submit = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/submissions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: submitOp })
    .expect(201);
  check(submit.body.scoreBasisPoints === 5000, 'Partial attempt scores half of basis points');
  check(submit.body.passed === true, 'Attempt passes threshold');
  const submitReplay = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/attempts/${attemptId}/submit`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: submitOp })
    .expect(201);
  check(
    submitReplay.body.scoreBasisPoints === submit.body.scoreBasisPoints,
    'Submit operation idempotent replay',
  );

  const treeAfterPass = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeAfterPass.body.nodes.find((n) => n.id === childId)?.completed === true,
    'Gated node complete after assessment pass',
  );

  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${assessmentId}/revisions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 6000, operationId: randomUUID() })
    .expect(201);
  const treeAfterHigherThreshold = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeAfterHigherThreshold.body.nodes.find((n) => n.id === childId)?.completed === false,
    'Gated node reopens when active revision threshold rises',
  );

  const gatedManual = await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${childId}/completion`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: randomUUID(), complete: false });
  check(
    gatedManual.status === 409 && gatedManual.body.code === 'GATED_COMPLETION',
    'Manual completion blocked on gated node',
  );

  const treeForComboGate = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const comboGateCreate = await createNode(
    server,
    userA.cookie,
    guideId,
    treeForComboGate.body.structureRevision,
    'Gate and problem',
    rootId,
  );
  check(comboGateCreate.status === 201, 'Create gated assessment+problem node');
  const treeComboGate = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const comboGateNodeId = treeComboGate.body.nodes.find(
    (n) => n.title === 'Gate and problem',
  )?.id;
  check(Boolean(comboGateNodeId), 'Combo gate node listed in tree');
  await request(server)
    .patch(`/learning/guides/${guideId}/nodes/${comboGateNodeId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      completionMode: 'gated',
      expectedStructureRevision: treeComboGate.body.structureRevision,
      operationId: randomUUID(),
    })
    .expect(200);
  const comboAssessmentCreate = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Combo gate quiz', operationId: randomUUID() })
    .expect(201);
  const comboAssessmentId = comboAssessmentCreate.body.id;
  const comboCorrectId = randomUUID();
  const comboWrongId = randomUUID();
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${comboAssessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'single_choice',
      prompt: {
        stem: 'Pick one',
        options: [
          { id: comboCorrectId, label: 'Right' },
          { id: comboWrongId, label: 'Wrong' },
        ],
      },
      gradingConfig: { correctOptionId: comboCorrectId },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${comboAssessmentId}/revisions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 4000, operationId: randomUUID() })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${comboAssessmentId}/publish`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 4000, operationId: randomUUID() })
    .expect(201);
  const treeComboContent = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const comboGateRow = treeComboContent.body.nodes.find((n) => n.id === comboGateNodeId);
  await request(server)
    .put(`/learning/guides/${guideId}/nodes/${comboGateNodeId}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: comboGateRow.contentRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'assessment',
          payload: { assessmentId: comboAssessmentId, label: 'Combo quiz' },
        },
        {
          type: 'problem',
          payload: {
            url: 'https://leetcode.com/problems/add-two-numbers/',
            label: 'Add Two Numbers',
          },
        },
      ],
    })
    .expect(200);
  const comboAttemptStart = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${comboAssessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(201);
  const comboAttemptId = comboAttemptStart.body.id;
  const comboQuestion = comboAttemptStart.body.questions[0];
  await request(server)
    .patch(
      `/learning/guides/${guideId}/assessments/${comboAssessmentId}/attempts/${comboAttemptId}/answers`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      questionId: comboQuestion.id,
      response: { selectedOptionId: comboCorrectId },
      operationId: randomUUID(),
    })
    .expect(200);
  const comboSubmit = await request(server)
    .post(
      `/learning/guides/${guideId}/assessments/${comboAssessmentId}/attempts/${comboAttemptId}/submissions`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: randomUUID() })
    .expect(201);
  check(comboSubmit.body.passed === true, 'Combo gate assessment passes');
  const treeAssessmentOnly = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeAssessmentOnly.body.nodes.find((n) => n.id === comboGateNodeId)?.completed === false,
    'Gated node incomplete when assessment passes but problem unsolved',
  );
  const comboProblemCreate = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      url: 'https://leetcode.com/problems/add-two-numbers/',
      title: 'Add Two Numbers',
    })
    .expect(201);
  const comboProblemId = comboProblemCreate.body.id;
  await request(server)
    .patch(`/problems/${comboProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);
  const treeBothSatisfied = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeBothSatisfied.body.nodes.find((n) => n.id === comboGateNodeId)?.completed === true,
    'Gated node complete when assessment passes and problem solved',
  );
  await request(server)
    .patch(`/problems/${comboProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'unsolved' })
    .expect(200);
  const treeReopenedProblem = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeReopenedProblem.body.nodes.find((n) => n.id === comboGateNodeId)?.completed === false,
    'Gated node reopens when linked problem marked unsolved',
  );
  await request(server)
    .patch(`/problems/${comboProblemId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ status: 'solved' })
    .expect(200);
  const treeResolvedAgain = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    treeResolvedAgain.body.nodes.find((n) => n.id === comboGateNodeId)?.completed === true,
    'Gated node completes again after problem re-solved',
  );

  const mcA = randomUUID();
  const mcB = randomUUID();
  const typesAssessmentCreate = await request(server)
    .post(`/learning/guides/${guideId}/assessments`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ title: 'Types quiz', operationId: randomUUID() })
    .expect(201);
  const typesAssessmentId = typesAssessmentCreate.body.id;
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${typesAssessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'multiple_choice',
      prompt: {
        stem: 'Select all',
        options: [
          { id: mcA, label: 'A' },
          { id: mcB, label: 'B' },
        ],
      },
      gradingConfig: { correctOptionIds: [mcA, mcB] },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${typesAssessmentId}/questions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      kind: 'numerical',
      prompt: { stem: 'Value', unit: 'units' },
      gradingConfig: { correctValueScaled: 1050, toleranceScaled: 50 },
      points: 1,
      operationId: randomUUID(),
    })
    .expect(201);
  await request(server)
    .post(`/learning/guides/${guideId}/assessments/${typesAssessmentId}/revisions`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ passingBasisPoints: 7000, operationId: randomUUID() })
    .expect(201);
  const typesStart = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${typesAssessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(201);
  const typesAttemptId = typesStart.body.id;
  const mcQuestion = typesStart.body.questions.find((q) => q.kind === 'multiple_choice');
  const numQuestion = typesStart.body.questions.find((q) => q.kind === 'numerical');
  check(mcQuestion && numQuestion, 'MC and numerical questions on attempt');
  await request(server)
    .patch(
      `/learning/guides/${guideId}/assessments/${typesAssessmentId}/attempts/${typesAttemptId}/answers`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      questionId: mcQuestion.id,
      response: { selectedOptionIds: [mcB, mcA] },
      operationId: randomUUID(),
    })
    .expect(200);
  await request(server)
    .patch(
      `/learning/guides/${guideId}/assessments/${typesAssessmentId}/attempts/${typesAttemptId}/answers`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      questionId: numQuestion.id,
      response: { valueScaled: 1040 },
      operationId: randomUUID(),
    })
    .expect(200);
  const typesSubmit = await request(server)
    .post(
      `/learning/guides/${guideId}/assessments/${typesAssessmentId}/attempts/${typesAttemptId}/submit`,
    )
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ operationId: randomUUID() })
    .expect(201);
  check(typesSubmit.body.passed === true, 'MC and numerical attempt passes');
  check(typesSubmit.body.scoreBasisPoints === 10000, 'Full score on MC + numerical');
  const typesRetake = await request(server)
    .post(`/learning/guides/${guideId}/assessments/${typesAssessmentId}/attempts`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(201);
  check(typesRetake.body.id !== typesAttemptId, 'Retake starts new attempt after finalize');

  const guideDetail = await request(server)
    .get(`/learning/guides/${guideId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);

  await request(server)
    .patch(`/learning/guides/${guideId}/lifecycle`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      action: 'archive',
      expectedMetadataRevision: guideDetail.body.metadataRevision,
      operationId: randomUUID(),
    })
    .expect(200);

  const listArchived = await request(server)
    .get('/learning/guides?status=archived')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    listArchived.body.items.some((g) => g.id === guideId),
    'Archived guide appears in archived library list',
  );
  const listSearchArchived = await request(server)
    .get('/learning/guides?search=algo&status=archived')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    listSearchArchived.body.items.some((g) => g.id === guideId),
    'Guide list search matches archived guide title',
  );
  const listSearchActive = await request(server)
    .get('/learning/guides?search=algo&status=active')
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    !listSearchActive.body.items.some((g) => g.id === guideId),
    'Archived guide excluded from active search',
  );

  const archivedCreate = await createNode(
    server,
    userA.cookie,
    guideId,
    tree3.body.structureRevision,
    'Blocked',
  );
  check(
    archivedCreate.status === 409 && archivedCreate.body.code === 'LEARNING_LIFECYCLE_CONFLICT',
    'Archived guide rejects node create',
  );

  await request(server)
    .patch(`/learning/guides/${guideId}/lifecycle`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      action: 'unarchive',
      expectedMetadataRevision: String(BigInt(guideDetail.body.metadataRevision) + 1n),
      operationId: randomUUID(),
    })
    .expect(200);

  const treeBeforeDelete = await request(server)
    .get(`/learning/guides/${guideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);

  await request(server)
    .delete(`/learning/guides/${guideId}/nodes/${childId}`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .set('X-Expected-Revision', treeBeforeDelete.body.structureRevision)
    .set('X-Operation-Id', randomUUID())
    .expect(204);

  const recovery = await request(server)
    .get(`/learning/guides/${guideId}/recovery`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(recovery.body.items.some((item) => item.id === childId), 'Deleted subtree appears in recovery');

  const backlinkGuide = await createGuide(server, userA.cookie, 'Backlink guide');
  const backlinkGuideId = backlinkGuide.guideId;
  const treeBacklink0 = await request(server)
    .get(`/learning/guides/${backlinkGuideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    (await createNode(
      server,
      userA.cookie,
      backlinkGuideId,
      treeBacklink0.body.structureRevision,
      'Backlink root',
    )).status === 201,
    'Create backlink guide root',
  );
  const treeBacklinkRoot = await request(server)
    .get(`/learning/guides/${backlinkGuideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const backlinkRootId = treeBacklinkRoot.body.nodes[0]?.id;
  check(Boolean(backlinkRootId), 'Backlink guide has root node');
  const backlinkStepATitle = 'Backlink step A';
  const backlinkStepBTitle = 'Backlink step B';
  check(
    (await createNode(
      server,
      userA.cookie,
      backlinkGuideId,
      treeBacklinkRoot.body.structureRevision,
      backlinkStepATitle,
      backlinkRootId,
    )).status === 201,
    'Create backlink test node A',
  );
  const treeBacklink1 = await request(server)
    .get(`/learning/guides/${backlinkGuideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    (await createNode(
      server,
      userA.cookie,
      backlinkGuideId,
      treeBacklink1.body.structureRevision,
      backlinkStepBTitle,
      backlinkRootId,
    )).status === 201,
    'Create backlink test node B',
  );
  const treeBacklink2 = await request(server)
    .get(`/learning/guides/${backlinkGuideId}/tree`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  const backlinkNodeA = treeBacklink2.body.nodes.find((n) => n.title === backlinkStepATitle);
  const backlinkNodeB = treeBacklink2.body.nodes.find((n) => n.title === backlinkStepBTitle);
  check(Boolean(backlinkNodeA?.id && backlinkNodeB?.id), 'Backlink test nodes listed');
  const backlinkUrl = 'https://leetcode.com/problems/reverse-linked-list/';
  await request(server)
    .put(`/learning/guides/${backlinkGuideId}/nodes/${backlinkNodeA.id}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: backlinkNodeA.contentRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: { url: backlinkUrl, label: 'Reverse list' },
        },
      ],
    })
    .expect(200);
  await request(server)
    .put(`/learning/guides/${backlinkGuideId}/nodes/${backlinkNodeB.id}/content`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      expectedContentRevision: backlinkNodeB.contentRevision,
      operationId: randomUUID(),
      blocks: [
        {
          type: 'problem',
          payload: { url: backlinkUrl, label: 'Reverse list B' },
        },
      ],
    })
    .expect(200);
  const backlinkProblem = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({
      url: backlinkUrl,
      title: 'Reverse Linked List',
    })
    .expect(201);
  const backlinkProblemId = backlinkProblem.body.id;
  const refsA = await request(server)
    .get(`/problems/${backlinkProblemId}/learning-references`)
    .set(headers)
    .set('Cookie', userA.cookie)
    .expect(200);
  check(
    refsA.body.items.length === 2 &&
      refsA.body.items.some((row) => row.nodeTitle === backlinkStepATitle) &&
      refsA.body.items.some((row) => row.nodeTitle === backlinkStepBTitle),
    'Problem learning references list two owning guide steps',
  );
  const refsCross = await request(server)
    .get(`/problems/${backlinkProblemId}/learning-references`)
    .set(headers)
    .set('Cookie', userB.cookie);
  check(refsCross.status === 404, 'Other user cannot read learning references for foreign problem');
  const backlinkProblemB = await request(server)
    .post('/problems')
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({
      url: backlinkUrl,
      title: 'Reverse Linked List B copy',
    })
    .expect(201);
  const refsB = await request(server)
    .get(`/problems/${backlinkProblemB.body.id}/learning-references`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .expect(200);
  check(refsB.body.items.length === 0, 'Owner with no guide links sees empty learning references');

  await request(server)
    .get('/learning/guides')
    .set(headers)
    .expect(401);
  count++;

  const csrfCreateGuide = await request(server)
    .post('/learning/guides')
    .set('Origin', headers.Origin)
    .set('Cookie', userA.cookie)
    .send({ title: 'CSRF', description: '', operationId: randomUUID() });
  check(csrfCreateGuide.status === 403, 'Guide create requires X-Requested-With');

  const csrfImportPreview = await request(server)
    .post('/learning/imports/preview')
    .set('Origin', headers.Origin)
    .set('Cookie', userA.cookie)
    .send({ format: 'markdown', content: '# CSRF\n' });
  check(csrfImportPreview.status === 403, 'Import preview requires X-Requested-With');

  const previewForCross = await request(server)
    .post('/learning/imports/preview')
    .set(headers)
    .set('Cookie', userA.cookie)
    .send({ format: 'markdown', content: '# Cross commit\n' })
    .expect(201);
  const crossImportCommit = await request(server)
    .post(`/learning/imports/${previewForCross.body.importId}/commit`)
    .set(headers)
    .set('Cookie', userB.cookie)
    .send({ operationId: randomUUID() });
  check(crossImportCommit.status === 404, 'Other user cannot commit foreign import preview');

  let importRateLimited = false;
  for (let i = 0; i < 5; i++) {
    const previewRes = await request(server)
      .post('/learning/imports/preview')
      .set(headers)
      .set('Cookie', userB.cookie)
      .send({ format: 'markdown', content: `# Limit ${i}\n` });
    if (previewRes.status === 429) {
      importRateLimited = true;
      check(previewRes.body.code === 'RATE_LIMITED', 'Import rate limit uses RATE_LIMITED code');
      break;
    }
    check(previewRes.status === 201, 'Import preview allowed under rate limit');
  }
  check(importRateLimited, 'Import preview returns 429 after hourly threshold');

  const doc = createApiDocument(app);
  check(
    [
      '/learning/guides',
      '/learning/guides/{guideId}/tree',
      '/problems/{problemId}/learning-references',
    ].every((path) => path in doc.paths),
    'Swagger documents learning and problem backlink routes',
  );

  console.log(
    `Passed ${count} PostgreSQL/HTTP learning assertions. Users: ${emails.length}.`,
  );
} finally {
  if (emails.length)
    await pool
      .query('delete from users where email=ANY($1::text[])', [emails])
      .catch(() => {});
  await app.close();
  await pool.end();
}