import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CloudinaryService } from './cloudinary.service.js';
import { MediaController } from './media.controller.js';
import { MediaRepository } from './media.repository.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaRepository, CloudinaryService, MediaService],
  exports: [MediaService],
})
export class MediaModule {}