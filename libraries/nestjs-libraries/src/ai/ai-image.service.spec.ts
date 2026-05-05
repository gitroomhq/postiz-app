import { AiImageService } from './ai-image.service';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

const credentialFor = (
  overrides: Record<string, any> = {}
): Record<string, any> => ({
  id: 'cred-1',
  scope: 'WORKSPACE',
  kind: 'IMAGE',
  profileId: null,
  provider: 'openrouter',
  model: 'google/gemini-3.1-flash-image-preview',
  fallbackModel: null,
  apiKey: 'sk-or-real',
  options: {},
  shareDefault: true,
  ...overrides,
});

describe('AiImageService', () => {
  let service: AiImageService;
  let resolver: MockProxy<AiProviderResolverService> &
    AiProviderResolverService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    resolver = createMock<AiProviderResolverService>();
    service = new AiImageService(resolver);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('generate (OpenRouter)', () => {
    it('deve enviar modalities + image_config e devolver base64 puro', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          options: { aspectRatioDefault: '16:9', imageSize: '2K' },
        }) as any
      );

      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  images: [
                    {
                      image_url: {
                        url: 'data:image/png;base64,AAA111ZZZ',
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', 'um gato bonito');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-or-real',
          }),
        })
      );
      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.modalities).toEqual(['image', 'text']);
      expect(callBody.image_config).toEqual({
        aspect_ratio: '16:9',
        image_size: '2K',
      });
      expect(result.base64).toBe('AAA111ZZZ');
      expect(result.provider).toBe('openrouter');
    });

    it('deve lancar 502 quando OpenRouter retorna erro HTTP', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      globalThis.fetch = jest.fn(async () =>
        new Response('upstream error', { status: 500 })
      ) as any;

      await expect(service.generate('org-1', 'x')).rejects.toThrow(
        HttpException
      );
    });

    it('deve lancar 502 quando resposta nao tem imagem', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      globalThis.fetch = jest.fn(async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'oops' } }] }),
          { status: 200 }
        )
      ) as any;

      await expect(service.generate('org-1', 'x')).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('generate (OpenAI direto)', () => {
    it('deve usar /v1/images/generations e devolver b64_json', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-1',
          options: {
            quality: 'high',
            aspectRatioDefault: '16:9',
          },
        }) as any
      );

      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({
            data: [{ b64_json: 'OPENAI_BASE64_DATA' }],
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', 'gato');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/images/generations',
        expect.any(Object)
      );
      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.model).toBe('gpt-image-1');
      expect(callBody.quality).toBe('high');
      expect(callBody.size).toBe('1536x1024'); // 16:9
      expect(callBody.response_format).toBe('b64_json');
      expect(result.base64).toBe('OPENAI_BASE64_DATA');
      expect(result.provider).toBe('openai');
    });

    it('deve usar default model e tamanho quadrado quando nada configurado', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: null,
          options: {},
        }) as any
      );
      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({ data: [{ b64_json: 'B' }] }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', 'x');

      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.model).toBe('gpt-image-1');
      expect(callBody.size).toBe('1024x1024');
      expect(result.model).toBe('gpt-image-1');
    });
  });

  describe('provider desconhecido', () => {
    it('deve lancar 400', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ provider: 'azure' }) as any
      );

      await expect(service.generate('org-1', 'x')).rejects.toThrow(
        HttpException
      );
    });
  });
});
