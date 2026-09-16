'use client';

import { FC, useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  channelPlatformIcon,
  isUsableChannelPicture,
} from '@gitroom/frontend/components/new-launch/channel-picture';

export { channelPlatformIcon, isUsableChannelPicture };

export const ChannelAvatar: FC<{
  integration: {
    picture?: string | null;
    identifier: string;
    name?: string;
  };
  size: number;
  rounded?: 'full' | 'lg';
  className?: string;
  /** Corner platform badge. Off when the face already is the platform icon. */
  badge?: boolean;
  badgeSize?: number;
}> = ({
  integration,
  size,
  rounded = 'lg',
  className,
  badge,
  badgeSize = 14,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [integration.picture]);

  const showPhoto = isUsableChannelPicture(integration.picture) && !failed;
  const showBadge = badge ?? showPhoto;
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-[8px]';
  const iconSrc = channelPlatformIcon(integration.identifier);

  return (
    <span
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span
        className={clsx(
          'flex h-full w-full items-center justify-center overflow-hidden bg-pqTableHeader',
          radius
        )}
      >
        {showPhoto ? (
          <img
            src={integration.picture!}
            alt={integration.name || integration.identifier}
            width={size}
            height={size}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <img
            src={iconSrc}
            alt=""
            width={Math.round(size * 0.64)}
            height={Math.round(size * 0.64)}
            className="h-[64%] w-[64%] object-contain"
          />
        )}
      </span>
      {showBadge && (
        <img
          src={iconSrc}
          alt=""
          width={badgeSize}
          height={badgeSize}
          className={clsx(
            'absolute z-10',
            rounded === 'full'
              ? '-bottom-[1px] -end-[1px]'
              : 'bottom-[2px] end-[2px]',
            integration.identifier === 'youtube'
              ? 'min-w-[14px]'
              : 'rounded-[3px]'
          )}
        />
      )}
    </span>
  );
};
