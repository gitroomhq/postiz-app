import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiKind } from '@prisma/client';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { AiCatalogService } from '@gitroom/nestjs-libraries/ai/ai-catalog.service';

const VALID_KINDS: AiKind[] = ['TEXT', 'IMAGE', 'VIDEO', 'WEB_SEARCH'];

function parseKindParam(raw: string): AiKind {
  const normalized = raw.toUpperCase() as AiKind;
  if (!VALID_KINDS.includes(normalized)) {
    throw new HttpException(`kind invalido: ${raw}`, 400);
  }
  return normalized;
}

@ApiTags('AI Catalog')
@Controller('/ai/catalog')
export class AiCatalogController {
  constructor(private _catalogService: AiCatalogService) {}

  @Get('/:kind')
  async getCatalog(
    @Param('kind') kindRaw: string,
    @Query('provider') provider: string
  ) {
    const kind = parseKindParam(kindRaw);
    if (!provider) {
      throw new HttpException('query param provider e obrigatorio.', 400);
    }
    return this._catalogService.getCatalog(provider, kind);
  }

  @Post('/refresh')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  refresh() {
    return this._catalogService.refresh();
  }
}
