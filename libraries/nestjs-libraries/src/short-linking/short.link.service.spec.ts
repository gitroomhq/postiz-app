import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';
import { Empty } from '@gitroom/nestjs-libraries/short-linking/providers/empty';
import { ShortLinkService } from './short.link.service';

const original = ShortLinkService.provider;

const fakeProvider = (over: Partial<ShortLinking> = {}): ShortLinking => ({
  shortLinkDomain: 'sho.rt',
  linksStatistics: vi.fn(async () => []),
  convertLinkToShortLink: vi.fn(async (id: string, link: string) =>
    link.replace(/^https?:\/\/[^/]+/, 'https://sho.rt')
  ),
  convertShortLinkToLink: vi.fn(async () => 'https://original.example.com/page'),
  getAllLinksStatistics: vi.fn(async () => []),
  ...over,
});

const use = (provider: ShortLinking) => {
  ShortLinkService.provider = provider;
  return new ShortLinkService();
};

afterEach(() => {
  ShortLinkService.provider = original;
});

describe('ShortLinkService without a configured provider', () => {
  it('never asks to shorten, and returns every input untouched', async () => {
    const service = use(new Empty());
    const messages = ['visit https://example.com/a today'];

    expect(service.askShortLinkedin(messages)).toBe(false);
    await expect(service.convertTextToShortLinks('p1', messages)).resolves.toBe(
      messages
    );
    await expect(service.convertShortLinksToLinks(messages)).resolves.toBe(
      messages
    );
    await expect(service.getStatistics(messages)).resolves.toEqual([]);
    await expect(service.getAllLinks('p1')).resolves.toEqual([]);
  });
});

describe('ShortLinkService.askShortLinkedin', () => {
  it('asks when a message carries a link that is not shortened yet', () => {
    const service = use(fakeProvider());

    expect(service.askShortLinkedin(['see https://example.com/a'])).toBe(true);
  });

  it('does not ask when there is no link at all', () => {
    const service = use(fakeProvider());

    expect(service.askShortLinkedin(['no links here'])).toBe(false);
  });

  it('does not ask when every link is already on the short domain', () => {
    const service = use(fakeProvider());

    expect(
      service.askShortLinkedin(['https://sho.rt/a', 'https://sho.rt/b'])
    ).toBe(false);
  });

  it('looks across all messages, not just the first', () => {
    const service = use(fakeProvider());

    expect(
      service.askShortLinkedin(['https://sho.rt/a', 'https://example.com/b'])
    ).toBe(true);
  });
});

describe('ShortLinkService.convertTextToShortLinks', () => {
  it('replaces a plain link with the shortened one', async () => {
    const service = use(fakeProvider());

    await expect(
      service.convertTextToShortLinks('p1', ['go to https://example.com/a now'])
    ).resolves.toEqual(['go to https://sho.rt/a now']);
  });

  it('decodes the html entities the editor leaves in a url', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await expect(
      service.convertTextToShortLinks('p1', [
        'https://example.com/a&amp;b&quest;c&num;d',
      ])
    ).resolves.toEqual(['https://sho.rt/a&b?c#d']);

    expect(provider.convertLinkToShortLink).toHaveBeenCalledWith(
      'p1',
      'https://example.com/a&b?c#d'
    );
  });

  it('leaves a link that is already shortened alone', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await expect(
      service.convertTextToShortLinks('p1', ['already https://sho.rt/a'])
    ).resolves.toEqual(['already https://sho.rt/a']);
    expect(provider.convertLinkToShortLink).not.toHaveBeenCalled();
  });

  it('shortens a repeated link only once', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await expect(
      service.convertTextToShortLinks('p1', [
        'https://example.com/a and https://example.com/a',
      ])
    ).resolves.toEqual(['https://sho.rt/a and https://sho.rt/a']);
    expect(provider.convertLinkToShortLink).toHaveBeenCalledTimes(1);
  });

  it('passes the post id through so links stay attributable', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await service.convertTextToShortLinks('post-42', ['https://example.com/a']);

    expect(provider.convertLinkToShortLink).toHaveBeenCalledWith(
      'post-42',
      'https://example.com/a'
    );
  });

  it('returns text with no links unchanged', async () => {
    const service = use(fakeProvider());

    await expect(
      service.convertTextToShortLinks('p1', ['nothing to shorten'])
    ).resolves.toEqual(['nothing to shorten']);
  });

  it('handles every message in the list', async () => {
    const service = use(fakeProvider());

    await expect(
      service.convertTextToShortLinks('p1', [
        'https://example.com/a',
        'https://example.com/b',
      ])
    ).resolves.toEqual(['https://sho.rt/a', 'https://sho.rt/b']);
  });
});

describe('ShortLinkService.convertShortLinksToLinks', () => {
  it('expands a shortened link back to its original', async () => {
    const service = use(fakeProvider());

    await expect(
      service.convertShortLinksToLinks(['click https://sho.rt/a'])
    ).resolves.toEqual(['click https://original.example.com/page']);
  });

  it('leaves links from other domains as they are', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await expect(
      service.convertShortLinksToLinks(['https://example.com/a'])
    ).resolves.toEqual(['https://example.com/a']);
    expect(provider.convertShortLinkToLink).not.toHaveBeenCalled();
  });

  it('returns text with no links unchanged', async () => {
    const service = use(fakeProvider());

    await expect(service.convertShortLinksToLinks(['plain text'])).resolves.toEqual(
      ['plain text']
    );
  });
});

describe('ShortLinkService.getStatistics', () => {
  it('collects the short links across messages and asks the provider', async () => {
    const provider = fakeProvider({
      linksStatistics: vi.fn(async () => [
        { short: 'https://sho.rt/a', original: 'https://example.com/a', clicks: '3' },
      ]),
    });
    const service = use(provider);

    await expect(
      service.getStatistics(['first https://sho.rt/a', 'second https://sho.rt/b'])
    ).resolves.toEqual([
      { short: 'https://sho.rt/a', original: 'https://example.com/a', clicks: '3' },
    ]);
    expect(provider.linksStatistics).toHaveBeenCalledWith([
      'https://sho.rt/a',
      'https://sho.rt/b',
    ]);
  });

  it('strips html before matching so markup is not read as part of the url', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await service.getStatistics(['<p><a href="x">https://sho.rt/a</a></p>']);

    expect(provider.linksStatistics).toHaveBeenCalledWith(['https://sho.rt/a']);
  });

  it('returns nothing when no short link is present', async () => {
    const provider = fakeProvider();
    const service = use(provider);

    await expect(
      service.getStatistics(['https://example.com/a'])
    ).resolves.toEqual([]);
    expect(provider.linksStatistics).not.toHaveBeenCalled();
  });
});

describe('ShortLinkService.getAllLinks', () => {
  it('asks the provider for the first page of the post links', async () => {
    const provider = fakeProvider({
      getAllLinksStatistics: vi.fn(async () => [
        { short: 'https://sho.rt/a', original: 'https://example.com/a', clicks: '1' },
      ]),
    });
    const service = use(provider);

    await expect(service.getAllLinks('post-1')).resolves.toEqual([
      { short: 'https://sho.rt/a', original: 'https://example.com/a', clicks: '1' },
    ]);
    expect(provider.getAllLinksStatistics).toHaveBeenCalledWith('post-1', 1);
  });
});
