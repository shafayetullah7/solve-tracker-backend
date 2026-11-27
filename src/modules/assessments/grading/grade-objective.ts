import { learningQuestionKind } from '../../../database/schema/learning/learning-question-kind.enum.js';

export type QuestionRow = {
  id: string;
  kind: string;
  points: number;
  gradingConfig: unknown;
};

export function gradeObjectiveAnswer(
  question: QuestionRow,
  response: unknown,
): { awardedPoints: number; valid: boolean } {
  if (question.kind === learningQuestionKind.SingleChoice) {
    const config = question.gradingConfig as { correctOptionId?: string };
    const selected = response as { selectedOptionId?: string } | null;
    if (!selected?.selectedOptionId) return { awardedPoints: 0, valid: true };
    const correct = selected.selectedOptionId === config.correctOptionId;
    return { awardedPoints: correct ? question.points : 0, valid: true };
  }
  if (question.kind === learningQuestionKind.TrueFalse) {
    const config = question.gradingConfig as { correctValue?: boolean };
    const selected = response as { value?: boolean } | null;
    if (selected?.value === undefined) return { awardedPoints: 0, valid: true };
    return {
      awardedPoints: selected.value === config.correctValue ? question.points : 0,
      valid: true,
    };
  }
  if (question.kind === learningQuestionKind.MultipleChoice) {
    const config = question.gradingConfig as { correctOptionIds?: string[] };
    const selected = response as { selectedOptionIds?: string[] } | null;
    const raw = selected?.selectedOptionIds ?? [];
    if (raw.length > 0 && raw.length !== new Set(raw).size) {
      return { awardedPoints: 0, valid: true };
    }
    const chosen = [...raw].sort();
    const correct = [...(config.correctOptionIds ?? [])].sort();
    if (chosen.length === 0) return { awardedPoints: 0, valid: true };
    const match =
      chosen.length === correct.length && chosen.every((id, i) => id === correct[i]);
    return { awardedPoints: match ? question.points : 0, valid: true };
  }
  if (question.kind === learningQuestionKind.Numerical) {
    const config = question.gradingConfig as {
      correctValueScaled?: number;
      toleranceScaled?: number;
    };
    const selected = response as { valueScaled?: number } | null;
    if (selected?.valueScaled === undefined) return { awardedPoints: 0, valid: true };
    const target = config.correctValueScaled ?? 0;
    const tolerance = config.toleranceScaled ?? 0;
    const within = Math.abs(selected.valueScaled - target) <= tolerance;
    return { awardedPoints: within ? question.points : 0, valid: true };
  }
  return { awardedPoints: 0, valid: false };
}

export function computeScoreBasisPoints(earned: number, possible: number): number {
  if (possible <= 0) return 0;
  return Math.floor((earned * 10000) / possible);
}

export function meetsPassingThreshold(
  earned: number,
  possible: number,
  passingBasisPoints: number,
): boolean {
  if (possible <= 0) return false;
  return earned * 10000 >= passingBasisPoints * possible;
}