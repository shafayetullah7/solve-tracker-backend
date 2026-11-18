import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DiscoverSubjectRepository } from '../discover/discover-subject.repository.js';
import { DiscoverSafetyRepository } from './discover-safety.repository.js';
import { DiscoverSafetyService } from './discover-safety.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    DiscoverSafetyRepository,
    DiscoverSafetyService,
    DiscoverSubjectRepository,
  ],
  exports: [DiscoverSafetyService],
})
export class DiscoverSafetyModule {}