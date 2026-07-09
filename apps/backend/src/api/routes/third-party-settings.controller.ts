import { Body, Controller, Delete, Get, HttpException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThirdPartyManager } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.manager';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';

// Rotas exclusivas da pagina de configuracao /third-party (ja oculta do menu
// por NEXT_PUBLIC_VOC_LEGACY_MODULES em top.menu.tsx): catalogo de providers,
// conectar e remover integracao. Registrado condicionalmente em api.module.ts
// pela mesma flag (docs/auditoria/plano-leveza-2026-07.md, linha B2). As rotas
// core (listar integracoes salvas, importar/gerar via Media Library) ficam em
// ThirdPartyController, sempre ativo.
@ApiTags('Third Party')
@Controller('/third-party')
export class ThirdPartySettingsController {
  constructor(private _thirdPartyManager: ThirdPartyManager) {}

  @Get('/list')
  async getThirdPartyList() {
    return this._thirdPartyManager.getAllThirdParties();
  }

  @Delete('/:id')
  deleteById(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    return this._thirdPartyManager.deleteIntegration(organization.id, id);
  }

  @Post('/:identifier')
  async addApiKey(
    @GetOrgFromRequest() organization: Organization,
    @Param('identifier') identifier: string,
    @Body('api') api: string
  ) {
    const thirdParty = this._thirdPartyManager.getThirdPartyByName(identifier);
    if (!thirdParty) {
      throw new HttpException('Invalid identifier', 400);
    }

    const connect = await thirdParty.instance.checkConnection(api);
    if (!connect) {
      throw new HttpException('Invalid API key', 400);
    }

    try {
      const save = await this._thirdPartyManager.saveIntegration(
        organization.id,
        identifier,
        api,
        {
          name: connect.name,
          username: connect.username,
          id: connect.id,
        }
      );

      return {
        id: save.id,
      };
    } catch (e) {
      console.log(e);
      throw new HttpException('Integration Already Exists', 400);
    }
  }
}
