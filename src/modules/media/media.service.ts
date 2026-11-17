import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment.js';
import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_BYTES,
  extensionFromMime,
} from './avatar-upload-limits.js';
import { CloudinaryService } from './cloudinary.service.js';
import { buildCloudinaryImageUrl } from './media-delivery.js';
import { mediaError } from './media.errors.js';
import { MediaRepository } from './media.repository.js';
import { mimeMatchesBuffer } from './image-sniff.js';
import { newImageMediaInsert } from './schemas/media-meta.schema.js';
import type { MediaUploadResponse } from './schemas/media.schema.js';

@Injectable()
export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  deliveryUrl(publicId: string, extension: string): string {
    return buildCloudinaryImageUrl(
      this.config.getOrThrow('CLOUDINARY_CLOUD_NAME', { infer: true }),
      publicId,
      extension,
    );
  }

  async findOwnedRecord(userId: string, mediaId: string) {
    return this.repo.findOwned(userId, mediaId);
  }

  async uploadUserImage(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<MediaUploadResponse> {
    if (!file?.buffer?.length) {
      throw mediaError(400, 'VALIDATION_ERROR', 'Image file is required.', {
        file: 'Choose an image file.',
      });
    }
    if (!AVATAR_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw mediaError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        file: 'Use a PNG, JPG, WebP, or GIF image.',
      });
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw mediaError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        file: 'Image must be 5 MB or smaller.',
      });
    }
    if (!mimeMatchesBuffer(file.mimetype, file.buffer)) {
      throw mediaError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        file: 'File content does not match its image type.',
      });
    }
    const extension =
      extensionFromMime(file.mimetype) ?? file.mimetype.split('/')[1];
    if (!extension) {
      throw mediaError(400, 'VALIDATION_ERROR', 'Invalid input.', {
        file: 'Unsupported image type.',
      });
    }

    let uploaded: Awaited<
      ReturnType<CloudinaryService['uploadImage']>
    > | undefined;
    try {
      uploaded = await this.cloudinary.uploadImage(
        file.buffer,
        `users/${userId}`,
      );
      const normalizedExtension = uploaded.format || extension;
      const insert = newImageMediaInsert({
        userId,
        publicId: uploaded.publicId,
        extension: normalizedExtension,
        meta: {
          bytes: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height,
        },
        usageCount: 0,
      });
      const row = await this.repo.insert(insert);
      return {
        id: row.id,
        url: this.deliveryUrl(row.publicId, row.extension),
      };
    } catch (error) {
      if (uploaded?.publicId) {
        try {
          await this.cloudinary.destroyImage(uploaded.publicId);
        } catch {
          /* Best-effort; orphan cleanup job may reclaim DB-less objects. */
        }
      }
      throw error;
    }
  }
}