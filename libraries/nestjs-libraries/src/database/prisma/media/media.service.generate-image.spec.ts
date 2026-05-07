// MediaService importa SubscriptionService que cascateia ate nostr-tools
// (ESM-only que quebra ts-jest). Mockamos topo-de-modulo as cadeias pesadas.
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({ SubscriptionService: class SubscriptionServiceMock {} })
);
jest.mock(
  '@gitroom/nestjs-libraries/videos/video.manager',
  () => ({ VideoManager: class VideoManagerMock {} })
);
jest.mock(
  '@gitroom/backend/services/auth/permissions/permission.exception.class',
  () => ({
    AuthorizationActions: { Create: 'Create', Delete: 'Delete', Update: 'Update' },
    Sections: { ADMIN: 'ADMIN', VIDEOS_PER_MONTH: 'VIDEOS_PER_MONTH' },
    SubscriptionException: class SubscriptionExceptionMock extends Error {
      constructor(public meta: any) { super('SubscriptionException'); }
    },
  })
);

import { MediaService } from './media.service';
import { createMock } from '@gitroom/nestjs-libraries/test';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { AiImageService } from '@gitroom/nestjs-libraries/ai/ai-image.service';
import { AiTextService } from '@gitroom/nestjs-libraries/ai/ai-text.service';
import { Organization } from '@prisma/client';

const buildOrg = (): Organization => ({
  id: 'org-1',
  name: 'Test',
} as Organization);

describe('MediaService.generateImage', () => {
  it('deve gerar imagem via AiImageService e retornar base64 puro', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();

    subscription.useCredit.mockImplementation(async (_org, _type, func) => {
      return func();
    });
    aiImage.generate.mockResolvedValue({
      base64: 'BASE64_DATA',
      provider: 'openrouter',
      model: 'google/gemini-3.1-flash-image-preview',
      credentialId: 'cred-1',
    });

    const service = new MediaService(
      null as any, // mediaRepository
      null as any, // openaiService legacy
      subscription,
      null as any, // videoManager
      aiImage,
      aiText
    );

    const result = await service.generateImage('um gato', buildOrg());

    expect(subscription.useCredit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      'ai_images',
      expect.any(Function)
    );
    expect(aiImage.generate).toHaveBeenCalledWith(
      'org-1',
      'um gato',
      undefined,
      undefined
    );
    expect(aiText.generatePromptForPicture).not.toHaveBeenCalled();
    expect(result).toBe('BASE64_DATA');
  });

  it('deve enriquecer o prompt antes de gerar quando generatePromptFirst=true', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();

    subscription.useCredit.mockImplementation(async (_org, _type, func) => func());
    aiText.generatePromptForPicture.mockResolvedValue(
      'prompt enriquecido com camera, iluminacao etc'
    );
    aiImage.generate.mockResolvedValue({
      base64: 'B',
      provider: 'openai',
      model: 'gpt-image-1',
      credentialId: 'c',
    });

    const service = new MediaService(
      null as any,
      null as any,
      subscription,
      null as any,
      aiImage,
      aiText
    );

    await service.generateImage('gato', buildOrg(), true);

    expect(aiText.generatePromptForPicture).toHaveBeenCalledWith(
      'org-1',
      'gato',
      undefined
    );
    expect(aiImage.generate).toHaveBeenCalledWith(
      'org-1',
      'prompt enriquecido com camera, iluminacao etc',
      undefined,
      undefined
    );
  });

  it('deve seguir com prompt original quando enrichment lanca 412 (TEXT nao configurado)', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();
    // Importar o tipo HttpException via require pra evitar problemas de
    // alias no spec
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HttpException } = require('@nestjs/common');

    subscription.useCredit.mockImplementation(async (_org, _type, func) => func());
    aiText.generatePromptForPicture.mockRejectedValue(
      new HttpException('Configure suas chaves', 412)
    );
    aiImage.generate.mockResolvedValue({
      base64: 'fallback-ok',
      provider: 'openai',
      model: 'gpt-image-1',
      credentialId: 'c',
    });

    const service = new MediaService(
      null as any,
      null as any,
      subscription,
      null as any,
      aiImage,
      aiText
    );

    const result = await service.generateImage('gato', buildOrg(), true);

    // Tentou enriquecer mas o IMAGE foi chamado com o prompt original
    expect(aiText.generatePromptForPicture).toHaveBeenCalled();
    expect(aiImage.generate).toHaveBeenCalledWith(
      'org-1',
      'gato',
      undefined,
      undefined
    );
    expect(result).toBe('fallback-ok');
  });

  it('deve propagar erro nao-412 do enrichment', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();

    subscription.useCredit.mockImplementation(async (_org, _type, func) => func());
    aiText.generatePromptForPicture.mockRejectedValue(
      new Error('crash inesperado')
    );

    const service = new MediaService(
      null as any,
      null as any,
      subscription,
      null as any,
      aiImage,
      aiText
    );

    await expect(
      service.generateImage('gato', buildOrg(), true)
    ).rejects.toThrow('crash inesperado');
    expect(aiImage.generate).not.toHaveBeenCalled();
  });

  it('deve repassar profileId nas chamadas internas quando fornecido', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();

    subscription.useCredit.mockImplementation(async (_org, _type, func) => func());
    aiImage.generate.mockResolvedValue({
      base64: 'X',
      provider: 'openrouter',
      model: 'm',
      credentialId: 'c',
    });

    const service = new MediaService(
      null as any,
      null as any,
      subscription,
      null as any,
      aiImage,
      aiText
    );

    await service.generateImage('prompt', buildOrg(), false, 'profile-9');

    expect(aiImage.generate).toHaveBeenCalledWith(
      'org-1',
      'prompt',
      'profile-9',
      undefined
    );
  });

  it('deve repassar aspectRatio nas chamadas internas quando fornecido', async () => {
    const aiImage = createMock<AiImageService>();
    const aiText = createMock<AiTextService>();
    const subscription = createMock<SubscriptionService>();

    subscription.useCredit.mockImplementation(async (_org, _type, func) => func());
    aiImage.generate.mockResolvedValue({
      base64: 'X',
      provider: 'openrouter',
      model: 'm',
      credentialId: 'c',
    });

    const service = new MediaService(
      null as any,
      null as any,
      subscription,
      null as any,
      aiImage,
      aiText
    );

    await service.generateImage('prompt', buildOrg(), false, undefined, '9:16');

    expect(aiImage.generate).toHaveBeenCalledWith('org-1', 'prompt', undefined, {
      aspectRatio: '9:16',
    });
  });
});
