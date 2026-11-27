import { describe, expect, test, vi } from 'vitest';
import { AssessmentsService } from './assessments.service.js';
import type { AssessmentsRepository } from './assessments.repository.js';
import type { AssessmentMutationsRepository } from './assessment-mutations.repository.js';

describe('AssessmentsService', () => {
  test('rejects publish with no questions', async () => {
    const repo = {
      findOwnedGuide: vi.fn().mockResolvedValue({ id: 'g1', archivedAt: null }),
      findOwnedAssessment: vi.fn().mockResolvedValue({
        id: 'a1',
        guideId: 'g1',
        title: 'Quiz',
        activeRevisionId: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findDraftRevision: vi.fn().mockResolvedValue({ id: 'd1' }),
      listDraftQuestions: vi.fn().mockResolvedValue([]),
    } as unknown as AssessmentsRepository;
    const mutations = {
      publish: vi.fn().mockRejectedValue(new Error('NO_QUESTIONS')),
    } as unknown as AssessmentMutationsRepository;
    const service = new AssessmentsService(repo, mutations);
    const guideId = '22222222-2222-4222-8222-222222222222';
    const assessmentId = '33333333-3333-4333-8333-333333333333';
    await expect(
      service.publish('u1', guideId, assessmentId, {
        passingBasisPoints: 7000,
        feedbackPolicy: 'after_submit',
        operationId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
  });
});