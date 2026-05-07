import { HttpException, Injectable } from '@nestjs/common';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  ImageOptions,
  TextOptions,
} from './ai-credential.schemas';
import { ResolvedAiCredential } from './ai-credential.service';
import { AiProviderResolverService } from './ai-provider-resolver.service';

const DEFAULT_TEXT_MODELS: Record<string, string> = {
  openrouter: 'openai/gpt-5.5',
  openai: 'gpt-5.5',
};

const DEFAULT_IMAGE_MODELS: Record<string, string> = {
  openrouter: 'google/gemini-3.1-flash-image-preview',
  openai: 'gpt-image-2',
};

export interface TextClientResult {
  provider: string;
  model: any;
  fallbackModel: any | null;
  options: TextOptions;
  credentialId: string;
}

export interface ImageClientResult {
  provider: string;
  model: any;
  options: ImageOptions;
  credentialId: string;
}

@Injectable()
export class AiClientFactory {
  constructor(private _resolver: AiProviderResolverService) {}

  async text(
    organizationId: string,
    profileId?: string
  ): Promise<TextClientResult> {
    const credential = await this._resolver.resolve(
      organizationId,
      'TEXT',
      profileId
    );
    return {
      provider: credential.provider,
      model: this.buildTextModel(credential),
      fallbackModel: credential.fallbackModel
        ? this.buildTextModel({
            ...credential,
            model: credential.fallbackModel,
          })
        : null,
      options: (credential.options as TextOptions) ?? {},
      credentialId: credential.id,
    };
  }

  async image(
    organizationId: string,
    profileId?: string
  ): Promise<ImageClientResult> {
    const credential = await this._resolver.resolve(
      organizationId,
      'IMAGE',
      profileId
    );
    return {
      provider: credential.provider,
      model: this.buildImageModel(credential),
      options: (credential.options as ImageOptions) ?? {},
      credentialId: credential.id,
    };
  }

  /**
   * Helper para Mastra Agent — retorna funcao async que resolve a credencial
   * em runtime. Permite trocar credencial sem reiniciar o agente.
   */
  textForMastra(organizationId: string, profileId?: string) {
    return async () => {
      const result = await this.text(organizationId, profileId);
      return result.model;
    };
  }

  private buildTextModel(credential: ResolvedAiCredential) {
    const modelId =
      credential.model ?? DEFAULT_TEXT_MODELS[credential.provider];
    if (!modelId) {
      throw new HttpException(
        `Modelo nao definido e provider sem default: ${credential.provider}`,
        500
      );
    }

    switch (credential.provider) {
      case 'openrouter': {
        const provider = createOpenRouter({ apiKey: credential.apiKey });
        return provider(modelId);
      }
      case 'openai': {
        const provider = createOpenAI({ apiKey: credential.apiKey });
        return provider(modelId);
      }
      default:
        throw new HttpException(
          `Provider sem suporte para texto: ${credential.provider}`,
          400
        );
    }
  }

  /**
   * OpenRouter ainda nao expoe `imageModel()` via AI SDK — geracao de imagem
   * via OpenRouter usa o endpoint chat com `modalities: ['image']` (resolvido
   * no MediaService no Bloco C). Aqui retornamos a instancia do provider
   * para o consumer decidir o caminho.
   */
  private buildImageModel(credential: ResolvedAiCredential) {
    const modelId =
      credential.model ?? DEFAULT_IMAGE_MODELS[credential.provider];
    if (!modelId) {
      throw new HttpException(
        `Modelo nao definido e provider sem default: ${credential.provider}`,
        500
      );
    }

    switch (credential.provider) {
      case 'openrouter': {
        const provider = createOpenRouter({ apiKey: credential.apiKey });
        return (provider as any)(modelId);
      }
      case 'openai': {
        const provider = createOpenAI({ apiKey: credential.apiKey });
        return provider.imageModel(modelId);
      }
      default:
        throw new HttpException(
          `Provider sem suporte para imagem: ${credential.provider}`,
          400
        );
    }
  }
}
