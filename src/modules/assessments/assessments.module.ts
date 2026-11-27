import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LearningRateLimitModule } from '../learning/learning-rate-limit.module.js';
import { AssessmentMutationsRepository } from './assessment-mutations.repository.js';
import { AttemptMutationsRepository } from './attempt-mutations.repository.js';
import { AssessmentsController } from './assessments.controller.js';
import { AttemptsController } from './attempts.controller.js';
import { AssessmentsRepository } from './assessments.repository.js';
import { AssessmentsService } from './assessments.service.js';
import { AttemptsRepository } from './attempts.repository.js';
import { AttemptsService } from './attempts.service.js';

@Module({
  imports: [DatabaseModule, AuthModule, LearningRateLimitModule],
  controllers: [AssessmentsController, AttemptsController],
  providers: [
    AssessmentsRepository,
    AssessmentMutationsRepository,
    AssessmentsService,
    AttemptsRepository,
    AttemptMutationsRepository,
    AttemptsService,
  ],
  exports: [AssessmentsService, AssessmentsRepository, AttemptsService, AttemptsRepository],
})
export class AssessmentsModule {}