import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThirdPartyManager } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.manager';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ImportMediaDto } from '@gitroom/nestjs-libraries/dtos/third-party/import-media.dto';

// As rotas de "gerenciar integracao" (listar catalogo, conectar, remover)
// vivem em ThirdPartySettingsController (registrado condicionalmente, mesmo
// espirito da flag NEXT_PUBLIC_VOC_LEGACY_MODULES que ja oculta a pagina
// /third-party do menu). Este controller so mantem as rotas core, usadas
// incondicionalmente pela Media Library (docs/auditoria/plano-leveza-2026-07.md,
// linha B2 do plano de leveza).
@ApiTags('Third Party')
@Controller('/third-party')
export class ThirdPartyController {
  private storage = UploadFactory.createStorage();

  constructor(
    private _thirdPartyManager: ThirdPartyManager,
    private _mediaService: MediaService,
  ) {}

  @Get('/')
  async getSavedThirdParty(@GetOrgFromRequest() organization: Organization) {
    return Promise.all(
      (
        await this._thirdPartyManager.getAllThirdPartiesByOrganization(
          organization.id
        )
      ).map((thirdParty) => {
        const { description, fields, position, title, identifier } =
          this._thirdPartyManager.getThirdPartyByName(thirdParty.identifier);
        return {
          ...thirdParty,
          title,
          position,
          fields,
          description,
        };
      })
    );
  }

  @Post('/:id/submit')
  async generate(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Body() data: any
  ) {
    const thirdParty = await this._thirdPartyManager.getIntegrationById(
      organization.id,
      id
    );

    if (!thirdParty) {
      throw new HttpException('Integration not found', 404);
    }

    const thirdPartyInstance = this._thirdPartyManager.getThirdPartyByName(
      thirdParty.identifier
    );

    if (!thirdPartyInstance) {
      throw new HttpException('Invalid identifier', 400);
    }

    const loadedData = await thirdPartyInstance?.instance?.sendData(
      AuthService.fixedDecryption(thirdParty.apiKey),
      data
    );

    const file = await this.storage.uploadSimple(loadedData);
    return this._mediaService.saveFile(organization.id, file.split('/').pop(), file);
  }

  @Post('/function/:id/:functionName')
  async callFunction(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Param('functionName') functionName: string,
    @Body() data: any
  ) {
    const thirdParty = await this._thirdPartyManager.getIntegrationById(
      organization.id,
      id
    );

    if (!thirdParty) {
      throw new HttpException('Integration not found', 404);
    }

    const thirdPartyInstance = this._thirdPartyManager.getThirdPartyByName(
      thirdParty.identifier
    );

    if (!thirdPartyInstance) {
      throw new HttpException('Invalid identifier', 400);
    }

    return thirdPartyInstance?.instance?.[functionName](
      AuthService.fixedDecryption(thirdParty.apiKey),
      data
    );
  }

  @Post('/:id/import')
  async importMedia(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string,
    @Body() body: ImportMediaDto
  ) {
    const thirdParty = await this._thirdPartyManager.getIntegrationById(
      organization.id,
      id
    );

    if (!thirdParty) {
      throw new HttpException('Integration not found', 404);
    }

    const thirdPartyInstance = this._thirdPartyManager.getThirdPartyByName(
      thirdParty.identifier
    );

    if (!thirdPartyInstance) {
      throw new HttpException('Invalid identifier', 400);
    }

    const downloadUrls = await thirdPartyInstance?.instance?.['importMedia']?.(
      AuthService.fixedDecryption(thirdParty.apiKey),
      body.items
    );

    if (!downloadUrls || !Array.isArray(downloadUrls)) {
      throw new HttpException('Import not supported', 400);
    }

    const results = [];
    for (const item of downloadUrls) {
      const file = await this.storage.uploadSimple(item.url);
      const saved = await this._mediaService.saveFile(
        organization.id,
        item.name || file.split('/').pop(),
        file
      );
      results.push(saved);
    }

    return results;
  }
}
