import { AiProviderResolverService } from './ai-provider-resolver.service';
import { AiCredentialService } from './ai-credential.service';
import { ProfileService } from '@gitroom/nestjs-libraries/database/prisma/profiles/profile.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { MockProxy } from 'jest-mock-extended';
import { HttpException } from '@nestjs/common';

const mockResolved = (overrides: Record<string, any> = {}): Record<string, any> => ({
  id: 'cred-1',
  scope: 'WORKSPACE',
  kind: 'TEXT',
  profileId: null as string | null,
  provider: 'openrouter',
  model: 'openai/gpt-5.5',
  fallbackModel: null as string | null,
  apiKey: 'sk-or-real',
  options: null as Record<string, unknown> | null,
  shareDefault: true,
  ...overrides,
});

describe('AiProviderResolverService', () => {
  let service: AiProviderResolverService;
  let credentialService: MockProxy<AiCredentialService> & AiCredentialService;
  let profileService: MockProxy<ProfileService> & ProfileService;

  beforeEach(() => {
    credentialService = createMock<AiCredentialService>();
    profileService = createMock<ProfileService>();
    // markUsed roda em background — precisa retornar Promise pra .catch funcionar
    credentialService.markUsed.mockResolvedValue(undefined);
    // Default: profileService.getProfileById retorna null (perfil nao
    // achado). Cada teste sobrescreve quando precisa de isDefault=true/false.
    profileService.getProfileById.mockResolvedValue(null as any);
    service = new AiProviderResolverService(credentialService, profileService);
  });

  describe('cadeia de resolucao', () => {
    it('deve retornar credencial do perfil quando existe', async () => {
      profileService.getProfileById.mockResolvedValue({
        id: 'profile-1',
        isDefault: false,
      } as any);
      const profileCred = mockResolved({
        id: 'cred-profile',
        scope: 'PROFILE',
        profileId: 'profile-1',
      });
      credentialService.getRaw
        .mockResolvedValueOnce(profileCred as any) // PROFILE
        .mockResolvedValue(null);

      const result = await service.resolve('org-1', 'TEXT', 'profile-1');

      expect(result).toBe(profileCred);
      expect(credentialService.getRaw).toHaveBeenCalledWith(
        'org-1',
        'PROFILE',
        'TEXT',
        'profile-1'
      );
      expect(credentialService.markUsed).toHaveBeenCalledWith('cred-profile');
    });

    it('deve usar workspace direto quando profileId e do perfil default (mesmo sem shareDefault)', async () => {
      // Caso real: admin no perfil default da agencia clicou AI Image.
      // O backend recebe profileId=default-id mas a config foi salva como
      // scope=WORKSPACE com shareDefault=false (admin nao quer
      // compartilhar com clientes). O resolver deve detectar via
      // ProfileService que e o default e tratar como WORKSPACE direto,
      // sem aplicar a regra de shareDefault.
      profileService.getProfileById.mockResolvedValue({
        id: 'default-id',
        isDefault: true,
      } as any);
      const wsCred = mockResolved({
        id: 'cred-ws',
        shareDefault: false, // <-- nao compartilha
      });
      credentialService.getRaw.mockResolvedValueOnce(wsCred as any);

      const result = await service.resolve('org-1', 'TEXT', 'default-id');

      expect(result).toBe(wsCred);
      // Nao deve ter consultado scope=PROFILE (porque e default)
      expect(credentialService.getRaw).toHaveBeenCalledTimes(1);
      expect(credentialService.getRaw).toHaveBeenCalledWith(
        'org-1',
        'WORKSPACE',
        'TEXT'
      );
    });

    it('deve cair pro workspace quando perfil secundario nao tem credencial', async () => {
      profileService.getProfileById.mockResolvedValue({
        id: 'profile-1',
        isDefault: false,
      } as any);
      const wsCred = mockResolved({
        id: 'cred-ws',
        shareDefault: true,
      });
      credentialService.getRaw
        .mockResolvedValueOnce(null) // PROFILE retorna null
        .mockResolvedValueOnce(wsCred as any); // WORKSPACE retorna valor

      const result = await service.resolve('org-1', 'TEXT', 'profile-1');

      expect(result).toBe(wsCred);
      expect(credentialService.markUsed).toHaveBeenCalledWith('cred-ws');
    });

    it('deve usar workspace direto quando profileId nao foi fornecido', async () => {
      const wsCred = mockResolved({ id: 'cred-ws' });
      credentialService.getRaw.mockResolvedValueOnce(wsCred as any);

      const result = await service.resolve('org-1', 'TEXT');

      expect(result).toBe(wsCred);
      // So uma chamada — direto pro WORKSPACE
      expect(credentialService.getRaw).toHaveBeenCalledTimes(1);
      expect(credentialService.getRaw).toHaveBeenCalledWith(
        'org-1',
        'WORKSPACE',
        'TEXT'
      );
    });

    it('deve negar workspace para perfil secundario quando shareDefault=false', async () => {
      profileService.getProfileById.mockResolvedValue({
        id: 'profile-1',
        isDefault: false,
      } as any);
      const wsCred = mockResolved({ shareDefault: false });
      credentialService.getRaw
        .mockResolvedValueOnce(null) // PROFILE
        .mockResolvedValueOnce(wsCred as any); // WORKSPACE com shareDefault=false

      await expect(
        service.resolve('org-1', 'TEXT', 'profile-1')
      ).rejects.toThrow(HttpException);
      expect(credentialService.markUsed).not.toHaveBeenCalled();
    });

    it('deve lancar HttpException 412 quando nada configurado', async () => {
      credentialService.getRaw.mockResolvedValue(null);

      try {
        await service.resolve('org-1', 'TEXT', 'profile-1');
        fail('Deveria ter lancado');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        // 412 Precondition Failed: usado em vez de 402 porque o frontend
        // intercepta 402 globalmente para abrir o modal de billing
        expect((e as HttpException).getStatus()).toBe(412);
      }
    });

    it('nao deve falhar quando markUsed der erro (background)', async () => {
      const wsCred = mockResolved();
      credentialService.getRaw.mockResolvedValueOnce(wsCred as any);
      credentialService.markUsed.mockRejectedValue(new Error('db down'));

      const result = await service.resolve('org-1', 'TEXT');

      expect(result).toBe(wsCred);
    });
  });
});
