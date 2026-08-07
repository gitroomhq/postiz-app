'use client';

import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useUser } from '../layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useTourStepKey } from '@gitroom/frontend/components/onboarding/tour';
import { ApiKeyCard } from '@gitroom/frontend/components/public-api/api-key-card';
import {
  PublicApiKeysSection,
  PublicAppsSection,
} from '@gitroom/frontend/components/public-api/public.component';
import { ApprovedAppsComponent } from '@gitroom/frontend/components/approved-apps/approved-apps.component';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import {
  buildConnectionsCatalog,
  AUTOMATION_CHILD_IDS,
  CONNECT_NAV,
  CONNECT_NAV_ACCOUNT,
  CONNECT_NAV_CONNECTORS,
  connectionsForNav,
  findConnection,
  type Connection,
  type ConnectNavId,
} from '@gitroom/frontend/components/public-api/connections.catalog';
import {
  RouteOverlayScrim,
  type RouteOverlayMode,
} from '@gitroom/frontend/components/layout/leave-settings';

/** Deep-link aliases → catalog ids (`?connector=claude`). */
const CONNECTOR_ALIASES: Record<string, string> = {
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
};

const NAV_ICONS: Record<ConnectNavId, string[]> = {
  'ai-agents': [
    'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0',
  ],
  chat: [
    'M5 6.5h10.5A2.5 2.5 0 0 1 18 9v5a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16.5H5A2.5 2.5 0 0 1 2.5 14V9A2.5 2.5 0 0 1 5 6.5Z',
  ],
  mcp: [
    'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  ],
  'agent-skills': [
    'M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3Z',
  ],
  automation: [
    'M5 19.5h.01M5 12a7.5 7.5 0 0 1 7.5 7.5M5 5a14.5 14.5 0 0 1 14.5 14.5',
  ],
  cli: ['m8 8-4 4 4 4M16 8l4 4-4 4M13.6 5.5l-3.2 13'],
  api: ['M7 8h10M7 12h10M7 16h6'],
  'api-keys': [
    'M7.5 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z',
    'm21 2-9.6 9.6',
    'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4',
  ],
  developers: ['m8 8-4 4 4 4M16 8l4 4-4 4M13.6 5.5l-3.2 13'],
  'approved-apps': [
    'M9 12.5l2.5 2.5 5-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  ],
};

function resolveConnectorId(raw: string | null): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return CONNECTOR_ALIASES[key] || key;
}

/** Legacy `?nav=` aliases + current ConnectNavId values. */
function resolveNavId(raw: string | null): ConnectNavId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'cli-api') return 'api';
  if (key === 'media') return 'ai-agents';
  if (CONNECT_NAV.some((n) => n.id === key)) return key as ConnectNavId;
  return null;
}

function defaultNavForConnection(item: Connection): ConnectNavId {
  if (item.section === 'chat') return 'chat';
  if (item.section === 'mcp') return 'mcp';
  if (item.section === 'automation') return 'automation';
  if (item.section === 'developer') {
    return item.id === 'cli' ? 'cli' : 'api';
  }
  if (item.section === 'media') return 'ai-agents';
  if (item.kind === 'SKILL' || item.id === 'openclaw' || item.id === 'hermes') {
    return 'agent-skills';
  }
  return 'ai-agents';
}

function isAutomationChild(id: string): boolean {
  return (AUTOMATION_CHILD_IDS as readonly string[]).includes(id);
}

const CodeBlock: FC<{
  code: string;
  label: string;
  rawCode?: string;
}> = ({ code, label, rawCode }) => {
  const toaster = useToaster();
  const t = useT();
  return (
    <div className="relative mt-[8px] rounded-pqSm bg-pqBg p-[12px_42px_12px_13px] shadow-[inset_0_0_0_1px_var(--border)]">
      <pre
        data-conn-code="1"
        className="m-0 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-[1.65] text-pqText"
      >
        {code}
      </pre>
      <button
        type="button"
        aria-label={t('copy', 'Copy')}
        onClick={() => {
          copy(rawCode ?? code);
          toaster.show(`${label} copied to clipboard`, 'success');
        }}
        className="absolute end-[8px] top-[8px] flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-pqSettings text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path
            d="M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

const PromptHero: FC<{ prompts: string[] }> = ({ prompts }) => (
  <div
    className="flex flex-col items-end gap-[10px] rounded-[18px] p-[24px_20px] shadow-pqE2"
    style={{
      backgroundImage:
        'linear-gradient(135deg, var(--brandSoft) 0%, var(--brand) 55%, var(--focused) 100%)',
    }}
  >
    {prompts.map((prompt) => (
      <div
        key={prompt}
        className="flex max-w-[86%] items-center gap-[11px] rounded-[999px] bg-pqOnBrand px-[15px] py-[11px] shadow-pqE1"
      >
        {/* Pills sit on onBrand (white) in both themes — force light ink via .light. */}
        <span className="light min-w-0 flex-1 text-[13.5px] leading-[1.45] text-pqText">
          <span className="font-[700]">@PostQueen</span> {prompt}
        </span>
        <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[999px] bg-pqInner text-pqText shadow-pqE1">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
            <path
              d="M5 12h13m-5-5 5 5-5 5"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    ))}
  </div>
);

const ConnIcon: FC<{
  item: Pick<Connection, 'icon' | 'glyph' | 'name' | 'hero'>;
  size?: 'xs' | 'sm' | 'lg';
}> = ({ item, size = 'sm' }) => {
  const img =
    size === 'lg' ? 60 : size === 'xs' ? 22 : item.hero ? 50 : 40;
  if (item.icon) {
    return (
      <span className="flex shrink-0 items-center justify-center">
        <SafeImage
          src={item.icon}
          alt={item.name}
          width={img}
          height={img}
          className="object-contain"
        />
      </span>
    );
  }
  const box =
    size === 'lg'
      ? 'h-[60px] w-[60px] rounded-pqLg text-[13px]'
      : size === 'xs'
        ? 'h-[22px] w-[22px] rounded-[6px] text-[9px]'
        : item.hero
          ? 'h-[50px] w-[50px] rounded-pqMd text-[13px]'
          : 'h-[40px] w-[40px] rounded-pqMd text-[13px]';
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center bg-pqSettings font-[700] text-pqText ring-1 ring-pqBorder',
        box
      )}
    >
      {item.glyph}
    </span>
  );
};

const NavIcon: FC<{ id: ConnectNavId }> = ({ id }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    className="block shrink-0 opacity-[0.85]"
    aria-hidden="true"
  >
    {(NAV_ICONS[id] || NAV_ICONS['ai-agents']).map((d) => (
      <path
        key={d}
        d={d}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);

/** Same mark as Settings → Connect PostQueen external-link affordance. */
const ExternalLinkIcon: FC<{ size?: number; className?: string }> = ({
  size = 14,
  className,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    aria-hidden="true"
    className={clsx('shrink-0', className)}
  >
    <path
      d="M14 5h5v5M19 5l-9 9M10 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SkillInstallCallout: FC<{ apiKey: string; keyRevealed: boolean }> = ({
  apiKey,
  keyRevealed,
}) => {
  const t = useT();
  const code = 'npx skills add GkhanKINAY/postqueen-agent';
  const keyCode = `export POSTQUEEN_API_KEY="${apiKey}"`;
  const maskedKey = keyRevealed
    ? keyCode
    : keyCode.replace(
        apiKey,
        '*'.repeat(Math.min(apiKey.length || 8, 24))
      );
  return (
    <div className="mb-[16px] flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div>
        <div className="text-[14px] font-[600]">
          {t('conn_step_skill_install', 'Install the PostQueen skill')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_step_skill_install_detail',
            'One command, once per machine. It brings the postqueen CLI with it.'
          )}
        </div>
      </div>
      <CodeBlock code={code} label="Skill" />
      <div>
        <div className="text-[13px] font-[600]">
          {t('conn_step_skill_key', 'Give it your API key')}
        </div>
        <CodeBlock
          code={maskedKey}
          rawCode={keyCode}
          label="API key"
        />
      </div>
      <a
        href="https://docs.postqueen.ai/agents/skill-install"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-[6px] text-[12.5px] font-[600] text-pqBrand hover:underline"
      >
        {t('conn_docs_cta', 'Docs')}
        <ExternalLinkIcon size={13} className="opacity-[0.85]" />
      </a>
    </div>
  );
};

const CliSetupCallout: FC<{ apiKey: string; keyRevealed: boolean }> = ({
  apiKey,
  keyRevealed,
}) => {
  const t = useT();
  const keyCode = `export POSTQUEEN_API_KEY="${apiKey}"`;
  const maskedKey = keyRevealed
    ? keyCode
    : keyCode.replace(
        apiKey,
        '*'.repeat(Math.min(apiKey.length || 8, 24))
      );
  return (
    <div className="mb-[16px] flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div>
        <div className="text-[14px] font-[600]">
          {t('conn_cli_callout_title', 'Set up the PostQueen CLI')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_callout_detail',
            'Install the package, export your Public API key, then hit the API from any shell.'
          )}
        </div>
      </div>
      <div>
        <div className="text-[13px] font-[600]">
          {t('conn_cli_step_install', 'Install it')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_step_install_detail',
            'Or `pnpm install -g postqueen`. Verify with `postqueen --help`.'
          )}
        </div>
        <CodeBlock code="npm install -g postqueen" label="Install" />
      </div>
      <div>
        <div className="text-[13px] font-[600]">
          {t('conn_cli_step_login', 'Authenticate')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_step_login_detail',
            'Settings → API Keys → Reveal, then export. Self-hosted OAuth device flow (`auth:login`) is advanced — see Authentication docs.'
          )}
        </div>
        <CodeBlock code={maskedKey} rawCode={keyCode} label="API key" />
      </div>
      <div>
        <div className="text-[13px] font-[600]">
          {t('conn_cli_step_try', 'Try it')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_step_try_detail',
            'First command that reaches the API — lists your connected channels as JSON.'
          )}
        </div>
        <CodeBlock code="postqueen integrations:list" label="Try it" />
      </div>
      <a
        href="https://docs.postqueen.ai/cli/introduction"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-[6px] text-[12.5px] font-[600] text-pqBrand hover:underline"
      >
        {t('conn_docs_cli', 'CLI introduction')}
        <ExternalLinkIcon size={13} className="opacity-[0.85]" />
      </a>
    </div>
  );
};

const McpAuthCallout: FC<{ mcpUrl: string; mcpUrlWithKey: string; apiKey: string; keyRevealed: boolean }> = ({
  mcpUrl,
  mcpUrlWithKey,
  apiKey,
  keyRevealed,
}) => {
  const t = useT();
  const mask = (text: string) =>
    keyRevealed || !apiKey
      ? text
      : text.split(apiKey).join('*'.repeat(Math.min(apiKey.length, 24)));
  return (
    <div className="mb-[16px] flex flex-col gap-[10px] rounded-pqMd bg-pqBrandFaint p-[14px_16px]">
      <div className="text-[13.5px] font-[600]">
        {t('connect_mcp_auth_title', 'MCP URL & auth')}
      </div>
      <div className="text-[12.5px] leading-[1.55] text-pqMuted">
        {t(
          'connect_mcp_auth_blurb',
          'PostQueen MCP uses your API key — not OAuth. Put the key in the URL path, or send it as a Bearer token on /mcp.'
        )}
      </div>
      <CodeBlock
        code={mask(mcpUrlWithKey)}
        rawCode={mcpUrlWithKey}
        label="MCP URL"
      />
      <CodeBlock
        code={mask(`${mcpUrl}\nAuthorization: Bearer ${apiKey}`)}
        rawCode={`${mcpUrl}\nAuthorization: Bearer ${apiKey}`}
        label="Bearer"
      />
    </div>
  );
};

/**
 * Settings-scale dual-pane Connect PostQueen panel.
 * LOOK inspired by connectors catalogs; WORK and copy are PostQueen-only.
 */
export const ConnectPanel: FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const t = useT();
  const user = useUser();
  const { backendUrl } = useVariables();
  const { mobile } = useViewport();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourKey = useTourStepKey();
  const tourConn = tourKey === 'connections-page';

  const [nav, setNav] = useState<ConnectNavId>('ai-agents');
  const [picked, setPicked] = useState('');
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  // Settings-identical left-rail filter (prototype settingsVals search).
  const [query, setQuery] = useState('');

  const apiKey = user?.publicApi || '';
  const mcpUrl = `${backendUrl}/mcp`;
  const mcpUrlWithKey = `${backendUrl}/mcp/${apiKey}`;

  const groups = useMemo(
    () =>
      buildConnectionsCatalog({
        t,
        backendUrl,
        mcpUrl,
        apiKey,
      }),
    [t, backendUrl, mcpUrl, apiKey]
  );

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const automationItems = useMemo(
    () =>
      AUTOMATION_CHILD_IDS.map((id) => findConnection(groups, id)).filter(
        (c): c is Connection => !!c
      ),
    [groups]
  );

  // Deep-links: ?nav=mcp&connector=claude · legacy ?nav=cli-api|media
  useEffect(() => {
    const resolvedNav = resolveNavId(searchParams.get('nav'));
    const connectorId = resolveConnectorId(searchParams.get('connector'));

    if (resolvedNav) {
      setNav(resolvedNav);
      if (resolvedNav === 'automation') setAutomationOpen(true);
    }

    if (connectorId) {
      const found = findConnection(groups, connectorId);
      if (found) {
        setPicked(found.id);
        const nextNav = resolvedNav || defaultNavForConnection(found);
        if (!resolvedNav) setNav(nextNav);
        if (nextNav === 'automation' || isAutomationChild(found.id)) {
          setAutomationOpen(true);
        }
      }
    }
  }, [searchParams, groups]);

  const syncUrl = useCallback(
    (nextNav: ConnectNavId, nextPicked: string) => {
      const params = new URLSearchParams();
      params.set('nav', nextNav);
      if (nextPicked) params.set('connector', nextPicked);
      router.replace(`/connections?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const selectNav = useCallback(
    (id: ConnectNavId) => {
      setNav(id);
      setPicked('');
      setKeyRevealed(false);
      setMobileNavOpen(false);
      if (id === 'automation') setAutomationOpen(true);
      syncUrl(id, '');
    },
    [syncUrl]
  );

  const selectItem = useCallback(
    (id: string) => {
      setPicked(id);
      setKeyRevealed(false);
      setMobileNavOpen(false);
      if (isAutomationChild(id)) setAutomationOpen(true);
      syncUrl(nav, id);
    },
    [nav, syncUrl]
  );

  /** Automation child → detail under automation nav (desktop accordion / mobile chip). */
  const selectAutomationChild = useCallback(
    (id: string) => {
      setNav('automation');
      setAutomationOpen(true);
      setPicked(id);
      setKeyRevealed(false);
      setMobileNavOpen(false);
      syncUrl('automation', id);
    },
    [syncUrl]
  );

  // Keep router/setState out of setState updaters — React runs those during
  // render, and router.replace updates Next's Router mid-render (same class of
  // bug as CalendarWeekProvider / writeLaunchesUrl).
  const toggleAutomation = useCallback(() => {
    const next = !automationOpen;
    setAutomationOpen(next);
    if (next) {
      setNav('automation');
      setPicked('');
      setKeyRevealed(false);
      syncUrl('automation', '');
    }
  }, [automationOpen, syncUrl]);

  const clearPicked = useCallback(() => {
    setPicked('');
    setKeyRevealed(false);
    syncUrl(nav, '');
  }, [nav, syncUrl]);
  const maskCode = useCallback(
    (text: string) =>
      keyRevealed || !apiKey
        ? text
        : text.split(apiKey).join('*'.repeat(Math.min(apiKey.length, 24))),
    [apiKey, keyRevealed]
  );

  const hubItems = useMemo(
    () => connectionsForNav(groups, nav),
    [groups, nav]
  );

  const active = all.find((item) => item.id === picked);

  const fallbackPrompts = useMemo(
    () => [
      t(
        'conn_prompt_default_1',
        'Draft a launch post and schedule it for Tuesday 09:00'
      ),
      t('conn_prompt_default_2', 'What is in my queue this week?'),
      t(
        'conn_prompt_default_3',
        'Publish the changelog to X and LinkedIn'
      ),
    ],
    [t]
  );

  const close = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/launches');
    }
  }, [onClose, router]);

  const navItemBase =
    'flex h-[34px] items-center gap-[9px] rounded-pqSm px-[9px] text-start text-[13px] transition-[box-shadow,color,background-color] hover:text-pqText hover:shadow-[inset_0_0_0_999px_rgba(124,58,237,.10)]';

  // Literal t() keys so the i18n extractor keeps the Connect nav inventory.
  const navLabels = useMemo(
    (): Record<ConnectNavId, string> => ({
      'ai-agents': t('connect_nav_ai_agents', 'AI Agents'),
      chat: t('connect_nav_chat', 'Chat'),
      mcp: t('connect_nav_mcp', 'MCP'),
      'agent-skills': t('connect_nav_agent_skills', 'Agent Skills'),
      automation: t('connect_nav_automation', 'Automation'),
      cli: t('connect_nav_cli', 'CLI'),
      api: t('connect_nav_api', 'API'),
      'api-keys': t('connect_nav_api_keys', 'API Keys'),
      developers: t('connect_nav_developers', 'Developers'),
      'approved-apps': t('connect_nav_approved_apps', 'Approved Apps'),
    }),
    [t]
  );

  // Same filter contract as Settings: label substring match; empty group hides.
  const navQuery = query.trim().toLowerCase();

  const visibleConnectors = useMemo(() => {
    if (!navQuery) return CONNECT_NAV_CONNECTORS;
    return CONNECT_NAV_CONNECTORS.filter(({ id }) => {
      if (navLabels[id].toLowerCase().includes(navQuery)) return true;
      if (id === 'automation') {
        return automationItems.some((item) =>
          item.name.toLowerCase().includes(navQuery)
        );
      }
      return false;
    });
  }, [navQuery, navLabels, automationItems]);

  const visibleAccount = useMemo(() => {
    if (!navQuery) return CONNECT_NAV_ACCOUNT;
    return CONNECT_NAV_ACCOUNT.filter(({ id }) =>
      navLabels[id].toLowerCase().includes(navQuery)
    );
  }, [navQuery, navLabels]);

  const visibleAutomationItems = useMemo(() => {
    if (!navQuery) return automationItems;
    if (navLabels.automation.toLowerCase().includes(navQuery)) {
      return automationItems;
    }
    return automationItems.filter((item) =>
      item.name.toLowerCase().includes(navQuery)
    );
  }, [navQuery, automationItems, navLabels]);

  // Searching a child should reveal the Automation accordion (Settings has no
  // nested rows — Connect does).
  const automationExpanded =
    automationOpen ||
    (!!navQuery &&
      (navLabels.automation.toLowerCase().includes(navQuery) ||
        automationItems.some((item) =>
          item.name.toLowerCase().includes(navQuery)
        )));

  const hubTitles = useMemo(
    (): Partial<Record<ConnectNavId, { title: string; blurb: string }>> => ({
      'ai-agents': {
        title: t('connect_hub_ai_agents', 'AI Agents'),
        blurb: t(
          'connect_hub_ai_agents_blurb',
          'Claude, ChatGPT and coding agents. Drive PostQueen from the tools you already use.'
        ),
      },
      chat: {
        title: t('connect_hub_chat', 'Chat'),
        blurb: t(
          'connect_hub_chat_blurb',
          'Message an agent from WhatsApp, Telegram, Slack or Discord. Publishing channels live under Channels.'
        ),
      },
      mcp: {
        title: t('connect_hub_mcp', 'MCP clients'),
        blurb: t(
          'connect_hub_mcp_blurb',
          'Streamable HTTP at your /mcp endpoint — 11 tools. Auth is your API key in the URL or as a Bearer token.'
        ),
      },
      'agent-skills': {
        title: t('connect_hub_agent_skills', 'Agent Skills'),
        blurb: t(
          'connect_hub_agent_skills_blurb',
          'One install teaches agents the PostQueen CLI. OpenClaw and Hermes use skills only — not MCP.'
        ),
      },
      automation: {
        title: t('connect_hub_automation', 'Automation'),
        blurb: t(
          'connect_hub_automation_blurb',
          'Workflows in, webhooks and RSS out. Official Zapier/Make apps are not shipped yet — HTTP still works.'
        ),
      },
      cli: {
        title: t('connect_hub_cli', 'CLI'),
        blurb: t(
          'connect_hub_cli_blurb',
          'Install the postqueen package, export your API key, schedule from any shell.'
        ),
      },
      api: {
        title: t('connect_hub_api', 'API'),
        blurb: t(
          'connect_hub_api_blurb',
          'Public REST API, Node SDK and OAuth apps — the same surface every other connection rides.'
        ),
      },
    }),
    [t]
  );

  const showAgentList =
    !!active && (nav === 'ai-agents' || nav === 'agent-skills') && !mobile;

  const renderDetail = (item: Connection) => {
    const prompts = item.prompts ?? fallbackPrompts;
    return (
      <div className="flex flex-col gap-[20px]">
        <button
          type="button"
          onClick={clearPicked}
          className="flex h-[32px] w-fit items-center gap-[6px] rounded-pqSm bg-pqBtnSimple px-[10px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('conn_back', 'Back')}
        </button>

        <div className="flex flex-wrap items-center gap-[16px]">
          <ConnIcon item={item} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[8px]">
              <h2 className="text-[22px] font-[600] -tracking-[0.02em]">
                {item.name}
              </h2>
              {item.soon && (
                <span className="rounded-[5px] bg-pqAmberSoft px-[6px] py-[2px] text-[9.5px] font-[700] tracking-[0.06em] text-pqAmber">
                  {t('conn_soon', 'OFFICIAL APP SOON')}
                </span>
              )}
            </div>
            <div className="mt-[3px] text-[13.5px] leading-[1.5] text-pqMuted">
              {item.intro}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-[8px]">
          {item.docs.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex h-[34px] items-center gap-[6px] rounded-pqSm bg-pqBrand px-[12px] text-[12.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
            >
              {link.label}
              <ExternalLinkIcon size={13} className="opacity-[0.9]" />
            </a>
          ))}
          {item.paths?.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex h-[34px] items-center gap-[6px] rounded-pqSm bg-pqBtnSimple px-[12px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
            >
              {link.label}
              <ExternalLinkIcon size={13} className="opacity-[0.7]" />
            </a>
          ))}
        </div>

        <PromptHero prompts={prompts} />

        {!!item.info && (
          <div className="text-[14px] leading-[1.7] text-pqMuted">{item.info}</div>
        )}

        {item.section !== 'media' && (
          <ApiKeyCard
            showWizard={false}
            showDocs={false}
            hint={t(
              'conn_api_key_hint',
              'Use this key when the connector asks for credentials — the same key works for every integration here.'
            )}
            onRevealChange={setKeyRevealed}
          />
        )}

        {item.section === 'media' && (
          <Link
            href="/settings?tab=integrations"
            className="flex h-[36px] w-fit items-center rounded-pqSm bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
          >
            {t('connect_open_integrations', 'Open Integrations')} →
          </Link>
        )}

        {item.id === 'oauth' && (
          <button
            type="button"
            onClick={() => selectNav('developers')}
            className="flex h-[36px] w-fit items-center rounded-pqSm bg-pqBtnSimple px-[14px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover"
          >
            {t('connect_open_developers', 'Open Developers')} →
          </button>
        )}

        <div className="flex flex-col gap-[16px] rounded-[18px] bg-pqInner p-[22px] shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="text-[15px] font-[600]">
            {t('conn_how_to_connect', 'How to connect')}
          </div>
          {item.steps.map((step, index) => (
            <div key={`${step.title}-${index}`} className="flex gap-[13px]">
              <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-pqBrandSoft text-[12px] font-[700] text-pqBrand">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-[600]">{step.title}</div>
                {!!step.detail && (
                  <div className="mt-[2px] text-[13.5px] leading-[1.6] text-pqMuted">
                    {step.detail}
                  </div>
                )}
                {!!step.code && (
                  <CodeBlock
                    code={maskCode(step.code)}
                    rawCode={step.code}
                    label={item.name}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {!!item.note && (
          <div className="rounded-pqSm bg-pqBrandFaint p-[12px] text-[12.5px] leading-[1.55] text-pqMuted">
            {item.note}
          </div>
        )}
      </div>
    );
  };

  const renderHub = () => {
    if (nav === 'api-keys') {
      return (
        <div>
          <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
            {t('api_keys', 'API Keys')}
          </h3>
          <div className="mt-[4px] text-[14px] text-pqMuted">
            {t(
              'api_keys_description',
              'Reveal or rotate your personal API key for authenticating with the public API.'
            )}
          </div>
          <PublicApiKeysSection embeddedInConnect />
        </div>
      );
    }

    if (nav === 'developers') {
      return (
        <div>
          <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
            {t('developers', 'Developers')}
          </h3>
          <div className="mt-[4px] text-[14px] text-pqMuted">
            {t(
              'developers_oauth_description',
              'Build OAuth apps so other products can post on behalf of your users. After authorization you get a pos_ token that works like an API key.'
            )}
          </div>
          <PublicAppsSection />
        </div>
      );
    }

    if (nav === 'approved-apps') {
      return (
        <div>
          <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
            {t('approved_apps', 'Approved Apps')}
          </h3>
          <div className="mt-[4px] text-[14px] text-pqMuted">
            {t(
              'apps_you_have_authorized',
              'Applications you have authorized to access your PostQueen account.'
            )}
          </div>
          <ApprovedAppsComponent />
        </div>
      );
    }

    const meta = hubTitles[nav];
    if (!meta) return null;

    // Automation with no connector: compact children list (pane not blank).
    if (nav === 'automation') {
      return (
        <div className="flex flex-col gap-[18px]">
          <div>
            <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
              {meta.title}
            </h3>
            <div className="mt-[4px] text-[14px] text-pqMuted">{meta.blurb}</div>
          </div>
          <div className="flex flex-col gap-[6px]">
            {automationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                data-connector={item.id}
                onClick={() => selectAutomationChild(item.id)}
                className="flex items-center gap-[10px] rounded-pqMd bg-pqInner p-[12px_14px] text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand)]"
              >
                <ConnIcon item={item} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-[7px]">
                    <span className="truncate text-[13.5px] font-[600]">
                      {item.name}
                    </span>
                    {item.soon && (
                      <span className="shrink-0 rounded-[5px] bg-pqAmberSoft px-[5px] py-[1px] text-[9px] font-[700] tracking-[0.05em] text-pqAmber">
                        {t('conn_soon_short', 'SOON')}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-1 text-[11.5px] text-pqMuted">
                    {item.short}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const hubCard = (item: Connection, i: number) => (
      <button
        key={item.id}
        type="button"
        data-connector={item.id}
        data-conn-card="1"
        style={
          tourConn ? { animationDelay: `${(i % 14) * 0.38}s` } : undefined
        }
        onClick={() => selectItem(item.id)}
        className="flex flex-col gap-[10px] rounded-pqLg bg-pqInner p-[14px] text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand)]"
      >
        <span className="flex min-w-0 items-start gap-[11px]">
          <ConnIcon item={item} />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="flex min-w-0 items-center gap-[7px]">
              <span className="truncate text-[14px] font-[600] -tracking-[0.01em]">
                {item.name}
              </span>
              {item.soon && (
                <span className="shrink-0 rounded-[5px] bg-pqAmberSoft px-[5px] py-[1px] text-[9px] font-[700] tracking-[0.05em] text-pqAmber">
                  {t('conn_soon_short', 'SOON')}
                </span>
              )}
            </span>
            <span className="text-[12px] leading-[1.45] text-pqMuted">
              {item.short}
            </span>
          </span>
        </span>
      </button>
    );

    const hubGrid = (items: Connection[]) => (
      <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
        {items.map(hubCard)}
      </div>
    );

    return (
      <div className="flex flex-col gap-[18px]">
        <div>
          <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
            {meta.title}
          </h3>
          <div className="mt-[4px] text-[14px] text-pqMuted">{meta.blurb}</div>
        </div>

        {nav === 'agent-skills' && (
          <SkillInstallCallout apiKey={apiKey} keyRevealed={keyRevealed} />
        )}
        {nav === 'cli' && (
          <CliSetupCallout apiKey={apiKey} keyRevealed={keyRevealed} />
        )}
        {nav === 'mcp' && (
          <McpAuthCallout
            mcpUrl={mcpUrl}
            mcpUrlWithKey={mcpUrlWithKey}
            apiKey={apiKey}
            keyRevealed={keyRevealed}
          />
        )}

        {nav === 'ai-agents' ? (
          <div className="flex flex-col gap-[18px]">
            {(
              [
                {
                  key: 'agents',
                  label: t('conn_group_agents', 'Agents'),
                  items: hubItems.filter((c) => c.section === 'agents'),
                },
                {
                  key: 'assistants',
                  label: t('conn_group_assistants', 'Assistants'),
                  items: hubItems.filter((c) => c.section === 'assistants'),
                },
              ] as const
            ).map((strip) =>
              strip.items.length ? (
                <div key={strip.key} className="flex flex-col gap-[8px]">
                  <div className="text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
                    {strip.label}
                  </div>
                  {hubGrid(strip.items)}
                </div>
              ) : null
            )}
          </div>
        ) : (
          hubGrid(hubItems)
        )}

        {!hubItems.length && (
          <div className="rounded-pqMd border border-pqBorder p-[20px] text-center text-[13px] text-pqMuted">
            {t('conn_no_results', 'Nothing matches that.')}
          </div>
        )}
      </div>
    );
  };

  const chipClass = (id: ConnectNavId | string, activeChip: boolean) =>
    clsx(
      'h-[30px] rounded-[999px] px-[12px] text-[12px] font-[600] transition-colors',
      activeChip && !picked
        ? 'bg-pqBrand text-pqOnBrand'
        : activeChip && picked
          ? 'bg-pqBrandSoft text-pqFocused'
          : 'bg-pqBtnSimple text-pqSoft hover:bg-pqHover hover:text-pqText'
    );

  const leftNav = (
    <nav
      className={clsx(
        'flex min-h-0 overflow-y-auto',
        mobile
          ? 'flex-row flex-wrap gap-[6px] p-[0_12px_10px]'
          : 'flex-1 flex-col gap-[16px] p-[0_8px_14px]'
      )}
    >
      {/* —— Connectors —— */}
      {visibleConnectors.length > 0 && (
      <div
        className={clsx(
          'flex',
          mobile ? 'flex-row flex-wrap gap-[6px]' : 'flex-col gap-[1px]'
        )}
      >
        {!mobile && (
          <div className="px-[9px] pb-[5px] text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
            {t('connect_nav_section', 'Connectors')}
          </div>
        )}
        {visibleConnectors.flatMap(({ id }) => {
          // Mobile: flatten Automation into its five children (no nested accordion).
          if (mobile && id === 'automation') {
            return visibleAutomationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectAutomationChild(item.id)}
                className={chipClass(
                  item.id,
                  nav === 'automation' && picked === item.id
                )}
              >
                {item.name}
                {item.soon ? ` · ${t('conn_soon_short', 'SOON')}` : ''}
              </button>
            ));
          }

          if (mobile) {
            return [
              <button
                key={id}
                type="button"
                onClick={() => selectNav(id)}
                className={chipClass(id, nav === id)}
              >
                {navLabels[id]}
              </button>,
            ];
          }

          // Desktop Automation: parent toggles accordion; children open detail.
          if (id === 'automation') {
            return [
              <div key={id} className="flex flex-col gap-[1px]">
                <button
                  type="button"
                  onClick={toggleAutomation}
                  aria-expanded={automationExpanded}
                  className={clsx(
                    navItemBase,
                    nav === 'automation'
                      ? 'bg-[rgba(124,58,237,.15)] font-[600] text-pqFocused'
                      : 'text-pqMuted'
                  )}
                >
                  <NavIcon id={id} />
                  <span className="min-w-0 flex-1 truncate">
                    {navLabels[id]}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    aria-hidden="true"
                    className={clsx(
                      'shrink-0 opacity-[0.7] transition-transform',
                      automationExpanded && 'rotate-180'
                    )}
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {automationExpanded &&
                  visibleAutomationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectAutomationChild(item.id)}
                      aria-current={
                        picked === item.id ? 'page' : undefined
                      }
                      className={clsx(
                        'flex h-[30px] items-center gap-[8px] rounded-pqSm pe-[9px] ps-[28px] text-start text-[12.5px] transition-colors',
                        picked === item.id && nav === 'automation'
                          ? 'bg-[rgba(124,58,237,.12)] font-[600] text-pqFocused'
                          : 'text-pqMuted hover:bg-pqHover hover:text-pqText'
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.name}
                      </span>
                      {item.soon && (
                        <span className="shrink-0 rounded-[4px] bg-pqAmberSoft px-[4px] py-[0px] text-[8.5px] font-[700] tracking-[0.04em] text-pqAmber">
                          {t('conn_soon_short', 'SOON')}
                        </span>
                      )}
                    </button>
                  ))}
              </div>,
            ];
          }

          return [
            <button
              key={id}
              type="button"
              onClick={() => selectNav(id)}
              aria-current={id === nav ? 'page' : undefined}
              className={clsx(
                navItemBase,
                id === nav
                  ? 'bg-[rgba(124,58,237,.15)] font-[600] text-pqFocused'
                  : 'text-pqMuted'
              )}
            >
              <NavIcon id={id} />
              <span className="min-w-0 flex-1 truncate">{navLabels[id]}</span>
            </button>,
          ];
        })}
      </div>
      )}

      {/* —— Account —— */}
      {visibleAccount.length > 0 && (
      <div
        className={clsx(
          'flex',
          mobile
            ? 'w-full flex-row flex-wrap gap-[6px] border-t border-pqLine pt-[8px]'
            : 'flex-col gap-[1px] border-t border-pqLine pt-[12px]'
        )}
      >
        {!mobile && (
          <div className="px-[9px] pb-[5px] text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqSoft">
            {t('connect_nav_account', 'Account')}
          </div>
        )}
        {visibleAccount.map(({ id }) =>
          mobile ? (
            <button
              key={id}
              type="button"
              onClick={() => selectNav(id)}
              className={chipClass(id, nav === id)}
            >
              {navLabels[id]}
            </button>
          ) : (
            <button
              key={id}
              type="button"
              onClick={() => selectNav(id)}
              aria-current={id === nav ? 'page' : undefined}
              className={clsx(
                navItemBase,
                id === nav
                  ? 'bg-[rgba(124,58,237,.15)] font-[600] text-pqFocused'
                  : 'text-pqMuted'
              )}
            >
              <NavIcon id={id} />
              <span className="min-w-0 flex-1 truncate">{navLabels[id]}</span>
            </button>
          )
        )}
      </div>
      )}
    </nav>
  );

  return (
    <div
      data-connect-panel="1"
      data-tour="connections-page"
      {...(tourConn ? { 'data-tourconn': '1' } : {})}
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'relative flex shrink-0 overflow-hidden bg-pqPop shadow-[var(--e3),0_0_0_1px_var(--border)] animate-pqPop',
        mobile
          ? 'h-full w-full flex-col'
          : 'h-[min(680px,100%)] w-[min(1040px,100%)] rounded-[16px]'
      )}
    >
      {/* Left nav / mobile chips — Settings chrome: search above, then groups */}
      <div
        className={clsx(
          'flex min-h-0 flex-col bg-pqSettings',
          mobile
            ? 'w-full shrink-0 border-b border-pqLine'
            : 'w-[236px] shrink-0 border-e border-pqLine'
        )}
      >
        {mobile && (
          <div className="flex items-center justify-between gap-[8px] p-[12px_14px_0]">
            <div className="text-[15px] font-[600]">
              {t('connect_postqueen', 'Connect PostQueen')}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-pqSm bg-pqBtnSimple px-[10px] py-[6px] text-[12px] font-[600] text-pqText"
            >
              {mobileNavOpen
                ? t('hide', 'Hide')
                : t('connect_categories', 'Categories')}
            </button>
          </div>
        )}
        {(!mobile || mobileNavOpen || !picked) && (
          <>
            <div className="shrink-0 p-[14px_12px_10px]">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute start-[10px] top-[10px] text-pqSoft"
                >
                  <path
                    d="M17 17l4 4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search_connectors', 'Search connectors')}
                  className="h-[34px] w-full rounded-pqSm bg-pqInner pe-[11px] ps-[31px] text-[13px] text-pqText shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-pqSoft focus-visible:shadow-[inset_0_0_0_1px_var(--brand)]"
                />
              </div>
            </div>
            {leftNav}
          </>
        )}
      </div>

      {/* Optional inner agent list when detailing AI agents */}
      {showAgentList && (
        <div className="flex w-[180px] shrink-0 flex-col gap-[1px] overflow-y-auto border-e border-pqLine bg-pqSettings p-[10px_8px]">
          <button
            type="button"
            onClick={clearPicked}
            className="mb-[4px] px-[8px] text-start text-[11px] font-[600] text-pqSoft hover:text-pqText"
          >
            ←{' '}
            {
              hubTitles[
                nav === 'agent-skills' ? 'agent-skills' : 'ai-agents'
              ]?.title
            }
          </button>
          {hubItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item.id)}
              className={clsx(
                'flex items-center gap-[8px] rounded-pqSm px-[8px] py-[7px] text-start text-[12.5px] transition-colors',
                item.id === picked
                  ? 'bg-[rgba(124,58,237,.15)] font-[600] text-pqFocused'
                  : 'text-pqMuted hover:bg-pqHover hover:text-pqText'
              )}
            >
              <ConnIcon item={item} size="xs" />
              <span className="min-w-0 truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right content */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={close}
          aria-label={t('close', 'Close')}
          className="absolute end-[16px] top-[14px] z-[4] grid h-[30px] w-[30px] place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-pqInner p-[26px_28px_34px]">
          {active ? renderDetail(active) : renderHub()}
        </div>
      </div>
    </div>
  );
};

/**
 * /connections route — Settings-style scrim + Connect panel.
 * Gate matches the prior page: public_api + isGeneral + org admin.
 *
 * `mode=intercept` — soft-open via `@modal/(.)connections`.
 * `mode=page` — hard URL; scrim portals to body (covers header).
 */
export const ConnectPage: FC<{ mode?: RouteOverlayMode }> = ({
  mode = 'page',
}) => {
  const t = useT();
  const user = useUser();
  const { isGeneral } = useVariables();
  const router = useRouter();
  const isOrgAdmin = ['ADMIN', 'SUPERADMIN'].includes(user?.role!);

  const back = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/launches');
    }
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back]);

  if (!user?.tier?.public_api || !isGeneral || !isOrgAdmin) {
    return (
      <RouteOverlayScrim mode={mode} kind="connect" onClose={back}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[min(480px,100%)] rounded-[16px] bg-pqPop p-[24px] text-center text-[13px] text-pqMuted shadow-[var(--e3),0_0_0_1px_var(--border)]"
        >
          {t(
            'connections_admin_only',
            'Connections is available to workspace admins on plans with API access.'
          )}
        </div>
      </RouteOverlayScrim>
    );
  }

  return (
    <RouteOverlayScrim mode={mode} kind="connect" onClose={back}>
      <ConnectPanel onClose={back} />
    </RouteOverlayScrim>
  );
};
