import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '@clickvote/backend/src/packages/environment/environment.repository';
import {EncryptionService} from "@clickvote/nest-libraries";

@Injectable()
export class EnvironmentService {
  constructor(
    private readonly _environmentRepository: EnvironmentRepository,
    private readonly _encryptionService: EncryptionService
  ) {}

  async getKeysByOrgAndEnv(orgId: string, envId: string) {
    const { apiKey, secretKey } =
      await this._environmentRepository.getKeysByOrgAndEnv(orgId, envId);

    const secretKeyDecrypted = await this._encryptionService.decryptKey(
      secretKey,
      process.env.PASSWORD_ENCRYPTION
    );
    return { publicKey: apiKey, secretKey: secretKeyDecrypted };
  }
  getEnvironmentsByOrgId(orgId: number) {
    return this._environmentRepository.getEnvironmentsByOrgId(orgId);
  }
  createDevAndProduction(orgId: number) {
    return Promise.all(
      ['dev', 'production'].map(async (name, index) => {
        const keys = this._encryptionService.generateApiKey();

        const publicKey = keys.publicKey;

        const secretKey = await this._encryptionService.encryptKey(
          keys.secretKey,
          process.env.PASSWORD_ENCRYPTION
        );

        return this.createEnvironment(orgId, name, publicKey, secretKey, index);
      })
    );
  }

  createEnvironment(
    orgId: number,
    name: string,
    apiKey: string,
    secretKey: string,
    order: number
  ) {
    return this._environmentRepository.createEnvironment(
      orgId,
      name,
      apiKey,
      secretKey,
      order
    );
  }
}
