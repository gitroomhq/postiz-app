'use client';

import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Input } from '@gitroom/react/form/input';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { useRouter } from 'next/navigation';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { object, string } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { web3List } from '@gitroom/frontend/components/launches/web3/web3.list';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  ProviderGuide,
  useProviderGuides,
} from '@gitroom/frontend/components/launches/provider.guides';
import clsx from 'clsx';
import copy from 'copy-to-clipboard';
import { capitalize } from 'lodash';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { TrialLockCard } from '@gitroom/frontend/components/billing/trial-lock-card';
const resolver = classValidatorResolver(ApiKeyDto);

export const useAddProvider = (update?: () => void, invite?: boolean) => {
  const modal = useModals();
  const fetch = useFetch();
  return useCallback(async () => {
    const data = await (await fetch('/integrations')).json();
    modal.openModal({
      title: 'Add Channel',
      withCloseButton: true,
      children: (
        <AddProviderComponent invite={!!invite} update={update} {...data} />
      ),
    });
  }, []);
};
export const AddProviderButton: FC<{
  update?: () => void;
}> = (props) => {
  const { update } = props;
  const add = useAddProvider(update);
  const invite = useAddProvider(update, true);
  const t = useT();

  return (
    <div className="flex group-[.sidebar]:block gap-[8px]">
      <button
        // A stable hook for the screenshot tool: this dialog cannot be reached
        // by URL, and the migration has to be able to photograph it.
        data-pq="add-channel"
        className="flex-1 group-[.sidebar]:w-[100%] group-[.sidebar]:flex-none text-btnText bg-btnSimple h-[44px] pt-[12px] pb-[14px] ps-[16px] pe-[20px] justify-center items-center flex rounded-[8px] gap-[8px]"
        onClick={add}
      >
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M1.66675 10.0417C3.35907 10.2299 4.93698 10.9884 6.14101 12.1924C7.34504 13.3964 8.10353 14.9743 8.29175 16.6667M1.66675 13.4167C2.46749 13.58 3.20253 13.9751 3.7804 14.553C4.35827 15.1309 4.75344 15.8659 4.91675 16.6667M1.66675 16.6667H1.67508M11.6667 17.5H14.3334C15.7335 17.5 16.4336 17.5 16.9684 17.2275C17.4388 16.9878 17.8212 16.6054 18.0609 16.135C18.3334 15.6002 18.3334 14.9001 18.3334 13.5V6.5C18.3334 5.09987 18.3334 4.3998 18.0609 3.86502C17.8212 3.39462 17.4388 3.01217 16.9684 2.77248C16.4336 2.5 15.7335 2.5 14.3334 2.5H5.66675C4.26662 2.5 3.56655 2.5 3.03177 2.77248C2.56137 3.01217 2.17892 3.39462 1.93923 3.86502C1.66675 4.3998 1.66675 5.09987 1.66675 6.5V6.66667"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-start text-[14px] group-[.sidebar]:hidden">
          {t('add_channel', 'Add Channel')}
        </div>
      </button>
      <button
        onClick={invite}
        data-tooltip-id="tooltip"
        data-tooltip-content={t(
          'invite_link',
          'Send Invite Link to a customer to add channel'
        )}
        className="group-[.sidebar]:hidden min-h-[44px] min-w-[44px] bg-btnSimple justify-center items-center flex rounded-[8px] cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
        >
          <g clipPath="url(#clip0_2452_193804)">
            <path
              d="M6.6668 8.66599C6.9531 9.04875 7.31837 9.36545 7.73783 9.59462C8.1573 9.82379 8.62114 9.96007 9.0979 9.99422C9.57466 10.0284 10.0532 9.95957 10.501 9.79251C10.9489 9.62546 11.3555 9.36404 11.6935 9.02599L13.6935 7.02599C14.3007 6.39732 14.6366 5.55531 14.629 4.68132C14.6215 3.80733 14.2709 2.97129 13.6529 2.35326C13.0348 1.73524 12.1988 1.38467 11.3248 1.37708C10.4508 1.36948 9.60881 1.70547 8.98013 2.31266L7.83347 3.45266M9.33347 7.33266C9.04716 6.94991 8.68189 6.6332 8.26243 6.40403C7.84297 6.17486 7.37913 6.03858 6.90237 6.00444C6.4256 5.97029 5.94708 6.03908 5.49924 6.20614C5.0514 6.3732 4.64472 6.63461 4.3068 6.97266L2.3068 8.97266C1.69961 9.60133 1.36363 10.4433 1.37122 11.3173C1.37881 12.1913 1.72938 13.0274 2.3474 13.6454C2.96543 14.2634 3.80147 14.614 4.67546 14.6216C5.54945 14.6292 6.39146 14.2932 7.02013 13.686L8.16013 12.546"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_2452_193804">
              <rect width="16" height="16" fill="textColor"></rect>
            </clipPath>
          </defs>
        </svg>
      </button>
    </div>
  );
};

export const UrlModal: FC<{
  gotoUrl(url: string): void;
}> = (props) => {
  const { gotoUrl } = props;
  const modals = useModals();
  const methods = useForm({
    mode: 'onChange',
  });

  const t = useT();

  const submit = useCallback(async (data: FieldValues) => {
    gotoUrl(data.url);
  }, []);
  return (
    <div className="rounded-[4px] border border-pqLine bg-pqTableHeader px-[16px] pb-[16px] relative">
      <TopTitle title={`Instance URL`} />
      <button
        onClick={() => modals.closeCurrent()}
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
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
      <FormProvider {...methods}>
        <form
          className="gap-[8px] flex flex-col"
          onSubmit={methods.handleSubmit(submit)}
        >
          <div className="pt-[10px]">
            <Input label="URL" name="url" />
          </div>
          <div>
            <Button type="submit">{t('connect', 'Connect')}</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
export const CustomVariables: FC<{
  variables: Array<{
    key: string;
    label: string;
    defaultValue?: string;
    validation: string;
    type: 'text' | 'password';
    hint?: string;
  }>;
  close?: () => void;
  identifier: string;
  gotoUrl(url: string): void;
  onboarding?: boolean;
}> = (props) => {
  const { close, gotoUrl, identifier, variables, onboarding } = props;
  const fetch = useFetch();
  const modals = useModals();
  const schema = useMemo(() => {
    return object({
      ...variables.reduce((aIcc, item) => {
        const splitter = item.validation.split('/');
        const regex = new RegExp(
          splitter.slice(1, -1).join('/'),
          splitter.pop()
        );
        return {
          ...aIcc,
          [item.key]: string()
            .matches(regex, `${item.label} is invalid`)
            .required(),
        };
      }, {}),
    });
  }, [variables]);
  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(schema),
    values: variables.reduce(
      (acc, item) => ({
        ...acc,
        ...(item.defaultValue
          ? {
              [item.key]: item.defaultValue,
            }
          : {}),
      }),
      {}
    ),
  });
  const submit = useCallback(
    async (data: FieldValues) => {
      const { url } = await (
        await fetch(
          `/integrations/social/${identifier}${
            onboarding ? '?onboarding=true' : ''
          }`
        )
      ).json();
      modals.closeAll();
      gotoUrl(
        `/integrations/social/${identifier}?state=${url}&code=${Buffer.from(
          JSON.stringify(data)
        ).toString('base64')}${onboarding ? '&onboarding=true' : ''}`
      );
    },
    [variables, onboarding]
  );

  const t = useT();

  return (
    <div className="rounded-[4px] relative">
      <FormProvider {...methods}>
        <form
          className="gap-[8px] flex flex-col pt-[10px]"
          onSubmit={methods.handleSubmit(submit)}
        >
          {variables.map((variable) => (
            <div key={variable.key}>
              {variable.hint ? (
                <div className="flex flex-col gap-[6px]">
                  <div className="text-[14px] flex items-center gap-[6px]">
                    <span>{variable.label}</span>
                    <span
                      data-tooltip-id="tooltip"
                      data-tooltip-content={variable.hint}
                      className="w-[16px] h-[16px] rounded-full border border-textColor/60 text-textColor/60 flex items-center justify-center text-[11px] leading-none cursor-help select-none"
                    >
                      i
                    </span>
                  </div>
                  <Input
                    label=""
                    name={variable.key}
                    type={variable.type == 'text' ? 'text' : 'password'}
                  />
                </div>
              ) : (
                <Input
                  label={variable.label}
                  name={variable.key}
                  type={variable.type == 'text' ? 'text' : 'password'}
                />
              )}
            </div>
          ))}
          <div>
            <Button type="submit">{t('connect', 'Connect')}</Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
const ExtensionNotFound: FC = () => {
  const { extensionStoreUrl } = useVariables();
  const modals = useModals();
  const t = useT();
  return (
    <div className="flex flex-col gap-[16px] pt-[8px]">
      <p className="text-[14px] text-textColor/80">
        {t(
          'extension_not_available',
          'The PostQueen browser extension is not installed. You need to install it before connecting this channel.'
        )}
      </p>
      <div className="flex gap-[10px]">
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            // The listing this deployment publishes, if any. Sending users to the
            // vendor's build is useless: its origin allowlist is baked at build
            // time and will not talk to a self-hosted frontend.
            if (extensionStoreUrl) {
              window.open(extensionStoreUrl, '_blank');
            }
            modals.closeCurrent();
          }}
        >
          {t('install_extension', 'Install Extension')}
        </Button>
        <Button
          type="button"
          className="flex-1 !bg-transparent border border-tableBorder text-textColor"
          onClick={() => modals.closeCurrent()}
        >
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

const ChromeExtensionWarning: FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  const modals = useModals();
  const t = useT();
  return (
    <div className="flex flex-col gap-[16px] pt-[8px]">
      <p className="text-[14px] text-textColor/80">
        {t(
          'chrome_extension_warning_intro',
          'This channel connects via the browser extension. Please be aware of the following:'
        )}
      </p>
      <ul className="flex flex-col gap-[8px] list-disc ps-[20px] text-[14px] text-textColor/80">
        <li>
          {t(
            'chrome_extension_warning_tos',
            'Using a browser extension to interact with a platform may violate its terms of service and could result in your account being suspended or banned.'
          )}
        </li>
        <li>
          {t(
            'chrome_extension_warning_unstable',
            'This method is not as reliable as native integrations and may experience random disconnections.'
          )}
        </li>
        <li>
          {t(
            'chrome_extension_warning_reconnect',
            'You may need to reconnect periodically if the session expires.'
          )}
        </li>
        <li>
          We will store your cookies securely to facilitate the connection.
        </li>
        <li>
          PostQueen does not take responsibility for any issues arising or
          account termination due to the use of this method.
        </li>
      </ul>
      <div className="flex gap-[10px] mt-[8px]">
        <Button
          type="button"
          className="flex-1"
          onClick={() => {
            modals.closeCurrent();
            onConfirm();
          }}
        >
          {t('i_understand_continue', 'I understand, continue')}
        </Button>
        <Button
          type="button"
          className="flex-1 !bg-transparent border border-tableBorder text-textColor"
          onClick={() => {
            modals.closeCurrent();
            onCancel();
          }}
        >
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

/**
 * The screen between picking a provider and actually connecting it.
 *
 * It exists for one reason: every precondition here — Instagram needing a
 * Business account, WordPress needing an application password rather than a
 * login password, Bluesky not supporting 2FA — used to be discovered *after*
 * a failed round trip through someone else's login screen.
 */
const CONNECT_MODE_ICONS = {
  self: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  invite:
    'M10.2 13.8a4.2 4.2 0 0 0 6.3.45l2.4-2.4a4.2 4.2 0 0 0-5.95-5.95l-1.4 1.4M13.8 10.2a4.2 4.2 0 0 0-6.3-.45l-2.4 2.4a4.2 4.2 0 0 0 5.95 5.95l1.4-1.4',
} as const;

/** Invite-by-link step — design shows URL + Copy link, not Continue/OAuth. */
const InviteLinkStep: FC<{
  item: { identifier: string; name: string };
  hint?: string;
  onBack: () => void;
  onboarding?: boolean;
}> = ({ item, hint, onBack, onboarding }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const identifier = item.identifier;
    (async () => {
      setLoading(true);
      setFailed(false);
      setUrl('');
      try {
        // Same endpoint as connect-myself invite copy path in getSocialLink.
        const res = await fetch(
          `/integrations/social/${identifier}${
            onboarding ? '?onboarding=true' : ''
          }`
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || body?.err || !body?.url) {
          setFailed(true);
          setUrl('');
          // 402/406 already showed a global dialog; avoid a second toast there.
          if (res.status !== 402 && res.status !== 406 && res.status !== 499) {
            toaster.show(
              t(
                'could_not_connect_to_platform',
                'Could not connect to the platform'
              ),
              'warning'
            );
          }
          return;
        }
        setUrl(body.url);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setUrl('');
          toaster.show(
            t(
              'could_not_connect_to_platform',
              'Could not connect to the platform'
            ),
            'warning'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally omit toaster/t — remounting the fetch on every t identity
    // change left Loading stuck when a dialog cancelled the previous request.
  }, [fetch, item.identifier, onboarding, retryKey]);

  const copyLink = useCallback(() => {
    if (!url) return;
    copy(url);
    toaster.show(
      t(
        'invite_link_copied_to_clipboard',
        'Invite link copied to clipboard, link will be available for 1 hour'
      ),
      'success'
    );
  }, [url, toaster, t]);

  return (
    <div
      data-provider-step={item.identifier}
      data-provider-invite="1"
      data-view="connect-step"
      className="flex w-full max-w-[460px] flex-col gap-[18px] self-start"
    >
      <div className="flex flex-col items-start gap-[14px]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[32px] w-fit items-center gap-[6px] rounded-[9px] bg-pqSettings pe-[12px] ps-[8px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
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
          {t('all_platforms', 'All platforms')}
        </button>
        <div className="flex items-center gap-[11px]">
          <img
            src={`/icons/platforms/${item.identifier}.png`}
            alt=""
            className="h-[32px] w-[32px] shrink-0 rounded-full"
          />
          <span className="text-[16px] font-[600] -tracking-[0.01em]">
            {capitalize(item.name)}
          </span>
        </div>
      </div>

      {!!hint && (
        <span className="text-[13px] leading-[1.55] text-pqMuted">{hint}</span>
      )}

      <div className="flex flex-col gap-[14px] rounded-[12px] bg-pqInner p-[18px] shadow-[inset_0_0_0_1px_var(--border)]">
        <span className="text-[14px] leading-[1.6] text-pqMuted">
          {t(
            'send_this_invite_link',
            'Send this link to whoever owns the account. They connect it themselves and it lands in your workspace — the link works for one hour.'
          )}
        </span>
        <div className="flex h-[42px] items-center gap-[10px] rounded-[10px] bg-pqBg pe-[6px] ps-[14px] shadow-[inset_0_0_0_1px_var(--border)]">
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-pqMuted">
            {loading
              ? t('loading', 'Loading…')
              : url ||
                t('invite_link_unavailable', 'Link unavailable')}
          </span>
          {failed && !loading ? (
            <button
              type="button"
              onClick={() => setRetryKey((n) => n + 1)}
              className="h-[32px] shrink-0 rounded-[8px] bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
            >
              {t('retry', 'Retry')}
            </button>
          ) : (
            <button
              type="button"
              data-provider-copy-invite="1"
              onClick={copyLink}
              disabled={!url || loading}
              className="h-[32px] shrink-0 rounded-[8px] bg-pqBrand px-[14px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:opacity-50"
            >
              {t('copy_link', 'Copy link')}
            </button>
          )}
        </div>
        <div className="flex gap-[10px]">
          <button
            type="button"
            onClick={onBack}
            className="h-[38px] rounded-[10px] bg-pqBtnSimple px-[18px] text-[13.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
          >
            {t('back', 'Back')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProviderSetupStep: FC<{
  item: {
    identifier: string;
    name: string;
    isExternal: boolean;
    isWeb3: boolean;
    isChromeExtension?: boolean;
    trialLocked?: boolean;
    isNew?: boolean;
    toolTip?: string;
    customFields?: Array<{ key: string; label: string }>;
  };
  guide: ProviderGuide;
  locked: boolean;
  inviteMode: boolean;
  onboarding?: boolean;
  onBack: () => void;
  onConnect: () => void;
}> = ({ item, guide, locked, inviteMode, onboarding, onBack, onConnect }) => {
  const t = useT();
  const needsFields = !!item.customFields?.length;
  const inviteHint = item.toolTip || guide.requirement || guide.summary;

  if (inviteMode && !locked) {
    return (
      <InviteLinkStep
        item={item}
        hint={inviteHint}
        onBack={onBack}
        onboarding={onboarding}
      />
    );
  }

  return (
    <div
      data-provider-step={item.identifier}
      data-view="connect-step"
      className="flex w-full max-w-[460px] flex-col gap-[18px] self-start"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex h-[32px] w-fit items-center gap-[6px] rounded-[9px] bg-pqSettings pe-[12px] ps-[8px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
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
        {t('all_platforms', 'All platforms')}
      </button>

      <div className="flex items-center gap-[14px]">
        <img
          src={`/icons/platforms/${item.identifier}.png`}
          alt=""
          className="h-[44px] w-[44px] rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-[600] -tracking-[0.01em]">
            {capitalize(item.name)}
          </div>
          <div className="mt-[2px] text-[13px] leading-[1.5] text-pqMuted">
            {guide.summary}
          </div>
        </div>
      </div>

      {/* Amber tip is for a live connect. While trial-locked the channel is not
          open yet — the tip would only clutter the lock card. */}
      {!!guide.requirement && !locked && (
        <div
          data-provider-requirement="1"
          className="flex gap-[10px] rounded-pqSm bg-pqAmberSoft p-[12px] text-[12.5px] leading-[1.55] text-pqText"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            aria-hidden="true"
            className="mt-[1px] shrink-0 text-pqAmber"
          >
            <path
              d="M12 8v5m0 3.5h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{guide.requirement}</span>
        </div>
      )}

      {!!guide.steps?.length && (
        <ol className="flex flex-col gap-[10px]">
          {guide.steps.map((line, index) => (
            <li key={line} className="flex gap-[10px]">
              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-pqBrandSoft text-[10.5px] font-[700] text-pqBrand">
                {index + 1}
              </span>
              <span className="text-[12.5px] leading-[1.55] text-pqMuted">
                {line}
              </span>
            </li>
          ))}
        </ol>
      )}

      {!!guide.fields && (
        <div className="flex flex-col gap-[6px]">
          {(item.customFields || []).map((field) =>
            guide.fields?.[field.key] ? (
              <div key={field.key} className="text-[12.5px] text-pqMuted">
                <span className="font-[600] text-pqText">{field.label}</span>
                {' — '}
                {guide.fields[field.key]}
              </div>
            ) : null
          )}
        </div>
      )}

      {!!guide.link && (
        <a
          href={guide.link.href}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-[12.5px] font-[600] text-pqBrand hover:underline"
        >
          {guide.link.label} →
        </a>
      )}

      {locked ? (
        <TrialLock name={capitalize(item.name)} />
      ) : (
        <button
          type="button"
          data-provider-connect="1"
          onClick={onConnect}
          className="h-[40px] w-fit rounded-pqSm bg-pqBrand px-[18px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover"
        >
          {needsFields
            ? t('enter_details', 'Enter details')
            : t('continue_to', 'Continue to {{name}}', {
                name: capitalize(item.name),
              })}
        </button>
      )}
    </div>
  );
};

/**
 * What a trialing organization sees instead of a Connect button.
 * Shared TrialLockCard LOOK; FinishTrial opens from the primary CTA.
 * Foot date comes from trialWindow(user.createdAt) inside TrialLockCard.
 */
const TrialLock: FC<{ name: string }> = ({ name }) => {
  const t = useT();
  return (
    <div data-provider-locked="1">
      <TrialLockCard
        variant="inline"
        name={name}
        title={t(
          'provider_unlocks_after_your_trial',
          '{{name}} unlocks after your trial',
          { name }
        )}
        description={t(
          'x_lock_sub',
          '{{name}} charges us per post through their API, so this one channel waits for your first payment. Every other channel is already publishing.',
          { name }
        )}
        perks={[
          t('x_lock_perk_publish', 'Publish and thread straight to {{name}}', {
            name,
          }),
          t('x_lock_perk_plugs', 'Auto-plugs and reply automations'),
          t(
            'x_lock_perk_analytics',
            '{{name}} analytics — impressions, engagement, follows',
            { name }
          ),
        ]}
      />
    </div>
  );
};

export const AddProviderComponent: FC<{
  social: Array<{
    identifier: string;
    name: string;
    toolTip?: string;
    category?: string;
    isExternal: boolean;
    isWeb3: boolean;
    isChromeExtension?: boolean;
    trialLocked?: boolean;
    isNew?: boolean;
    extensionCookies?: Array<{
      name: string;
      domain: string;
    }>;
    customFields?: Array<{
      key: string;
      label: string;
      validation: string;
      type: 'text' | 'password';
      hint?: string;
    }>;
  }>;
  article: Array<{
    identifier: string;
    name: string;
  }>;
  invite: boolean;
  update?: () => void;
  onboarding?: boolean;
  isMobile?: boolean;
  onInviteModeChange?: (invite: boolean) => void;
  /** Fires when a provider connect/continue step opens or closes (scroll reset). */
  onStepChange?: (open: boolean) => void;
}> = (props) => {
  const { update, social, article, onboarding, isMobile, onStepChange } = props;
  // Which provider's setup step is open. The grid used to connect on click,
  // which meant a precondition you did not know about — an Instagram account
  // that is not a Business account, an X session on the wrong login — only
  // surfaced after a round trip through somebody else's OAuth screen.
  const [step, setStep] = useState<(typeof social)[number] | null>(null);
  // Which of the two ways in is active. It arrives as a prop because the
  // channels column has a button for each, but the design lets you switch
  // without closing — picking the wrong one used to mean reopening the dialog.
  const [inviteMode, setInviteMode] = useState(!!props.invite);

  useEffect(() => {
    onStepChange?.(!!step);
  }, [step, onStepChange]);

  const { guides, fallback } = useProviderGuides();
  const { isGeneral, extensionId } = useVariables();
  const toaster = useToaster();
  const router = useRouter();
  const fetch = useFetch();
  const modal = useModals();
  const getSocialLink = useCallback(
    (
        invite: boolean,
        identifier: string,
        isExternal: boolean,
        isWeb3: boolean,
        isChromeExtension?: boolean,
        customFields?: Array<{
          key: string;
          label: string;
          validation: string;
          defaultValue?: string;
          type: 'text' | 'password';
          hint?: string;
        }>
      ) =>
      async () => {
        const onboardingParam = onboarding ? 'onboarding=true' : '';
        const openWeb3 = async () => {
          const { component: Web3Providers } = web3List.find(
            (item) => item.identifier === identifier
          )!;
          const { url } = await (
            await fetch(
              `/integrations/social/${identifier}${
                onboarding ? '?onboarding=true' : ''
              }`
            )
          ).json();
          modal.openModal({
            title: `Add ${capitalize(identifier)}`,
            withCloseButton: true,
            ...(isMobile ? { removeLayout: true, fullScreen: true } : {}),
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: (
              <div
                {...(isMobile
                  ? { className: 'h-full bg-pqBg p-[20px]' }
                  : {})}
              >
                <Web3Providers
                  onComplete={(code, newState) => {
                    window.location.href = `/integrations/social/${identifier}?code=${code}&state=${newState}${
                      onboarding ? '&onboarding=true' : ''
                    }`;
                  }}
                  nonce={url}
                />
              </div>
            ),
          });
          return;
        };
        const gotoIntegration = async (externalUrl?: string) => {
          // Mobile WebView: reuse the existing `externalUrl` param to
          // carry the `postqueen://` deep link so the backend redirects
          // back to the iOS/Android app after OAuth completes, instead
          // of the default web redirect.
          const params = [
            `externalUrl=${encodeURIComponent(externalUrl)}`,
            onboardingParam,
            isMobile
              ? `redirectUrl=${encodeURIComponent('postqueen://integrations')}`
              : '',
          ]
            .filter(Boolean)
            .join('&');
          const { url, err } = await (
            await fetch(
              `/integrations/social/${identifier}${params ? `?${params}` : ''}`
            )
          ).json();
          if (err) {
            toaster.show(
              t(
                'could_not_connect_to_platform',
                'Could not connect to the platform'
              ),
              'warning'
            );
            return;
          }

          if (invite) {
            toaster.show(
              'Invite link copied to clipboard, link will be available for 1 hour',
              'success'
            );
            modal.closeAll();
            copy(url);
            return;
          }

          if (isMobile) {
            // In the mobile WebView the OAuth provider (Google, Facebook,
            // etc.) typically refuses in-WebView sign-in. Post the URL
            // out to React Native so it can open the system browser;
            // `window.open`/`location.href` aren't reliable here because
            // RN WebView doesn't always route them through the native
            // navigation intercept. The backend redirects back to the
            // app via `postqueen://` once OAuth completes.
            const rn = (window as any).ReactNativeWebView;
            if (rn && typeof rn.postMessage === 'function') {
              rn.postMessage(JSON.stringify({ type: 'open-external', url }));
              return;
            }
            window.open(url, '_blank');
            return;
          }

          window.location.href = url;
        };
        if (isWeb3) {
          openWeb3();
          return;
        }
        if (isChromeExtension) {
          const confirmed = await new Promise<boolean>((resolve) => {
            modal.openModal({
              title: t('chrome_extension_notice', 'Browser Extension Notice'),
              withCloseButton: true,
              onClose: () => resolve(false),
              children: (
                <ChromeExtensionWarning
                  onConfirm={() => {
                    resolve(true);
                  }}
                  onCancel={() => {
                    resolve(false);
                  }}
                />
              ),
            });
          });
          if (!confirmed) {
            return;
          }
          if (!extensionId || !chrome?.runtime?.sendMessage) {
            modal.openModal({
              title: t('extension_not_available_title', 'Extension Not Found'),
              withCloseButton: true,
              children: <ExtensionNotFound />,
            });
            return;
          }
          try {
            await new Promise<void>((resolve, reject) => {
              chrome.runtime.sendMessage(
                extensionId,
                { type: 'PING' },
                (response: any) => {
                  if (chrome.runtime.lastError || !response?.status) {
                    reject(new Error('Extension not reachable'));
                  } else {
                    resolve();
                  }
                }
              );
            });
          } catch {
            toaster.show(
              t(
                'extension_not_installed',
                'PostQueen browser extension is not installed or not reachable.'
              ),
              'warning'
            );
            return;
          }
          try {
            const cookieResponse = await new Promise<any>((resolve, reject) => {
              chrome.runtime.sendMessage(
                extensionId,
                { type: 'GET_COOKIES', provider: identifier },
                (response: any) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(response);
                  }
                }
              );
            });
            if (!cookieResponse.success) {
              toaster.show(
                cookieResponse.error ||
                  t(
                    'extension_cookies_missing',
                    'Could not get cookies. Please log in to the platform first.'
                  ),
                'warning'
              );
              return;
            }
            const { url } = await (
              await fetch(
                `/integrations/social/${identifier}${
                  onboarding ? '?onboarding=true' : ''
                }`
              )
            ).json();
            modal.closeAll();
            window.location.href = `/integrations/social/${identifier}?state=${url}&code=${Buffer.from(
              JSON.stringify(cookieResponse.cookies)
            ).toString('base64')}${onboarding ? '&onboarding=true' : ''}`;
          } catch {
            toaster.show(
              t(
                'extension_communication_error',
                'Failed to communicate with the browser extension.'
              ),
              'warning'
            );
          }
          return;
        }
        if (isExternal) {
          modal.openModal({
            title: 'URL',
            withCloseButton: true,
            ...(isMobile ? { removeLayout: true, fullScreen: true } : {}),
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: <UrlModal gotoUrl={gotoIntegration} />,
          });
          return;
        }
        if (customFields) {
          modal.openModal({
            title: t('add_provider_title', 'Add Provider'),
            withCloseButton: true,
            ...(isMobile ? { removeLayout: true, fullScreen: true } : {}),
            classNames: {
              modal: 'bg-transparent text-textColor',
            },
            children: (
              <div
                {...(isMobile
                  ? { className: 'h-full bg-pqBg p-[20px]' }
                  : {})}
              >
                <CustomVariables
                  identifier={identifier}
                  gotoUrl={(url: string) => router.push(url)}
                  variables={customFields}
                  onboarding={onboarding}
                />
              </div>
            ),
          });
          return;
        }
        await gotoIntegration();
      },
    [onboarding]
  );

  const t = useT();
  // Whether *this* organization is trialing. The provider only says whether it
  // is lockable at all; the two together decide the tile.
  const user = useUser();

  // The design sorts this grid into five groups. The category comes from the
  // provider itself (`social.integrations.interface.ts`), not from a list kept
  // here — so a provider added without one lands in "Other" rather than
  // disappearing from the only screen that can connect it.
  const groups = useMemo(() => {
    const visible = social.filter((item) =>
      !inviteMode
        ? true
        : !item.isExternal &&
          !item.isWeb3 &&
          !item.isChromeExtension &&
          !item.customFields
    );
    const order: Array<[string, string]> = [
      ['social', t('category_social', 'Social')],
      ['chat', t('category_chat', 'Chat & communities')],
      ['video', t('category_video', 'Video & streaming')],
      ['business', t('category_business', 'Business & portfolio')],
      ['publishing', t('category_publishing', 'Blogs & newsletters')],
    ];
    const known = new Set(order.map(([key]) => key));
    return [
      ...order.map(([key, label]) => ({
        key,
        label,
        items: visible.filter((item) => item.category === key),
      })),
      {
        key: 'other',
        label: t('category_other', 'Other'),
        items: visible.filter(
          (item) => !item.category || !known.has(item.category)
        ),
      },
    ].filter((group) => group.items.length);
  }, [social, inviteMode, t]);

  if (step) {
    const guide = guides[step.identifier] || fallback(capitalize(step.name));
    return (
      <ProviderSetupStep
        item={step}
        guide={guide}
        locked={
          !!step.trialLocked &&
          (!!user?.isTrailing || !!user?.lifetimePaymentPending)
        }
        inviteMode={inviteMode}
        onboarding={onboarding}
        onBack={() => setStep(null)}
        onConnect={getSocialLink(
          inviteMode,
          step.identifier,
          step.isExternal,
          step.isWeb3,
          step.isChromeExtension,
          step.customFields
        )}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-[20px] rounded-[4px] relative">
      {!onboarding && (
        <div className="flex w-fit items-center gap-[3px] self-start rounded-[11px] bg-pqSettings p-[3px]">
          {(
            [
              [false, t('connect_myself', 'Connect myself'), CONNECT_MODE_ICONS.self],
              [true, t('invite_by_link', 'Invite by link'), CONNECT_MODE_ICONS.invite],
            ] as const
          ).map(([mode, label, icon]) => (
            <button
              key={label}
              type="button"
              data-connect-mode={mode ? 'invite' : 'self'}
              onClick={() => {
                setInviteMode(mode);
                props.onInviteModeChange?.(mode);
              }}
              className={clsx(
                'flex h-[32px] items-center gap-[7px] rounded-[9px] px-[14px] text-[12.5px] font-[600] transition-colors',
                inviteMode === mode
                  ? 'bg-pqInner text-pqText shadow-pqE1'
                  : 'bg-transparent text-pqMuted hover:text-pqText'
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                className="shrink-0"
                aria-hidden="true"
              >
                <path
                  d={icon}
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-[24px]">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-[10px]">
            {!onboarding && groups.length > 1 && (
              <div className="flex items-center gap-[10px]">
                <span className="shrink-0 whitespace-nowrap text-[11px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
                  {group.label}
                </span>
                <span
                  className="h-[1px] flex-1 bg-pqLine"
                  aria-hidden="true"
                />
              </div>
            )}
            <div
              className={clsx(
                isMobile && 'gap-[20px] flex flex-col',
                !isMobile &&
                  'grid gap-[12px] justify-items-center justify-center',
                isMobile ? {} : onboarding ? 'grid-cols-9' : 'grid-cols-4'
              )}
            >
              {group.items.map((item) => (
                <div
                  key={item.identifier}
                  data-provider={item.identifier}
                  // Still clickable when locked: the step behind it is where the
                  // reason lives. A tile that does nothing when pressed teaches
                  // nobody why.
                  {...(item.trialLocked &&
                  (user?.isTrailing || user?.lifetimePaymentPending)
                    ? { 'data-provider-trial-locked': '1' }
                    : {})}
                  onClick={() => setStep(item)}
                  {...(!!item.toolTip
                    ? {
                        'data-tooltip-id': 'tooltip',
                        'data-tooltip-content': item.toolTip,
                      }
                    : {})}
                  className={clsx(
                    isMobile
                      ? 'flex-row h-[72px] p-[16px]'
                      : 'h-[104px] flex-col justify-center px-[10px] py-[12px]',
                    'relative flex w-full cursor-pointer items-center gap-[10px] rounded-[12px] bg-pqInner text-[12.5px] font-[500] text-pqText shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-pqHover hover:shadow-[inset_0_0_0_1px_var(--brand)]'
                  )}
                >
                  {!!item.isNew && (
                    <span className="absolute start-0 top-0 z-[1] rounded-ss-[12px] rounded-ee-[10px] bg-pqBrand px-[10px] pb-[6px] pt-[5px] text-[9px] font-[700] leading-none tracking-[0.08em] text-pqOnBrand">
                      {t('new', 'NEW')}
                    </span>
                  )}
                  <div className="relative">
                    {/* No lock badge on the tile — owner: only show the lock
                        when the user opens the connect step (TrialLock below). */}
                    {item.identifier === 'youtube' ? (
                      <img src={`/icons/platforms/youtube.svg`} />
                    ) : (
                      <img
                        className={clsx(
                          'w-[32px] h-[32px]',
                          item.identifier !== 'google_my_business' &&
                            'rounded-full'
                        )}
                        src={`/icons/platforms/${item.identifier}.png`}
                      />
                    )}
                  </div>
                  <div
                    className={clsx(
                      isMobile ? '' : 'whitespace-pre-wrap',
                      'text-center'
                    )}
                  >
                    {item.name}
                    {!!item.toolTip && !isMobile && (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 26 26"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute top-[10px] end-[10px]"
                      >
                        <path
                          d="M13 0C10.4288 0 7.91543 0.762437 5.77759 2.1909C3.63975 3.61935 1.97351 5.64968 0.989572 8.02512C0.0056327 10.4006 -0.251811 13.0144 0.249797 15.5362C0.751405 18.0579 1.98953 20.3743 3.80762 22.1924C5.6257 24.0105 7.94208 25.2486 10.4638 25.7502C12.9856 26.2518 15.5995 25.9944 17.9749 25.0104C20.3503 24.0265 22.3807 22.3603 23.8091 20.2224C25.2376 18.0846 26 15.5712 26 13C25.9964 9.5533 24.6256 6.24882 22.1884 3.81163C19.7512 1.37445 16.4467 0.00363977 13 0ZM13 21C12.7033 21 12.4133 20.912 12.1667 20.7472C11.92 20.5824 11.7277 20.3481 11.6142 20.074C11.5007 19.7999 11.471 19.4983 11.5288 19.2074C11.5867 18.9164 11.7296 18.6491 11.9393 18.4393C12.1491 18.2296 12.4164 18.0867 12.7074 18.0288C12.9983 17.9709 13.2999 18.0007 13.574 18.1142C13.8481 18.2277 14.0824 18.42 14.2472 18.6666C14.412 18.9133 14.5 19.2033 14.5 19.5C14.5 19.8978 14.342 20.2794 14.0607 20.5607C13.7794 20.842 13.3978 21 13 21ZM14 14.91V15C14 15.2652 13.8946 15.5196 13.7071 15.7071C13.5196 15.8946 13.2652 16 13 16C12.7348 16 12.4804 15.8946 12.2929 15.7071C12.1054 15.5196 12 15.2652 12 15V14C12 13.7348 12.1054 13.4804 12.2929 13.2929C12.4804 13.1054 12.7348 13 13 13C14.6538 13 16 11.875 16 10.5C16 9.125 14.6538 8 13 8C11.3463 8 10 9.125 10 10.5V11C10 11.2652 9.89465 11.5196 9.70711 11.7071C9.51958 11.8946 9.26522 12 9.00001 12C8.73479 12 8.48044 11.8946 8.2929 11.7071C8.10536 11.5196 8.00001 11.2652 8.00001 11V10.5C8.00001 8.01875 10.2425 6 13 6C15.7575 6 18 8.01875 18 10.5C18 12.6725 16.28 14.4913 14 14.91Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
