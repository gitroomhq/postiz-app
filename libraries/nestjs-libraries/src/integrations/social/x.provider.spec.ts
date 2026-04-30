import { XProvider } from './x.provider';

/**
 * Testes do XProvider focados em duas areas problematicas:
 *
 * 1. handleErrors — precisa reconhecer mensagens reais devolvidas pela API do
 *    X (v1.1 e v2) para nao deixar tudo cair no generico "Unknown Error".
 *    Cada padrao corresponde a um erro observado em producao.
 *
 * 2. payload de tweet (built object) — campos opcionais como made_with_ai e
 *    paid_partnership so devem ser enviados quando true, para evitar rejeicao
 *    em contas sem o feature habilitado.
 */
describe('XProvider', () => {
  let provider: XProvider;

  beforeEach(() => {
    provider = new XProvider();
  });

  describe('handleErrors', () => {
    it('reconhece "Tweet text is too long" (X v1.1)', () => {
      const body = JSON.stringify({
        errors: [{ code: 186, message: 'Tweet text is too long' }],
      });

      const result = provider.handleErrors(body);

      expect(result).toBeDefined();
      expect(result?.type).toBe('bad-body');
      expect(result?.value).toMatch(/limite de caracteres|too long|excedeu/i);
    });

    it('reconhece detail "Tweet text is too long" no schema v2', () => {
      const body = JSON.stringify({
        title: 'Invalid Request',
        detail:
          'One or more parameters to your request was invalid: Tweet text is too long.',
        type: 'https://api.twitter.com/2/problems/invalid-request',
      });

      const result = provider.handleErrors(body);

      expect(result).toBeDefined();
      expect(result?.type).toBe('bad-body');
    });

    it('reconhece "exceeds the maximum number of characters"', () => {
      const body = JSON.stringify({
        detail: 'Your Tweet exceeds the maximum number of characters.',
      });

      const result = provider.handleErrors(body);

      expect(result).toBeDefined();
      expect(result?.type).toBe('bad-body');
    });

    it('mantem deteccao de Unsupported Authentication como refresh-token', () => {
      const body = JSON.stringify({
        errors: [{ message: 'Unsupported Authentication' }],
      });

      const result = provider.handleErrors(body);

      expect(result?.type).toBe('refresh-token');
    });

    it('mantem deteccao de CreditsDepleted', () => {
      const body = JSON.stringify({
        type: 'https://api.twitter.com/2/problems/credits',
        title: 'CreditsDepleted',
      });

      const result = provider.handleErrors(body);

      expect(result?.type).toBe('bad-body');
      expect(result?.value).toMatch(/creditos da API/i);
    });

    it('mantem deteccao de duplicate-rules', () => {
      const body = JSON.stringify({
        type: 'https://api.twitter.com/2/problems/duplicate-rules',
      });

      const result = provider.handleErrors(body);

      expect(result?.type).toBe('bad-body');
      expect(result?.value).toMatch(/already posted/i);
    });

    it('reconhece erro de paid_partnership nao autorizado', () => {
      const body = JSON.stringify({
        title: 'Forbidden',
        detail: 'You are not allowed to use paid_partnership.',
      });

      const result = provider.handleErrors(body);

      expect(result).toBeDefined();
      expect(result?.type).toBe('bad-body');
      expect(result?.value).toMatch(/parceria paga|paid partnership/i);
    });

    it('retorna undefined para corpo desconhecido', () => {
      const body = JSON.stringify({ random: 'thing' });

      const result = provider.handleErrors(body);

      expect(result).toBeUndefined();
    });
  });

  describe('buildTweetPayload', () => {
    it('omite made_with_ai quando false', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: { made_with_ai: false, paid_partnership: false },
      });

      expect(payload).not.toHaveProperty('made_with_ai');
      expect(payload).not.toHaveProperty('paid_partnership');
    });

    it('inclui made_with_ai quando true', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: { made_with_ai: true, paid_partnership: false },
      });

      expect(payload.made_with_ai).toBe(true);
      expect(payload).not.toHaveProperty('paid_partnership');
    });

    it('inclui paid_partnership quando true', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: { made_with_ai: false, paid_partnership: true },
      });

      expect(payload.paid_partnership).toBe(true);
    });

    it('inclui media quando media_ids tem itens', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: ['m1', 'm2'],
        settings: {},
      });

      expect(payload.media).toEqual({ media_ids: ['m1', 'm2'] });
    });

    it('omite media quando lista vazia', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: {},
      });

      expect(payload).not.toHaveProperty('media');
    });

    it('inclui reply_settings quando diferente de everyone', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: { who_can_reply_post: 'following' },
      });

      expect(payload.reply_settings).toBe('following');
    });

    it('omite reply_settings quando everyone', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: { who_can_reply_post: 'everyone' },
      });

      expect(payload).not.toHaveProperty('reply_settings');
    });

    it('extrai community_id do final da URL', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: {
          community: 'https://x.com/i/communities/1493446837214187523',
        },
      });

      expect(payload.community_id).toBe('1493446837214187523');
      expect(payload.share_with_followers).toBe(true);
    });

    it('inclui reply.in_reply_to_tweet_id quando informado', () => {
      const payload = provider.buildTweetPayload({
        text: 'hello',
        media_ids: [],
        settings: {},
        replyToId: '1234567890',
      });

      expect(payload.reply).toEqual({ in_reply_to_tweet_id: '1234567890' });
    });
  });
});
