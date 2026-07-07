import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export interface UpsertMobileDeviceParams {
  userId: string;
  organizationId: string;
  platform: string;
  pushToken: string;
  deviceId?: string;
  appVersion?: string;
  buildNumber?: string;
  locale?: string;
  timezone?: string;
}

@Injectable()
export class MobileDeviceRepository {
  constructor(private _mobileDevice: PrismaRepository<'mobileDevice'>) {}

  upsertDevice(params: UpsertMobileDeviceParams) {
    const data = {
      userId: params.userId,
      organizationId: params.organizationId,
      platform: params.platform,
      pushToken: params.pushToken,
      deviceId: params.deviceId,
      appVersion: params.appVersion,
      buildNumber: params.buildNumber,
      locale: params.locale,
      timezone: params.timezone,
      deletedAt: null,
    };

    return this._mobileDevice.model.mobileDevice.upsert({
      where: { pushToken: params.pushToken },
      create: data,
      update: data,
    });
  }

  deleteDevice(userId: string, organizationId: string, pushToken: string) {
    return this._mobileDevice.model.mobileDevice.updateMany({
      where: {
        userId,
        organizationId,
        pushToken,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  getActiveDevicesForOrganization(organizationId: string) {
    return this._mobileDevice.model.mobileDevice.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        pushToken: true,
        platform: true,
      },
    });
  }

  markTokensDeleted(pushTokens: string[]) {
    if (!pushTokens.length) {
      return Promise.resolve({ count: 0 });
    }

    return this._mobileDevice.model.mobileDevice.updateMany({
      where: {
        pushToken: {
          in: pushTokens,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
