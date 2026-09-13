import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AGENTS_DISPLAY_ORDER,
  ASSISTANTS_DISPLAY_ORDER,
  AUTOMATION_CHILD_IDS,
  FEATURED_IDS,
  buildConnectionsCatalog,
  connectionsForNav,
  defaultNavForConnection,
  findConnection,
  resolveConnectNavId,
  resolveConnectorId,
} from './connections.catalog.ts';

const catalog = buildConnectionsCatalog({
  t: (_key, fallback) => fallback,
  backendUrl: 'https://api.postqueen.ai',
  mcpUrl: 'https://api.postqueen.ai/mcp',
  apiKey: 'test-key',
});

const all = catalog.flatMap((g) => g.items);
const byId = (id: string) => {
  const found = findConnection(catalog, id);
  assert.ok(found, `missing catalog item ${id}`);
  return found;
};

describe('Connect marketplace catalog', () => {
  it('features Claude, ChatGPT, Cursor and Grok', () => {
    assert.deepEqual([...FEATURED_IDS], [
      'claude-apps',
      'chatgpt',
      'cursor',
      'grok',
    ]);
  });

  it('puts OpenClaw and Hermes first under Agents, not featured', () => {
    assert.deepEqual([...AGENTS_DISPLAY_ORDER], [
      'openclaw',
      'hermes',
      'claude-code',
      'codex',
      'muse-code',
    ]);
    assert.ok(!FEATURED_IDS.includes('openclaw' as never));
    assert.ok(!FEATURED_IDS.includes('hermes' as never));
  });

  it('keeps Assistants in search-order with Muse soon and Any MCP last', () => {
    assert.deepEqual([...ASSISTANTS_DISPLAY_ORDER], [
      'claude-apps',
      'chatgpt',
      'grok',
      'cursor',
      'gemini',
      'muse',
      'other-mcp',
    ]);
    assert.equal(byId('muse').soon, true);
    assert.equal(byId('muse-code').soon, undefined);
  });

  it('marks Make and Zapier coming soon, n8n live', () => {
    assert.deepEqual([...AUTOMATION_CHILD_IDS], [
      'n8n',
      'zapier',
      'make',
      'webhooks',
      'rss',
    ]);
    assert.equal(byId('n8n').soon, undefined);
    assert.equal(byId('n8n').exampleKind, 'workflow');
    assert.equal(byId('make').soon, true);
    assert.equal(byId('make').exampleKind, 'http');
    assert.equal(byId('zapier').soon, true);
    assert.match(byId('make').steps[1].code || '', /^Authorization: test-key$/);
    assert.doesNotMatch(byId('make').steps[1].code || '', /Bearer/);
  });

  it('uses Gemini httpUrl and ChatGPT Developer mode, not Connectors', () => {
    const gemini = byId('gemini');
    assert.match(gemini.steps.map((s) => s.code).join('\n'), /"httpUrl"/);
    assert.doesNotMatch(gemini.intro, /\burl is the streamable/);
    assert.match(gemini.intro, /httpUrl/);

    const chatgpt = byId('chatgpt');
    assert.match(chatgpt.intro, /Developer mode/);
    assert.match(chatgpt.intro, /not under Settings → Connectors/);
  });

  it('says 14 tools and points keys at API Keys', () => {
    const other = byId('other-mcp');
    assert.match(other.intro, /14 tools/);
    assert.match(other.intro, /Settings → API Keys/);
    const claude = byId('claude-apps');
    assert.match(
      claude.steps.map((s) => s.detail).join('\n'),
      /mcp-remote/
    );
  });

  it('gives Grok one card with a Bot step, Muse app no paste-MCP lie', () => {
    const grok = byId('grok');
    assert.equal(grok.method, 'MCP');
    assert.ok(grok.steps.some((s) => /Grok Bot/i.test(s.title)));
    assert.match(grok.intro, /grok\.com\/connectors/);

    const muse = byId('muse');
    assert.match(muse.intro, /not a paste-an-MCP-URL flow/i);
    assert.equal(muse.cred, 'none');
  });

  it('keeps shorts to two lines of marketplace copy', () => {
    for (const item of all) {
      assert.ok(
        item.short.length <= 72,
        `${item.id} short is ${item.short.length}: ${item.short}`
      );
    }
  });

  it('maps nav filters to the job groups', () => {
    assert.deepEqual(
      connectionsForNav(catalog, 'agents').map((c) => c.id),
      [...AGENTS_DISPLAY_ORDER]
    );
    assert.ok(
      connectionsForNav(catalog, 'assistants').some((c) => c.id === 'grok')
    );
    assert.ok(
      connectionsForNav(catalog, 'automation').some((c) => c.id === 'n8n')
    );
    assert.equal(connectionsForNav(catalog, 'api-keys').length, 0);
  });

  it('resolves legacy deep-links onto All / Agents / Build and the right card', () => {
    assert.equal(resolveConnectNavId('mcp'), 'all');
    assert.equal(resolveConnectNavId('ai-agents'), 'all');
    assert.equal(resolveConnectNavId('agent-skills'), 'agents');
    assert.equal(resolveConnectNavId('cli'), 'build');
    assert.equal(resolveConnectNavId('api'), 'build');
    assert.equal(resolveConnectNavId('assistants'), 'assistants');
    assert.equal(resolveConnectorId('claude'), 'claude-apps');
    assert.equal(resolveConnectorId('grok-bot'), 'grok');
    assert.equal(resolveConnectorId('muse-app'), 'muse');
    assert.equal(resolveConnectorId('gemini-cli'), 'gemini');
    assert.equal(defaultNavForConnection(byId('n8n')), 'automation');
    assert.equal(defaultNavForConnection(byId('openclaw')), 'agents');
    assert.equal(defaultNavForConnection(byId('chatgpt')), 'assistants');
  });
});
