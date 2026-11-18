import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AuthModule } from '../auth.module.js';
import { GoogleRiscController } from './google-risc.controller.js';
import { GoogleRiscJwksCache } from './google-risc-jwks.cache.js';
import { GoogleRiscLimiter } from './google-risc-limiter.js';
import { GoogleRiscRateLimitGuard } from './google-risc-rate-limit.guard.js';
import { GoogleRiscService } from './google-risc.service.js';
import { RiscEventReceiptRepository } from './risc-event-receipt.repository.js';

@Module({
  imports: [DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [GoogleRiscController],
  providers: [
    GoogleRiscJwksCache,
    GoogleRiscLimiter,
    GoogleRiscRateLimitGuard,
    GoogleRiscService,
    RiscEventReceiptRepository,
  ],
  exports: [
    GoogleRiscJwksCache,
    GoogleRiscService,
    RiscEventReceiptRepository,
  ],
})
export class GoogleRiscModule {}