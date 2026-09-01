'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { useSettingsTabs } from '@gitroom/frontend/components/settings/use-settings-tabs';

export const SettingsSidebar = () => {
  const { list, showLogout } = useSettingsTabs();
  const pathname = usePathname();

  return (
    <div className="bg-newBgColorInner p-[20px] flex flex-col transition-all w-[260px]">
      <div className="flex flex-1 flex-col minCustom:gap-[6px] custom:gap-[4px]">
        {list.map(({ tab, label }) => {
          const href = `/settings/${tab}`;
          const isActive = pathname === href;
          return (
            <Link
              key={tab}
              href={href}
              className={clsx(
                'group cursor-pointer flex items-center gap-[12px] hover:bg-boxHover rounded-e-[8px]',
                isActive && 'bg-boxHover'
              )}
            >
              <div
                className={clsx(
                  'h-full w-[4px] rounded-s-[3px] opacity-0 group-hover:opacity-100 transition-opacity',
                  isActive && 'opacity-100'
                )}
              >
                <SVGLine />
              </div>
              {label}
            </Link>
          );
        })}
      </div>
      <div>
        {showLogout && (
          <div className="mt-4">
            <LogoutComponent />
          </div>
        )}
      </div>
    </div>
  );
};
