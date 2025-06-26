import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

@Injectable()
export class ThirdPartyRepository {
  constructor(private _thirdParty: PrismaRepository<'thirdParty'>) {}

  getAllThirdPartiesByOrganization(org: string) {
    return this._thirdParty.model.thirdParty.findMany({
      where: { organizationId: org, deletedAt: null },
      select: {
        id: true,
        name: true,
        identifier: true,
      },
    });
  }

  deleteIntegration(org: string, id: string) {
    return this._thirdParty.model.thirdParty.update({
      where: { id, organizationId: org },
      data: { deletedAt: new Date() },
    });
  }

  getIntegrationById(org: string, id: string) {
    return this._thirdParty.model.thirdParty.findFirst({
      where: { id, organizationId: org, deletedAt: null },
    });
  }

  saveIntegration(
    org: string,
    identifier: string,
    apiKey: string,
    data: { name: string; username: string; id: string }
  ) {
    return this._thirdParty.model.thirdParty.upsert({
      where: {
        organizationId_internalId: {
          internalId: data.id,
          organizationId: org,
        },
      },
      create: {
        organizationId: org,
        name: data.name,
        internalId: data.id,
        identifier,
        apiKey: AuthService.fixedEncryption(apiKey),
        deletedAt: null,
      },
      update: {
        organizationId: org,
        name: data.name,
        internalId: data.id,
        identifier,
        apiKey: AuthService.fixedEncryption(apiKey),
        deletedAt: null,
      },
    });
  }
}
