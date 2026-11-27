import { Module } from '@nestjs/common';
import { LearningAttemptRateLimitGuard } from './learning-attempt-rate-limit.guard.js';
import { LearningAttemptRateLimiter } from './learning-attempt-rate-limiter.js';
import { LearningImportRateLimitGuard } from './learning-import-rate-limit.guard.js';
import { LearningImportRateLimiter } from './learning-import-rate-limiter.js';

@Module({
  providers: [
    LearningImportRateLimiter,
    LearningAttemptRateLimiter,
    LearningImportRateLimitGuard,
    LearningAttemptRateLimitGuard,
  ],
  exports: [
    LearningImportRateLimiter,
    LearningAttemptRateLimiter,
    LearningImportRateLimitGuard,
    LearningAttemptRateLimitGuard,
  ],
})
export class LearningRateLimitModule {}