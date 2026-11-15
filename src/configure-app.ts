import { json } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthErrorFilter } from './modules/auth/auth-error.filter.js';
import {
  StandardSchemaValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Coding Practice Tracker API')
    .setDescription('Problem organization and practice progress tracking')
    .setVersion('1.0')
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function configureApp(
  app: INestApplication,
  swaggerEnabled: boolean,
): void {
  const parseAuthJson = json({ limit: '16kb' });
  // Keep a distinct middleware name so Nest still installs its default parser
  // for non-auth routes (it detects existing parsers by middleware name).
  app.use(
    '/auth',
    function authJsonBodyParser(
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      return parseAuthJson(req, res, next);
    },
  );
  app.useGlobalFilters(new AuthErrorFilter());
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      transform: true,
      exceptionFactory: (issues) =>
        new BadRequestException({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid input.',
          details: issues.map((issue) => ({
            path: (issue.path ?? []).map((segment) =>
              String(typeof segment === 'object' ? segment.key : segment),
            ),
            message: issue.message,
          })),
        }),
    }),
  );
  if (swaggerEnabled) {
    SwaggerModule.setup('docs', app, () => createApiDocument(app));
  }
}
