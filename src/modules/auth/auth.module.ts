import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { AuthCookies } from './auth.cookies.js';
import { AccessGuard } from './access.guard.js';
import { AuthSecurityGuard, AuthLimiter } from './auth-security.guard.js';
@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordService,
    TokenService,
    AuthCookies,
    AccessGuard,
    AuthSecurityGuard,
    AuthLimiter,
  ],
  exports: [
    AccessGuard,
    AuthSecurityGuard,
    AuthLimiter,
    AuthService,
    AuthRepository,
    AuthCookies,
  ],
})
export class AuthModule {}
