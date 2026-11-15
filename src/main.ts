import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import type { Environment } from './config/environment.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  configureApp(app, config.getOrThrow('SWAGGER_ENABLED', { infer: true }));
  app.enableShutdownHooks();
  await app.listen(
    config.getOrThrow('PORT', { infer: true }),
    config.getOrThrow('HOST', { infer: true }),
  );
}
await bootstrap();
