'use client';

import { FC } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const useMenuItems = () => {
  const { isGeneral } = useVariables();
  return [
    ...(!isGeneral
      ? [
          {
            name: 'Analytics',
            icon: 'analytics',
            path: '/analytics',
          },
        ]
      : []),
    {
      name: isGeneral ? 'Calendar' : 'Launches',
      icon: 'launches',
      path: '/launches',
    },
    ...(isGeneral
      ? [
          {
            name: 'Analytics',
            icon: 'analytics',
            path: '/analytics',
          },
        ]
      : []),
    ...(!isGeneral
      ? [
          {
            name: 'Settings',
            icon: 'settings',
            path: '/settings',
            role: ['ADMIN', 'SUPERADMIN'],
          },
        ]
      : []),
    {
      name: 'Plugs',
      icon: 'plugs',
      path: '/plugs',
    },
    {
      name: 'Billing',
      icon: 'billing',
      path: '/billing',
      role: ['ADMIN', 'SUPERADMIN'],
      requireBilling: true,
    },
    {
      name: 'Settings',
      icon: 'settings',
      path: '/settings',
      role: ['ADMIN', 'SUPERADMIN'],
      hide: true,
    },
    // {
    //   name: 'Affiliate',
    //   icon: 'affiliate',
    //   path: 'https://affiliate.publica.com',
    //   role: ['ADMIN', 'SUPERADMIN', 'USER'],
    //   requireBilling: true,
    // },
  ];
};

export const TopMenu: FC = () => {
  const path = usePathname();
  const user = useUser();
  const { billingEnabled } = useVariables();
  const menuItems = useMenuItems();
  return (
    <div className="flex flex-col h-full animate-normalFadeDown order-3 md:order-2 col-span-2 md:col-span-1">
      <ul className="gap-0 md:gap-5 flex flex-1 items-center text-[18px]">
        {menuItems
          .filter((f) => {
            if (f.hide) {
              return false;
            }
            if (f.requireBilling && !billingEnabled) {
              return false;
            }
            if (f.name === 'Billing' && user?.isLifetime) {
              return false;
            }
            if (f.role) {
              return f.role.includes(user?.role!);
            }
            return true;
          })
          .map((item, index) => (
            <li key={item.name}>
              <Link
                prefetch={true}
                target={item.path.indexOf('http') > -1 ? '_blank' : '_self'}
                href={item.path}
                className={clsx(
                  'flex gap-2 items-center box px-[6px] md:px-[24px] py-[8px]',
                  menuItems
                    .filter((f) => {
                      if (f.hide) {
                        return false;
                      }
                      if (f.role) {
                        return f.role.includes(user?.role!);
                      }
                      return true;
                    })
                    .map((p) => (path.indexOf(p.path) > -1 ? index : -1))
                    .indexOf(index) === index
                    ? 'text-primary showbox'
                    : 'text-gray'
                )}
              >
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
};
