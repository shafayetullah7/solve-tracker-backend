import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProblemsController } from './problems.controller.js';
import { ProblemsService } from './problems.service.js';
import { ProblemsRepository } from './problems.repository.js';
import { ProblemsLearningReadService } from './problems-learning-read.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProblemsController],
  providers: [ProblemsService, ProblemsRepository, ProblemsLearningReadService],
  exports: [ProblemsLearningReadService],
})
export class ProblemsModule {}