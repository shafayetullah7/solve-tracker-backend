import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { AuthProviderIdentityRepository } from './google/auth-provider-identity.repository.js';
import { GoogleJwksCache } from './google/google-jwks.cache.js';
import { GoogleOAuthService } from './google/google-oauth.service.js';
import { OAuthStateService } from './google/oauth-state.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { AuthCookies } from './auth.cookies.js';
import { AccessGuard } from './access.guard.js';
import { AuthSecurityGuard, AuthLimiter } from './auth-security.guard.js';
import { GoogleRiscModule } from './risc/google-risc.module.js';
@Module({
  imports: [DatabaseModule, EmailModule, forwardRef(() => GoogleRiscModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthProviderIdentityRepository,
    GoogleJwksCache,
    GoogleOAuthService,
    OAuthStateService,
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
    AuthProviderIdentityRepository,
    GoogleJwksCache,
    GoogleOAuthService,
    OAuthStateService,
    AuthCookies,
  ],
})
export class AuthModule {}
