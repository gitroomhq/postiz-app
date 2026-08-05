'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';
import { useUser } from '../layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useTourStepKey } from '@gitroom/frontend/components/onboarding/tour';
import { ApiKeyCard } from '@gitroom/frontend/components/public-api/api-key-card';

/**
 * Connections — how to drive PostQueen from somewhere else.
 *
 * The Developers tab answers "give me the config for the client I already
 * picked". This one starts from the thing you want to connect and walks to a
 * working setup.
 *
 * Every command is built from this install's own backend URL and API key, never
 * from a hardcoded host: a page of instructions that do not work is worse than
 * no page. Detail view shares the Reveal / Copy / Rotate key card with
 * Developers.
 *
 * The content here was checked against each product's own documentation, not
 * against the design — the design's command table invents `openclaw mcp add`
 * and `hermes tools add --mcp`, and neither product speaks MCP at all. Where a
 * third party owns the setup (the OpenClaw gateway, the n8n node) this
 * summarises and links out rather than copying their docs, which would go stale
 * without anybody noticing.
 */

type Kind = 'CHAT' | 'MCP' | 'SKILL' | 'FLOW' | 'API';

interface Step {
  title: string;
  detail?: string;
  code?: string;
}

interface Connection {
  id: string;
  name: string;
  glyph: string;
  tint: string;
  kind: Kind;
  short: string;
  intro: string;
  /** Example @PostQueen prompts in the gradient hero. */
  prompts?: string[];
  /** Optional blurb between the hero and the API key card. */
  info?: string;
  note?: string;
  /** Shown as a badge on the card and at the top of the detail. */
  soon?: boolean;
  link?: { label: string; href: string };
  steps: Step[];
}

interface Group {
  id: string;
  label: string;
  items: Connection[];
}

const KIND_STYLE: Record<Kind, string> = {
  CHAT: 'bg-pqBrandSoft text-pqFocused',
  MCP: 'bg-pqOkSoft text-pqOk',
  SKILL: 'bg-pqBrandFaint text-pqBrand',
  FLOW: 'bg-pqAmberSoft text-pqAmber',
  API: 'bg-pqBtnSimple text-pqSoft',
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
        className="absolute right-[8px] top-[8px] flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-pqSettings text-pqMuted transition-colors hover:bg-pqHover hover:text-pqText"
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

const PromptHero: FC<{ prompts: string[]; tint: string }> = ({
  prompts,
  tint,
}) => (
  <div
    className="flex flex-col items-end gap-[10px] rounded-[18px] p-[24px_20px] shadow-pqE2"
    style={{
      backgroundImage: `linear-gradient(135deg, ${tint} 0%, var(--brand) 55%, var(--focused) 100%)`,
    }}
  >
    {prompts.map((prompt) => (
      <div
        key={prompt}
        className="flex max-w-[86%] items-center gap-[11px] rounded-[999px] bg-[rgba(255,255,255,0.82)] px-[15px] py-[11px] shadow-[0_2px_12px_rgba(9,9,11,0.1)]"
      >
        <span className="min-w-0 flex-1 text-[13.5px] leading-[1.45] text-[#18181b]">
          <span className="font-[700]">@PostQueen</span> {prompt}
        </span>
        <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[999px] bg-white text-[#18181b] shadow-[0_1px_4px_rgba(9,9,11,0.16)]">
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

/**
 * The route-level wrapper for /connections. It carries the gate the settings
 * tab used to hold — API access is an admin capability on plans that have it —
 * so moving the screen out of Settings could not quietly open it up.
 */
export const ConnectionsPage: FC = () => {
  const t = useT();
  const user = useUser();
  const { isGeneral } = useVariables();
  const isOrgAdmin = ['ADMIN', 'SUPERADMIN'].includes(user?.role!);
  if (!user?.tier?.public_api || !isGeneral || !isOrgAdmin) {
    return (
      <div className="flex-1 overflow-y-auto bg-pqInner p-[24px_28px_56px]">
        <div className="mx-auto w-full max-w-[900px] rounded-pqMd border border-pqBorder bg-pqInner p-[24px] text-center text-[13px] text-pqMuted">
          {t('connections_admin_only', 'Connections is available to workspace admins on plans with API access.')}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto bg-pqInner p-[24px_28px_56px]">
      <div className="mx-auto w-full max-w-[900px]">
        <ConnectionsComponent />
      </div>
    </div>
  );
};

export const ConnectionsComponent: FC = () => {
  const t = useT();
  const user = useUser();
  const { backendUrl } = useVariables();
  const tourKey = useTourStepKey();
  const tourConn = tourKey === 'connections-page';
  const [picked, setPicked] = useState('');
  const [search, setSearch] = useState('');
  const [keyRevealed, setKeyRevealed] = useState(false);

  const apiKey = (user as any)?.publicApi || '';
  const mcpUrl = `${backendUrl}/mcp`;
  const mcpUrlWithKey = `${backendUrl}/mcp/${apiKey}`;

  const maskCode = useCallback(
    (text: string) =>
      keyRevealed || !apiKey
        ? text
        : text.split(apiKey).join('*'.repeat(Math.min(apiKey.length, 24))),
    [apiKey, keyRevealed]
  );

  const groups = useMemo<Group[]>(() => {
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

    const mcpSteps = (verify: string, verifyCode?: string): Step[] => [
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

    return [
      {
        id: 'assistants',
        label: t('conn_group_assistants', 'Assistants'),
        items: [
          {
            id: 'claude',
            name: 'Claude',
            glyph: 'C',
            tint: '#d97757',
            kind: 'CHAT',
            short: t(
              'conn_claude_short',
              'Draft, schedule and publish from a Claude conversation.'
            ),
            intro: t(
              'conn_claude_intro',
              'Add PostQueen as a connector and Claude can read your calendar, draft posts and schedule them without you leaving the chat.'
            ),
            prompts: [
              t(
                'conn_claude_prompt_1',
                'Draft a launch thread for v3.2 and schedule it for Tuesday 09:00'
              ),
              t('conn_claude_prompt_2', 'What is in my queue this week?'),
              t(
                'conn_claude_prompt_3',
                'Turn this changelog into five posts across X and LinkedIn'
              ),
            ],
            info: t(
              'conn_claude_note',
              'For Claude Code in a terminal, the Agent Skills route below is usually better — it loads context on demand instead of the whole schema up front.'
            ),
            steps: [
              {
                title: t(
                  'conn_claude_step_settings',
                  'Open connector settings'
                ),
                detail: t(
                  'conn_claude_step_settings_detail',
                  'Claude → Settings → Connectors → Add custom connector.'
                ),
              },
              ...mcpSteps(
                t(
                  'conn_claude_verify',
                  'Ask Claude to list your connected channels. It should name every one.'
                )
              ),
            ],
          },
          {
            id: 'chatgpt',
            name: 'ChatGPT',
            glyph: 'G',
            tint: '#10a37f',
            kind: 'CHAT',
            short: t(
              'conn_chatgpt_short',
              'Manage your content from ChatGPT with a custom connector.'
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
              ...mcpSteps(
                t(
                  'conn_chatgpt_verify',
                  'Ask ChatGPT for your PostQueen account details.'
                )
              ),
            ],
          },
          {
            id: 'gemini',
            name: 'Gemini',
            glyph: 'Gm',
            tint: '#4285f4',
            kind: 'CHAT',
            short: t(
              'conn_gemini_short',
              'Connect Gemini CLI to your PostQueen workspace.'
            ),
            intro: t(
              'conn_gemini_intro',
              'Gemini CLI reads MCP servers from its settings file.'
            ),
            prompts: defaultPrompts,
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
        id: 'coding',
        label: t('conn_group_coding', 'Coding agents'),
        items: [
          {
            id: 'claude-code',
            name: 'Claude Code',
            glyph: 'CC',
            tint: '#d97757',
            kind: 'MCP',
            short: t(
              'conn_cc_short',
              'Register PostQueen with Claude Code in one command.'
            ),
            intro: t(
              'conn_cc_intro',
              'Claude Code can take PostQueen either as an MCP server or as an Agent Skill. MCP is one command; skills load less context per call.'
            ),
            prompts: defaultPrompts,
            steps: [
              {
                title: t('conn_cc_step_add', 'Register the server'),
                detail: t('conn_step_terminal', 'Run this in your terminal.'),
                code: `claude mcp add --transport http postqueen ${mcpUrl} --header "Authorization: Bearer ${apiKey}"`,
              },
              {
                title: t('conn_step_verify', 'Check it worked'),
                code: 'claude mcp list',
              },
            ],
          },
          {
            id: 'editors',
            name: t(
              'conn_editors_name',
              'Cursor, VS Code, Windsurf, Warp, Amp'
            ),
            glyph: 'ED',
            tint: '#6366f1',
            kind: 'MCP',
            short: t(
              'conn_editors_short',
              'Every MCP-capable editor takes the same server.'
            ),
            intro: t(
              'conn_editors_intro',
              'These all read an MCP config file. Developers → Access generates the exact snippet for each one, including the file it belongs in.'
            ),
            prompts: defaultPrompts,
            steps: [
              {
                title: t(
                  'conn_editors_step_url',
                  'Point your editor at the server'
                ),
                detail: t(
                  'conn_editors_step_url_detail',
                  'Most take a URL plus an Authorization header.'
                ),
                code: mcpUrl,
              },
              {
                title: t('conn_editors_step_auth', 'Authenticate'),
                detail: t(
                  'conn_editors_step_auth_detail',
                  'Send the key as a bearer token, or use the URL that carries it if your editor cannot set headers.'
                ),
                code: `Authorization: Bearer ${apiKey}`,
              },
            ],
          },
          {
            id: 'openclaw',
            name: 'OpenClaw',
            glyph: 'OC',
            tint: '#ef5b25',
            kind: 'SKILL',
            short: t(
              'conn_openclaw_short',
              'A personal agent that can post for you — from your terminal or your phone.'
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
              'The same install also powers the chat bridge below: once OpenClaw has this skill, anything that can reach your agent can publish through it. Keep a human in the loop before anything goes out.'
            ),
            link: {
              label: t('conn_openclaw_link', 'OpenClaw documentation'),
              href: 'https://docs.openclaw.ai/',
            },
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
            tint: '#3b82f6',
            kind: 'SKILL',
            short: t(
              'conn_hermes_short',
              'Register PostQueen as a Hermes tool provider.'
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
          {
            id: 'codex',
            name: 'Codex',
            glyph: 'Cx',
            tint: '#1f2937',
            kind: 'SKILL',
            short: t(
              'conn_codex_short',
              'Post from your terminal through Codex.'
            ),
            intro: t(
              'conn_codex_intro',
              'Codex discovers PostQueen from the skill definition and runs its commands in a sandbox.'
            ),
            prompts: defaultPrompts,
            steps: [
              ...skillInstall,
              {
                title: t('conn_step_verify', 'Check it worked'),
                code: 'codex "list my social media integrations"',
              },
            ],
          },
        ],
      },
      {
        id: 'chat',
        label: t('conn_group_chat', 'Chat with your agent'),
        items: [
          {
            id: 'chat-bridge',
            name: t('conn_bridge_name', 'WhatsApp, Slack, Discord, Telegram'),
            glyph: 'WA',
            tint: '#25d366',
            kind: 'CHAT',
            short: t(
              'conn_bridge_short',
              'Message an agent from your phone and it posts for you.'
            ),
            intro: t(
              'conn_bridge_intro',
              'OpenClaw runs a gateway on your own machine or server that connects chat apps to an AI agent. Give that agent the PostQueen skill and you can schedule a post by sending a message — from WhatsApp, Slack, Discord, Telegram, Signal and around two dozen others.'
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
            link: {
              label: t('conn_bridge_link', 'OpenClaw chat channels'),
              href: 'https://docs.openclaw.ai/channels',
            },
            steps: [
              {
                title: t(
                  'conn_bridge_step_gateway',
                  'Run the OpenClaw gateway'
                ),
                detail: t(
                  'conn_bridge_step_gateway_detail',
                  "Follow OpenClaw's own setup, then connect the chat apps you want from its channels list."
                ),
              },
              ...skillInstall,
              {
                title: t('conn_bridge_step_try', 'Send it a message'),
                detail: t(
                  'conn_bridge_step_try_detail',
                  'From any connected chat app, in your own words.'
                ),
                code: t(
                  'conn_bridge_example',
                  'Schedule this to LinkedIn and X tomorrow at 9am: …'
                ),
              },
            ],
          },
        ],
      },
      {
        id: 'automation',
        label: t('conn_group_automation', 'Automation'),
        items: [
          {
            id: 'n8n',
            name: 'n8n',
            glyph: 'n8',
            tint: '#ea4f6d',
            kind: 'FLOW',
            short: t(
              'conn_n8n_short',
              'Publish from a workflow, or start one when a post goes out.'
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
            tint: '#ff4f00',
            kind: 'FLOW',
            soon: true,
            short: t(
              'conn_zapier_short',
              'Connect 7,000+ apps through the API and webhooks.'
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
            name: 'Make.com',
            glyph: 'Mk',
            tint: '#6d00cc',
            kind: 'FLOW',
            soon: true,
            short: t(
              'conn_make_short',
              'Build scenarios around your publishing.'
            ),
            intro: t(
              'conn_make_intro',
              "No PostQueen module yet. Make's HTTP and Webhooks modules cover the same ground."
            ),
            prompts: defaultPrompts,
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
        ],
      },
      {
        id: 'developer',
        label: t('conn_group_developer', 'Build on PostQueen'),
        items: [
          {
            id: 'api',
            name: t('conn_api_name', 'Public API'),
            glyph: 'API',
            tint: '#0ea5e9',
            kind: 'API',
            short: t(
              'conn_api_short',
              'A REST API for channels, posts, media and analytics.'
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
            id: 'cli',
            name: t('conn_cli_name', 'Command line'),
            glyph: 'CLI',
            tint: '#334155',
            kind: 'API',
            short: t(
              'conn_cli_short',
              'Drive PostQueen from a terminal or a CI job.'
            ),
            intro: t(
              'conn_cli_intro',
              'The CLI prints JSON, so anything that can run a shell command can run your publishing.'
            ),
            prompts: defaultPrompts,
            steps: [
              {
                title: t('conn_cli_step_install', 'Install it'),
                code: 'npm install -g postqueen',
              },
              {
                title: t('conn_cli_step_login', 'Sign in'),
                detail: t(
                  'conn_cli_step_login_detail',
                  'Interactively, or set POSTQUEEN_API_KEY in CI.'
                ),
                code: 'postqueen auth:login',
              },
              {
                title: t('conn_cli_step_try', 'Try it'),
                code: 'postqueen integrations:list',
              },
            ],
          },
          {
            id: 'sdk',
            name: t('conn_sdk_name', 'Node SDK'),
            glyph: 'JS',
            tint: '#f7df1e',
            kind: 'API',
            short: t('conn_sdk_short', 'A typed client for Node applications.'),
            intro: t(
              'conn_sdk_intro',
              'A thin wrapper over the public API with types for the request and response shapes.'
            ),
            prompts: defaultPrompts,
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
            id: 'webhooks',
            name: t('conn_webhooks_name', 'Webhooks'),
            glyph: 'WH',
            tint: '#8b5cf6',
            kind: 'API',
            short: t('conn_webhooks_short', 'Get told when a post publishes.'),
            intro: t(
              'conn_webhooks_intro',
              'PostQueen POSTs the published post as JSON to any URL you register. A webhook can watch every channel or just the ones you pick.'
            ),
            prompts: defaultPrompts,
            note: t(
              'conn_webhooks_note',
              'Requests are not signed, so treat the URL itself as the secret — give each destination its own, and do not act on a payload you cannot otherwise verify.'
            ),
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
            id: 'oauth',
            name: t('conn_oauth_name', 'OAuth apps'),
            glyph: 'OA',
            tint: '#14b8a6',
            kind: 'API',
            short: t(
              'conn_oauth_short',
              'Publish on behalf of other PostQueen accounts.'
            ),
            intro: t(
              'conn_oauth_intro',
              'If you are building a product rather than automating your own account, register an OAuth app. Your users authorise it and you receive a token that works with the API, MCP and the CLI — no key sharing.'
            ),
            prompts: defaultPrompts,
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
    ];
  }, [t, apiKey, mcpUrl, mcpUrlWithKey, backendUrl]);

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          `${item.name} ${item.short}`.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length);
  }, [groups, search]);

  if (active) {
    const prompts = active.prompts ?? fallbackPrompts;

    return (
      <div className="flex flex-col gap-[24px]">
        <button
          type="button"
          onClick={() => {
            setPicked('');
            setKeyRevealed(false);
          }}
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
          {t('conn_all', 'All connections')}
        </button>

        <div className="flex flex-wrap items-center gap-[16px]">
          <span
            style={{ backgroundColor: active.tint }}
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-pqLg text-[17px] font-[700] text-pqOnBrand shadow-pqE1"
          >
            {active.glyph}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[8px]">
              <h2 className="text-[23px] font-[600] -tracking-[0.02em]">
                {active.name}
              </h2>
              {active.soon && (
                <span className="rounded-[5px] bg-pqAmberSoft px-[6px] py-[2px] text-[9.5px] font-[700] tracking-[0.06em] text-pqAmber">
                  {t('conn_soon', 'OFFICIAL APP SOON')}
                </span>
              )}
            </div>
            <div className="mt-[3px] text-[13.5px] leading-[1.5] text-pqMuted">
              {active.intro}
            </div>
          </div>
        </div>

        <PromptHero prompts={prompts} tint={active.tint} />

        {!!active.info && (
          <div className="text-[14px] leading-[1.7] text-pqMuted">
            {active.info}
          </div>
        )}

        <ApiKeyCard
          showWizard={false}
          showDocs={false}
          hint={t(
            'conn_api_key_hint',
            'Use this key when the connector asks for credentials — the same key works for every integration here.'
          )}
          onRevealChange={setKeyRevealed}
        />

        <div className="flex flex-col gap-[16px] rounded-[18px] bg-pqInner p-[22px] shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="text-[15px] font-[600]">
            {t('conn_how_to_connect', 'How to connect')}
          </div>
          {active.steps.map((step, index) => (
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
                    label={active.name}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {!!active.note && (
          <div className="rounded-pqSm bg-pqBrandFaint p-[12px] text-[12.5px] leading-[1.55] text-pqMuted">
            {active.note}
          </div>
        )}

        {!!active.link && (
          <a
            href={active.link.href}
            target="_blank"
            rel="noreferrer"
            className="w-fit text-[12.5px] font-[600] text-pqBrand hover:underline"
          >
            {active.link.label} →
          </a>
        )}
      </div>
    );
  }

  let connCardI = 0;

  return (
    <div
      data-tour="connections-page"
      {...(tourConn ? { 'data-tourconn': '1' } : {})}
      className="flex flex-col gap-[20px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-[12px]">
        <div>
          <h2 className="text-[27px] font-[600] -tracking-[0.02em]">
            {t('connections', 'Connections')}
          </h2>
          <div className="mt-[2px] text-[14px] text-pqMuted">
            {t(
              'connections_sub',
              'Work with PostQueen across your favorite tools.'
            )}
          </div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('conn_search', 'Search connections')}
          className="h-[38px] w-[220px] rounded-[999px] border-0 bg-pqSettings px-[14px] text-[13.5px] text-pqText outline-none"
        />
      </div>

      <div className="flex flex-col gap-[20px]">
      {filtered.map((group) => (
        <div key={group.id} className="flex flex-col gap-[10px]">
          <div className="flex items-baseline gap-[8px]">
            <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-pqSoft">
              {group.label}
            </span>
            <span className="text-[11px] font-[600] text-pqSoft opacity-70">
              {group.items.length}
            </span>
            <span className="h-[1px] flex-1 bg-pqLine" />
          </div>
          <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fill,minmax(330px,1fr))]">
            {group.items.map((item) => {
              const delay = (connCardI++ % 14) * 0.38;
              return (
              <button
                key={item.id}
                type="button"
                data-connector={item.id}
                data-conn-card="1"
                onClick={() => setPicked(item.id)}
                style={
                  tourConn
                    ? { animationDelay: `${delay}s` }
                    : undefined
                }
                className="flex min-h-[76px] items-start gap-[13px] rounded-pqLg bg-pqInner p-[12px] text-start shadow-[inset_0_0_0_1px_var(--border)] outline outline-1 outline-pqBorder transition-colors hover:bg-pqHover hover:shadow-[inset_0_0_0_1px_var(--brand)]"
              >
                <span
                  style={{ backgroundColor: item.tint }}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-pqMd text-[13px] font-[700] text-pqOnBrand shadow-pqE1"
                >
                  {item.glyph}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                  <span className="flex min-w-0 items-center gap-[7px]">
                    <span className="truncate text-[14.5px] font-[600] -tracking-[0.01em]">
                      {item.name}
                    </span>
                    {(item.soon || item.kind !== 'FLOW') && (
                      <span
                        className={clsx(
                          'shrink-0 rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-[700] tracking-[0.06em]',
                          KIND_STYLE[item.kind]
                        )}
                      >
                        {item.soon
                          ? t('conn_soon_short', 'SOON')
                          : item.kind}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[12.5px] leading-[1.45] text-pqMuted">
                    {item.short}
                  </span>
                </span>
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center self-center rounded-full bg-pqSettings text-pqText">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path
                      d="m10 7 5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              );
            })}
          </div>
        </div>
      ))}

      {!filtered.length && (
        <div className="rounded-pqMd border border-pqBorder bg-pqInner p-[24px] text-center text-[13px] text-pqMuted">
          {t('conn_no_results', 'Nothing matches that.')}
        </div>
      )}
      </div>
    </div>
  );
};
