import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AGENTS_DISPLAY_ORDER,
  BOTS_DISPLAY_ORDER,
  EDITORS_DISPLAY_ORDER,
  AUTOMATION_CHILD_IDS,
  FEATURED_IDS,
  ALL_PAGE_NAV_IDS,
  CONNECT_AUTOMATION_SHORTCUTS,
  CONNECT_NAV_CONNECTORS,
  CONNECT_NAV_DEVELOP,
  CONNECT_NAV_ACCOUNT,
  CONNECT_SETTINGS_EXITS,
  DEVELOP_NAV_ITEM,
  buildConnectionsCatalog,
  connectionsForNav,
  restGroupsForAllPage,
  defaultNavForConnection,
  findConnection,
  isAutomationShortcut,
  resolveConnectNavId,
  resolveConnectorId,
  settingsExitHref,
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
  it('groups Connectors leftovers by category, without repeating Featured', () => {
    assert.deepEqual([...ALL_PAGE_NAV_IDS], [
      'agents',
      'bots',
      'chat',
      'editors',
      'automation',
    ]);
    const leftover = restGroupsForAllPage(catalog);
    assert.deepEqual(
      leftover.map((g) => g.nav),
      [...ALL_PAGE_NAV_IDS]
    );
    const leftoverIds = leftover.flatMap((g) => g.items.map((c) => c.id));
    for (const id of FEATURED_IDS) {
      assert.ok(
        !leftoverIds.includes(id),
        `${id} should stay in Featured, not repeat below`
      );
    }
    assert.ok(
      leftover.find((g) => g.nav === 'agents')?.items.some((c) => c.id === 'claude-code')
    );
    assert.ok(
      leftover.find((g) => g.nav === 'bots')?.items.some((c) => c.id === 'openclaw')
    );
    assert.ok(
      leftover.find((g) => g.nav === 'editors')?.items.some((c) => c.id === 'vscode')
    );
    assert.ok(leftover.find((g) => g.nav === 'chat')?.items.some((c) => c.id === 'whatsapp'));
    assert.ok(!leftover.some((g) => g.items.some((c) => c.section === 'developer')));
    assert.ok(
      leftover.some((g) => g.items.some((c) => c.id === 'n8n')),
      'n8n stays a Connectors card and a left-rail shortcut'
    );
    assert.ok(
      !leftover.some((g) => g.items.some((c) => c.id === 'webhooks' || c.id === 'rss')),
      'Webhooks and RSS AutoPost belong on the left rail, not Connectors cards'
    );
  });

  it('features Claude, ChatGPT, Cursor and Grok', () => {
    assert.deepEqual([...FEATURED_IDS], [
      'claude-apps',
      'chatgpt',
      'cursor',
      'grok',
    ]);
  });

  it('puts coding agents under Agents, bots under Bots, editors last', () => {
    assert.deepEqual([...AGENTS_DISPLAY_ORDER], [
      'claude-code',
      'codex',
      'cursor',
      'grok-build',
      'muse-code',
    ]);
    assert.deepEqual([...BOTS_DISPLAY_ORDER], [
      'openclaw',
      'grok-bot',
      'hermes',
      'muse',
    ]);
    assert.deepEqual([...EDITORS_DISPLAY_ORDER], [
      'vscode',
      'windsurf',
      'zed',
      'gemini',
      'other-mcp',
    ]);
    assert.equal(byId('claude-code').section, 'agents');
    assert.equal(byId('codex').section, 'agents');
    assert.equal(byId('cursor').section, 'agents');
    assert.equal(byId('openclaw').section, 'bots');
    assert.equal(byId('grok-bot').section, 'bots');
    assert.equal(byId('hermes').section, 'bots');
    assert.equal(byId('muse').section, 'bots');
    assert.equal(byId('vscode').section, 'editors');
    assert.equal(byId('claude-apps').section, 'featured');
    assert.equal(byId('chatgpt').section, 'featured');
    assert.equal(byId('grok').section, 'featured');
    assert.ok(!FEATURED_IDS.includes('openclaw' as never));
    assert.ok(!FEATURED_IDS.includes('hermes' as never));
    assert.equal(byId('muse').soon, true);
    assert.equal(byId('muse-code').soon, undefined);
  });

  it('exposes Public API, CLI and Node SDK as Develop nav; Developers under Account', () => {
    assert.deepEqual(
      CONNECT_NAV_DEVELOP.map((n) => n.id),
      ['public-api', 'cli', 'sdk']
    );
    assert.deepEqual(
      CONNECT_NAV_ACCOUNT.map((n) => n.id),
      ['api-keys', 'oauth-apps', 'approved-apps']
    );
    assert.equal(CONNECT_NAV_ACCOUNT[1]?.labelDefault, 'Developers');
    assert.equal(DEVELOP_NAV_ITEM['public-api'], 'api');
    assert.equal(DEVELOP_NAV_ITEM.cli, 'cli');
    assert.equal(DEVELOP_NAV_ITEM.sdk, 'sdk');
    assert.equal(DEVELOP_NAV_ITEM['oauth-apps'], undefined);
    assert.deepEqual(
      connectionsForNav(catalog, 'public-api').map((c) => c.id),
      ['api']
    );
    assert.deepEqual(
      connectionsForNav(catalog, 'cli').map((c) => c.id),
      ['cli']
    );
    assert.equal(connectionsForNav(catalog, 'oauth-apps').length, 0);
    assert.equal(defaultNavForConnection(byId('api')), 'public-api');
    assert.equal(defaultNavForConnection(byId('cli')), 'cli');
    assert.equal(defaultNavForConnection(byId('sdk')), 'sdk');
    assert.equal(defaultNavForConnection(byId('oauth')), 'oauth-apps');
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
    assert.deepEqual(
      connectionsForNav(catalog, 'automation').map((c) => c.id),
      ['n8n', 'zapier', 'make']
    );
    assert.deepEqual(
      CONNECT_NAV_CONNECTORS.map((n) => n.id),
      ['all']
    );
    assert.equal(CONNECT_NAV_CONNECTORS[0].labelDefault, 'Connectors');
    assert.deepEqual(
      CONNECT_AUTOMATION_SHORTCUTS.map((x) => x.id),
      ['n8n', 'zapier', 'make']
    );
    assert.equal(isAutomationShortcut('n8n'), true);
    assert.equal(isAutomationShortcut('webhooks'), false);
    assert.deepEqual(
      CONNECT_SETTINGS_EXITS.map((x) => x.id),
      ['webhooks', 'rss']
    );
    assert.equal(settingsExitHref('webhooks'), '/settings?tab=webhooks');
    assert.equal(settingsExitHref('rss'), '/settings?tab=autopost');
    assert.equal(settingsExitHref('autopost'), '/settings?tab=autopost');
    assert.equal(resolveConnectorId('autopost'), 'rss');
    assert.equal(resolveConnectorId('rss-autopost'), 'rss');
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

  it('says 17 tools and points keys at API Keys', () => {
    const other = byId('other-mcp');
    assert.match(other.intro, /17 tools/);
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
    assert.equal(claude.section, 'featured');
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
    assert.equal(chatgpt.section, 'featured');
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
    assert.match(grok.intro, /Grok Bot and Grok Build are different products/);
    assert.match(grok.info || '', /does not install PostQueen on Grok Bot or Grok Build/);
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

  it('keeps Grok Build as a third Grok product with grok mcp add', () => {
    const grok = byId('grok');
    const grokBot = byId('grok-bot');
    const grokBuild = byId('grok-build');
    assert.equal(grok.section, 'featured');
    assert.equal(grokBot.section, 'bots');
    assert.equal(grokBuild.section, 'agents');
    assert.ok(!FEATURED_IDS.includes('grok-build' as never));
    assert.match(grok.intro, /Grok Build are different products/);
    assert.match(grokBot.intro, /not Grok Build/);
    assert.match(grokBuild.intro, /not grok\.com chat and not Grok Bot/);
    assert.match(grokBuild.intro, /Claude Code vs Claude/);
    assert.match(
      grokBuild.steps.map((s) => s.code || '').join('\n'),
      /grok mcp add --transport http/
    );
    assert.match(grokBuild.info || '', /does not replace grok mcp add/);
    assert.doesNotMatch(grokBuild.intro, /grok\.com\/connectors first/);
    assert.equal(resolveConnectorId('grok-build'), 'grok-build');
    assert.equal(resolveConnectorId('grok-cli'), 'grok-build');
    assert.equal(resolveConnectorId('grok build'), 'grok-build');
  });

  it('uses the official VS Code, Windsurf and Zed JSON keys, not Cursor mcpServers', () => {
    const vscode = byId('vscode');
    const windsurf = byId('windsurf');
    const zed = byId('zed');
    const vscodeJson = vscode.steps.map((s) => s.code || '').join('\n');
    const windsurfJson = windsurf.steps.map((s) => s.code || '').join('\n');
    const zedJson = zed.steps.map((s) => s.code || '').join('\n');

    assert.match(vscodeJson, /"servers"/);
    assert.match(vscodeJson, /"type": "http"/);
    assert.doesNotMatch(vscodeJson, /mcpServers/);
    assert.match(vscode.intro, /not Cursor/);
    assert.match(vscode.info || '', /Copilot CLI is a different product/);

    assert.match(windsurfJson, /"serverUrl"/);
    assert.match(windsurf.intro, /mcp_config\.json/);
    assert.match(windsurf.info || '', /Devin Local/);

    assert.match(zedJson, /"context_servers"/);
    assert.match(zedJson, /Authorization/);
    assert.doesNotMatch(zedJson, /mcpServers/);
    assert.match(zed.intro, /context_servers/);
    assert.doesNotMatch(zed.intro, /OAuth/);
    assert.match(zed.info || '', /OAuth/);
    assert.match(zed.info || '', /not that flow/);
    assert.match(zed.info || '', /not enough on its own/);

    const other = byId('other-mcp');
    assert.match(other.note || '', /Cline, Continue, Goose/);
    assert.match(other.intro, /17 tools/);
    assert.equal(resolveConnectorId('vs-code'), 'vscode');
    assert.equal(resolveConnectorId('cascade'), 'windsurf');
    assert.equal(resolveConnectorId('zed'), 'zed');
  });

  it('matches chat-channel docs: CLI first, then per-app pairing', () => {
    const whatsapp = byId('whatsapp');
    const telegram = byId('telegram');
    const slack = byId('slack-chat');
    const discord = byId('discord-chat');
    const whatsappText = whatsapp.steps
      .map((s) => `${s.detail || ''} ${s.code || ''}`)
      .join('\n');
    const telegramText = telegram.steps
      .map((s) => `${s.detail || ''} ${s.code || ''}`)
      .join('\n');
    const slackText = slack.steps
      .map((s) => `${s.detail || ''} ${s.code || ''}`)
      .join('\n');
    const discordText = discord.steps
      .map((s) => `${s.detail || ''} ${s.code || ''}`)
      .join('\n');

    assert.match(whatsappText, /npm install -g postqueen/);
    assert.match(whatsappText, /channels add --channel whatsapp/);
    assert.match(whatsappText, /channels login --channel whatsapp/);
    assert.match(telegramText, /BotFather/);
    assert.match(telegramText, /TELEGRAM_BOT_TOKEN/);
    assert.match(slackText, /@openclaw\/slack/);
    assert.match(discordText, /Message Content Intent/);
    assert.match(discordText, /@openclaw\/discord/);
    assert.equal(discord.examples?.[0]?.tool, undefined);
    assert.match(discord.examples?.[0]?.code || '', /posts:create/);
  });

  it('installs the CLI for skill bots and does not pretend they speak MCP', () => {
    const openclaw = byId('openclaw');
    const hermes = byId('hermes');
    assert.match(
      openclaw.steps.map((s) => s.code || '').join('\n'),
      /npm install -g postqueen/
    );
    assert.match(
      openclaw.steps.map((s) => s.code || '').join('\n'),
      /openclaw onboard/
    );
    assert.equal(openclaw.examples?.[0]?.tool, undefined);
    assert.match(openclaw.examples?.[0]?.code || '', /posts:create/);
    assert.equal(
      hermes.steps.find((s) => s.title === 'Check it worked')?.code,
      'postqueen integrations:list'
    );
    assert.doesNotMatch(
      hermes.steps.map((s) => s.code || '').join('\n'),
      /hermes tools list/
    );
    assert.match(
      hermes.steps.map((s) => s.code || '').join('\n'),
      /external_dirs/
    );
    assert.equal(hermes.examples?.[0]?.tool, undefined);
  });

  it('states CLI, API and OAuth capabilities without mixing surfaces', () => {
    assert.match(byId('cli').intro, /16 commands/);
    assert.match(byId('cli').intro, /does not generate video/);
    assert.match(byId('api').intro, /generate video/);
    assert.match(byId('api').intro, /Image generation is MCP only/);
    assert.match(byId('oauth').intro, /pos_/);
    assert.match(byId('oauth').intro, /Bearer token on \/mcp/);
    assert.doesNotMatch(byId('oauth').intro, / and the CLI/);
    assert.match(byId('zapier').intro, /Professional/);
    assert.match(
      byId('codex').steps.map((s) => s.code || '').join('\n'),
      /codex mcp add postqueen --url/
    );
    assert.equal(
      byId('gemini').steps.find((s) => s.title === 'Check it worked')?.code,
      '/mcp'
    );
  });

  it('marks Muse app no paste-MCP lie', () => {
    const muse = byId('muse');
    assert.match(muse.intro, /not a paste-an-MCP-URL flow/i);
    assert.equal(muse.cred, 'none');
  });

  it('keeps catalog shorts dash-free for search, without a card-length cap', () => {
    for (const item of all) {
      assert.ok(item.short.length > 0, `${item.id} is missing a short`);
      assert.doesNotMatch(
        item.short,
        /[—–]| - /,
        `${item.id} short has a dash: ${item.short}`
      );
    }
    assert.match(byId('openclaw').short, /bot you host/i);
    assert.doesNotMatch(byId('openclaw').short, /terminal/i);
    assert.doesNotMatch(byId('openclaw').intro, /from your terminal/i);
    assert.match(byId('openclaw').intro, /WhatsApp/);
    for (const item of all) {
      assert.doesNotMatch(
        item.intro,
        /[—–]| - /,
        `${item.id} intro has a dash: ${item.intro}`
      );
    }
  });

  it('shows a surface-matched usage example, not the same three chat bubbles', () => {
    assert.equal(byId('claude-apps').exampleKind, 'chat');
    assert.equal(byId('chatgpt').exampleKind, 'chat');
    assert.equal(byId('openclaw').exampleKind, 'bot');
    assert.equal(byId('whatsapp').exampleKind, 'bot');
    assert.equal(byId('cursor').exampleKind, 'agent');
    assert.equal(byId('vscode').exampleKind, 'agent');
    assert.equal(byId('claude-code').exampleKind, 'cli');
    assert.equal(byId('codex').exampleKind, 'cli');
    assert.equal(byId('cli').exampleKind, 'cli');
    assert.equal(byId('sdk').exampleKind, 'api');
    assert.equal(byId('muse-code').exampleKind, 'agent');

    assert.equal(byId('claude-code').examples?.[0]?.code, 'claude');
    assert.doesNotMatch(byId('claude-code').examples?.[0]?.code || '', /mcp list/);
    assert.equal(byId('grok-build').examples?.[0]?.code, 'grok');
    assert.match(byId('codex').examples?.[0]?.code || '', /^codex "/);
    assert.equal(byId('cli').examples?.[0]?.code, 'postqueen integrations:list');
    assert.match(byId('sdk').examples?.[0]?.code || '', /new PostQueen/);
    assert.ok(!byId('muse').examples?.length);
    assert.ok(!byId('oauth').examples?.length);

    const bodies = all
      .flatMap((item) => (item.examples || []).map((ex) => `${item.id}:${ex.body}`));
    const justBodies = all.flatMap((item) => (item.examples || []).map((ex) => ex.body));
    const dupes = justBodies.filter((b, i) => justBodies.indexOf(b) !== i);
    assert.deepEqual(dupes, [], `duplicate example bodies: ${dupes.join(', ')}`);
    assert.ok(
      (byId('whatsapp').examples?.length || 0) >= 3,
      'WhatsApp should show several sample messages'
    );
    assert.deepEqual(
      (byId('whatsapp').examples || []).map((e) => e.title),
      ['One channel: Instagram', 'One channel: X', 'Several channels']
    );
    const wa = (byId('whatsapp').examples || []).map((e) => `${e.body} ${e.reply}`).join('\n');
    assert.match(wa, /Voice note/);
    assert.match(wa, /Instagram/);
    assert.match(wa, /\bX\b/);
    assert.match(wa, /LinkedIn/);
    const igOnly = (byId('whatsapp').examples || []).filter((e) =>
      /Instagram/i.test(`${e.body} ${e.reply}`) && !/\bX\b/.test(e.body) && !/LinkedIn/.test(e.body)
    );
    assert.ok(igOnly.length >= 1, 'one WhatsApp sample should be Instagram only');
    const xOnly = (byId('whatsapp').examples || []).filter((e) =>
      /\bX\b/.test(e.body) && !/Instagram/.test(e.body) && !/LinkedIn/.test(e.body)
    );
    assert.ok(xOnly.length >= 1, 'one WhatsApp sample should be X only');
    const multi = (byId('whatsapp').examples || []).filter((e) =>
      /Instagram/.test(e.body) && /\bX\b/.test(e.body) && /LinkedIn/.test(e.body)
    );
    assert.ok(multi.length >= 1, 'one WhatsApp sample should name several channels');
    const talkers = all.filter((c) =>
      ['chat', 'bot', 'agent', 'cli'].includes(c.exampleKind) && (c.examples?.length || 0) > 0
    );
    for (const item of talkers) {
      if (item.id === 'cli' || item.id === 'api' || item.id === 'sdk') continue;
      assert.ok(
        (item.examples?.length || 0) >= 3,
        `${item.id} should show three samples, not one LinkedIn bubble`
      );
      const titles = (item.examples || []).map((e) => e.title || '').join(' | ');
      assert.match(titles, /Instagram|X|Several|calendar/i, `${item.id} samples need labeled jobs`);
    }
    for (const item of all) {
      for (const ex of item.examples || []) {
        assert.doesNotMatch(
          `${ex.body} ${ex.reply || ''}`,
          /[—–]| - /,
          `${item.id} example has a dash`
        );
        assert.doesNotMatch(
          `${ex.title || ''} ${ex.body} ${ex.reply || ''}`,
          /changelog|CHANGELOG|GitHub Release|README|PR title/i,
          `${item.id} example still sounds like a developer changelog`
        );
      }
    }
  });

  it('example replies answer the prompt, they do not teach which product this is', () => {
    const banned =
      /not Claude Code|not Codex|not ChatGPT|not Grok Build|not grok\.com|not Cursor|not the consumer Muse|Enable PostQueen from|Settings then Apps|Claude chat, not|ChatGPT web, not|Grok chat, not|Grok Bot, not|Muse Code, not|Agent mode, not|VS Code Copilot, not|Windsurf Cascade, not|used schedulePostTool|used the skill|used the public MCP|JSON shape for the client|Same MCP URL as|Cline, Continue, Goose|httpUrl in settings|Bearer header, not only|mcp\.json|connectors form|Write tools can stay blocked|Claude Code used|grok mcp add registered/i;
    for (const item of all) {
      if (item.id === 'cli' || item.id === 'api' || item.id === 'sdk') continue;
      for (const ex of item.examples || []) {
        if (!ex.reply) continue;
        assert.doesNotMatch(
          ex.reply,
          banned,
          `${item.id} reply still talks about the product: ${ex.reply}`
        );
      }
    }
    const claudeIg = (byId('claude-apps').examples || []).find((e) =>
      /sunny terrace/i.test(e.body)
    );
    assert.match(claudeIg?.reply || '', /terrace/i);
    assert.match(claudeIg?.reply || '', /Instagram/i);
    assert.match(claudeIg?.reply || '', /19:00/);
    const claudeMulti = (byId('claude-apps').examples || []).find((e) =>
      /LinkedIn/.test(e.body)
    );
    assert.match(claudeMulti?.reply || '', /Instagram/);
    assert.match(claudeMulti?.reply || '', /\bX\b/);
    assert.match(claudeMulti?.reply || '', /LinkedIn/);
    assert.doesNotMatch(claudeMulti?.reply || '', /Claude Code/i);
  });

  it('maps nav filters to the job groups', () => {
    assert.deepEqual(
      connectionsForNav(catalog, 'agents').map((c) => c.id),
      [...AGENTS_DISPLAY_ORDER]
    );
    assert.deepEqual(
      connectionsForNav(catalog, 'bots').map((c) => c.id),
      [...BOTS_DISPLAY_ORDER]
    );
    assert.deepEqual(
      connectionsForNav(catalog, 'editors').map((c) => c.id),
      [...EDITORS_DISPLAY_ORDER]
    );
    assert.ok(
      connectionsForNav(catalog, 'automation').some((c) => c.id === 'n8n')
    );
    assert.equal(connectionsForNav(catalog, 'api-keys').length, 0);
  });

  it('resolves legacy deep-links onto Connectors / Develop and the right card', () => {
    assert.equal(resolveConnectNavId('mcp'), 'all');
    assert.equal(resolveConnectNavId('ai-agents'), 'all');
    assert.equal(resolveConnectNavId('assistants'), 'all');
    assert.equal(resolveConnectNavId('agent-skills'), 'all');
    assert.equal(resolveConnectNavId('agents'), 'all');
    assert.equal(resolveConnectNavId('bots'), 'all');
    assert.equal(resolveConnectNavId('automation'), 'all');
    assert.equal(resolveConnectNavId('cli'), 'cli');
    assert.equal(resolveConnectNavId('api'), 'public-api');
    assert.equal(resolveConnectNavId('build'), 'public-api');
    assert.equal(resolveConnectNavId('developers'), 'oauth-apps');
    assert.equal(resolveConnectorId('claude'), 'claude-apps');
    assert.equal(resolveConnectorId('grok-bot'), 'grok-bot');
    assert.equal(resolveConnectorId('muse-app'), 'muse');
    assert.equal(resolveConnectorId('gemini-cli'), 'gemini');
    assert.equal(defaultNavForConnection(byId('n8n')), 'all');
    assert.equal(defaultNavForConnection(byId('openclaw')), 'all');
    assert.equal(defaultNavForConnection(byId('chatgpt')), 'all');
    assert.equal(defaultNavForConnection(byId('claude-code')), 'all');
    assert.equal(defaultNavForConnection(byId('vscode')), 'all');
  });
});
