/**
 * Static Connections catalog — docs-backed, not an API.
 *
 * Publishing channels live on Channels / Add Channel; this catalog covers
 * assistants, self-hosted agents, chat front-doors, automation, CLI/API and
 * third-party media. Code samples interpolate backendUrl / mcpUrl / apiKey at
 * build time.
 *
 * Do not invent MCP commands for OpenClaw/Hermes — they use Agent Skills.
 * Do not invent Typefully commands.
 */

export type Kind = 'AGENT' | 'CHAT' | 'MCP' | 'SKILL' | 'FLOW' | 'API' | 'MEDIA';

/** How the card connects — shown as a chip, not a destination. */
export type MethodId = 'MCP' | 'Skill' | 'Chat' | 'HTTP' | 'CLI' | 'API';

/** How examples render in the detail pane. */
export type ExampleKind = 'chat' | 'workflow' | 'http' | 'cli' | 'skill' | 'api';

/** Credential the detail pane highlights. */
export type CredKind = 'mcp' | 'api' | 'env' | 'none';

/** Catalog group ids. */
export type SectionId =
  | 'agents'
  | 'chat'
  | 'assistants'
  | 'mcp'
  | 'automation'
  | 'developer'
  | 'media';

export type ConnectNavId =
  | 'all'
  | 'assistants'
  | 'agents'
  | 'chat'
  | 'automation'
  | 'build'
  | 'api-keys'
  | 'developers'
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

export const AGENTS_DISPLAY_ORDER = [
  'openclaw',
  'hermes',
  'claude-code',
  'codex',
  'muse-code',
] as const;

export const ASSISTANTS_DISPLAY_ORDER = [
  'claude-apps',
  'chatgpt',
  'grok',
  'cursor',
  'gemini',
  'muse',
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
  body: string;
  code?: string;
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

export const CONNECT_NAV_CONNECTORS: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
}[] = [
  { id: 'all', labelKey: 'connect_nav_all', labelDefault: 'All' },
  {
    id: 'assistants',
    labelKey: 'connect_nav_assistants',
    labelDefault: 'Assistants',
  },
  { id: 'agents', labelKey: 'connect_nav_agents', labelDefault: 'Agents' },
  { id: 'chat', labelKey: 'connect_nav_chat', labelDefault: 'Chat' },
  {
    id: 'automation',
    labelKey: 'connect_nav_automation',
    labelDefault: 'Automation',
  },
  { id: 'build', labelKey: 'connect_nav_build', labelDefault: 'Build' },
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
    id: 'developers',
    labelKey: 'connect_nav_developers',
    labelDefault: 'Developers',
  },
  {
    id: 'approved-apps',
    labelKey: 'connect_nav_approved_apps',
    labelDefault: 'Approved Apps',
  },
];

export const CONNECT_NAV = [...CONNECT_NAV_CONNECTORS, ...CONNECT_NAV_ACCOUNT];

/** Deep-link aliases → catalog ids (`?connector=claude`). */
export const CONNECTOR_ALIASES: Record<string, string> = {
  claude: 'claude-apps',
  'claude-desktop': 'claude-apps',
  'claude-app': 'claude-apps',
  'claude-web': 'claude-apps',
  slack: 'slack-chat',
  discord: 'discord-chat',
  'gemini-cli': 'gemini',
  'other-clients': 'other-mcp',
  'any-mcp': 'other-mcp',
  'make.com': 'make',
  'grok-bot': 'grok',
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
  if (key === 'cli-api' || key === 'cli' || key === 'api') return 'build';
  if (key === 'media' || key === 'ai-agents' || key === 'mcp') return 'all';
  if (key === 'agent-skills') return 'agents';
  if (CONNECT_NAV.some((n) => n.id === key)) return key as ConnectNavId;
  return null;
}

const DOCS = 'https://docs.postqueen.ai';

const HUB_SECTIONS: SectionId[] = [
  'agents',
  'chat',
  'assistants',
  'mcp',
  'automation',
  'developer',
];

/**
 * Connections for a Connect-panel nav id.
 * `api-keys` / `developers` / `approved-apps` are panel-only.
 * Media stays in the catalog but is not a Connect nav.
 */
export function connectionsForNav(
  groups: Group[],
  navId: ConnectNavId
): Connection[] {
  const all = groups.flatMap((g) => g.items);
  switch (navId) {
    case 'all':
      return all.filter((c) => HUB_SECTIONS.includes(c.section));
    case 'assistants':
      return sortByIdOrder(
        all.filter((c) => c.section === 'assistants' || c.section === 'mcp'),
        ASSISTANTS_DISPLAY_ORDER
      );
    case 'agents':
      return sortByIdOrder(
        all.filter((c) => c.section === 'agents'),
        AGENTS_DISPLAY_ORDER
      );
    case 'chat':
      return all.filter((c) => c.section === 'chat');
    case 'automation':
      return all.filter((c) => c.section === 'automation');
    case 'build':
      return all.filter((c) => c.section === 'developer');
    case 'api-keys':
    case 'developers':
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
  if (item.section === 'chat') return 'chat';
  if (item.section === 'automation') return 'automation';
  if (item.section === 'developer') return 'build';
  if (item.section === 'agents') return 'agents';
  if (item.section === 'assistants' || item.section === 'mcp') return 'assistants';
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

  const chatExamples = (): Example[] => [
    { body: t('conn_ex_list_channels', 'List my connected channels') },
    {
      body: t(
        'conn_ex_schedule_launch',
        'Draft a launch post and schedule it for Tuesday 09:00'
      ),
    },
    {
      body: t(
        'conn_ex_cross_post',
        'Publish the changelog to X and LinkedIn'
      ),
    },
  ];

  const skillInstall: Step[] = [
    {
      title: t('conn_step_skill_install', 'Install the PostQueen skill'),
      detail: t(
        'conn_step_skill_install_detail',
        'One command, once per machine. It installs the skill playbook — not the CLI. Install the CLI separately with npm i -g postqueen if you want shell commands.'
      ),
      code: 'npx skills add GkhanKINAY/postqueen-agent',
    },
    {
      title: t('conn_step_skill_key', 'Give it your API key'),
      detail: t(
        'conn_step_skill_key_detail',
        'The agent reads this from the environment. Put it in your shell profile to make it permanent. Get the key from Settings → API Keys.'
      ),
      code: `export POSTQUEEN_API_KEY="${apiKey}"`,
    },
    ...apiUrlStep,
  ];

  const chatFrontDoorSteps = (): Step[] => [
    {
      title: t(
        'conn_chat_step_agent',
        'Run OpenClaw or Hermes on your machine'
      ),
      detail: t(
        'conn_chat_step_agent_detail',
        'Chat front doors talk to an agent you host — PostQueen never signs into the chat app. Install OpenClaw or Hermes, then keep its gateway awake.'
      ),
    },
    ...skillInstall,
    {
      title: t('conn_chat_step_channel', 'Connect the chat app'),
      detail: t(
        'conn_chat_step_channel_detail',
        'Follow the channel section in the docs for pairing, bot tokens or QR login. Slack, Discord and Telegram can also be publishing channels — that is a separate setup under Channels.'
      ),
    },
    {
      title: t('conn_chat_step_try', 'Send it a message'),
      detail: t(
        'conn_chat_step_try_detail',
        'From the connected chat app, in your own words. Keep a human in the loop before anything publishes.'
      ),
      code: t(
        'conn_bridge_example',
        'Schedule this to LinkedIn and X tomorrow at 9am: …'
      ),
    },
  ];

  return [
    {
      id: 'agents',
      label: t('conn_group_agents', 'Agents'),
      blurb: t(
        'conn_group_agents_blurb',
        'Self-hosted agents that run her skill and drive the calendar from a brief or a chat.'
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
          exampleKind: 'skill',
          section: 'agents',
          short: t('conn_openclaw_short', 'Run her from a self-hosted agent'),
          intro: t(
            'conn_openclaw_intro',
            "OpenClaw is an open-source agent you run yourself. It reads the Agent Skills package rather than MCP, which means it loads PostQueen's commands on demand instead of carrying a whole tool schema in every prompt — cheaper, and it leaves room for the rest of your context."
          ),
          examples: [
            {
              body: t(
                'conn_openclaw_prompt_1',
                'Post the blog cover to LinkedIn and X tomorrow at 9am'
              ),
            },
            {
              body: t('conn_openclaw_prompt_2', 'What is in my queue this week?'),
            },
            {
              body: t(
                'conn_openclaw_prompt_3',
                'Draft a thread from this release note'
              ),
            },
          ],
          info: t(
            'conn_openclaw_note',
            'The same install also powers the chat front doors: once OpenClaw has this skill, anything that can reach your agent can publish through it. Keep a human in the loop before anything goes out.'
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
            ...skillInstall,
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_openclaw_verify',
                'Ask the agent to list your social accounts. It should name every channel you have connected.'
              ),
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
          exampleKind: 'skill',
          section: 'agents',
          short: t('conn_hermes_short', 'Load PostQueen as a Hermes skill'),
          intro: t(
            'conn_hermes_intro',
            "Hermes is Nous Research's open-source agent framework. It picks PostQueen up through the same Agent Skills package the other CLI agents use, so one install covers every agent on the machine."
          ),
          examples: [
            {
              body: t(
                'conn_hermes_prompt_1',
                'Schedule my latest post to every connected channel for Monday morning'
              ),
            },
            { body: t('conn_hermes_prompt_2', 'List my connected channels') },
            {
              body: t(
                'conn_hermes_prompt_3',
                'Draft a weekly digest for LinkedIn'
              ),
            },
          ],
          info: t(
            'conn_hermes_note',
            'Hermes can run tools on a schedule from its own config, which is a neat fit for recurring publishing — a weekly digest, say. Whatever you automate, keep a human in the loop before it publishes.'
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
            ...skillInstall,
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'hermes tools list',
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
          short: t('conn_cc_short', 'Schedule posts from the terminal'),
          intro: t(
            'conn_cc_intro',
            'Claude Code can take PostQueen either as an MCP server or as an Agent Skill. MCP is one command; skills load less context per call. The skill does not install the CLI — that is npm i -g postqueen.'
          ),
          examples: [
            {
              body: t('conn_ex_cli_list', 'List connected channels'),
              code: 'claude mcp list',
            },
            {
              body: t(
                'conn_cc_example',
                'Ask Claude Code to schedule a launch post for Tuesday 09:00'
              ),
            },
          ],
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
          id: 'codex',
          name: 'Codex',
          glyph: 'Cx',
          icon: '/icons/connections/codex.svg',
          kind: 'SKILL',
          method: 'Skill',
          cred: 'env',
          exampleKind: 'skill',
          section: 'agents',
          short: t('conn_codex_short', 'Post from Codex in the terminal'),
          intro: t(
            'conn_codex_intro',
            'Codex discovers PostQueen from the skill definition and runs its commands in a sandbox. MCP is also documented for the Codex CLI. The skill is a playbook; install the CLI separately if you want postqueen commands on the PATH.'
          ),
          examples: [
            {
              body: t(
                'conn_codex_try',
                'list my social media integrations'
              ),
              code: 'codex "list my social media integrations"',
            },
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
          exampleKind: 'cli',
          section: 'agents',
          short: t('conn_muse_code_short', 'Wire Muse Code over streamable HTTP'),
          intro: t(
            'conn_muse_code_intro',
            'Muse Code is Meta\'s coding agent. It loads remote MCP servers from ~/.config/muse/settings.json over streamable HTTP. This is the path that works today — the consumer Muse app does not take an MCP URL yet.'
          ),
          examples: [
            {
              body: t(
                'conn_muse_code_ex',
                'Ask Muse Code to list your PostQueen channels'
              ),
            },
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
        'Message an agent from WhatsApp, Telegram, Slack or Discord. Not publishing channels — those live under Channels.'
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
          exampleKind: 'chat',
          section: 'chat',
          short: t('conn_whatsapp_short', 'Voice-note her from your phone'),
          intro: t(
            'conn_whatsapp_intro',
            'WhatsApp is a chat front door only — PostQueen does not publish into WhatsApp. OpenClaw pairs over QR on your machine; your messages never touch PostQueen directly.'
          ),
          examples: [
            {
              body: t(
                'conn_bridge_prompt_1',
                'Write a launch thread for v3.2 and schedule it'
              ),
            },
            {
              body: t('conn_bridge_prompt_2', 'What is going out this week?'),
            },
            { body: t('conn_bridge_prompt_3', 'Publish the changelog now') },
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
          steps: chatFrontDoorSteps(),
        },
        {
          id: 'telegram',
          name: 'Telegram',
          glyph: 'Tg',
          icon: '/icons/connections/telegram.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'chat',
          section: 'chat',
          short: t('conn_telegram_short', 'Message her from Telegram'),
          intro: t(
            'conn_telegram_intro',
            'Talk to her from Telegram through OpenClaw or Hermes on your machine. Telegram can also be a publishing channel under Channels — that is a separate setup.'
          ),
          examples: chatExamples(),
          docs: [
            {
              label: t('conn_docs_telegram', 'Telegram chat front door'),
              href: `${DOCS}/agents/chat-channels#telegram`,
            },
          ],
          steps: chatFrontDoorSteps(),
        },
        {
          id: 'slack-chat',
          name: 'Slack',
          glyph: 'Sl',
          icon: '/icons/connections/slack.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'chat',
          section: 'chat',
          short: t('conn_slack_chat_short', 'Ask her from a Slack channel'),
          intro: t(
            'conn_slack_chat_intro',
            'Use Slack as a front door to your agent — not the same as connecting Slack as a publishing channel under Channels.'
          ),
          examples: chatExamples(),
          docs: [
            {
              label: t('conn_docs_slack_chat', 'Slack chat front door'),
              href: `${DOCS}/agents/chat-channels#slack`,
            },
          ],
          steps: chatFrontDoorSteps(),
        },
        {
          id: 'discord-chat',
          name: 'Discord',
          glyph: 'Dc',
          icon: '/icons/connections/discord.svg',
          kind: 'CHAT',
          method: 'Chat',
          cred: 'env',
          exampleKind: 'chat',
          section: 'chat',
          short: t('conn_discord_chat_short', 'Ask her from a Discord channel'),
          intro: t(
            'conn_discord_chat_intro',
            'Message your agent from Discord. Publishing into Discord is a separate Channels setup.'
          ),
          examples: chatExamples(),
          docs: [
            {
              label: t('conn_docs_discord_chat', 'Discord chat front door'),
              href: `${DOCS}/agents/chat-channels#discord`,
            },
          ],
          steps: chatFrontDoorSteps(),
        },
      ],
    },
    {
      id: 'assistants',
      label: t('conn_group_assistants', 'Assistants'),
      blurb: t(
        'conn_group_assistants_blurb',
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
          section: 'assistants',
          short: t('conn_claude_apps_short', 'Manage content from Claude'),
          intro: t(
            'conn_claude_apps_intro',
            'Claude Desktop, claude.ai, and the Claude apps on iOS and Android all reach PostQueen over MCP. Add a custom connector when the URL is public; use mcp-remote in the Desktop config for self-hosted / VPN installs. Connectors sync to your account, so the same chat works on laptop and phone.'
          ),
          examples: chatExamples(),
          info: t(
            'conn_claude_apps_note',
            'A plain "url" entry in claude_desktop_config.json does not work — use a custom connector or mcp-remote. New connectors generally cannot be created from the mobile apps — add them on the web or Desktop first. For Claude Code in a terminal, see the Claude Code card under Agents.'
          ),
          docs: [
            {
              label: t('conn_docs_claude_apps', 'Claude MCP setup'),
              href: `${DOCS}/mcp/clients/claude`,
            },
            {
              label: t('conn_docs_claude_apps_hub', 'Claude Apps hub'),
              href: `${DOCS}/agents/claude-apps`,
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
                'Claude Desktop → Settings → Connectors → Add custom connector. Paste the MCP URL (key in the path). Leave OAuth fields empty. For LAN or VPN instances, use Edit Config and mcp-remote instead.'
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
                'claude.ai → Settings → Connectors → Add custom connector. Then toggle PostQueen on from the tools menu in a chat — it appears on iOS and Android after you add it on the web.'
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
          section: 'assistants',
          short: t('conn_chatgpt_short', 'Manage content from ChatGPT'),
          intro: t(
            'conn_chatgpt_intro',
            'ChatGPT reaches PostQueen as a custom MCP app in Developer mode. Paid plans on the web only — not the Free plan. The connector is not under Settings → Connectors.'
          ),
          examples: chatExamples(),
          info: t(
            'conn_chatgpt_note',
            'Turn on Developer mode, then create a developer-mode app from Plugins. In a chat, open + → Developer mode and include PostQueen. Authentication: No authentication — the key is already in the URL.'
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
                'ChatGPT on the web → Settings → Security and login → Developer mode. On Business, Enterprise and Edu an admin controls this switch. It is not available on the Free plan.'
              ),
            },
            {
              title: t('conn_chatgpt_step_plugin', 'Create the app'),
              detail: t(
                'conn_chatgpt_step_plugin_detail',
                'Go to chatgpt.com/plugins (or Settings → Plugins), click +, name it PostQueen, paste the MCP URL, set Authentication to No authentication, then save. Enable it in a chat via + → Developer mode.'
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
          section: 'assistants',
          short: t('conn_grok_short', 'Add her as a Grok custom connector'),
          intro: t(
            'conn_grok_intro',
            'Grok on the web, iOS and Android can call remote MCP servers. Add PostQueen as a custom connector at grok.com/connectors. Grok Bot uses the same connector — create it there, then enable it on the Bot under Plugins. The server must be reachable over the public internet.'
          ),
          examples: chatExamples(),
          info: t(
            'conn_grok_note',
            'On Grok Business and Enterprise, an admin may need to provision the connector first. There is no Bot-only MCP URL — grok.com/connectors is the source of truth.'
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
              title: t('conn_grok_step_bot', 'Grok Bot (optional)'),
              detail: t(
                'conn_grok_step_bot_detail',
                'Create the connector on grok.com/connectors first. Then open the Bot and enable that connector under Settings → Plugins. Asking the Bot to "add a custom server" still ends at the same URL.'
              ),
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
          id: 'cursor',
          name: 'Cursor',
          glyph: 'Cu',
          icon: '/icons/connections/cursor.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'chat',
          section: 'assistants',
          short: t('conn_cursor_short', 'Schedule posts from Cursor'),
          intro: t(
            'conn_cursor_intro',
            'Cursor reads MCP servers from mcp.json. Add a remote streamable HTTP server with a url field — Cursor infers the transport. You can also add it from Cursor Settings → MCP, or the Customize → MCP page; both write the same file.'
          ),
          examples: chatExamples(),
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
                'Cursor Settings → MCP (or Customize → MCP), then add a streamable HTTP server named postqueen. Or create ~/.cursor/mcp.json (global) or .cursor/mcp.json (this project).'
              ),
            },
            {
              title: t('conn_cursor_step_url', 'Paste this JSON'),
              detail: t(
                'conn_cursor_step_url_detail',
                'url is correct for Cursor. Do not put this block in Claude Desktop\'s config — that client does not accept a plain url field.'
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
          id: 'gemini',
          name: 'Gemini CLI',
          glyph: 'Gm',
          icon: '/icons/connections/gemini-cli.svg',
          kind: 'MCP',
          method: 'MCP',
          cred: 'mcp',
          exampleKind: 'cli',
          section: 'assistants',
          short: t('conn_gemini_short', 'Point Gemini CLI at her MCP URL'),
          intro: t(
            'conn_gemini_intro',
            'Gemini CLI reads MCP servers from ~/.gemini/settings.json. Streamable HTTP uses the httpUrl key — url is reserved for SSE and will not connect to PostQueen.'
          ),
          examples: [
            {
              body: t('conn_gemini_ex_list', 'Confirm the server is connected'),
              code: 'gemini mcp list',
            },
          ],
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
                'Add this to ~/.gemini/settings.json. Use httpUrl, not url.'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { httpUrl: mcpUrlWithKey } } },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'gemini mcp list',
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
          section: 'assistants',
          soon: true,
          short: t('conn_muse_short', 'Muse app connectors — MCP coming soon'),
          intro: t(
            'conn_muse_intro',
            'Meta Muse (the personal agent in the Muse app and WhatsApp) has Connectors, including custom connectors built from API details Muse walks you through. That is not a paste-an-MCP-URL flow. First-class MCP for the Muse app is coming soon. Muse Code, the coding agent, already connects — use that card under Agents.'
          ),
          examples: [
            {
              body: t(
                'conn_muse_ex',
                'When Muse ships custom MCP, paste the same URL Grok and Claude use'
              ),
            },
          ],
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
                'Settings → Connectors can attach catalog apps (Gmail, calendar). Custom connectors there collect API information — not an MCP server URL. We will add paste-URL steps here when Meta ships that.'
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'mcp',
      label: t('conn_group_mcp_more', 'More MCP clients'),
      blurb: t(
        'conn_group_mcp_more_blurb',
        'Streamable HTTP at your /mcp endpoint — 14 tools. Any client that can reach a remote MCP server follows the same shape.'
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
          exampleKind: 'cli',
          section: 'mcp',
          short: t('conn_other_mcp_short', 'VS Code, Zed, Continue, Windsurf'),
          intro: t(
            'conn_other_mcp_intro',
            'PostQueen exposes 14 tools at a single streamable HTTP endpoint (13 registry tools plus ask_postqueen). If your editor or agent can reach a remote MCP server, use the URL below (API key in the path or as a Bearer token). Get your key from Settings → API Keys.'
          ),
          examples: [
            {
              title: t('conn_other_mcp_ex_cursor', 'Cursor / VS Code Copilot'),
              body: t(
                'conn_other_mcp_ex_cursor_body',
                'Most editors that speak MCP use a url field, like Cursor.'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { url: mcpUrlWithKey } } },
                null,
                2
              ),
            },
            {
              title: t('conn_other_mcp_ex_gemini', 'Gemini-style httpUrl'),
              body: t(
                'conn_other_mcp_ex_gemini_body',
                'Some CLIs still split SSE (url) from streamable HTTP (httpUrl).'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { httpUrl: mcpUrlWithKey } } },
                null,
                2
              ),
            },
          ],
          note: t(
            'conn_other_mcp_note',
            'There is no dedicated PostQueen guide for VS Code, Windsurf, Zed or Continue — use this generic shape. Claude Desktop is the exception: do not paste a plain url into claude_desktop_config.json; use a custom connector or mcp-remote.'
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
        'Workflows in, webhooks and RSS out. Official Zapier/Make apps are not shipped yet — HTTP still works.'
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
          short: t('conn_n8n_short', 'Schedule posts from n8n workflows'),
          intro: t(
            'conn_n8n_intro',
            'Use the community node to publish from an n8n flow, and PostQueen webhooks to trigger a flow when a post publishes. This is not a chat prompt — you drop nodes on a canvas.'
          ),
          examples: [
            {
              title: t('conn_n8n_ex_1_title', 'GitHub Release → Create Post (LinkedIn + X)'),
              body: t(
                'conn_n8n_ex_1_body',
                'GitHub Release published → Get Channels → Create Post on LinkedIn and X.'
              ),
            },
            {
              title: t('conn_n8n_ex_2_title', 'RSS → Instagram'),
              body: t(
                'conn_n8n_ex_2_body',
                'RSS item → Upload File → Create Post as a draft for review.'
              ),
            },
            {
              title: t('conn_n8n_ex_3_title', 'PostQueen → n8n'),
              body: t(
                'conn_n8n_ex_3_body',
                'When a post publishes, PostQueen POSTs to your n8n webhook so Slack or a sheet can log it.'
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
                'Create a PostQueen API credential. Paste your key from Settings → API Keys. The Public API wants the raw key — n8n handles the Authorization header for you.'
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
          short: t('conn_zapier_short', 'HTTP today, official app soon'),
          intro: t(
            'conn_zapier_intro',
            "There is no PostQueen app in Zapier's directory yet. Until there is, Webhooks by Zapier talks to the Public API in both directions. Zaps you build now stay valid."
          ),
          examples: [
            {
              title: t('conn_zapier_ex_1_title', 'Notion → calendar'),
              body: t(
                'conn_zapier_ex_1_body',
                'When a Notion page is published → Webhooks by Zapier POST /public/v1/posts.'
              ),
            },
            {
              title: t('conn_zapier_ex_2_title', 'Shopify → announce'),
              body: t(
                'conn_zapier_ex_2_body',
                'When a Shopify product goes live → schedule a launch post.'
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
                'Use the Webhooks by Zapier action with POST and this URL to create a post.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_zapier_step_auth', 'Authenticate the request'),
              detail: t(
                'conn_zapier_step_auth_detail',
                'Add this header. No Bearer prefix — the Public API expects the raw key.'
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
          short: t('conn_make_short', 'HTTP today, official app soon'),
          intro: t(
            'conn_make_intro',
            "No PostQueen module on Make yet — coming soon on cloud. Make's HTTP and Webhooks modules cover the same ground today. Scenarios you build against the Public API stay valid when the native app lands."
          ),
          examples: [
            {
              title: t('conn_make_ex_1_title', 'Typeform → LinkedIn'),
              body: t(
                'conn_make_ex_1_body',
                'New Typeform response → HTTP Make a request → POST /public/v1/posts.'
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
          short: t('conn_webhooks_short', 'HTTP call when a post goes live'),
          intro: t(
            'conn_webhooks_intro',
            'PostQueen POSTs the published post as JSON to any URL you register. A webhook can watch every channel or just the ones you pick.'
          ),
          examples: [
            {
              title: t('conn_webhooks_ex_title', 'Log publishes'),
              body: t(
                'conn_webhooks_ex_body',
                'Point a webhook at n8n, Make or your own endpoint. The body includes the post, channel and release URL.'
              ),
            },
          ],
          note: t(
            'conn_webhooks_note',
            'Requests are not signed, so treat the URL itself as the secret — give each destination its own, and do not act on a payload you cannot otherwise verify.'
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
      label: t('conn_group_developer', 'CLI & API'),
      blurb: t(
        'conn_group_developer_blurb',
        'The same public surface every other connection rides — CLI, REST, Node SDK and OAuth apps.'
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
          short: t('conn_cli_short', 'Automate posting from any shell'),
          intro: t(
            'conn_cli_intro',
            'Automate posting from the terminal. Same Public API under the hood; data commands print JSON so anything that can run a shell command can run your publishing. The Agent Skill does not install this package.'
          ),
          examples: [
            {
              body: t('conn_cli_ex_list', 'List connected channels'),
              code: 'postqueen integrations:list',
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
                'Settings → API Keys → Reveal, then export. Self-hosted OAuth device flow (`auth:login`) is advanced — see Authentication docs.'
              ),
              code: `export POSTQUEEN_API_KEY="${apiKey}"`,
            },
            ...apiUrlStep,
            {
              title: t('conn_cli_step_try', 'Try it'),
              detail: t(
                'conn_cli_step_try_detail',
                'First command that reaches the API — lists your connected channels as JSON.'
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
            'Everything the app does to your account, you can do over HTTP: list channels, schedule and delete posts, upload media, generate video, read analytics. The header is the raw key — no Bearer prefix.'
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
                'Send your key in the Authorization header on every request. Do not prefix Bearer — that is for MCP, not this API.'
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
          exampleKind: 'cli',
          section: 'developer',
          short: t('conn_sdk_short', 'Typed Node client for the Public API'),
          intro: t(
            'conn_sdk_intro',
            'A thin wrapper over the public API with types for the request and response shapes.'
          ),
          examples: [
            {
              body: t('conn_sdk_ex', 'Install and construct the client'),
              code: 'npm install @postqueen/node',
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
          short: t('conn_oauth_short', 'Let apps post on a user\'s behalf'),
          intro: t(
            'conn_oauth_intro',
            'If you are building a product rather than automating your own account, register an OAuth app under Developers. Your users authorise it and you receive a token that works with the API, MCP and the CLI — no key sharing. Tokens are prefixed pos_.'
          ),
          examples: [
            {
              body: t(
                'conn_oauth_ex',
                'Create an app, send users through authorize, store the pos_ token'
              ),
            },
          ],
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
                'Connect → Developers, or Settings → Developers. Set your redirect URL there. This is not where the personal API key lives — that is API Keys.'
              ),
            },
            {
              title: t('conn_oauth_step_token', 'Use the token'),
              detail: t(
                'conn_oauth_step_token_detail',
                'Tokens are prefixed pos_ and go in the same Authorization header as an API key (raw, no Bearer) on the Public API.'
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
        'Third-party media services you already pay for — paste an API key and they show up in the media picker.'
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
          short: t('conn_heygen_short', 'Avatar videos in the media row'),
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
          short: t('conn_reelfarm_short', 'Import clips into the media library'),
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
