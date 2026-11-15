import { defineRelations } from 'drizzle-orm';
import { platforms } from './platforms/platforms.table.js';

// Register every table for the v2 relational query API, even before it has edges.
// Import leaf tables here to avoid a cycle through the public schema barrel.
import { users } from './users/users.table.js';
import { authSessions } from './auth/auth-sessions.table.js';
import { passwordResetTokens } from './auth/password-reset-tokens.table.js';
import { topics } from './topics/topics.table.js';

const tables = {
  platforms,
  users,
  authSessions,
  passwordResetTokens,
  topics,
};

export const relations = defineRelations(tables);
