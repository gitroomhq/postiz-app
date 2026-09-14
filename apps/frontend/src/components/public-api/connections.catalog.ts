/**
 * Static Connections catalog, docs-backed, not an API.
 *
 * Publishing channels live on Channels / Add Channel. This catalog covers
 * coding agents, bots, chat front doors, editors, automation, Public API / CLI
 * / Node SDK / OAuth apps, and third-party media. Code samples interpolate
 * backendUrl / mcpUrl / apiKey at build time.
 *
 * Do not invent MCP commands for OpenClaw/Hermes, they use Agent Skills.
 * Do not invent Typefully commands.
 */

export type Kind = 'AGENT' | 'CHAT' | 'MCP' | 'SKILL' | 'FLOW' | 'API' | 'MEDIA';

/** How the connector talks to PostQueen. Shown on the detail pane, not the hub card. */
export type MethodId = 'MCP' | 'Skill' | 'Chat' | 'HTTP' | 'CLI' | 'API';

/** How examples render in the detail pane. */
export type ExampleKind =
  | 'chat'
  | 'bot'
  | 'agent'
  | 'workflow'
  | 'http'
  | 'cli'
  | 'api';

/** Credential the detail pane highlights. */
export type CredKind = 'mcp' | 'api' | 'env' | 'none';

/** Catalog group ids. */
export type SectionId =
  | 'agents'
  | 'bots'
  | 'chat'
  | 'featured'
  | 'editors'
  | 'automation'
  | 'developer'
  | 'media';

export type ConnectNavId =
  | 'all'
  | 'agents'
  | 'bots'
  | 'chat'
  | 'editors'
  | 'automation'
  | 'public-api'
  | 'cli'
  | 'sdk'
  | 'oauth-apps'
  | 'api-keys'
  | 'approved-apps';

/** Automation catalog ids, in display order. */
export const AUTOMATION_CHILD_IDS = [
  'n8n',
  'zapier',
  'make',
  'webhooks',
  'rss',
] as const;

export type AutomationChildId = (typeof AUTOMATION_CHILD_IDS)[number];

/** Featured marketplace row on All. */
export const FEATURED_IDS = [
  'claude-apps',
  'chatgpt',
  'cursor',
  'grok',
] as const;

/** Category order on the Connectors hub, after Featured. */
export const ALL_PAGE_NAV_IDS = [
  'agents',
  'bots',
  'chat',
  'editors',
  'automation',
] as const;

export const AGENTS_DISPLAY_ORDER = [
  'claude-code',
  'codex',
  'cursor',
  'grok-build',
  'muse-code',
] as const;

export const BOTS_DISPLAY_ORDER = [
  'openclaw',
  'grok-bot',
  'hermes',
  'muse',
] as const;

export const EDITORS_DISPLAY_ORDER = [
  'vscode',
  'windsurf',
  'zed',
  'gemini',
  'other-mcp',
] as const;

function sortByIdOrder(
  items: Connection[],
  order: readonly string[]
): Connection[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ai = rank.get(a.id) ?? order.length;
    const bi = rank.get(b.id) ?? order.length;
    return ai - bi;
  });
}

export interface Step {
  title: string;
  detail?: string;
  code?: string;
}

export interface DocLink {
  label: string;
  href: string;
}

export interface Example {
  title?: string;
  /** What you type, say, or send. */
  body: string;
  /** Shell command or code sample. */
  code?: string;
  /** Tool the client would call, shown as a chip. */
  tool?: string;
  /** What comes back: assistant line, stdout, or a short result. */
  reply?: string;
}

export interface Connection {
  id: string;
  name: string;
  glyph: string;
  /** Local icon under /icons/connections or /icons/third-party. */
  icon?: string;
  kind: Kind;
  method: MethodId;
  cred: CredKind;
  exampleKind: ExampleKind;
  section: SectionId;
  short: string;
  intro: string;
  examples?: Example[];
  info?: string;
  note?: string;
  soon?: boolean;
  docs: DocLink[];
  paths?: DocLink[];
  steps: Step[];
}

export interface Group {
  id: SectionId;
  label: string;
  blurb: string;
  items: Connection[];
}

export const KIND_STYLE: Record<Kind, string> = {
  AGENT: 'bg-pqBrandSoft text-pqFocused',
  CHAT: 'bg-pqBrandFaint text-pqBrand',
  MCP: 'bg-pqOkSoft text-pqOk',
  SKILL: 'bg-pqBrandSoft text-pqBrand',
  FLOW: 'bg-pqAmberSoft text-pqAmber',
  API: 'bg-pqBtnSimple text-pqSoft',
  MEDIA: 'bg-pqBrandFaint text-pqFocused',
};

export const METHOD_STYLE: Record<MethodId, string> = {
  MCP: 'bg-pqOkSoft text-pqOk',
  Skill: 'bg-pqBrandSoft text-pqBrand',
  Chat: 'bg-pqBrandFaint text-pqBrand',
  HTTP: 'bg-pqAmberSoft text-pqAmber',
  CLI: 'bg-pqBtnSimple text-pqSoft',
  API: 'bg-pqBtnSimple text-pqSoft',
};

export type CatalogTranslate = (key: string, defaultValue: string) => string;

export type ConnectionsCatalogContext = {
  t: CatalogTranslate;
  backendUrl: string;
  mcpUrl: string;
  apiKey?: string;
  apiKeyMasked?: string;
  apiUrl?: string;
};

export const absoluteApiUrl = (backendUrl: string) => {
  try {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(backendUrl || '/api', origin).toString().replace(/\/$/, '');
  } catch {
    return backendUrl;
  }
};

export const needsApiUrl = (apiUrl: string) => {
  try {
    return !/(^|\.)postqueen\.ai$/.test(new URL(apiUrl).hostname);
  } catch {
    return true;
  }
};

/**
 * Left-rail Connectors group. One row (labeled Connectors, not All) opens the
 * marketplace. Agents / Bots / Chat / Editors are headings inside that panel,
 * not extra rail rows.
 */
export const CONNECT_NAV_CONNECTORS: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
}[] = [
  {
    id: 'all',
    labelKey: 'connect_nav_all',
    labelDefault: 'Connectors',
  },
];

/**
 * n8n, Zapier and Make stay catalog cards (they have real setup). The rail
 * opens those cards the same way Webhooks / RSS leave to Settings.
 */
export const CONNECT_AUTOMATION_SHORTCUTS: {
  id: 'n8n' | 'zapier' | 'make';
  icon: string;
  name: string;
  soon?: boolean;
}[] = [
  { id: 'n8n', icon: '/icons/connections/n8n.svg', name: 'n8n' },
  {
    id: 'zapier',
    icon: '/icons/connections/zapier.svg',
    name: 'Zapier',
    soon: true,
  },
  {
    id: 'make',
    icon: '/icons/connections/make.svg',
    name: 'Make',
    soon: true,
  },
];

export function isAutomationShortcut(id: string): boolean {
  return CONNECT_AUTOMATION_SHORTCUTS.some((item) => item.id === id);
}

export const CONNECT_NAV_DEVELOP: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
}[] = [
  {
    id: 'public-api',
    labelKey: 'connect_nav_public_api',
    labelDefault: 'Public API',
  },
  { id: 'cli', labelKey: 'connect_nav_cli', labelDefault: 'CLI' },
  { id: 'sdk', labelKey: 'connect_nav_sdk', labelDefault: 'Node SDK' },
];

export const CONNECT_NAV_ACCOUNT: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
}[] = [
  {
    id: 'api-keys',
    labelKey: 'connect_nav_api_keys',
    labelDefault: 'API Keys',
  },
  {
    id: 'oauth-apps',
    labelKey: 'developers',
    labelDefault: 'Developers',
  },
  {
    id: 'approved-apps',
    labelKey: 'connect_nav_approved_apps',
    labelDefault: 'Approved Apps',
  },
];

/**
 * Left-rail rows that leave Connect and open a Settings tab.
 * Webhooks and RSS AutoPost are not catalog cards: the overlay would only
 * tell you to open Settings.
 */
export const CONNECT_SETTINGS_EXITS: {
  id: string;
  href: string;
  labelKey: string;
  labelDefault: string;
}[] = [
  {
    id: 'webhooks',
    href: '/settings?tab=webhooks',
    labelKey: 'conn_webhooks_name',
    labelDefault: 'Webhooks',
  },
  {
    id: 'rss',
    href: '/settings?tab=autopost',
    labelKey: 'conn_rss_name',
    labelDefault: 'RSS AutoPost',
  },
];

export const SETTINGS_EXIT_HREF: Record<string, string> = {
  webhooks: '/settings?tab=webhooks',
  rss: '/settings?tab=autopost',
  autopost: '/settings?tab=autopost',
};

export function settingsExitHref(id: string): string | undefined {
  return SETTINGS_EXIT_HREF[id];
}

export const CONNECT_NAV = [
  ...CONNECT_NAV_CONNECTORS,
  ...CONNECT_NAV_DEVELOP,
  ...CONNECT_NAV_ACCOUNT,
];

/** Left-nav Develop rows that open a catalog item instead of a card grid. */
export const DEVELOP_NAV_ITEM: Partial<Record<ConnectNavId, string>> = {
  'public-api': 'api',
  cli: 'cli',
  sdk: 'sdk',
};

/** Deep-link aliases → catalog ids (`?connector=claude`). */
export const CONNECTOR_ALIASES: Record<string, string> = {
  claude: 'claude-apps',
  'claude-desktop': 'claude-apps',
  'claude-app': 'claude-apps',
  'claude-web': 'claude-apps',
  claudecode: 'claude-code',
  'claude code': 'claude-code',
  slack: 'slack-chat',
  discord: 'discord-chat',
  'gemini-cli': 'gemini',
  'other-clients': 'other-mcp',
  'any-mcp': 'other-mcp',
  'make.com': 'make',
  autopost: 'rss',
  'rss-autopost': 'rss',
  grokbot: 'grok-bot',
  'grok bot': 'grok-bot',
  grokbuild: 'grok-build',
  'grok-cli': 'grok-build',
  'grok build': 'grok-build',
  vscode: 'vscode',
  'vs-code': 'vscode',
  'vs code': 'vscode',
  windsurf: 'windsurf',
  cascade: 'windsurf',
  zed: 'zed',
  xai: 'grok',
  'muse-app': 'muse',
};

export function resolveConnectorId(raw: string | null): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return CONNECTOR_ALIASES[key] || key;
}

/** Legacy `?nav=` aliases + current ConnectNavId values. */
export function resolveConnectNavId(raw: string | null): ConnectNavId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'cli-api' || key === 'build' || key === 'api') return 'public-api';
  if (
    key === 'media' ||
    key === 'ai-agents' ||
    key === 'mcp' ||
    key === 'assistants' ||
    key === 'agent-skills' ||
    (ALL_PAGE_NAV_IDS as readonly string[]).includes(key)
  ) {
    return 'all';
  }
  if (key === 'developers') return 'oauth-apps';
  if (CONNECT_NAV.some((n) => n.id === key)) return key as ConnectNavId;
  return null;
}

const DOCS = 'https://docs.postqueen.ai';

const HUB_SECTIONS: SectionId[] = [
  'agents',
  'bots',
  'chat',
  'featured',
  'editors',
  'automation',
];

/**
 * Remaining cards on Connectors, grouped by category. Featured ids are omitted.
 * Develop (Public API, CLI, Node SDK) and Account (API Keys, Developers,
 * Approved Apps) rows are
 * panel-only. n8n / Zapier / Make are both grouped here and left-rail
 * shortcuts. Webhooks and RSS AutoPost are left-rail Settings exits, not
 * cards. Media stays in the catalog but is not a Connect nav.
 */
export function restGroupsForAllPage(
  groups: Group[]
): { nav: (typeof ALL_PAGE_NAV_IDS)[number]; items: Connection[] }[] {
  const featured = new Set<string>(FEATURED_IDS);
  return ALL_PAGE_NAV_IDS.map((nav) => ({
    nav,
    items: connectionsForNav(groups, nav).filter((c) => !featured.has(c.id)),
  })).filter((g) => g.items.length > 0);
}

/** Connections for a Connect-panel nav id. */
export function connectionsForNav(
  groups: Group[],
  navId: ConnectNavId
): Connection[] {
  const all = groups.flatMap((g) => g.items);
  const hubCard = (c: Connection) => !SETTINGS_EXIT_HREF[c.id];
  switch (navId) {
    case 'all':
      return all.filter((c) => HUB_SECTIONS.includes(c.section) && hubCard(c));
    case 'agents':
      return sortByIdOrder(
        all.filter((c) => c.section === 'agents'),
        AGENTS_DISPLAY_ORDER
      );
    case 'bots':
      return sortByIdOrder(
        all.filter((c) => c.section === 'bots'),
        BOTS_DISPLAY_ORDER
      );
    case 'chat':
      return all.filter((c) => c.section === 'chat');
    case 'editors':
      return sortByIdOrder(
        all.filter((c) => c.section === 'editors'),
        EDITORS_DISPLAY_ORDER
      );
    case 'automation':
      return all.filter((c) => c.section === 'automation' && hubCard(c));
    case 'public-api':
      return all.filter((c) => c.id === 'api');
    case 'cli':
      return all.filter((c) => c.id === 'cli');
    case 'sdk':
      return all.filter((c) => c.id === 'sdk');
    case 'oauth-apps':
    case 'api-keys':
    case 'approved-apps':
      return [];
    default:
      return [];
  }
}

export function findConnection(
  groups: Group[],
  id: string
): Connection | undefined {
  for (const group of groups) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

export function defaultNavForConnection(item: Connection): ConnectNavId {
  if (item.id === 'api') return 'public-api';
  if (item.id === 'cli') return 'cli';
  if (item.id === 'sdk') return 'sdk';
  if (item.id === 'oauth') return 'oauth-apps';
  return 'all';
}

export function buildConnectionsCatalog(
  ctx: ConnectionsCatalogContext
): Group[] {
  const { t, backendUrl, mcpUrl, apiUrl } = ctx;
  const apiKey = ctx.apiKeyMasked ?? ctx.apiKey ?? '';
  const apiUrlStep: Step[] = apiUrl
    ? [
        {
          title: t('conn_step_api_url', 'Point it at your server'),
          detail: t(
            'conn_step_api_url_detail',
            'The skill, the CLI and the SDK call the hosted API unless told otherwise. Export this next to the key.'
          ),
          code: `export POSTQUEEN_API_URL="${apiUrl}"`,
        },
      ]
    : [];
  const mcpUrlWithKey = `${mcpUrl}/${apiKey}`;

  const skillInstall: Step[] = [
    {
      title: t('conn_step_skill_install', 'Install the PostQueen skill'),
      detail: t(
        'conn_step_skill_install_detail',
        'One command, once per machine. This is a playbook (SKILL.md). It does not install the CLI.'
      ),
      code: 'npx skills add GkhanKINAY/postqueen-agent',
    },
    {
      title: t('conn_step_cli_install', 'Install the postqueen CLI'),
      detail: t(
        'conn_step_cli_install_detail',
        'Skill agents run real shell commands on your machine. The skill does not put postqueen on your PATH. You still need this package.'
      ),
      code: 'npm install -g postqueen',
    },
    {
      title: t('conn_step_skill_key', 'Give it your API key'),
      detail: t(
        'conn_step_skill_key_detail',
        'The agent and the CLI read this from the environment. Put it in the profile the gateway or agent actually runs in. Get the key from Settings → API Keys.'
      ),
      code: `export POSTQUEEN_API_KEY="${apiKey}"`,
    },
    ...apiUrlStep,
  ];

  const chatGroundworkSteps = (): Step[] => [
    {
      title: t(
        'conn_chat_step_agent',
        'Run OpenClaw or Hermes on your machine'
      ),
      detail: t(
        'conn_chat_step_agent_detail',
        'PostQueen never signs into WhatsApp, Telegram, Slack or Discord. An agent you host sits in the middle, reads the message and runs the postqueen CLI. Keep its gateway awake: openclaw gateway or hermes gateway. A sleeping laptop means a silent bot.'
      ),
    },
    ...skillInstall,
    {
      title: t('conn_chat_step_cli_ready', 'Confirm the CLI half'),
      detail: t(
        'conn_chat_step_cli_ready_detail',
        'A JSON list of your channels means the agent can reach PostQueen. Finish this before pairing a chat app.'
      ),
      code: 'postqueen integrations:list',
    },
  ];

  const chatTryStep = (): Step => ({
    title: t('conn_chat_step_try', 'Send it a message'),
    detail: t(
      'conn_chat_step_try_detail',
      'From the connected chat app, in your own words. The examples below show one channel, another channel, and several at once. Ask for a draft if you want to review on the calendar first.'
    ),
    code: t(
      'conn_bridge_example',
      'Post this photo to Instagram tonight at 7, and this video to X and LinkedIn Friday at 10 as drafts'
    ),
  });

  const sample = (ex: Example): Example => ex;

  const whatsappSteps = (): Step[] => [
    ...chatGroundworkSteps(),
    {
      title: t('conn_whatsapp_step_pair', 'Pair WhatsApp over QR'),
      detail: t(
        'conn_whatsapp_step_pair_detail',
        'WhatsApp is an OpenClaw plugin. channels add installs it and starts setup. channels login shows a QR code: scan it from the phone. OpenClaw recommends a separate WhatsApp number. Hermes uses hermes gateway setup for the same channel.'
      ),
      code: `openclaw channels add --channel whatsapp
openclaw channels login --channel whatsapp`,
    },
    {
      title: t('conn_whatsapp_step_gateway', 'Start the gateway and approve you'),
      detail: t(
        'conn_whatsapp_step_gateway_detail',
        'Leave the gateway running. The first sender to message you needs a pairing code. Access requests expire after an hour.'
      ),
      code: `openclaw gateway
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>`,
    },
    chatTryStep(),
  ];

  const telegramSteps = (): Step[] => [
    ...chatGroundworkSteps(),
    {
      title: t('conn_telegram_step_bot', 'Create a Telegram bot'),
      detail: t(
        'conn_telegram_step_bot_detail',
        'In Telegram, message @BotFather, run /newbot, and save the token. Telegram ships in the core OpenClaw install, there is no plugin to add. Slack, Discord and Telegram can also be publishing channels under Channels. That is a separate setup.'
      ),
    },
    {
      title: t('conn_telegram_step_token', 'Give the token to the gateway'),
      detail: t(
        'conn_telegram_step_token_detail',
        'Export it where the gateway runs, or put it in the OpenClaw channel config. Then start the gateway and approve your own pairing code.'
      ),
      code: `export TELEGRAM_BOT_TOKEN="123:abc"
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>`,
    },
    chatTryStep(),
  ];

  const slackChatSteps = (): Step[] => [
    ...chatGroundworkSteps(),
    {
      title: t('conn_slack_chat_step_app', 'Create a Slack app in your workspace'),
      detail: t(
        'conn_slack_chat_step_app_detail',
        'Socket Mode needs a Bot User OAuth Token and an App-Level Token with connections:write. Both tokens must come from the same Slack app. This is a front door to your agent, not connecting Slack as a publishing channel under Channels.'
      ),
    },
    {
      title: t('conn_slack_chat_step_plugin', 'Install the Slack plugin'),
      detail: t(
        'conn_slack_chat_step_plugin_detail',
        'Then patch the gateway config and keep it running. Typical bot scopes include app_mentions:read, channels:history, chat:write, im:history and files:write.'
      ),
      code: `openclaw plugins install @openclaw/slack
export SLACK_BOT_TOKEN=your-bot-token
export SLACK_APP_TOKEN=your-app-token
openclaw gateway`,
    },
    chatTryStep(),
  ];

  const discordChatSteps = (): Step[] => [
    ...chatGroundworkSteps(),
    {
      title: t('conn_discord_chat_step_bot', 'Create a Discord bot'),
      detail: t(
        'conn_discord_chat_step_bot_detail',
        'In the Discord Developer Portal, create an application with a bot user. Turn Message Content Intent on or the bot receives nothing readable. Invite it with the bot and applications.commands scopes. Publishing into Discord is a separate Channels setup.'
      ),
    },
    {
      title: t('conn_discord_chat_step_plugin', 'Install the Discord plugin'),
      detail: t(
        'conn_discord_chat_step_plugin_detail',
        'Hand the token to OpenClaw, start the gateway, then DM the bot and approve the pairing code.'
      ),
      code: `openclaw plugins install @openclaw/discord
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw gateway
openclaw pairing list discord
openclaw pairing approve discord <CODE>`,
    },
    chatTryStep(),
  ];

  return [
    {
      id: 'agents',
      label: t('conn_group_agents', 'Agents'),
      blurb: t(
        'conn_group_agents_blurb',
        'Coding agents: Claude Code, Codex, Cursor, Grok Build and Muse Code.'
      ),
      items: [
        {
          id: 'openclaw',
          name: 'OpenClaw',
          glyph: 'OC',
          icon: '/icons/connections/openclaw.svg',
          kind: 'AGENT',
          method: 'Skill',
          cred: 'env',
          exampleKind: 'bot',
          section: 'bots',
          short: t('conn_openclaw_short', 'A bot you host that posts from chat'),
          intro: t(
            'conn_openclaw_intro',
            'OpenClaw is a self hosted personal agent that stays running on your machine. Message it from WhatsApp, Telegram, Slack or Discord. It is a bot, not a coding session. It drives the postqueen CLI through an Agent Skill, not MCP.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_openclaw_ex', 'Post this photo to Instagram tonight at 7 as a draft'),
              reply: t('conn_openclaw_ex_reply', 'Got it. That photo is an Instagram draft for tonight at 19:00. I will wait for you to confirm in WhatsApp before it goes out.'),
              code: 'postqueen posts:create',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_openclaw_ex_x', 'Schedule this video on X tomorrow at 8am, draft only'),
              reply: t('conn_openclaw_ex_x_reply', 'The video is queued on X as a draft for tomorrow at 08:00. Open the calendar if you want a last look.'),
              code: 'postqueen posts:create',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_openclaw_ex_multi', 'Share this photo to Instagram, X and LinkedIn on Friday at 10, leave them as drafts'),
              reply: t('conn_openclaw_ex_multi_reply', 'Same photo is drafted to Instagram, X and LinkedIn for Friday at 10:00. Say the word when they should go live.'),
              code: 'postqueen posts:create',
            }),
          ],
          info: t(
            'conn_openclaw_note',
            'The same install powers the Chat cards. Keep the Gateway awake. Chat credentials stay on your machine; PostQueen only sees the API key the CLI uses. Keep a human in the loop before anything goes out.'
          ),
          docs: [
            {
              label: t('conn_docs_openclaw', 'OpenClaw guide'),
              href: `${DOCS}/agents/openclaw`,
            },
          ],
          paths: [
            {
              label: t('conn_path_skill', 'Install via CLI skill'),
              href: `${DOCS}/agents/skill-install`,
            },
          ],
          steps: [
            {
              title: t('conn_openclaw_step_install', 'Install OpenClaw'),
              detail: t(
                'conn_openclaw_step_install_detail',
                'On macOS or Linux run the installer, then onboard so the Gateway stays running. Windows uses the PowerShell script. OpenClaw is a separate project; Node 22.22.3+, 24.15+ or 25.9+.'
              ),
              code: `curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon`,
            },
            ...skillInstall,
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_openclaw_verify',
                'A JSON list of your channels means the CLI half is ready. Then link a chat app: Telegram needs a BotFather token; WhatsApp, Slack and Discord are plugins. Pairing steps live on each Chat card.'
              ),
              code: 'postqueen integrations:list',
            },
            {
              title: t('conn_openclaw_step_channel', 'Link a chat app'),
              detail: t(
                'conn_openclaw_step_channel_detail',
                'openclaw channels add installs the plugin and starts that channel\'s setup. Restart the Gateway after a plugin install. Full pairing: docs.postqueen.ai/agents/chat-channels.'
              ),
              code: 'openclaw channels add',
            },
          ],
        },
        {
          id: 'hermes',
          name: 'Hermes',
          glyph: 'H',
          icon: '/icons/connections/hermes.svg',
          kind: 'AGENT',
          method: 'Skill',
          cred: 'env',
          exampleKind: 'bot',
          section: 'bots',
          short: t('conn_hermes_short', 'Hand it a brief. It plans the week.'),
          intro: t(
            'conn_hermes_intro',
            'Hermes is Nous Research\'s open-source agent. It runs on your machine (Python, not Node), keeps memory across sessions, and drives the postqueen CLI. Hand it one brief and it can plan, write and schedule a week. It can also front the same chat apps as OpenClaw.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_hermes_ex', 'Draft a caption for this photo and save it to Instagram for Monday 9am'),
              reply: t('conn_hermes_ex_reply', 'Caption is drafted with the photo for Instagram on Monday at 09:00. Check the calendar if you want to edit it first.'),
              code: 'postqueen posts:create -t draft',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_hermes_ex_x', 'Queue this video on X for Tuesday 8am as a draft'),
              reply: t('conn_hermes_ex_x_reply', 'The video sits on X as a draft for Tuesday at 08:00. I will not publish until you confirm.'),
              code: 'postqueen posts:create -t draft',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_hermes_ex_multi', 'Put this photo on Instagram, X and LinkedIn Wednesday at 10, all drafts'),
              reply: t('conn_hermes_ex_multi_reply', 'That photo is drafted on Instagram, X and LinkedIn for Wednesday at 10:00. Confirm each one when you are ready.'),
              code: 'postqueen posts:create -t draft',
            }),
          ],
          info: t(
            'conn_hermes_note',
            'The skills CLI installs into ~/.agents/skills. Hermes loads ~/.hermes/skills plus skills.external_dirs, so point it at that folder. Recurring jobs use hermes cron create. Keep a human in the loop before anything publishes.'
          ),
          docs: [
            {
              label: t('conn_docs_hermes', 'Hermes guide'),
              href: `${DOCS}/agents/hermes`,
            },
          ],
          paths: [
            {
              label: t('conn_path_skill', 'Install via CLI skill'),
              href: `${DOCS}/agents/skill-install`,
            },
          ],
          steps: [
            {
              title: t('conn_hermes_step_install', 'Install Hermes'),
              detail: t(
                'conn_hermes_step_install_detail',
                'The installer pulls uv and Python 3.11. Windows uses the PowerShell script. Chat apps are linked with hermes gateway setup, then hermes gateway keeps them awake.'
              ),
              code: 'curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash',
            },
            ...skillInstall,
            {
              title: t('conn_hermes_step_skills_dir', 'Point Hermes at the skill folder'),
              detail: t(
                'conn_hermes_step_skills_dir_detail',
                'Add this to ~/.hermes/config.yaml so Hermes reads the skill the next time it starts.'
              ),
              code: `skills:
  external_dirs:
    - ~/.agents/skills`,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_hermes_verify',
                'A JSON list of your channels means Hermes can drive PostQueen. Then give it a brief, or hook a chat app with hermes gateway setup.'
              ),
              code: 'postqueen integrations:list',
            },
          ],
        },
        {
          id: 'claude-code',
          name: 'Claude Code',
          glyph: 'CC',
          icon: '/icons/connections/claude-code.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'cli',
          section: 'agents',
          short: t('conn_cc_short', 'Schedule from the Claude Code session'),
          intro: t(
            'conn_cc_intro',
            'Claude Code is Anthropic\'s terminal and IDE agent, not claude.ai or Claude Desktop. Same pairing as Codex vs ChatGPT. Point it at PostQueen over MCP with one command, then schedule from the session you already have open.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_cc_ex', 'Make a cafe photo and draft it to Instagram tonight at 7'),
              reply: t('conn_cc_ex_reply', 'Cafe photo is saved as an Instagram draft for tonight at 19:00. Take a look on the calendar before it publishes.'),
              code: 'claude', tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_cc_ex_x', 'Make a short video and queue it on X tomorrow at 8am as a draft'),
              reply: t('conn_cc_ex_x_reply', 'Short video is queued on X as a draft for tomorrow at 08:00. Nothing goes out until you confirm.'),
              code: 'claude', tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_cc_ex_multi', 'Make a visual and share it to Instagram, X and LinkedIn Friday at 10, leave them as drafts'),
              reply: t('conn_cc_ex_multi_reply', 'One visual, three drafts for Friday at 10:00 on Instagram, X and LinkedIn. Open the calendar if you want to tweak any of them.'),
              code: 'claude', tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_cc_note',
            'claude_desktop_config.json is the Claude chat app, not Claude Code. Config for this product is ~/.claude.json or a project .mcp.json. Official install is claude mcp add --transport http. A custom connector on claude.ai does not replace that command. Prefer MCP here; the Agent Skill is optional if you also want postqueen on the PATH (npm install -g postqueen).'
          ),
          docs: [
            {
              label: t('conn_docs_claude_code', 'Claude Code guide'),
              href: `${DOCS}/agents/claude-code`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/claude-code`,
            },
            {
              label: t('conn_path_skill', 'Install via CLI skill'),
              href: `${DOCS}/agents/skill-install`,
            },
          ],
          steps: [
            {
              title: t('conn_cc_step_add', 'Register the server'),
              detail: t(
                'conn_cc_step_add_detail',
                'Run this in your terminal. The key sits in the URL. Get it from Settings → API Keys.'
              ),
              code: `claude mcp add --transport http postqueen ${mcpUrlWithKey}`,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'claude mcp list',
            },
          ],
        },
        {
          id: 'grok-build',
          name: t('conn_grok_build_name', 'Grok Build'),
          glyph: 'Bd',
          icon: '/icons/connections/grok.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'cli',
          section: 'agents',
          short: t(
            'conn_grok_build_short',
            'Grok Build MCP from the terminal'
          ),
          intro: t(
            'conn_grok_build_intro',
            'Grok Build is xAI\'s terminal coding agent, not grok.com chat and not Grok Bot. Same split as Claude Code vs Claude. Register PostQueen with grok mcp add. A custom connector at grok.com/connectors does not register this product.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_grok_build_ex', 'Make a short video and draft it to X for 8am'),
              reply: t('conn_grok_build_ex_reply', 'Short video is drafted to X for 08:00. Confirm it on the calendar before it publishes.'),
              code: 'grok', tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_grok_build_ex_ig', 'Make a photo of the shop window and post it to Instagram tonight at 7 as a draft'),
              reply: t('conn_grok_build_ex_ig_reply', 'Shop window photo is an Instagram draft for tonight at 19:00. Have a look before it goes live.'),
              code: 'grok', tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_grok_build_ex_multi', 'Make one visual and queue it on Instagram, X and LinkedIn Friday at 10, all drafts'),
              reply: t('conn_grok_build_ex_multi_reply', 'One visual is queued as drafts on Instagram, X and LinkedIn for Friday at 10:00. Confirm in this session when you are happy with them.'),
              code: 'grok', tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_grok_build_note',
            'A custom connector on grok.com does not replace grok mcp add. The command writes ~/.grok/config.toml. Grok Build may pick up a Cursor or Claude Code MCP entry as a fallback. Official setup is the grok command, then grok mcp list. grok mcp doctor postqueen diagnoses connectivity.'
          ),
          docs: [
            {
              label: t('conn_docs_grok_build', 'Grok Build guide'),
              href: `${DOCS}/agents/grok-build`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/grok-build`,
            },
          ],
          steps: [
            {
              title: t('conn_grok_build_step_add', 'Register the server'),
              detail: t(
                'conn_grok_build_step_add_detail',
                'Run this in your terminal. The key sits in the URL. Get it from Settings → API Keys. Add --header "Authorization: Bearer KEY" if you prefer the key out of the URL.'
              ),
              code: `grok mcp add --transport http postqueen ${mcpUrlWithKey}`,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'grok mcp list',
            },
          ],
        },
        {
          id: 'codex',
          name: 'Codex',
          glyph: 'Cx',
          icon: '/icons/connections/codex.svg',
          kind: 'SKILL',
          method: 'Skill',
          cred: 'env',
          exampleKind: 'cli',
          section: 'agents',
          short: t('conn_codex_short', 'Schedule from the Codex coding agent'),
          intro: t(
            'conn_codex_intro',
            'Codex is OpenAI\'s coding agent, not ChatGPT. Same pairing as Claude Code vs Claude. Teach it the postqueen CLI with the Agent Skill, or register MCP with the Codex CLI. Settings → Apps in ChatGPT does not install this product.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_codex_ex', 'list my PostQueen channels'),
              reply: t('conn_codex_ex_reply', 'You can post to Instagram, X, LinkedIn and YouTube.'),
              code: 'codex "list my PostQueen channels"',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_codex_ex_ig', 'make a photo and draft it to Instagram tonight at 7'),
              reply: t('conn_codex_ex_ig_reply', 'Photo is drafted to Instagram for tonight at 19:00. Check the calendar if you want to change the caption.'),
              code: 'codex "make a photo and draft it to Instagram tonight at 7"',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_codex_ex_multi', 'make a visual and schedule it to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_codex_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Nothing publishes until you confirm.'),
              code: 'codex "make a visual and schedule it to Instagram, X and LinkedIn Friday at 10 as drafts"',
            }),
          ],
          docs: [
            {
              label: t('conn_docs_codex', 'Codex guide'),
              href: `${DOCS}/agents/codex`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/codex`,
            },
            {
              label: t('conn_path_skill', 'Install via CLI skill'),
              href: `${DOCS}/agents/skill-install`,
            },
          ],
          steps: [
            ...skillInstall,
            {
              title: t('conn_codex_step_mcp', 'Or register MCP instead'),
              detail: t(
                'conn_codex_step_mcp_detail',
                'Prefer tool calls to shell commands? The Codex CLI speaks streamable HTTP MCP natively and writes ~/.codex/config.toml. Get the key from Settings → API Keys.'
              ),
              code: `codex mcp add postqueen --url ${mcpUrlWithKey}`,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'codex "list my social media integrations"',
            },
          ],
        },
        {
          id: 'muse-code',
          name: t('conn_muse_code_name', 'Muse Code'),
          glyph: 'MC',
          icon: '/icons/connections/muse.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'agents',
          short: t('conn_muse_code_short', 'Muse Code over streamable HTTP MCP'),
          intro: t(
            'conn_muse_code_intro',
            'Muse Code is Meta\'s coding agent. It loads remote MCP servers from ~/.config/muse/settings.json over streamable HTTP. This is the path that works today, the consumer Muse app does not take an MCP URL yet.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_muse_code_ex', 'Make a square photo of the storefront and draft it to Instagram tonight at 7'),
              reply: t('conn_muse_code_ex_reply', 'Square storefront photo is an Instagram draft for tonight at 19:00. Open it before anything publishes.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_muse_code_ex_x', 'Make a short clip and queue it on X tomorrow at 8am as a draft'),
              reply: t('conn_muse_code_ex_x_reply', 'Short clip is queued on X as a draft for tomorrow at 08:00. Have a look first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_muse_code_ex_multi', 'Share this visual to Instagram, X and LinkedIn Friday at 10, all drafts'),
              reply: t('conn_muse_code_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm each on the calendar.'),
              tool: 'schedulePostTool',
            }),
          ],
          docs: [
            {
              label: t('conn_docs_muse_code', 'Muse Code MCP setup'),
              href: `${DOCS}/mcp/clients/muse`,
            },
          ],
          paths: [
            {
              label: t('conn_docs_muse_hub', 'Muse guide'),
              href: `${DOCS}/agents/muse`,
            },
          ],
          steps: [
            {
              title: t('conn_muse_code_step_file', 'Edit Muse Code settings'),
              detail: t(
                'conn_muse_code_step_file_detail',
                'Add this to ~/.config/muse/settings.json. Get the key from Settings → API Keys. Restart Muse Code after saving.'
              ),
              code: JSON.stringify(
                {
                  schema_version: 1,
                  mcp_servers: {
                    postqueen: {
                      transport: 'streamable_http',
                      url: mcpUrlWithKey,
                      mode: 'optional',
                    },
                  },
                },
                null,
                2
              ),
            },
            {
              title: t('conn_muse_code_step_header', 'Or pass the key as a header'),
              detail: t(
                'conn_muse_code_step_header_detail',
                'If you prefer a bare /mcp URL, put the key in Authorization.'
              ),
              code: JSON.stringify(
                {
                  schema_version: 1,
                  mcp_servers: {
                    postqueen: {
                      transport: 'streamable_http',
                      url: mcpUrl,
                      headers: { Authorization: `Bearer ${apiKey}` },
                      mode: 'optional',
                    },
                  },
                },
                null,
                2
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'chat',
      label: t('conn_group_chat_doors', 'Chat front doors'),
      blurb: t(
        'conn_group_chat_doors_blurb',
        'Message an agent from WhatsApp, Telegram, Slack or Discord. Not publishing channels, those live under Channels.'
      ),
      items: [
        {
          id: 'whatsapp',
          name: 'WhatsApp',
          glyph: 'WA',
          icon: '/icons/connections/whatsapp.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'bot',
          section: 'chat',
          short: t('conn_whatsapp_short', 'Voice notes to the bot on your phone'),
          intro: t(
            'conn_whatsapp_intro',
            'Talk to your hosted OpenClaw or Hermes agent from WhatsApp. PostQueen does not sign into WhatsApp and does not publish into WhatsApp. Pairing is QR on your machine. The gateway has to stay awake.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_whatsapp_ex', 'Voice note: post this photo to Instagram tonight at 7'),
              reply: t('conn_whatsapp_ex_reply', 'Heard you. That photo is an Instagram draft for tonight at 19:00. Reply here when it looks right.'),
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_whatsapp_ex_x', 'Voice note: post this video to X tomorrow at 8am, draft only'),
              reply: t('conn_whatsapp_ex_x_reply', 'Video is drafted to X for tomorrow at 08:00. I will wait for a yes in this chat.'),
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_whatsapp_ex_multi', 'Voice note: post this to Instagram, X and LinkedIn Friday at 10, drafts only'),
              reply: t('conn_whatsapp_ex_multi_reply', 'Drafts for Instagram, X and LinkedIn are set for Friday at 10:00. Confirm in WhatsApp before they go out.'),
            }),
          ],
          info: t(
            'conn_bridge_note',
            'The gateway is yours: it runs on your infrastructure and PostQueen never sees your chat accounts. Keep a human in the loop before anything publishes.'
          ),
          docs: [
            {
              label: t('conn_docs_whatsapp', 'WhatsApp chat front door'),
              href: `${DOCS}/agents/chat-channels#whatsapp`,
            },
          ],
          steps: whatsappSteps(),
        },
        {
          id: 'telegram',
          name: 'Telegram',
          glyph: 'Tg',
          icon: '/icons/connections/telegram.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'bot',
          section: 'chat',
          short: t('conn_telegram_short', 'Message the hosted bot from Telegram'),
          intro: t(
            'conn_telegram_intro',
            'Talk to your hosted agent from Telegram. Create a bot with @BotFather and give the token to OpenClaw or Hermes. Telegram can also be a publishing channel under Channels. That is a separate setup.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_telegram_ex', 'What is going out this week?'),
              reply: t('conn_telegram_ex_reply', 'This week: Instagram Tuesday at 19:00, X Wednesday at 08:00, and a YouTube draft still waiting.'),
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_telegram_ex_ig', 'Post this picture to Instagram tonight at 7 as a draft'),
              reply: t('conn_telegram_ex_ig_reply', 'Picture is saved as an Instagram draft for tonight at 19:00. Confirm in Telegram before it publishes.'),
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_telegram_ex_multi', 'Send this video to Instagram, X and LinkedIn Friday at 10, all drafts'),
              reply: t('conn_telegram_ex_multi_reply', 'Video is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm each one in this chat.'),
            }),
          ],
          docs: [
            {
              label: t('conn_docs_telegram', 'Telegram chat front door'),
              href: `${DOCS}/agents/chat-channels#telegram`,
            },
          ],
          steps: telegramSteps(),
        },
        {
          id: 'slack-chat',
          name: 'Slack',
          glyph: 'Sl',
          icon: '/icons/connections/slack.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'bot',
          section: 'chat',
          short: t('conn_slack_chat_short', 'Ask the hosted bot in a Slack channel'),
          intro: t(
            'conn_slack_chat_intro',
            'Ask your hosted agent from a Slack channel. You add a Slack app to the workspace and OpenClaw or Hermes keeps the gateway running. Connecting Slack as a publishing channel under Channels is a different setup.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_slack_chat_ex', '@PostQueen what is on the calendar tomorrow?'),
              reply: t('conn_slack_chat_ex_reply', 'Tomorrow has one Instagram post at 19:00. Nothing else is queued.'),
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_slack_chat_ex_x', '@PostQueen post this photo to X tomorrow at 8am as a draft'),
              reply: t('conn_slack_chat_ex_x_reply', 'Photo is drafted to X for tomorrow at 08:00. Peek at the calendar in Slack if you want a last look.'),
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_slack_chat_ex_multi', '@PostQueen share this video to Instagram, X and LinkedIn Friday at 10, drafts only'),
              reply: t('conn_slack_chat_ex_multi_reply', 'Video is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm in this channel.'),
            }),
          ],
          docs: [
            {
              label: t('conn_docs_slack_chat', 'Slack chat front door'),
              href: `${DOCS}/agents/chat-channels#slack`,
            },
          ],
          steps: slackChatSteps(),
        },
        {
          id: 'discord-chat',
          name: 'Discord',
          glyph: 'Dc',
          icon: '/icons/connections/discord.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'bot',
          section: 'chat',
          short: t('conn_discord_chat_short', 'Ask the hosted bot in a Discord channel'),
          intro: t(
            'conn_discord_chat_intro',
            'Ask your hosted agent from Discord. You run a bot with Message Content Intent and keep OpenClaw or Hermes awake. Publishing into Discord is a separate Channels setup.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_discord_chat_ex', '@PostQueen post this photo to X tomorrow at 8, draft only'),
              reply: t('conn_discord_chat_ex_reply', 'Photo is drafted to X for tomorrow at 08:00. Open it before it publishes.'),
              code: 'postqueen posts:create -t draft',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_discord_chat_ex_ig', '@PostQueen post this clip to Instagram tonight at 7 as a draft'),
              reply: t('conn_discord_chat_ex_ig_reply', 'Clip is saved as an Instagram draft for tonight at 19:00. Confirm in Discord first.'),
              code: 'postqueen posts:create -t draft',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_discord_chat_ex_multi', '@PostQueen share this photo to Instagram, X and LinkedIn Friday at 10, leave them as drafts'),
              reply: t('conn_discord_chat_ex_multi_reply', 'Photo is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm each in this channel.'),
              code: 'postqueen posts:create -t draft',
            }),
          ],
          docs: [
            {
              label: t('conn_docs_discord_chat', 'Discord chat front door'),
              href: `${DOCS}/agents/chat-channels#discord`,
            },
          ],
          steps: discordChatSteps(),
        },
      ],
    },
    {
      id: 'featured',
      label: t('conn_group_featured', 'Featured'),
      blurb: t(
        'conn_group_featured_blurb',
        'Chat products that call PostQueen over MCP. One URL, 14 tools.'
      ),
      items: [
        {
          id: 'claude-apps',
          name: t('conn_claude_apps_name', 'Claude'),
          glyph: 'C',
          icon: '/icons/connections/claude.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'chat',
          section: 'featured',
          short: t('conn_claude_apps_short', 'Chat on claude.ai, Desktop or phone'),
          intro: t(
            'conn_claude_apps_intro',
            'This is Anthropic\'s chat: claude.ai, Claude Desktop, iOS and Android. One custom connector follows the account. She is not in Anthropic\'s Connectors Directory, add her from Customize → Connectors when the URL is public; use mcp-remote in the Desktop config for LAN or VPN. Claude Code is a different product, use that card under Agents, like Codex vs ChatGPT.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_claude_apps_ex', 'What is in my PostQueen queue this week?'),
              reply: t('conn_claude_apps_ex_reply', 'This week you have Instagram on Tuesday at 19:00, X on Wednesday at 08:00, and a YouTube draft waiting. Want me to move anything?'),
              tool: 'ask_postqueen',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_claude_apps_ex_ig', 'Make a photo of a sunny terrace and draft it to Instagram tonight at 7'),
              reply: t('conn_claude_apps_ex_ig_reply', 'Sunny terrace photo is saved as an Instagram draft for tonight at 19:00. Open the calendar if you want to tweak the caption.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_claude_apps_ex_multi', 'Make a visual and put it on Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_claude_apps_ex_multi_reply', 'Same visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Nothing publishes until you say so.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_claude_apps_note',
            'Not listed at claude.com/connectors. Browse will not find PostQueen. A plain "url" in claude_desktop_config.json does not work. Customize → Connectors does not install Claude Code. New connectors generally cannot be created from the mobile apps, add them on the web or Desktop first.'
          ),
          docs: [
            {
              label: t('conn_docs_claude_apps', 'Claude MCP setup'),
              href: `${DOCS}/mcp/clients/claude`,
            },
          ],
          steps: [
            {
              title: t(
                'conn_claude_apps_step_desktop',
                'Connect Claude Desktop'
              ),
              detail: t(
                'conn_claude_apps_step_desktop_detail',
                'Customize → Connectors → + → Add custom connector (Claude Desktop may still say Settings → Connectors). Paste the MCP URL (key in the path). Leave OAuth / Advanced fields empty. For LAN or VPN instances, use Edit Config and mcp-remote instead.'
              ),
              code: mcpUrlWithKey,
            },
            {
              title: t(
                'conn_claude_apps_step_web',
                'Connect claude.ai (and mobile)'
              ),
              detail: t(
                'conn_claude_apps_step_web_detail',
                'claude.ai → Customize → Connectors → + → Add custom connector. On Team/Enterprise an Owner adds it under Organization settings → Connectors → Add → Custom → Web, then members click Connect. Enable it in a chat from + → Connectors. It appears on iOS and Android after you add it on the web.'
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_claude_apps_verify',
                'Start a new conversation and ask Claude to list your connected social media accounts.'
              ),
            },
          ],
        },
        {
          id: 'chatgpt',
          name: 'ChatGPT',
          glyph: 'G',
          icon: '/icons/connections/chatgpt.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'chat',
          section: 'featured',
          short: t('conn_chatgpt_short', 'Schedule posts from ChatGPT on the web'),
          intro: t(
            'conn_chatgpt_intro',
            'ChatGPT reaches PostQueen as a custom MCP app in Developer mode. Create it under Settings → Apps, not Settings → Connectors. Web only, not the Free plan, not the mobile apps. Codex is a different product, use that card under Agents.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_chatgpt_ex', 'Make a photo of weekend brunch and draft it to Instagram tonight at 7'),
              reply: t('conn_chatgpt_ex_reply', 'Weekend brunch photo is drafted to Instagram for tonight at 19:00. Have a look before it goes out.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_chatgpt_ex_x', 'Make a short video for X tomorrow at 8am as a draft'),
              reply: t('conn_chatgpt_ex_x_reply', 'Short video is queued on X as a draft for tomorrow at 08:00. Check it once before it publishes.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_chatgpt_ex_multi', 'Make one visual and schedule it to Instagram, X and LinkedIn Friday at 10, all drafts'),
              reply: t('conn_chatgpt_ex_multi_reply', 'One visual, three drafts for Friday at 10:00 on Instagram, X and LinkedIn. Confirm when you like them.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_chatgpt_note',
            'OpenAI Help Center currently says full MCP write (schedule/publish) is for Business and Enterprise/Edu. Plus and Pro can usually connect, but write tools such as schedulePostTool may stay blocked. Authentication: No authentication, the key is already in the URL. Settings → Apps does not install Codex.'
          ),
          docs: [
            {
              label: t('conn_docs_chatgpt', 'ChatGPT guide'),
              href: `${DOCS}/agents/chatgpt`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/chatgpt`,
            },
          ],
          steps: [
            {
              title: t(
                'conn_chatgpt_step_devmode',
                'Turn on Developer mode'
              ),
              detail: t(
                'conn_chatgpt_step_devmode_detail',
                'ChatGPT on the web → Settings → Apps → Advanced settings → Developer mode. Older ChatGPT builds put this under Settings → Security and login. On Business, Enterprise and Edu an admin controls this switch. It is not available on the Free plan.'
              ),
            },
            {
              title: t('conn_chatgpt_step_plugin', 'Create the app'),
              detail: t(
                'conn_chatgpt_step_plugin_detail',
                'Settings → Apps → Create (workspace admins: Workspace settings → Apps → Create). Older builds: Settings → Plugins or chatgpt.com/plugins → +. Name it PostQueen, paste the MCP URL, set Authentication to No authentication, then save. Enable it in a chat via + → Developer mode (or the tools menu).'
              ),
              code: mcpUrlWithKey,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_chatgpt_verify',
                'Ask ChatGPT to list your connected social media accounts.'
              ),
            },
          ],
        },
        {
          id: 'grok',
          name: 'Grok',
          glyph: 'Gk',
          icon: '/icons/connections/grok.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'chat',
          section: 'featured',
          short: t('conn_grok_short', 'Add a custom connector on grok.com'),
          intro: t(
            'conn_grok_intro',
            'Grok on the web, iOS and Android can call remote MCP servers. Add PostQueen as a custom connector at grok.com/connectors (web: + → Connectors; iOS/Android: Settings → Connectors). The server must be reachable over the public internet. Grok Bot and Grok Build are different products, use those cards.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_grok_ex', 'Put tonight\'s photo on X tomorrow at 8am as a draft'),
              reply: t('conn_grok_ex_reply', 'Tonight\'s photo is drafted to X for tomorrow at 08:00. Nothing publishes until you say so.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_grok_ex_ig', 'Make a photo of the storefront and post it to Instagram tonight at 7 as a draft'),
              reply: t('conn_grok_ex_ig_reply', 'Storefront photo is an Instagram draft for tonight at 19:00. Take a look first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_grok_ex_multi', 'Queue this visual on Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_grok_ex_multi_reply', 'Visual is queued as drafts on Instagram, X and LinkedIn for Friday at 10:00. Confirm when you are ready.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_grok_note',
            'On Grok Business and Enterprise, an admin must provision the connector in console.x.ai first. grok.com/connectors does not install PostQueen on Grok Bot or Grok Build.'
          ),
          docs: [
            {
              label: t('conn_docs_grok', 'Grok MCP setup'),
              href: `${DOCS}/mcp/clients/grok`,
            },
          ],
          paths: [
            {
              label: t('conn_docs_grok_hub', 'Grok guide'),
              href: `${DOCS}/agents/grok`,
            },
          ],
          steps: [
            {
              title: t('conn_grok_step_open', 'Open Grok connectors'),
              detail: t(
                'conn_grok_step_open_detail',
                'Go to grok.com/connectors → New Connector → Custom.'
              ),
            },
            {
              title: t('conn_grok_step_url', 'Paste the MCP URL'),
              detail: t(
                'conn_grok_step_url_detail',
                'Enter the streamable HTTP URL with your API key in the path. Get the key from Settings → API Keys. Leave extra auth empty unless you prefer a Bearer header instead.'
              ),
              code: mcpUrlWithKey,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_grok_verify',
                'In a Grok chat, ask it to list your connected social media accounts.'
              ),
            },
          ],
        },
        {
          id: 'grok-bot',
          name: t('conn_grok_bot_name', 'Grok Bot'),
          glyph: 'GB',
          icon: '/icons/connections/grok.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'chat',
          section: 'bots',
          short: t('conn_grok_bot_short', 'Tell Grok Bot the MCP URL in chat'),
          intro: t(
            'conn_grok_bot_intro',
            'Grok Bot is the cloud agent, not grok.com chat and not Grok Build. It does not read grok.com/connectors, Cursor mcp.json or ~/.grok/config.toml. Tell the Bot to add a remote MCP server. The URL must be public HTTPS, localhost and stdio do not work.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_grok_bot_ex', 'Draft this photo to X for tomorrow 8am'),
              reply: t('conn_grok_bot_ex_reply', 'Photo is drafted to X for tomorrow at 08:00. I will wait for you here before it goes out.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_grok_bot_ex_ig', 'Draft this picture to Instagram tonight at 7'),
              reply: t('conn_grok_bot_ex_ig_reply', 'Picture is an Instagram draft for tonight at 19:00. Reply in this chat if you want a change.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_grok_bot_ex_multi', 'Post this picture to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_grok_bot_ex_multi_reply', 'Picture is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm here before they publish.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_grok_bot_note',
            'PostQueen is not a Grok Bot marketplace plugin. Do not look for her under Plugins. Cursor staff document adding a custom server in the Bot chat. Teams inherit Cursor MCP allowlists. Same MCP URL as Grok chat, different product.'
          ),
          docs: [
            {
              label: t('conn_docs_grok_bot', 'Grok Bot MCP setup'),
              href: `${DOCS}/mcp/clients/grok-bot`,
            },
          ],
          paths: [
            {
              label: t('conn_docs_grok_bot_guide', 'Grok Bot guide'),
              href: `${DOCS}/agents/grok-bot`,
            },
          ],
          steps: [
            {
              title: t('conn_grok_bot_step_ask', 'Ask the Bot to add the server'),
              detail: t(
                'conn_grok_bot_step_ask_detail',
                'Open Grok Bot. There is no grok.com/connectors form here. In the Bot chat, tell it to add the MCP server. Cursor documents: Add this MCP server: plus the public URL.'
              ),
            },
            {
              title: t('conn_grok_bot_step_url', 'Give it the MCP URL'),
              detail: t(
                'conn_grok_bot_step_url_detail',
                'Paste the streamable HTTP URL with your API key in the path. Get the key from Settings → API Keys. Confirm when the Bot asks. Tools show up on the next message.'
              ),
              code: mcpUrlWithKey,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_grok_bot_verify',
                'In that Grok Bot chat, ask it to list your connected social media accounts.'
              ),
            },
          ],
        },
        {
          id: 'cursor',
          name: 'Cursor',
          glyph: 'Cu',
          icon: '/icons/connections/cursor.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'agents',
          short: t('conn_cursor_short', 'Schedule from Cursor in the editor'),
          intro: t(
            'conn_cursor_intro',
            'Cursor reads MCP servers from mcp.json. Add a remote streamable HTTP server with a url field, Cursor infers the transport. You can also add it from Customize → MCP, or Cursor Settings → Tools & MCP (older builds: Tools & Integrations → MCP); all write the same file.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_cursor_ex', 'Make a sale poster and schedule it to Instagram tonight at 7'),
              reply: t('conn_cursor_ex_reply', 'Sale poster is scheduled to Instagram for tonight at 19:00 as a draft. Check the calendar before it publishes.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_cursor_ex_x', 'Make a 15 second clip and queue it on X tomorrow at 8am as a draft'),
              reply: t('conn_cursor_ex_x_reply', '15 second clip is queued on X as a draft for tomorrow at 08:00. Have a look first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_cursor_ex_multi', 'Make one poster and schedule it to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_cursor_ex_multi_reply', 'Poster is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm in Cursor before they go out.'),
              tool: 'schedulePostTool',
            }),
          ],
          docs: [
            {
              label: t('conn_docs_cursor', 'Cursor guide'),
              href: `${DOCS}/agents/cursor`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/cursor`,
            },
            {
              label: t('conn_path_cli', 'Drive via CLI'),
              href: `${DOCS}/cli/introduction`,
            },
          ],
          steps: [
            {
              title: t('conn_cursor_step_ui', 'Add the server'),
              detail: t(
                'conn_cursor_step_ui_detail',
                'Customize → MCP, or Cursor Settings → Tools & MCP (older builds: Tools & Integrations → MCP), then add a streamable HTTP server named postqueen. Or create ~/.cursor/mcp.json (global) or .cursor/mcp.json (this project).'
              ),
            },
            {
              title: t('conn_cursor_step_url', 'Paste this JSON'),
              detail: t(
                'conn_cursor_step_url_detail',
                'url is correct for Cursor. Do not put this block in Claude Desktop\'s config, that client does not accept a plain url field.'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { url: mcpUrlWithKey } } },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_cursor_verify',
                'In agent mode, ask Cursor to list your connected channels.'
              ),
            },
          ],
        },
        {
          id: 'vscode',
          name: t('conn_vscode_name', 'VS Code'),
          glyph: 'VS',
          icon: '/icons/connections/vscode.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'editors',
          short: t(
            'conn_vscode_short',
            'Schedule from VS Code Copilot MCP'
          ),
          intro: t(
            'conn_vscode_intro',
            'VS Code Copilot reads MCP from mcp.json. The file uses a servers object and each remote entry needs type http. That is not Cursor\'s mcpServers url shape. Add it from the Command Palette (MCP: Add Server) or edit .vscode/mcp.json (this workspace) or the user mcp.json (MCP: Open User Configuration).'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_vscode_ex', 'Make a product photo and draft it to X for 8am from Copilot Chat'),
              reply: t('conn_vscode_ex_reply', 'Product photo is drafted to X for 08:00. Confirm it on the calendar before it publishes.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_vscode_ex_ig', 'Draft this photo to Instagram tonight at 7 from Copilot Chat'),
              reply: t('conn_vscode_ex_ig_reply', 'Photo is saved as an Instagram draft for tonight at 19:00. Peek at it in Copilot Chat first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_vscode_ex_multi', 'Share this visual to Instagram, X and LinkedIn Friday at 10 as drafts from Copilot Chat'),
              reply: t('conn_vscode_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm in Copilot Chat when they look right.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_vscode_note',
            'Do not paste a Cursor mcpServers block into VS Code. GitHub Copilot CLI is a different product (~/.copilot/mcp-config.json). This card is the VS Code editor.'
          ),
          docs: [
            {
              label: t('conn_docs_vscode', 'VS Code MCP setup'),
              href: `${DOCS}/mcp/clients/vscode`,
            },
          ],
          steps: [
            {
              title: t('conn_vscode_step_ui', 'Add the server'),
              detail: t(
                'conn_vscode_step_ui_detail',
                'Command Palette → MCP: Add Server, pick HTTP, name it postqueen. Or create .vscode/mcp.json (this workspace) or run MCP: Open User Configuration for every workspace.'
              ),
            },
            {
              title: t('conn_vscode_step_json', 'Paste this JSON'),
              detail: t(
                'conn_vscode_step_json_detail',
                'The key is servers, not mcpServers. type must be http. Put the API key in the URL or in a headers Authorization Bearer. Get the key from Settings → API Keys.'
              ),
              code: JSON.stringify(
                {
                  servers: {
                    postqueen: { type: 'http', url: mcpUrlWithKey },
                  },
                },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_vscode_verify',
                'In Copilot Chat agent mode, ask it to list your connected channels.'
              ),
            },
          ],
        },
        {
          id: 'windsurf',
          name: 'Windsurf',
          glyph: 'Ws',
          icon: '/icons/connections/windsurf.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'editors',
          short: t(
            'conn_windsurf_short',
            'Schedule from Windsurf Cascade'
          ),
          intro: t(
            'conn_windsurf_intro',
            'Windsurf Cascade reads MCP from ~/.codeium/windsurf/mcp_config.json. Remote HTTP uses serverUrl (url also works). That is not Cursor mcp.json. Open MCPs in the Cascade panel, or Devin Settings → Cascade → MCP Servers, then edit the file. The newer Devin Local agent in Windsurf uses Devin CLI config instead of this file.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_windsurf_ex', 'In Cascade, make a photo of the shop and save an Instagram draft for tonight at 7'),
              reply: t('conn_windsurf_ex_reply', 'Shop photo is saved as an Instagram draft for tonight at 19:00. Open it in Cascade before it publishes.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_x', 'One channel: X'),
              body: t('conn_windsurf_ex_x', 'In Cascade, make a short video and queue it on X tomorrow at 8am as a draft'),
              reply: t('conn_windsurf_ex_x_reply', 'Short video is queued on X as a draft for tomorrow at 08:00. Confirm in Cascade first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_windsurf_ex_multi', 'In Cascade, post this visual to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_windsurf_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm in Cascade when you are happy.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_windsurf_note',
            'This card is Cascade\'s mcp_config.json. Devin Local (the default agent in new Windsurf tabs) does not read that file. Teams can allowlist servers by the key name in mcp_config.json.'
          ),
          docs: [
            {
              label: t('conn_docs_windsurf', 'Windsurf MCP setup'),
              href: `${DOCS}/mcp/clients/windsurf`,
            },
          ],
          steps: [
            {
              title: t('conn_windsurf_step_ui', 'Open MCP settings'),
              detail: t(
                'conn_windsurf_step_ui_detail',
                'In the Cascade panel, open MCPs, or Devin Settings → Cascade → MCP Servers. If PostQueen is not in the marketplace, edit the raw mcp_config.json.'
              ),
            },
            {
              title: t('conn_windsurf_step_json', 'Paste this JSON'),
              detail: t(
                'conn_windsurf_step_json_detail',
                'Add this to ~/.codeium/windsurf/mcp_config.json. Use serverUrl for streamable HTTP. Get the key from Settings → API Keys.'
              ),
              code: JSON.stringify(
                {
                  mcpServers: {
                    postqueen: { serverUrl: mcpUrlWithKey },
                  },
                },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_windsurf_verify',
                'In a Cascade chat, ask it to list your connected channels.'
              ),
            },
          ],
        },
        {
          id: 'zed',
          name: 'Zed',
          glyph: 'Zd',
          icon: '/icons/connections/zed.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'editors',
          short: t('conn_zed_short', 'Zed editor remote MCP from JSON'),
          intro: t(
            'conn_zed_intro',
            'Zed is an editor with an Agent Panel. It stores remote MCP servers under context_servers, not mcpServers. Add PostQueen from Settings → AI → MCP Servers, or edit the settings file.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_zed_ex', 'In the Agent Panel, what is scheduled in PostQueen this week?'),
              reply: t('conn_zed_ex_reply', 'This week: Instagram Tuesday at 19:00 and X Wednesday at 08:00. Want a change?'),
              tool: 'ask_postqueen',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_zed_ex_ig', 'In the Agent Panel, make a photo and draft it to Instagram tonight at 7'),
              reply: t('conn_zed_ex_ig_reply', 'Photo is drafted to Instagram for tonight at 19:00. Open it in the Agent Panel first.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_zed_ex_multi', 'In the Agent Panel, share this visual to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_zed_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm in the Agent Panel.'),
              tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_zed_note',
            'A remote entry with only a url and no Authorization header is Zed\'s OAuth path. PostQueen /mcp with an API key is not that flow. Always send Authorization: Bearer. Putting the key in the URL is not enough on its own; without the header Zed still starts OAuth.'
          ),
          docs: [
            {
              label: t('conn_docs_zed', 'Zed MCP setup'),
              href: `${DOCS}/mcp/clients/zed`,
            },
          ],
          steps: [
            {
              title: t('conn_zed_step_ui', 'Add a remote server'),
              detail: t(
                'conn_zed_step_ui_detail',
                'Settings → AI → MCP Servers → Add Server → Add Remote Server. Name it postqueen. Or edit the settings file (zed: open settings file).'
              ),
            },
            {
              title: t('conn_zed_step_json', 'Paste this JSON'),
              detail: t(
                'conn_zed_step_json_detail',
                'The key is context_servers. Always include the Authorization header. Without it Zed starts an OAuth flow PostQueen does not speak, even if the key is already in the URL. Get the key from Settings → API Keys.'
              ),
              code: JSON.stringify(
                {
                  context_servers: {
                    postqueen: {
                      url: mcpUrl,
                      headers: { Authorization: `Bearer ${apiKey}` },
                    },
                  },
                },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_zed_verify',
                'In the Agent Panel, ask Zed to list your connected channels. A green indicator on the postqueen server means it is active.'
              ),
            },
          ],
        },
        {
          id: 'gemini',
          name: 'Gemini CLI',
          glyph: 'Gm',
          icon: '/icons/connections/gemini-cli.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'cli',
          section: 'editors',
          short: t('conn_gemini_short', 'Gemini CLI talks over streamable HTTP'),
          intro: t(
            'conn_gemini_intro',
            'Gemini CLI reads MCP servers from ~/.gemini/settings.json. Streamable HTTP uses the httpUrl key, url is reserved for SSE and will not connect to PostQueen. This is the terminal CLI, not gemini.google.com.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_gemini_ex', 'Which PostQueen channels can I post to?'),
              reply: t('conn_gemini_ex_reply', 'Connected channels: Instagram, X, LinkedIn and YouTube.'),
              code: 'gemini', tool: 'integrationList',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_gemini_ex_ig', 'Make a photo and draft it to Instagram tonight at 7 from Gemini CLI'),
              reply: t('conn_gemini_ex_ig_reply', 'Photo is drafted to Instagram for tonight at 19:00. Check the calendar before it goes out.'),
              code: 'gemini', tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_gemini_ex_multi', 'Schedule this visual to Instagram, X and LinkedIn Friday at 10 as drafts from Gemini CLI'),
              reply: t('conn_gemini_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Confirm when the set looks right.'),
              code: 'gemini', tool: 'schedulePostTool',
            }),
          ],
          info: t(
            'conn_gemini_note',
            'This settings.json does not appear in gemini.google.com. Google Connected Apps / Spark is a separate product with its own eligibility, do not expect the phone apps to pick up Gemini CLI.'
          ),
          docs: [
            {
              label: t('conn_docs_gemini', 'Gemini CLI guide'),
              href: `${DOCS}/agents/gemini-cli`,
            },
          ],
          paths: [
            {
              label: t('conn_path_mcp', 'Connect via MCP'),
              href: `${DOCS}/mcp/clients/gemini-cli`,
            },
          ],
          steps: [
            {
              title: t('conn_gemini_step_cli', 'Add it from the CLI'),
              detail: t(
                'conn_gemini_step_cli_detail',
                'Prefer this over hand-editing JSON. Pass --scope user so it is not written into a project file you might commit.'
              ),
              code: `gemini mcp add --transport http --scope user postqueen ${mcpUrlWithKey}`,
            },
            {
              title: t('conn_gemini_step_config', 'Or edit settings.json'),
              detail: t(
                'conn_gemini_step_config_detail',
                'Add this to ~/.gemini/settings.json. Use httpUrl, not url. If an older gemini mcp add wrote "url" plus a type field, change that key to httpUrl or the connection fails.'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { httpUrl: mcpUrlWithKey } } },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_gemini_verify',
                'Start Gemini CLI and run the slash command /mcp. postqueen should show as connected with 14 tools. Then ask it to list your connected social media accounts.'
              ),
              code: '/mcp',
            },
          ],
        },
        {
          id: 'muse',
          name: 'Muse',
          glyph: 'Mu',
          icon: '/icons/connections/muse.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'none',
          exampleKind: 'chat',
          section: 'bots',
          soon: true,
          short: t('conn_muse_short', 'Muse app. Custom MCP not ready yet'),
          intro: t(
            'conn_muse_intro',
            'Meta Muse (the personal agent in the Muse app and WhatsApp) has Connectors, including custom connectors built from API details Muse walks you through. That is not a paste-an-MCP-URL flow. First-class MCP for the Muse app is coming soon. Muse Code, the coding agent, already connects, use that card under Agents.'
          ),
          info: t(
            'conn_muse_note',
            'Do not paste the MCP URL into Muse Settings → Connectors expecting it to work like Claude. For now, use Muse Code or another MCP client on this page.'
          ),
          docs: [
            {
              label: t('conn_docs_muse', 'Muse guide'),
              href: `${DOCS}/agents/muse`,
            },
          ],
          steps: [
            {
              title: t('conn_muse_step_code', 'Use Muse Code today'),
              detail: t(
                'conn_muse_step_code_detail',
                'Open the Muse Code card under Agents and add PostQueen to ~/.config/muse/settings.json over streamable HTTP.'
              ),
            },
            {
              title: t('conn_muse_step_app', 'Muse app'),
              detail: t(
                'conn_muse_step_app_detail',
                'Settings → Connectors can attach catalog apps (Gmail, calendar). Custom connectors there collect API information, not an MCP server URL. We will add paste-URL steps here when Meta ships that.'
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'editors',
      label: t('conn_group_editors', 'Editors'),
      blurb: t(
        'conn_group_editors_blurb',
        'Editor and MCP clients. VS Code, Windsurf, Zed, Gemini CLI, and any other MCP client.'
      ),
      items: [
        {
          id: 'other-mcp',
          name: t('conn_other_mcp_name', 'Any MCP client'),
          glyph: 'MCP',
          icon: '/icons/connections/mcp.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'agent',
          section: 'editors',
          short: t('conn_other_mcp_short', 'Any other MCP client with the URL'),
          intro: t(
            'conn_other_mcp_intro',
            'PostQueen exposes 14 tools at a single streamable HTTP endpoint (13 registry tools plus ask_postqueen). If your editor or agent can reach a remote MCP server, use the URL below (API key in the path or as a Bearer token). Get your key from Settings → API Keys.'
          ),
          examples: [
            sample({
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_other_mcp_ex', 'Ask the client to list your PostQueen channels'),
              reply: t('conn_other_mcp_ex_reply', 'Channels on this account: Instagram, X, LinkedIn and YouTube.'),
              tool: 'integrationList',
            }),
            sample({
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t('conn_other_mcp_ex_ig', 'Ask the client to make a photo and draft it to Instagram tonight at 7'),
              reply: t('conn_other_mcp_ex_ig_reply', 'Photo is drafted to Instagram for tonight at 19:00. Open the calendar if you want a last look.'),
              tool: 'schedulePostTool',
            }),
            sample({
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_other_mcp_ex_multi', 'Ask the client to share this visual to Instagram, X and LinkedIn Friday at 10 as drafts'),
              reply: t('conn_other_mcp_ex_multi_reply', 'Visual is drafted to Instagram, X and LinkedIn for Friday at 10:00. Nothing goes out until you confirm.'),
              tool: 'schedulePostTool',
            }),
          ],
          note: t(
            'conn_other_mcp_note',
            'Use this generic shape for Cline, Continue, Goose, Warp, JetBrains AI Assistant, Raycast and GitHub Copilot CLI. VS Code, Windsurf and Zed have their own cards. Claude Desktop is the exception: do not paste a plain url into claude_desktop_config.json; use a custom connector or mcp-remote.'
          ),
          docs: [
            {
              label: t('conn_docs_other_mcp', 'Other MCP clients'),
              href: `${DOCS}/mcp/clients/other-clients`,
            },
          ],
          steps: [
            {
              title: t('conn_other_mcp_step_url', 'Streamable HTTP URL'),
              code: mcpUrlWithKey,
            },
            {
              title: t('conn_other_mcp_step_bearer', 'Or Bearer auth'),
              detail: t(
                'conn_other_mcp_step_bearer_detail',
                'Some clients prefer a bare URL plus an Authorization header. MCP Bearer is fine here. The Public API is different: it wants the raw key with no Bearer prefix.'
              ),
              code: `${mcpUrl}\nAuthorization: Bearer ${apiKey}`,
            },
          ],
        },
      ],
    },
    {
      id: 'automation',
      label: t('conn_group_automation', 'Automation'),
      blurb: t(
        'conn_group_automation_blurb',
        'n8n is live. Zapier and Make official apps are coming soon. All three open from the left rail, next to Webhooks and RSS AutoPost.'
      ),
      items: [
        {
          id: 'n8n',
          name: 'n8n',
          glyph: 'n8',
          icon: '/icons/connections/n8n.svg',
          kind: 'FLOW',
          method: 'HTTP',
          cred: 'api',
          exampleKind: 'workflow',
          section: 'automation',
          short: t('conn_n8n_short', 'Schedule posts from an n8n workflow'),
          intro: t(
            'conn_n8n_intro',
            'Use the community node to publish from an n8n flow, and PostQueen webhooks to trigger a flow when a post publishes. This is not a chat prompt, you drop nodes on a canvas.'
          ),
          examples: [
            {
              title: t('conn_n8n_ex_1_title', 'New photo → Instagram'),
              body: t(
                'conn_n8n_ex_1_body',
                'New photo in Google Drive → Upload File → Create Post on Instagram.'
              ),
            },
            {
              title: t('conn_n8n_ex_2_title', 'New video → X draft'),
              body: t(
                'conn_n8n_ex_2_body',
                'New video in a folder → Create Post as a draft on X.'
              ),
            },
            {
              title: t('conn_n8n_ex_3_title', 'PostQueen → n8n'),
              body: t(
                'conn_n8n_ex_3_body',
                'When a post publishes, PostQueen POSTs to your n8n webhook so a sheet can log it.'
              ),
            },
          ],
          info: t(
            'conn_n8n_note',
            'Self-hosted n8n needs the community node installed before the credential appears. n8n Cloud can install community nodes from Settings → Community Nodes. Node.js 20.15+.'
          ),
          docs: [
            {
              label: t('conn_docs_n8n', 'n8n guide'),
              href: `${DOCS}/automation/n8n`,
            },
          ],
          steps: [
            {
              title: t('conn_n8n_step_node', 'Install the node'),
              detail: t(
                'conn_n8n_step_node_detail',
                'n8n → Settings → Community Nodes → Install → n8n-nodes-postqueen.'
              ),
              code: 'n8n-nodes-postqueen',
            },
            {
              title: t('conn_n8n_step_cred', 'Add the credential'),
              detail: t(
                'conn_n8n_step_cred_detail',
                'Create a PostQueen API credential. Paste your key from Settings → API Keys. The Public API wants the raw key, n8n handles the Authorization header for you.'
              ),
              code: apiKey,
            },
            ...(apiUrl
              ? [
                  {
                    title: t('conn_n8n_step_host', 'Set the Host'),
                    detail: t(
                      'conn_n8n_step_host_detail',
                      "In the same credential, replace the default Host with your server's API address."
                    ),
                    code: apiUrl,
                  },
                ]
              : []),
            {
              title: t(
                'conn_n8n_step_trigger',
                'Trigger flows from PostQueen'
              ),
              detail: t(
                'conn_n8n_step_trigger_detail',
                'Add your n8n webhook URL under Settings → Webhooks. PostQueen posts the published post to it.'
              ),
            },
          ],
        },
        {
          id: 'zapier',
          name: 'Zapier',
          glyph: 'Zp',
          icon: '/icons/connections/zapier.svg',
          kind: 'FLOW',
          method: 'HTTP',
          cred: 'api',
          exampleKind: 'workflow',
          section: 'automation',
          soon: true,
          short: t('conn_zapier_short', 'HTTP today. Official Zapier app soon'),
          intro: t(
            'conn_zapier_intro',
            'There is no PostQueen app in Zapier\'s directory yet. Until there is, Webhooks by Zapier talks to the Public API in both directions. That Zapier app is on Professional, Team and Enterprise, not the Free plan. Zaps you build now stay valid.'
          ),
          info: t(
            'conn_zapier_note',
            'Use Custom Request, not the plain POST event: the create-post body is nested JSON. Authorization is the raw API key, no Bearer prefix.'
          ),
          examples: [
            {
              title: t('conn_zapier_ex_1_title', 'New photo → Instagram'),
              body: t(
                'conn_zapier_ex_1_body',
                'When a new photo lands in Drive → Webhooks by Zapier POST /public/v1/posts to Instagram.'
              ),
            },
            {
              title: t('conn_zapier_ex_2_title', 'New video → X'),
              body: t(
                'conn_zapier_ex_2_body',
                'When a new video is ready → schedule it on X as a draft.'
              ),
            },
          ],
          docs: [
            {
              label: t('conn_docs_zapier', 'Zapier guide'),
              href: `${DOCS}/automation/zapier`,
            },
          ],
          steps: [
            {
              title: t('conn_zapier_step_out', 'PostQueen → Zapier'),
              detail: t(
                'conn_zapier_step_out_detail',
                'Create a Catch Hook trigger in Zapier, then paste its URL under Settings → Webhooks. Every published post arrives there.'
              ),
            },
            {
              title: t('conn_zapier_step_in', 'Zapier → PostQueen'),
              detail: t(
                'conn_zapier_step_in_detail',
                'Use the Webhooks by Zapier Custom Request action (not the plain POST event) with this URL. The create-post body is nested JSON.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_zapier_step_auth', 'Authenticate the request'),
              detail: t(
                'conn_zapier_step_auth_detail',
                'Add this header. No Bearer prefix, the Public API expects the raw key.'
              ),
              code: `Authorization: ${apiKey}`,
            },
          ],
        },
        {
          id: 'make',
          name: 'Make',
          glyph: 'Mk',
          icon: '/icons/connections/make.svg',
          kind: 'FLOW',
          method: 'HTTP',
          cred: 'api',
          exampleKind: 'http',
          section: 'automation',
          soon: true,
          short: t('conn_make_short', 'HTTP today. Official Make app soon'),
          intro: t(
            'conn_make_intro',
            "No PostQueen module on Make yet, coming soon on cloud. Make's HTTP and Webhooks modules cover the same ground today. Scenarios you build against the Public API stay valid when the native app lands."
          ),
          examples: [
            {
              title: t('conn_make_ex_1_title', 'New photo → Instagram'),
              body: t(
                'conn_make_ex_1_body',
                'New photo in a folder → HTTP Make a request → POST /public/v1/posts to Instagram.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_make_ex_2_title', 'Watch publishes'),
              body: t(
                'conn_make_ex_2_body',
                'Custom Webhook in Make, URL under Settings → Webhooks, then route the payload.'
              ),
            },
          ],
          docs: [
            {
              label: t('conn_docs_make', 'Make guide'),
              href: `${DOCS}/automation/make`,
            },
          ],
          steps: [
            {
              title: t('conn_make_step_in', 'Make → PostQueen'),
              detail: t(
                'conn_make_step_in_detail',
                'HTTP app → Make a request. Method POST. Body type Raw, content type JSON.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_make_step_auth', 'Authenticate the request'),
              detail: t(
                'conn_make_step_auth_detail',
                'Headers → Add item. Name Authorization. Value is your API key with no Bearer prefix. That trips people who have wired other APIs into Make.'
              ),
              code: `Authorization: ${apiKey}`,
            },
            {
              title: t('conn_make_step_out', 'PostQueen → Make'),
              detail: t(
                'conn_make_step_out_detail',
                'Add a Custom Webhook module, copy its URL and paste it under Settings → Webhooks.'
              ),
            },
          ],
        },
        {
          id: 'webhooks',
          name: t('conn_webhooks_name', 'Webhooks'),
          glyph: 'WH',
          kind: 'FLOW',
          method: 'HTTP',
          cred: 'none',
          exampleKind: 'http',
          section: 'automation',
          short: t('conn_webhooks_short', 'Get an HTTP call when a post goes live'),
          intro: t(
            'conn_webhooks_intro',
            'PostQueen POSTs the published post as JSON to any URL you register. A webhook can watch every channel or just the ones you pick.'
          ),
          examples: [
            {
              title: t('conn_webhooks_ex_title', 'Log publishes'),
              body: t(
                'conn_webhooks_ex_body',
                'Point a webhook at n8n, Make or your own endpoint. The body includes the post, the channel and a link to it.'
              ),
            },
          ],
          note: t(
            'conn_webhooks_note',
            'Requests are not signed, so treat the URL itself as the secret, give each destination its own, and do not act on a payload you cannot otherwise verify.'
          ),
          docs: [
            {
              label: t('conn_docs_webhooks', 'Webhooks guide'),
              href: `${DOCS}/automation/webhooks`,
            },
          ],
          steps: [
            {
              title: t('conn_webhooks_step_add', 'Add a URL'),
              detail: t(
                'conn_webhooks_step_add_detail',
                'Settings → Webhooks. Optionally limit it to certain channels.'
              ),
            },
            {
              title: t('conn_webhooks_step_receive', 'What arrives'),
              detail: t(
                'conn_webhooks_step_receive_detail',
                'A POST with the post, its channel and its release URL, once publishing succeeds.'
              ),
            },
          ],
        },
        {
          id: 'rss',
          name: t('conn_rss_name', 'RSS AutoPost'),
          glyph: 'RSS',
          kind: 'FLOW',
          method: 'HTTP',
          cred: 'none',
          exampleKind: 'workflow',
          section: 'automation',
          short: t('conn_rss_short', 'Turn RSS items into calendar drafts'),
          intro: t(
            'conn_rss_intro',
            'Configure feeds under Settings → Autopost. Each new item can become a draft on your calendar on an hourly check.'
          ),
          examples: [
            {
              title: t('conn_rss_ex_title', 'Blog → drafts'),
              body: t(
                'conn_rss_ex_body',
                'Paste your blog RSS URL, pick LinkedIn + X, leave items as drafts so you review before they go out.'
              ),
            },
          ],
          docs: [
            {
              label: t('conn_docs_rss', 'RSS AutoPost guide'),
              href: `${DOCS}/automation/rss-autopost`,
            },
          ],
          steps: [
            {
              title: t('conn_rss_step_open', 'Open Autopost'),
              detail: t(
                'conn_rss_step_open_detail',
                'Settings → Autopost → Add an autopost, then paste the feed URL.'
              ),
            },
            {
              title: t('conn_rss_step_channels', 'Pick channels and timing'),
              detail: t(
                'conn_rss_step_channels_detail',
                'Choose where new items land and whether they stay as drafts for review.'
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'developer',
      label: t('conn_group_developer', 'Develop'),
      blurb: t(
        'conn_group_developer_blurb',
        'Public API, CLI, Node SDK and OAuth apps. Each has its own left-nav row.'
      ),
      items: [
        {
          id: 'cli',
          name: t('conn_cli_name', 'Command line'),
          glyph: 'CLI',
          kind: 'API',
          method: 'CLI',
          cred: 'env',
          exampleKind: 'cli',
          section: 'developer',
          short: t('conn_cli_short', 'Run postqueen commands in a shell'),
          intro: t(
            'conn_cli_intro',
            'The postqueen CLI is 16 commands for channels, posts, media uploads and analytics. Same Public API under the hood; data commands print JSON. It does not generate video. The Agent Skill is a playbook and does not install this package.'
          ),
          info: t(
            'conn_cli_note',
            'Video generation lives on MCP (generateVideoTool) and the Public API (POST /generate-video). Analytics is here and on the API, not on MCP.'
          ),
          examples: [
            {
              title: t('conn_ex_label_week', 'Check the calendar'),
              body: t('conn_cli_ex_list', 'List connected channels'),
              code: 'postqueen integrations:list',
              reply: `[
  { "name": "Instagram", "identifier": "acme" },
  { "name": "X", "identifier": "acme" },
  { "name": "LinkedIn", "identifier": "acme" }
]`,
            },
            {
              title: t('conn_ex_label_ig', 'One channel: Instagram'),
              body: t(
                'conn_cli_ex_ig',
                'Schedule an Instagram photo as a draft'
              ),
              code: 'postqueen posts:create -c "Tonight\'s photo" -s "2026-08-01T19:00:00Z" -i <instagram-id> -t draft',
            },
            {
              title: t('conn_ex_label_multi', 'Several channels'),
              body: t('conn_cli_ex_create', 'Schedule the same photo on Instagram, X and LinkedIn'),
              code: 'postqueen posts:create -c "Tonight\'s photo" -s "2026-08-01T10:00:00Z" -i <instagram-id>,<x-id>,<linkedin-id> -t draft',
            },
          ],
          docs: [
            {
              label: t('conn_docs_cli', 'CLI introduction'),
              href: `${DOCS}/cli/introduction`,
            },
            {
              label: t('conn_docs_cli_auth', 'Authentication'),
              href: `${DOCS}/cli/authentication`,
            },
          ],
          steps: [
            {
              title: t('conn_cli_step_install', 'Install it'),
              detail: t(
                'conn_cli_step_install_detail',
                'Or `pnpm install -g postqueen`. Verify with `postqueen --help`.'
              ),
              code: 'npm install -g postqueen',
            },
            {
              title: t('conn_cli_step_login', 'Authenticate'),
              detail: t(
                'conn_cli_step_login_detail',
                'Settings → API Keys → Reveal, then export. Self-hosted OAuth device flow (`auth:login`) is advanced, see Authentication docs.'
              ),
              code: `export POSTQUEEN_API_KEY="${apiKey}"`,
            },
            ...apiUrlStep,
            {
              title: t('conn_cli_step_try', 'Try it'),
              detail: t(
                'conn_cli_step_try_detail',
                'First command that reaches the API, lists your connected channels as JSON.'
              ),
              code: 'postqueen integrations:list',
            },
          ],
        },
        {
          id: 'api',
          name: t('conn_api_name', 'Public API'),
          glyph: 'API',
          kind: 'API',
          method: 'API',
          cred: 'api',
          exampleKind: 'api',
          section: 'developer',
          short: t('conn_api_short', 'REST for channels, posts and media'),
          intro: t(
            'conn_api_intro',
            'REST at /public/v1. List channels, schedule and delete posts, upload media, generate video, read analytics. This is the widest surface: 22 key authenticated operations. Image generation is MCP only. The header is the raw key, no Bearer prefix.'
          ),
          info: t(
            'conn_api_note',
            'MCP Bearer headers are for /mcp. Here, Authorization is the raw key. pos_ OAuth tokens use the same raw header. Video: POST /generate-video. There is no image generation endpoint on this API.'
          ),
          examples: [
            {
              title: t('conn_api_ex_title', 'List channels'),
              body: t(
                'conn_api_ex_body',
                'Send the key in Authorization with no Bearer.'
              ),
              code: `curl -H "Authorization: ${apiKey}" ${backendUrl}/public/v1/integrations`,
            },
          ],
          docs: [
            {
              label: t('conn_docs_api', 'Public API overview'),
              href: `${DOCS}/public-api/introduction`,
            },
          ],
          steps: [
            {
              title: t('conn_api_step_base', 'Base URL'),
              code: `${backendUrl}/public/v1`,
            },
            {
              title: t('conn_api_step_auth', 'Authenticate'),
              detail: t(
                'conn_api_step_auth_detail',
                'Send your key in the Authorization header on every request. Do not prefix Bearer, that is for MCP, not this API.'
              ),
              code: `curl -H "Authorization: ${apiKey}" ${backendUrl}/public/v1/integrations`,
            },
            {
              title: t('conn_api_step_post', 'Schedule a post'),
              detail: t(
                'conn_api_step_post_detail',
                'POST to /posts with the channels and the content.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
          ],
        },
        {
          id: 'sdk',
          name: t('conn_sdk_name', 'Node SDK'),
          glyph: 'JS',
          kind: 'API',
          method: 'API',
          cred: 'env',
          exampleKind: 'api',
          section: 'developer',
          short: t('conn_sdk_short', 'Typed Node client for the Public API'),
          intro: t(
            'conn_sdk_intro',
            'A thin wrapper over the public API with types for the request and response shapes.'
          ),
          examples: [
            {
              body: t('conn_sdk_ex', 'List channels, then schedule a photo post'),
              code: `import PostQueen from '@postqueen/node';

const pq = new PostQueen(process.env.POSTQUEEN_API_KEY);
const channels = await pq.integrations();
await pq.post({
  type: 'schedule',
  date: '2026-08-01T09:00:00Z',
  shortLink: false,
  tags: [],
  posts: [{ integration: { id: channels[0].id }, value: [{ content: 'We just shipped' }] }],
});`,
            },
          ],
          docs: [
            {
              label: t('conn_docs_sdk', 'Node.js SDK'),
              href: `${DOCS}/public-api/sdk`,
            },
          ],
          steps: [
            {
              title: t('conn_sdk_step_install', 'Install it'),
              code: 'npm install @postqueen/node',
            },
            {
              title: t('conn_sdk_step_key', 'Authenticate'),
              detail: t(
                'conn_sdk_step_key_detail',
                'Pass your API key when you construct the client. Settings → API Keys.'
              ),
              code: `POSTQUEEN_API_KEY="${apiKey}"`,
            },
            ...(apiUrl
              ? [
                  {
                    title: t('conn_sdk_step_url', 'Point it at your server'),
                    detail: t(
                      'conn_sdk_step_url_detail',
                      'The client calls the hosted API by default. Set this, or pass the URL as the second argument: new PostQueen(key, url).'
                    ),
                    code: `POSTQUEEN_API_URL="${apiUrl}"`,
                  },
                ]
              : []),
          ],
        },
        {
          id: 'oauth',
          name: t('conn_oauth_name', 'OAuth apps'),
          glyph: 'OA',
          kind: 'API',
          method: 'API',
          cred: 'none',
          exampleKind: 'api',
          section: 'developer',
          short: t('conn_oauth_short', 'Let other apps post for your users'),
          intro: t(
            'conn_oauth_intro',
            'If you are building a product rather than automating your own account, register an OAuth app under OAuth Apps. Users approve access and you receive a pos_ token. That token works on the Public API (raw key header) and on MCP as a Bearer token on /mcp. The URL form /mcp/KEY only accepts API keys.'
          ),
          docs: [
            {
              label: t('conn_docs_oauth', 'OAuth2 authentication'),
              href: `${DOCS}/public-api/oauth`,
            },
          ],
          steps: [
            {
              title: t('conn_oauth_step_create', 'Create the app'),
              detail: t(
                'conn_oauth_step_create_detail',
                'Connect → OAuth Apps, or Settings → Developers. Set your redirect URL there. This is not where the personal API key lives, that is API Keys.'
              ),
            },
            {
              title: t('conn_oauth_step_token', 'Use the token'),
              detail: t(
                'conn_oauth_step_token_detail',
                'Tokens are prefixed pos_ and go in the same Authorization header as an API key (raw, no Bearer) on the Public API. On MCP, send them as Authorization: Bearer pos_… on https://api.postqueen.ai/mcp. Do not put a pos_ token in the /mcp/KEY URL; that form only looks up API keys.'
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'media',
      label: t('conn_group_media', 'Media'),
      blurb: t(
        'conn_group_media_blurb',
        'Third-party media services you already pay for, paste an API key and they show up in the media picker.'
      ),
      items: [
        {
          id: 'heygen',
          name: 'HeyGen',
          glyph: 'HG',
          icon: '/icons/third-party/heygen.png',
          kind: 'MEDIA',
          method: 'API',
          cred: 'none',
          exampleKind: 'workflow',
          section: 'media',
          short: t('conn_heygen_short', 'HeyGen avatars in the media picker'),
          intro: t(
            'conn_heygen_intro',
            'Paste your HeyGen API key under Integrations. The service appears in the post editor media row as Integrations once connected.'
          ),
          examples: [
            {
              body: t(
                'conn_heygen_ex',
                'Write the post, then generate an avatar clip from the media row'
              ),
            },
          ],
          docs: [
            {
              label: t('conn_docs_heygen', 'Third-party integrations'),
              href: `${DOCS}/using/third-party-integrations`,
            },
          ],
          steps: [
            {
              title: t('conn_media_step_open', 'Open Integrations'),
              detail: t(
                'conn_media_step_open_detail',
                'App menu → Integrations (below Plugs). Click the HeyGen card.'
              ),
            },
            {
              title: t('conn_media_step_key', 'Paste the API key'),
              detail: t(
                'conn_heygen_step_key_detail',
                'She checks GET https://api.heygen.com/v1/user/me before storing anything.'
              ),
            },
          ],
        },
        {
          id: 'reelfarm',
          name: 'Reel.Farm',
          glyph: 'RF',
          icon: '/icons/third-party/reelfarm.png',
          kind: 'MEDIA',
          method: 'API',
          cred: 'none',
          exampleKind: 'workflow',
          section: 'media',
          short: t('conn_reelfarm_short', 'Import ReelFarm clips to the library'),
          intro: t(
            'conn_reelfarm_intro',
            'Paste your Reel.Farm API key under Integrations. Import appears in the media library toolbar once connected.'
          ),
          examples: [
            {
              body: t(
                'conn_reelfarm_ex',
                'Import a finished Reel.Farm clip, then attach it to a scheduled post'
              ),
            },
          ],
          docs: [
            {
              label: t('conn_docs_reelfarm', 'Third-party integrations'),
              href: `${DOCS}/using/third-party-integrations`,
            },
          ],
          steps: [
            {
              title: t('conn_media_step_open', 'Open Integrations'),
              detail: t(
                'conn_reelfarm_step_open_detail',
                'App menu → Integrations. Click the Reel.Farm card and paste your key.'
              ),
            },
            {
              title: t('conn_reelfarm_step_import', 'Import into Media'),
              detail: t(
                'conn_reelfarm_step_import_detail',
                'On the Media page or Insert Media, use Import once the account is connected.'
              ),
            },
          ],
        },
      ],
    },
  ];
}
