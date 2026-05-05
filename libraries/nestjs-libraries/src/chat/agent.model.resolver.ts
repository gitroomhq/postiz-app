import { HttpException, Injectable } from '@nestjs/common';
import { AiClientFactory } from '@gitroom/nestjs-libraries/ai/ai-client.factory';

interface MinimalRuntimeContext {
  get(key: string): unknown;
}

/**
 * Resolve o modelo de linguagem para o Agent Mastra a partir do
 * `runtimeContext` (que ja carrega `organization` e `profileId` por
 * convencao). Centraliza a logica para ficar testavel sem instanciar
 * o Agent inteiro.
 */
@Injectable()
export class AgentModelResolver {
  constructor(private _factory: AiClientFactory) {}

  async resolve(runtimeContext: MinimalRuntimeContext) {
    const orgRaw = runtimeContext.get('organization');
    const profileIdRaw = runtimeContext.get('profileId');

    if (!orgRaw) {
      throw new HttpException(
        'organization ausente em runtimeContext.',
        500
      );
    }

    const org =
      typeof orgRaw === 'string' ? safeParseOrg(orgRaw) : (orgRaw as { id: string });
    if (!org?.id) {
      throw new HttpException(
        'organization.id nao encontrada em runtimeContext.',
        500
      );
    }

    const profileId =
      typeof profileIdRaw === 'string' && profileIdRaw.length > 0
        ? profileIdRaw
        : undefined;

    const result = await this._factory.text(org.id, profileId);
    return result.model;
  }
}

function safeParseOrg(value: string): { id: string } | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
