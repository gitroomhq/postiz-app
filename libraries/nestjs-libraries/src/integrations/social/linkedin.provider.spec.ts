import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  LinkedinDto,
  LinkedinOrganicTargeting,
} from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import { LinkedinProvider } from './linkedin.provider';

describe('LinkedinProvider organic targeting', () => {
  const targeting: LinkedinOrganicTargeting = {
    geoLocations: ['urn:li:geo:103644278'],
    interfaceLocales: [{ language: 'en', country: 'US' }],
  };

  it('validates supported target facets and rejects an empty target', async () => {
    const valid = plainToInstance(LinkedinDto, {
      organic_targeting: targeting,
    });
    await expect(validate(valid)).resolves.toHaveLength(0);

    const invalid = plainToInstance(LinkedinDto, {
      organic_targeting: {},
    });
    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'organic_targeting' }),
      ])
    );

    const invalidLocale = plainToInstance(LinkedinDto, {
      organic_targeting: {
        geoLocations: ['urn:li:geo:103644278'],
        interfaceLocales: [{ language: 'EN', country: 'usa' }],
      },
    });
    await expect(validate(invalidLocale)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'organic_targeting' }),
      ])
    );
  });

  it('carries targeting through pending state into the REST posts payload', async () => {
    const provider = new LinkedinProvider();
    const [pending] = await provider.postPending(
      '5515715',
      'access-token',
      [
        {
          id: 'post-1',
          message: 'Targeted market update',
          settings: { organic_targeting: targeting },
          media: [],
        },
      ],
      {} as any,
      'company'
    );

    expect(pending.pendingData.organicTargeting).toEqual(targeting);

    const fetchMock = jest.fn().mockResolvedValue({
      status: 201,
      headers: { get: () => 'urn:li:share:123' },
    });
    (provider as any).fetch = fetchMock;

    const result = await provider.finalizePost(
      'access-token',
      {
        ...pending.pendingData,
        attempting: true,
        confirmed: true,
      },
      {} as any
    );

    expect(result).toEqual({
      status: 'completed',
      postId: 'urn:li:share:123',
      releaseURL: 'https://www.linkedin.com/feed/update/urn:li:share:123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.distribution.targetEntities).toEqual([targeting]);
    expect(request.author).toBe('urn:li:organization:5515715');
  });

  it('does not allow organic targeting for a personal LinkedIn post', async () => {
    await expect(
      new LinkedinProvider().postPending(
        'member-101',
        'access-token',
        [
          {
            id: 'post-1',
            message: 'Targeted market update',
            settings: { organic_targeting: targeting },
            media: [],
          },
        ],
        {} as any,
        'personal'
      )
    ).rejects.toThrow(
      'Organic targeting is only supported for LinkedIn Company Pages'
    );
  });
});
