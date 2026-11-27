import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LearningGuidesController } from './learning-guides.controller.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import { LearningGuideMutationsRepository } from './learning-guide-mutations.repository.js';
import { LearningGuidesService } from './learning-guides.service.js';
import { LearningPortabilityController } from './learning-portability.controller.js';
import { LearningPortabilityService } from './learning-portability.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [LearningGuidesController, LearningPortabilityController],
  providers: [LearningGuidesRepository, LearningGuidesService, LearningGuideMutationsRepository, LearningPortabilityService],
})
export class LearningModule {}
