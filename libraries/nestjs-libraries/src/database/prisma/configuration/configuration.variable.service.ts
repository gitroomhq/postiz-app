import { Injectable } from '@nestjs/common';

import { ConfigurationVariableRepository } from '@gitroom/nestjs-libraries/database/prisma/configuration/configuration.variable.repository';

@Injectable()
export class ConfigurationVariableService {
  private cvars: {
    key: string,
    title: string,
    description: string,
    datatype: string,
    default: string | null,
    val: string | null,
    section: string[],
    docs?: string,
  }[];

  constructor(
    private _configurationVariableRepository: ConfigurationVariableRepository,
  ) {
    this.cvars = [
      {
        key: 'USER_REGISTRATION_DISABLED',
        title: 'Disable user registration',
        description: 'If user registration is disabled, only super admins can create new users',
        datatype: 'bool',
        default: 'true',
        val: 'true',
        section: ['Functionality'],
      },
      {
        key: 'MARKETPLACE_DISABLED',
        title: 'Disable marketplace',
        description: 'If the marketplace is disabled, users will not be able to buy or sell posts',
        datatype: 'bool',
        default: 'true',
        val: 'true',
        section: ['Functionality'],
      },
      {
        key: 'DISCORD_CLIENT_ID',
        title: 'Discord client ID',
        description: 'Used to authenticate with Discord with OAuth.',
        docs: 'https://docs.postiz.com/providers/discord',
        datatype: 'string',
        default: null,
        val: null,
        section: ['Providers', 'Discord'],
      },
      {
        key: 'DISCORD_CLIENT_SECRET',
        title: 'Discord client secret',
        description: 'Used to authenticate with Discord with OAuth.',
        datatype: 'string',
        default: null,
        val: null,
        section: ['Providers', 'Discord'],
      },
    ]
  }

  getOrDefault(key: string, defaultValue: string) {
    return this._configurationVariableRepository.getOrDefault(key, defaultValue);
  }

  getOrEmpty(key: string) {
    return this._configurationVariableRepository.getOrDefault(key, '');
  }

  isSet(key: string) {
    return this._configurationVariableRepository.isSet(key);
  }

  set(key: string, value: string) {
    return this._configurationVariableRepository.set(key, value);
  }

  getAll() {
    return this.cvars;
//    return this._configurationVariableRepository.getAll();
  }
}
