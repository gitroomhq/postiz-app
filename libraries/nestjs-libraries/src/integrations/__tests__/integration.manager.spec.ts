import './setup';
import 'reflect-metadata';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';

const PROVIDER_COUNT = socialIntegrationList.length;

describe('IntegrationManager', () => {
  let manager: IntegrationManager;

  beforeAll(() => {
    manager = new IntegrationManager();
  });

  describe('Provider registry', () => {
    it('should have all providers registered (at least 30)', () => {
      expect(PROVIDER_COUNT).toBeGreaterThanOrEqual(30);
    });

    it('should have no duplicate identifiers', () => {
      const identifiers = socialIntegrationList.map((p) => p.identifier);
      const uniqueIdentifiers = new Set(identifiers);
      expect(uniqueIdentifiers.size).toBe(identifiers.length);
    });

    it('should have no duplicate names', () => {
      const names = socialIntegrationList.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('getSocialIntegration()', () => {
    it('should return correct provider for known identifier', () => {
      const provider = manager.getSocialIntegration('linkedin');
      expect(provider).toBeDefined();
      expect(provider.identifier).toBe('linkedin');
    });

    it('should return correct provider for x', () => {
      const provider = manager.getSocialIntegration('x');
      expect(provider).toBeDefined();
      expect(provider.identifier).toBe('x');
    });

    it('should return correct provider for discord', () => {
      const provider = manager.getSocialIntegration('discord');
      expect(provider).toBeDefined();
      expect(provider.identifier).toBe('discord');
    });

    it('should return undefined for unknown identifier', () => {
      const provider = manager.getSocialIntegration('nonexistent');
      expect(provider).toBeUndefined();
    });
  });

  describe('getAllIntegrations()', () => {
    it('should return social array with name, identifier, and editor', async () => {
      const integrations = await manager.getAllIntegrations();
      expect(integrations.social).toBeDefined();
      expect(Array.isArray(integrations.social)).toBe(true);
      expect(integrations.social.length).toBe(PROVIDER_COUNT);

      integrations.social.forEach((item) => {
        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');
        expect(item.identifier).toBeDefined();
        expect(typeof item.identifier).toBe('string');
        expect(item.editor).toBeDefined();
      });
    });

    it('should return empty article array', async () => {
      const integrations = await manager.getAllIntegrations();
      expect(integrations.article).toEqual([]);
    });
  });

  describe('getAllowedSocialsIntegrations()', () => {
    it('should return 31 identifier strings', () => {
      const allowed = manager.getAllowedSocialsIntegrations();
      expect(allowed.length).toBe(PROVIDER_COUNT);
      allowed.forEach((id) => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });

    it('should include known providers', () => {
      const allowed = manager.getAllowedSocialsIntegrations();
      expect(allowed).toContain('x');
      expect(allowed).toContain('linkedin');
      expect(allowed).toContain('discord');
      expect(allowed).toContain('tiktok');
      expect(allowed).toContain('facebook');
      expect(allowed).toContain('instagram');
    });
  });

  describe('getAllTools()', () => {
    it('should return an object with provider identifiers as keys', () => {
      const tools = manager.getAllTools();
      expect(typeof tools).toBe('object');
      expect(Object.keys(tools).length).toBe(PROVIDER_COUNT);
    });

    it('should include discord channels tool', () => {
      const tools = manager.getAllTools();
      expect(tools['discord']).toBeDefined();
      expect(Array.isArray(tools['discord'])).toBe(true);
      const channelsTool = tools['discord'].find(
        (t) => t.methodName === 'channels'
      );
      expect(channelsTool).toBeDefined();
      expect(channelsTool!.description).toBe('Channels');
    });

    it('should return empty array for providers without tools', () => {
      const tools = manager.getAllTools();
      // LinkedIn doesn't have @Tool decorators
      expect(tools['linkedin']).toEqual([]);
    });
  });

  describe('getAllRulesDescription()', () => {
    it('should return an object with provider identifiers as keys', () => {
      const rules = manager.getAllRulesDescription();
      expect(typeof rules).toBe('object');
    });

    it('should include X rules description', () => {
      const rules = manager.getAllRulesDescription();
      expect(rules['x']).toBeDefined();
      expect(rules['x'].length).toBeGreaterThan(0);
      expect(rules['x']).toContain('X can have maximum 4 pictures');
    });

    it('should include LinkedIn rules description', () => {
      const rules = manager.getAllRulesDescription();
      expect(rules['linkedin']).toBeDefined();
      expect(rules['linkedin']).toContain('LinkedIn');
    });

    it('should return empty string for providers without @Rules', () => {
      const rules = manager.getAllRulesDescription();
      // Discord has no @Rules decorator
      expect(rules['discord']).toBe('');
    });
  });

  describe('getAllPlugs()', () => {
    it('should return array of providers with @Plug decorators', () => {
      const plugs = manager.getAllPlugs();
      expect(Array.isArray(plugs)).toBe(true);
      expect(plugs.length).toBeGreaterThan(0);
    });

    it('should have correct structure for each plug entry', () => {
      const plugs = manager.getAllPlugs();
      plugs.forEach((entry) => {
        expect(entry.name).toBeDefined();
        expect(entry.identifier).toBeDefined();
        expect(Array.isArray(entry.plugs)).toBe(true);
        entry.plugs.forEach((plug: any) => {
          expect(plug.identifier).toBeDefined();
          expect(plug.title).toBeDefined();
          expect(plug.description).toBeDefined();
        });
      });
    });

    it('should include X provider plugs', () => {
      const plugs = manager.getAllPlugs();
      const xPlugs = plugs.find((p) => p.identifier === 'x');
      expect(xPlugs).toBeDefined();
      expect(xPlugs!.plugs.length).toBeGreaterThan(0);
    });
  });
});
