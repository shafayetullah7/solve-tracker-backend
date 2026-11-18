import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  USER_HANDLE_CHANGE_COOLDOWN_MS,
  isUserHandleUniqueViolation,
} from '../../common/schemas/user-handle-assign.js';
import { users } from '../../database/schema/index.js';
import { media } from '../../database/schema/media/media.table.js';
import type { UserEducationEntry } from '../../database/schema/profile/user-education-entries.table.js';
import type { UserWorkEntry } from '../../database/schema/profile/user-work-entries.table.js';
import { UserLockRepository } from '../../database/user-lock.repository.js';
import { MediaService } from '../media/media.service.js';
import {
  acquireProfileSlot,
  releaseProfileSlot,
} from '../media/media-usage.js';
import { MAX_EDUCATION_ENTRIES } from './profile.constants.js';
import { profileError } from './profile.errors.js';
import { ProfileRepository } from './profile.repository.js';
import {
  entryIdParamSchema,
  type CreateEducationEntryInput,
  type CreateWorkEntryInput,
  type EducationEntryResponse,
  type PatchProfileInput,
  type ProfileResponse,
  type UpdateEducationEntryInput,
  type UpdateWorkEntryInput,
  type WorkEntryResponse,
} from './schemas/profile.schema.js';

function toWorkEntry(row: UserWorkEntry): WorkEntryResponse {
  return {
    id: row.id,
    organization: row.organization,
    role: row.role,
    ...(row.period ? { period: row.period } : {}),
  };
}

function toEducationEntry(row: UserEducationEntry): EducationEntryResponse {
  return {
    id: row.id,
    institution: row.institution,
    program: row.program,
    ...(row.endYear ? { endYear: row.endYear } : {}),
  };
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly userLock: UserLockRepository,
    private readonly media: MediaService,
  ) {}

  private parseEntryId(rawId: string): string {
    const trimmed = rawId.trim();
    const result = entryIdParamSchema.safeParse(trimmed);
    if (!result.success) {
      throw profileError(400, 'VALIDATION_ERROR', 'Invalid entry id.', {
        id: 'Invalid entry id.',
      });
    }
    return result.data;
  }

  private async resolveAvatarUrl(
    userId: string,
    avatarMediaId: string | null,
  ): Promise<string | undefined> {
    if (!avatarMediaId) return undefined;
    const row = await this.media.findOwnedRecord(userId, avatarMediaId);
    if (!row) return undefined;
    return this.media.deliveryUrl(row.publicId, row.extension);
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.profiles.findUser(userId);
    if (!user) throw profileError(404, 'NOT_FOUND', 'Profile was not found.');
    const [work, education, avatarUrl] = await Promise.all([
      this.profiles.listWork(userId),
      this.profiles.listEducation(userId),
      this.resolveAvatarUrl(userId, user.avatarMediaId),
    ]);
    return {
      name: user.name,
      bio: user.bio,
      handle: user.handle,
      ...(avatarUrl ? { avatarUrl } : {}),
      work: work.map(toWorkEntry),
      education: education.map(toEducationEntry),
    };
  }

  async patchProfile(
    userId: string,
    input: PatchProfileInput,
  ): Promise<ProfileResponse> {
    const result = await this.userLock.withLockedUser(userId, async (tx, user) => {
      const now = new Date();
      const updates: Partial<typeof users.$inferInsert> = { updatedAt: now };
      if (input.name !== undefined) updates.name = input.name;
      if (input.bio !== undefined) updates.bio = input.bio;

      if (input.handle !== undefined) {
        const next = input.handle;
        if (next !== user.handle) {
          if (user.handleChangedAt) {
            const elapsed = Date.now() - user.handleChangedAt.getTime();
            if (elapsed < USER_HANDLE_CHANGE_COOLDOWN_MS) {
              const daysLeft = Math.ceil(
                (USER_HANDLE_CHANGE_COOLDOWN_MS - elapsed) /
                  (24 * 60 * 60 * 1000),
              );
              throw profileError(
                409,
                'HANDLE_CHANGE_COOLDOWN',
                `You can change your handle again in ${daysLeft} day(s).`,
                { handle: `You can change your handle again in ${daysLeft} day(s).` },
              );
            }
          }
          updates.handle = next;
          updates.handleChangedAt = now;
        }
      }

      if (input.avatarMediaId !== undefined) {
        const target = input.avatarMediaId;
        const current = user.avatarMediaId;
        if (target === null) {
          if (current) {
            await releaseProfileSlot(tx, userId, current);
            updates.avatarMediaId = null;
          }
        } else if (target !== current) {
          if (current) await releaseProfileSlot(tx, userId, current);
          await acquireProfileSlot(tx, userId, target);
          updates.avatarMediaId = target;
        }
      }

      let updated;
      try {
        [updated] = await tx
          .update(users)
          .set(updates)
          .where(eq(users.id, userId))
          .returning();
      } catch (error) {
        if (isUserHandleUniqueViolation(error)) {
          throw profileError(409, 'HANDLE_IN_USE', 'This handle is already taken.', {
            handle: 'This handle is already taken.',
          });
        }
        throw error;
      }
      if (!updated)
        throw profileError(404, 'NOT_FOUND', 'Profile was not found.');

      const avatarUrl = updated.avatarMediaId
        ? await tx
            .select()
            .from(media)
            .where(eq(media.id, updated.avatarMediaId))
            .limit(1)
            .then(
              (rows) =>
                rows[0] &&
                this.media.deliveryUrl(rows[0].publicId, rows[0].extension),
            )
        : undefined;

      const [work, education] = await Promise.all([
        this.profiles.listWork(userId, tx),
        this.profiles.listEducation(userId, tx),
      ]);

      return {
        name: updated.name,
        bio: updated.bio,
        handle: updated.handle,
        ...(avatarUrl ? { avatarUrl } : {}),
        work: work.map(toWorkEntry),
        education: education.map(toEducationEntry),
      };
    });
    if (!result)
      throw profileError(404, 'NOT_FOUND', 'Profile was not found.');
    return result;
  }

  async createWork(
    userId: string,
    input: CreateWorkEntryInput,
  ): Promise<WorkEntryResponse> {
    const row = await this.profiles.insertWork(userId, {
      organization: input.organization,
      role: input.role,
      period: input.period ?? null,
    });
    return toWorkEntry(row);
  }

  async updateWork(
    userId: string,
    rawId: string,
    input: UpdateWorkEntryInput,
  ): Promise<WorkEntryResponse> {
    const id = this.parseEntryId(rawId);
    const row = await this.profiles.updateWork(userId, id, {
      organization: input.organization,
      role: input.role,
      period: input.period ?? null,
    });
    if (!row)
      throw profileError(404, 'NOT_FOUND', 'This entry was removed.');
    return toWorkEntry(row);
  }

  async deleteWork(userId: string, rawId: string): Promise<void> {
    const id = this.parseEntryId(rawId);
    const deleted = await this.profiles.deleteWork(userId, id);
    if (!deleted)
      throw profileError(404, 'NOT_FOUND', 'This entry was removed.');
  }

  async createEducation(
    userId: string,
    input: CreateEducationEntryInput,
  ): Promise<EducationEntryResponse> {
    const created = await this.profiles.createEducationUnderCap(userId, {
      institution: input.institution,
      program: input.program,
      endYear: input.endYear ?? null,
    });
    if (created === 'missing') {
      throw profileError(404, 'NOT_FOUND', 'Profile was not found.');
    }
    if (created === 'limit') {
      throw profileError(
        409,
        'EDUCATION_LIMIT',
        `You can add at most ${MAX_EDUCATION_ENTRIES} education entries.`,
      );
    }
    return toEducationEntry(created);
  }

  async updateEducation(
    userId: string,
    rawId: string,
    input: UpdateEducationEntryInput,
  ): Promise<EducationEntryResponse> {
    const id = this.parseEntryId(rawId);
    const row = await this.profiles.updateEducation(userId, id, {
      institution: input.institution,
      program: input.program,
      endYear: input.endYear ?? null,
    });
    if (!row)
      throw profileError(404, 'NOT_FOUND', 'This entry was removed.');
    return toEducationEntry(row);
  }

  async deleteEducation(userId: string, rawId: string): Promise<void> {
    const id = this.parseEntryId(rawId);
    const deleted = await this.profiles.deleteEducation(userId, id);
    if (!deleted)
      throw profileError(404, 'NOT_FOUND', 'This entry was removed.');
  }
}