import { describe, expect, test } from 'vitest';
import { validateAddQuestionInput } from './assessment-question.validation.js';

describe('validateAddQuestionInput', () => {
  test('rejects unknown correct option id', () => {
    const optionId = '11111111-1111-4111-8111-111111111111';
    const result = validateAddQuestionInput({
      kind: 'single_choice',
      prompt: {
        stem: 'Q',
        options: [{ id: optionId, label: 'A' }],
      },
      gradingConfig: { correctOptionId: '22222222-2222-4222-8222-222222222222' },
      points: 1,
    });
    expect(result).toBe('option_mismatch');
  });
});