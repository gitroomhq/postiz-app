import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiKind, AiScope, Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { AiCredentialService } from '@gitroom/nestjs-libraries/ai/ai-credential.service';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import {
  SaveAiCredentialPayload,
  SaveAiCredentialPayloadSchema,
} from '@gitroom/nestjs-libraries/ai/ai-credential.schemas';

const VALID_KINDS: AiKind[] = ['TEXT', 'IMAGE', 'VIDEO', 'WEB_SEARCH'];

function parseKindParam(raw: string): AiKind {
  const normalized = raw.toUpperCase() as AiKind;
  if (!VALID_KINDS.includes(normalized)) {
    throw new HttpException(`kind invalido: ${raw}`, 400);
  }
  return normalized;
}

interface ScopeContext {
  scope: AiScope;
  profileId?: string;
}

@ApiTags('AI Credentials')
@Controller('/ai/credentials')
export class AiCredentialsController {
  constructor(
    private _credentialService: AiCredentialService,
    private _profileService: ProfileService
  ) {}

  /**
   * Resolve `scope` a partir de `profileId` recebido na query.
   * - Sem profileId, ou profileId pertence ao perfil default → scope=WORKSPACE
   * - profileId de perfil secundario → scope=PROFILE
   *
   * Sempre valida que o profile pertence ao org do request.
   */
  private async resolveScope(
    organizationId: string,
    profileIdRaw?: string
  ): Promise<ScopeContext> {
    if (!profileIdRaw) return { scope: 'WORKSPACE' };

    const profile = await this._profileService.getProfileById(
      organizationId,
      profileIdRaw
    );
    if (!profile) {
      throw new HttpException('Perfil nao encontrado neste workspace.', 404);
    }
    if (profile.isDefault) {
      return { scope: 'WORKSPACE' };
    }
    return { scope: 'PROFILE', profileId: profile.id };
  }

  @Get('/')
  async list(@GetOrgFromRequest() org: Organization) {
    return this._credentialService.listRedactedByOrg(org.id);
  }

  @Get('/:kind')
  async getByKind(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string,
    @Query('profileId') profileIdRaw?: string
  ) {
    const kind = parseKindParam(kindRaw);
    const ctx = await this.resolveScope(org.id, profileIdRaw);
    const result = await this._credentialService.getRedacted(
      org.id,
      ctx.scope,
      kind,
      ctx.profileId
    );
    return result ?? null;
  }

  @Put('/:kind')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async save(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string,
    @Body() body: unknown,
    @Query('profileId') profileIdRaw?: string
  ) {
    const kind = parseKindParam(kindRaw);
    const ctx = await this.resolveScope(org.id, profileIdRaw);
    const payload: SaveAiCredentialPayload =
      SaveAiCredentialPayloadSchema.parse(body);
    await this._credentialService.save(
      org.id,
      ctx.scope,
      kind,
      payload,
      ctx.profileId
    );
    return this._credentialService.getRedacted(
      org.id,
      ctx.scope,
      kind,
      ctx.profileId
    );
  }

  @Delete('/:kind')
  @HttpCode(204)
  @CheckPolicies([AuthorizationActions.Delete, Sections.ADMIN])
  async remove(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string,
    @Query('profileId') profileIdRaw?: string
  ) {
    const kind = parseKindParam(kindRaw);
    const ctx = await this.resolveScope(org.id, profileIdRaw);
    await this._credentialService.delete(
      org.id,
      ctx.scope,
      kind,
      ctx.profileId
    );
  }

  @Post('/:kind/test')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async test(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string,
    @Query('profileId') profileIdRaw?: string
  ) {
    const kind = parseKindParam(kindRaw);
    const ctx = await this.resolveScope(org.id, profileIdRaw);
    return this._credentialService.test(
      org.id,
      ctx.scope,
      kind,
      ctx.profileId
    );
  }
}
