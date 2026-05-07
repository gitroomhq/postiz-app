import { HttpException, Injectable, Logger } from '@nestjs/common';
import { timer } from '@gitroom/helpers/utils/timer';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { AiTextService } from './ai-text.service';
import { ResolvedAiCredential } from './ai-credential.service';
import { VideoOptions } from './ai-credential.schemas';

const KIE_BASE_URL = 'https://api.kie.ai';
const SEEDANCE_CREATE_URL = `${KIE_BASE_URL}/api/v1/jobs/createTask`;
const SEEDANCE_INFO_URL = `${KIE_BASE_URL}/api/v1/jobs/recordInfo`;
const VEO_CREATE_URL = `${KIE_BASE_URL}/api/v1/veo/generate`;
const VEO_INFO_URL = `${KIE_BASE_URL}/api/v1/veo/record-info`;

const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_ITERATIONS = 20; // 20 * 30s = 10min

const DEFAULT_ASPECT_RATIO = '16:9';
const DEFAULT_RESOLUTION = '720p';
const DEFAULT_DURATION = 5;

const SEEDANCE_MODELS = new Set([
  'bytedance/seedance-2',
  'bytedance/seedance-2-fast',
]);
const VEO_MODELS = new Set(['veo3', 'veo3_fast', 'veo3_lite']);

export type VideoMode = 'T2V' | 'I2V';
export type VideoAspectRatio = '1:1' | '9:16' | '16:9' | 'Auto';

export interface GenerateVideoInput {
  prompt: string;
  mode: VideoMode;
  /** Obrigatorio quando mode='I2V'. Deve ser URL publicamente acessivel. */
  referenceImageUrl?: string;
  /** Sobrescreve o aspect ratio default da credencial. */
  aspectRatio?: VideoAspectRatio;
  /** Quando true (default), passa pelo TEXT enrich antes de chamar o modelo. */
  enrichPrompt?: boolean;
}

export interface GeneratedVideo {
  url: string;
  model: string;
  taskId: string;
  provider: string;
  credentialId: string;
}

/**
 * Sanitiza Bearer tokens de qualquer string para evitar vazamento em logs.
 */
function sanitize(value: string): string {
  return value.replace(/Bearer\s+[A-Za-z0-9_.\-]+/gi, 'Bearer ***');
}

@Injectable()
export class AiVideoService {
  private readonly _logger = new Logger(AiVideoService.name);

  constructor(
    private _resolver: AiProviderResolverService,
    private _aiTextService: AiTextService
  ) {}

  /**
   * Gera video via kie.ai (Seedance 2.0 / Seedance 2 Fast / Veo 3.x).
   *
   * Pipeline:
   * 1. Resolve credencial (412 se ausente).
   * 2. Valida provider=kieai (400 se diferente).
   * 3. Valida I2V tem referenceImageUrl (400 se faltar).
   * 4. Enrich prompt opcional via AiTextService (best-effort, 412 nao bloqueia).
   * 5. Dispatcha para generateSeedance ou generateVeo conforme model.
   * 6. Polling com `timer(POLL_INTERVAL_MS)` ate successFlag=1 (max 10min).
   *
   * Retorna URL hospedada pelo kie.ai. Caller faz upload pra storage propria.
   */
  async generate(
    organizationId: string,
    input: GenerateVideoInput,
    profileId?: string
  ): Promise<GeneratedVideo> {
    if (input.mode === 'I2V' && !input.referenceImageUrl) {
      throw new HttpException(
        'referenceImageUrl e obrigatorio quando mode=I2V.',
        400
      );
    }

    const credential = await this._resolver.resolve(
      organizationId,
      'VIDEO',
      profileId
    );

    if (credential.provider !== 'kieai') {
      throw new HttpException(
        `Provider sem suporte para video: ${credential.provider}. Apenas 'kieai' e suportado.`,
        400
      );
    }

    const finalPrompt = await this.maybeEnrichPrompt(
      organizationId,
      input,
      profileId
    );

    const model = credential.model ?? '';

    if (SEEDANCE_MODELS.has(model)) {
      return this.generateSeedance(credential, input, finalPrompt);
    }

    if (VEO_MODELS.has(model)) {
      return this.generateVeo(credential, input, finalPrompt);
    }

    throw new HttpException(
      `Modelo de video desconhecido em credencial: ${model}.`,
      400
    );
  }

  private async maybeEnrichPrompt(
    organizationId: string,
    input: GenerateVideoInput,
    profileId?: string
  ): Promise<string> {
    if (input.enrichPrompt === false) {
      return input.prompt;
    }
    try {
      return await this._aiTextService.generatePromptForVideo(
        organizationId,
        input.prompt,
        profileId
      );
    } catch (e) {
      const status = e instanceof HttpException ? e.getStatus() : undefined;
      if (status === 412) {
        this._logger.warn(
          'TEXT credential nao configurada para enrich; seguindo com prompt original.'
        );
        return input.prompt;
      }
      // Qualquer outro erro de enrich tambem e best-effort — nao bloqueia geracao
      this._logger.warn(
        `Enrich prompt falhou: ${(e as Error).message}. Seguindo com prompt original.`
      );
      return input.prompt;
    }
  }

  // ---------------- Seedance ----------------

  private async generateSeedance(
    credential: ResolvedAiCredential,
    input: GenerateVideoInput,
    finalPrompt: string
  ): Promise<GeneratedVideo> {
    const opts = (credential.options ?? {}) as VideoOptions;
    const aspectRatio = input.aspectRatio ?? opts.aspectRatioDefault ?? DEFAULT_ASPECT_RATIO;

    const body = {
      model: credential.model,
      input: {
        prompt: finalPrompt,
        ...(input.mode === 'I2V'
          ? { first_frame_url: input.referenceImageUrl }
          : {}),
        resolution: opts.resolution ?? DEFAULT_RESOLUTION,
        aspect_ratio: aspectRatio,
        duration: opts.durationSeconds ?? DEFAULT_DURATION,
        generate_audio: opts.audio ?? false,
      },
    };

    const taskId = await this.postCreate(
      SEEDANCE_CREATE_URL,
      credential.apiKey,
      body
    );
    const url = await this.pollUntilDone(
      SEEDANCE_INFO_URL,
      taskId,
      credential.apiKey
    );

    return {
      url,
      model: credential.model ?? '',
      taskId,
      provider: credential.provider,
      credentialId: credential.id,
    };
  }

  // ---------------- Veo ----------------

  private async generateVeo(
    credential: ResolvedAiCredential,
    input: GenerateVideoInput,
    finalPrompt: string
  ): Promise<GeneratedVideo> {
    const opts = (credential.options ?? {}) as VideoOptions;
    const aspectRatio = input.aspectRatio ?? opts.aspectRatioDefault ?? DEFAULT_ASPECT_RATIO;

    const body: Record<string, unknown> = {
      prompt: finalPrompt,
      model: credential.model,
      aspect_ratio: aspectRatio,
      generationType: input.mode === 'I2V' ? 'FIRST_AND_LAST_FRAMES_2_VIDEO' : 'TEXT_2_VIDEO',
    };
    if (input.mode === 'I2V') {
      body.imageUrls = [input.referenceImageUrl];
    }

    const taskId = await this.postCreate(
      VEO_CREATE_URL,
      credential.apiKey,
      body
    );
    const url = await this.pollUntilDone(
      VEO_INFO_URL,
      taskId,
      credential.apiKey
    );

    return {
      url,
      model: credential.model ?? '',
      taskId,
      provider: credential.provider,
      credentialId: credential.id,
    };
  }

  // ---------------- Comum ----------------

  private async postCreate(
    url: string,
    apiKey: string,
    body: unknown
  ): Promise<string> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      this._logger.warn(
        `kie.ai create falhou (network): ${sanitize((e as Error).message)}`
      );
      throw new HttpException('kie.ai indisponivel.', 502);
    }

    if (!res.ok) {
      const errBody = await res.text();
      this._logger.warn(
        `kie.ai create retornou ${res.status}: ${sanitize(errBody.slice(0, 200))}`
      );
      throw new HttpException(`kie.ai create falhou (${res.status}).`, 502);
    }

    const json = (await res.json()) as {
      code?: number;
      data?: { taskId?: string };
      msg?: string;
    };

    if (json.code !== 200 && json.code !== 201) {
      this._logger.warn(
        `kie.ai create retornou code=${json.code}: ${sanitize(json.msg ?? '')}`
      );
      throw new HttpException(
        `kie.ai create rejeitou: ${json.msg ?? 'unknown'}`,
        502
      );
    }

    const taskId = json.data?.taskId;
    if (!taskId) {
      throw new HttpException('kie.ai nao devolveu taskId.', 502);
    }
    return taskId;
  }

  private async pollUntilDone(
    infoUrl: string,
    taskId: string,
    apiKey: string
  ): Promise<string> {
    const url = `${infoUrl}?taskId=${encodeURIComponent(taskId)}`;

    for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
      await timer(POLL_INTERVAL_MS);

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (e) {
        this._logger.warn(
          `kie.ai poll falhou (network): ${sanitize((e as Error).message)}`
        );
        continue; // tenta de novo no proximo poll
      }

      if (!res.ok) {
        const errBody = await res.text();
        this._logger.warn(
          `kie.ai poll retornou ${res.status}: ${sanitize(errBody.slice(0, 200))}`
        );
        continue;
      }

      const json = (await res.json()) as {
        code?: number;
        data?: {
          successFlag?: number;
          resultUrls?: string | string[];
          response?: { resultUrls?: string[] };
        };
      };

      const data = json.data;
      const flag = data?.successFlag;

      if (flag === 1) {
        const url = this.extractFirstUrl(data);
        if (!url) {
          throw new HttpException(
            'kie.ai marcou como pronto mas nao devolveu URL.',
            502
          );
        }
        return url;
      }

      if (flag === 2 || flag === 3) {
        throw new HttpException(
          'kie.ai falhou na geracao do video.',
          502
        );
      }
      // flag === 0 ou undefined → continua polling
    }

    throw new HttpException(
      'Timeout aguardando geracao de video do kie.ai (>10min).',
      504
    );
  }

  /**
   * `resultUrls` no kie.ai vem em formatos diferentes:
   *   - string JSON-stringificada (ex: `'["https://..."]'`)
   *   - array direto (`['https://...']`)
   *   - objeto aninhado em `response.resultUrls`
   */
  private extractFirstUrl(data: any): string | null {
    let urls: string[] = [];

    const raw = data?.resultUrls ?? data?.response?.resultUrls;
    if (typeof raw === 'string') {
      try {
        urls = JSON.parse(raw);
      } catch {
        urls = [raw];
      }
    } else if (Array.isArray(raw)) {
      urls = raw;
    }

    return urls?.[0] ?? null;
  }
}
