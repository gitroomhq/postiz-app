import { afterEach, describe, expect, it } from 'vitest';
import { IntegrationManager, socialIntegrationList } from './integration.manager';

/**
 * HIDDEN_PROVIDERS and MIGRATE_PROVIDERS are read at call time, so cloud and
 * self-hosted instances can differ. Getting migration wrong either orphans
 * connected channels or silently routes a reconnect to the wrong provider.
 */
describe('IntegrationManager', () => {
  const manager = new IntegrationManager();

  afterEach(() => {
    delete process.env.HIDDEN_PROVIDERS;
    delete process.env.MIGRATE_PROVIDERS;
  });

  describe('isHiddenProvider', () => {
    it('is false when nothing is hidden', () => {
      expect(manager.isHiddenProvider('mastodon')).toBe(false);
    });

    it('matches entries and tolerates surrounding whitespace', () => {
      process.env.HIDDEN_PROVIDERS = ' tiktok , x ';

      expect(manager.isHiddenProvider('x')).toBe(true);
      expect(manager.isHiddenProvider('tiktok')).toBe(true);
      expect(manager.isHiddenProvider('linkedin')).toBe(false);
    });
  });

  describe('getMigrationTarget', () => {
    it('resolves a configured migration', () => {
      process.env.MIGRATE_PROVIDERS = 'tiktok:tiktok-business';

      expect(manager.getMigrationTarget('tiktok')).toBe('tiktok-business');
    });

    it('is undefined when nothing is configured', () => {
      expect(manager.getMigrationTarget('tiktok')).toBeUndefined();
    });

    it('refuses a target that is not a registered provider', () => {
      process.env.MIGRATE_PROVIDERS = 'tiktok:does-not-exist';

      expect(manager.getMigrationTarget('tiktok')).toBeUndefined();
    });

    it('refuses a self-referencing migration', () => {
      process.env.MIGRATE_PROVIDERS = 'tiktok:tiktok';

      expect(manager.getMigrationTarget('tiktok')).toBeUndefined();
    });
  });

  describe('getMigrationSources', () => {
    it('reverses the mapping', () => {
      process.env.MIGRATE_PROVIDERS = 'tiktok:tiktok-business';

      expect(manager.getMigrationSources('tiktok-business')).toEqual(['tiktok']);
    });

    it('is empty for a provider nothing migrates to', () => {
      process.env.MIGRATE_PROVIDERS = 'tiktok:tiktok-business';

      expect(manager.getMigrationSources('x')).toEqual([]);
    });
  });

  describe('provider lookup', () => {
    it('resolves every registered identifier', () => {
      for (const provider of socialIntegrationList) {
        expect(manager.getSocialIntegration(provider.identifier)).toBe(provider);
      }
    });

    it('returns undefined for an unknown identifier', () => {
      // Characterisation: the signature asserts non-null, so the caller in
      // PostActivity.postSocialBody would throw a TypeError rather than a
      // classified failure.
      expect(manager.getSocialIntegration('not-a-provider')).toBeUndefined();
    });

    it('omits hidden providers from the add-channel list', () => {
      process.env.HIDDEN_PROVIDERS = 'mastodon';

      return manager.getAllIntegrations().then(({ social }) => {
        expect(social.some((s) => s.identifier === 'mastodon')).toBe(false);
        expect(social).toHaveLength(socialIntegrationList.length - 1);
      });
    });
  });
});
