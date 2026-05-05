import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { ImageOptions } from './ai-credential.schemas';

const OPENAI_IMAGE_GEN_URL = 'https://api.openai.com/v1/images/generations';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ASPECT_TO_OPENAI_SIZE: Record<string, string> = {
  '1:1': '1024x1024',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
  '16:9': '1536x1024',
  '9:16': '1024x1536',
};

const DEFAULT_OPENAI_MODEL = 'gpt-image-1';
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-3.1-flash-image-preview';

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
   */
  async generate(
    organizationId: string,
    prompt: string,
    profileId?: string
  ): Promise<GeneratedImage> {
    const credential = await this._resolver.resolve(
      organizationId,
      'IMAGE',
      profileId
    );
    const options = (credential.options ?? {}) as ImageOptions;

    let base64: string;
    let modelUsed: string;

    if (credential.provider === 'openai') {
      modelUsed = credential.model ?? DEFAULT_OPENAI_MODEL;
      base64 = await this.generateOpenAi(
        credential.apiKey,
        modelUsed,
        prompt,
        options
      );
    } else if (credential.provider === 'openrouter') {
      modelUsed = credential.model ?? DEFAULT_OPENROUTER_MODEL;
      base64 = await this.generateOpenRouter(
        credential.apiKey,
        modelUsed,
        prompt,
        options
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
    options: ImageOptions
  ): Promise<string> {
    const size = options.aspectRatioDefault
      ? ASPECT_TO_OPENAI_SIZE[options.aspectRatioDefault] ?? '1024x1024'
      : '1024x1024';

    const body: Record<string, unknown> = {
      model,
      prompt,
      n: options.numImages ?? 1,
      size,
      response_format: 'b64_json',
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
    options: ImageOptions
  ): Promise<string> {
    const imageConfig: Record<string, string> = {};
    if (options.aspectRatioDefault) {
      imageConfig.aspect_ratio = options.aspectRatioDefault;
    }
    if (options.imageSize) {
      imageConfig.image_size = options.imageSize;
    }

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    };
    if (Object.keys(imageConfig).length > 0) {
      body.image_config = imageConfig;
    }

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
