import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigurationVariableService {
  constructor(
    private _configurationVariableRepository: ConfigurationVariableRepository,
  ) {}

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
}
