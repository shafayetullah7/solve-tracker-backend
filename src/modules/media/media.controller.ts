import {
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { AVATAR_MAX_BYTES } from './avatar-upload-limits.js';
import { MediaService } from './media.service.js';
import {
  errorSchema,
  mediaUploadResponseSchema,
} from './schemas/media.schema.js';

@ApiTags('Media')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, standardSchema: mediaUploadResponseSchema })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.media.uploadUserImage(req.auth.user.id, file);
  }
}