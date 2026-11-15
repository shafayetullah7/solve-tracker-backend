import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service.js';
import type { Environment } from '../../config/environment.js';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));
describe('Resend reset mail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    send.mockReset();
  });
  const config = (mode: 'mock' | 'resend') =>
    new ConfigService<Environment, true>({
      EMAIL_DELIVERY_MODE: mode,
      RESEND_API_KEY: 're_test_only',
      RESEND_FROM: 'Practice <mail@example.test>',
      FRONTEND_ORIGIN: 'https://practice.example.test',
      PASSWORD_RESET_TTL_SECONDS: 1800,
    });
  it('does not send email in mock mode', async () => {
    await new EmailService(config('mock')).sendReset(
      'user@example.test',
      'secret',
    );
    expect(send).not.toHaveBeenCalled();
  });
  it('builds a trusted fragment link and bounded SDK request', async () => {
    send.mockResolvedValue({ data: { id: 'test' }, error: null });
    await new EmailService(config('resend')).sendReset(
      'user@example.test',
      'secret',
    );
    expect(send.mock.calls[0][0].text).toContain(
      'https://practice.example.test/reset-password#token=secret',
    );
    expect(send.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it('handles provider rejection without exposing credentials or failing recovery', async () => {
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    send.mockResolvedValue({ error: { message: 'secret-provider-value' } });
    await expect(
      new EmailService(config('resend')).sendReset(
        'user@example.test',
        'raw-reset-token',
      ),
    ).resolves.toBeUndefined();
    expect(JSON.stringify(logger.mock.calls)).not.toContain(
      'secret-provider-value',
    );
    expect(JSON.stringify(logger.mock.calls)).not.toContain('raw-reset-token');
  });
});
