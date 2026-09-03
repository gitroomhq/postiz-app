'use client';

import React, { FC, Fragment, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { orderBy } from 'lodash';
import clsx from 'clsx';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import {
  CopyButton,
  getMcpConfig,
  getMcpOauthUrl,
  isChatOnlyMcpClient,
  localCliSteps,
  McpAuth,
} from '@gitroom/frontend/components/public-api/public.component';
import { McpClientIcon } from '@gitroom/frontend/components/public-api/mcp.client.icons';

interface OnboardingModalProps {
  onClose: () => void;
}

export const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const modals = useModals();
  const t = useT();

  const steps = useMemo(
    () => [
      t('connect_channels', 'Connect Channels'),
      t('connect_agents', 'Connect Agents'),
      t('watch_tutorial', 'Watch Tutorial'),
    ],
    [t]
  );

  return (
    <div className="w-full min-h-full flex-1 p-[24px] flex relative">
      <style>{`#support-discord {display: none}`}</style>
      <div className="flex flex-1 bg-newBgColorInner rounded-[20px] flex-col relative">
        <button
          className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
          type="button"
          onClick={modals.closeAll}
        >
          <svg
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
          >
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
        <div className="flex-1 flex p-[32px]">
          <div className="flex flex-col gap-[24px] flex-1">
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-[16px]">
              {steps.map((label, index) => (
                <Fragment key={label}>
                  {index > 0 && (
                    <div className="w-[40px] h-[2px] bg-boxFocused" />
                  )}
                  <div className="flex items-center gap-[8px]">
                    <div
                      className={clsx(
                        'w-[32px] h-[32px] rounded-full flex items-center justify-center text-[14px] font-semibold transition-colors',
                        step === index + 1
                          ? 'bg-boxFocused text-textItemFocused'
                          : 'bg-newTableHeader'
                      )}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={clsx(
                        'text-[14px]',
                        step === index + 1 ? 'font-medium' : 'text-textColor'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>

            {/* Step content */}
            {step === 1 && (
              <OnboardingStep1
                onNext={() => setStep(2)}
                onSkip={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <OnboardingStep2
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <OnboardingStep3 onBack={() => setStep(2)} onFinish={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OnboardingStep1: FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  const fetch = useFetch();
  const t = useT();

  const getIntegrations = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, []);

  const load = useCallback(async (path: string) => {
    const list = (await (await fetch(path)).json()).integrations;
    return list;
  }, []);

  const { data: integrations } = useSWR('/integrations/list', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    fallbackData: [],
  });

  const sortedIntegrations = useMemo(() => {
    return orderBy(
      integrations,
      ['type', 'disabled', 'identifier'],
      ['desc', 'asc', 'asc']
    );
  }, [integrations]);

  const { data } = useSWR('get-all-integrations-onboarding', getIntegrations);

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex gap-[4px] flex-col text-center">
        <div className="text-[24px] font-semibold">
          {t('connect_your_channels', 'Connect Your Channels')}
        </div>
        <div className="text-[14px] text-customColor18">
          {t(
            'connect_social_media_to_start',
            'Connect your social media accounts to start scheduling posts'
          )}
        </div>
      </div>

      {/* Connected channels */}
      {sortedIntegrations.length > 0 && (
        <div className="bg-newTableHeader rounded-[8px] p-[16px]">
          <div className="text-[14px] font-medium mb-[12px]">
            {t('connected_channels', 'Connected Channels')} (
            {sortedIntegrations.length})
          </div>
          <div className="flex flex-wrap gap-[12px]">
            {sortedIntegrations.map((integration: any) => (
              <div
                key={integration.id}
                className="flex items-center gap-[8px] bg-customColor47/30 rounded-[8px] px-[12px] py-[8px]"
              >
                <div className="relative w-[28px] h-[28px]">
                  <SafeImage
                    src={integration.picture}
                    className="rounded-full"
                    alt={integration.identifier}
                    width={28}
                    height={28}
                  />
                  <SafeImage
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="rounded-full absolute -bottom-[3px] -end-[3px] border border-fifth"
                    alt={integration.identifier}
                    width={14}
                    height={14}
                  />
                </div>
                <span className="text-[13px]">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available platforms - using AddProviderComponent */}
      <div className="flex flex-col gap-[12px]">
        <div className="text-[14px] font-medium">
          {t('click_channel_to_add', 'Click a channel to add it')}
        </div>
        {data && (
          <AddProviderComponent
            invite={false}
            social={data.social || []}
            article={data.article || []}
            onboarding={true}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end pt-[24px] mt-[8px]">
        <button
          onClick={onNext}
          className="group flex items-center gap-[12px] bg-gradient-to-r from-[#622aff] to-[#8b5cf6] hover:from-[#7c3aff] hover:to-[#9d6eff] text-white font-semibold px-[32px] py-[14px] rounded-[12px] text-[16px] transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
        >
          {sortedIntegrations.length > 0
            ? t('continue', 'Continue')
            : t('continue_without_channels', 'Continue without channels')}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:translate-x-1 transition-transform"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const onboardingAgents = [
  'Claude',
  'ChatGPT',
  'Claude Code',
  'Cursor',
  'Codex',
  'Grok Bot',
] as const;

type OnboardingAgent = (typeof onboardingAgents)[number];

// Not an agent, a tab showing the raw API key for people integrating by hand
const apiTab = 'API' as const;
type OnboardingTab = OnboardingAgent | typeof apiTab;

const cliCommands = localCliSteps.map((step) => step.code);

// Cursor one-click install: https://cursor.com/docs/mcp/install-links
const getCursorInstallUrl = (
  auth: McpAuth,
  mcpBase: string,
  apiKey: string
) => {
  const server =
    auth === 'oauth'
      ? { url: getMcpOauthUrl(mcpBase) }
      : {
          url: `${mcpBase}/mcp`,
          headers: { Authorization: `Bearer ${apiKey}` },
        };
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=postiz&config=${btoa(
    JSON.stringify(server)
  )}`;
};

const OnboardingStep2: FC<{ onBack: () => void; onNext: () => void }> = ({
  onBack,
  onNext,
}) => {
  const t = useT();
  const user = useUser();
  const { backendUrl, mcpUrl, billingEnabled } = useVariables();
  const [agent, setAgent] = useState<OnboardingTab>('Claude');
  const [auth, setAuth] = useState<McpAuth>('oauth');
  const [revealed, setRevealed] = useState(false);
  const mcpBase = mcpUrl || backendUrl;
  const apiKey = user?.publicApi || '';
  const available = !!apiKey && !!user?.tier?.public_api;

  const { config, hint } =
    agent === apiTab
      ? { config: '', hint: '' }
      : getMcpConfig(agent, auth, mcpBase, apiKey);

  const maskedConfig =
    revealed || auth === 'oauth' || !apiKey
      ? config
      : config.replace(
          new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '*'.repeat(apiKey.length)
        );

  const connector =
    agent === 'Claude' && billingEnabled
      ? {
          href: 'https://claude.ai/directory/postiz',
          label: t('add_to_claude', 'Add to Claude'),
        }
      : agent === 'Cursor'
      ? {
          href: getCursorInstallUrl(auth, mcpBase, apiKey),
          label: t('add_to_cursor', 'Add to Cursor'),
        }
      : null;

  const maskedApiKey = revealed ? apiKey : '*'.repeat(apiKey.length);

  const chatSection = (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden">
      <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder">
        <div className="text-[15px] font-[600]">{t('chat', 'Chat')}</div>
        <div className="text-[13px] text-customColor18 mt-[2px]">
          {t(
            'chat_onboarding_description',
            'No MCP or CLI settings needed. Paste this into the chat, the agent installs the Postiz CLI and asks you for your API key.'
          )}
        </div>
      </div>
      <div className="p-[20px] flex flex-col gap-[16px]">
        <div className="flex flex-col gap-[8px]">
          <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[12px] text-[12px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.5]">
            {config}
          </pre>
          <div className="flex gap-[8px]">
            <CopyButton text={config} label={t('copy', 'Copy')} />
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="text-[13px] font-[600] text-customColor18">
            {t('api_key', 'API Key')}
          </div>
          <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[12px] text-[12px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.5]">
            {maskedApiKey}
          </pre>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
            </button>
            <CopyButton text={apiKey} label={t('copy', 'Copy')} />
          </div>
        </div>
      </div>
    </div>
  );

  const apiSection = (
    <>
      <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder px-[20px] py-[14px] flex items-center justify-between gap-[12px]">
        <div>
          <div className="text-[15px] font-[600]">
            {t('documentation', 'Documentation')}
          </div>
          <div className="text-[13px] text-customColor18 mt-[2px]">
            {t(
              'api_onboarding_description',
              'Use the Postiz API from your own code, n8n or any other automation'
            )}
          </div>
        </div>
        <a
          className="cursor-pointer px-[24px] h-[44px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[14px] font-[600] flex items-center gap-[8px] shrink-0"
          href="https://docs.postiz.com/public-api/introduction"
          target="_blank"
        >
          <McpClientIcon client={apiTab} size={18} />
          {t('read_the_api_docs', 'Read the API docs')}
        </a>
      </div>
      <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden">
        <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder">
          <div className="text-[15px] font-[600]">
            {t('api_key', 'API Key')}
          </div>
          <div className="text-[13px] text-customColor18 mt-[2px]">
            {t(
              'api_key_onboarding_description',
              'Send it as the Authorization header on every request'
            )}
          </div>
        </div>
        <div className="p-[20px] flex flex-col gap-[8px]">
          <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[12px] text-[12px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.5]">
            {maskedApiKey}
          </pre>
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
            >
              {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
            </button>
            <CopyButton text={apiKey} label={t('copy', 'Copy')} />
          </div>
        </div>
      </div>
    </>
  );

  const connectorSection = connector && (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder px-[20px] py-[14px] flex items-center justify-between gap-[12px]">
      <div>
        <div className="text-[15px] font-[600]">
          {t('connector', 'Connector')}
        </div>
        <div className="text-[13px] text-customColor18 mt-[2px]">
          {t(
            'connector_onboarding_description',
            'The fastest way: add Postiz with one click, you will be asked to sign in'
          )}
        </div>
      </div>
      <a
        className="cursor-pointer px-[24px] h-[44px] bg-[#612BD3] hover:bg-[#5520CB] text-white transition-colors rounded-[8px] text-[14px] font-[600] flex items-center gap-[8px] shrink-0"
        href={connector.href}
        target="_blank"
      >
        <McpClientIcon client={agent} size={18} />
        {connector.label}
      </a>
    </div>
  );

  const mcpSection = (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden flex flex-col">
      <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder">
        <div className="text-[15px] font-[600]">{t('mcp', 'MCP')}</div>
        <div className="text-[13px] text-customColor18 mt-[2px]">
          {t(
            'mcp_onboarding_description',
            'Give your agent Postiz tools to create, schedule and manage posts'
          )}
        </div>
      </div>
      <div className="p-[20px] flex flex-col gap-[16px] flex-1">
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
        <div className="flex flex-col gap-[8px]">
          <div className="text-[12px] text-customColor18 font-[500]">
            {hint}
            {auth === 'oauth' &&
              ` ${t(
                'oauth_sign_in_hint',
                'Your agent will open a browser window to sign in to Postiz.'
              )}`}
          </div>
          <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[12px] text-[12px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.5]">
            {maskedConfig}
          </pre>
          <div className="flex gap-[8px]">
            {auth === 'apikey' && (
              <button
                type="button"
                onClick={() => setRevealed(!revealed)}
                className="cursor-pointer px-[16px] h-[36px] bg-btnSimple hover:bg-boxHover transition-colors rounded-[8px] text-[13px] font-[600] flex items-center gap-[6px]"
              >
                {revealed ? t('hide', 'Hide') : t('reveal', 'Reveal')}
              </button>
            )}
            <CopyButton text={config} label={t('copy', 'Copy')} />
          </div>
        </div>
      </div>
    </div>
  );

  const cliSection = (
    <div className="bg-newBgColorInnerInner rounded-[12px] border border-newBorder overflow-hidden flex flex-col">
      <div className="bg-newBgColorInner px-[20px] py-[14px] border-b border-newBorder">
        <div className="text-[15px] font-[600]">{t('cli', 'CLI')}</div>
        <div className="text-[13px] text-customColor18 mt-[2px]">
          {t(
            'cli_onboarding_description',
            'Install the Postiz CLI and the skill that teaches your agent how to use it'
          )}
        </div>
      </div>
      <div className="p-[20px] flex flex-col gap-[8px] flex-1">
        <pre className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[12px] text-[12px] whitespace-pre-wrap break-all overflow-x-auto leading-[1.5] flex-1">
          {cliCommands.join('\n')}
        </pre>
        <div className="flex gap-[8px]">
          <CopyButton
            text={cliCommands.join(' && ')}
            label={t('copy', 'Copy')}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-[24px] flex-1">
      <div className="flex gap-[4px] flex-col text-center">
        <div className="text-[24px] font-semibold">
          {t('connect_your_ai_agent', 'Connect Your AI Agent')}
        </div>
        <div className="text-[14px] text-customColor18">
          {t(
            'connect_agent_description',
            'Pick the agent you use and let it create and schedule posts for you'
          )}
        </div>
      </div>

      {available ? (
        <div className="flex flex-col gap-[16px] w-full max-w-[1100px] mx-auto">
          <div className="flex flex-wrap justify-center gap-[6px]">
            {[...onboardingAgents, apiTab].map((item) => (
              <button
                key={item}
                type="button"
                className={clsx(
                  'cursor-pointer px-[14px] h-[36px] text-[13px] font-[500] rounded-[8px] transition-colors flex items-center gap-[8px]',
                  agent === item
                    ? 'bg-[#612BD3] text-white'
                    : item === apiTab
                    ? 'bg-btnSimple text-[#a78bfa] hover:bg-boxHover hover:text-[#c4b5fd]'
                    : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
                )}
                onClick={() => setAgent(item)}
              >
                <McpClientIcon client={item} />
                {item}
              </button>
            ))}
          </div>

          {agent === apiTab ? (
            apiSection
          ) : isChatOnlyMcpClient(agent) ? (
            chatSection
          ) : (
            <>
              {connectorSection}
              <div className="grid grid-cols-2 gap-[16px]">
                {mcpSection}
                {cliSection}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-newTableHeader rounded-[8px] p-[16px] text-[14px] text-customColor18 text-center w-full max-w-[860px] mx-auto">
          {t(
            'agent_access_unavailable',
            'Agent access is not available for your current plan or role. You can set it up later under Settings > Developers.'
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center pt-[8px] mt-auto w-full max-w-[1100px] mx-auto">
        <button
          onClick={onBack}
          className="group flex items-center gap-[8px] bg-transparent border-2 border-boxFocused font-medium px-[24px] py-[12px] rounded-[12px] text-[15px] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-1 transition-transform"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {t('back', 'Back')}
        </button>
        <div className="text-[13px] text-customColor18 text-center">
          {t(
            'agent_settings_later',
            'More agents and full instructions are available under Settings > Developers'
          )}
        </div>
        <button
          onClick={onNext}
          className="group flex items-center gap-[12px] bg-gradient-to-r from-[#622aff] to-[#8b5cf6] hover:from-[#7c3aff] hover:to-[#9d6eff] text-white font-semibold px-[32px] py-[14px] rounded-[12px] text-[16px] transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
        >
          {t('continue_skip', 'Continue / Skip')}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:translate-x-1 transition-transform"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const OnboardingStep3: FC<{ onBack: () => void; onFinish: () => void }> = ({
  onBack,
  onFinish,
}) => {
  const t = useT();

  return (
    <div className="flex flex-col gap-[24px] flex-1">
      <div className="flex gap-[4px] flex-col text-center">
        <div className="text-[24px] font-semibold">
          {t('watch_tutorial_title', 'Learn How to Use Postiz')}
        </div>
        <div className="text-[14px] text-customColor18">
          {t(
            'watch_tutorial_description',
            'Watch this short video to learn how to get the most out of Postiz'
          )}
        </div>
      </div>

      {/* YouTube Video Embed */}
      <div className="relative flex-1 rounded-[12px] overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-full flex justify-center">
          <iframe
            className="h-full aspect-video"
            src="https://www.youtube.com/embed/BdsCVvEYgHU?si=vvhaZJ8I5oXXvVJS?autoplay=1"
            title="Postiz Tutorial"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-between pt-[24px] mt-[8px]">
        <button
          onClick={onBack}
          className="group flex items-center gap-[8px] bg-transparent border-2 border-boxFocused font-medium px-[24px] py-[12px] rounded-[12px] text-[15px] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-1 transition-transform"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {t('back', 'Back')}
        </button>
        <button
          onClick={onFinish}
          className="group flex items-center gap-[12px] bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-white font-semibold px-[32px] py-[14px] rounded-[12px] text-[16px] transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
        >
          {t('get_started', 'Get Started')}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:scale-110 transition-transform"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </button>
      </div>
    </div>
  );
};
