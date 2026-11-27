import { defineRelations } from 'drizzle-orm';
import { platforms } from './platforms/platforms.table.js';

// Register every table for the v2 relational query API, even before it has edges.
// Import leaf tables here to avoid a cycle through the public schema barrel.
import { users } from './users/users.table.js';
import { authSessions } from './auth/auth-sessions.table.js';
import { passwordResetTokens } from './auth/password-reset-tokens.table.js';
import { authProviderIdentities } from './auth/auth-provider-identities.table.js';
import { riscEventReceipts } from './auth/risc-event-receipts.table.js';
import { topics } from './topics/topics.table.js';
import { problems } from './problems/problems.table.js';
import { problemTopics } from './problems/problem-topics.table.js';
import { media } from './media/media.table.js';
import { userWorkEntries } from './profile/user-work-entries.table.js';
import { userEducationEntries } from './profile/user-education-entries.table.js';
import { discoverDailyCounters } from './discover/discover-daily-counters.table.js';
import { userFollows } from './follows/user-follows.table.js';
import { discoverReports } from './discover-safety/discover-reports.table.js';
import { userBlocks } from './discover-safety/user-blocks.table.js';

import { learningGuides } from './learning/learning-guides.table.js';
import { learningNodes } from './learning/learning-nodes.table.js';
import { learningEnrollments } from './learning/learning-enrollments.table.js';

import { learningOperations } from './learning/learning-operations.table.js';
import { learningBlocks } from './learning/learning-blocks.table.js';
import { learningNodeProgress } from './learning/learning-node-progress.table.js';
import { learningAssessments } from './learning/learning-assessments.table.js';
import { learningAssessmentRevisions } from './learning/learning-assessment-revisions.table.js';
import { learningQuestions } from './learning/learning-questions.table.js';
import { learningAttempts } from './learning/learning-attempts.table.js';
import { learningAnswers } from './learning/learning-answers.table.js';
import { learningAssessmentLinks } from './learning/learning-assessment-links.table.js';
import { learningProblemLinks } from './learning/learning-problem-links.table.js';

const tables = {
  learningOperations,
  learningBlocks,
  learningNodeProgress,
  learningGuides,
  learningNodes,
  learningEnrollments,
  learningAssessments,
  learningAssessmentRevisions,
  learningQuestions,
  learningAttempts,
  learningAnswers,
  learningAssessmentLinks,
  learningProblemLinks,
  platforms,
  users,
  authSessions,
  passwordResetTokens,
  authProviderIdentities,
  riscEventReceipts,
  topics,
  problems,
  problemTopics,
  media,
  userWorkEntries,
  userEducationEntries,
  discoverDailyCounters,
  userFollows,
  userBlocks,
  discoverReports,
};

export const relations = defineRelations(tables);
