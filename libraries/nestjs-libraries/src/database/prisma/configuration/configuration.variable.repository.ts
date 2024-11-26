import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigurationVariableRepository {
  constructor(
    private _configurationVariables: PrismaRepository<'configurationVariables'>
  ) {}

  getOrDefault(key: string, defaultValue: string) {
    const dbVal = this._configurationVariables.model.configurationVariables.findFirst({
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
    return !!this._configurationVariables.model.configurationVariables.findFirst({
      where: {
        key,
      },
    });
  }

  set(key: string, value: string) {
    return this._configurationVariables.model.configurationVariables.create({
      data: {
        key,
        value,
      },
    });
  }

  getAll() {
    return this._configurationVariables.model.configurationVariables.findMany();
  }
}
