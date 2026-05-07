import { HttpException, Injectable } from '@nestjs/common';
import { AiClientFactory } from '@gitroom/nestjs-libraries/ai/ai-client.factory';

interface MinimalRequestContext {
  get(key: string): unknown;
}

/**
 * Resolve o modelo de linguagem para o Agent Mastra a partir do
 * `requestContext` (que ja carrega `organization` e `profileId` por
 * convencao). Centraliza a logica para ficar testavel sem instanciar
 * o Agent inteiro.
 *
 * Mastra v1.21+ passa `requestContext` (era `runtimeContext` antes).
 * Aceitamos ambos via parametro flexivel para resilencia em upgrades.
 */
@Injectable()
export class AgentModelResolver {
  constructor(private _factory: AiClientFactory) {}

  async resolve(requestContext: MinimalRequestContext | undefined) {
    if (!requestContext || typeof requestContext.get !== 'function') {
      throw new HttpException(
        'requestContext ausente — agent invocado sem o contexto de organizacao.',
        500
      );
    }

    const orgRaw = requestContext.get('organization');
    const profileIdRaw = requestContext.get('profileId');

    if (!orgRaw) {
      throw new HttpException(
        'organization ausente em requestContext.',
        500
      );
    }

    const org =
      typeof orgRaw === 'string' ? safeParseOrg(orgRaw) : (orgRaw as { id: string });
    if (!org?.id) {
      throw new HttpException(
        'organization.id nao encontrada em requestContext.',
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
