import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { MediaModule } from '../media/media.module.js';
import { DiscoverSubjectRepository } from '../discover/discover-subject.repository.js';
import { DiscoverRepository } from '../discover/discover.repository.js';
import { FollowsRepository } from './follows.repository.js';
import { FollowsService } from './follows.service.js';

@Module({
  imports: [DatabaseModule, MediaModule],
  providers: [
    FollowsRepository,
    FollowsService,
    DiscoverSubjectRepository,
    DiscoverRepository,
  ],
  exports: [FollowsService],
})
export class FollowsModule {}