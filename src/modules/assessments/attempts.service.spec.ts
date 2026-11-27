import { describe, expect, test, vi } from 'vitest';
import { AttemptsService } from './attempts.service.js';
import type { AttemptsRepository } from './attempts.repository.js';
import type { AssessmentsRepository } from './assessments.repository.js';
import type { AttemptMutationsRepository } from './attempt-mutations.repository.js';

describe('AttemptsService', () => {
  const guideId = '22222222-2222-4222-8222-222222222222';
  const assessmentId = '33333333-3333-4333-8333-333333333333';

  test('rejects invalid attempt id on get', async () => {
    const attempts = {
      findEnrollment: vi.fn().mockResolvedValue({ id: 'e1' }),
    } as unknown as AttemptsRepository;
    const assessments = {
      findOwnedGuide: vi.fn().mockResolvedValue({ id: guideId }),
    } as unknown as AssessmentsRepository;
    const mutations = {} as unknown as AttemptMutationsRepository;
    const service = new AttemptsService(attempts, assessments, mutations);
    await expect(service.get('u1', guideId, assessmentId, 'not-a-uuid')).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
  });
});