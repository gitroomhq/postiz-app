import { Injectable } from '@nestjs/common';
import { AiKind, AiScope, Prisma } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export interface UpsertAiCredentialInput {
  provider: string;
  model?: string | null;
  fallbackModel?: string | null;
  options?: Prisma.JsonValue | null;
  encryptedData: string;
  shareDefault?: boolean;
}

@Injectable()
export class AiCredentialRepository {
  constructor(
    private _ai: PrismaRepository<'aiProviderCredential'>
  ) {}

  findOne(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ) {
    return this._ai.model.aiProviderCredential.findFirst({
      where: {
        organizationId,
        scope,
        kind,
        profileId: scope === 'PROFILE' ? profileId : null,
      },
    });
  }

  findManyByOrg(organizationId: string, profileId?: string) {
    return this._ai.model.aiProviderCredential.findMany({
      where: {
        organizationId,
        ...(profileId ? { profileId } : {}),
      },
      orderBy: [{ kind: 'asc' }, { scope: 'asc' }],
    });
  }

  async upsert(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    input: UpsertAiCredentialInput,
    profileId?: string
  ) {
    const existing = await this.findOne(
      organizationId,
      scope,
      kind,
      profileId
    );
    const data: Prisma.AiProviderCredentialUpdateInput = {
      provider: input.provider,
      model: input.model ?? null,
      fallbackModel: input.fallbackModel ?? null,
      options: (input.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      encryptedData: input.encryptedData,
      ...(input.shareDefault !== undefined
        ? { shareDefault: input.shareDefault }
        : {}),
    };

    if (existing) {
      return this._ai.model.aiProviderCredential.update({
        where: { id: existing.id },
        data,
      });
    }

    return this._ai.model.aiProviderCredential.create({
      data: {
        organizationId,
        scope,
        kind,
        profileId: scope === 'PROFILE' ? profileId ?? null : null,
        provider: input.provider,
        model: input.model ?? null,
        fallbackModel: input.fallbackModel ?? null,
        options: (input.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        encryptedData: input.encryptedData,
        shareDefault: input.shareDefault ?? true,
      },
    });
  }

  delete(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ) {
    return this._ai.model.aiProviderCredential.deleteMany({
      where: {
        organizationId,
        scope,
        kind,
        profileId: scope === 'PROFILE' ? profileId : null,
      },
    });
  }

  updateMeta(
    id: string,
    data: { lastUsedAt?: Date; lastTestStatus?: string | null }
  ) {
    return this._ai.model.aiProviderCredential.update({
      where: { id },
      data,
    });
  }
}
