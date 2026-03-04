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
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
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

  @Post('/auto-connect')
  async autoConnect(
    @GetOrgFromRequest() organization: Organization,
    @GetUserFromRequest() user: User
  ) {
    if (user.providerName !== 'FIREBASE') {
      return { connected: false, reason: 'not_firebase_user' };
    }

    const existing =
      await this._thirdPartyManager.getAllThirdPartiesByOrganization(
        organization.id
      );
    const letstokExists = existing.find(
      (i: any) => i.identifier === 'letstok'
    );
    if (letstokExists) {
      const { description, fields, position, title, identifier } =
        this._thirdPartyManager.getThirdPartyByName('letstok');
      return {
        connected: true,
        integration: {
          ...letstokExists,
          title,
          position,
          fields,
          description,
        },
      };
    }

    const letstokProvider =
      this._thirdPartyManager.getThirdPartyByName('letstok');
    if (!letstokProvider) {
      return { connected: false, reason: 'provider_not_available' };
    }

    const connect = await letstokProvider.instance.checkConnection(user.email);
    if (!connect) {
      return { connected: false, reason: 'user_not_found_on_letstok' };
    }

    try {
      const save = await this._thirdPartyManager.saveIntegration(
        organization.id,
        'letstok',
        user.email,
        connect
      );

      const { description, fields, position, title, identifier } =
        this._thirdPartyManager.getThirdPartyByName('letstok');

      return {
        connected: true,
        integration: {
          ...save,
          title,
          position,
          fields,
          description,
          name: connect.name,
          identifier: 'letstok',
        },
      };
    } catch (e) {
      console.error('Auto-connect LetsTok failed:', e);
      return { connected: false, reason: 'save_failed' };
    }
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
      throw new HttpException(
        identifier === 'letstok'
          ? 'Could not verify this email. Make sure the Letstok AI server is running and the email is registered.'
          : 'Invalid API key',
        400
      );
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
