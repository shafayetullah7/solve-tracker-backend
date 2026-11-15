import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { configureApp } from '../src/configure-app.js';

vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('HOST', '127.0.0.1');
  vi.stubEnv('PORT', '3000');
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost/test');
  vi.stubEnv('SWAGGER_ENABLED', 'true');
});

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  const query = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
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

  it('GET /health returns ok without querying the database', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(query).not.toHaveBeenCalled();
  });

  it('GET /health/ready returns ready when SELECT 1 succeeds', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(response.body).toEqual({ status: 'ready' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('GET /health/ready returns 503 when the database fails', async () => {
    query.mockRejectedValueOnce(new Error('connection refused'));
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);
    expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
  });
});