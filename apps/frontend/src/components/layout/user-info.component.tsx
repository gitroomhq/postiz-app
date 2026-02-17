'use client';

import { FC } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import clsx from 'clsx';

interface UserInfoProps {
  compact?: boolean;
  showEmail?: boolean;
}

export const UserInfo: FC<UserInfoProps> = ({ compact = false, showEmail = true }) => {
  const user = useUser();

  if (!user) {
    return null;
  }

  const displayName = user.name 
    ? (user.lastName ? `${user.name} ${user.lastName}` : user.name)
    : null;
  
  const hasName = !!displayName;
  const hasEmail = !!user.email && showEmail;

  // If nothing to display, return null
  if (!hasName && !hasEmail) {
    return null;
  }

  const avatarSize = compact ? 'w-[32px] h-[32px]' : 'w-[40px] h-[40px]';
  const textSize = compact ? 'text-[12px]' : 'text-[14px]';
  const emailSize = compact ? 'text-[10px]' : 'text-[12px]';

  return (
    <div className={clsx(
      'flex items-center gap-[12px]',
      compact ? 'p-[8px]' : 'p-[12px]'
    )}>
      
      {/* Name and Email */}
      {(hasName || hasEmail) && (
        <div className="flex flex-col min-w-0 flex-1">
          {hasName && (
            <div className={clsx(
              'font-[500] text-newTextColor truncate',
              textSize
            )}>
              {displayName}
            </div>
          )}
          {hasEmail && (
            <div className={clsx(
              'text-textItemBlur truncate',
              emailSize
            )}>
              {user.email}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

