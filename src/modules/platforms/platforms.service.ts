import { Injectable } from '@nestjs/common';
import { PLATFORM_CATALOG } from '../../shared/platform-catalog.js';
import type { PlatformListResponse } from './schemas/platforms.schema.js';

@Injectable()
export class PlatformsService {
  list(): PlatformListResponse {
    return {
      items: PLATFORM_CATALOG.map((entry) => ({
        slug: entry.slug,
        name: entry.name,
        baseUrl: entry.baseUrl,
        urlHosts: [...entry.urlHosts],
      })),
    };
  }
}