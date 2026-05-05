import { HttpException, Injectable } from '@nestjs/common';
import { AiKind } from '@prisma/client';
import {
  AiCredentialService,
  ResolvedAiCredential,
} from './ai-credential.service';

const NOT_CONFIGURED_MESSAGE =
  'Configure suas chaves em Settings > AI';

const NOT_SHARED_MESSAGE =
  'Este perfil nao tem credencial propria e o workspace nao compartilha o default. Configure suas chaves em Settings > AI ou ative "Compartilhar com perfis".';

@Injectable()
export class AiProviderResolverService {
  constructor(private _credentialService: AiCredentialService) {}

  /**
   * Resolve a credencial efetiva para uma chamada de IA.
   * Ordem de precedencia:
   *   1. Credencial PROFILE do profileId fornecido
   *   2. Credencial WORKSPACE com shareDefault=true (ou sem profileId)
   *   3. HttpException(402)
   */
  async resolve(
    organizationId: string,
    kind: AiKind,
    profileId?: string
  ): Promise<ResolvedAiCredential> {
    if (profileId) {
      const profileCred = await this._credentialService.getRaw(
        organizationId,
        'PROFILE',
        kind,
        profileId
      );
      if (profileCred) {
        this.markUsedInBackground(profileCred.id);
        return profileCred;
      }
    }

    const workspaceCred = await this._credentialService.getRaw(
      organizationId,
      'WORKSPACE',
      kind
    );
    if (workspaceCred) {
      const allowedForProfile = !profileId || workspaceCred.shareDefault;
      if (allowedForProfile) {
        this.markUsedInBackground(workspaceCred.id);
        return workspaceCred;
      }
      throw new HttpException(NOT_SHARED_MESSAGE, 402);
    }

    throw new HttpException(NOT_CONFIGURED_MESSAGE, 402);
  }

  private markUsedInBackground(credentialId: string) {
    void this._credentialService.markUsed(credentialId).catch(() => {});
  }
}
