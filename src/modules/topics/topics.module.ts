import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';
import { TopicsRepository } from './topics.repository.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicsRepository],
})
export class TopicsModule {}