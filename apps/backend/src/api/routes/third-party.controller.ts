import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThirdPartyManager } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.manager';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

@ApiTags('Third Party')
@Controller('/third-party')
export class ThirdPartyController {
  private storage = UploadFactory.createStorage();

  constructor(
    private _thirdPartyManager: ThirdPartyManager,
    private _mediaService: MediaService,
  ) {}

  @Get('/list')
  async getThirdPartyList() {
    return this._thirdPartyManager.getAllThirdParties();
  }

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

  @Delete('/:id')
  deleteById(
    @GetOrgFromRequest() organization: Organization,
    @Param('id') id: string
  ) {
    return this._thirdPartyManager.deleteIntegration(organization.id, id);
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
