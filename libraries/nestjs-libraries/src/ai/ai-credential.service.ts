import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AiKind, AiScope } from '@prisma/client';
import { EncryptionService } from '@gitroom/nestjs-libraries/crypto/encryption.service';
import { AiCredentialRepository } from './ai-credential.repository';
import { AiProviderTestService } from './ai-provider-test.service';
import {
  optionsSchemaFor,
  SaveAiCredentialPayload,
  SaveAiCredentialPayloadSchema,
} from './ai-credential.schemas';

const SENTINEL = '__REDACTED__';

export interface RedactedAiCredential {
  scope: AiScope;
  kind: AiKind;
  profileId: string | null;
  provider: string;
  model: string | null;
  fallbackModel: string | null;
  apiKey: string;
  options: Record<string, unknown> | null;
  shareDefault: boolean;
  lastTestStatus: string | null;
  lastUsedAt: string | null;
  updatedAt: string;
}

export interface ResolvedAiCredential {
  id: string;
  scope: AiScope;
  kind: AiKind;
  profileId: string | null;
  provider: string;
  model: string | null;
  fallbackModel: string | null;
  apiKey: string;
  options: Record<string, unknown> | null;
  shareDefault: boolean;
}

@Injectable()
export class AiCredentialService {
  private readonly _logger = new Logger(AiCredentialService.name);

  constructor(
    private _repository: AiCredentialRepository,
    private _encryptionService: EncryptionService,
    private _testService: AiProviderTestService
  ) {}

  async save(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    payload: SaveAiCredentialPayload,
    profileId?: string
  ) {
    SaveAiCredentialPayloadSchema.parse(payload);

    if (scope === 'PROFILE' && !profileId) {
      throw new HttpException(
        'profileId obrigatorio quando scope=PROFILE',
        400
      );
    }

    const optionsSchema = optionsSchemaFor(kind);
    const validatedOptions = payload.options
      ? optionsSchema.parse(payload.options)
      : undefined;

    let apiKey = payload.apiKey;
    if (apiKey === SENTINEL) {
      const existing = await this.getRaw(
        organizationId,
        scope,
        kind,
        profileId
      );
      if (!existing) {
        throw new HttpException(
          'Sentinel apiKey enviado sem credencial existente.',
          400
        );
      }
      apiKey = existing.apiKey;
    }

    const encryptedData = this._encryptionService.encryptJson({ apiKey });

    return this._repository.upsert(
      organizationId,
      scope,
      kind,
      {
        provider: payload.provider,
        model: payload.model ?? null,
        fallbackModel: payload.fallbackModel ?? null,
        options: (validatedOptions as any) ?? null,
        encryptedData,
        shareDefault: payload.shareDefault,
      },
      profileId
    );
  }

  async getRedacted(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ): Promise<RedactedAiCredential | null> {
    const record = await this._repository.findOne(
      organizationId,
      scope,
      kind,
      profileId
    );
    if (!record) return null;

    return {
      scope: record.scope,
      kind: record.kind,
      profileId: record.profileId,
      provider: record.provider,
      model: record.model,
      fallbackModel: record.fallbackModel,
      apiKey: SENTINEL,
      options: (record.options as Record<string, unknown> | null) ?? null,
      shareDefault: record.shareDefault,
      lastTestStatus: record.lastTestStatus,
      lastUsedAt: record.lastUsedAt
        ? record.lastUsedAt.toISOString()
        : null,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async getRaw(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ): Promise<ResolvedAiCredential | null> {
    const record = await this._repository.findOne(
      organizationId,
      scope,
      kind,
      profileId
    );
    if (!record) return null;

    const decrypted = this._encryptionService.decryptJson(record.encryptedData);

    return {
      id: record.id,
      scope: record.scope,
      kind: record.kind,
      profileId: record.profileId,
      provider: record.provider,
      model: record.model,
      fallbackModel: record.fallbackModel,
      apiKey: String(decrypted.apiKey ?? ''),
      options: (record.options as Record<string, unknown> | null) ?? null,
      shareDefault: record.shareDefault,
    };
  }

  async listRedactedByOrg(
    organizationId: string,
    profileId?: string
  ): Promise<RedactedAiCredential[]> {
    const records = await this._repository.findManyByOrg(
      organizationId,
      profileId
    );
    return records.map((record) => ({
      scope: record.scope,
      kind: record.kind,
      profileId: record.profileId,
      provider: record.provider,
      model: record.model,
      fallbackModel: record.fallbackModel,
      apiKey: SENTINEL,
      options: (record.options as Record<string, unknown> | null) ?? null,
      shareDefault: record.shareDefault,
      lastTestStatus: record.lastTestStatus,
      lastUsedAt: record.lastUsedAt
        ? record.lastUsedAt.toISOString()
        : null,
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async delete(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ) {
    return this._repository.delete(organizationId, scope, kind, profileId);
  }

  async test(
    organizationId: string,
    scope: AiScope,
    kind: AiKind,
    profileId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const credential = await this.getRaw(
      organizationId,
      scope,
      kind,
      profileId
    );
    if (!credential) {
      return { ok: false, error: 'Credencial nao configurada.' };
    }

    const result = await this._testService.test(
      credential.provider,
      credential.apiKey
    );

    try {
      await this._repository.updateMeta(credential.id, {
        lastTestStatus: result.ok ? 'ok' : 'failed',
      });
    } catch (e) {
      this._logger.warn(
        `Falha ao atualizar lastTestStatus: ${(e as Error).message}`
      );
    }

    return result;
  }

  async markUsed(credentialId: string) {
    try {
      await this._repository.updateMeta(credentialId, {
        lastUsedAt: new Date(),
      });
    } catch (e) {
      this._logger.warn(
        `Falha ao atualizar lastUsedAt: ${(e as Error).message}`
      );
    }
  }
}
