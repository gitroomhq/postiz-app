/**
 * Static Connections catalog — docs-backed, not an API.
 *
 * Publishing channels live on Channels / Add Channel; this catalog covers
 * agents, chat front-doors, MCP clients, automation, CLI/API and third-party
 * media. Code samples interpolate backendUrl / mcpUrl / apiKey at build time.
 *
 * Do not invent MCP commands for OpenClaw/Hermes — they use Agent Skills.
 * Do not invent Typefully commands.
 */

export type Kind = 'AGENT' | 'CHAT' | 'MCP' | 'SKILL' | 'FLOW' | 'API' | 'MEDIA';

/** Catalog group ids (page filter tabs). */
export type SectionId =
  | 'agents'
  | 'chat'
  | 'assistants'
  | 'mcp'
  | 'automation'
  | 'developer'
  | 'media';

export type ConnectNavId =
  | 'ai-agents'
  | 'chat'
  | 'mcp'
  | 'agent-skills'
  | 'automation'
  | 'cli'
  | 'api'
  | 'api-keys'
  | 'developers'
  | 'approved-apps';

/** Automation accordion children (catalog ids), in display order. */
export const AUTOMATION_CHILD_IDS = [
  'n8n',
  'zapier',
  'make',
  'webhooks',
  'rss',
] as const;

export type AutomationChildId = (typeof AUTOMATION_CHILD_IDS)[number];

/**
 * AI Agents hub display order — OpenClaw / Hermes first, then assistants.
 * Unknown ids from the filter append after this list.
 */
export const AI_AGENTS_DISPLAY_ORDER = [
  'openclaw',
  'hermes',
  'claude-apps',
  'claude-code',
  'chatgpt',
  'codex',
  'cursor',
  'gemini',
] as const;

export type AiAgentDisplayId = (typeof AI_AGENTS_DISPLAY_ORDER)[number];

/** Sort catalog items by an explicit id list; unknown ids stay at the end. */
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

export interface Connection {
  id: string;
  name: string;
  glyph: string;
  /** Local icon under /icons/connections or /icons/third-party. */
  icon?: string;
  kind: Kind;
  section: SectionId;
  short: string;
  intro: string;
  prompts?: string[];
  info?: string;
  note?: string;
  soon?: boolean;
  /** Primary docs deep-link(s). First is the default "Docs" CTA. */
  docs: DocLink[];
  /** Extra path CTAs (e.g. MCP vs CLI skill) shown on the card + detail. */
  paths?: DocLink[];
  steps: Step[];
  /** Hero-tier cards (OpenClaw / Hermes) get a slightly larger tile. */
  hero?: boolean;
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

export type CatalogTranslate = (key: string, defaultValue: string) => string;

export type ConnectionsCatalogContext = {
  t: CatalogTranslate;
  backendUrl: string;
  /** Typically `${backendUrl}/mcp`. */
  mcpUrl: string;
  /** Raw API key embedded in code samples (page masks at display time). */
  apiKey?: string;
  /** If set, preferred over apiKey when building code strings. */
  apiKeyMasked?: string;
};

export const CONNECT_NAV_CONNECTORS: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
  icon?: string;
}[] = [
  {
    id: 'ai-agents',
    labelKey: 'connect_nav_ai_agents',
    labelDefault: 'AI Agents',
  },
  {
    id: 'chat',
    labelKey: 'connect_nav_chat',
    labelDefault: 'Chat',
  },
  {
    id: 'mcp',
    labelKey: 'connect_nav_mcp',
    labelDefault: 'MCP',
  },
  {
    id: 'agent-skills',
    labelKey: 'connect_nav_agent_skills',
    labelDefault: 'Agent Skills',
  },
  {
    id: 'automation',
    labelKey: 'connect_nav_automation',
    labelDefault: 'Automation',
  },
  {
    id: 'cli',
    labelKey: 'connect_nav_cli',
    labelDefault: 'CLI',
  },
  {
    id: 'api',
    labelKey: 'connect_nav_api',
    labelDefault: 'API',
  },
];

export const CONNECT_NAV_ACCOUNT: {
  id: ConnectNavId;
  labelKey: string;
  labelDefault: string;
  icon?: string;
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

/** Flat inventory for deep-link validation (connectors + account). */
export const CONNECT_NAV = [...CONNECT_NAV_CONNECTORS, ...CONNECT_NAV_ACCOUNT];

const DOCS = 'https://docs.postqueen.ai';

const AI_AGENT_SECTIONS: SectionId[] = ['agents', 'assistants'];

const API_ITEM_IDS = new Set(['api', 'sdk', 'oauth']);

/**
 * Skill-first agents plus any connection whose paths include skill-install.
 * OpenClaw / Hermes never use MCP — skills only.
 */
const AGENT_SKILL_IDS = new Set(['openclaw', 'hermes', 'claude-code', 'codex']);

/**
 * Connections for a Connect-panel nav id.
 * `api-keys` / `developers` / `approved-apps` are panel-only (no catalog groups).
 * Media (HeyGen / Reel.Farm) stays in the catalog but is not a Connect nav.
 */
export function connectionsForNav(
  groups: Group[],
  navId: ConnectNavId
): Connection[] {
  const all = groups.flatMap((g) => g.items);
  switch (navId) {
    case 'ai-agents':
      return sortByIdOrder(
        all.filter((c) => AI_AGENT_SECTIONS.includes(c.section)),
        AI_AGENTS_DISPLAY_ORDER
      );
    case 'chat':
      return all.filter((c) => c.section === 'chat');
    case 'mcp':
      return all.filter((c) => c.section === 'mcp');
    case 'agent-skills':
      return all.filter(
        (c) =>
          c.kind === 'SKILL' ||
          AGENT_SKILL_IDS.has(c.id) ||
          c.paths?.some((p) => p.href.includes('/agents/skill-install'))
      );
    case 'automation':
      return all.filter((c) => c.section === 'automation');
    case 'cli':
      return all.filter((c) => c.id === 'cli');
    case 'api':
      return all.filter((c) => API_ITEM_IDS.has(c.id));
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

/**
 * Build the full catalog with i18n strings and environment-specific code
 * samples. MCP URL-with-key samples use `${mcpUrl}/${key}` (key in the path).
 */
export function buildConnectionsCatalog(
  ctx: ConnectionsCatalogContext
): Group[] {
  const { t, backendUrl, mcpUrl } = ctx;
  const apiKey = ctx.apiKeyMasked ?? ctx.apiKey ?? '';
  const mcpUrlWithKey = `${mcpUrl}/${apiKey}`;

  const defaultPrompts = [
    t(
      'conn_prompt_default_1',
      'Draft a launch post and schedule it for Tuesday 09:00'
    ),
    t('conn_prompt_default_2', 'What is in my queue this week?'),
    t(
      'conn_prompt_default_3',
      'Publish the changelog to X and LinkedIn'
    ),
  ];

  const skillInstall: Step[] = [
    {
      title: t('conn_step_skill_install', 'Install the PostQueen skill'),
      detail: t(
        'conn_step_skill_install_detail',
        'One command, once per machine. It brings the postqueen CLI with it.'
      ),
      code: 'npx skills add GkhanKINAY/postqueen-agent',
    },
    {
      title: t('conn_step_skill_key', 'Give it your API key'),
      detail: t(
        'conn_step_skill_key_detail',
        'The agent reads this from the environment. Put it in your shell profile to make it permanent.'
      ),
      code: `export POSTQUEEN_API_KEY="${apiKey}"`,
    },
  ];

  const mcpUrlStep = (verify: string, verifyCode?: string): Step[] => [
    {
      title: t('conn_step_mcp_url', 'Add the server'),
      detail: t(
        'conn_step_mcp_url_detail',
        'PostQueen speaks Model Context Protocol over streamable HTTP. The key travels in the URL.'
      ),
      code: mcpUrlWithKey,
    },
    {
      title: t('conn_step_verify', 'Check it worked'),
      detail: verify,
      code: verifyCode,
    },
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
          section: 'agents',
          hero: true,
          short: t(
            'conn_openclaw_short',
            'Post from WhatsApp, Telegram, Slack, and Discord'
          ),
          intro: t(
            'conn_openclaw_intro',
            "OpenClaw is an open-source agent you run yourself. It reads the Agent Skills package rather than MCP, which means it loads PostQueen's commands on demand instead of carrying a whole tool schema in every prompt — cheaper, and it leaves room for the rest of your context."
          ),
          prompts: [
            t(
              'conn_openclaw_prompt_1',
              'Post the blog cover to LinkedIn and X tomorrow at 9am'
            ),
            t('conn_openclaw_prompt_2', 'What is in my queue this week?'),
            t(
              'conn_openclaw_prompt_3',
              'Draft a thread from this release note'
            ),
          ],
          info: t(
            'conn_openclaw_note',
            'The same install also powers the chat front doors below: once OpenClaw has this skill, anything that can reach your agent can publish through it. Keep a human in the loop before anything goes out.'
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
            {
              title: t('conn_openclaw_try', 'Then try a real one'),
              detail: t(
                'conn_openclaw_try_detail',
                'In your own words — it works out the channels, the media and the timing.'
              ),
              code: t(
                'conn_openclaw_example',
                'Post the blog cover to LinkedIn and X tomorrow at 9am, and draft a thread for Bluesky'
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
          section: 'agents',
          hero: true,
          short: t(
            'conn_hermes_short',
            'Register PostQueen as a Hermes tool provider'
          ),
          intro: t(
            'conn_hermes_intro',
            "Hermes is Nous Research's open-source agent framework. It picks PostQueen up through the same Agent Skills package the other CLI agents use, so one install covers every agent on the machine."
          ),
          prompts: [
            t(
              'conn_hermes_prompt_1',
              'Schedule my latest post to every connected channel for Monday morning'
            ),
            t('conn_hermes_prompt_2', 'List my connected channels'),
            t('conn_hermes_prompt_3', 'Draft a weekly digest for LinkedIn'),
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
            {
              title: t('conn_hermes_try', 'Then try a real one'),
              detail: t(
                'conn_hermes_try_detail',
                'Hermes discovers your channels first, then schedules.'
              ),
              code: t(
                'conn_hermes_example',
                'Schedule my latest post to every connected channel for Monday morning'
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
          section: 'chat',
          short: t(
            'conn_whatsapp_short',
            'Voice-note PostQueen from your phone'
          ),
          intro: t(
            'conn_whatsapp_intro',
            'WhatsApp is a chat front door only — PostQueen does not publish into WhatsApp. OpenClaw pairs over QR on your machine; your messages never touch PostQueen directly.'
          ),
          prompts: [
            t(
              'conn_bridge_prompt_1',
              'Write a launch thread for v3.2 and schedule it'
            ),
            t('conn_bridge_prompt_2', 'What is going out this week?'),
            t('conn_bridge_prompt_3', 'Publish the changelog now'),
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
          section: 'chat',
          short: t(
            'conn_telegram_short',
            'Message PostQueen from Telegram'
          ),
          intro: t(
            'conn_telegram_intro',
            'Talk to her from Telegram through OpenClaw or Hermes on your machine. Telegram can also be a publishing channel under Channels — that is a separate setup.'
          ),
          prompts: defaultPrompts,
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
          section: 'chat',
          short: t(
            'conn_slack_chat_short',
            'Ask PostQueen from any Slack channel'
          ),
          intro: t(
            'conn_slack_chat_intro',
            'Use Slack as a front door to your agent — not the same as connecting Slack as a publishing channel under Channels.'
          ),
          prompts: defaultPrompts,
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
          section: 'chat',
          short: t(
            'conn_discord_chat_short',
            'Run socials without leaving Discord'
          ),
          intro: t(
            'conn_discord_chat_intro',
            'Message your agent from Discord. Publishing into Discord is a separate Channels setup.'
          ),
          prompts: defaultPrompts,
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
        'One card per product. Connect over MCP, or install the CLI skill where the docs say both work.'
      ),
      items: [
        {
          id: 'claude-apps',
          name: t('conn_claude_apps_name', 'Claude'),
          glyph: 'C',
          icon: '/icons/connections/claude.svg',
          kind: 'MCP',
          section: 'assistants',
          short: t(
            'conn_claude_apps_short',
            'Manage your content from Claude'
          ),
          intro: t(
            'conn_claude_apps_intro',
            'Claude Desktop, claude.ai, and the Claude apps on iOS and Android all reach PostQueen over MCP. Add a custom connector when the URL is public; use mcp-remote in the Desktop config for self-hosted / VPN installs. Connectors sync to your account, so the same chat works on laptop and phone.'
          ),
          prompts: [
            t(
              'conn_claude_apps_prompt_1',
              'Draft a launch thread for v3.2 and schedule it for Tuesday 09:00'
            ),
            t(
              'conn_claude_apps_prompt_2',
              'What is in my queue this week?'
            ),
            t(
              'conn_claude_apps_prompt_3',
              'Turn this changelog into five posts across X and LinkedIn'
            ),
          ],
          info: t(
            'conn_claude_apps_note',
            'A plain "url" entry in claude_desktop_config.json does not work — use a custom connector or mcp-remote. New connectors generally cannot be created from the mobile apps — add them on the web or Desktop first. For Claude Code in a terminal, see the Claude Code card.'
          ),
          docs: [
            {
              label: t(
                'conn_docs_claude_desktop',
                'Claude Desktop MCP setup'
              ),
              href: `${DOCS}/mcp/clients/claude-desktop`,
            },
            {
              label: t(
                'conn_docs_claude_app',
                'Claude Web & Mobile MCP setup'
              ),
              href: `${DOCS}/mcp/clients/claude-app`,
            },
            {
              label: t('conn_docs_claude_apps', 'Claude Apps hub'),
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
                'Claude Desktop → Settings → Connectors → Add custom connector. For LAN or VPN instances, use Edit Config and mcp-remote instead — see the Desktop docs.'
              ),
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
            ...mcpUrlStep(
              t(
                'conn_claude_apps_verify',
                'Start a new conversation and ask Claude to list your connected social media accounts.'
              )
            ),
          ],
        },
        {
          id: 'chatgpt',
          name: 'ChatGPT',
          glyph: 'G',
          icon: '/icons/connections/chatgpt.svg',
          kind: 'MCP',
          section: 'assistants',
          short: t(
            'conn_chatgpt_short',
            'Manage your content from ChatGPT'
          ),
          intro: t(
            'conn_chatgpt_intro',
            'ChatGPT connectors speak MCP, so PostQueen appears as a tool it can call while you talk to it.'
          ),
          prompts: defaultPrompts,
          info: t(
            'conn_chatgpt_note',
            'Custom connectors need a ChatGPT Plus, Pro or Business plan.'
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
                'conn_chatgpt_step_settings',
                'Open connector settings'
              ),
              detail: t(
                'conn_chatgpt_step_settings_detail',
                'Settings → Connectors → Add, then choose a custom connector.'
              ),
            },
            ...mcpUrlStep(
              t(
                'conn_chatgpt_verify',
                'Ask ChatGPT for your PostQueen account details.'
              )
            ),
          ],
        },
        {
          id: 'claude-code',
          name: 'Claude Code',
          glyph: 'CC',
          icon: '/icons/connections/claude.svg',
          kind: 'MCP',
          section: 'assistants',
          short: t(
            'conn_cc_short',
            'Schedule posts from Claude Code'
          ),
          intro: t(
            'conn_cc_intro',
            'Claude Code can take PostQueen either as an MCP server or as an Agent Skill. MCP is one command; skills load less context per call.'
          ),
          prompts: defaultPrompts,
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
              detail: t('conn_step_terminal', 'Run this in your terminal.'),
              code: `claude mcp add --transport http postqueen ${mcpUrlWithKey}`,
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              code: 'claude mcp list',
            },
          ],
        },
        {
          id: 'cursor',
          name: 'Cursor',
          glyph: 'Cu',
          icon: '/icons/connections/cursor.svg',
          kind: 'MCP',
          section: 'assistants',
          short: t(
            'conn_cursor_short',
            'Schedule posts from Cursor'
          ),
          intro: t(
            'conn_cursor_intro',
            'Add PostQueen as a streamable HTTP MCP server in Cursor Customize, or point mcp.json at the URL below.'
          ),
          prompts: defaultPrompts,
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
              title: t('conn_cursor_step_ui', 'Open Customize'),
              detail: t(
                'conn_cursor_step_ui_detail',
                'Cursor sidebar → Customize → MCP servers, then add a streamable HTTP server named postqueen.'
              ),
            },
            {
              title: t('conn_cursor_step_url', 'Paste the server URL'),
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
          id: 'codex',
          name: 'Codex',
          glyph: 'Cx',
          icon: '/icons/connections/codex.svg',
          kind: 'SKILL',
          section: 'assistants',
          short: t(
            'conn_codex_short',
            'Post from your terminal through Codex'
          ),
          intro: t(
            'conn_codex_intro',
            'Codex discovers PostQueen from the skill definition and runs its commands in a sandbox. MCP is also documented for the Codex CLI.'
          ),
          prompts: defaultPrompts,
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
          id: 'gemini',
          name: 'Gemini CLI',
          glyph: 'Gm',
          icon: '/icons/connections/gemini-cli.svg',
          kind: 'MCP',
          section: 'assistants',
          short: t(
            'conn_gemini_short',
            'Connect Gemini CLI to your PostQueen workspace'
          ),
          intro: t(
            'conn_gemini_intro',
            'Gemini CLI reads MCP servers from its settings file.'
          ),
          prompts: defaultPrompts,
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
              title: t('conn_gemini_step_config', 'Edit your settings file'),
              detail: t(
                'conn_gemini_step_config_detail',
                'Add this to ~/.gemini/settings.json'
              ),
              code: JSON.stringify(
                { mcpServers: { postqueen: { url: mcpUrlWithKey } } },
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
      ],
    },
    {
      id: 'mcp',
      label: t('conn_group_mcp_more', 'More MCP clients'),
      blurb: t(
        'conn_group_mcp_more_blurb',
        'Streamable HTTP at your /mcp endpoint — 11 tools. Warp, Cline and Windsurf each have their own steps; anything else follows the same shape.'
      ),
      items: [
        {
          id: 'warp',
          name: 'Warp',
          glyph: 'Wp',
          icon: '/icons/connections/warp.svg',
          kind: 'MCP',
          section: 'mcp',
          short: t(
            'conn_warp_short',
            'Paste the PostQueen MCP URL into Warp'
          ),
          intro: t(
            'conn_warp_intro',
            'Warp connects to remote MCP servers by URL. Choose Streamable HTTP or SSE Server, not CLI Server.'
          ),
          prompts: defaultPrompts,
          docs: [
            {
              label: t('conn_docs_warp', 'Warp MCP setup'),
              href: `${DOCS}/mcp/clients/other-clients#warp`,
            },
          ],
          steps: [
            {
              title: t('conn_warp_step_open', 'Open MCP servers'),
              detail: t(
                'conn_warp_step_open_detail',
                'Settings → Agents → MCP servers, or search Open MCP Servers in the Command Palette.'
              ),
            },
            {
              title: t('conn_warp_step_add', 'Add Streamable HTTP'),
              detail: t(
                'conn_warp_step_add_detail',
                'Click + Add and choose Streamable HTTP or SSE Server (URL).'
              ),
              code: JSON.stringify(
                { postqueen: { url: mcpUrlWithKey } },
                null,
                2
              ),
            },
            {
              title: t('conn_step_verify', 'Check it worked'),
              detail: t(
                'conn_warp_verify',
                'Start the server in the list. Warp should discover her 11 tools.'
              ),
            },
          ],
        },
        {
          id: 'cline',
          name: 'Cline',
          glyph: 'Cl',
          icon: '/icons/connections/cline.svg',
          kind: 'MCP',
          section: 'mcp',
          short: t(
            'conn_cline_short',
            'Add PostQueen as a remote MCP server'
          ),
          intro: t(
            'conn_cline_intro',
            'Cline supports remote servers over streamable HTTP with an explicit type field.'
          ),
          prompts: defaultPrompts,
          docs: [
            {
              label: t('conn_docs_cline', 'Cline MCP setup'),
              href: `${DOCS}/mcp/clients/other-clients#cline`,
            },
          ],
          steps: [
            {
              title: t('conn_cline_step_panel', 'Open MCP Servers'),
              detail: t(
                'conn_cline_step_panel_detail',
                'In the Cline panel, open the MCP Servers icon, then the Remote Servers tab.'
              ),
            },
            {
              title: t('conn_cline_step_add', 'Add the remote server'),
              detail: t(
                'conn_cline_step_add_detail',
                'Name: postqueen. Transport: Streamable HTTP. URL:'
              ),
              code: mcpUrlWithKey,
            },
            {
              title: t('conn_cline_step_json', 'Or edit the config'),
              code: JSON.stringify(
                {
                  mcpServers: {
                    postqueen: {
                      type: 'streamableHttp',
                      url: mcpUrlWithKey,
                      disabled: false,
                      autoApprove: [],
                    },
                  },
                },
                null,
                2
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
          section: 'mcp',
          short: t(
            'conn_windsurf_short',
            'Point Cascade at the PostQueen MCP URL'
          ),
          intro: t(
            'conn_windsurf_intro',
            'Windsurf Cascade reads a remote MCP server URL from its config.'
          ),
          prompts: defaultPrompts,
          docs: [
            {
              label: t('conn_docs_windsurf', 'Windsurf MCP setup'),
              href: `${DOCS}/mcp/clients/other-clients#windsurf`,
            },
          ],
          steps: [
            {
              title: t('conn_windsurf_step_config', 'Edit Cascade MCP config'),
              detail: t(
                'conn_windsurf_step_config_detail',
                'Settings → Cascade → MCP Servers, or edit ~/.codeium/windsurf/mcp_config.json. Windsurf uses serverUrl, not url.'
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
                'Save, refresh the Cascade server list, then ask Cascade to list your PostQueen channels.'
              ),
            },
          ],
        },
        {
          id: 'other-mcp',
          name: t('conn_other_mcp_name', 'Any MCP client'),
          glyph: 'MCP',
          icon: '/icons/connections/other-clients.svg',
          kind: 'MCP',
          section: 'mcp',
          short: t(
            'conn_other_mcp_short',
            'Connect any tool to the PostQueen MCP server'
          ),
          intro: t(
            'conn_other_mcp_intro',
            'PostQueen exposes 11 tools at a single streamable HTTP endpoint. If your editor or agent can reach a remote MCP server, use the URL below (API key in the path or as a Bearer token).'
          ),
          prompts: defaultPrompts,
          note: t(
            'conn_other_mcp_note',
            'There is no dedicated PostQueen guide for VS Code, Zed or Continue — use this generic shape. Get your key from Settings → API Keys.'
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
                'Some clients prefer a bare URL plus an Authorization header.'
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
          kind: 'FLOW',
          section: 'automation',
          short: t(
            'conn_n8n_short',
            'Schedule posts from n8n workflows'
          ),
          intro: t(
            'conn_n8n_intro',
            'Use the community node to publish from an n8n flow, and PostQueen webhooks to trigger a flow when a post publishes.'
          ),
          prompts: defaultPrompts,
          info: t(
            'conn_n8n_note',
            'Self-hosted n8n needs the community node installed before the credential appears.'
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
              code: 'n8n-nodes-postqueen',
            },
            {
              title: t('conn_n8n_step_cred', 'Add the credential'),
              detail: t(
                'conn_n8n_step_cred_detail',
                'Create a PostQueen credential in n8n and paste your API key into it.'
              ),
              code: apiKey,
            },
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
          kind: 'FLOW',
          section: 'automation',
          soon: true,
          short: t(
            'conn_zapier_short',
            'Connect Zapier via Webhooks by Zapier'
          ),
          intro: t(
            'conn_zapier_intro',
            "There is no PostQueen app in Zapier's directory yet. Until there is, Zapier's own generic steps do the job in both directions."
          ),
          prompts: [
            t(
              'conn_zapier_prompt_1',
              'When a Notion page is published → schedule a post'
            ),
            t(
              'conn_zapier_prompt_2',
              'When a Shopify product goes live → announce it'
            ),
            t(
              'conn_zapier_prompt_3',
              'Every Friday → draft next week from a Sheet'
            ),
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
                'Create a "Catch Hook" trigger in Zapier, then paste its URL under Settings → Webhooks. Every published post arrives there.'
              ),
            },
            {
              title: t('conn_zapier_step_in', 'Zapier → PostQueen'),
              detail: t(
                'conn_zapier_step_in_detail',
                'Use the "Webhooks by Zapier" action with POST and this URL to create a post.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_zapier_step_auth', 'Authenticate the request'),
              detail: t(
                'conn_zapier_step_auth_detail',
                'Add this header to the action.'
              ),
              code: `Authorization: ${apiKey}`,
            },
          ],
        },
        {
          id: 'make',
          name: 'Make',
          glyph: 'Mk',
          kind: 'FLOW',
          section: 'automation',
          soon: true,
          short: t(
            'conn_make_short',
            'Connect Make via HTTP and webhooks'
          ),
          intro: t(
            'conn_make_intro',
            "No PostQueen module yet. Make's HTTP and Webhooks modules cover the same ground."
          ),
          prompts: defaultPrompts,
          docs: [
            {
              label: t('conn_docs_make', 'Make guide'),
              href: `${DOCS}/automation/make`,
            },
          ],
          steps: [
            {
              title: t('conn_make_step_out', 'PostQueen → Make'),
              detail: t(
                'conn_make_step_out_detail',
                'Add a Custom Webhook module, copy its URL and paste it under Settings → Webhooks.'
              ),
            },
            {
              title: t('conn_make_step_in', 'Make → PostQueen'),
              detail: t(
                'conn_make_step_in_detail',
                'Use the HTTP "Make a request" module against the public API.'
              ),
              code: `${backendUrl}/public/v1/posts`,
            },
            {
              title: t('conn_zapier_step_auth', 'Authenticate the request'),
              detail: t(
                'conn_make_step_auth_detail',
                'Add an Authorization header holding your API key.'
              ),
              code: `Authorization: ${apiKey}`,
            },
          ],
        },
        {
          id: 'webhooks',
          name: t('conn_webhooks_name', 'Webhooks'),
          glyph: 'WH',
          kind: 'FLOW',
          section: 'automation',
          short: t(
            'conn_webhooks_short',
            'Get an HTTP call when a post goes live'
          ),
          intro: t(
            'conn_webhooks_intro',
            'PostQueen POSTs the published post as JSON to any URL you register. A webhook can watch every channel or just the ones you pick.'
          ),
          prompts: defaultPrompts,
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
          section: 'automation',
          short: t(
            'conn_rss_short',
            'Turn new RSS items into calendar drafts'
          ),
          intro: t(
            'conn_rss_intro',
            'Configure feeds under Settings → Autopost. Each new item can become a draft on your calendar on an hourly check.'
          ),
          prompts: defaultPrompts,
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
          section: 'developer',
          short: t(
            'conn_cli_short',
            'Automate posting with the PostQueen CLI'
          ),
          intro: t(
            'conn_cli_intro',
            'Automate posting from the terminal. Same Public API under the hood; data commands print JSON so anything that can run a shell command can run your publishing.'
          ),
          prompts: defaultPrompts,
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
          section: 'developer',
          short: t(
            'conn_api_short',
            'REST API for channels, posts, media, analytics'
          ),
          intro: t(
            'conn_api_intro',
            'Everything the app does to your account, you can do over HTTP: list channels, schedule and delete posts, upload media, generate video, read analytics.'
          ),
          prompts: [
            t(
              'conn_api_prompt_1',
              'Create a post from your own dashboard'
            ),
            t('conn_api_prompt_2', 'Sync your CMS release notes'),
            t('conn_api_prompt_3', 'Back up your queue nightly'),
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
                'Send your key in the Authorization header on every request.'
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
          section: 'developer',
          short: t(
            'conn_sdk_short',
            'Typed Node client for the Public API'
          ),
          intro: t(
            'conn_sdk_intro',
            'A thin wrapper over the public API with types for the request and response shapes.'
          ),
          prompts: defaultPrompts,
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
                'Pass your API key when you construct the client.'
              ),
              code: `POSTQUEEN_API_KEY="${apiKey}"`,
            },
          ],
        },
        {
          id: 'oauth',
          name: t('conn_oauth_name', 'OAuth apps'),
          glyph: 'OA',
          kind: 'API',
          section: 'developer',
          short: t(
            'conn_oauth_short',
            "Let apps access PostQueen on a user's behalf"
          ),
          intro: t(
            'conn_oauth_intro',
            'If you are building a product rather than automating your own account, register an OAuth app. Your users authorise it and you receive a token that works with the API, MCP and the CLI — no key sharing.'
          ),
          prompts: defaultPrompts,
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
                'Developers → Apps. Set your redirect URL there.'
              ),
            },
            {
              title: t('conn_oauth_step_token', 'Use the token'),
              detail: t(
                'conn_oauth_step_token_detail',
                'Tokens are prefixed pos_ and go in the same Authorization header as an API key.'
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
          section: 'media',
          short: t(
            'conn_heygen_short',
            'AI avatar videos from the post you just wrote, inside the media row'
          ),
          intro: t(
            'conn_heygen_intro',
            'Paste your HeyGen API key under Integrations. The service appears in the post editor media row as Integrations once connected.'
          ),
          prompts: defaultPrompts,
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
          section: 'media',
          short: t(
            'conn_reelfarm_short',
            'Import finished clips from Reel.Farm into the media library'
          ),
          intro: t(
            'conn_reelfarm_intro',
            'Paste your Reel.Farm API key under Integrations. Import appears in the media library toolbar once connected.'
          ),
          prompts: defaultPrompts,
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
