import { Test, TestingModule } from '@nestjs/testing';
import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DatabaseService } from './../src/database/database.service.js';
import { configureApp } from './../src/configure-app.js';
import { z } from 'zod';

vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('HOST', '127.0.0.1');
  vi.stubEnv('PORT', '3000');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost/test');
  vi.stubEnv('SWAGGER_ENABLED', 'true');
});

const inputSchema = z.strictObject({ title: z.string().trim().min(1) });
type Input = z.infer<typeof inputSchema>;

// Fixture verifies the validation/documentation integration without adding a product endpoint.
@Controller('validation-fixture')
class ValidationFixtureController {
  @Post()
  echo(@Body({ schema: inputSchema }) input: Input) {
    return input;
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationFixtureController],
    })
      // This suite verifies HTTP behavior; database integration runs separately.
      .overrideProvider(DatabaseService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, true);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });

  it('validates and transforms a Zod body using the native Nest pipe', async () => {
    await request(app.getHttpServer())
      .post('/validation-fixture')
      .send({ title: '  Monotonic stack  ' })
      .expect(201, { title: 'Monotonic stack' });
    await request(app.getHttpServer())
      .post('/validation-fixture')
      .send({ title: '', extra: true })
      .expect(400);
  });

  it('generates OpenAPI request schemas directly from Zod', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(response.body).toMatchObject({
      paths: {
        '/validation-fixture': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { title: { type: 'string', minLength: 1 } },
                    required: ['title'],
                    additionalProperties: false,
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
