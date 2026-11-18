import { BadRequestException, Injectable } from '@nestjs/common';
import { DISCOVER_REPORT_REASON_MAX } from '../discover/discover.config.js';
import { DiscoverSubjectRepository } from '../discover/discover-subject.repository.js';
import { profileNotFound } from '../discover/discover.errors.js';
import { assertViewable } from '../discover/visibility.js';
import { DiscoverSafetyRepository } from './discover-safety.repository.js';

@Injectable()
export class DiscoverSafetyService {
  constructor(
    private readonly safety: DiscoverSafetyRepository,
    private readonly subjects: DiscoverSubjectRepository,
  ) {}

  async block(blockerId: string, handle: string): Promise<void> {
    const subject = assertViewable(
      await this.subjects.findByHandle(handle),
      'summary',
    );
    if (subject.userId === blockerId) {
      throw new BadRequestException({
        code: 'CANNOT_BLOCK_SELF',
        message: 'You cannot block yourself.',
      });
    }
    await this.safety.insertBlock(blockerId, subject.userId);
  }

  async unblock(blockerId: string, handle: string): Promise<void> {
    const subject = await this.subjects.findByHandle(handle);
    if (!subject) return;
    await this.safety.deleteBlock(blockerId, subject.userId);
  }

  async report(reporterId: string, handle: string, reason: string): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > DISCOVER_REPORT_REASON_MAX) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid report reason.',
      });
    }
    const subject = assertViewable(
      await this.subjects.findByHandle(handle),
      'summary',
    );
    if (subject.userId === reporterId) {
      throw new BadRequestException({
        code: 'CANNOT_REPORT_SELF',
        message: 'You cannot report yourself.',
      });
    }
    await this.safety.insertReport(reporterId, subject.userId, trimmed);
  }

  isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.safety.isBlocked(blockerId, blockedId);
  }

  listBlockedIds(blockerId: string): Promise<string[]> {
    return this.safety.listBlockedIds(blockerId);
  }

  async assertNotBlocked(viewerId: string, subjectUserId: string): Promise<void> {
    if (await this.safety.isBlocked(viewerId, subjectUserId)) {
      throw profileNotFound();
    }
  }
}