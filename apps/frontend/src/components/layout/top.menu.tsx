'use client';

import { FC, ReactNode, useCallback } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { AgentMediaModal } from '@gitroom/frontend/components/layout/agent.media.modal';

interface MenuItemInterface {
  name: string;
  icon: ReactNode;
  path: string;
  role?: string[];
  hide?: boolean;
  requireBilling?: boolean;
  onClick?: () => void;
}

export const useMenuItem = () => {
  const { isGeneral } = useVariables();
  const t = useT();
  const { openModal } = useModals();

  const handleAgentMediaClick = useCallback(() => {
    openModal({
      title: t('agent_media_title', 'UGC videos by AgentMedia'),
      closeOnClickOutside: true,
      closeOnEscape: true,
      children: <AgentMediaModal />,
    });
  }, [openModal, t]);

  const firstMenu = [
    {
      name: t('dashboard', 'Dashboard'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/dashboard',
    },
    {
      name: t('clients', 'Clients'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3.5 20.5V5.3c0-.7 0-1.05.14-1.32.12-.24.31-.43.55-.55C4.45 3.3 4.8 3.3 5.5 3.3h4c.7 0 1.05 0 1.32.14.24.12.43.31.55.55.14.27.14.62.14 1.32V20.5M3.5 20.5h16M3.5 20.5H2M19.5 20.5V9.7c0-.7 0-1.05-.14-1.32a1.25 1.25 0 0 0-.55-.55c-.27-.14-.62-.14-1.32-.14h-2.99M6.5 6.9h1.5M6.5 10.1h1.5M6.5 13.3h1.5M6.5 16.5h1.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/clients',
    },
    {
      name: t('accounts', 'Accounts'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M18 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18 22.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.15 10.85l7.7-4.2M8.15 13.15l7.7 4.2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/accounts',
    },
    {
      name: isGeneral ? t('calendar', 'Calendar') : t('launches', 'Launches'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="21"
          height="23"
          viewBox="0 0 21 23"
          fill="none"
        >
          <path
            d="M19.5 9.5H1.5M14.5 1.5V5.5M6.5 1.5V5.5M6.3 21.5H14.7C16.3802 21.5 17.2202 21.5 17.862 21.173C18.4265 20.8854 18.8854 20.4265 19.173 19.862C19.5 19.2202 19.5 18.3802 19.5 16.7V8.3C19.5 6.61984 19.5 5.77976 19.173 5.13803C18.8854 4.57354 18.4265 4.1146 17.862 3.82698C17.2202 3.5 16.3802 3.5 14.7 3.5H6.3C4.61984 3.5 3.77976 3.5 3.13803 3.82698C2.57354 4.1146 2.1146 4.57354 1.82698 5.13803C1.5 5.77976 1.5 6.61984 1.5 8.3V16.7C1.5 18.3802 1.5 19.2202 1.82698 19.862C2.1146 20.4265 2.57354 20.8854 3.13803 21.173C3.77976 21.5 4.61984 21.5 6.3 21.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/launches',
    },
    {
      name: t('analytics', 'Analytics'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="19"
          viewBox="0 0 20 19"
          fill="none"
        >
          <path
            d="M18.5 18H3.01111C2.48217 18 2.2177 18 2.01568 17.8971C1.83797 17.8065 1.69349 17.662 1.60294 17.4843C1.5 17.2823 1.5 17.0178 1.5 16.4889V1M18.5 4.77778L13.3676 9.91019C13.1806 10.0972 13.0871 10.1907 12.9793 10.2257C12.8844 10.2565 12.7823 10.2565 12.6874 10.2257C12.5796 10.1907 12.4861 10.0972 12.2991 9.91019L10.5343 8.14537C10.3472 7.95836 10.2537 7.86486 10.1459 7.82982C10.0511 7.79901 9.94892 7.79901 9.85407 7.82982C9.74625 7.86486 9.65275 7.95836 9.46574 8.14537L5.27778 12.3333M18.5 4.77778H14.7222M18.5 4.77778V8.55556"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/analytics',
    },
    {
      name: t('post_library', 'Post Library'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M4 5.5c0-.7 0-1.05.14-1.32.12-.24.31-.43.55-.55C4.95 3.5 5.3 3.5 6 3.5h1c.7 0 1.05 0 1.32.14.24.12.43.31.55.55.14.27.14.62.14 1.32V19M4 5.5V19m0-13.5H2.6M8 5.5h2.5c.7 0 1.05 0 1.32.14.24.12.43.31.55.55.14.27.14.62.14 1.32V19M15.4 6.3l1.9-.5c.68-.18 1.02-.27 1.32-.2.26.06.49.22.64.44.17.25.26.6.44 1.28l2.5 9.4c.18.68.27 1.02.2 1.32-.06.26-.22.49-.44.64-.25.17-.6.26-1.28.44l-1.36.36M4 19h10M4 19H2.6M14 19h1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/post-library',
    },
    {
      name: t('media_library', 'Media Library'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M9 14.5l2 2 3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/media-library',
    },
    {
      name: t('plugs', 'Plugs'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="19"
          viewBox="0 0 18 19"
          fill="none"
        >
          <path
            d="M11.6711 6.21205C11.3397 5.88068 11.174 5.715 11.1119 5.52395C11.0573 5.35589 11.0573 5.17486 11.1119 5.00681C11.174 4.81575 11.3397 4.65007 11.6711 4.3187L14.0461 1.94369C13.4158 1.65867 12.7162 1.5 11.9795 1.5C9.20677 1.5 6.95901 3.74776 6.95901 6.5205C6.95901 6.93138 7.00837 7.33073 7.10148 7.71294C7.20119 8.12224 7.25104 8.32689 7.24219 8.45618C7.23292 8.59154 7.21274 8.66355 7.15032 8.78401C7.0907 8.89907 6.97646 9.0133 6.748 9.24177L1.52013 14.4696C0.826947 15.1628 0.826948 16.2867 1.52013 16.9799C2.21332 17.6731 3.3372 17.6731 4.03039 16.9799L9.25825 11.752C9.48672 11.5236 9.60095 11.4093 9.71601 11.3497C9.83647 11.2873 9.90848 11.2671 10.0438 11.2578C10.1731 11.249 10.3778 11.2988 10.7871 11.3985C11.1693 11.4916 11.5686 11.541 11.9795 11.541C14.7523 11.541 17 9.29325 17 6.5205C17 5.78382 16.8413 5.0842 16.5563 4.45394L14.1813 6.82895C13.8499 7.16032 13.6843 7.326 13.4932 7.38808C13.3252 7.44269 13.1441 7.44269 12.9761 7.38808C12.785 7.326 12.6193 7.16032 12.288 6.82895L11.6711 6.21205Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/plugs',
    },
    {
      name: t('integrations', 'Integrations'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="19"
          viewBox="0 0 20 19"
          fill="none"
        >
          <path
            d="M6.175 3.125C6.175 1.9514 7.1264 1 8.3 1C9.47361 1 10.425 1.9514 10.425 3.125V4.4H11.275C12.4632 4.4 13.0572 4.4 13.5258 4.59411C14.1507 4.85292 14.6471 5.34934 14.9059 5.97416C15.1 6.44277 15.1 7.03685 15.1 8.225H16.375C17.5486 8.225 18.5 9.1764 18.5 10.35C18.5 11.5236 17.5486 12.475 16.375 12.475H15.1V13.92C15.1 15.3481 15.1 16.0622 14.8221 16.6077C14.5776 17.0875 14.1875 17.4776 13.7077 17.7221C13.1622 18 12.4481 18 11.02 18H10.425V16.5125C10.425 15.4563 9.56874 14.6 8.5125 14.6C7.45626 14.6 6.6 15.4563 6.6 16.5125V18H5.58C4.15187 18 3.4378 18 2.89232 17.7221C2.41251 17.4776 2.02241 17.0875 1.77793 16.6077C1.5 16.0622 1.5 15.3481 1.5 13.92V12.475H2.775C3.94861 12.475 4.9 11.5236 4.9 10.35C4.9 9.1764 3.94861 8.225 2.775 8.225H1.5C1.5 7.03685 1.5 6.44277 1.69411 5.97416C1.95292 5.34934 2.44934 4.85292 3.07416 4.59411C3.54277 4.4 4.13685 4.4 5.325 4.4H6.175V3.125Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/third-party',
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  const secondMenu = [
    {
      name: t('billing', 'Billing'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="21"
          viewBox="0 0 20 21"
          fill="none"
        >
          <path
            d="M7.08341 12.7225C7.08341 13.7964 7.95397 14.667 9.02786 14.667H10.8334C11.984 14.667 12.9167 13.7343 12.9167 12.5837C12.9167 11.4331 11.984 10.5003 10.8334 10.5003H9.16675C8.01615 10.5003 7.08341 9.56759 7.08341 8.41699C7.08341 7.2664 8.01615 6.33366 9.16675 6.33366H10.9723C12.0462 6.33366 12.9167 7.20422 12.9167 8.2781M10.0001 5.08366V6.33366M10.0001 14.667V15.917M18.3334 10.5003C18.3334 15.1027 14.6025 18.8337 10.0001 18.8337C5.39771 18.8337 1.66675 15.1027 1.66675 10.5003C1.66675 5.89795 5.39771 2.16699 10.0001 2.16699C14.6025 2.16699 18.3334 5.89795 18.3334 10.5003Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/billing',
      role: ['ADMIN', 'SUPERADMIN'],
      requireBilling: true,
    },
    {
      name: t('settings', 'Settings'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="21"
          viewBox="0 0 20 21"
          fill="none"
        >
          <path
            d="M7.82912 16.6429L8.31616 17.7383C8.46094 18.0644 8.69722 18.3414 8.99635 18.5358C9.29547 18.7303 9.64458 18.8337 10.0013 18.8337C10.3581 18.8337 10.7072 18.7303 11.0063 18.5358C11.3055 18.3414 11.5417 18.0644 11.6865 17.7383L12.1736 16.6429C12.3469 16.2542 12.6386 15.9302 13.0069 15.717C13.3776 15.5032 13.8063 15.4121 14.2319 15.4568L15.4236 15.5837C15.7783 15.6212 16.1363 15.555 16.4541 15.3931C16.772 15.2312 17.0361 14.9806 17.2143 14.6716C17.3928 14.3628 17.4778 14.0089 17.4591 13.6527C17.4403 13.2966 17.3186 12.9535 17.1087 12.6651L16.4032 11.6957C16.152 11.3479 16.0177 10.9293 16.0199 10.5003C16.0198 10.0725 16.1553 9.65562 16.4069 9.30959L17.1125 8.34014C17.3223 8.05179 17.444 7.70872 17.4628 7.35255C17.4815 6.99639 17.3965 6.64244 17.218 6.33366C17.0398 6.02469 16.7757 5.77407 16.4578 5.61218C16.14 5.4503 15.782 5.3841 15.4273 5.42162L14.2356 5.54847C13.81 5.59317 13.3813 5.50209 13.0106 5.28829C12.6415 5.07387 12.3498 4.74812 12.1773 4.35773L11.6865 3.26236C11.5417 2.9363 11.3055 2.65925 11.0063 2.46482C10.7072 2.27039 10.3581 2.16693 10.0013 2.16699C9.64458 2.16693 9.29547 2.27039 8.99635 2.46482C8.69722 2.65925 8.46094 2.9363 8.31616 3.26236L7.82912 4.35773C7.65656 4.74812 7.36485 5.07387 6.99579 5.28829C6.62513 5.50209 6.19634 5.59317 5.77079 5.54847L4.57542 5.42162C4.22069 5.3841 3.8627 5.4503 3.54485 5.61218C3.22699 5.77407 2.96293 6.02469 2.78468 6.33366C2.60619 6.64244 2.52116 6.99639 2.5399 7.35255C2.55864 7.70872 2.68034 8.05179 2.89023 8.34014L3.59579 9.30959C3.8474 9.65562 3.9829 10.0725 3.98282 10.5003C3.9829 10.9282 3.8474 11.345 3.59579 11.6911L2.89023 12.6605C2.68034 12.9489 2.55864 13.2919 2.5399 13.6481C2.52116 14.0043 2.60619 14.3582 2.78468 14.667C2.96311 14.9758 3.2272 15.2263 3.54501 15.3882C3.86282 15.55 4.22072 15.6163 4.57542 15.579L5.76708 15.4522C6.19264 15.4075 6.62143 15.4986 6.99208 15.7124C7.36252 15.9262 7.65559 16.252 7.82912 16.6429Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.99985 13.0003C11.3806 13.0003 12.4999 11.881 12.4999 10.5003C12.4999 9.11961 11.3806 8.00033 9.99985 8.00033C8.61914 8.00033 7.49985 9.11961 7.49985 10.5003C7.49985 11.881 8.61914 13.0003 9.99985 13.0003Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      path: '/settings',
      role: ['ADMIN', 'USER', 'SUPERADMIN'],
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  return {
    all: [...firstMenu, ...secondMenu],
    firstMenu,
    secondMenu,
  };
};

export const TopMenu: FC = () => {
  const user = useUser();
  const { firstMenu, secondMenu } = useMenuItem();
  const { isGeneral, billingEnabled } = useVariables();
  return (
    <>
      <div className="flex flex-1 flex-col minCustom:gap-[16px] blurMe">
        {
          // @ts-ignore
          user?.orgId &&
            // @ts-ignore
            (user.tier !== 'FREE' || !isGeneral || !billingEnabled) &&
            firstMenu
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
                <MenuItem
                  path={item.path}
                  label={item.name}
                  icon={item.icon}
                  key={item.name}
                  onClick={item.onClick}
                />
              ))
        }
      </div>
      <div className="flex flex-col minCustom:gap-[20px] custom:gap-[8px] blurMe">
        {secondMenu
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
            <MenuItem
              path={item.path}
              label={item.name}
              icon={item.icon}
              key={item.name}
              onClick={item.onClick}
            />
          ))}
      </div>
    </>
  );
};
