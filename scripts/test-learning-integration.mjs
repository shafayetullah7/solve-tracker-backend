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

  await request(server)
    .get('/learning/guides')
    .set(headers)
    .expect(401);
  count++;

  const doc = createApiDocument(app);
  check(
    ['/learning/guides', '/learning/guides/{guideId}/tree'].every((path) => path in doc.paths),
    'Swagger documents learning guide and tree routes',
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