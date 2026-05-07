import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { ImageOptions } from './ai-credential.schemas';

const OPENAI_IMAGE_GEN_URL = 'https://api.openai.com/v1/images/generations';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_OPENAI_MODEL = 'gpt-image-2';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.1-flash-image-preview';

export type AiAspectRatio = '1:1' | '9:16' | '16:9';
const DEFAULT_ASPECT_RATIO: AiAspectRatio = '1:1';

/**
 * Mapeia aspect ratio universal (`1:1`, `9:16`, `16:9`) para o `size`
 * literal que a API OpenAI espera. Os 3 tamanhos abaixo cobrem
 * `gpt-image-2` e `gpt-image-1-mini` (familia atual). Modelos legacy
 * (DALL-E 2/3, gpt-image-1) nao sao mais expostos no catalogo.
 */
const ASPECT_TO_OPENAI_SIZE: Record<AiAspectRatio, string> = {
  '1:1': '1024x1024',
  '9:16': '1024x1536',
  '16:9': '1536x1024',
};

export interface GenerateImageOptions {
  aspectRatio?: AiAspectRatio;
}

export interface GeneratedImage {
  base64: string;
  provider: string;
  model: string;
  credentialId: string;
}

@Injectable()
export class AiImageService {
  private readonly _logger = new Logger(AiImageService.name);

  constructor(private _resolver: AiProviderResolverService) {}

  /**
   * Gera imagem para o prompt informado e retorna base64 puro
   * (sem prefixo data:image/...).
   *
   * @param opts.aspectRatio  '1:1' (default), '9:16' (vertical), '16:9' (horizontal)
   *                          Os 3 valores universais sao suportados por
   *                          todos os modelos do catalogo.
   */
  async generate(
    organizationId: string,
    prompt: string,
    profileId?: string,
    opts: GenerateImageOptions = {}
  ): Promise<GeneratedImage> {
    const credential = await this._resolver.resolve(
      organizationId,
      'IMAGE',
      profileId
    );
    const options = (credential.options ?? {}) as ImageOptions;
    const aspectRatio: AiAspectRatio = opts.aspectRatio ?? DEFAULT_ASPECT_RATIO;

    let base64: string;
    let modelUsed: string;

    if (credential.provider === 'openai') {
      modelUsed = credential.model ?? DEFAULT_OPENAI_MODEL;
      base64 = await this.generateOpenAi(
        credential.apiKey,
        modelUsed,
        prompt,
        options,
        aspectRatio
      );
    } else if (credential.provider === 'openrouter') {
      modelUsed = credential.model ?? DEFAULT_OPENROUTER_MODEL;
      base64 = await this.generateOpenRouter(
        credential.apiKey,
        modelUsed,
        prompt,
        options,
        aspectRatio
      );
    } else {
      throw new HttpException(
        `Provider sem suporte para imagem: ${credential.provider}`,
        400
      );
    }

    return {
      base64,
      provider: credential.provider,
      model: modelUsed,
      credentialId: credential.id,
    };
  }

  private async generateOpenAi(
    apiKey: string,
    model: string,
    prompt: string,
    options: ImageOptions,
    aspectRatio: AiAspectRatio
  ): Promise<string> {
    const size = ASPECT_TO_OPENAI_SIZE[aspectRatio];

    const body: Record<string, unknown> = {
      model,
      prompt,
      n: options.numImages ?? 1,
      size,
    };
    if (options.quality && options.quality !== 'auto') {
      body.quality = options.quality;
    }

    const res = await fetch(OPENAI_IMAGE_GEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      this._logger.warn(
        `OpenAI images.generate retornou ${res.status}: ${errBody.slice(0, 200)}`
      );
      throw new HttpException(
        `OpenAI image gen falhou (${res.status}).`,
        502
      );
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      throw new HttpException('OpenAI nao devolveu imagem.', 502);
    }
    return b64;
  }

  private async generateOpenRouter(
    apiKey: string,
    model: string,
    prompt: string,
    options: ImageOptions,
    aspectRatio: AiAspectRatio
  ): Promise<string> {
    const imageConfig: Record<string, string> = {
      aspect_ratio: aspectRatio,
    };
    if (options.imageSize) {
      imageConfig.image_size = options.imageSize;
    }

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
      image_config: imageConfig,
    };

    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      this._logger.warn(
        `OpenRouter chat retornou ${res.status}: ${errBody.slice(0, 200)}`
      );
      throw new HttpException(
        `OpenRouter image gen falhou (${res.status}).`,
        502
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
        };
      }>;
    };

    const url =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? '';
    if (!url) {
      throw new HttpException('OpenRouter nao devolveu imagem.', 502);
    }
    return url.replace(/^data:image\/[^;]+;base64,/, '');
  }
}
