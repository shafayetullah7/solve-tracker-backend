import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { UserLockRepository } from './user-lock.repository.js';

@Module({
  providers: [DatabaseService, UserLockRepository],
  exports: [DatabaseService, UserLockRepository],
})
export class DatabaseModule {}
