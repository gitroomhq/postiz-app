import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigurationVariableRepository {
  constructor(
    private _configurationVariable: PrismaRepository<'configurationVariables'>
  ) {}

  getOrDefault(key: string, defaultValue: string) {
    const dbVal = this._configurationVariable.model.configurationVariable.findFirst({
      where: {
        key,
      },
    });

    if (dbVal) {
      return dbVal;
    } else {
      return defaultValue;
    }
  }

  isSet(key: string) {
    return !!this._configurationVariable.model.configurationVariable.findFirst({
      where: {
        key,
      },
    });
  }

  set(key: string, value: string) {
    return this._configurationVariable.model.configurationVariable.create({
      data: {
        key,
        value,
      },
    });
  }
}
