import { CredentialService } from './credential.service';
import { CredentialRepository } from './credential.repository';
import { EncryptionService } from '@gitroom/nestjs-libraries/crypto/encryption.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';

const SENTINEL = '__REDACTED__';

describe('CredentialService', () => {
  let service: CredentialService;
  let repository: MockProxy<CredentialRepository> & CredentialRepository;
  let encryption: MockProxy<EncryptionService> & EncryptionService;

  const buildExistingRecord = (data: Record<string, string>): any => ({
    id: 'rec-1',
    organizationId: 'org-1',
    provider: 'facebook',
    profileId: null,
    encryptedData: JSON.stringify(data),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    repository = createMock<CredentialRepository>();
    encryption = createMock<EncryptionService>();

    encryption.encryptJson.mockImplementation((obj) => JSON.stringify(obj));
    encryption.decryptJson.mockImplementation(
      (s: string) => JSON.parse(s) as Record<string, any>
    );

    service = new CredentialService(repository, encryption);
  });

  describe('save', () => {
    it('preserva campos existentes que nao vieram no body parcial (regressao do bug de wipe de messaging tokens)', async () => {
      const existingPayload = {
        clientId: 'app-id',
        clientSecret: 'app-secret',
        metaSystemUserToken: 'EAA-system',
        metaSystemUserTokenInfo: '{"businessId":"biz1"}',
        instagramTokens: '[{"igUserId":"123"}]',
      };
      repository.findByProvider.mockResolvedValue(
        buildExistingRecord(existingPayload) as any
      );

      // PATCH parcial vindo de meta-credentials.component.tsx (so 7 campos do app)
      await service.save('org-1', 'facebook', {
        clientId: 'new-app-id',
        clientSecret: SENTINEL,
        instagramAppId: 'ig-app',
        instagramAppSecret: 'ig-secret',
        webhookVerifyToken: 'multipost',
        threadsAppId: '',
        threadsAppSecret: '',
      });

      expect(encryption.encryptJson).toHaveBeenCalledTimes(1);
      const merged = encryption.encryptJson.mock.calls[0][0];

      // Os campos de messaging NAO podem ser perdidos
      expect(merged.metaSystemUserToken).toBe('EAA-system');
      expect(merged.metaSystemUserTokenInfo).toBe('{"businessId":"biz1"}');
      expect(merged.instagramTokens).toBe('[{"igUserId":"123"}]');

      // Os campos enviados sao aplicados normalmente
      expect(merged.clientId).toBe('new-app-id');
      expect(merged.clientSecret).toBe('app-secret'); // SENTINEL -> existing
      expect(merged.instagramAppId).toBe('ig-app');
      expect(merged.webhookVerifyToken).toBe('multipost');

      expect(repository.upsert).toHaveBeenCalledWith(
        'org-1',
        'facebook',
        expect.any(String),
        undefined
      );
    });

    it('SENTINEL preserva o valor existente do campo', async () => {
      repository.findByProvider.mockResolvedValue(
        buildExistingRecord({ clientId: 'kept', clientSecret: 'also-kept' }) as any
      );

      await service.save('org-1', 'facebook', {
        clientId: SENTINEL,
        clientSecret: 'updated',
      });

      const merged = encryption.encryptJson.mock.calls[0][0];
      expect(merged.clientId).toBe('kept');
      expect(merged.clientSecret).toBe('updated');
    });

    it('string vazia limpa o campo mas mantem a row se outro campo continua preenchido', async () => {
      repository.findByProvider.mockResolvedValue(
        buildExistingRecord({
          clientId: 'A',
          clientSecret: 'B',
          metaSystemUserToken: 'TOK',
        }) as any
      );

      await service.save('org-1', 'facebook', {
        clientId: '',
        clientSecret: SENTINEL,
      });

      const merged = encryption.encryptJson.mock.calls[0][0];
      expect(merged.clientId).toBe('');
      expect(merged.clientSecret).toBe('B');
      expect(merged.metaSystemUserToken).toBe('TOK');
      expect(repository.delete).not.toHaveBeenCalled();
      expect(repository.upsert).toHaveBeenCalled();
    });

    it('apaga a row quando todo o merged resulta vazio', async () => {
      repository.findByProvider.mockResolvedValue(
        buildExistingRecord({ clientId: 'A', clientSecret: 'B' }) as any
      );

      const result = await service.save('org-1', 'facebook', {
        clientId: '',
        clientSecret: '',
      });

      expect(repository.delete).toHaveBeenCalledWith(
        'org-1',
        'facebook',
        undefined
      );
      expect(repository.upsert).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('quando nao ha registro existente, salva os dados enviados sem perda', async () => {
      repository.findByProvider.mockResolvedValue(null);

      await service.save('org-1', 'twitter', {
        clientId: 'twitter-id',
        clientSecret: 'twitter-secret',
      });

      const merged = encryption.encryptJson.mock.calls[0][0];
      expect(merged).toEqual({
        clientId: 'twitter-id',
        clientSecret: 'twitter-secret',
      });
    });
  });

  describe('updateMessagingTokens', () => {
    it('atualiza apenas instagramTokens preservando clientId/clientSecret/system token', async () => {
      const existingPayload = {
        clientId: 'app-id',
        clientSecret: 'app-secret',
        instagramAppId: 'ig-app',
        metaSystemUserToken: 'EAA-system',
        metaSystemUserTokenValidatedAt: '2026-01-01T00:00:00.000Z',
        metaSystemUserTokenInfo: '{"businessId":"biz1"}',
        instagramTokens: '[]',
      };
      repository.findByProvider.mockResolvedValue(
        buildExistingRecord(existingPayload) as any
      );

      await service.updateMessagingTokens('org-1', undefined, {
        instagramTokens: [
          {
            igUserId: '999',
            username: 'foo',
            token: 'EAA-ig',
            refreshedAt: '2026-04-29T00:00:00.000Z',
          },
        ],
      });

      const merged = encryption.encryptJson.mock.calls[0][0];

      expect(merged.clientId).toBe('app-id');
      expect(merged.clientSecret).toBe('app-secret');
      expect(merged.instagramAppId).toBe('ig-app');
      expect(merged.metaSystemUserToken).toBe('EAA-system');
      expect(merged.metaSystemUserTokenValidatedAt).toBe(
        '2026-01-01T00:00:00.000Z'
      );
      expect(merged.metaSystemUserTokenInfo).toBe('{"businessId":"biz1"}');
      expect(merged.instagramTokens).toBe(
        JSON.stringify([
          {
            igUserId: '999',
            username: 'foo',
            token: 'EAA-ig',
            refreshedAt: '2026-04-29T00:00:00.000Z',
          },
        ])
      );
    });
  });
});
