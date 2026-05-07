import { AiWebSearchService } from './ai-web-search.service';
import { AiProviderResolverService } from './ai-provider-resolver.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

const searchMock = jest.fn();
const extractMock = jest.fn();

jest.mock('@tavily/core', () => ({
  tavily: jest.fn(() => ({
    search: (...args: any[]) => searchMock(...args),
    extract: (...args: any[]) => extractMock(...args),
  })),
}));

const credentialFor = (overrides: Record<string, any> = {}): Record<string, any> => ({
  id: 'cred-1',
  scope: 'WORKSPACE',
  kind: 'WEB_SEARCH',
  profileId: null,
  provider: 'tavily',
  model: null,
  fallbackModel: null,
  apiKey: 'tvly-fake-key-123',
  options: {},
  shareDefault: true,
  ...overrides,
});

describe('AiWebSearchService', () => {
  let service: AiWebSearchService;
  let resolver: MockProxy<AiProviderResolverService> &
    AiProviderResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = createMock<AiProviderResolverService>();
    service = new AiWebSearchService(resolver);
  });

  describe('search', () => {
    it('deve usar searchDepth advanced por default', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      searchMock.mockResolvedValue({ results: [], answer: '' });

      await service.search('org-1', 'lancamento gpt-5.5');

      expect(searchMock).toHaveBeenCalledWith(
        'lancamento gpt-5.5',
        expect.objectContaining({ searchDepth: 'advanced' })
      );
    });

    it('deve aceitar override de searchDepth via opts', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      searchMock.mockResolvedValue({ results: [] });

      await service.search('org-1', 'q', undefined, {
        searchDepth: 'basic',
      });

      expect(searchMock).toHaveBeenCalledWith(
        'q',
        expect.objectContaining({ searchDepth: 'basic' })
      );
    });

    it('deve usar depth da credencial quando opts ausente', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ options: { depth: 'basic', maxResults: 10 } }) as any
      );
      searchMock.mockResolvedValue({ results: [] });

      await service.search('org-1', 'q');

      expect(searchMock).toHaveBeenCalledWith(
        'q',
        expect.objectContaining({ searchDepth: 'basic', maxResults: 10 })
      );
    });

    it('deve recusar provider que nao seja tavily', async () => {
      resolver.resolve.mockResolvedValue(
        credentialFor({ provider: 'firecrawl' }) as any
      );

      await expect(service.search('org-1', 'q')).rejects.toThrow(
        HttpException
      );
    });

    it('deve relancar HttpException 502 sanitizado quando Tavily falha', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      searchMock.mockRejectedValue(
        new Error('401 invalid Bearer tvly-secret-leak')
      );

      try {
        await service.search('org-1', 'q');
        fail('deveria ter lancado');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(502);
      }
    });
  });

  describe('extract', () => {
    it('deve usar extractDepth basic por default', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      extractMock.mockResolvedValue({ results: [], failedResults: [] });

      await service.extract('org-1', ['https://example.com/a']);

      expect(extractMock).toHaveBeenCalledWith(
        ['https://example.com/a'],
        expect.objectContaining({ extractDepth: 'basic', format: 'markdown' })
      );
    });

    it('deve recusar lista vazia', async () => {
      await expect(service.extract('org-1', [])).rejects.toThrow(HttpException);
    });

    it('deve recusar mais de 20 URLs', async () => {
      const urls = Array(21).fill('https://example.com/a');
      await expect(service.extract('org-1', urls)).rejects.toThrow(
        HttpException
      );
    });

    it('deve recusar URL com hostname privado (SSRF guard)', async () => {
      await expect(
        service.extract('org-1', ['http://localhost:8080/admin'])
      ).rejects.toThrow(HttpException);
      await expect(
        service.extract('org-1', ['http://192.168.1.1/'])
      ).rejects.toThrow(HttpException);
      await expect(
        service.extract('org-1', ['http://10.0.0.1/'])
      ).rejects.toThrow(HttpException);
      await expect(
        service.extract('org-1', ['http://169.254.169.254/'])
      ).rejects.toThrow(HttpException);
    });

    it('deve recusar protocolos nao-http(s)', async () => {
      await expect(
        service.extract('org-1', ['file:///etc/passwd'])
      ).rejects.toThrow(HttpException);
      await expect(
        service.extract('org-1', ['javascript:alert(1)'])
      ).rejects.toThrow(HttpException);
    });

    it('deve repassar partial failures do Tavily como result', async () => {
      resolver.resolve.mockResolvedValue(credentialFor() as any);
      extractMock.mockResolvedValue({
        results: [{ url: 'https://ok.com', rawContent: '# titulo' }],
        failedResults: [
          { url: 'https://fail.com', error: 'unreachable' },
        ],
      });

      const result = await service.extract('org-1', [
        'https://ok.com',
        'https://fail.com',
      ]);

      expect(result.results).toHaveLength(1);
      expect(result.failedResults).toHaveLength(1);
    });
  });
});
