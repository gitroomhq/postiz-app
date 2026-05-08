import { Injectable, Logger } from '@nestjs/common';
import { AiKind } from '@prisma/client';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { getStaticCatalog } from './ai-catalog.static';
import {
  CatalogModel,
  CatalogResponse,
} from './ai-catalog.types';

const CACHE_TTL_SECONDS = 60 * 60; // 1h
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

const KIND_TO_OUTPUT_MODALITIES: Record<AiKind, string[]> = {
  TEXT: ['text'],
  IMAGE: ['image'],
  VIDEO: ['video'],
  WEB_SEARCH: [],
};

@Injectable()
export class AiCatalogService {
  private readonly _logger = new Logger(AiCatalogService.name);

  async getCatalog(
    provider: string,
    kind: AiKind
  ): Promise<CatalogResponse> {
    // Catalogos estaticos (kieai, tavily, openai) sao consts em memoria —
    // bypass do cache Redis. So OpenRouter passa pelo cache porque envolve
    // fetch externo de ~400 modelos. Sem este bypass, alterar a lista
    // estatica em codigo nao reflete na UI ate o TTL de 1h expirar.
    if (provider !== 'openrouter') {
      const models = getStaticCatalog(provider, kind) ?? [];
      return {
        provider,
        kind,
        fetchedAt: new Date().toISOString(),
        models,
      };
    }

    const cacheKey = this.cacheKey(provider, kind);
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const models = await this.fetchOpenRouter(kind);
    const response: CatalogResponse = {
      provider,
      kind,
      fetchedAt: new Date().toISOString(),
      models,
    };

    await this.writeCache(cacheKey, response);
    return response;
  }

  async refresh(): Promise<{ cleared: number }> {
    const pattern = 'ai:catalog:*';
    try {
      // ioredis exposes scanStream for SCAN. We use a simple keys() in mock.
      const keys = await this.scanKeys(pattern);
      if (keys.length === 0) return { cleared: 0 };
      const ioredisAny = ioRedis as any;
      if (typeof ioredisAny.del === 'function') {
        await ioredisAny.del(...keys);
      }
      return { cleared: keys.length };
    } catch (e) {
      this._logger.warn(
        `Falha ao limpar cache do catalogo: ${(e as Error).message}`
      );
      return { cleared: 0 };
    }
  }

  private cacheKey(provider: string, kind: AiKind) {
    return `ai:catalog:${provider}:${kind}`;
  }

  private async readCache(key: string): Promise<CatalogResponse | null> {
    try {
      const raw = await ioRedis.get(key);
      if (!raw) return null;
      return JSON.parse(typeof raw === 'string' ? raw : String(raw));
    } catch (e) {
      this._logger.warn(`Falha ao ler cache ${key}: ${(e as Error).message}`);
      return null;
    }
  }

  private async writeCache(key: string, payload: CatalogResponse) {
    try {
      const ioredisAny = ioRedis as any;
      const serialized = JSON.stringify(payload);
      if (typeof ioredisAny.setex === 'function') {
        await ioredisAny.setex(key, CACHE_TTL_SECONDS, serialized);
      } else {
        await ioRedis.set(key, serialized);
      }
    } catch (e) {
      this._logger.warn(`Falha ao escrever cache ${key}: ${(e as Error).message}`);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const ioredisAny = ioRedis as any;
    if (typeof ioredisAny.keys === 'function') {
      return ioredisAny.keys(pattern);
    }
    return [];
  }

  private async fetchOpenRouter(kind: AiKind): Promise<CatalogModel[]> {
    const modalities = KIND_TO_OUTPUT_MODALITIES[kind];
    if (modalities.length === 0) {
      // OpenRouter nao expoe Web Search; cai no estatico.
      return getStaticCatalog('openrouter', kind) ?? [];
    }
    const url = `${OPENROUTER_MODELS_URL}?output_modalities=${modalities.join(',')}`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch (e) {
      this._logger.warn(
        `OpenRouter /models indisponivel: ${(e as Error).message}`
      );
      return [];
    }

    if (!res.ok) {
      this._logger.warn(`OpenRouter /models retornou ${res.status}`);
      return [];
    }

    const json = (await res.json()) as { data?: any[] };
    const list = Array.isArray(json?.data) ? json.data : [];

    return list.map((item) => this.mapOpenRouterModel(item, kind));
  }

  private mapOpenRouterModel(raw: any, kind: AiKind): CatalogModel {
    const architecture = raw?.architecture ?? {};
    const pricing = raw?.pricing ?? {};
    const promptCost = parsePrice(pricing?.prompt);
    const completionCost = parsePrice(pricing?.completion);
    const imageCost = parsePrice(pricing?.image);

    return {
      id: raw?.id ?? '',
      displayName: raw?.name ?? raw?.id ?? '',
      provider: 'openrouter',
      kind,
      contextLength:
        typeof raw?.context_length === 'number'
          ? raw.context_length
          : undefined,
      inputModalities: Array.isArray(architecture?.input_modalities)
        ? architecture.input_modalities
        : undefined,
      outputModalities: Array.isArray(architecture?.output_modalities)
        ? architecture.output_modalities
        : undefined,
      supportedParameters: Array.isArray(raw?.supported_parameters)
        ? raw.supported_parameters
        : undefined,
      imageConfig: raw?.image_config
        ? {
            aspectRatios: raw.image_config?.aspect_ratios,
            sizes: raw.image_config?.image_sizes ?? raw.image_config?.sizes,
          }
        : undefined,
      pricing:
        promptCost !== undefined ||
        completionCost !== undefined ||
        imageCost !== undefined
          ? {
              promptUSDPerMillion: promptCost,
              completionUSDPerMillion: completionCost,
              imageUSDPerImage: imageCost,
            }
          : undefined,
    };
  }
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value * 1_000_000;
  if (typeof value === 'string' && value.length > 0) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num * 1_000_000;
  }
  return undefined;
}
