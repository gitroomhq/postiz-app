'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useThemeMode } from '@gitroom/frontend/components/layout/mode.component';

/**
 * Theme-aware empty illustration (`/no-channels.svg` dark,
 * `/no-channels-colors.svg` light). Brand-colored Reddit / Facebook /
 * Instagram tiles on both themes. Used when a channel list or connect
 * surface has nothing yet — same art as the Channels empty state.
 */
export const NoChannelsArt: FC<{ className?: string }> = ({ className }) => {
  const { mode } = useThemeMode();
  return (
    <img
      src={mode === 'dark' ? '/no-channels.svg' : '/no-channels-colors.svg'}
      alt=""
      width={180}
      height={138}
      className={clsx('select-none', className)}
      draggable={false}
    />
  );
};

/** Compact empty fill for a 260px channel column under Add Channel. */
export const ChannelsListEmpty: FC<{ hint?: string }> = ({ hint }) => {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[14px] px-[10px] py-[28px] text-center group-[.sidebar]:hidden">
      <NoChannelsArt className="h-auto w-[140px]" />
      <div className="flex flex-col gap-[5px]">
        <div className="text-[13.5px] font-[600] text-pqText">
          {t('no_channels', 'No channels yet')}
        </div>
          <div className="text-[12.5px] leading-[1.45] text-pqMuted text-pretty">
          {hint ??
            t(
              'channels_list_empty_hint',
              'Connect an account to start scheduling from here.'
            )}
        </div>
      </div>
    </div>
  );
};

/** Centered empty for a full content pane (Channels detail, Analytics, Plugs). */
export const ChannelsPageEmpty: FC<{
  title?: string;
  description?: string;
  action?: ReactNode;
  artClassName?: string;
}> = ({ title, description, action, artClassName }) => {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[16px] p-[40px] text-center">
      <NoChannelsArt className={clsx('h-auto w-[180px]', artClassName)} />
      <div className="flex max-w-[400px] flex-col gap-[6px]">
        <div className="text-[18px] font-[600] text-pqText">
          {title ?? t('no_channels', 'No channels yet')}
        </div>
        <div className="text-[13.5px] leading-[1.55] text-pqMuted text-pretty">
          {description ??
            t(
              'connect_your_accounts',
              'Connect your social accounts to start scheduling, publishing, and analyzing — all in one place.'
            )}
        </div>
      </div>
      {action}
    </div>
  );
};
