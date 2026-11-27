import { pgEnum } from 'drizzle-orm/pg-core';

export const learningQuestionKind = {
  SingleChoice: 'single_choice',
  TrueFalse: 'true_false',
  MultipleChoice: 'multiple_choice',
  Numerical: 'numerical',
} as const;

export const LEARNING_QUESTION_KINDS = [
  learningQuestionKind.SingleChoice,
  learningQuestionKind.TrueFalse,
  learningQuestionKind.MultipleChoice,
  learningQuestionKind.Numerical,
] as const;

/** Objective kinds graded server-side in Release 1. */
export const R1_OBJECTIVE_QUESTION_KINDS = [
  learningQuestionKind.SingleChoice,
  learningQuestionKind.TrueFalse,
  learningQuestionKind.MultipleChoice,
  learningQuestionKind.Numerical,
] as const;

export type LearningQuestionKind = (typeof LEARNING_QUESTION_KINDS)[number];

export const learningQuestionKindEnum = pgEnum(
  'learning_question_kind',
  [...LEARNING_QUESTION_KINDS],
);