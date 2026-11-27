import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { LearningGuidesController } from './learning-guides.controller.js';
import { LearningGuidesRepository } from './learning-guides.repository.js';
import { LearningGuidesService } from './learning-guides.service.js';

// Register in AppModule only after migration and runtime verification.
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [LearningGuidesController],
  providers: [LearningGuidesRepository, LearningGuidesService],
})
export class LearningModule {}
