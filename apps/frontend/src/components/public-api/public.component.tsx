'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useUser } from '../layout/user.context';
import copy from 'copy-to-clipboard';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import { McpClientIcon } from '@gitroom/frontend/components/public-api/mcp.client.icons';
import clsx from 'clsx';

// Remote clients can't set headers, they get a URL to paste (hint = where)
export const remoteMcpClients = {
  Claude:
    'In Claude go to Settings > Connectors > Add custom connector and paste this URL.',
  ChatGPT:
    'In ChatGPT go to Settings > Connectors > Create and paste this URL.',
} as const;

// Clients with no MCP or CLI settings: you paste instructions into the chat,
// the agent installs the CLI itself and asks you for the API key
export const chatOnlyMcpClients = {
  'Grok Bot':
    'Install the Postiz CLI with `npm install -g postiz`, then install the Postiz skill with `npx skills add gitroomhq/postiz-agent`. Ask me for my Postiz API key and set it as the POSTIZ_API_KEY environment variable before using the CLI.',
} as const;

export const mcpClients = [
  'Claude Code',
  'Cursor',
  'VS Code / Copilot',
  'Windsurf',
  'Amp',
  'Codex',
  'Gemini CLI',
  'Warp',
] as const;

export type RemoteMcpClient = keyof typeof remoteMcpClients;
export type ChatOnlyMcpClient = keyof typeof chatOnlyMcpClients;
export type McpClient = (typeof mcpClients)[number];
export type AnyMcpClient = RemoteMcpClient | ChatOnlyMcpClient | McpClient;

// oauth: no API key, the client registers itself (DCR) and the user signs in to Postiz
// apikey: the organization API key, as a Bearer header (or inside the URL for remote clients)
export type McpAuth = 'oauth' | 'apikey';

export const getMcpOauthUrl = (mcpBase: string) =>
  `${mcpBase}/mcp-oauth-dynamic`;

export const isRemoteMcpClient = (client: string): client is RemoteMcpClient =>
  client in remoteMcpClients;

export const isChatOnlyMcpClient = (
  client: string
): client is ChatOnlyMcpClient => client in chatOnlyMcpClients;

export const getMcpConfig = (
  client: AnyMcpClient,
  auth: McpAuth,
  mcpBase: string,
  apiKey: string
): { config: string; hint: string } => {
  if (isChatOnlyMcpClient(client)) {
    return {
      config: chatOnlyMcpClients[client],
      hint: 'Paste this into the chat. The agent will ask you for your API key.',
    };
  }
  if (isRemoteMcpClient(client)) {
    return {
      config:
        auth === 'oauth' ? getMcpOauthUrl(mcpBase) : `${mcpBase}/mcp/${apiKey}`,
      hint: remoteMcpClients[client],
    };
  }

  const oauthUrl = getMcpOauthUrl(mcpBase);
  const urlBase = `${mcpBase}/mcp`;
  const bearer = `Bearer ${apiKey}`;

  const json = (obj: object) => JSON.stringify(obj, null, 2);

  if (auth === 'oauth') {
    switch (client) {
      case 'Claude Code':
        return {
          config: `claude mcp add postiz --transport http "${oauthUrl}"`,
          hint: 'Run this command in your terminal.',
        };
      case 'Cursor':
        return {
          config: json({ mcpServers: { postiz: { url: oauthUrl } } }),
          hint: 'Add to .cursor/mcp.json in your project root.',
        };
      case 'VS Code / Copilot':
        return {
          config: json({
            servers: { postiz: { type: 'http', url: oauthUrl } },
          }),
          hint: 'Add to .vscode/mcp.json in your project root.',
        };
      case 'Windsurf':
        return {
          config: json({
            mcpServers: { postiz: { serverUrl: oauthUrl } },
          }),
          hint: 'Add to ~/.codeium/windsurf/mcp_config.json',
        };
      case 'Amp':
        return {
          config: `amp mcp add postiz ${oauthUrl}`,
          hint: 'Run this command in your terminal.',
        };
      case 'Codex':
        return {
          config: `# ~/.codex/config.toml\n\n[mcp_servers.postiz]\nurl = "${oauthUrl}"`,
          hint: 'Add to ~/.codex/config.toml, then run: codex mcp login postiz',
        };
      case 'Gemini CLI':
        return {
          config: json({ mcpServers: { postiz: { url: oauthUrl } } }),
          hint: 'Add to ~/.gemini/settings.json',
        };
      case 'Warp':
        return {
          config: json({ postiz: { url: oauthUrl } }),
          hint: 'Settings > MCP Servers > + Add, then paste this config.',
        };
    }
  }

  switch (client) {
    case 'Claude Code':
      return {
        config: `claude mcp add --transport http postiz ${urlBase} --header "Authorization: ${bearer}"`,
        hint: 'Run this command in your terminal.',
      };
    case 'Cursor':
      return {
        config: json({
          mcpServers: {
            postiz: { url: urlBase, headers: { Authorization: bearer } },
          },
        }),
        hint: 'Add to .cursor/mcp.json in your project root.',
      };
    case 'VS Code / Copilot':
      return {
        config: json({
          servers: {
            postiz: {
              type: 'http',
              url: urlBase,
              headers: { Authorization: bearer },
            },
          },
        }),
        hint: 'Add to .vscode/mcp.json in your project root.',
      };
    case 'Windsurf':
      return {
        config: json({
          mcpServers: {
            postiz: {
              serverUrl: urlBase,
              headers: { Authorization: bearer },
            },
          },
        }),
        hint: 'Add to ~/.codeium/windsurf/mcp_config.json',
      };
    case 'Amp':
      return {
        config: json({
          'amp.mcpServers': {
            postiz: { url: urlBase, headers: { Authorization: bearer } },
          },
        }),
        hint: 'Add to your Amp settings.json',
      };
    case 'Codex':
      return {
        config: `# ~/.codex/config.toml\n\n[mcp_servers.postiz]\nurl = "${urlBase}"\nhttp_headers = { "Authorization" = "${bearer}" }`,
        hint: 'Add to ~/.codex/config.toml',
      };
    case 'Gemini CLI':
      return {
        config: json({
          mcpServers: {
            postiz: { url: urlBase, headers: { Authorization: bearer } },
          },
        }),
        hint: 'Add to ~/.gemini/settings.json',
      };
    case 'Warp':
      return {
        config: json({
          postiz: { url: urlBase, headers: { Authorization: bearer } },
        }),
        hint: 'Settings > MCP Servers > + Add, then paste this config.',
      };
  }
};

export const CopyButton = ({
  text,
  label,
}: {
  text: string;
  label: string;
}) => {
  const toaster = useToaster();
  return (
    <button
      type="button"
      onClick={() => {
        copy(text);
        toaster.show(`${label} copied to clipboard`, 'success');
      }}
      className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      {label}
    </button>
  );
};

const McpSection = ({
  user,
  mcpBase,
}: {
  user: { publicApi: string };
  mcpBase: string;
}) => {
  const t = useT();
  const { billingEnabled } = useVariables();
  const [activeClient, setActiveClient] = useState<AnyMcpClient>('Claude');
  const [auth, setAuth] = useState<McpAuth>('oauth');
  const [revealed, setRevealed] = useState(false);

  const { config, hint } = getMcpConfig(
    activeClient,
    auth,
    mcpBase,
    user.publicApi
  );

  const baseUrl = auth === 'oauth' ? getMcpOauthUrl(mcpBase) : `${mcpBase}/mcp`;

  const chatOnly = isChatOnlyMcpClient(activeClient);

  const maskedConfig =
    revealed || auth === 'oauth' || chatOnly
      ? config
      : config.replace(
          new RegExp(user.publicApi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '*'.repeat(user.publicApi.length)
        );

  return (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden">
      <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder flex items-start justify-between gap-[12px]">
        <div>
          <div className="text-[15px] font-[600]">
            {t('mcp_client_configuration', 'MCP Client Configuration')}
          </div>
          <div className="text-[13px] text-customColor18 mt-[2px]">
            {t(
              'connect_your_mcp_client_to_postiz_to_schedule_your_posts_faster',
              'Connect Postiz MCP server to your client (Http streaming) to schedule your posts faster.'
            )}
          </div>
        </div>
        <div className="flex gap-[6px] shrink-0 pt-[2px]">
          {billingEnabled && (
            <a
              className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
              href="https://claude.ai/directory/postiz"
              target="_blank"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              {t('add_to_claude', 'Add to Claude')}
            </a>
          )}
          <a
            className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            href="https://docs.postiz.com/mcp/introduction"
            target="_blank"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t('read_the_docs', 'Docs')}
          </a>
        </div>
      </div>
      <div className="p-[20px] flex flex-col gap-[16px]">
        {!chatOnly && (
          <div className="flex flex-col gap-[6px]">
            <div className="text-[13px] font-[600] text-customColor18">
              {t('auth_method', 'Authentication')}
            </div>
            <div className="flex gap-[6px]">
              {(['oauth', 'apikey'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={clsx(
                    'cursor-pointer px-[14px] h-[36px] text-[13px] font-[500] rounded-[8px] transition-colors',
                    auth === m
                      ? 'bg-[#612BD3] text-white'
                      : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
                  )}
                  onClick={() => setAuth(m)}
                >
                  {m === 'oauth'
                    ? t('sign_in_no_api_key', 'Sign in with Postiz (no API key)')
                    : t('api_key', 'API Key')}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-[6px]">
          <div className="text-[13px] font-[600] text-customColor18">
            {t('mcp_client', 'Client')}
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {[
              ...Object.keys(remoteMcpClients),
              ...mcpClients,
              ...Object.keys(chatOnlyMcpClients),
            ].map((client) => (
              <button
                key={client}
                type="button"
                className={clsx(
                  'cursor-pointer px-[14px] h-[36px] text-[13px] font-[500] rounded-[8px] transition-colors flex items-center gap-[8px]',
                  activeClient === client
                    ? 'bg-[#612BD3] text-white'
                    : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
                )}
                onClick={() =>
                  setActiveClient(client as AnyMcpClient)
                }
              >
                <McpClientIcon client={client} />
                {client}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="text-[12px] text-customColor18 font-[500]">
            {hint}
            {auth === 'oauth' &&
              !chatOnly &&
              ` ${t(
                'oauth_sign_in_hint',
                'Your agent will open a browser window to sign in to Postiz.'
              )}`}
          </div>
          <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[16px] text-[13px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.6]">
            {maskedConfig}
          </pre>
          <div className="flex gap-[8px]">
            {auth === 'apikey' && !chatOnly && (
              <button
                type="button"
                onClick={() => setRevealed(!revealed)}
                className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {revealed ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
                {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
              </button>
            )}
            <CopyButton text={config} label={t('copy', 'Copy')} />
            {!isRemoteMcpClient(activeClient) && !chatOnly && (
              <CopyButton text={baseUrl} label={t('copy_url', 'Copy URL')} />
            )}
            {activeClient === 'Claude' && billingEnabled && (
              <a
                className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
                href="https://claude.ai/directory/postiz"
                target="_blank"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                {t('add_to_claude', 'Add to Claude')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const localCliSteps = [
  {
    label: 'Install the CLI',
    code: 'npm install -g postiz',
  },
  {
    label: 'Run: postiz auth:login',
    code: 'postiz auth:login',
  },
  {
    label: 'Install the Postiz skill for your AI agent',
    code: 'npx skills add gitroomhq/postiz-agent',
  },
] as const;

const ciCliSteps = [
  {
    label: 'Install the CLI',
    code: 'npm install -g postiz',
  },
  {
    label: 'Set your API key as an environment variable',
    code: 'export POSTIZ_API_KEY="{API_KEY}"',
  },
  {
    label: 'Install the Postiz skill for your AI agent',
    code: 'npx skills add gitroomhq/postiz-agent',
  },
] as const;

const CliSection = ({ apiKey }: { apiKey: string }) => {
  const t = useT();
  const [mode, setMode] = useState<'local' | 'ci'>('local');
  const [revealed, setRevealed] = useState(false);

  const steps =
    mode === 'local'
      ? localCliSteps.map((step) => ({ ...step }))
      : ciCliSteps.map((step) => ({
          ...step,
          code: step.code.replace('{API_KEY}', apiKey),
        }));

  const displaySteps =
    mode === 'ci' && !revealed
      ? steps.map((step) => ({
          ...step,
          code: step.code.replace(
            new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            '*'.repeat(apiKey.length)
          ),
        }))
      : steps;

  return (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden">
      <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder flex items-start justify-between gap-[12px]">
        <div>
          <div className="text-[15px] font-[600]">
            {t('cli_and_skills', 'CLI & AI Skills')}
          </div>
          <div className="text-[13px] text-customColor18 mt-[2px]">
            {t(
              'cli_description',
              'Use the Postiz CLI to automate posting from your terminal, or install the skill to let your AI agent schedule posts for you.'
            )}
          </div>
        </div>
        <div className="flex gap-[6px] shrink-0 pt-[2px]">
          <a
            className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            href="https://docs.postiz.com/cli/introduction"
            target="_blank"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t('read_the_docs', 'Docs')}
          </a>
        </div>
      </div>
      <div className="p-[20px] flex flex-col gap-[16px]">
        <div className="flex gap-[6px]">
          {(['local', 'ci'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={clsx(
                'cursor-pointer px-[14px] h-[36px] text-[13px] font-[500] rounded-[8px] transition-colors',
                mode === m
                  ? 'bg-[#612BD3] text-white'
                  : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
              )}
              onClick={() => setMode(m)}
            >
              {m === 'local'
                ? t('locally', 'Locally')
                : t('ci_remote_servers', 'CI / Remote servers')}
            </button>
          ))}
        </div>
        {displaySteps.map((step, i) => (
          <div key={i} className="flex flex-col gap-[6px]">
            <div className="text-[13px] font-[600] text-customColor18">
              {i + 1}. {step.label}
            </div>
            <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[16px] text-[13px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.6]">
              {step.code}
            </pre>
          </div>
        ))}
        <div className="flex gap-[8px]">
          {mode === 'ci' && (
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {revealed ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
            </button>
          )}
          <CopyButton
            text={steps.map((s) => s.code).join(' && ')}
            label={t('copy_all', 'Copy All')}
          />
        </div>
      </div>
    </div>
  );
};

const PublicApiContent = () => {
  const user = useUser();
  const { backendUrl, frontEndUrl, mcpUrl } = useVariables();
  const toaster = useToaster();
  const fetch = useFetch();
  const decision = useDecisionModal();
  const { mutate } = useSWRConfig();
  const [reveal, setReveal] = useState(false);
  const t = useT();

  const rotateKey = useCallback(async () => {
    const approved = await decision.open({
      title: t('rotate_api_key', 'Rotate API Key?'),
      description: t(
        'rotate_api_key_description',
        'This will generate a new API key and invalidate the current one. Any integrations using the old key will stop working.'
      ),
      approveLabel: t('rotate', 'Rotate'),
      cancelLabel: t('cancel', 'Cancel'),
    });
    if (!approved) return;
    await fetch('/user/api-key/rotate', { method: 'POST' });
    await mutate('/user/self');
    setReveal(false);
    toaster.show(
      t('api_key_rotated', 'API Key rotated successfully'),
      'success'
    );
  }, [decision, fetch, mutate, toaster]);

  if (!user || !user.publicApi) {
    return null;
  }

  const mcpBase = mcpUrl || backendUrl;

  return (
    <div className="flex flex-col gap-[40px]">
      <div className="text-[14px] text-textColor leading-[1.7]">
        {t(
          'api_auth_note_line1',
          'Use your API Key to automate your own account.'
        )}
        <br />
        {t(
          'api_auth_note_line2',
          'If you are building a product that schedules posts on behalf of other Postiz users,'
        )}
        <br />
        {t(
          'api_auth_note_line3',
          'create an OAuth App under the "Apps" tab. Your users will authorize your app via OAuth2,'
        )}
        <br />
        {t(
          'api_auth_note_line4',
          'and you will receive a pos_ prefixed token that works with the API, MCP, and CLI — just like an API Key.'
        )}
      </div>
      <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden">
        <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder flex items-start justify-between gap-[12px]">
          <div>
            <div className="text-[15px] font-[600]">
              {t('api_key', 'API Key')}
            </div>
            <div className="text-[13px] text-customColor18 mt-[2px]">
              {t(
                'use_postiz_api_to_integrate_with_your_tools',
                'Use Postiz API to integrate with your tools.'
              )}
            </div>
          </div>
          <div className="flex gap-[6px] shrink-0 pt-[2px]">
            <a
              className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
              href="https://docs.postiz.com/public-api"
              target="_blank"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            {t('read_the_docs', 'Docs')}
            </a>
            <a
              className="cursor-pointer px-[16px] h-[36px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
              href="https://www.npmjs.com/package/n8n-nodes-postiz"
              target="_blank"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              {t('n8n_node', 'N8N Node')}
            </a>
          </div>
        </div>
        <div className="p-[20px] flex flex-col gap-[16px]">
          <div className="bg-newBgColorInner border border-newBorder rounded-[8px] px-[16px] h-[44px] flex items-center overflow-hidden">
            <code className="text-[14px] flex-1 truncate">
              {reveal ? (
                user.publicApi
              ) : (
                <span className="flex items-center">
                  <span className="blur-sm select-none">
                    {user.publicApi.slice(0, -5)}
                  </span>
                  <span>{user.publicApi.slice(-5)}</span>
                </span>
              )}
            </code>
          </div>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {reveal ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              {reveal ? t('hide', 'Hide') : t('reveal', 'Reveal')}
            </button>
            <CopyButton text={user.publicApi} label={t('copy', 'Copy')} />
            <button
              type="button"
              onClick={rotateKey}
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6" />
                <path d="M21.34 15.57a10 10 0 11-.57-8.38L21.5 8" />
              </svg>
              {t('rotate_key', 'Rotate Key')}
            </button>
            <button
              type="button"
              data-tooltip-id="tooltip"
              data-tooltip-content={t(
                'payload_wizard_description',
                'Building a POST request to /posts can be complex. Use the wizard to schedule a post with the UI, then copy the generated payload.'
              )}
              onClick={() =>
                window.open(`${frontEndUrl}/modal/dark/all`, '_blank')
              }
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {t('open_wizard', 'Open Wizard')}
            </button>
          </div>
        </div>
      </div>

      <CliSection apiKey={user.publicApi} />

      <McpSection user={user} mcpBase={mcpBase} />
    </div>
  );
};

export const PublicComponent = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const [subTab, setSubTab] = useState<'api' | 'developer'>('api');
  const loadOrganizations = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  const { data: organizations } = useSWR('organizations', loadOrganizations, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
  const currentOrg = useMemo(() => {
    return organizations?.find((org: any) => org?.id === user?.orgId);
  }, [organizations, user?.orgId]);

  return (
    <div className="flex flex-col gap-[20px]">
      <h3 className="text-[20px]">
        {t('developers', 'Developers')}
        {currentOrg?.name ? ` - ${currentOrg.name}` : ''}
      </h3>
      <div className="flex gap-[6px]">
        {(['api', 'developer'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={clsx(
              'cursor-pointer px-[20px] h-[44px] text-[15px] font-[600] rounded-[8px] transition-colors',
              subTab === tab
                ? 'bg-[#612BD3] text-white'
                : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
            )}
            onClick={() => setSubTab(tab)}
          >
            {tab === 'api'
              ? t('access', 'Access')
              : t('apps', 'Apps')}
          </button>
        ))}
      </div>
      {subTab === 'api' && <PublicApiContent />}
      {subTab === 'developer' && <DeveloperComponent />}
    </div>
  );
};
