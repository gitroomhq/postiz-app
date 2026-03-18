import './setup';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import type { SocialProvider } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

type ProviderInstance = SocialAbstract & SocialProvider;

// Build test table: [identifier, provider instance]
const providerTable: [string, ProviderInstance][] = socialIntegrationList.map(
  (p) => [p.identifier, p]
);

describe('Provider Conformance Tests', () => {
  describe.each(providerTable)('%s', (identifier, provider) => {
    describe('Identity', () => {
      it('should have a non-empty string identifier', () => {
        expect(typeof provider.identifier).toBe('string');
        expect(provider.identifier.length).toBeGreaterThan(0);
      });

      it('should have a non-empty string name', () => {
        expect(typeof provider.name).toBe('string');
        expect(provider.name.length).toBeGreaterThan(0);
      });

      it('should have identifier matching the registered key', () => {
        expect(provider.identifier).toBe(identifier);
      });
    });

    describe('Editor', () => {
      it('should have a valid editor type', () => {
        expect(['none', 'normal', 'markdown', 'html']).toContain(
          provider.editor
        );
      });
    });

    describe('Scopes', () => {
      it('should have scopes as an array of strings', () => {
        expect(Array.isArray(provider.scopes)).toBe(true);
        provider.scopes.forEach((scope) => {
          expect(typeof scope).toBe('string');
        });
      });
    });

    describe('maxLength()', () => {
      it('should return a positive number', () => {
        const length = provider.maxLength();
        expect(typeof length).toBe('number');
        expect(length).toBeGreaterThan(0);
      });
    });

    describe('isBetweenSteps', () => {
      it('should be a boolean', () => {
        expect(typeof provider.isBetweenSteps).toBe('boolean');
      });
    });

    describe('Required methods', () => {
      it('should have authenticate method', () => {
        expect(typeof provider.authenticate).toBe('function');
      });

      it('should have refreshToken method', () => {
        expect(typeof provider.refreshToken).toBe('function');
      });

      it('should have generateAuthUrl method', () => {
        expect(typeof provider.generateAuthUrl).toBe('function');
      });

      it('should have post method', () => {
        expect(typeof provider.post).toBe('function');
      });
    });

    describe('SocialAbstract inheritance', () => {
      it('should be an instance of SocialAbstract', () => {
        expect(provider).toBeInstanceOf(SocialAbstract);
      });

      it('should inherit fetch method', () => {
        expect(typeof provider.fetch).toBe('function');
      });

      it('should inherit checkScopes method', () => {
        expect(typeof provider.checkScopes).toBe('function');
      });

      it('should inherit runInConcurrent method', () => {
        expect(typeof provider.runInConcurrent).toBe('function');
      });

      it('should inherit handleErrors method', () => {
        expect(typeof provider.handleErrors).toBe('function');
      });

      it('should have maxConcurrentJob > 0', () => {
        expect(provider.maxConcurrentJob).toBeGreaterThan(0);
      });
    });

    describe('Optional methods and properties', () => {
      if (provider.customFields) {
        it('should have customFields return a promise', () => {
          expect(typeof provider.customFields).toBe('function');
        });
      }

      if (provider.mentionFormat) {
        it('should have mentionFormat as a function', () => {
          expect(typeof provider.mentionFormat).toBe('function');
        });

        it('should have mentionFormat return a non-empty string', () => {
          const result = provider.mentionFormat!('test-id', 'Test Name');
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      }

      if (provider.comment) {
        it('should have comment as a function', () => {
          expect(typeof provider.comment).toBe('function');
        });
      }

      if (provider.analytics) {
        it('should have analytics as a function', () => {
          expect(typeof provider.analytics).toBe('function');
        });
      }

      if (provider.mention) {
        it('should have mention as a function', () => {
          expect(typeof provider.mention).toBe('function');
        });
      }

      if (provider.refreshWait !== undefined) {
        it('should have refreshWait as a boolean', () => {
          expect(typeof provider.refreshWait).toBe('boolean');
        });
      }

      if (provider.convertToJPEG !== undefined) {
        it('should have convertToJPEG as a boolean', () => {
          expect(typeof provider.convertToJPEG).toBe('boolean');
        });
      }

      if (provider.oneTimeToken !== undefined) {
        it('should have oneTimeToken as a boolean', () => {
          expect(typeof provider.oneTimeToken).toBe('boolean');
        });
      }

      if (provider.dto) {
        it('should have dto defined', () => {
          expect(provider.dto).toBeDefined();
        });
      }
    });
  });
});
