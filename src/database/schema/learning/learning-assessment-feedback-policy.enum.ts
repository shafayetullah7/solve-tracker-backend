import { pgEnum } from 'drizzle-orm/pg-core';

export const learningAssessmentFeedbackPolicy = {
  Never: 'never',
  AfterSubmit: 'after_submit',
} as const;

export const LEARNING_ASSESSMENT_FEEDBACK_POLICIES = [
  learningAssessmentFeedbackPolicy.Never,
  learningAssessmentFeedbackPolicy.AfterSubmit,
] as const;

export type LearningAssessmentFeedbackPolicy =
  (typeof LEARNING_ASSESSMENT_FEEDBACK_POLICIES)[number];

export const learningAssessmentFeedbackPolicyEnum = pgEnum(
  'learning_assessment_feedback_policy',
  [...LEARNING_ASSESSMENT_FEEDBACK_POLICIES],
);