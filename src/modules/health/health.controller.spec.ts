import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { DatabaseService } from '../../database/database.service.js';

describe('HealthController', () => {
  it('live returns ok without touching the database', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: { connection: { query: vi.fn() } },
        },
      ],
    }).compile();
    const controller = module.get(HealthController);
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('ready returns ready when SELECT 1 succeeds', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: { connection: { query } },
        },
      ],
    }).compile();
    const controller = module.get(HealthController);
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('ready throws 503 when the database fails', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: {
            connection: { query: vi.fn().mockRejectedValue(new Error('down')) },
          },
        },
      ],
    }).compile();
    const controller = module.get(HealthController);
    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});