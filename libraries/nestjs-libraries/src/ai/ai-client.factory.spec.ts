import { AiClientFactory, isReasoningModel } from './ai-client.factory';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

const openrouterTextSpy = jest.fn(
  (id: string) => ({ kind: 'openrouter-text', id })
);
const openrouterImageSpy = jest.fn(
  (id: string) => ({ kind: 'openrouter-image', id })
);
const openaiTextSpy = jest.fn((id: string) => ({ kind: 'openai-text', id }));
const openaiImageSpy = jest.fn((id: string) => ({
  kind: 'openai-image',
  id,
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn(({ apiKey }: { apiKey: string }) => {
    const fn = (id: string) => openrouterTextSpy(id);
    (fn as any).imageModel = (id: string) => openrouterImageSpy(id);
    (fn as any)._apiKey = apiKey;
    return fn;
  }),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(({ apiKey }: { apiKey: string }) => {
    const fn = (id: string) => openaiTextSpy(id);
    (fn as any).imageModel = (id: string) => openaiImageSpy(id);
    (fn as any)._apiKey = apiKey;
    return fn;
  }),
}));

const credential = (overrides: Record<string, any> = {}): Record<string, any> => ({
  id: 'cred-1',
  scope: 'WORKSPACE',
  kind: 'TEXT',
  profileId: null as string | null,
  provider: 'openrouter',
  model: 'openai/gpt-5.5',
  fallbackModel: null as string | null,
  apiKey: 'sk-or-real',
  options: { temperature: 0.7 },
  shareDefault: true,
  ...overrides,
});

describe('AiClientFactory', () => {
  let factory: AiClientFactory;
  let resolver: MockProxy<AiProviderResolverService> &
    AiProviderResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = createMock<AiProviderResolverService>();
    factory = new AiClientFactory(resolver);
  });

  describe('text', () => {
    it('deve construir modelo OpenRouter com apiKey decriptada', async () => {
      resolver.resolve.mockResolvedValue(credential() as any);

      const result = await factory.text('org-1');

      expect(resolver.resolve).toHaveBeenCalledWith('org-1', 'TEXT', undefined);
      expect(openrouterTextSpy).toHaveBeenCalledWith('openai/gpt-5.5');
      expect(result.provider).toBe('openrouter');
      expect(result.options).toEqual({ temperature: 0.7 });
      expect(result.fallbackModel).toBeNull();
    });

    it('deve construir fallbackModel quando definido', async () => {
      resolver.resolve.mockResolvedValue(
        credential({
          model: 'openai/gpt-5.5',
          fallbackModel: 'openai/gpt-4.1',
        }) as any
      );

      const result = await factory.text('org-1');

      // Modelo principal + fallback usam a mesma factory
      expect(openrouterTextSpy).toHaveBeenCalledWith('openai/gpt-5.5');
      expect(openrouterTextSpy).toHaveBeenCalledWith('openai/gpt-4.1');
      expect(result.fallbackModel).not.toBeNull();
    });

    it('deve usar provider OpenAI direto quando configurado', async () => {
      resolver.resolve.mockResolvedValue(
        credential({ provider: 'openai', model: 'gpt-5.5' }) as any
      );

      const result = await factory.text('org-1');

      expect(openaiTextSpy).toHaveBeenCalledWith('gpt-5.5');
      expect(result.provider).toBe('openai');
    });

    it('deve usar default model quando credential.model e null', async () => {
      resolver.resolve.mockResolvedValue(
        credential({ model: null }) as any
      );

      await factory.text('org-1');

      expect(openrouterTextSpy).toHaveBeenCalledWith('openai/gpt-5.5');
    });

    it('deve recusar provider desconhecido', async () => {
      resolver.resolve.mockResolvedValue(
        credential({ provider: 'azure', model: 'gpt-x' }) as any
      );

      await expect(factory.text('org-1')).rejects.toThrow(HttpException);
    });
  });

  describe('image', () => {
    it('deve devolver provider OpenRouter chamado com modelId (sem imageModel)', async () => {
      // OpenRouter v1.2.0 do AI SDK nao expoe provider.imageModel; o factory
      // chama provider(modelId) direto. O caller (Bloco C) decidira como
      // disparar geracao via chat completions com modalities.
      resolver.resolve.mockResolvedValue(
        credential({
          kind: 'IMAGE',
          model: 'google/gemini-3.1-flash-image-preview',
        }) as any
      );

      const result = await factory.image('org-1');

      expect(openrouterTextSpy).toHaveBeenCalledWith(
        'google/gemini-3.1-flash-image-preview'
      );
      expect(result.provider).toBe('openrouter');
    });

    it('deve usar imageModel do provider OpenAI quando configurado', async () => {
      resolver.resolve.mockResolvedValue(
        credential({
          kind: 'IMAGE',
          provider: 'openai',
          model: 'gpt-image-2',
        }) as any
      );

      const result = await factory.image('org-1');

      expect(openaiImageSpy).toHaveBeenCalledWith('gpt-image-2');
      expect(result.provider).toBe('openai');
    });
  });

  describe('textForMastra', () => {
    it('deve retornar funcao async que resolve modelo lazy', async () => {
      resolver.resolve.mockResolvedValue(credential() as any);
      const lazy = factory.textForMastra('org-1');

      // Antes de chamar, resolver nao foi consultado
      expect(resolver.resolve).not.toHaveBeenCalled();

      const model = await lazy();
      expect(resolver.resolve).toHaveBeenCalledTimes(1);
      expect(model).toBeDefined();
    });
  });

  describe('isReasoningModel', () => {
    const cases: Array<{ id: string; expected: boolean; reason: string }> = [
      // Familia o1/o3/o4 com hifen
      { id: 'o1', expected: true, reason: 'exato' },
      { id: 'o1-mini', expected: true, reason: 'hifen' },
      { id: 'o3-pro', expected: true, reason: 'hifen' },
      { id: 'openai/o4-mini', expected: true, reason: 'prefixo openrouter + hifen' },
      // Familia gpt-5 — variantes com `.` (versao) E com `-` (codinome)
      { id: 'gpt-5', expected: true, reason: 'exato' },
      { id: 'gpt-5.4', expected: true, reason: 'ponto (versao OpenAI)' },
      { id: 'gpt-5.5', expected: true, reason: 'ponto (versao OpenAI)' },
      { id: 'gpt-5-codex', expected: true, reason: 'hifen (variante)' },
      { id: 'gpt-5-mini', expected: true, reason: 'hifen' },
      { id: 'openai/gpt-5.5', expected: true, reason: 'prefixo + ponto' },
      { id: 'openai/gpt-5-codex', expected: true, reason: 'prefixo + hifen' },
      // Modelos NAO-reasoning
      { id: 'gpt-4.1', expected: false, reason: 'gpt-4 nao e reasoning' },
      { id: 'gpt-4o', expected: false, reason: 'gpt-4 nao e reasoning' },
      { id: 'claude-3-5-sonnet', expected: false, reason: 'fora da familia' },
      { id: '', expected: false, reason: 'string vazia' },
      // Edge: prefixo correto mas sufixo invalido (ex: 'o15')
      { id: 'o15', expected: false, reason: 'sem separador apos o1' },
      { id: 'gpt-5x', expected: false, reason: 'sem separador apos gpt-5' },
    ];

    for (const { id, expected, reason } of cases) {
      it(`isReasoningModel('${id}') = ${expected} (${reason})`, () => {
        expect(isReasoningModel(id)).toBe(expected);
      });
    }
  });
});
