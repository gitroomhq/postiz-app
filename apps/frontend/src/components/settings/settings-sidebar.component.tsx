'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import {
  SettingsTab,
  useSettingsTabs,
} from '@gitroom/frontend/components/settings/use-settings-tabs';

// Same authoring convention as the main sidebar's icons (top.menu.tsx):
// inline SVGs, fill="none", stroke="currentColor", strokeWidth="1.5",
// rounded caps/joins, on a 20x20 viewBox.
const tabIcon: Record<SettingsTab, ReactNode> = {
  // Same gear as the shared SettingsIcon, but outlined instead of filled
  // with its usual purple center dot - SettingsIcon's two-tone look is
  // intentional where it's used elsewhere (e.g. new-launch/manage.modal.tsx
  // on a colored button), not a fit for this monochrome icon row.
  'global-settings': (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M7.82888 16.1419L8.31591 17.2373C8.4607 17.5634 8.69698 17.8404 8.9961 18.0348C9.29522 18.2293 9.64434 18.3327 10.0011 18.3327C10.3579 18.3327 10.707 18.2293 11.0061 18.0348C11.3052 17.8404 11.5415 17.5634 11.6863 17.2373L12.1733 16.1419C12.3467 15.7533 12.6383 15.4292 13.0067 15.216C13.3773 15.0022 13.8061 14.9111 14.2317 14.9558L15.4233 15.0827C15.778 15.1202 16.136 15.054 16.4539 14.8921C16.7717 14.7302 17.0358 14.4796 17.2141 14.1706C17.3925 13.8619 17.4776 13.5079 17.4588 13.1518C17.4401 12.7956 17.3184 12.4525 17.1085 12.1642L16.403 11.1947C16.1517 10.847 16.0175 10.4284 16.0196 9.99935C16.0195 9.57151 16.155 9.15464 16.4067 8.80861L17.1122 7.83916C17.3221 7.55081 17.4438 7.20774 17.4625 6.85158C17.4813 6.49541 17.3962 6.14147 17.2178 5.83268C17.0395 5.52371 16.7754 5.27309 16.4576 5.1112C16.1397 4.94932 15.7817 4.88312 15.427 4.92065L14.2354 5.0475C13.8098 5.09219 13.381 5.00112 13.0104 4.78731C12.6413 4.57289 12.3496 4.24715 12.177 3.85676L11.6863 2.76139C11.5415 2.43532 11.3052 2.15828 11.0061 1.96385C10.707 1.76942 10.3579 1.66596 10.0011 1.66602C9.64434 1.66596 9.29522 1.76942 8.9961 1.96385C8.69698 2.15828 8.4607 2.43532 8.31591 2.76139L7.82888 3.85676C7.65632 4.24715 7.3646 4.57289 6.99554 4.78731C6.62489 5.00112 6.1961 5.09219 5.77054 5.0475L4.57517 4.92065C4.22045 4.88312 3.86246 4.94932 3.5446 5.1112C3.22675 5.27309 2.96269 5.52371 2.78443 5.83268C2.60595 6.14147 2.52092 6.49541 2.53965 6.85158C2.55839 7.20774 2.68009 7.55081 2.88999 7.83916L3.59554 8.80861C3.84716 9.15464 3.98266 9.57151 3.98258 9.99935C3.98266 10.4272 3.84716 10.8441 3.59554 11.1901L2.88999 12.1595C2.68009 12.4479 2.55839 12.791 2.53965 13.1471C2.52092 13.5033 2.60595 13.8572 2.78443 14.166C2.96286 14.4748 3.22696 14.7253 3.54476 14.8872C3.86257 15.049 4.22047 15.1153 4.57517 15.0781L5.76684 14.9512C6.1924 14.9065 6.62119 14.9976 6.99184 15.2114C7.36228 15.4252 7.65535 15.751 7.82888 16.1419Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  organizations: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M8 5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  teams: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6.5" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.8 17.2c0-3.4 2.3-6 5.2-6s5.2 2.6 5.2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14.3" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.9 11.3c.7-.4 1.5-.6 2.4-.6c2.7 0 4.9 2.3 4.9 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  webhooks: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="3.6" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="16.4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16.4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5.6v3.6M10 9.2l-4.7 5.6M10 9.2l4.7 5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  autopost: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="9.5" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 7.5V11l2.8 1.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 3.5a8.2 8.2 0 0 1 2.3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 5.2l1 1.6l1.6-.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sets: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5l7.5 4.2L10 11l-7.5-4.3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 10.8L10 15l7.5-4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 14.3L10 18.5l7.5-4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  signatures: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M13.4 2.9a1.7 1.7 0 0 1 2.4 2.4L7.5 13.6l-3.2.8l.8-3.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 17.5c1.3-1.3 2.6-1.3 3.9 0s2.6 1.3 3.9 0s2.6-1.3 3.9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  api: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M7 6L2.5 10L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6L17.5 10L13 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'approved-apps': (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.2l6.5 2.6v4.7c0 4.7-3.2 7.1-6.5 8.3c-3.3-1.2-6.5-3.6-6.5-8.3V4.8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10l2 2l4-4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

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
              <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                {tabIcon[tab]}
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
