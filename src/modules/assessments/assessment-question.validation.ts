import type { AddQuestionInput } from './schemas/assessment-question.schema.js';

export type QuestionValidationIssue = 'option_mismatch';

export function validateAddQuestionInput(input: AddQuestionInput): QuestionValidationIssue | null {
  if (input.kind === 'single_choice') {
    const ids = new Set(input.prompt.options.map((o) => o.id));
    if (!ids.has(input.gradingConfig.correctOptionId)) return 'option_mismatch';
  }
  if (input.kind === 'multiple_choice') {
    const ids = new Set(input.prompt.options.map((o) => o.id));
    if (!input.gradingConfig.correctOptionIds.every((id) => ids.has(id))) return 'option_mismatch';
  }
  return null;
}