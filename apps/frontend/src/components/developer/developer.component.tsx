'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal, useModals } from '@gitroom/frontend/components/layout/new-modal';
import { MediaBox } from '@gitroom/frontend/components/media/media.component';
import copy from 'copy-to-clipboard';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const useOAuthApp = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    const res = await fetch('/user/oauth-app');
    const text = await res.text();
    if (!text || text === 'null' || text === 'false') {
      return null;
    }
    return JSON.parse(text);
  }, []);
  return useSWR('oauth-app', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

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
      className="flex h-[30px] cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
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

export const DeveloperComponent: FC = () => {
  const fetch = useFetch();
  const toaster = useToaster();
  const decision = useDecisionModal();
  const modals = useModals();
  const t = useT();
  const { data: app, mutate } = useOAuthApp();
  const [plaintextSecret, setPlaintextSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [pictureId, setPictureId] = useState<string | undefined>(undefined);
  const [picturePath, setPicturePath] = useState<string | undefined>(undefined);

  const startEditing = useCallback(() => {
    if (!app) return;
    setName(app.name || '');
    setDescription(app.description || '');
    setRedirectUrl(app.redirectUrl || '');
    setPictureId(app.pictureId || undefined);
    setPicturePath(app.picture?.path || undefined);
    setEditing(true);
  }, [app]);

  const changeMedia = useCallback((selected: { id: string; path: string }[]) => {
    const media = Array.isArray(selected) ? selected[0] : selected;
    if (media) {
      setPictureId(media.id);
      setPicturePath(media.path);
    }
  }, []);

  const openMedia = useCallback(() => {
    modals.openModal({
      title: t('media_library', 'Media Library'),
      askClose: false,
      closeOnEscape: true,
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      children: (close: () => void) => (
        <MediaBox
          setMedia={changeMedia}
          closeModal={close}
        />
      ),
    });
  }, [modals, t, changeMedia]);

  const createApp = useCallback(async () => {
    if (!name || !redirectUrl) {
      toaster.show('Name and Redirect URL are required', 'warning');
      return;
    }
    try {
      const result = await (
        await fetch('/user/oauth-app', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            redirectUrl,
            pictureId,
          }),
        })
      ).json();

      if (result.clientSecret) {
        setPlaintextSecret(result.clientSecret);
        toaster.show(
          'App created! Copy your client secret now - it will only be shown once.',
          'success'
        );
      }
      setCreating(false);
      mutate();
    } catch {
      toaster.show('Failed to create app', 'warning');
    }
  }, [name, description, redirectUrl, pictureId]);

  const updateApp = useCallback(async () => {
    try {
      await fetch('/user/oauth-app', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          description,
          redirectUrl,
          pictureId,
        }),
      });
      toaster.show('App updated', 'success');
      setEditing(false);
      mutate();
    } catch {
      toaster.show('Failed to update app', 'warning');
    }
  }, [name, description, redirectUrl, pictureId]);

  const rotateSecret = useCallback(async () => {
    const approved = await decision.open({
      title: 'Rotate Client Secret?',
      description:
        'This will generate a new client secret and invalidate the current one. Any integrations using the old secret will stop working.',
      approveLabel: 'Rotate',
      cancelLabel: 'Cancel',
    });
    if (!approved) return;
    try {
      const result = await (
        await fetch('/user/oauth-app/rotate-secret', { method: 'POST' })
      ).json();
      if (result.clientSecret) {
        setPlaintextSecret(result.clientSecret);
        toaster.show(
          'Secret rotated! Copy your new client secret now.',
          'success'
        );
        mutate();
      }
    } catch {
      toaster.show('Failed to rotate secret', 'warning');
    }
  }, [decision]);

  const deleteApp = useCallback(async () => {
    const approved = await decision.open({
      title: 'Delete OAuth App?',
      description:
        'This will delete the OAuth application and revoke all user authorizations. This action cannot be undone.',
      approveLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!approved) return;
    try {
      await fetch('/user/oauth-app', { method: 'DELETE' });
      toaster.show('OAuth app deleted', 'success');
      setPlaintextSecret(null);
      mutate();
    } catch {
      toaster.show('Failed to delete app', 'warning');
    }
  }, [decision]);

  if (app === undefined) {
    return null;
  }

  // No app yet — show create prompt (pane header already explains OAuth)
  if (!app && !creating) {
    return (
      <div className="mt-[4px] overflow-hidden rounded-[14px] bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-start justify-between gap-[12px] border-b border-pqLine px-[18px] py-[16px]">
          <div className="min-w-0">
            <div className="text-[14px] font-[600] text-pqText">
              {t('oauth_application', 'OAuth Application')}
            </div>
            <div className="mt-[4px] text-[13px] leading-[1.5] text-pqMuted">
              {t(
                'oauth_app_empty_hint',
                'One app per workspace. Users authorize it once, then you receive a pos_ token for API, MCP, and CLI.'
              )}
            </div>
          </div>
          <a
            className="flex h-[30px] shrink-0 cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            href="https://docs.postqueen.ai/public-api/oauth"
            target="_blank"
            rel="noreferrer"
          >
            {t('read_the_docs', 'Docs')}
          </a>
        </div>
        <div className="p-[18px]">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-[38px] cursor-pointer items-center rounded-[10px] bg-pqBrand px-[16px] text-[13.5px] font-[600] text-white transition-[filter] hover:brightness-110"
          >
            {t('create_oauth_app', 'Create OAuth App')}
          </button>
        </div>
      </div>
    );
  }

  // Create form
  if (creating && !app) {
    return (
      <div className="mt-[4px] overflow-hidden rounded-[14px] bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="border-b border-pqLine px-[18px] py-[16px]">
          <div className="text-[15px] font-[600] text-pqText">
            {t('create_oauth_app', 'Create OAuth App')}
          </div>
          <div className="mt-[3px] text-[13px] text-pqMuted">
            {t(
              'fill_in_the_details_for_your_oauth_application',
              'Fill in the details for your OAuth application.'
            )}
          </div>
        </div>
        <div className="flex flex-col gap-[14px] p-[18px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-[600] text-pqMuted">
              {t('app_name', 'App Name')} *
            </label>
            <input
              className="h-[42px] rounded-[10px] bg-pqInner px-[14px] text-[13.5px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('my_application', 'My Application')}
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-[600] text-pqMuted">
              {t('description', 'Description')}
            </label>
            <textarea
              className="min-h-[88px] resize-y rounded-[10px] bg-pqInner p-[14px] text-[13.5px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                'describe_what_your_app_does',
                'Describe what your app does'
              )}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-[600] text-pqMuted">
              {t('profile_picture', 'Profile Picture')}
            </label>
            <div className="flex items-center gap-[12px]">
              {picturePath ? (
                <img
                  src={picturePath}
                  alt="App picture"
                  className="h-[48px] w-[48px] rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-pqSettings text-pqMuted">
                  ?
                </div>
              )}
              <button
                type="button"
                onClick={openMedia}
                className="flex h-[34px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[12px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
              >
                {t('choose_image', 'Choose Image')}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-[600] text-pqMuted">
              {t('redirect_url', 'Redirect URL')} *
            </label>
            <input
              className="h-[42px] rounded-[10px] bg-pqInner px-[14px] text-[13.5px] text-pqText outline-none shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1px_var(--brand)]"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://yourapp.com/callback"
            />
          </div>
          <div className="flex gap-[8px] pt-[4px]">
            <button
              type="button"
              onClick={createApp}
              className="flex h-[38px] cursor-pointer items-center rounded-[10px] bg-pqBrand px-[16px] text-[13.5px] font-[600] text-white transition-[filter] hover:brightness-110"
            >
              {t('create', 'Create')}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex h-[38px] cursor-pointer items-center rounded-[10px] bg-pqSettings px-[16px] text-[13.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
            >
              {t('cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // App exists — show details
  return (
    <div className="mt-[4px] flex flex-col gap-[14px]">
      <div className="overflow-hidden rounded-[14px] bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex items-start justify-between gap-[12px] border-b border-pqLine px-[18px] py-[16px]">
          <div>
            <div className="text-[15px] font-[600] text-pqText">
              {t('oauth_application', 'OAuth Application')}
            </div>
            <div className="mt-[3px] text-[13px] text-pqMuted">
              {t(
                'manage_your_oauth_application',
                'Manage your OAuth application for third-party integrations.'
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-[6px] pt-[2px]">
            <a
              className="flex h-[30px] cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
              href="https://docs.postqueen.ai/public-api/oauth"
              target="_blank"
              rel="noreferrer"
            >
              {t('read_the_docs', 'Docs')}
            </a>
          </div>
        </div>

        {editing ? (
          <div className="p-[20px] flex flex-col gap-[16px]">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-[600] text-pqMuted">
                {t('app_name', 'App Name')} *
              </label>
              <input
                className="bg-pqInner border border-pqBorder rounded-[8px] px-[16px] h-[44px] text-pqText outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Application"
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-[600] text-pqMuted">
                {t('description', 'Description')}
              </label>
              <textarea
                className="bg-pqInner border border-pqBorder rounded-[8px] p-[16px] text-pqText outline-none min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your app does"
                maxLength={500}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-[600] text-pqMuted">
                {t('profile_picture', 'Profile Picture')}
              </label>
              <div className="flex items-center gap-[12px]">
                {picturePath ? (
                  <img
                    src={picturePath}
                    alt="App picture"
                    className="w-[48px] h-[48px] rounded-full object-cover"
                  />
                ) : (
                  <div className="w-[48px] h-[48px] rounded-full bg-pqSettings flex items-center justify-center text-pqMuted">
                    ?
                  </div>
                )}
                <button
                  type="button"
                  onClick={openMedia}
                  className="flex h-[30px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
                >
                  {t('choose_image', 'Choose Image')}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-[600] text-pqMuted">
                {t('redirect_url', 'Redirect URL')} *
              </label>
              <input
                className="bg-pqInner border border-pqBorder rounded-[8px] px-[16px] h-[44px] text-pqText outline-none"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourapp.com/callback"
              />
            </div>
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={updateApp}
                className="flex h-[34px] cursor-pointer items-center rounded-pqSm bg-pqBrand px-[13px] text-[13px] font-[600] text-white transition-[filter] hover:brightness-110"
              >
                {t('save', 'Save')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex h-[34px] cursor-pointer items-center rounded-pqSm bg-pqSettings px-[13px] text-[13px] font-[600] text-pqText transition-colors hover:bg-pqHover"
              >
                {t('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-[20px] flex flex-col gap-[16px]">
            <div className="flex items-center gap-[12px]">
              {app.picture?.path ? (
                <img
                  src={app.picture.path}
                  alt={app.name}
                  className="w-[48px] h-[48px] rounded-full object-cover"
                />
              ) : (
                <div className="w-[48px] h-[48px] rounded-full bg-pqSettings flex items-center justify-center text-pqMuted text-[18px] font-[600]">
                  {app.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="text-[15px] font-[600]">{app.name}</div>
                {app.description && (
                  <div className="text-pqMuted text-[13px]">
                    {app.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-[4px]">
              <div className="text-[13px] font-[600] text-pqMuted">
                {t('redirect_url', 'Redirect URL')}
              </div>
              <div className="text-[14px]">{app.redirectUrl}</div>
            </div>
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={startEditing}
                className="flex h-[30px] cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                {t('edit_app', 'Edit App')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Credentials */}
      <div className="overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="bg-pqInner px-[20px] py-[14px] border-b border-pqBorder">
          <div className="text-[15px] font-[600]">
            {t('credentials', 'Credentials')}
          </div>
        </div>
        <div className="p-[20px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <div className="text-[13px] font-[600] text-pqMuted">
              {t('client_id', 'Client ID')}
            </div>
            <div className="bg-pqInner border border-pqBorder rounded-[8px] px-[16px] h-[44px] flex items-center overflow-hidden">
              <code className="text-[14px] flex-1 truncate">{app.clientId}</code>
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <div className="text-[13px] font-[600] text-pqMuted">
              {t('client_secret', 'Client Secret')}
            </div>
            <div className="bg-pqInner border border-pqBorder rounded-[8px] px-[16px] h-[44px] flex items-center overflow-hidden">
              {plaintextSecret ? (
                <code className="text-[14px] flex-1 truncate">
                  {plaintextSecret}
                </code>
              ) : (
                <span className="text-pqMuted text-[13px]">
                  {t(
                    'secret_only_shown_on_creation',
                    'Secret is only shown on creation or rotation'
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-[8px]">
            <CopyButton text={app.clientId} label={t('copy_id', 'Copy ID')} />
            {plaintextSecret && (
              <CopyButton
                text={plaintextSecret}
                label={t('copy_secret', 'Copy Secret')}
              />
            )}
            <button
              type="button"
              onClick={rotateSecret}
              className="flex h-[30px] cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 11-.57-8.38L21.5 8" /></svg>
              {t('rotate_secret', 'Rotate Secret')}
            </button>
            <button
              type="button"
              onClick={deleteApp}
              className="flex h-[30px] cursor-pointer items-center gap-[6px] rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqWarn transition-colors hover:bg-pqHover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              {t('delete_app', 'Delete App')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
