import { json, text } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { httpResourcePath } from './common/http-resource-path.js';
import { AuthErrorFilter } from './modules/auth/auth-error.filter.js';
import {
  GOOGLE_RISC_MAX_BODY_BYTES,
  GOOGLE_RISC_RECEIVER_PATH,
} from './modules/auth/risc/google-risc.constants.js';
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
  const parseRiscSet = text({ type: '*/*', limit: GOOGLE_RISC_MAX_BODY_BYTES });
  // Keep a distinct middleware name so Nest still installs its default parser
  // for non-auth routes (it detects existing parsers by middleware name).
  app.use(
    '/auth',
    function authBodyParser(
      req: Request,
      res: Response,
      next: NextFunction,
    ) {
      if (httpResourcePath(req) === GOOGLE_RISC_RECEIVER_PATH)
        return parseRiscSet(req, res, next);
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
