import { AiCredentialRepository } from './ai-credential.repository';
import { createPrismaRepositoryMock } from '@gitroom/nestjs-libraries/test';

describe('AiCredentialRepository', () => {
  let repository: AiCredentialRepository;
  let prismaMock: ReturnType<
    typeof createPrismaRepositoryMock<'aiProviderCredential'>
  >;

  beforeEach(() => {
    prismaMock = createPrismaRepositoryMock('aiProviderCredential');
    repository = new AiCredentialRepository(prismaMock as any);
  });

  describe('findOne', () => {
    it('deve buscar workspace credential com profileId null', async () => {
      prismaMock.model.aiProviderCredential.findFirst.mockResolvedValue(null);

      await repository.findOne('org-1', 'WORKSPACE', 'TEXT');

      expect(
        prismaMock.model.aiProviderCredential.findFirst
      ).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          scope: 'WORKSPACE',
          kind: 'TEXT',
          profileId: null,
        },
      });
    });

    it('deve buscar profile credential filtrando pelo profileId fornecido', async () => {
      prismaMock.model.aiProviderCredential.findFirst.mockResolvedValue(null);

      await repository.findOne('org-1', 'PROFILE', 'IMAGE', 'profile-9');

      expect(
        prismaMock.model.aiProviderCredential.findFirst
      ).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          scope: 'PROFILE',
          kind: 'IMAGE',
          profileId: 'profile-9',
        },
      });
    });
  });

  describe('upsert', () => {
    it('deve criar nova credential quando nao existe', async () => {
      prismaMock.model.aiProviderCredential.findFirst.mockResolvedValue(null);
      prismaMock.model.aiProviderCredential.create.mockResolvedValue({
        id: 'new-1',
      } as any);

      const result = await repository.upsert('org-1', 'WORKSPACE', 'TEXT', {
        provider: 'openrouter',
        model: 'openai/gpt-5.5',
        encryptedData: 'cipher',
        shareDefault: true,
      });

      expect(prismaMock.model.aiProviderCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            scope: 'WORKSPACE',
            kind: 'TEXT',
            profileId: null,
            provider: 'openrouter',
            model: 'openai/gpt-5.5',
            encryptedData: 'cipher',
            shareDefault: true,
          }),
        })
      );
      expect(result).toEqual({ id: 'new-1' });
    });

    it('deve atualizar credential existente sem alterar id', async () => {
      prismaMock.model.aiProviderCredential.findFirst.mockResolvedValue({
        id: 'existing-1',
      } as any);
      prismaMock.model.aiProviderCredential.update.mockResolvedValue({
        id: 'existing-1',
      } as any);

      await repository.upsert('org-1', 'WORKSPACE', 'TEXT', {
        provider: 'openrouter',
        encryptedData: 'cipher-novo',
      });

      expect(prismaMock.model.aiProviderCredential.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-1' },
          data: expect.objectContaining({ encryptedData: 'cipher-novo' }),
        })
      );
      expect(prismaMock.model.aiProviderCredential.create).not.toHaveBeenCalled();
    });

    it('deve persistir profileId apenas em scope PROFILE', async () => {
      prismaMock.model.aiProviderCredential.findFirst.mockResolvedValue(null);
      prismaMock.model.aiProviderCredential.create.mockResolvedValue({} as any);

      await repository.upsert(
        'org-1',
        'PROFILE',
        'IMAGE',
        { provider: 'openrouter', encryptedData: 'c' },
        'profile-7'
      );

      expect(prismaMock.model.aiProviderCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: 'PROFILE',
            profileId: 'profile-7',
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('deve deletar workspace credential com profileId null', async () => {
      prismaMock.model.aiProviderCredential.deleteMany.mockResolvedValue({
        count: 1,
      } as any);

      await repository.delete('org-1', 'WORKSPACE', 'TEXT');

      expect(
        prismaMock.model.aiProviderCredential.deleteMany
      ).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          scope: 'WORKSPACE',
          kind: 'TEXT',
          profileId: null,
        },
      });
    });
  });

  describe('updateMeta', () => {
    it('deve atualizar lastUsedAt sem mexer em outros campos', async () => {
      prismaMock.model.aiProviderCredential.update.mockResolvedValue({} as any);
      const now = new Date('2026-05-05');

      await repository.updateMeta('cred-1', { lastUsedAt: now });

      expect(prismaMock.model.aiProviderCredential.update).toHaveBeenCalledWith({
        where: { id: 'cred-1' },
        data: { lastUsedAt: now },
      });
    });
  });
});
