import { AiCredentialService } from './ai-credential.service';
import { AiCredentialRepository } from './ai-credential.repository';
import { AiProviderTestService } from './ai-provider-test.service';
import { EncryptionService } from '@gitroom/nestjs-libraries/crypto/encryption.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

describe('AiCredentialService', () => {
  let service: AiCredentialService;
  let repository: MockProxy<AiCredentialRepository> & AiCredentialRepository;
  let encryption: MockProxy<EncryptionService> & EncryptionService;
  let testService: MockProxy<AiProviderTestService> & AiProviderTestService;

  beforeEach(() => {
    repository = createMock<AiCredentialRepository>();
    encryption = createMock<EncryptionService>();
    testService = createMock<AiProviderTestService>();
    service = new AiCredentialService(repository, encryption, testService);
  });

  describe('save', () => {
    it('deve encriptar a apiKey e delegar ao repository', async () => {
      encryption.encryptJson.mockReturnValue('cipher-base64');
      repository.upsert.mockResolvedValue({} as any);

      await service.save('org-1', 'WORKSPACE', 'TEXT', {
        provider: 'openrouter',
        model: 'openai/gpt-5.5',
        apiKey: 'sk-or-real',
        options: { temperature: 0.7 },
        shareDefault: true,
      });

      expect(encryption.encryptJson).toHaveBeenCalledWith({
        apiKey: 'sk-or-real',
      });
      expect(repository.upsert).toHaveBeenCalledWith(
        'org-1',
        'WORKSPACE',
        'TEXT',
        expect.objectContaining({
          provider: 'openrouter',
          model: 'openai/gpt-5.5',
          encryptedData: 'cipher-base64',
          shareDefault: true,
          options: { temperature: 0.7 },
        }),
        undefined
      );
    });

    it('deve preservar apiKey antiga quando enviada como SENTINEL', async () => {
      encryption.encryptJson.mockReturnValue('cipher-novo');
      // getRaw devolve a apiKey real existente
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        scope: 'WORKSPACE',
        kind: 'TEXT',
        profileId: null,
        provider: 'openrouter',
        model: 'openai/gpt-5.5',
        fallbackModel: null,
        encryptedData: 'cipher-antigo',
        options: null,
        shareDefault: true,
        lastTestStatus: null,
        lastUsedAt: null,
        keyVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      encryption.decryptJson.mockReturnValue({ apiKey: 'sk-or-antiga' });
      repository.upsert.mockResolvedValue({} as any);

      await service.save('org-1', 'WORKSPACE', 'TEXT', {
        provider: 'openrouter',
        apiKey: '__REDACTED__',
      });

      expect(encryption.encryptJson).toHaveBeenCalledWith({
        apiKey: 'sk-or-antiga',
      });
    });

    it('deve recusar SENTINEL quando nao existe credencial previa', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.save('org-1', 'WORKSPACE', 'TEXT', {
          provider: 'openrouter',
          apiKey: '__REDACTED__',
        })
      ).rejects.toThrow(HttpException);
    });

    it('deve exigir profileId em scope PROFILE', async () => {
      await expect(
        service.save('org-1', 'PROFILE', 'TEXT', {
          provider: 'openrouter',
          apiKey: 'sk',
        })
      ).rejects.toThrow(HttpException);
    });

    it('deve validar options pelo schema do kind', async () => {
      await expect(
        service.save('org-1', 'WORKSPACE', 'IMAGE', {
          provider: 'openrouter',
          apiKey: 'sk',
          // temperature nao existe em ImageOptions
          options: { temperature: 0.5 } as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('getRedacted', () => {
    it('deve retornar SENTINEL no apiKey e nao chamar decrypt', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        scope: 'WORKSPACE',
        kind: 'TEXT',
        profileId: null,
        provider: 'openrouter',
        model: 'openai/gpt-5.5',
        fallbackModel: null,
        encryptedData: 'cipher',
        options: { temperature: 0.7 },
        shareDefault: true,
        lastTestStatus: 'ok',
        lastUsedAt: null,
        keyVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date('2026-05-05T00:00:00Z'),
      } as any);

      const result = await service.getRedacted('org-1', 'WORKSPACE', 'TEXT');

      expect(result).toEqual(
        expect.objectContaining({
          apiKey: '__REDACTED__',
          provider: 'openrouter',
          model: 'openai/gpt-5.5',
          shareDefault: true,
          options: { temperature: 0.7 },
        })
      );
      expect(encryption.decryptJson).not.toHaveBeenCalled();
    });

    it('deve retornar null quando nao existe credencial', async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await service.getRedacted('org-1', 'WORKSPACE', 'TEXT');
      expect(result).toBeNull();
    });
  });

  describe('getRaw', () => {
    it('deve decriptar e expor a apiKey real', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        scope: 'WORKSPACE',
        kind: 'TEXT',
        profileId: null,
        provider: 'openrouter',
        model: null,
        fallbackModel: null,
        encryptedData: 'cipher',
        options: null,
        shareDefault: true,
      } as any);
      encryption.decryptJson.mockReturnValue({ apiKey: 'sk-or-real' });

      const result = await service.getRaw('org-1', 'WORKSPACE', 'TEXT');

      expect(result?.apiKey).toBe('sk-or-real');
      expect(encryption.decryptJson).toHaveBeenCalledWith('cipher');
    });
  });

  describe('test', () => {
    it('deve atualizar lastTestStatus=ok quando provider valida', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        scope: 'WORKSPACE',
        kind: 'TEXT',
        profileId: null,
        provider: 'openrouter',
        model: null,
        fallbackModel: null,
        encryptedData: 'cipher',
        options: null,
        shareDefault: true,
      } as any);
      encryption.decryptJson.mockReturnValue({ apiKey: 'sk' });
      testService.test.mockResolvedValue({ ok: true });
      repository.updateMeta.mockResolvedValue({} as any);

      const result = await service.test('org-1', 'WORKSPACE', 'TEXT');

      expect(testService.test).toHaveBeenCalledWith('openrouter', 'sk');
      expect(repository.updateMeta).toHaveBeenCalledWith('cred-1', {
        lastTestStatus: 'ok',
      });
      expect(result).toEqual({ ok: true });
    });

    it('deve atualizar lastTestStatus=failed quando provider rejeita', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        scope: 'WORKSPACE',
        kind: 'TEXT',
        profileId: null,
        provider: 'openrouter',
        model: null,
        fallbackModel: null,
        encryptedData: 'cipher',
        options: null,
        shareDefault: true,
      } as any);
      encryption.decryptJson.mockReturnValue({ apiKey: 'sk' });
      testService.test.mockResolvedValue({ ok: false, error: '401' });
      repository.updateMeta.mockResolvedValue({} as any);

      const result = await service.test('org-1', 'WORKSPACE', 'TEXT');

      expect(repository.updateMeta).toHaveBeenCalledWith('cred-1', {
        lastTestStatus: 'failed',
      });
      expect(result).toEqual({ ok: false, error: '401' });
    });

    it('deve retornar erro descritivo quando credencial nao existe', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.test('org-1', 'WORKSPACE', 'TEXT');

      expect(result.ok).toBe(false);
      expect(testService.test).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve delegar ao repository', async () => {
      repository.delete.mockResolvedValue({ count: 1 } as any);
      await service.delete('org-1', 'WORKSPACE', 'TEXT');
      expect(repository.delete).toHaveBeenCalledWith(
        'org-1',
        'WORKSPACE',
        'TEXT',
        undefined
      );
    });
  });

  describe('markUsed', () => {
    it('deve atualizar lastUsedAt sem propagar erros', async () => {
      repository.updateMeta.mockResolvedValue({} as any);
      await expect(service.markUsed('cred-1')).resolves.toBeUndefined();
      expect(repository.updateMeta).toHaveBeenCalledWith(
        'cred-1',
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        })
      );
    });
  });
});
