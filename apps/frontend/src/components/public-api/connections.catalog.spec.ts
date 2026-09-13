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
      'grok-bot',
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

  it('uses Gemini httpUrl and ChatGPT Apps Create, not Connectors or Plugins', () => {
    const gemini = byId('gemini');
    assert.match(gemini.steps.map((s) => s.code).join('\n'), /"httpUrl"/);
    assert.doesNotMatch(gemini.intro, /\burl is the streamable/);
    assert.match(gemini.intro, /httpUrl/);
    assert.match(gemini.intro, /not gemini\.google\.com/);

    const chatgpt = byId('chatgpt');
    assert.match(chatgpt.intro, /Developer mode/);
    assert.match(chatgpt.intro, /Settings → Apps/);
    assert.match(chatgpt.intro, /not Settings → Connectors/);
    assert.match(
      chatgpt.steps.map((s) => s.detail).join('\n'),
      /Apps → Create/
    );
    assert.match(chatgpt.info || '', /schedulePostTool may stay blocked/);
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
    assert.equal(claude.docs.length, 1);
    assert.match(claude.docs[0].href, /\/mcp\/clients\/claude$/);
    assert.ok(!claude.docs.some((d) => /hub/i.test(d.label)));
    assert.ok(!(claude.paths || []).length);
    const claudeHrefs = claude.docs.map((d) => d.href).join('\n');
    assert.doesNotMatch(
      claudeHrefs,
      /claude\.com\/connectors|claude\.ai\/directory/
    );
    assert.match(claude.intro, /not in Anthropic/);
    assert.match(claude.info || '', /Not listed at claude\.com\/connectors/);
  });

  it('keeps Claude chat and Claude Code as separate products', () => {
    const claude = byId('claude-apps');
    const code = byId('claude-code');
    assert.equal(claude.section, 'assistants');
    assert.equal(code.section, 'agents');
    assert.ok(!FEATURED_IDS.includes('claude-code' as never));
    assert.match(claude.intro, /Claude Code is a different product/);
    assert.match(claude.intro, /Codex vs ChatGPT/);
    assert.match(claude.info || '', /does not install Claude Code/);
    assert.ok(!claude.steps.some((s) => /claude mcp add/i.test(s.code || '')));
    assert.match(code.intro, /not claude\.ai or Claude Desktop/);
    assert.match(code.intro, /Codex vs ChatGPT/);
    assert.match(
      code.steps.map((s) => s.code || '').join('\n'),
      /claude mcp add --transport http/
    );
    assert.match(code.info || '', /claude_desktop_config\.json/);
    assert.match(code.info || '', /does not replace that command/);
    assert.equal(resolveConnectorId('claude-code'), 'claude-code');
    assert.equal(resolveConnectorId('claude code'), 'claude-code');
  });

  it('keeps ChatGPT and Codex as separate products', () => {
    const chatgpt = byId('chatgpt');
    const codex = byId('codex');
    assert.equal(chatgpt.section, 'assistants');
    assert.equal(codex.section, 'agents');
    assert.match(chatgpt.intro, /Codex is a different product/);
    assert.match(chatgpt.info || '', /does not install Codex/);
    assert.match(codex.intro, /not ChatGPT/);
  });

  it('keeps Grok chat and Grok Bot as separate products', () => {
    const grok = byId('grok');
    const grokBot = byId('grok-bot');
    assert.equal(grok.method, 'MCP');
    assert.equal(grokBot.method, 'MCP');
    assert.ok(!grok.steps.some((s) => /Grok Bot/i.test(s.title)));
    assert.match(grok.intro, /Grok Bot is a different product/);
    assert.match(grok.info || '', /does not install PostQueen on Grok Bot/);
    assert.match(grok.steps.map((s) => s.detail).join('\n'), /grok\.com\/connectors/);
    assert.match(grokBot.intro, /not grok\.com chat/);
    assert.doesNotMatch(grokBot.intro, /grok\.com\/connectors first/);
    assert.match(
      grokBot.steps.map((s) => s.detail).join('\n'),
      /Add this MCP server/
    );
    assert.match(grokBot.info || '', /not a Grok Bot marketplace plugin/);
    assert.equal(resolveConnectorId('grok-bot'), 'grok-bot');
  });

  it('marks Muse app no paste-MCP lie', () => {
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
    assert.equal(resolveConnectorId('grok-bot'), 'grok-bot');
    assert.equal(resolveConnectorId('muse-app'), 'muse');
    assert.equal(resolveConnectorId('gemini-cli'), 'gemini');
    assert.equal(defaultNavForConnection(byId('n8n')), 'automation');
    assert.equal(defaultNavForConnection(byId('openclaw')), 'agents');
    assert.equal(defaultNavForConnection(byId('chatgpt')), 'assistants');
  });
});
