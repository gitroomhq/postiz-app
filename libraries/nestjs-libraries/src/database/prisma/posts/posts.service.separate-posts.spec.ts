// Mocks topo-de-modulo necessarios porque PostsService importa
// IntegrationManager (que carrega nostr.provider — ESM only que quebra
// ts-jest) e MediaService (que importa o alias @gitroom/backend nao
// mapeado no jest.config das libraries). Nada disso e usado pelo
// delegador separatePosts.
jest.mock(
  '@gitroom/nestjs-libraries/integrations/integration.manager',
  () => ({ IntegrationManager: class IntegrationManagerMock {} })
);
jest.mock(
  '@gitroom/nestjs-libraries/integrations/refresh.integration.service',
  () => ({ RefreshIntegrationService: class RefreshIntegrationServiceMock {} })
);
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/media/media.service',
  () => ({ MediaService: class MediaServiceMock {} })
);
jest.mock(
  '@gitroom/nestjs-libraries/short-linking/short.link.service',
  () => ({ ShortLinkService: class ShortLinkServiceMock {} })
);

import { PostsService } from './posts.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { AiTextService } from '@gitroom/nestjs-libraries/ai/ai-text.service';

describe('PostsService.separatePosts', () => {
  it('deve delegar para AiTextService.separatePosts repassando orgId', async () => {
    const aiText = createMock<AiTextService>();
    aiText.separatePosts.mockResolvedValue({ posts: ['p1', 'p2'] });
    const service = new PostsService(
      null as any, // postsRepository
      null as any, // integrationManager
      null as any, // integrationService
      null as any, // mediaService
      null as any, // shortLinkService
      null as any, // openaiService (legacy)
      null as any, // temporalService
      null as any, // refreshIntegrationService
      aiText
    );

    const result = await service.separatePosts('org-1', 'texto', 280);

    expect(aiText.separatePosts).toHaveBeenCalledWith(
      'org-1',
      'texto',
      280,
      undefined
    );
    expect(result).toEqual({ posts: ['p1', 'p2'] });
  });

  it('deve repassar profileId quando fornecido', async () => {
    const aiText = createMock<AiTextService>();
    aiText.separatePosts.mockResolvedValue({ posts: [] });
    const service = new PostsService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      aiText
    );

    await service.separatePosts('org-1', 'conteudo', 240, 'profile-9');

    expect(aiText.separatePosts).toHaveBeenCalledWith(
      'org-1',
      'conteudo',
      240,
      'profile-9'
    );
  });
});
