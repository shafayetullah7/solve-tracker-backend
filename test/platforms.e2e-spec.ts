import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { configureApp } from '../src/configure-app.js';
import { PLATFORM_CATALOG } from '../src/shared/platform-catalog.js';

vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('HOST', '127.0.0.1');
  vi.stubEnv('PORT', '3000');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost/test');
  vi.stubEnv('SWAGGER_ENABLED', 'true');
});

describe('Platforms (e2e)', () => {
  let app: INestApplication<App>;
  const query = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ connection: { query } })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, true);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /platforms returns catalog without auth', async () => {
    const response = await request(app.getHttpServer()).get('/platforms').expect(200);
    expect(response.body.items).toHaveLength(PLATFORM_CATALOG.length);
    expect(response.headers['cache-control']).toBe('public, max-age=3600');
    expect(query).not.toHaveBeenCalled();
  });
});