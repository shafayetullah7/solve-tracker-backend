import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaModule } from '../media/media.module.js';
import { ProgressModule } from '../progress/progress.module.js';
import { DiscoverCountersService } from './discover-counters.service.js';
import { DiscoverModeGuard } from './discover-mode.guard.js';
import { DiscoverProfileReadLimiter } from './discover-profile-read-limiter.js';
import { DiscoverRateLimitGuard } from './discover-rate-limit.guard.js';
import { DiscoverSubjectRepository } from './discover-subject.repository.js';
import { DiscoverBucketLimiter } from './discover-bucket-limiter.js';
import {
  DiscoverReadRateLimitGuard,
  DiscoverSearchRateLimitGuard,
} from './discover-bucket-rate-limit.guard.js';
import { DiscoverController } from './discover.controller.js';
import { DiscoverFullModeGuard } from './discover-full-mode.guard.js';
import { DiscoverRepository } from './discover.repository.js';
import { DiscoverService } from './discover.service.js';
import { TopicDiscoverService } from './topic-discover.service.js';
import { TopicMaterialRepository } from './topic-material.repository.js';
import { CompareService } from './compare.service.js';
import { PeopleCopyService } from './people-copy.service.js';
import { DiscoverCopyLimiter } from './discover-copy-limiter.js';
import { DiscoverCopyRateLimitGuard } from './discover-copy-rate-limit.guard.js';
import { ProblemsRepository } from '../problems/problems.repository.js';
import { TopicsRepository } from '../topics/topics.repository.js';
import { PeopleController } from './people.controller.js';
import { PeopleRepository } from './people.repository.js';
import { PeopleService } from './people.service.js';
import { FollowsModule } from '../follows/follows.module.js';
import { DiscoverSafetyModule } from '../discover-safety/discover-safety.module.js';
import { PublicPeopleController } from './public-people.controller.js';
import { DiscoverPublicReadLimiter } from './discover-public-read-limiter.js';
import { DiscoverPublicRateLimitGuard } from './discover-public-rate-limit.guard.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProgressModule,
    MediaModule,
    FollowsModule,
    DiscoverSafetyModule,
  ],
  controllers: [PublicPeopleController, PeopleController, DiscoverController],
  providers: [
    PeopleService,
    PeopleRepository,
    DiscoverService,
    TopicDiscoverService,
    TopicMaterialRepository,
    CompareService,
    PeopleCopyService,
    ProblemsRepository,
    TopicsRepository,
    DiscoverCopyLimiter,
    DiscoverCopyRateLimitGuard,
    DiscoverRepository,
    DiscoverSubjectRepository,
    DiscoverCountersService,
    DiscoverModeGuard,
    DiscoverFullModeGuard,
    DiscoverProfileReadLimiter,
    DiscoverRateLimitGuard,
    DiscoverBucketLimiter,
    DiscoverSearchRateLimitGuard,
    DiscoverReadRateLimitGuard,
    DiscoverPublicReadLimiter,
    DiscoverPublicRateLimitGuard,
  ],
  exports: [DiscoverCountersService],
})
export class DiscoverModule {}