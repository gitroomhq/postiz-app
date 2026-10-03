import { describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { socialIntegrationList } from './integration.manager';
import { SocialAbstract } from './social.abstract';

/**
 * One contract every registered provider must satisfy.
 *
 * The value of this suite is that a newly added provider is covered the moment
 * it lands in `socialIntegrationList` - nobody has to remember to write a test
 * for it, and a renamed identifier or a newly hyphenated one shows up as a
 * snapshot diff rather than as broken channels in production.
 *
 * What deliberately is NOT asserted here, because it cannot be done generically:
 *   - generateAuthUrl(): every implementation interpolates provider-specific
 *     env vars, so without seeding ~40 of them this would only assert that the
 *     string "undefined" appears in a URL.
 *   - authenticate() / refreshToken() / post(): network by definition.
 *   - handleErrors() correctness: that a given body means "retry" rather than
 *     "disconnect" is provider domain knowledge. Only totality is checked.
 *   - The pending state machine: a temporal property across two round-trips.
 * Those belong in the per-provider suites.
 */

const EDITORS = ['none', 'normal', 'markdown', 'html'];

describe('social provider registry', () => {
  it('exposes a non-empty provider list', () => {
    expect(socialIntegrationList.length).toBeGreaterThan(30);
  });

  it('has unique identifiers', () => {
    const identifiers = socialIntegrationList.map((p) => p.identifier);

    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('maps every identifier to a stable temporal task queue', () => {
    // PostsService.startWorkflow derives the queue as
    // identifier.split('-')[0].toLowerCase(), and getTemporalModule only
    // creates workers for identifiers without a '-'. A new hyphenated provider
    // must not silently land on another provider's worker by accident, and
    // renaming an identifier orphans every connected channel.
    const queues = Object.fromEntries(
      socialIntegrationList.map((p) => [
        p.identifier,
        p.identifier.split('-')[0].toLowerCase(),
      ])
    );

    expect(queues).toMatchSnapshot();
  });
});

describe.each(socialIntegrationList.map((p) => [p.identifier, p] as const))(
  'provider contract: %s',
  (identifier, provider) => {
    it('extends SocialAbstract', () => {
      expect(provider).toBeInstanceOf(SocialAbstract);
    });

    it('has a well-formed identifier and display name', () => {
      expect(identifier).toMatch(/^[a-z0-9-]+$/);
      expect(typeof provider.name).toBe('string');
      expect(provider.name.length).toBeGreaterThan(0);
    });

    it('declares a valid editor', () => {
      expect(EDITORS).toContain(provider.editor);
    });

    it('declares scopes as an array of non-empty strings', () => {
      expect(Array.isArray(provider.scopes)).toBe(true);

      provider.scopes.forEach((scope) => {
        expect(typeof scope).toBe('string');
        expect(scope.length).toBeGreaterThan(0);
      });
    });

    it('declares isBetweenSteps and a positive concurrency', () => {
      expect(typeof provider.isBetweenSteps).toBe('boolean');
      expect(Number.isInteger(provider.maxConcurrentJob)).toBe(true);
      expect(provider.maxConcurrentJob).toBeGreaterThan(0);
    });

    it('maxLength is callable with no arguments and with settings', () => {
      // PostsService.validatePosts calls maxLength(additionalSettings, settings)
      // while the frontend calls maxLength(). Both must yield a usable number,
      // because a NaN here silently marks every post as too long.
      for (const args of [[], [[], {}]] as const) {
        const length = (provider.maxLength as (...a: unknown[]) => number)(...args);

        expect(Number.isFinite(length)).toBe(true);
        expect(length).toBeGreaterThan(0);
      }
    });

    it('implements the IAuthenticator and ISocialMediaIntegration surface', () => {
      for (const method of [
        'authenticate',
        'refreshToken',
        'generateAuthUrl',
        'post',
      ] as const) {
        expect(typeof provider[method]).toBe('function');
      }
    });

    it('exposes a validatable settings dto when it declares one', async () => {
      if (!provider.dto) {
        return;
      }

      expect(typeof provider.dto).toBe('function');
      // Validating an empty object must resolve (it may well produce errors)
      // rather than throw, which is what PostsService.validatePosts relies on.
      await expect(
        validate(plainToInstance(provider.dto, {}) as object)
      ).resolves.toBeInstanceOf(Array);
    });

    it('honours the default migrationMatch contract', () => {
      const integration = { profile: 'bob' } as never;

      expect(provider.migrationMatch({ id: '1', username: 'bob' }, integration)).toBe(
        true
      );
      expect(provider.migrationMatch({ id: '1', username: 'alice' }, integration)).toBe(
        false
      );
      expect(provider.migrationMatch({ id: '1', username: '' }, integration)).toBe(
        false
      );
    });

    it('resolves checkValidity to true or a reason, never a throw', async () => {
      // Empty media can never reach getImageDimensions or mediaSize, so calling
      // this is safe even for the providers that override checkValidity.
      // Media-mandatory providers (instagram, tiktok, youtube, pinterest,
      // dribbble) correctly answer with a reason string here rather than true;
      // the contract is only that the union is honoured and nothing throws.
      const result = await provider.checkValidity([], {}, []);

      expect(result === true || typeof result === 'string').toBe(true);

      if (typeof result === 'string') {
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('handleErrors is total and side-effect free', () => {
      // A couple of providers log the body they were handed. That is production
      // behaviour worth leaving alone, but it would otherwise print five lines
      // per provider on every CI run.
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      const samples: Array<[string, number]> = [
        ['', 200],
        ['{}', 500],
        ['<html>502 Bad Gateway</html>', 502],
        ['rate_limit_exceeded', 429],
        ['null', 401],
      ];

      for (const [body, status] of samples) {
        const result = provider.handleErrors(body, status);

        if (result !== undefined) {
          expect(['refresh-token', 'bad-body', 'retry', 'disconnect']).toContain(
            result.type
          );
          expect(typeof result.value).toBe('string');
        }
      }

      log.mockRestore();
    });

    it('has consistently shaped optional hooks', () => {
      if (provider.stripLinks) {
        expect(typeof provider.stripLinks()).toBe('boolean');
      }
      if (provider.mentionFormat) {
        expect(typeof provider.mentionFormat('id', 'name')).toBe('string');
      }
      if (provider.isChromeExtension) {
        // The extension cannot collect cookies for a provider that never says
        // which cookies it needs.
        expect(provider.extensionCookies).toBeDefined();
      }
    });

    it('overrides checkPostStatus whenever it can return a pending post', () => {
      // Otherwise the SocialAbstract default throws BadBody on the first real
      // post and the workflow can never resolve the pending response.
      if ((provider as { postPending?: unknown }).postPending) {
        expect(provider.checkPostStatus).not.toBe(SocialAbstract.prototype.checkPostStatus);
      }
    });
  }
);
