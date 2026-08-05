'use client';

import { FC, useCallback, useState } from 'react';
import { useSWRConfig } from 'swr';
import copy from 'copy-to-clipboard';
import { useUser } from '../layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import clsx from 'clsx';

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

export const ApiKeyCard: FC<{
  title?: string;
  hint?: string;
  showDocs?: boolean;
  showWizard?: boolean;
  /** Settings Developers: flat --pop card, no icon tile (prototype :2828). */
  compact?: boolean;
  onRevealChange?: (revealed: boolean) => void;
  className?: string;
}> = ({
  title,
  hint,
  showDocs = true,
  showWizard = true,
  compact = false,
  onRevealChange,
  className,
}) => {
  const user = useUser();
  const { frontEndUrl } = useVariables();
  const toaster = useToaster();
  const fetch = useFetch();
  const decision = useDecisionModal();
  const { mutate } = useSWRConfig();
  const [reveal, setReveal] = useState(false);
  const t = useT();

  const toggleReveal = useCallback(() => {
    setReveal((prev) => {
      const next = !prev;
      onRevealChange?.(next);
      return next;
    });
  }, [onRevealChange]);

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
    onRevealChange?.(false);
    toaster.show(
      t('api_key_rotated', 'API Key rotated successfully'),
      'success'
    );
  }, [decision, fetch, mutate, onRevealChange, toaster, t]);

  if (!user?.publicApi) {
    return null;
  }

  const keyHint =
    hint ||
    t(
      'api_key_one_key',
      'One key authenticates the REST API, the MCP server, the CLI and the n8n node.'
    );

  return (
    <div
      className={clsx(
        'flex flex-col gap-[12px] rounded-pqMd shadow-[inset_0_0_0_1px_var(--border)]',
        compact
          ? 'bg-pqPop p-[15px_16px]'
          : 'bg-pqInner p-[18px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex min-w-0 items-start gap-[9px]">
          {!compact && (
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-pqSm bg-pqBrandSoft text-pqFocused">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                <path
                  d="M15.5 7a4.5 4.5 0 1 0-4.3 5.8H9.5v2.4H7v2.5H3.5v-3.3l6-6A4.5 4.5 0 0 1 15.5 7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          <div className="min-w-0">
            <div
              className={clsx(
                'font-[600]',
                compact ? 'text-[13.5px]' : 'text-[14px]'
              )}
            >
              {title ||
                (compact
                  ? t('api_key', 'API key')
                  : t('conn_your_api_key', 'Your API key'))}
            </div>
            <div
              className={clsx(
                'text-[12.5px] text-pqMuted',
                compact ? 'mt-[3px]' : 'mt-[1px]'
              )}
            >
              {keyHint}
            </div>
          </div>
        </div>
        {showDocs && (
          <a
            className="flex h-[30px] shrink-0 cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            href="https://docs.postqueen.ai/public-api"
            target="_blank"
            rel="noreferrer"
          >
            {t('read_the_docs', 'Docs')}
          </a>
        )}
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
          onClick={toggleReveal}
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
          {t('rotate_key', 'Rotate key')}
        </button>
        {showWizard && (
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
        )}
      </div>
    </div>
  );
};
