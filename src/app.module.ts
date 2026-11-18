import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { environmentSchema } from './config/environment.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TopicsModule } from './modules/topics/topics.module.js';
import { ProblemsModule } from './modules/problems/problems.module.js';
import { ProgressModule } from './modules/progress/progress.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { PlatformsModule } from './modules/platforms/platforms.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      skipProcessEnv: true,
      envFilePath: ['.env.openapi', '.env'],
      validationSchema: environmentSchema,
    }),
    DatabaseModule,
    AuthModule,
    TopicsModule,
    ProblemsModule,
    ProgressModule,
    PlatformsModule,
    HealthModule,
    MediaModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
