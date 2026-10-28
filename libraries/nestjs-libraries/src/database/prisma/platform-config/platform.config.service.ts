import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformConfigRepository } from './platform.config.repository';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import {
  PLATFORM_DEFINITIONS,
  PlatformDefinition,
} from './platform.metadata';

export interface PlatformConfigResponse extends PlatformDefinition {
  isConfigured: boolean;
  callbackUrl?: string;
  fieldValues: Record<
    string,
    {
      value: string;
      hasValue: boolean;
      isSecret: boolean;
      source: 'database' | 'environment' | 'none';
    }
  >;
}

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  private readonly _logger = new Logger(PlatformConfigService.name);

  constructor(private _platformConfigRepo: PlatformConfigRepository) {}

  private _initialEnv: Record<string, string | undefined> = {};

  async onModuleInit() {
    this._initialEnv = {
      FRONTEND_URL: process.env.FRONTEND_URL,
      MAIN_URL: process.env.MAIN_URL,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      CANVA_APP_ORIGIN: process.env.CANVA_APP_ORIGIN,
      DISABLE_REGISTRATION: process.env.DISABLE_REGISTRATION,
    };
    await this.loadAllConfigsIntoMemory();
  }

  /**
   * Load all configurations from PostgreSQL and inject into process.env
   */
  async loadAllConfigsIntoMemory() {
    try {
      const configs = await this._platformConfigRepo.getAllConfigs();
      let loadedCount = 0;

      for (const config of configs) {
        if (!config.value) {
          continue;
        }

        let plainValue = config.value;
        if (config.isSecret) {
          try {
            plainValue = AuthService.fixedDecryption(config.value);
          } catch (err) {
            this._logger.warn(
              `Failed to decrypt secret for key ${config.key}, using stored value.`
            );
          }
        }

        process.env[config.key] = plainValue;
        loadedCount++;
      }

      this._logger.log(
        `Successfully loaded ${loadedCount} platform configuration(s) from database into runtime environment.`
      );
    } catch (error) {
      this._logger.error('Error loading platform configurations from DB', error);
    }
  }

  /**
   * Get all platform definitions with their current configured values & statuses
   */
  async getAllPlatformConfigs(mainUrl?: string): Promise<PlatformConfigResponse[]> {
    const dbConfigs = await this._platformConfigRepo.getAllConfigs();
    const dbMap = new Map(dbConfigs.map((c) => [c.key, c]));
    const baseUrl = (
      mainUrl ||
      process.env.FRONTEND_URL ||
      process.env.MAIN_URL ||
      'http://localhost:4007'
    ).replace(/\/+$/, '');

    return PLATFORM_DEFINITIONS.map((def) => {
      const fieldValues: PlatformConfigResponse['fieldValues'] = {};
      let hasRequiredKey = false;

      for (const field of def.fields) {
        const dbRecord = dbMap.get(field.key);
        const envValue = process.env[field.key];

        let value = '';
        let hasValue = false;
        let source: 'database' | 'environment' | 'none' = 'none';

        if (dbRecord && dbRecord.value) {
          hasValue = true;
          source = 'database';
          value = field.isSecret ? '••••••••' : dbRecord.value;
        } else if (envValue) {
          hasValue = true;
          source = 'environment';
          value = field.isSecret ? '••••••••' : envValue;
        }

        if (hasValue) {
          hasRequiredKey = true;
        }

        fieldValues[field.key] = {
          value,
          hasValue,
          isSecret: field.isSecret,
          source,
        };
      }

      return {
        ...def,
        isConfigured: hasRequiredKey,
        callbackUrl: def.callbackPath ? `${baseUrl}${def.callbackPath}` : undefined,
        fieldValues,
      };
    });
  }

  /**
   * Save configuration for a specific platform
   */
  async savePlatformConfig(
    platformId: string,
    values: Record<string, string>
  ) {
    const def = PLATFORM_DEFINITIONS.find((p) => p.id === platformId);
    if (!def) {
      throw new Error(`Platform ${platformId} is not supported.`);
    }

    for (const field of def.fields) {
      const incomingVal = values[field.key];
      // Skip if value was not passed or is the masked string
      if (incomingVal === undefined || incomingVal === '••••••••') {
        continue;
      }

      const trimmed = incomingVal.trim();
      if (!trimmed) {
        // If user explicitly sent empty string, delete from database
        await this._platformConfigRepo.deleteConfigByKey(field.key).catch(() => {});
        process.env[field.key] = '';
        continue;
      }

      let storedValue = trimmed;
      if (field.isSecret) {
        storedValue = AuthService.fixedEncryption(trimmed);
      }

      await this._platformConfigRepo.upsertConfig(
        platformId,
        field.key,
        storedValue,
        field.isSecret,
        field.description
      );

      // Immediately update runtime process.env
      process.env[field.key] = trimmed;
    }

    return { success: true, platformId };
  }

  /**
   * Remove configuration for a specific platform
   */
  async deletePlatformConfig(platformId: string) {
    const def = PLATFORM_DEFINITIONS.find((p) => p.id === platformId);
    if (def) {
      for (const field of def.fields) {
        process.env[field.key] = '';
      }
    }

    await this._platformConfigRepo.deleteConfigsByPlatform(platformId);
    return { success: true, platformId };
  }

  /**
   * Get current public app URL and system settings
   */
  async getSystemConfig() {
    const dbConfigs = await this._platformConfigRepo.getAllConfigs();
    const dbMap = new Map(dbConfigs.map((c) => [c.key, c]));

    const dbFrontend = dbMap.get('FRONTEND_URL');
    const dbMain = dbMap.get('MAIN_URL');
    const dbReg = dbMap.get('DISABLE_REGISTRATION');

    const appUrl =
      dbFrontend?.value ||
      dbMain?.value ||
      process.env.FRONTEND_URL ||
      process.env.MAIN_URL ||
      'http://localhost:4007';

    const appUrlSource: 'database' | 'environment' =
      dbFrontend?.value || dbMain?.value ? 'database' : 'environment';

    const disableRegistration =
      (dbReg ? dbReg.value : process.env.DISABLE_REGISTRATION) === 'true';

    const disableRegistrationSource: 'database' | 'environment' = dbReg?.value
      ? 'database'
      : 'environment';

    return {
      appUrl,
      appUrlSource,
      disableRegistration,
      disableRegistrationSource,
    };
  }

  /**
   * Update public app URL and system settings
   */
  async saveSystemConfig(dto: {
    appUrl?: string;
    disableRegistration?: boolean;
  }) {
    if (dto.appUrl !== undefined) {
      let trimmed = dto.appUrl.trim().replace(/\/+$/, '');
      if (trimmed) {
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          throw new Error('App URL must start with http:// or https://');
        }

        await this._platformConfigRepo.upsertConfig(
          'system',
          'FRONTEND_URL',
          trimmed,
          false,
          'Public Frontend / App URL'
        );
        await this._platformConfigRepo.upsertConfig(
          'system',
          'MAIN_URL',
          trimmed,
          false,
          'Main System URL'
        );
        await this._platformConfigRepo.upsertConfig(
          'system',
          'NEXT_PUBLIC_BACKEND_URL',
          `${trimmed}/api`,
          false,
          'Backend Public API URL'
        );
        await this._platformConfigRepo.upsertConfig(
          'system',
          'CANVA_APP_ORIGIN',
          trimmed,
          false,
          'Canva App Origin URL'
        );

        process.env.FRONTEND_URL = trimmed;
        process.env.MAIN_URL = trimmed;
        process.env.NEXT_PUBLIC_BACKEND_URL = `${trimmed}/api`;
        process.env.CANVA_APP_ORIGIN = trimmed;
      }
    }

    if (dto.disableRegistration !== undefined) {
      const regStr = dto.disableRegistration ? 'true' : 'false';
      await this._platformConfigRepo.upsertConfig(
        'system',
        'DISABLE_REGISTRATION',
        regStr,
        false,
        'Disable public self-registration'
      );
      process.env.DISABLE_REGISTRATION = regStr;
    }

    return this.getSystemConfig();
  }

  /**
   * Reset system domain and registration settings to .env defaults
   */
  async resetSystemConfig() {
    await this._platformConfigRepo.deleteConfigsByPlatform('system');

    process.env.FRONTEND_URL =
      this._initialEnv.FRONTEND_URL || 'http://localhost:4007';
    process.env.MAIN_URL =
      this._initialEnv.MAIN_URL || 'http://localhost:4007';
    process.env.NEXT_PUBLIC_BACKEND_URL =
      this._initialEnv.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4007/api';
    process.env.CANVA_APP_ORIGIN =
      this._initialEnv.CANVA_APP_ORIGIN || 'http://localhost:4007';
    process.env.DISABLE_REGISTRATION =
      this._initialEnv.DISABLE_REGISTRATION || 'false';

    return this.getSystemConfig();
  }
}
