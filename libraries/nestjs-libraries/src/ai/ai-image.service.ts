import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { ImageOptions } from './ai-credential.schemas';

const OPENAI_IMAGE_GEN_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_IMAGE_EDIT_URL = 'https://api.openai.com/v1/images/edits';
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

export type ImageMode = 'T2I' | 'I2I';

export interface GenerateImageOptions {
  aspectRatio?: AiAspectRatio;
  /** 'T2I' (default) gera a partir de texto. 'I2I' transforma uma imagem
   *  de referencia conforme o prompt. Quando 'I2I', `referenceImageUrl`
   *  e obrigatorio (validado no `generate()`). */
  mode?: ImageMode;
  referenceImageUrl?: string;
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
   * @param opts.mode         'T2I' (default) ou 'I2I' para image-to-image
   * @param opts.referenceImageUrl  obrigatorio quando mode='I2I'. URL publica
   *                                http(s) da imagem de referencia.
   */
  async generate(
    organizationId: string,
    prompt: string,
    profileId?: string,
    opts: GenerateImageOptions = {}
  ): Promise<GeneratedImage> {
    const mode: ImageMode = opts.mode ?? 'T2I';
    if (mode === 'I2I' && !opts.referenceImageUrl) {
      throw new HttpException(
        'referenceImageUrl e obrigatorio quando mode=I2I.',
        400
      );
    }

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
      base64 =
        mode === 'I2I'
          ? await this.generateOpenAiEdit(
              credential.apiKey,
              modelUsed,
              prompt,
              opts.referenceImageUrl as string,
              options,
              aspectRatio
            )
          : await this.generateOpenAi(
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
        aspectRatio,
        mode === 'I2I' ? opts.referenceImageUrl : undefined
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

  /**
   * I2I via OpenAI `/v1/images/edits`. Baixa a imagem de referencia,
   * monta multipart/form-data com `image`, `prompt`, `size`, `model`
   * e envia. `gpt-image-2` e o modelo recomendado (legacy DALL-E 2 ja
   * fora do catalogo). Mask nao e exposto nesta entrega.
   */
  private async generateOpenAiEdit(
    apiKey: string,
    model: string,
    prompt: string,
    referenceImageUrl: string,
    options: ImageOptions,
    aspectRatio: AiAspectRatio
  ): Promise<string> {
    // 1. Baixa a imagem de referencia. /v1/images/edits exige PNG/WebP;
    //    o usuario e responsavel por fornecer URL com formato compativel.
    const refRes = await fetch(referenceImageUrl);
    if (!refRes.ok) {
      this._logger.warn(
        `Falha ao baixar reference image (${referenceImageUrl}): HTTP ${refRes.status}`
      );
      throw new HttpException(
        `Nao foi possivel baixar a imagem de referencia (HTTP ${refRes.status}).`,
        502
      );
    }
    const buffer = Buffer.from(await refRes.arrayBuffer());
    const contentType =
      refRes.headers.get('content-type') ?? 'application/octet-stream';
    const filename = referenceImageUrl.split('/').pop() ?? 'reference.png';

    // 2. Monta o FormData
    const size = ASPECT_TO_OPENAI_SIZE[aspectRatio];
    const form = new FormData();
    form.set('model', model);
    form.set('prompt', prompt);
    form.set('n', String(options.numImages ?? 1));
    form.set('size', size);
    if (options.quality && options.quality !== 'auto') {
      form.set('quality', options.quality);
    }
    form.set(
      'image',
      new Blob([new Uint8Array(buffer)], { type: contentType }),
      filename
    );

    // 3. POST. NAO setamos Content-Type: o fetch detecta o boundary do FormData.
    const res = await fetch(OPENAI_IMAGE_EDIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    if (!res.ok) {
      const errBody = await res.text();
      this._logger.warn(
        `OpenAI images.edits retornou ${res.status}: ${errBody.slice(0, 200)}`
      );
      throw new HttpException(
        `OpenAI image edit falhou (${res.status}).`,
        502
      );
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      throw new HttpException('OpenAI edit nao devolveu imagem.', 502);
    }
    return b64;
  }

  /**
   * OpenRouter chat completions com `modalities: ['image', 'text']`.
   *
   * - T2I: `messages[0].content` e string (prompt simples).
   * - I2I: `messages[0].content` e array `[text, image_url]` — modelos como
   *        Gemini Nano Banana, Flux fast etc aceitam imagem de referencia
   *        nesse formato e devolvem imagem nova respeitando o prompt.
   */
  private async generateOpenRouter(
    apiKey: string,
    model: string,
    prompt: string,
    options: ImageOptions,
    aspectRatio: AiAspectRatio,
    referenceImageUrl?: string
  ): Promise<string> {
    const imageConfig: Record<string, string> = {
      aspect_ratio: aspectRatio,
    };
    if (options.imageSize) {
      imageConfig.image_size = options.imageSize;
    }

    const userContent: unknown = referenceImageUrl
      ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: referenceImageUrl } },
        ]
      : prompt;

    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: userContent }],
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
