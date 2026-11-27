import { describe, expect, test } from 'vitest';
import { computeScoreBasisPoints, gradeObjectiveAnswer, meetsPassingThreshold } from './grade-objective.js';

describe('gradeObjectiveAnswer', () => {
  test('single choice awards full points when correct', () => {
    const optionId = '11111111-1111-4111-8111-111111111111';
    const result = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'single_choice',
        points: 2,
        gradingConfig: { correctOptionId: optionId },
      },
      { selectedOptionId: optionId },
    );
    expect(result.awardedPoints).toBe(2);
  });

  test('multiple choice requires full set match', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    const ok = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'multiple_choice',
        points: 3,
        gradingConfig: { correctOptionIds: [a, b] },
      },
      { selectedOptionIds: [b, a] },
    );
    expect(ok.awardedPoints).toBe(3);
    const partial = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'multiple_choice',
        points: 3,
        gradingConfig: { correctOptionIds: [a, b] },
      },
      { selectedOptionIds: [a] },
    );
    expect(partial.awardedPoints).toBe(0);
  });

  test('multiple choice rejects duplicate selected ids', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const dup = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'multiple_choice',
        points: 3,
        gradingConfig: { correctOptionIds: [a] },
      },
      { selectedOptionIds: [a, a] },
    );
    expect(dup.awardedPoints).toBe(0);
  });

  test('numerical within tolerance', () => {
    const ok = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'numerical',
        points: 1,
        gradingConfig: { correctValueScaled: 1050, toleranceScaled: 10 },
      },
      { valueScaled: 1045 },
    );
    expect(ok.awardedPoints).toBe(1);
  });

  test('true false unanswered scores zero', () => {
    const result = gradeObjectiveAnswer(
      {
        id: 'q1',
        kind: 'true_false',
        points: 1,
        gradingConfig: { correctValue: true },
      },
      null,
    );
    expect(result.awardedPoints).toBe(0);
  });
});

describe('score basis', () => {
  test('threshold cross multiplication', () => {
    expect(computeScoreBasisPoints(7, 10)).toBe(7000);
    expect(meetsPassingThreshold(7, 10, 7000)).toBe(true);
    expect(meetsPassingThreshold(6, 10, 7000)).toBe(false);
  });
});