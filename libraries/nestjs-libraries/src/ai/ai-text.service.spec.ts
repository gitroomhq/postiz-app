import { AiTextService } from './ai-text.service';
import { AiClientFactory, TextClientResult } from './ai-client.factory';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';

const generateTextMock = jest.fn();
const generateObjectMock = jest.fn();

jest.mock('ai', () => ({
  generateText: (...args: any[]) => generateTextMock(...args),
  generateObject: (...args: any[]) => generateObjectMock(...args),
}));

const buildClient = (overrides: Partial<TextClientResult> = {}): TextClientResult => ({
  provider: 'openrouter',
  model: { id: 'gpt-5.5' } as any,
  modelId: 'openai/gpt-5.5',
  fallbackModel: null,
  fallbackModelId: null,
  options: { temperature: 0.7 },
  credentialId: 'cred-1',
  ...overrides,
});

describe('AiTextService', () => {
  let service: AiTextService;
  let factory: MockProxy<AiClientFactory> & AiClientFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = createMock<AiClientFactory>();
    service = new AiTextService(factory);
  });

  describe('caption', () => {
    it('deve gerar legenda nova chamando generateText com prompt de geracao', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'Nova legenda gerada' });

      const result = await service.caption(
        'org-1',
        'generate',
        'Sobre lancamento de tenis'
      );

      expect(result).toEqual({ text: 'Nova legenda gerada' });
      expect(generateTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('gera legendas'),
          prompt: expect.stringContaining('Conteudo de referencia'),
        })
      );
    });

    it('deve melhorar legenda existente com prompt diferente', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'Legenda melhorada' });

      const result = await service.caption(
        'org-1',
        'improve',
        'minha legenda original'
      );

      expect(result.text).toBe('Legenda melhorada');
      expect(generateTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('melhora legendas'),
          prompt: expect.stringContaining('Legenda original'),
        })
      );
    });

    it('deve truncar input em 8000 caracteres', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'ok' });

      const longInput = 'a'.repeat(15000);
      await service.caption('org-1', 'improve', longInput);

      const callArg = generateTextMock.mock.calls[0][0];
      // O prompt inclui prefixo "Legenda original:\n", entao truncado + prefixo
      expect(callArg.prompt.length).toBeLessThanOrEqual(
        8000 + 'Legenda original:\n'.length
      );
    });

    it('deve incluir platform e tone no system quando fornecidos', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'ok' });

      await service.caption(
        'org-1',
        'generate',
        'conteudo',
        { platform: 'X (Twitter)', tone: 'descontraido' }
      );

      const callArg = generateTextMock.mock.calls[0][0];
      expect(callArg.system).toContain('X (Twitter)');
      expect(callArg.system).toContain('descontraido');
    });

    it('deve aplicar default de tamanho/hashtags/emojis quando NAO ha persona', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'ok' });

      await service.caption('org-1', 'generate', 'conteudo');

      const callArg = generateTextMock.mock.calls[0][0];
      expect(callArg.system).toContain('Estilo padrao');
      expect(callArg.system).toContain('sem hashtags');
    });

    it('deve dar prioridade explicita a persona e omitir default de estilo quando ha persona', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'ok' });

      await service.caption(
        'org-1',
        'generate',
        'conteudo',
        {
          personaBlock:
            '=== PROFILE PERSONA ===\nWriting instructions: Crie 5 hashtags ao final.\n=== END PROFILE PERSONA ===',
        }
      );

      const callArg = generateTextMock.mock.calls[0][0];
      // Persona injetada
      expect(callArg.system).toContain('Crie 5 hashtags');
      // Marker de prioridade presente
      expect(callArg.system).toContain('PRIORIDADE absoluta');
      // Default de estilo NAO foi adicionado (senao briga com a persona)
      expect(callArg.system).not.toContain('Estilo padrao');
      // Restricao "sem hashtags" do default NAO deve aparecer
      expect(callArg.system).not.toMatch(/Estilo padrao.*sem hashtags/i);
    });

    it('deve incluir regras de formatacao com \\n e \\n\\n para o editor', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateTextMock.mockResolvedValue({ text: 'ok' });

      await service.caption('org-1', 'generate', 'conteudo');

      const callArg = generateTextMock.mock.calls[0][0];
      expect(callArg.system).toContain('LINHA EM BRANCO');
      expect(callArg.system).toContain('DOIS');
      expect(callArg.system).toContain('UM');
    });
  });

  describe('generatePosts', () => {
    it('deve combinar tweets e threads em um array embaralhado', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateObjectMock
        .mockResolvedValueOnce({
          object: {
            tweets: [
              { post: 'tweet 1' },
              { post: 'tweet 2' },
              { post: 'tweet 3' },
              { post: 'tweet 4' },
              { post: 'tweet 5' },
            ],
          },
        })
        .mockResolvedValueOnce({
          object: {
            threads: [
              { posts: [{ post: 't1a' }, { post: 't1b' }] },
              { posts: [{ post: 't2a' }, { post: 't2b' }] },
              { posts: [{ post: 't3a' }, { post: 't3b' }] },
              { posts: [{ post: 't4a' }, { post: 't4b' }] },
              { posts: [{ post: 't5a' }, { post: 't5b' }] },
            ],
          },
        });

      const result = await service.generatePosts('org-1', 'tema');

      expect(result).toHaveLength(10);
      // Cada item e um array de {post: string}
      expect(result.every((group) => Array.isArray(group))).toBe(true);
      expect(result.every((group) => group.length >= 1)).toBe(true);
    });
  });

  describe('separatePosts', () => {
    it('deve retornar posts dentro do limite sem chamada extra', async () => {
      factory.text.mockResolvedValue(buildClient());
      generateObjectMock.mockResolvedValueOnce({
        object: { posts: ['curto 1', 'curto 2'] },
      });

      const result = await service.separatePosts(
        'org-1',
        'texto longo qualquer',
        280
      );

      expect(result).toEqual({ posts: ['curto 1', 'curto 2'] });
      expect(generateObjectMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('callWithFallback', () => {
    it('deve cair pro fallbackModel quando o principal falhar', async () => {
      const principal = { id: 'gpt-5.5' } as any;
      const fallback = { id: 'gpt-4.1' } as any;
      factory.text.mockResolvedValue(
        buildClient({ model: principal, fallbackModel: fallback })
      );
      generateTextMock
        .mockRejectedValueOnce(new Error('rate limit'))
        .mockResolvedValueOnce({ text: 'fallback ok' });

      const result = await service.caption('org-1', 'generate', 'tema');

      expect(result.text).toBe('fallback ok');
      expect(generateTextMock).toHaveBeenCalledTimes(2);
      expect(generateTextMock.mock.calls[0][0].model).toBe(principal);
      expect(generateTextMock.mock.calls[1][0].model).toBe(fallback);
    });

    it('deve relancar o erro original quando nao tem fallbackModel', async () => {
      factory.text.mockResolvedValue(buildClient());
      const err = new Error('rate limit');
      generateTextMock.mockRejectedValue(err);

      await expect(
        service.caption('org-1', 'generate', 'tema')
      ).rejects.toThrow('rate limit');
      expect(generateTextMock).toHaveBeenCalledTimes(1);
    });

    it('deve relancar erro do principal quando o fallback tambem falhar', async () => {
      factory.text.mockResolvedValue(
        buildClient({ fallbackModel: { id: 'gpt-4.1' } as any })
      );
      generateTextMock
        .mockRejectedValueOnce(new Error('principal failed'))
        .mockRejectedValueOnce(new Error('fallback failed'));

      await expect(
        service.caption('org-1', 'generate', 'tema')
      ).rejects.toThrow('principal failed');
    });
  });
});
