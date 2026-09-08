import { HttpException } from '@nestjs/common';

import { SubscriptionException } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { MediaService } from './media.service';

type Mocks = ReturnType<typeof mocks>;

const videoInstance = (over: Record<string, unknown> = {}) => ({
  processAndValidate: vi.fn(async () => undefined),
  process: vi.fn(async () => 'data:image/png;base64,AAA'),
  ...over,
});

const video = (over: Record<string, unknown> = {}) => ({
  trial: true,
  instance: videoInstance(),
  ...over,
});

const mocks = () => ({
  mediaRepository: {
    deleteMedia: vi.fn(),
    getMediaById: vi.fn(),
    saveFile: vi.fn(async () => ({ id: 'm1', path: 'https://cdn/a.png' })),
    getMedia: vi.fn(),
    saveMediaInformation: vi.fn(),
  },
  openAi: {
    generatePromptForPicture: vi.fn(async () => 'expanded prompt'),
    generateImage: vi.fn(async () => 'https://cdn/generated.png'),
  },
  subscriptionService: {
    useCredit: vi.fn(async (_org: any, _type: string, cb: () => any) => cb()),
    checkCredits: vi.fn(async () => ({ credits: 5 })),
  },
  videoManager: {
    getAllVideos: vi.fn(() => [{ identifier: 'veo' }]),
    getVideoByName: vi.fn(() => video()),
    checkAvailableVideoFunction: vi.fn(() => false),
  },
  temporalService: {
    client: {
      getRawClient: vi.fn(() => ({ workflow: { start: vi.fn(async () => ({})) } })),
      getWorkflowHandle: vi.fn(),
    },
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new MediaService(
    m.mediaRepository as never,
    m.openAi as never,
    m.subscriptionService as never,
    m.videoManager as never,
    m.temporalService as never
  );
  const storage = { uploadSimple: vi.fn(async () => 'https://cdn/out/a.mp4') };
  (service as any).storage = storage;

  return { service, storage, ...m };
};

const org = (over: Record<string, unknown> = {}) =>
  ({ id: 'org-1', isTrailing: false, ...over } as never);

describe('MediaService repository delegation', () => {
  it('forwards media reads and writes to the repository', async () => {
    const { service, mediaRepository } = build();

    await service.deleteMedia('org-1', 'm1');
    await service.getMediaById('m1');
    await service.saveFile('org-1', 'a.png', '/path/a.png', 'original.png');
    await service.getMedia('org-1', 2, 'cats');
    await service.saveMediaInformation('org-1', { id: 'm1' } as never);

    expect(mediaRepository.deleteMedia).toHaveBeenCalledWith('org-1', 'm1');
    expect(mediaRepository.saveFile).toHaveBeenCalledWith(
      'org-1',
      'a.png',
      '/path/a.png',
      'original.png'
    );
    expect(mediaRepository.getMedia).toHaveBeenCalledWith('org-1', 2, 'cats');
  });

  it('lists the available video generators', () => {
    const { service, videoManager } = build();

    expect(service.getVideoOptions()).toEqual([{ identifier: 'veo' }]);
    expect(videoManager.getAllVideos).toHaveBeenCalled();
  });
});

describe('MediaService.generateImage', () => {
  it('spends an ai_images credit and returns the generated image', async () => {
    const { service, subscriptionService, openAi } = build();

    await expect(service.generateImage('a cat', org())).resolves.toBe(
      'https://cdn/generated.png'
    );
    expect(subscriptionService.useCredit).toHaveBeenCalledWith(
      expect.anything(),
      'ai_images',
      expect.any(Function)
    );
    expect(openAi.generateImage).toHaveBeenCalledWith('a cat');
  });

  it('expands the prompt first when asked', async () => {
    const { service, openAi } = build();

    await service.generateImage('a cat', org(), true);

    expect(openAi.generatePromptForPicture).toHaveBeenCalledWith('a cat');
    expect(openAi.generateImage).toHaveBeenCalledWith('expanded prompt');
  });

  it('reports a provider safety rejection as a 422', async () => {
    const { service, openAi } = build();
    openAi.generateImage.mockRejectedValue(
      new Error('400 rejected by the safety system, safety_violations=[sexual]')
    );

    await expect(service.generateImage('x', org())).rejects.toMatchObject({
      status: 422,
    });
    await expect(service.generateImage('x', org())).rejects.toThrow(
      /Flagged categories: sexual/
    );
  });

  it('hides an unrelated provider failure behind a generic 500', async () => {
    const { service, openAi } = build();
    openAi.generateImage.mockRejectedValue(new Error('invalid api key'));

    await expect(service.generateImage('x', org())).rejects.toMatchObject({
      status: 500,
    });
  });

  it('passes an intentional http exception through untouched', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.useCredit.mockRejectedValue(
      new HttpException('no credits', 402)
    );

    await expect(service.generateImage('x', org())).rejects.toMatchObject({
      status: 402,
    });
  });
});

describe('MediaService.generateVideoAllowed', () => {
  it('rejects an unknown video type', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(undefined as never);

    await expect(service.generateVideoAllowed(org(), 'nope')).rejects.toThrow(
      /Video type nope not found/
    );
  });

  it('blocks a non-trial video for a trialing organization', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(video({ trial: false }));

    await expect(
      service.generateVideoAllowed(org({ isTrailing: true }), 'veo')
    ).rejects.toMatchObject({ status: 406 });
  });

  it('allows a trial-enabled video while trialing', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(video({ trial: true }));

    await expect(
      service.generateVideoAllowed(org({ isTrailing: true }), 'veo')
    ).resolves.toBe(true);
  });

  it('allows a non-trial video for a paying organization', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(video({ trial: false }));

    await expect(service.generateVideoAllowed(org(), 'veo')).resolves.toBe(true);
  });
});

describe('MediaService.generateVideo', () => {
  const body = { type: 'veo', output: 'mp4', customParams: { a: 1 } } as never;

  it('validates, spends a credit, uploads and stores the result', async () => {
    const { service, subscriptionService, storage, mediaRepository, videoManager } =
      build();
    const chosen = video();
    videoManager.getVideoByName.mockReturnValue(chosen);

    await expect(service.generateVideo(org(), body)).resolves.toEqual({
      id: 'm1',
      path: 'https://cdn/a.png',
    });

    expect(chosen.instance.processAndValidate).toHaveBeenCalledWith({ a: 1 });
    expect(subscriptionService.useCredit).toHaveBeenCalledWith(
      expect.anything(),
      'ai_videos',
      expect.any(Function)
    );
    expect(storage.uploadSimple).toHaveBeenCalled();
    expect(mediaRepository.saveFile).toHaveBeenCalledWith(
      'org-1',
      'a.mp4',
      'https://cdn/out/a.mp4',
      undefined
    );
  });

  it('refuses when the organization is out of video credits', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.checkCredits.mockResolvedValue({ credits: 0 });

    await expect(service.generateVideo(org(), body)).rejects.toThrow(
      SubscriptionException
    );
    expect(subscriptionService.useCredit).not.toHaveBeenCalled();
  });

  it('does not spend a credit when the parameters fail validation', async () => {
    const { service, subscriptionService, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(
      video({
        instance: videoInstance({
          processAndValidate: vi.fn(async () => {
            throw new Error('bad params');
          }),
        }),
      })
    );

    await expect(service.generateVideo(org(), body)).rejects.toMatchObject({
      status: 500,
    });
    expect(subscriptionService.useCredit).not.toHaveBeenCalled();
  });
});

describe('MediaService.startGenerateVideo', () => {
  const body = { type: 'veo', output: 'mp4', customParams: {} } as never;

  it('starts a workflow and returns a job id scoped to the organization', async () => {
    const { service, temporalService } = build();
    const start = vi.fn(async () => ({}));
    temporalService.client.getRawClient.mockReturnValue({
      workflow: { start },
    } as never);

    const { jobId } = await service.startGenerateVideo(org(), body);

    expect(jobId.startsWith('video_org-1_')).toBe(true);
    expect(start).toHaveBeenCalledWith(
      'generateVideoWorkflow',
      expect.objectContaining({
        workflowId: jobId,
        taskQueue: 'main',
        args: [{ organizationId: 'org-1', body }],
      })
    );
  });

  it('rejects bad input before any job exists', async () => {
    const { service, temporalService, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(undefined as never);

    await expect(service.startGenerateVideo(org(), body)).rejects.toBeInstanceOf(
      HttpException
    );
    expect(temporalService.client.getRawClient).not.toHaveBeenCalled();
  });

  it('reports the feature unavailable when temporal is not connected', async () => {
    const { service, temporalService } = build();
    temporalService.client.getRawClient.mockReturnValue(undefined as never);

    await expect(service.startGenerateVideo(org(), body)).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe('MediaService.getGenerateVideoStatus', () => {
  const handleWith = (over: Record<string, unknown>) => ({
    describe: vi.fn(async () => ({ status: { name: 'RUNNING' } })),
    result: vi.fn(async () => ({ id: 'm1', path: 'https://cdn/a.mp4' })),
    ...over,
  });

  it('refuses to reveal a job belonging to another organization', async () => {
    const { service, temporalService } = build();

    await expect(
      service.getGenerateVideoStatus(org(), 'video_other-org_abc')
    ).rejects.toMatchObject({ status: 404 });
    expect(temporalService.client.getWorkflowHandle).not.toHaveBeenCalled();
  });

  it('reports an unknown job as not found', async () => {
    const { service, temporalService } = build();
    temporalService.client.getWorkflowHandle.mockResolvedValue(
      handleWith({
        describe: vi.fn(async () => {
          throw new Error('not found');
        }),
      }) as never
    );

    await expect(
      service.getGenerateVideoStatus(org(), 'video_org-1_abc')
    ).rejects.toMatchObject({ status: 404 });
  });

  it('reports a running job as pending', async () => {
    const { service, temporalService } = build();
    temporalService.client.getWorkflowHandle.mockResolvedValue(
      handleWith({}) as never
    );

    await expect(
      service.getGenerateVideoStatus(org(), 'video_org-1_abc')
    ).resolves.toEqual({ status: 'pending' });
  });

  it('returns the stored media once the job completes', async () => {
    const { service, temporalService } = build();
    temporalService.client.getWorkflowHandle.mockResolvedValue(
      handleWith({
        describe: vi.fn(async () => ({ status: { name: 'COMPLETED' } })),
      }) as never
    );

    await expect(
      service.getGenerateVideoStatus(org(), 'video_org-1_abc')
    ).resolves.toEqual({
      status: 'completed',
      id: 'm1',
      path: 'https://cdn/a.mp4',
    });
  });

  it('unwraps the nested workflow failure down to the real cause', async () => {
    const { service, temporalService } = build();
    const root = new Error('the model refused the prompt');
    const activityFailure: any = new Error('activity failed');
    activityFailure.cause = root;
    const workflowFailure: any = new Error('workflow failed');
    workflowFailure.cause = activityFailure;

    temporalService.client.getWorkflowHandle.mockResolvedValue(
      handleWith({
        describe: vi.fn(async () => ({ status: { name: 'FAILED' } })),
        result: vi.fn(async () => {
          throw workflowFailure;
        }),
      }) as never
    );

    await expect(
      service.getGenerateVideoStatus(org(), 'video_org-1_abc')
    ).resolves.toEqual({
      status: 'failed',
      error: 'the model refused the prompt',
    });
  });

  it('falls back to the thrown value when it carries no message', async () => {
    const { service, temporalService } = build();
    temporalService.client.getWorkflowHandle.mockResolvedValue(
      handleWith({
        describe: vi.fn(async () => ({ status: { name: 'FAILED' } })),
        result: vi.fn(async () => {
          throw 'plain string failure';
        }),
      }) as never
    );

    await expect(
      service.getGenerateVideoStatus(org(), 'video_org-1_abc')
    ).resolves.toEqual({ status: 'failed', error: 'plain string failure' });
  });
});

describe('MediaService.videoFunction', () => {
  it('rejects an unknown video identifier', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(undefined as never);

    await expect(service.videoFunction('nope', 'anything', {})).rejects.toThrow(
      /Video with identifier nope not found/
    );
  });

  it('rejects a name that is not a function on the instance', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(
      video({ instance: videoInstance({ notAFunction: 'value' }) })
    );

    await expect(
      service.videoFunction('veo', 'notAFunction', {})
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a function the video manager does not expose', async () => {
    const { service, videoManager } = build();
    videoManager.getVideoByName.mockReturnValue(
      video({ instance: videoInstance({ internal: vi.fn() }) })
    );
    videoManager.checkAvailableVideoFunction.mockReturnValue(true);

    await expect(
      service.videoFunction('veo', 'internal', {})
    ).rejects.toMatchObject({ status: 400 });
  });

  it('calls an exposed function with the given body', async () => {
    const { service, videoManager } = build();
    const loadVoices = vi.fn(async () => ['a', 'b']);
    videoManager.getVideoByName.mockReturnValue(
      video({ instance: videoInstance({ loadVoices }) })
    );

    await expect(
      service.videoFunction('veo', 'loadVoices', { locale: 'en' })
    ).resolves.toEqual(['a', 'b']);
    expect(loadVoices).toHaveBeenCalledWith({ locale: 'en' });
  });
});
