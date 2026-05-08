import { HttpException, Injectable } from '@nestjs/common';
import { AiKind } from '@prisma/client';
import {
  AiCredentialService,
  ResolvedAiCredential,
} from './ai-credential.service';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';

const NOT_CONFIGURED_MESSAGE =
  'Configure suas chaves em Settings > AI Provider.';

const NOT_SHARED_MESSAGE =
  'Este perfil não tem chave própria e o perfil padrão não está compartilhando. Configure uma chave para este perfil em Settings > AI Provider, ou ative "Compartilhar com perfis" na configuração do perfil padrão.';

@Injectable()
export class AiProviderResolverService {
  constructor(
    private _credentialService: AiCredentialService,
    private _profileService: ProfileService
  ) {}

  /**
   * Resolve a credencial efetiva para uma chamada de IA.
   * Ordem de precedencia:
   *   1. Credencial PROFILE (apenas para perfis secundarios — o perfil
   *      default e dono da config workspace e cai direto no scope=WORKSPACE)
   *   2. Credencial WORKSPACE com shareDefault=true (ou se admin esta no
   *      perfil default, que e dono da config)
   *   3. HttpException(412 Precondition Failed)
   */
  async resolve(
    organizationId: string,
    kind: AiKind,
    profileId?: string
  ): Promise<ResolvedAiCredential> {
    // Se o profileId passado e o do perfil default da agencia, tratamos
    // como scope=WORKSPACE — o admin do default e o dono da config e
    // deve poder usar mesmo com shareDefault=false (que e a flag para
    // PERFIS SECUNDARIOS herdarem). Sem isso, qualquer chamada partindo
    // do default que tenha shareDefault=false retornaria 412.
    let effectiveProfileId = profileId;
    if (profileId) {
      const profile = await this._profileService.getProfileById(
        organizationId,
        profileId
      );
      if (profile?.isDefault) {
        effectiveProfileId = undefined;
      }
    }

    if (effectiveProfileId) {
      const profileCred = await this._credentialService.getRaw(
        organizationId,
        'PROFILE',
        kind,
        effectiveProfileId
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
      const allowedForProfile =
        !effectiveProfileId || workspaceCred.shareDefault;
      if (allowedForProfile) {
        this.markUsedInBackground(workspaceCred.id);
        return workspaceCred;
      }
      throw new HttpException(NOT_SHARED_MESSAGE, 412);
    }

    throw new HttpException(NOT_CONFIGURED_MESSAGE, 412);
  }

  private markUsedInBackground(credentialId: string) {
    void this._credentialService.markUsed(credentialId).catch(() => {});
  }
}
