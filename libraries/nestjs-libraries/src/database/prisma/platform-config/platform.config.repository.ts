import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformConfigRepository {
  constructor(private _platformConfig: PrismaRepository<'platformConfig'>) {}

  getAllConfigs() {
    return this._platformConfig.model.platformConfig.findMany({
      orderBy: {
        platform: 'asc',
      },
    });
  }

  getConfigsByPlatform(platform: string) {
    return this._platformConfig.model.platformConfig.findMany({
      where: {
        platform,
      },
    });
  }

  getConfigByKey(key: string) {
    return this._platformConfig.model.platformConfig.findUnique({
      where: {
        key,
      },
    });
  }

  upsertConfig(
    platform: string,
    key: string,
    value: string,
    isSecret: boolean = false,
    description?: string
  ) {
    return this._platformConfig.model.platformConfig.upsert({
      where: {
        key,
      },
      update: {
        platform,
        value,
        isSecret,
        description,
      },
      create: {
        platform,
        key,
        value,
        isSecret,
        description,
      },
    });
  }

  deleteConfigsByPlatform(platform: string) {
    return this._platformConfig.model.platformConfig.deleteMany({
      where: {
        platform,
      },
    });
  }

  deleteConfigByKey(key: string) {
    return this._platformConfig.model.platformConfig.delete({
      where: {
        key,
      },
    });
  }
}
