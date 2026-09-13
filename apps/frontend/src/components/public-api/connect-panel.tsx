'use client';

import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import copy from 'copy-to-clipboard';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useUser } from '../layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  useTourRunning,
  useTourStepKey,
} from '@gitroom/frontend/components/onboarding/tour';
import {
  ApiKeyCard,
  useApiKeyAdminOnly,
} from '@gitroom/frontend/components/public-api/api-key-card';
import {
  PublicApiKeysSection,
  PublicAppsSection,
} from '@gitroom/frontend/components/public-api/public.component';
import { ApprovedAppsComponent } from '@gitroom/frontend/components/approved-apps/approved-apps.component';
import { useViewport } from '@gitroom/frontend/components/layout/use.viewport';
import {
  buildConnectionsCatalog,
  FEATURED_IDS,
  restGroupsForAllPage,
  CONNECT_NAV,
  CONNECT_NAV_ACCOUNT,
  CONNECT_NAV_CONNECTORS,
  connectionsForNav,
  defaultNavForConnection,
  findConnection,
  METHOD_STYLE,
  resolveConnectNavId,
  resolveConnectorId,
  type Connection,
  type ConnectNavId,
  type Example,
  type ExampleKind,
  absoluteApiUrl,
  needsApiUrl,
} from '@gitroom/frontend/components/public-api/connections.catalog';
import {
  RouteOverlayScrim,
  useRouteOverlayActive,
  type RouteOverlayMode,
} from '@gitroom/frontend/components/layout/leave-settings';

const NAV_ICONS: Record<ConnectNavId, string[]> = {
  all: [
    'M4 5.5h6.5A1.5 1.5 0 0 1 12 7v4.5A1.5 1.5 0 0 1 10.5 13H4A1.5 1.5 0 0 1 2.5 11.5V7A1.5 1.5 0 0 1 4 5.5ZM13.5 5.5H20A1.5 1.5 0 0 1 21.5 7v2A1.5 1.5 0 0 1 20 10.5h-6.5A1.5 1.5 0 0 1 12 9V7A1.5 1.5 0 0 1 13.5 5.5ZM4 16h6.5A1.5 1.5 0 0 1 12 17.5V20A1.5 1.5 0 0 1 10.5 21.5H4A1.5 1.5 0 0 1 2.5 20v-2.5A1.5 1.5 0 0 1 4 16ZM13.5 13.5H20A1.5 1.5 0 0 1 21.5 15v5A1.5 1.5 0 0 1 20 21.5h-6.5A1.5 1.5 0 0 1 12 20v-5a1.5 1.5 0 0 1 1.5-1.5Z',
  ],
  assistants: [
    'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0',
  ],
  agents: [
    'M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3Z',
  ],
  chat: [
    'M5 6.5h10.5A2.5 2.5 0 0 1 18 9v5a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16.5H5A2.5 2.5 0 0 1 2.5 14V9A2.5 2.5 0 0 1 5 6.5Z',
  ],
  automation: [
    'M5 19.5h.01M5 12a7.5 7.5 0 0 1 7.5 7.5M5 5a14.5 14.5 0 0 1 14.5 14.5',
  ],
  build: ['m8 8-4 4 4 4M16 8l4 4-4 4M13.6 5.5l-3.2 13'],
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

/**
 * Shown wherever a command or URL would carry the API key and cannot.
 *
 * The callouts below interpolate the key into copyable text; for a member the
 * server sends an empty one, so the line renders as a URL that stops at the
 * slash. Better to say why than to hand somebody a command that cannot work.
 */
const ApiKeyMissingNote: FC = () => {
  const adminOnly = useApiKeyAdminOnly();
  return (
    <div className="rounded-pqSm bg-pqBg p-[10px_12px] text-[12px] leading-[1.5] text-pqMuted shadow-[inset_0_0_0_1px_var(--border)]">
      {adminOnly.body}
    </div>
  );
};

const ExamplesBlock: FC<{
  kind: ExampleKind;
  examples: Example[];
  mask?: (text: string) => string;
}> = ({ kind, examples, mask }) => {
  const t = useT();
  if (!examples.length) return null;
  const chatLike = kind === 'chat' || kind === 'skill';
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="text-[11px] font-[600] uppercase tracking-[0.07em] text-pqMuted">
        {chatLike
          ? t('conn_examples_try', 'Try saying')
          : kind === 'workflow'
            ? t('conn_examples_flow', 'Example workflows')
            : kind === 'http' || kind === 'api'
              ? t('conn_examples_http', 'Example requests')
              : t('conn_examples_cli', 'Example commands')}
      </div>
      {chatLike ? (
        <div
          className="flex flex-col items-end gap-[10px] rounded-[18px] p-[20px_18px] shadow-pqE2"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--brandSoft) 0%, var(--brand) 55%, var(--focused) 100%)',
          }}
        >
          {examples.map((ex) => (
            <div
              key={ex.body}
              className="flex max-w-[90%] items-center gap-[11px] rounded-[16px] bg-pqOnBrand px-[15px] py-[11px] shadow-pqE1"
            >
              <span className="light min-w-0 flex-1 text-[13.5px] leading-[1.45] text-pqText">
                {ex.body}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {examples.map((ex) => (
            <div
              key={`${ex.title ?? ''}-${ex.body}`}
              className="rounded-pqMd bg-pqInner p-[14px_16px] shadow-[inset_0_0_0_1px_var(--border)]"
            >
              {!!ex.title && (
                <div className="text-[13px] font-[600] text-pqText">
                  {ex.title}
                </div>
              )}
              <div
                className={clsx(
                  'text-[13px] leading-[1.5] text-pqMuted',
                  ex.title && 'mt-[3px]'
                )}
              >
                {ex.body}
              </div>
              {!!ex.code && (
                <CodeBlock
                  code={mask ? mask(ex.code) : ex.code}
                  rawCode={ex.code}
                  label={ex.title || 'Example'}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConnIcon: FC<{
  item: Pick<Connection, 'icon' | 'glyph' | 'name'>;
  size?: 'xs' | 'sm' | 'lg';
}> = ({ item, size = 'sm' }) => {
  const img = size === 'lg' ? 48 : size === 'xs' ? 22 : 40;
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
      ? 'h-[48px] w-[48px] rounded-pqLg text-[12px]'
      : size === 'xs'
        ? 'h-[22px] w-[22px] rounded-[6px] text-[9px]'
        : 'h-[40px] w-[40px] rounded-pqMd text-[12px]';
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
    {(NAV_ICONS[id] || NAV_ICONS.all).map((d) => (
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

const SkillInstallCallout: FC<{
  apiKey: string;
  keyRevealed: boolean;
  /** Only when the tools must be told where the API is (see needsApiUrl). */
  apiUrl?: string;
}> = ({ apiKey, keyRevealed, apiUrl }) => {
  const t = useT();
  const code = 'npx skills add GkhanKINAY/postqueen-agent';
  const keyCode = `export POSTQUEEN_API_KEY="${apiKey}"`;
  // `!apiKey` is not just the empty case, it is the member case: the server
  // withholds the key from non-admins. `''.replace` matches at position zero,
  // so masking an absent key prepends the stars to the command instead of
  // hiding anything.
  const maskedKey =
    keyRevealed || !apiKey
      ? keyCode
      : keyCode.replace(apiKey, '*'.repeat(Math.min(apiKey.length, 24)));
  return (
    <div className="mb-[16px] flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div>
        <div className="text-[14px] font-[600] text-pqText">
          {t('conn_step_skill_install', 'Install the PostQueen skill')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_step_skill_install_detail',
            'One command, once per machine. It installs the skill playbook, not the CLI. Install the CLI separately with npm i -g postqueen if you want shell commands.'
          )}
        </div>
      </div>
      <CodeBlock code={code} label="Skill" />
      <div>
        <div className="text-[13px] font-[600] text-pqText">
          {t('conn_step_skill_key', 'Give it your API key')}
        </div>
        <CodeBlock
          code={maskedKey}
          rawCode={keyCode}
          label="API key"
        />
        {!apiKey && <ApiKeyMissingNote />}
      </div>
      {!!apiUrl && (
        <div>
          <div className="text-[13px] font-[600] text-pqText">
            {t('conn_step_api_url', 'Point it at your server')}
          </div>
          <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
            {t(
              'conn_step_api_url_detail',
              'The skill, the CLI and the SDK call the hosted API unless told otherwise. Export this next to the key.'
            )}
          </div>
          <CodeBlock
            code={`export POSTQUEEN_API_URL="${apiUrl}"`}
            label="API URL"
          />
        </div>
      )}
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

const CliSetupCallout: FC<{
  apiKey: string;
  keyRevealed: boolean;
  /** Only when the tools must be told where the API is (see needsApiUrl). */
  apiUrl?: string;
}> = ({ apiKey, keyRevealed, apiUrl }) => {
  const t = useT();
  const keyCode = `export POSTQUEEN_API_KEY="${apiKey}"`;
  // See SkillInstallCallout, masking an absent key would prepend the stars.
  const maskedKey =
    keyRevealed || !apiKey
      ? keyCode
      : keyCode.replace(apiKey, '*'.repeat(Math.min(apiKey.length, 24)));
  return (
    <div className="mb-[16px] flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
      <div>
        <div className="text-[14px] font-[600] text-pqText">
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
        <div className="text-[13px] font-[600] text-pqText">
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
        <div className="text-[13px] font-[600] text-pqText">
          {t('conn_cli_step_login', 'Authenticate')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_step_login_detail',
            'Settings → API Keys → Reveal, then export. Self-hosted OAuth device flow (`auth:login`) is advanced, see Authentication docs.'
          )}
        </div>
        <CodeBlock code={maskedKey} rawCode={keyCode} label="API key" />
        {!apiKey && <ApiKeyMissingNote />}
      </div>
      {!!apiUrl && (
        <div>
          <div className="text-[13px] font-[600] text-pqText">
            {t('conn_step_api_url', 'Point it at your server')}
          </div>
          <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
            {t(
              'conn_step_api_url_detail',
              'The skill, the CLI and the SDK call the hosted API unless told otherwise. Export this next to the key.'
            )}
          </div>
          <CodeBlock
            code={`export POSTQUEEN_API_URL="${apiUrl}"`}
            label="API URL"
          />
        </div>
      )}
      <div>
        <div className="text-[13px] font-[600] text-pqText">
          {t('conn_cli_step_try', 'Try it')}
        </div>
        <div className="mt-[2px] text-[12.5px] leading-[1.5] text-pqMuted">
          {t(
            'conn_cli_step_try_detail',
            'First command that reaches the API, lists your connected channels as JSON.'
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

/**
 * Dual-pane Connect PostQueen marketplace.
 * Desktop fills the viewport. All: Featured four-up, then rail groups of compact cards.
 */
// Its own hook, as the repo requires of every SWR call. Same key and options as
// `organization.selector` so the two share one cache entry rather than each
// fetching the list.
const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, [fetch]);

  return useSWR('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

export const ConnectPanel: FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const t = useT();
  const user = useUser();
  const { data: organizations } = useOrganizations();
  const currentOrgName = useMemo(
    () =>
      organizations?.find((org: { id: string }) => org.id === user?.orgId)
        ?.name,
    [organizations, user?.orgId]
  );
  const { backendUrl } = useVariables();
  const toaster = useToaster();
  const { mobile, tablet, desktop } = useViewport();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourKey = useTourStepKey();
  const tourHub =
    tourKey === 'connect-pq' ||
    tourKey === 'connect-featured' ||
    tourKey === 'connect-creds';
  const tourConn = tourKey === 'connect-featured';


  const [nav, setNav] = useState<ConnectNavId>('all');
  const [picked, setPicked] = useState('');
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState('');

  const apiKey = user?.publicApi || '';
  const apiUrl = useMemo(() => absoluteApiUrl(backendUrl), [backendUrl]);
  const customApiUrl = needsApiUrl(apiUrl) ? apiUrl : undefined;
  const mcpUrl = `${apiUrl}/mcp`;
  const mcpUrlWithKey = `${apiUrl}/mcp/${apiKey}`;
  const apiHeader = `Authorization: ${apiKey}`;

  const groups = useMemo(
    () =>
      buildConnectionsCatalog({
        t,
        backendUrl: apiUrl,
        mcpUrl,
        apiKey,
        apiUrl: customApiUrl,
      }),
    [t, apiUrl, mcpUrl, apiKey, customApiUrl]
  );

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!tourHub) return;
    setNav('all');
    setPicked('');
    setQuery('');
    setMobileNavOpen(false);
  }, [tourHub]);

  useEffect(() => {
    if (tourHub) return;
    const resolvedNav = resolveConnectNavId(searchParams.get('nav'));
    const connectorId = resolveConnectorId(searchParams.get('connector'));

    if (resolvedNav) {
      setNav(resolvedNav);
    }

    if (connectorId) {
      const found = findConnection(groups, connectorId);
      if (found) {
        setPicked(found.id);
        if (!resolvedNav) setNav(defaultNavForConnection(found));
      }
    }
  }, [searchParams, groups, tourHub]);

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
      syncUrl(id, '');
    },
    [syncUrl]
  );

  const selectItem = useCallback(
    (id: string) => {
      setPicked(id);
      setKeyRevealed(false);
      setMobileNavOpen(false);
      syncUrl(nav, id);
    },
    [nav, syncUrl]
  );

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

  const hubItems = useMemo(() => {
    const items = connectionsForNav(groups, nav);
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.short.toLowerCase().includes(q) ||
        item.method.toLowerCase().includes(q)
    );
  }, [groups, nav, query]);

  const featuredItems = useMemo(
    () =>
      FEATURED_IDS.map((id) => findConnection(groups, id)).filter(
        (c): c is Connection => !!c
      ),
    [groups]
  );

  const allPageGroups = useMemo(
    () => (nav === 'all' && !query.trim() ? restGroupsForAllPage(groups) : []),
    [groups, nav, query]
  );

  const active = all.find((item) => item.id === picked);

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

  const navLabels = useMemo(
    (): Record<ConnectNavId, string> => ({
      all: t('connect_nav_all', 'All'),
      assistants: t('connect_nav_assistants', 'Assistants'),
      agents: t('connect_nav_agents', 'Agents'),
      chat: t('connect_nav_chat', 'Chat'),
      automation: t('connect_nav_automation', 'Automation'),
      build: t('connect_nav_build', 'Build'),
      'api-keys': t('connect_nav_api_keys', 'API Keys'),
      developers: t('connect_nav_developers', 'Developers'),
      'approved-apps': t('connect_nav_approved_apps', 'Approved Apps'),
    }),
    [t]
  );

  const navQuery = query.trim().toLowerCase();

  const visibleConnectors = useMemo(() => {
    if (!navQuery) return CONNECT_NAV_CONNECTORS;
    return CONNECT_NAV_CONNECTORS.filter(({ id }) =>
      navLabels[id].toLowerCase().includes(navQuery)
    );
  }, [navQuery, navLabels]);

  const visibleAccount = useMemo(() => {
    if (!navQuery) return CONNECT_NAV_ACCOUNT;
    return CONNECT_NAV_ACCOUNT.filter(({ id }) =>
      navLabels[id].toLowerCase().includes(navQuery)
    );
  }, [navQuery, navLabels]);

  const hubTitles = useMemo(
    (): Partial<Record<ConnectNavId, { title: string; blurb: string }>> => ({
      all: {
        title: t('connect_hub_all', 'Connect PostQueen'),
        blurb: t(
          'connect_hub_all_blurb',
          'Connect once. Then ask, run an agent, or automate.'
        ),
      },
      assistants: {
        title: t('connect_hub_assistants', 'Assistants'),
        blurb: t(
          'connect_hub_assistants_blurb',
          'Claude, ChatGPT, Grok, Grok Bot, Cursor and Gemini. One MCP URL, 14 tools.'
        ),
      },
      agents: {
        title: t('connect_hub_agents', 'Agents'),
        blurb: t(
          'connect_hub_agents_blurb',
          'OpenClaw is a chat bot you host. Claude Code, Grok Build and Codex run in a coding session.'
        ),
      },
      chat: {
        title: t('connect_hub_chat', 'Chat'),
        blurb: t(
          'connect_hub_chat_blurb',
          'Message an agent from WhatsApp, Telegram, Slack or Discord. Publishing channels live under Channels.'
        ),
      },
      automation: {
        title: t('connect_hub_automation', 'Automation'),
        blurb: t(
          'connect_hub_automation_blurb',
          'n8n is live. Zapier and Make official apps are coming soon, HTTP still works today.'
        ),
      },
      build: {
        title: t('connect_hub_build', 'Build'),
        blurb: t(
          'connect_hub_build_blurb',
          'CLI, Public API, Node SDK and OAuth apps, the same surface every other connection rides.'
        ),
      },
    }),
    [t]
  );

  const copyChipClass =
    'flex h-[28px] items-center rounded-pqSm bg-pqSettings px-[10px] text-[12px] font-[500] text-pqText transition-colors hover:bg-pqHover';

  const credentialStrip = (
    cred: Connection['cred'] | 'hub',
    compact = false
  ) => {
    if (cred === 'none') return null;
    const showMcp = cred === 'hub' || cred === 'mcp';
    const showApi = cred === 'hub' || cred === 'api';
    const showEnv = cred === 'env';
    const maskedKey = keyRevealed
      ? apiKey
      : apiKey
        ? `${'•'.repeat(Math.max(apiKey.length - 5, 8))}${apiKey.slice(-5)}`
        : '•'.repeat(32);

    if (compact) {
      return (
        <div
          className="flex flex-wrap items-center gap-[8px] rounded-pqLg bg-pqPop px-[14px] py-[10px] shadow-[inset_0_0_0_1px_var(--border)]"
          aria-label={t('conn_your_connection', 'Your connection')}
          data-tour={compact ? 'connect-creds' : undefined}
        >
          <span className="text-[12px] font-[600] text-pqMuted">
            {t('api_key', 'API key')}
          </span>
          <code className="min-w-0 max-w-[min(100%,280px)] truncate rounded-pqSm bg-pqInner px-[10px] py-[5px] font-mono text-[12.5px] text-pqText">
            {maskedKey || '•'.repeat(32)}
          </code>
          <button
            type="button"
            onClick={() => setKeyRevealed((v) => !v)}
            className={copyChipClass}
          >
            {keyRevealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
          </button>
          {showMcp && (
            <button
              type="button"
              onClick={() => {
                copy(mcpUrlWithKey);
                toaster.show('MCP URL copied to clipboard', 'success');
              }}
              className={copyChipClass}
            >
              {t('copy', 'Copy')} {t('conn_copy_mcp', 'MCP URL')}
            </button>
          )}
          {showApi && (
            <code className="rounded-pqSm bg-pqInner px-[10px] py-[4px] font-mono text-[11.5px] text-pqMuted">
              Authorization: KEY
            </code>
          )}
          {!apiKey && (
            <div className="basis-full">
              <ApiKeyMissingNote />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[12px] rounded-pqMd bg-pqInner p-[16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <ApiKeyCard
          compact
          showWizard={false}
          showDocs={false}
          hint={t(
            'conn_api_key_hint',
            'One key for MCP, the CLI, n8n and the Public API. Settings → API Keys.'
          )}
          onRevealChange={setKeyRevealed}
        />
        {showMcp && (
          <div>
            <div className="text-[12px] font-[600] text-pqMuted">
              {t('conn_copy_mcp', 'MCP URL')}
            </div>
            <CodeBlock
              code={maskCode(mcpUrlWithKey)}
              rawCode={mcpUrlWithKey}
              label="MCP URL"
            />
          </div>
        )}
        {showApi && (
          <div>
            <div className="text-[12px] font-[600] text-pqMuted">
              {t('conn_copy_api_header', 'Public API header, no Bearer')}
            </div>
            <CodeBlock
              code={maskCode(apiHeader)}
              rawCode={apiHeader}
              label="API header"
            />
          </div>
        )}
        {showEnv && (
          <div>
            <div className="text-[12px] font-[600] text-pqMuted">
              {t('conn_copy_env', 'Environment')}
            </div>
            <CodeBlock
              code={maskCode(`export POSTQUEEN_API_KEY="${apiKey}"`)}
              rawCode={`export POSTQUEEN_API_KEY="${apiKey}"`}
              label="API key"
            />
            {!!customApiUrl && (
              <CodeBlock
                code={`export POSTQUEEN_API_URL="${customApiUrl}"`}
                label="API URL"
              />
            )}
          </div>
        )}
        {!apiKey && <ApiKeyMissingNote />}
      </div>
    );
  };

  const methodChip = (item: Connection) => (
    <span
      className={clsx(
        'shrink-0 rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-[700] tracking-[0.04em]',
        METHOD_STYLE[item.method]
      )}
    >
      {item.method}
    </span>
  );

  const renderDetail = (item: Connection) => {
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
              <h2 className="text-[22px] font-[600] text-pqText -tracking-[0.02em]">
                {item.name}
              </h2>
              {methodChip(item)}
              {item.soon && (
                <span className="rounded-[5px] bg-pqAmberSoft px-[6px] py-[2px] text-[9.5px] font-[700] tracking-[0.06em] text-pqAmber">
                  {t('conn_soon', 'COMING SOON')}
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

        {item.section !== 'media' && credentialStrip(item.cred)}

        {!!item.info && (
          <div className="rounded-pqSm bg-pqBrandFaint p-[12px] text-[13px] leading-[1.6] text-pqMuted">
            {item.info}
          </div>
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
          <div className="text-[15px] font-[600] text-pqText">
            {t('conn_how_to_connect', 'How to connect')}
          </div>
          {item.steps.map((step, index) => (
            <div key={`${step.title}-${index}`} className="flex gap-[13px]">
              <span className="mt-[1px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-pqBrandSoft text-[12px] font-[700] text-pqBrand">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-[600] text-pqText">{step.title}</div>
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

        {!!item.examples?.length && (
          <ExamplesBlock
            kind={item.exampleKind}
            examples={item.examples}
            mask={maskCode}
          />
        )}

        {!!item.note && (
          <div className="rounded-pqSm bg-pqBrandFaint p-[12px] text-[12.5px] leading-[1.55] text-pqMuted">
            {item.note}
          </div>
        )}
      </div>
    );
  };

  const renderHub = () => {
    // The three Account sections render for everyone. Each one answers for its
    // own rights: API Keys masks a key it may not show, Developers refuses to
    // fetch, Approved Apps is per-user and ungated to begin with.
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
            {/* Upstream 6c1c5dd6: an OAuth app belongs to one organization, and
                someone with the same email in two of them needs to see which
                one they are about to create it in. */}
            {!!currentOrgName && (
              <span className="text-pqMuted"> / {currentOrgName}</span>
            )}
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

    const hubCard = (item: Connection, i: number, featured = false) => (
      <button
        key={item.id}
        type="button"
        data-connector={item.id}
        data-conn-card="1"
        style={
          tourConn ? { animationDelay: `${(i % 14) * 0.38}s` } : undefined
        }
        onClick={() => selectItem(item.id)}
        className={clsx(
          'flex flex-col gap-[8px] rounded-pqLg bg-pqPop text-start shadow-[inset_0_0_0_1px_var(--border)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--brand)]',
          featured ? 'p-[16px]' : 'p-[13px_14px]'
        )}
      >
        <span className="flex min-w-0 items-center gap-[10px]">
          <ConnIcon item={item} size={featured ? 'sm' : 'xs'} />
          <span className="min-w-0 flex-1 truncate text-[14px] font-[600] leading-[1.2] text-pqText">
            {item.name}
          </span>
          {methodChip(item)}
          {item.soon && (
            <span className="shrink-0 rounded-[5px] bg-pqAmberSoft px-[5px] py-[1px] text-[9px] font-[700] tracking-[0.05em] text-pqAmber">
              {t('conn_soon_short', 'SOON')}
            </span>
          )}
        </span>
        <span className="text-[12.5px] leading-[1.4] text-pqMuted">
          {item.short}
        </span>
      </button>
    );

    const hubGrid = (
      items: Connection[],
      opts: { featured?: boolean } = {}
    ) => (
      <div
        className={clsx(
          'grid gap-[10px]',
          opts.featured
            ? {
                'grid-cols-1': mobile,
                'grid-cols-2': tablet,
                'grid-cols-4': desktop,
              }
            : mobile
              ? 'grid-cols-1'
              : '[grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]'
        )}
      >
        {items.map((item, i) => hubCard(item, i, opts.featured))}
      </div>
    );

    const browsingAll = nav === 'all' && !query.trim();

    return (
      <div className="flex flex-col gap-[20px]">
        <div>
          {nav === 'all' ? (
            <h3 className="m-0 max-w-[42rem] font-display text-[22px] font-[500] leading-[1.3] tracking-[-0.02em] text-pqText">
              {meta.blurb}
            </h3>
          ) : (
            <>
              <h3 className="m-0 font-display text-[20px] font-[500] tracking-[-0.01em] text-pqText">
                {meta.title}
              </h3>
              <div className="mt-[4px] text-[14px] text-pqMuted">{meta.blurb}</div>
            </>
          )}
        </div>

        {credentialStrip('hub', true)}

        {browsingAll && (
          <div
            className="flex flex-col gap-[10px]"
            data-tour="connect-featured"
            {...(tourConn ? { 'data-tourconn': '1' } : {})}
          >
            <div className="text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqMuted">
              {t('connect_featured', 'Featured')}
            </div>
            {hubGrid(featuredItems, { featured: true })}
          </div>
        )}

        {nav === 'agents' && (
          <SkillInstallCallout
            apiKey={apiKey}
            keyRevealed={keyRevealed}
            apiUrl={customApiUrl}
          />
        )}
        {nav === 'build' && (
          <CliSetupCallout
            apiKey={apiKey}
            keyRevealed={keyRevealed}
            apiUrl={customApiUrl}
          />
        )}

        {browsingAll ? (
          <div className="flex flex-col gap-[22px]">
            {allPageGroups.map((group) => (
              <div key={group.nav} className="flex flex-col gap-[8px]">
                <div className="flex items-baseline justify-between gap-[12px]">
                  <div className="text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqMuted">
                    {navLabels[group.nav]}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectNav(group.nav)}
                    className="shrink-0 text-[12px] font-[600] text-pqBrand hover:underline"
                  >
                    {t('connect_view_all', 'View')}
                  </button>
                </div>
                {hubGrid(group.items)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-[8px]">{hubGrid(hubItems)}</div>
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
      'h-[30px] shrink-0 rounded-[999px] px-[12px] text-[12px] font-[600] transition-colors',
      activeChip && !picked
        ? 'bg-pqBrand text-pqOnBrand'
        : activeChip && picked
          ? 'bg-pqBrandSoft text-pqFocused'
          : 'bg-pqBtnSimple text-pqMuted hover:bg-pqHover hover:text-pqText'
    );

  const leftNav = (
    <nav
      className={clsx(
        'flex min-h-0 overflow-y-auto',
        mobile
          ? 'flex-col gap-[8px] p-[0_12px_10px]'
          : 'flex-1 flex-col gap-[16px] p-[0_8px_14px]'
      )}
    >
      {/* Connectors */}
      {visibleConnectors.length > 0 && (
      <div
        className={clsx(
          'flex',
          mobile
            ? 'flex-row flex-nowrap items-center gap-[6px] overflow-x-auto'
            : 'flex-col gap-[1px]'
        )}
      >
        <div
          className={clsx(
            'text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqMuted',
            mobile ? 'shrink-0 px-[2px]' : 'px-[9px] pb-[5px]'
          )}
        >
          {t('connect_nav_section', 'Connectors')}
        </div>
        {visibleConnectors.map(({ id }) =>
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

      {/* Account */}
      {visibleAccount.length > 0 && (
      <div
        className={clsx(
          'flex',
          mobile
            ? 'flex-row flex-nowrap items-center gap-[6px] overflow-x-auto pt-[2px]'
            : 'flex-col gap-[1px] border-t border-pqLine pt-[12px]'
        )}
      >
        <div
          className={clsx(
            'text-[10.5px] font-[600] uppercase tracking-[0.07em] text-pqMuted',
            mobile ? 'shrink-0 px-[2px]' : 'px-[9px] pb-[5px]'
          )}
        >
          {t('connect_nav_account', 'Account')}
        </div>
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
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'relative flex shrink-0 overflow-hidden bg-pqPop shadow-[var(--e3),0_0_0_1px_var(--border)] animate-pqPop',
        mobile
          ? 'h-full w-full flex-col'
          : 'h-full w-full rounded-[16px]'
      )}
    >
      {/* Left nav / mobile chips, Settings chrome: search above, then groups */}
      <div
        className={clsx(
          'flex min-h-0 flex-col bg-pqSettings',
          mobile
            ? 'w-full shrink-0 border-b border-pqLine'
            : 'w-[236px] shrink-0 border-e border-pqLine'
        )}
      >
        {mobile && (
          <div className="flex items-center justify-between gap-[8px] p-[12px_14px_8px]">
            <div className="text-[15px] font-[600] text-pqText">
              {t('connect_postqueen', 'Connect PostQueen')}
            </div>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="rounded-pqSm bg-pqBtnSimple px-[10px] py-[6px] text-[12px] font-[600] text-pqText"
              >
                {mobileNavOpen
                  ? t('hide', 'Hide')
                  : t('connect_categories', 'Categories')}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label={t('close', 'Close')}
                className="grid h-[30px] w-[30px] place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
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
            </div>
          </div>
        )}
        {(!mobile || mobileNavOpen) && (
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
        )}
        {(!mobile || mobileNavOpen || !picked) && leftNav}
      </div>

      {/* Right content */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {!mobile && (
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-pqLine px-[24px]">
            <div className="text-[14.5px] font-[600] text-pqText">
              {t('connect_postqueen', 'Connect PostQueen')}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t('close', 'Close')}
              className="grid h-[30px] w-[30px] place-items-center rounded-[8px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
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
          </div>
        )}
        <div
          className={clsx(
            'min-h-0 min-w-0 flex-1 overflow-y-auto bg-pqInner',
            mobile ? 'p-[20px_16px_32px]' : 'p-[28px_32px_40px]'
          )}
        >
          {active ? renderDetail(active) : renderHub()}
        </div>
      </div>
    </div>
  );
};

/**
 * /connections route, Settings-style scrim + Connect panel.
 *
 * Open to everyone. The gate this used to carry (`public_api && isGeneral &&
 * org admin`) was inherited from the page this replaced, and two thirds of it
 * were wrong here: `public_api` is false on FREE, which is every unsubscribed
 * account, and `isGeneral` is the hosted-SaaS flag, false on every self-host,
 * which is the audience most likely to want MCP in the first place. Between
 * them they hid the catalog from the people the product tour walks to it, and
 * a connections page nobody can open is not a connections page.
 *
 * What is genuinely admin-only is the credential, and the server already says
 * so: `/user/self` returns an empty `publicApi` to members and
 * `POST /api-key/rotate` is policy-guarded. So members get the catalog and the
 * install steps, and a line telling them where the key comes from, see
 * `ConnectPanel`.
 *
 * `mode=intercept`, soft-open via `@modal/(.)connections`.
 * `mode=page`, hard URL; scrim portals to body (covers header).
 */
export const ConnectPage: FC<{ mode?: RouteOverlayMode }> = ({
  mode = 'page',
}) => {
  const router = useRouter();
  // A `@modal` slot keeps its last active state across soft navigations, so a
  // push to a route with no intercept (the tour: /connections → /channels)
  // strands this overlay over the new page. `default.tsx` only covers hard
  // loads, and nothing else ever unmounts it.
  const active = useRouteOverlayActive('connect');
  const tourRunning = useTourRunning();

  const back = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/launches');
    }
  }, [router]);

  useEffect(() => {
    // Hooks still run while the overlay is hidden, an unguarded listener would
    // navigate back from whatever page stranded it. During the tour the key
    // belongs to the tour, which has its own Escape and its own way of leaving;
    // both firing ends the tour *and* walks back a page.
    if (!active || tourRunning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back, active, tourRunning]);

  if (!active) {
    return null;
  }

  return (
    <RouteOverlayScrim mode={mode} kind="connect" onClose={back}>
      <ConnectPanel onClose={back} />
    </RouteOverlayScrim>
  );
};
