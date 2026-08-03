'use client';

import { FC, useMemo, useState } from 'react';
import copy from 'copy-to-clipboard';
import clsx from 'clsx';
import { useUser } from '../layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

/**
 * Connections — the design's page for "how do I drive PostQueen from something
 * else". It answers a question the Developers tab only half answered: that tab
 * hands you an MCP config for a client you have already chosen, this one starts
 * from the thing you want to connect and walks you to a working setup.
 *
 * Every command is built from this install's own MCP base and API key, never
 * from the design's placeholder host — a page of instructions that do not work
 * is worse than no page. The key is masked until asked for, the same way the
 * Developers tab masks it.
 */

interface Step {
  title: string;
  detail?: string;
  code?: string;
}

interface Connector {
  id: string;
  title: string;
  description: string;
  intro: string;
  hint: string;
  /** Single-path icon, lifted from the design. */
  icon: string;
  steps: Step[];
}

const CopyRow: FC<{ code: string; label: string }> = ({ code, label }) => {
  const toaster = useToaster();
  const t = useT();
  return (
    <div className="mt-[8px] flex items-start gap-[8px]">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-pqSm border border-pqBorder bg-pqInner p-[12px] font-mono text-[12.5px] leading-[1.6]">
        {code}
      </pre>
      <button
        type="button"
        onClick={() => {
          copy(code);
          toaster.show(`${label} copied to clipboard`, 'success');
        }}
        className="shrink-0 rounded-pqSm bg-pqBtnSimple px-[12px] py-[8px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
      >
        {t('copy', 'Copy')}
      </button>
    </div>
  );
};

export const ConnectionsComponent: FC = () => {
  const t = useT();
  const user = useUser();
  const { backendUrl } = useVariables();
  const [open, setOpen] = useState<string>('claude');
  const [revealed, setRevealed] = useState(false);

  const apiKey = (user as any)?.publicApi || '';
  const mcpUrl = `${backendUrl}/mcp`;
  const mcpUrlWithKey = `${backendUrl}/mcp/${apiKey}`;

  /** What goes on screen: the real key only once it has been asked for. */
  const shown = (text: string) =>
    revealed || !apiKey
      ? text
      : text.split(apiKey).join('*'.repeat(Math.min(apiKey.length, 24)));

  const connectors = useMemo<Connector[]>(
    () => [
      {
        id: 'claude',
        icon: 'M12 3.2v17.6M4.4 7.6l15.2 8.8M19.6 7.6 4.4 16.4',
        /* prettier-ignore */ title: t('conn_claude_title', 'Claude'),
        /* prettier-ignore */ description: t('conn_claude_desc', 'Draft, schedule and publish from a Claude conversation or Claude Code.'),
        /* prettier-ignore */ intro: t('conn_claude_intro', 'Connect PostQueen to Claude so it can create drafts, schedule posts and read your calendar directly from a conversation.'),
        /* prettier-ignore */ hint: t('conn_claude_hint', 'For coding agents like Claude Code or Cursor, Agent Skills load context on demand and usually work better than MCP.'),
        steps: [
          {
            /* prettier-ignore */ title: t('conn_step_key', 'Use your API key'),
            /* prettier-ignore */ detail: t('conn_step_key_detail', 'The key below is the one from Developers → Access. Rotate it there if you need a fresh one.'),
          },
          {
            /* prettier-ignore */ title: t('conn_claude_step_add', 'Register the server'),
            /* prettier-ignore */ detail: t('conn_claude_step_add_detail', 'Run this in your terminal.'),
            code: `claude mcp add --transport http postqueen ${mcpUrl} --header "Authorization: Bearer ${apiKey}"`,
          },
          {
            /* prettier-ignore */ title: t('conn_step_verify', 'Check it worked'),
            /* prettier-ignore */ detail: t('conn_claude_step_verify_detail', 'Ask Claude to list your connected channels — it should return all of them.'),
            code: 'claude mcp list',
          },
        ],
      },
      {
        id: 'chatgpt',
        icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5v9M7.5 12h9',
        /* prettier-ignore */ title: t('conn_chatgpt_title', 'ChatGPT'),
        /* prettier-ignore */ description: t('conn_chatgpt_desc', 'Manage your content from ChatGPT with a custom connector.'),
        /* prettier-ignore */ intro: t('conn_chatgpt_intro', 'Add PostQueen as a connector in ChatGPT so it can draft and schedule posts for any of your channels.'),
        /* prettier-ignore */ hint: t('conn_chatgpt_hint', 'Connectors require a ChatGPT Plus, Pro or Business plan.'),
        steps: [
          {
            /* prettier-ignore */ title: t('conn_chatgpt_step_add', 'Add the connector'),
            /* prettier-ignore */ detail: t('conn_chatgpt_step_add_detail', 'Settings → Connectors → Add, then paste this server URL.'),
            code: mcpUrlWithKey,
          },
          {
            /* prettier-ignore */ title: t('conn_step_verify', 'Check it worked'),
            /* prettier-ignore */ detail: t('conn_chatgpt_step_verify_detail', 'Ask ChatGPT for your PostQueen account details.'),
          },
        ],
      },
      {
        id: 'mcp',
        icon: 'M4 8.5 12 4l8 4.5-8 4.5-8-4.5ZM4 15.5 12 20l8-4.5',
        /* prettier-ignore */ title: t('conn_mcp_title', 'MCP clients'),
        /* prettier-ignore */ description: t('conn_mcp_desc', 'Cursor, VS Code, Windsurf, OpenClaw, Hermes, Codex, Warp and any other Model Context Protocol client.'),
        /* prettier-ignore */ intro: t('conn_mcp_intro', 'PostQueen ships a Model Context Protocol server over streamable HTTP, so any MCP-capable client can drive it.'),
        /* prettier-ignore */ hint: t('conn_mcp_hint', 'Developers → Access has a ready-made config for each client, including the file it belongs in.'),
        steps: [
          {
            /* prettier-ignore */ title: t('conn_mcp_step_url', 'Point your client at the server'),
            /* prettier-ignore */ detail: t('conn_mcp_step_url_detail', 'Most clients take a URL and an Authorization header.'),
            code: mcpUrl,
          },
          {
            /* prettier-ignore */ title: t('conn_mcp_step_auth', 'Authenticate'),
            /* prettier-ignore */ detail: t('conn_mcp_step_auth_detail', 'Send the key as a bearer token, or use the URL that carries it if your client cannot set headers.'),
            code: `Authorization: Bearer ${apiKey}`,
          },
        ],
      },
      {
        id: 'skills',
        icon: 'M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z',
        /* prettier-ignore */ title: t('conn_skills_title', 'Agent Skills'),
        /* prettier-ignore */ description: t('conn_skills_desc', 'Extend Claude Code, Cursor, OpenClaw and Codex with the PostQueen skill.'),
        /* prettier-ignore */ intro: t('conn_skills_intro', 'Skills teach a coding agent how to use PostQueen without loading a whole MCP schema up front. Install once per machine.'),
        /* prettier-ignore */ hint: t('conn_skills_hint', 'Skills work locally and in CI. In CI, pass the key as an environment variable rather than a flag.'),
        steps: [
          {
            /* prettier-ignore */ title: t('conn_skills_step_cli', 'Install the CLI'),
            code: 'npm install -g postqueen',
          },
          {
            /* prettier-ignore */ title: t('conn_skills_step_login', 'Authenticate'),
            code: 'postqueen auth:login',
          },
          {
            /* prettier-ignore */ title: t('conn_skills_step_install', 'Install the skill'),
            code: 'npx skills add GkhanKINAY/postqueen-agent',
          },
        ],
      },
      {
        id: 'n8n',
        icon: 'M6 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.5 6h4.2a2.5 2.5 0 0 1 2.4 1.8M8.5 18h4.2a2.5 2.5 0 0 0 2.4-1.8',
        /* prettier-ignore */ title: t('conn_n8n_title', 'n8n'),
        /* prettier-ignore */ description: t('conn_n8n_desc', 'Trigger workflows when posts publish, or publish from any n8n flow.'),
        /* prettier-ignore */ intro: t('conn_n8n_intro', 'Use the PostQueen node inside n8n to publish from a workflow, and webhooks to trigger flows when something happens here.'),
        /* prettier-ignore */ hint: t('conn_n8n_hint', 'Self-hosted n8n needs the community node installed before the credential appears.'),
        steps: [
          {
            /* prettier-ignore */ title: t('conn_n8n_step_node', 'Install the node'),
            code: 'n8n-nodes-postqueen',
          },
          {
            /* prettier-ignore */ title: t('conn_n8n_step_cred', 'Add the credential'),
            /* prettier-ignore */ detail: t('conn_n8n_step_cred_detail', 'Create a PostQueen credential in n8n and paste your API key into it.'),
          },
          {
            /* prettier-ignore */ title: t('conn_n8n_step_trigger', 'Pick a trigger'),
            /* prettier-ignore */ detail: t('conn_n8n_step_trigger_detail', 'Webhooks fire on publish and on failure — set them up under Settings → Webhooks.'),
          },
        ],
      },
    ],
    [t, mcpUrl, mcpUrlWithKey, apiKey]
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <div className="text-[15px] font-[600]">
            {t('connections', 'Connections')}
          </div>
          <div className="mt-[2px] text-[13px] text-pqMuted">
            {/* prettier-ignore */}
            {t('connections_sub', 'Claude, ChatGPT, MCP clients, agent skills and n8n all authenticate with the same key.')}
          </div>
        </div>
        {!!apiKey && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 rounded-pqSm bg-pqBtnSimple px-[12px] py-[8px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
          >
            {revealed ? t('hide_key', 'Hide key') : t('reveal_key', 'Reveal key')}
          </button>
        )}
      </div>

      {connectors.map((connector) => {
        const isOpen = open === connector.id;
        return (
          <div
            key={connector.id}
            data-connector={connector.id}
            className="overflow-hidden rounded-pqMd border border-pqBorder bg-pqInner"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? '' : connector.id)}
              className="flex w-full items-center gap-[12px] p-[16px] text-start transition-colors hover:bg-pqHover"
            >
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-pqSm bg-pqBrandSoft text-pqBrand">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d={connector.icon}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-[600]">
                  {connector.title}
                </span>
                <span className="block text-[12.5px] text-pqMuted">
                  {connector.description}
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                aria-hidden="true"
                className={clsx(
                  'shrink-0 text-pqMuted transition-transform',
                  isOpen && 'rotate-180'
                )}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-pqBorder p-[16px]">
                <p className="text-[13px] leading-[1.6] text-pqMuted">
                  {connector.intro}
                </p>
                <ol className="mt-[14px] flex flex-col gap-[14px]">
                  {connector.steps.map((step, index) => (
                    <li key={step.title} className="flex gap-[12px]">
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-pqBrandSoft text-[11px] font-[700] text-pqBrand">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-[600]">
                          {step.title}
                        </div>
                        {!!step.detail && (
                          <div className="mt-[2px] text-[12.5px] text-pqMuted">
                            {step.detail}
                          </div>
                        )}
                        {!!step.code && (
                          <CopyRow
                            code={shown(step.code)}
                            label={connector.title}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-[14px] rounded-pqSm bg-pqBrandFaint p-[12px] text-[12.5px] text-pqMuted">
                  {connector.hint}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
