import { AiCatalogService } from './ai-catalog.service';

const redisStore = new Map<string, string>();

jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    keys: jest.fn(async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Array.from(redisStore.keys()).filter((k) => k.startsWith(prefix));
    }),
    del: jest.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (redisStore.delete(key)) count++;
      }
      return count;
    }),
  },
}));

describe('AiCatalogService', () => {
  let service: AiCatalogService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    redisStore.clear();
    service = new AiCatalogService();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getCatalog (static providers)', () => {
    it('deve devolver catalogo estatico do OpenAI para TEXT', async () => {
      const result = await service.getCatalog('openai', 'TEXT');
      expect(result.provider).toBe('openai');
      expect(result.kind).toBe('TEXT');
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.models[0].provider).toBe('openai');
    });

    it('deve devolver catalogo Tavily para WEB_SEARCH', async () => {
      const result = await service.getCatalog('tavily', 'WEB_SEARCH');
      expect(result.models[0].id).toBe('tavily-default');
    });

    it('NAO deve cachear catalogos estaticos (lista in-memory ja e barata)', async () => {
      await service.getCatalog('openai', 'TEXT');
      const cached = redisStore.get('ai:catalog:openai:TEXT');
      // Static catalog bypassa Redis para que mudancas em ai-catalog.static.ts
      // refletem na UI imediatamente, sem TTL de 1h pendurado.
      expect(cached).toBeUndefined();
    });

    it('deve sempre devolver lista atual em chamadas subsequentes (sem cache stale)', async () => {
      // Mesmo se houver cache antigo do Redis (ex: deploy anterior), o
      // servico ignora e devolve a lista atual de getStaticCatalog.
      redisStore.set(
        'ai:catalog:openai:TEXT',
        JSON.stringify({
          provider: 'openai',
          kind: 'TEXT',
          fetchedAt: new Date().toISOString(),
          models: [],
        })
      );

      const result = await service.getCatalog('openai', 'TEXT');
      // Lista atual de OPENAI_TEXT em ai-catalog.static.ts tem >0 modelos.
      expect(result.models.length).toBeGreaterThan(0);
    });
  });

  describe('getCatalog (OpenRouter)', () => {
    it('deve mapear resposta da API para CatalogModel', async () => {
      globalThis.fetch = jest.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'openai/gpt-5.5',
                name: 'GPT-5.5',
                context_length: 200000,
                architecture: {
                  input_modalities: ['text', 'image'],
                  output_modalities: ['text'],
                },
                supported_parameters: ['temperature', 'tools'],
                pricing: { prompt: '0.000001', completion: '0.000003' },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      ) as any;

      const result = await service.getCatalog('openrouter', 'TEXT');

      expect(result.models).toHaveLength(1);
      expect(result.models[0]).toEqual(
        expect.objectContaining({
          id: 'openai/gpt-5.5',
          displayName: 'GPT-5.5',
          provider: 'openrouter',
          contextLength: 200000,
          inputModalities: ['text', 'image'],
          outputModalities: ['text'],
          supportedParameters: ['temperature', 'tools'],
          pricing: expect.objectContaining({
            promptUSDPerMillion: 1,
            completionUSDPerMillion: 3,
          }),
        })
      );
    });

    it('deve retornar lista vazia quando OpenRouter falha', async () => {
      globalThis.fetch = jest.fn(async () =>
        new Response('{}', { status: 500 })
      ) as any;

      const result = await service.getCatalog('openrouter', 'TEXT');
      expect(result.models).toHaveLength(0);
    });
  });

  describe('refresh', () => {
    it('deve limpar todas as keys ai:catalog:*', async () => {
      redisStore.set('ai:catalog:openai:TEXT', '{}');
      redisStore.set('ai:catalog:openrouter:IMAGE', '{}');
      redisStore.set('outra:key', 'preserve');

      const result = await service.refresh();

      expect(result.cleared).toBe(2);
      expect(redisStore.has('outra:key')).toBe(true);
      expect(redisStore.has('ai:catalog:openai:TEXT')).toBe(false);
    });
  });
});
