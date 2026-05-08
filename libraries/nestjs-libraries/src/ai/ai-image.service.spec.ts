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
    it('deve enviar modalities + image_config com aspect_ratio default 1:1', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          options: { imageSize: '2K' },
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
        aspect_ratio: '1:1',
        image_size: '2K',
      });
      expect(result.base64).toBe('AAA111ZZZ');
      expect(result.provider).toBe('openrouter');
    });

    it('deve enviar aspect_ratio 9:16 quando opts.aspectRatio = 9:16', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,X' } }] } }],
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', 'reel vertical', undefined, {
        aspectRatio: '9:16',
      });

      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.image_config.aspect_ratio).toBe('9:16');
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
    it('deve mapear aspect ratio para size correspondente em gpt-image-2', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-2',
          options: { quality: 'high' },
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

      const result = await service.generate('org-1', 'gato', undefined, {
        aspectRatio: '16:9',
      });

      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.model).toBe('gpt-image-2');
      expect(callBody.quality).toBe('high');
      expect(callBody.size).toBe('1536x1024'); // 16:9
      // gpt-image-* nao aceita response_format
      expect(callBody.response_format).toBeUndefined();
      expect(result.base64).toBe('OPENAI_BASE64_DATA');
      expect(result.provider).toBe('openai');
    });

    it('deve usar size 1024x1536 (vertical) quando aspectRatio = 9:16', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-1-mini',
        }) as any
      );
      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({ data: [{ b64_json: 'V' }] }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', 'x', undefined, {
        aspectRatio: '9:16',
      });

      const callBody = JSON.parse(((fetchSpy.mock.calls[0] as any)[1] as any).body);
      expect(callBody.model).toBe('gpt-image-1-mini');
      expect(callBody.size).toBe('1024x1536');
    });

    it('deve usar default model gpt-image-2 e size 1024x1024 quando nada configurado', async () => {
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
      expect(callBody.model).toBe('gpt-image-2');
      expect(callBody.size).toBe('1024x1024');
      expect(result.model).toBe('gpt-image-2');
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

  describe('I2I (Image-to-Image)', () => {
    it('deve lancar 400 quando mode=I2I sem referenceImageUrl', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);

      await expect(
        service.generate('org-1', 'transform', undefined, { mode: 'I2I' })
      ).rejects.toMatchObject({ status: 400 });
    });

    it('OpenRouter I2I deve enviar messages com text + image_url', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  images: [
                    { image_url: { url: 'data:image/png;base64,RESULT' } },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate(
        'org-1',
        'cyberpunk style',
        undefined,
        {
          mode: 'I2I',
          referenceImageUrl: 'https://example.com/cat.jpg',
          aspectRatio: '1:1',
        }
      );

      const [url, init] = fetchSpy.mock.calls[0] as any;
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      const body = JSON.parse(init.body);
      // messages[0].content e array com text + image_url
      expect(body.messages[0].role).toBe('user');
      expect(Array.isArray(body.messages[0].content)).toBe(true);
      expect(body.messages[0].content).toEqual([
        { type: 'text', text: 'cyberpunk style' },
        {
          type: 'image_url',
          image_url: { url: 'https://example.com/cat.jpg' },
        },
      ]);
      expect(body.modalities).toEqual(['image', 'text']);
      expect(body.image_config.aspect_ratio).toBe('1:1');
      expect(result.base64).toBe('RESULT');
    });

    it('OpenAI I2I deve postar FormData para /v1/images/edits SEM quality', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-2',
          // Quality configurado em Settings — DEVE ser ignorado em I2I
          // porque /v1/images/edits nao aceita o parametro.
          options: { quality: 'high' },
        }) as any
      );

      // 1a chamada: download da imagem de referencia
      // 2a chamada: POST /v1/images/edits
      let callIdx = 0;
      const fetchSpy = jest.fn(async () => {
        callIdx++;
        if (callIdx === 1) {
          // Download da reference: retorna PNG bytes
          return new Response(new Uint8Array([137, 80, 78, 71]), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          });
        }
        // POST edits
        return new Response(
          JSON.stringify({ data: [{ b64_json: 'EDITED' }] }),
          { status: 200 }
        );
      });
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate(
        'org-1',
        'restyle as cyberpunk',
        undefined,
        {
          mode: 'I2I',
          referenceImageUrl: 'https://example.com/ref.png',
          aspectRatio: '9:16',
        }
      );

      // 1a chamada: GET ref image
      const [downloadUrl] = fetchSpy.mock.calls[0] as any;
      expect(downloadUrl).toBe('https://example.com/ref.png');

      // 2a chamada: POST /v1/images/edits com FormData
      const [editUrl, editInit] = fetchSpy.mock.calls[1] as any;
      expect(editUrl).toBe('https://api.openai.com/v1/images/edits');
      expect(editInit.method).toBe('POST');
      expect(editInit.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer sk-or-real',
        })
      );
      // Body e FormData (nao JSON) — multipart implicito
      expect(editInit.body).toBeInstanceOf(FormData);
      const fd = editInit.body as FormData;
      expect(fd.get('model')).toBe('gpt-image-2');
      expect(fd.get('prompt')).toBe('restyle as cyberpunk');
      expect(fd.get('size')).toBe('1024x1536');
      expect(fd.get('n')).toBe('1');
      expect(fd.get('image')).toBeDefined();
      // CRITICAL: quality NAO deve estar no FormData (OpenAI rejeita)
      expect(fd.get('quality')).toBeNull();

      expect(result.base64).toBe('EDITED');
      expect(result.provider).toBe('openai');
    });

    it('OpenAI I2I deve lancar 502 quando download da reference falha', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-2',
        }) as any
      );
      globalThis.fetch = jest.fn(async () =>
        new Response('not found', { status: 404 })
      ) as any;

      await expect(
        service.generate('org-1', 'x', undefined, {
          mode: 'I2I',
          referenceImageUrl: 'https://example.com/missing.png',
        })
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  describe('mensagens de erro (OpenAI / OpenRouter)', () => {
    it('deve propagar mensagem do OpenAI quando 400 (T2I)', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          provider: 'openai',
          model: 'gpt-image-2',
        }) as any
      );
      globalThis.fetch = jest.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "Unknown parameter: 'quality'.",
              type: 'invalid_request_error',
              param: 'quality',
              code: 'unknown_parameter',
            },
          }),
          { status: 400 }
        )
      ) as any;

      try {
        await service.generate('org-1', 'gato', undefined, {
          aspectRatio: '1:1',
        });
        fail('deveria ter lancado');
      } catch (e: any) {
        expect(e.status).toBe(502);
        const msg = e.response?.message ?? e.message;
        expect(msg).toContain('OpenAI recusou');
        expect(msg).toContain('HTTP 400');
        expect(msg).toContain("Unknown parameter: 'quality'");
      }
    });

    it('deve propagar mensagem do OpenRouter quando 400 (T2I)', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      globalThis.fetch = jest.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              message: 'Invalid model parameter.',
              code: 400,
            },
          }),
          { status: 400 }
        )
      ) as any;

      try {
        await service.generate('org-1', 'gato');
        fail('deveria ter lancado');
      } catch (e: any) {
        expect(e.status).toBe(502);
        const msg = e.response?.message ?? e.message;
        expect(msg).toContain('OpenRouter recusou');
        expect(msg).toContain('Invalid model parameter');
      }
    });
  });
});
