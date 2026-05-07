import { AiVideoService } from './ai-video.service';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { AiTextService } from './ai-text.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

// Mock o timer pra polling nao bloquear o teste — resolve imediatamente.
jest.mock('@gitroom/helpers/utils/timer', () => ({
  timer: jest.fn(() => Promise.resolve()),
}));

const credentialFor = (
  overrides: Record<string, any> = {}
): Record<string, any> => ({
  id: 'cred-1',
  scope: 'WORKSPACE',
  kind: 'VIDEO',
  profileId: null,
  provider: 'kieai',
  model: 'bytedance/seedance-2',
  fallbackModel: null,
  apiKey: 'kie-real',
  options: {},
  shareDefault: true,
  ...overrides,
});

describe('AiVideoService', () => {
  let service: AiVideoService;
  let resolver: MockProxy<AiProviderResolverService> &
    AiProviderResolverService;
  let textService: MockProxy<AiTextService> & AiTextService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    resolver = createMock<AiProviderResolverService>();
    textService = createMock<AiTextService>();
    service = new AiVideoService(resolver, textService);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('generate (Seedance)', () => {
    it('deve enviar body T2V para /api/v1/jobs/createTask sem first_frame_url', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          options: {
            resolution: '720p',
            durationSeconds: 5,
            aspectRatioDefault: '16:9',
            audio: false,
          },
        }) as any
      );
      const fetchSpy = jest.fn();
      // 1. createTask retorna taskId
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-seed-1' } }),
          { status: 200 }
        )
      );
      // 2. recordInfo retorna successFlag=1 com URL
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/video.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', {
        prompt: 'a beach at sunset',
        mode: 'T2V',
        enrichPrompt: false,
      });

      expect(result.url).toBe('https://kie.ai/video.mp4');
      expect(result.model).toBe('bytedance/seedance-2');
      expect(result.taskId).toBe('task-seed-1');

      // Verifica body do createTask
      const [createUrl, createInit] = fetchSpy.mock.calls[0];
      expect(createUrl).toBe('https://api.kie.ai/api/v1/jobs/createTask');
      const body = JSON.parse(createInit.body);
      expect(body.model).toBe('bytedance/seedance-2');
      expect(body.input.prompt).toBe('a beach at sunset');
      expect(body.input.first_frame_url).toBeUndefined();
      expect(body.input.resolution).toBe('720p');
      expect(body.input.aspect_ratio).toBe('16:9');
      expect(body.input.duration).toBe(5);
      expect(body.input.generate_audio).toBe(false);
    });

    it('deve incluir first_frame_url quando mode=I2V', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-seed-2' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/v2.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', {
        prompt: 'animate this',
        mode: 'I2V',
        referenceImageUrl: 'https://images.example/foo.jpg',
        enrichPrompt: false,
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.input.first_frame_url).toBe(
        'https://images.example/foo.jpg'
      );
    });

    it('deve sobrescrever aspectRatioDefault da credencial com input.aspectRatio', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({
          options: { aspectRatioDefault: '16:9' },
        }) as any
      );
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-seed-3' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/v.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', {
        prompt: 'x',
        mode: 'T2V',
        aspectRatio: '9:16',
        enrichPrompt: false,
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.input.aspect_ratio).toBe('9:16');
    });
  });

  describe('generate (Veo)', () => {
    it('deve enviar body T2V para /api/v1/veo/generate com generationType TEXT_2_VIDEO', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ model: 'veo3' }) as any
      );
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-veo-1' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/veo.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', {
        prompt: 'a dog playing',
        mode: 'T2V',
        aspectRatio: '16:9',
        enrichPrompt: false,
      });

      expect(result.url).toBe('https://kie.ai/veo.mp4');
      expect(result.model).toBe('veo3');

      const [createUrl, createInit] = fetchSpy.mock.calls[0];
      expect(createUrl).toBe('https://api.kie.ai/api/v1/veo/generate');
      const body = JSON.parse(createInit.body);
      expect(body.prompt).toBe('a dog playing');
      expect(body.model).toBe('veo3');
      expect(body.aspect_ratio).toBe('16:9');
      expect(body.generationType).toBe('TEXT_2_VIDEO');
      expect(body.imageUrls).toBeUndefined();
    });

    it('deve enviar imageUrls e generationType FIRST_AND_LAST_FRAMES_2_VIDEO em modo I2V', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ model: 'veo3' }) as any
      );
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-veo-2' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/v.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', {
        prompt: 'animate',
        mode: 'I2V',
        referenceImageUrl: 'https://img.example/x.jpg',
        aspectRatio: '9:16',
        enrichPrompt: false,
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.generationType).toBe('FIRST_AND_LAST_FRAMES_2_VIDEO');
      expect(body.imageUrls).toEqual(['https://img.example/x.jpg']);
    });
  });

  describe('validacoes', () => {
    it('deve lancar 400 quando mode=I2V sem referenceImageUrl', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);

      await expect(
        service.generate('org-1', {
          prompt: 'x',
          mode: 'I2V',
          enrichPrompt: false,
        })
      ).rejects.toMatchObject({ status: 400 });
    });

    it('deve lancar 400 quando provider nao for kieai', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ provider: 'openai' }) as any
      );

      await expect(
        service.generate('org-1', {
          prompt: 'x',
          mode: 'T2V',
          enrichPrompt: false,
        })
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('polling', () => {
    it('deve retornar URL quando successFlag=1 apos varias polls', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      const fetchSpy = jest.fn();
      // createTask
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-poll' } }),
          { status: 200 }
        )
      );
      // poll #1: successFlag=0 (still generating)
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { successFlag: 0 } }),
          { status: 200 }
        )
      );
      // poll #2: successFlag=0
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { successFlag: 0 } }),
          { status: 200 }
        )
      );
      // poll #3: successFlag=1 com URL
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/done.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', {
        prompt: 'x',
        mode: 'T2V',
        enrichPrompt: false,
      });

      expect(result.url).toBe('https://kie.ai/done.mp4');
      expect(fetchSpy).toHaveBeenCalledTimes(4); // 1 create + 3 polls
    });

    it('deve lancar 502 quando successFlag=2 (failed)', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-fail' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: { successFlag: 2 },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await expect(
        service.generate('org-1', {
          prompt: 'x',
          mode: 'T2V',
          enrichPrompt: false,
        })
      ).rejects.toMatchObject({ status: 502 });
    });

    it('deve lancar 504 quando polling exceder limite de iteracoes', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      let callCount = 0;
      // Cada call cria uma Response nova (Response so pode ser consumida 1x)
      const fetchSpy = jest.fn(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          return new Response(
            JSON.stringify({ code: 200, data: { taskId: 'task-timeout' } }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({ code: 200, data: { successFlag: 0 } }),
          { status: 200 }
        );
      });
      globalThis.fetch = fetchSpy as any;

      await expect(
        service.generate('org-1', {
          prompt: 'x',
          mode: 'T2V',
          enrichPrompt: false,
        })
      ).rejects.toMatchObject({ status: 504 });
    });
  });

  describe('enrich prompt', () => {
    it('deve chamar generatePromptForVideo quando enrichPrompt=true (default)', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      textService.generatePromptForVideo.mockResolvedValue(
        'enriched cinematic prompt with camera moves'
      );
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-enrich' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/e.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await service.generate('org-1', {
        prompt: 'short prompt',
        mode: 'T2V',
        enrichPrompt: true,
      });

      expect(textService.generatePromptForVideo).toHaveBeenCalledWith(
        'org-1',
        'short prompt',
        undefined
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.input.prompt).toBe(
        'enriched cinematic prompt with camera moves'
      );
    });

    it('deve seguir com prompt original quando enrich falha com 412 (best-effort)', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      textService.generatePromptForVideo.mockRejectedValue(
        new HttpException('TEXT not configured', 412)
      );
      const fetchSpy = jest.fn();
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 200, data: { taskId: 'task-noenrich' } }),
          { status: 200 }
        )
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              successFlag: 1,
              resultUrls: JSON.stringify(['https://kie.ai/o.mp4']),
            },
          }),
          { status: 200 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      const result = await service.generate('org-1', {
        prompt: 'original prompt',
        mode: 'T2V',
        enrichPrompt: true,
      });

      expect(result.url).toBe('https://kie.ai/o.mp4');
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.input.prompt).toBe('original prompt');
    });
  });

  describe('seguranca', () => {
    it('deve sanitizar Bearer token em logs de erro', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ apiKey: 'kie-secret-deadbeef' }) as any
      );
      const warnSpy = jest.spyOn((service as any)._logger, 'warn');

      const fetchSpy = jest.fn(async () =>
        new Response(
          JSON.stringify({
            error: 'invalid Bearer kie-secret-deadbeef token',
          }),
          { status: 401 }
        )
      );
      globalThis.fetch = fetchSpy as any;

      await expect(
        service.generate('org-1', {
          prompt: 'x',
          mode: 'T2V',
          enrichPrompt: false,
        })
      ).rejects.toBeDefined();

      const allLogs = warnSpy.mock.calls.flat().join(' ');
      expect(allLogs).not.toContain('kie-secret-deadbeef');
      expect(allLogs).toContain('Bearer ***');
    });
  });
});
