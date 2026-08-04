'use client';

import { useState, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { useUser } from '../layout/user.context';
import copy from 'copy-to-clipboard';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import clsx from 'clsx';
import Link from 'next/link';


const CopyButton = ({
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
      className="flex h-[30px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
    >
      {label}
    </button>
  );
};



const PublicApiContent = () => {
  const user = useUser();
  const { frontEndUrl } = useVariables();
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

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex flex-col gap-[12px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-start justify-between gap-[12px]">
          <div>
            <div className="text-[13.5px] font-[600]">
              {t('api_key', 'API Key')}
            </div>
            <div className="mt-[3px] text-[12.5px] text-pqMuted">
              {t('api_key_one_key', 'One key authenticates the REST API, the MCP server, the CLI and the n8n node.')}
            </div>
          </div>
          <a
            className="flex h-[30px] shrink-0 cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            href="https://docs.postqueen.ai/public-api"
            target="_blank"
          >
            {t('read_the_docs', 'Docs')}
          </a>
        </div>
        <div className="flex h-[38px] items-center gap-[8px] rounded-pqSm bg-pqBg px-[12px] font-mono text-[12.5px] shadow-[inset_0_0_0_1px_var(--border)]">
          <code className="min-w-0 flex-1 truncate">
            {reveal
              ? user.publicApi
              : `${'•'.repeat(Math.max(user.publicApi.length - 5, 8))}${user.publicApi.slice(-5)}`}
          </code>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          <button
            type="button"
            onClick={() => setReveal(!reveal)}
            className="flex h-[30px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
          >
            {reveal ? t('hide', 'Hide') : t('reveal', 'Reveal')}
          </button>
          <CopyButton text={user.publicApi} label={t('copy', 'Copy')} />
          <button
            type="button"
            onClick={rotateKey}
            className="flex h-[30px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqWarn transition-colors hover:bg-pqHover"
          >
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
            className="flex h-[30px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
          >
            {t('open_wizard', 'Open Wizard')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-[12px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-[600]">
            {t('connect_an_ai_agent', 'Connect an AI agent')}
          </div>
          <div className="mt-[3px] text-[12.5px] text-pqMuted">
            {t('connect_an_ai_agent_sub', 'Claude, ChatGPT, MCP clients, n8n and the CLI all live under Connections.')}
          </div>
        </div>
        <Link
          href="/connections"
          className="flex h-[32px] shrink-0 items-center rounded-pqSm bg-pqBrand px-[12px] text-[12.5px] font-[600] text-white transition-colors hover:bg-pqBrandHover"
        >
          {t('open_connections', 'Open Connections')}
        </Link>
      </div>
    </div>
  );
};

export const PublicComponent = () => {
  const t = useT();
  const [subTab, setSubTab] = useState<'api' | 'developer'>('api');

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h3 className="text-[20px] font-[500]">
          {t('developers', 'Developers')}
        </h3>
        <div className="mt-[4px] text-pqMuted">
          {t('developers_description', 'Use the public API to schedule posts from your own systems.')}
        </div>
      </div>
      <div className="flex gap-[6px]">
        {(['api', 'developer'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={clsx(
              'flex h-[32px] cursor-pointer items-center rounded-pqSm px-[13px] text-[12.5px] transition-colors',
              subTab === tab
                ? 'bg-pqBrandSoft font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--brand)]'
                : 'text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover'
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
