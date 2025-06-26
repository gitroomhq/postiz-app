import { Injectable } from '@nestjs/common';
import {
  ThirdPartyAbstract,
  ThirdPartyParams,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';
import { ModuleRef } from '@nestjs/core';
import { ThirdPartyService } from '@gitroom/nestjs-libraries/database/prisma/third-party/third-party.service';

@Injectable()
export class ThirdPartyManager {
  constructor(
    private _moduleRef: ModuleRef,
    private _thirdPartyService: ThirdPartyService
  ) {}

  getAllThirdParties(): any[] {
    return (Reflect.getMetadata('third:party', ThirdPartyAbstract) || []).map(
      (p: any) => ({
        identifier: p.identifier,
        title: p.title,
        description: p.description,
        fields: p.fields || [],
      })
    );
  }

  getThirdPartyByName(
    identifier: string
  ): (ThirdPartyParams & { instance: ThirdPartyAbstract }) | undefined {
    const thirdParty = (
      Reflect.getMetadata('third:party', ThirdPartyAbstract) || []
    ).find((p: any) => p.identifier === identifier);

    return { ...thirdParty, instance: this._moduleRef.get(thirdParty.target) };
  }

  deleteIntegration(org: string, id: string) {
    return this._thirdPartyService.deleteIntegration(org, id);
  }

  getIntegrationById(org: string, id: string) {
    return this._thirdPartyService.getIntegrationById(org, id);
  }

  getAllThirdPartiesByOrganization(org: string) {
    return this._thirdPartyService.getAllThirdPartiesByOrganization(org);
  }

  saveIntegration(
    org: string,
    identifier: string,
    apiKey: string,
    data: { name: string; username: string; id: string }
  ) {
    return this._thirdPartyService.saveIntegration(
      org,
      identifier,
      apiKey,
      data
    );
  }
}
