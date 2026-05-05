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

@ApiTags('AI Credentials')
@Controller('/ai/credentials')
export class AiCredentialsController {
  constructor(private _credentialService: AiCredentialService) {}

  @Get('/')
  async list(@GetOrgFromRequest() org: Organization) {
    return this._credentialService.listRedactedByOrg(org.id);
  }

  @Get('/:kind')
  async getByKind(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string
  ) {
    const kind = parseKindParam(kindRaw);
    const result = await this._credentialService.getRedacted(
      org.id,
      'WORKSPACE',
      kind
    );
    return result ?? null;
  }

  @Put('/:kind')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async save(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string,
    @Body() body: unknown
  ) {
    const kind = parseKindParam(kindRaw);
    const payload: SaveAiCredentialPayload =
      SaveAiCredentialPayloadSchema.parse(body);
    await this._credentialService.save(org.id, 'WORKSPACE', kind, payload);
    return this._credentialService.getRedacted(org.id, 'WORKSPACE', kind);
  }

  @Delete('/:kind')
  @HttpCode(204)
  @CheckPolicies([AuthorizationActions.Delete, Sections.ADMIN])
  async remove(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string
  ) {
    const kind = parseKindParam(kindRaw);
    await this._credentialService.delete(org.id, 'WORKSPACE', kind);
  }

  @Post('/:kind/test')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async test(
    @GetOrgFromRequest() org: Organization,
    @Param('kind') kindRaw: string
  ) {
    const kind = parseKindParam(kindRaw);
    return this._credentialService.test(org.id, 'WORKSPACE' as AiScope, kind);
  }
}
