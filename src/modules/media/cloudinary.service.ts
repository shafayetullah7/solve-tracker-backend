import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { Environment } from '../../config/environment.js';
import type { UploadApiResponse } from 'cloudinary';

export type CloudinaryUploadResult = {
  publicId: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
};

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private ensureConfigured(): void {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: this.config.getOrThrow('CLOUDINARY_CLOUD_NAME', {
        infer: true,
      }),
      api_key: this.config.getOrThrow('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: this.config.getOrThrow('CLOUDINARY_API_SECRET', {
        infer: true,
      }),
      secure: true,
    });
    this.configured = true;
  }

  async uploadImage(
    buffer: Buffer,
    folder: string,
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          overwrite: false,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed.'));
            return;
          }
          resolve({
            publicId: result.public_id,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        },
      );
      upload.end(buffer);
    });
  }

  async destroyImage(publicId: string): Promise<void> {
    this.ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}