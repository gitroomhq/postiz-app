const { parseURL } = vi.hoisted(() => ({ parseURL: vi.fn() }));

// The feed client is constructed at module load, so the package is the seam.
vi.mock('rss-parser', () => ({
  default: class {
    parseURL = parseURL;
  },
}));

import dayjs from 'dayjs';

import { AutopostService } from './autopost.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  autopostsRepository: {
    getAutoposts: vi.fn(async () => [] as any[]),
    createAutopost: vi.fn(async () => ({ id: 'auto-1' })),
    changeActive: vi.fn(async () => ({ id: 'auto-1' })),
    deleteAutopost: vi.fn(async () => ({ id: 'auto-1' })),
    updateUrl: vi.fn(),
  },
  temporalService: {
    client: { getRawClient: vi.fn(() => ({ workflow: { start } })) },
    terminateWorkflow: vi.fn(async (_id: string) => true),
  },
  integrationService: { getIntegrationsList: vi.fn(async () => [] as any[]) },
  postsService: { createPost: vi.fn() },
});

let start: ReturnType<typeof vi.fn>;

const build = (over: Partial<Mocks> = {}) => {
  start = vi.fn(async () => ({ workflowId: 'autopost-auto-1' }));
  const m = { ...mocks(), ...over };
  const service = new AutopostService(
    m.autopostsRepository as never,
    m.temporalService as never,
    m.integrationService as never,
    m.postsService as never
  );

  return { service, ...m };
};

describe('AutopostService repository delegation', () => {
  it('lists the autoposts of an organization', async () => {
    const { service, autopostsRepository } = build();
    autopostsRepository.getAutoposts.mockResolvedValue([{ id: 'auto-1' }]);

    await expect(service.getAutoposts('org-1')).resolves.toEqual([
      { id: 'auto-1' },
    ]);
    expect(autopostsRepository.getAutoposts).toHaveBeenCalledWith('org-1');
  });

  it('creates an autopost and starts its schedule when active', async () => {
    const { service, autopostsRepository } = build();

    await expect(
      service.createAutopost('org-1', { active: true } as never)
    ).resolves.toEqual({ id: 'auto-1' });

    expect(autopostsRepository.createAutopost).toHaveBeenCalledWith(
      'org-1',
      { active: true },
      undefined
    );
    expect(start).toHaveBeenCalledWith(
      'autoPostWorkflow',
      expect.objectContaining({ workflowId: 'autopost-auto-1' })
    );
  });

  it('creates an inactive autopost without scheduling it', async () => {
    const { service, temporalService } = build();

    await service.createAutopost('org-1', { active: false } as never);

    expect(start).not.toHaveBeenCalled();
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith(
      'autopost-auto-1'
    );
  });

  it('updates an existing autopost when given an id', async () => {
    const { service, autopostsRepository } = build();

    await service.createAutopost('org-1', { active: false } as never, 'auto-9');

    expect(autopostsRepository.createAutopost).toHaveBeenCalledWith(
      'org-1',
      { active: false },
      'auto-9'
    );
  });

  it('deletes an autopost and stops its schedule', async () => {
    const { service, autopostsRepository, temporalService } = build();

    await expect(service.deleteAutopost('org-1', 'auto-1')).resolves.toEqual({
      id: 'auto-1',
    });
    expect(autopostsRepository.deleteAutopost).toHaveBeenCalledWith(
      'org-1',
      'auto-1'
    );
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith(
      'autopost-auto-1'
    );
  });
});

describe('AutopostService.changeActive', () => {
  it('starts the schedule when switched on', async () => {
    const { service } = build();

    await service.changeActive('org-1', 'auto-1', true);

    expect(start).toHaveBeenCalledWith(
      'autoPostWorkflow',
      expect.objectContaining({
        taskQueue: 'main',
        args: [{ id: 'auto-1', immediately: true }],
      })
    );
  });

  it('stops the schedule when switched off', async () => {
    const { service, temporalService } = build();

    await service.changeActive('org-1', 'auto-1', false);

    expect(start).not.toHaveBeenCalled();
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith(
      'autopost-auto-1'
    );
  });
});

describe('AutopostService.stopAll', () => {
  it('switches off only the autoposts that are running', async () => {
    const { service, autopostsRepository, temporalService } = build();
    autopostsRepository.getAutoposts.mockResolvedValue([
      { id: 'a', active: true },
      { id: 'b', active: false },
      { id: 'c', active: true },
    ]);

    await service.stopAll('org-1');

    expect(autopostsRepository.changeActive).toHaveBeenCalledTimes(2);
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith('autopost-a');
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith('autopost-c');
    expect(temporalService.terminateWorkflow).not.toHaveBeenCalledWith(
      'autopost-b'
    );
  });

  it('does nothing for an organization with no autoposts', async () => {
    const { service, autopostsRepository } = build();

    await service.stopAll('org-1');

    expect(autopostsRepository.changeActive).not.toHaveBeenCalled();
  });
});

describe('AutopostService.processCron', () => {
  it('tags the workflow with the organization so it can be found later', async () => {
    const { service } = build();

    await service.processCron(true, 'org-1', 'auto-1');

    const [, options] = start.mock.calls[0] as [string, any];
    expect(options.typedSearchAttributes).toBeDefined();
  });

  it('survives temporal refusing to start the workflow', async () => {
    const { service, temporalService } = build();
    temporalService.client.getRawClient.mockImplementation(() => {
      throw new Error('temporal unreachable');
    });

    await expect(
      service.processCron(true, 'org-1', 'auto-1')
    ).resolves.toBeDefined();
  });

  it('reports false when the workflow could not be terminated', async () => {
    const { service, temporalService } = build();
    temporalService.terminateWorkflow.mockRejectedValue(
      new Error('no such workflow')
    );

    await expect(service.processCron(false, 'org-1', 'auto-1')).resolves.toBe(
      false
    );
  });
});

describe('AutopostService.loadXML', () => {
  it('reports the newest entry of the feed', async () => {
    const { service } = build();
    parseURL.mockResolvedValue({
      items: [
        {
          pubDate: dayjs().subtract(5, 'day').toISOString(),
          link: 'https://blog.test/old',
          description: 'the old one',
        },
        {
          pubDate: dayjs().subtract(1, 'day').toISOString(),
          link: 'https://blog.test/new',
          description: 'the new one',
        },
      ],
    });

    await expect(service.loadXML('https://blog.test/rss')).resolves.toMatchObject(
      {
        success: true,
        url: 'https://blog.test/new',
        description: 'the new one',
      }
    );
  });

  it('strips markup and collapses newlines out of the description', async () => {
    const { service } = build();
    parseURL.mockResolvedValue({
      items: [
        {
          pubDate: dayjs().toISOString(),
          link: 'https://blog.test/a',
          'content:encoded': '<p>first line\nsecond line</p>',
        },
      ],
    });

    const result = await service.loadXML('https://blog.test/rss');

    expect(result.description).toBe('first line second line');
  });

  it('prefers the encoded content over the plain description', async () => {
    const { service } = build();
    parseURL.mockResolvedValue({
      items: [
        {
          pubDate: dayjs().toISOString(),
          link: 'https://blog.test/a',
          'content:encoded': 'the full article',
          content: 'the summary',
          description: 'the short description',
        },
      ],
    });

    const result = await service.loadXML('https://blog.test/rss');

    expect(result.description).toBe('the full article');
  });

  it('falls back to an empty description when the entry carries none', async () => {
    const { service } = build();
    parseURL.mockResolvedValue({
      items: [{ pubDate: dayjs().toISOString(), link: 'https://blog.test/a' }],
    });

    await expect(service.loadXML('https://blog.test/rss')).resolves.toMatchObject(
      { success: true, description: '' }
    );
  });

  it('reports failure for a feed it cannot read', async () => {
    const { service } = build();
    parseURL.mockRejectedValue(new Error('404'));

    await expect(service.loadXML('https://blog.test/rss')).resolves.toEqual({
      success: false,
    });
  });
});

describe('AutopostService.loadUrl', () => {
  it('returns the readable text of the page', async () => {
    const { service } = build();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><body><p>Hello there</p></body></html>'))
    );

    await expect(service.loadUrl('https://blog.test/a')).resolves.toContain(
      'Hello there'
    );
  });

  it('drops scripts and styles rather than treating them as content', async () => {
    const { service } = build();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            '<html><body><script>alert(1)</script><style>p{color:red}</style><p>Real text</p></body></html>'
          )
      )
    );

    const text = await service.loadUrl('https://blog.test/a');

    expect(text).toContain('Real text');
    expect(text).not.toContain('alert(1)');
    expect(text).not.toContain('color:red');
  });

  it('returns nothing when the page cannot be fetched', async () => {
    const { service } = build();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connect ECONNREFUSED');
      })
    );

    await expect(service.loadUrl('https://blog.test/a')).resolves.toBe('');
  });
});
