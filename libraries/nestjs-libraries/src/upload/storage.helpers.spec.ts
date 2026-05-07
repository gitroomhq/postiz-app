import { loadFromUrlOrDataUrl } from './storage.helpers';

describe('loadFromUrlOrDataUrl', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('data URLs', () => {
    it('decodifica data URL base64 sem chamar fetch', async () => {
      const fetchSpy = jest.fn();
      globalThis.fetch = fetchSpy as any;
      // "Hello" em base64
      const dataUrl = 'data:image/png;base64,SGVsbG8=';

      const result = await loadFromUrlOrDataUrl(dataUrl);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.buffer.toString('utf8')).toBe('Hello');
      expect(result.contentType).toBe('image/png');
      expect(result.extension).toBe('png');
    });

    it('extrai extensao mesmo em mime composto (image/svg+xml)', async () => {
      const dataUrl = 'data:image/svg+xml;base64,PHN2Zy8+';

      const result = await loadFromUrlOrDataUrl(dataUrl);

      expect(result.contentType).toBe('image/svg+xml');
      expect(result.extension).toBe('svg');
    });

    it('lanca erro em data URL invalida', async () => {
      await expect(
        loadFromUrlOrDataUrl('data:malformed')
      ).rejects.toThrow('data URL invalida');
    });
  });

  describe('URLs HTTP', () => {
    it('faz fetch normalmente quando nao e data URL', async () => {
      const fetchSpy = jest.fn(async () =>
        new Response(Buffer.from([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      );
      globalThis.fetch = fetchSpy as any;

      const result = await loadFromUrlOrDataUrl('https://example.com/foo.jpg');

      expect(fetchSpy).toHaveBeenCalledWith('https://example.com/foo.jpg');
      expect(result.contentType).toBe('image/jpeg');
      expect(result.extension).toBe('jpeg');
      expect(result.buffer.length).toBe(3);
    });

    it('extrai extensao do content-type webp', async () => {
      const fetchSpy = jest.fn(async () =>
        new Response(Buffer.from([0]), {
          status: 200,
          headers: { 'content-type': 'image/webp' },
        })
      );
      globalThis.fetch = fetchSpy as any;

      const result = await loadFromUrlOrDataUrl(
        'https://cdn.example.com/path/foo.webp?v=2'
      );

      expect(result.contentType).toBe('image/webp');
      expect(result.extension).toBe('webp');
    });
  });
});
