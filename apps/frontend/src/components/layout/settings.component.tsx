'use client';

import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import React, {
  FC,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { TeamsComponent } from '@gitroom/frontend/components/settings/teams.component';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { PublicComponent } from '@gitroom/frontend/components/public-api/public.component';
import Link from 'next/link';
import { Webhooks } from '@gitroom/frontend/components/webhooks/webhooks';
import { Sets } from '@gitroom/frontend/components/sets/sets';
import { SignaturesComponent } from '@gitroom/frontend/components/settings/signatures.component';
import { Autopost } from '@gitroom/frontend/components/autopost/autopost';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';
import { GlobalSettings } from '@gitroom/frontend/components/settings/global.settings';
export const SettingsPopup: FC<{
  getRef?: Ref<any>;
}> = (props) => {
  const { isGeneral } = useVariables();
  const { getRef } = props;
  const fetch = useFetch();
  const toast = useToaster();
  const swr = useSWRConfig();
  const user = useUser();
  const resolver = useMemo(() => {
    return classValidatorResolver(UserDetailDto);
  }, []);
  const form = useForm({
    resolver,
  });
  const picture = form.watch('picture');
  const modal = useModals();
  const close = useCallback(() => {
    return modal.closeAll();
  }, []);
  const url = useSearchParams();
  const showLogout = !url.get('onboarding') || user?.tier?.current === 'FREE';
  const loadProfile = useCallback(async () => {
    const personal = await (await fetch('/user/personal')).json();
    form.setValue('fullname', personal.name || '');
    form.setValue('bio', personal.bio || '');
    form.setValue('picture', personal.picture);
  }, []);
  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      form.setValue('picture', values);
    });
  }, []);
  const remove = useCallback(() => {
    form.setValue('picture', null);
  }, []);

  const submit = useCallback(async (val: any) => {
    await fetch('/user/personal', {
      method: 'POST',
      body: JSON.stringify(val),
    });
    if (getRef) {
      return;
    }
    toast.show('Profile updated');
    swr.mutate('/marketplace/account');
    close();
  }, []);

  const [tab, setTab] = useState('global_settings');

  const t = useT();
  const list = useMemo(() => {
    const arr = [];
    arr.push({ tab: 'global_settings', label: t('global_settings', 'Global Settings') });
    // Populate tabs based on user permissions
    if (user?.tier?.team_members && isGeneral) {
      arr.push({ tab: 'teams', label: t('teams', 'Teams') });
    }
    if (user?.tier?.webhooks) {
      arr.push({ tab: 'webhooks', label: t('webhooks_1', 'Webhooks') });
    }
    if (user?.tier?.autoPost) {
      arr.push({ tab: 'autopost', label: t('auto_post', 'Auto Post') });
    }
    if (user?.tier.current !== 'FREE') {
      arr.push({ tab: 'sets', label: t('sets', 'Sets') });
    }
    if (user?.tier.current !== 'FREE') {
      arr.push({ tab: 'signatures', label: t('signatures', 'Signatures') });
    }
    if (user?.tier?.public_api && isGeneral && showLogout) {
      arr.push({ tab: 'api', label: t('public_api', 'Public API') });
    }

    return arr;
  }, [user, isGeneral, showLogout, t]);

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <>
      <div className="bg-newBgColorInner p-[20px] flex flex-col transition-all w-[260px]">
        <div className="flex flex-1 flex-col gap-[15px]">
          {list.map(({ tab: tabKey, label }) => (
            <div
              key={tabKey}
              className={clsx(
                'cursor-pointer flex items-center gap-[12px] group/profile hover:bg-boxHover rounded-e-[8px]',
                tabKey === tab && 'bg-boxHover'
              )}
              onClick={() => setTab(tabKey)}
            >
              <div
                className={clsx(
                  'h-full w-[4px] rounded-s-[3px] opacity-0 group-hover/profile:opacity-100 transition-opacity',
                  tabKey === tab && 'opacity-100'
                )}
              >
                <SVGLine />
              </div>
              {label}
            </div>
          ))}
        </div>
        <div>
          {showLogout && (
            <div className="mt-4">
              <LogoutComponent />
            </div>
          )}
        </div>
      </div>
      <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(submit)}>
            {!!getRef && (
              <button type="submit" className="hidden" ref={getRef}></button>
            )}
            <div
              className={clsx(
                'w-full mx-auto gap-[24px] flex flex-col relative',
                !getRef && 'rounded-[4px]'
              )}
            >
              {tab === 'global_settings' && (
                <div>
                  <GlobalSettings />
                </div>
              )}
              {tab === 'teams' && !!user?.tier?.team_members && isGeneral && (
                <div>
                  <TeamsComponent />
                </div>
              )}

              {tab === 'webhooks' && !!user?.tier?.webhooks && (
                <div>
                  <Webhooks />
                </div>
              )}

              {tab === 'autopost' && !!user?.tier?.autoPost && (
                <div>
                  <Autopost />
                </div>
              )}

              {tab === 'sets' && user?.tier.current !== 'FREE' && (
                <div>
                  <Sets />
                </div>
              )}

              {tab === 'signatures' && user?.tier.current !== 'FREE' && (
                <div>
                  <SignaturesComponent />
                </div>
              )}

              {tab === 'api' &&
                !!user?.tier?.public_api &&
                isGeneral &&
                showLogout && (
                  <div>
                    <PublicComponent />
                  </div>
                )}
            </div>
          </form>
        </FormProvider>
      </div>
    </>
  );
};
export const SettingsComponent = () => {
  const settings = useModals();
  const user = useUser();
  const openModal = useCallback(() => {
    if (user?.tier.current !== 'FREE') {
      return;
    }
    settings.openModal({
      children: (
        <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] w-[500px] mx-auto">
          <SettingsPopup />
        </div>
      ),
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      size: '100%',
    });
  }, [user]);
  return (
    <Link href="/settings" onClick={openModal}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-pointer relative z-[200]"
      >
        <path
          d="M19.9987 15.5C19.1087 15.5 18.2387 15.7639 17.4986 16.2584C16.7586 16.7528 16.1818 17.4556 15.8413 18.2779C15.5007 19.1002 15.4115 20.005 15.5852 20.8779C15.7588 21.7508 16.1874 22.5526 16.8167 23.182C17.4461 23.8113 18.2479 24.2399 19.1208 24.4135C19.9937 24.5871 20.8985 24.498 21.7208 24.1574C22.5431 23.8168 23.2459 23.2401 23.7403 22.5C24.2348 21.76 24.4987 20.89 24.4987 20C24.4975 18.8069 24.023 17.663 23.1793 16.8194C22.3357 15.9757 21.1918 15.5012 19.9987 15.5ZM19.9987 23C19.4054 23 18.8254 22.824 18.332 22.4944C17.8387 22.1647 17.4541 21.6962 17.2271 21.148C17 20.5999 16.9406 19.9967 17.0564 19.4147C17.1721 18.8328 17.4578 18.2982 17.8774 17.8787C18.297 17.4591 18.8315 17.1734 19.4134 17.0576C19.9954 16.9419 20.5986 17.0013 21.1468 17.2283C21.6949 17.4554 22.1635 17.8399 22.4931 18.3333C22.8228 18.8266 22.9987 19.4066 22.9987 20C22.9987 20.7956 22.6826 21.5587 22.12 22.1213C21.5574 22.6839 20.7944 23 19.9987 23ZM30.3056 18.0509C30.2847 17.9453 30.2413 17.8454 30.1784 17.7581C30.1155 17.6707 30.0345 17.5979 29.9409 17.5447L27.1443 15.9509L27.1331 12.799C27.1327 12.6905 27.1089 12.5833 27.063 12.4849C27.0172 12.3865 26.9506 12.2992 26.8678 12.229C25.8533 11.3709 24.6851 10.7134 23.4253 10.2912C23.3261 10.2577 23.2209 10.2452 23.1166 10.2547C23.0123 10.2643 22.9111 10.2955 22.8197 10.3465L19.9987 11.9234L17.175 10.3437C17.0834 10.2924 16.9821 10.2609 16.8776 10.2513C16.7732 10.2416 16.6678 10.2539 16.5684 10.2875C15.3095 10.7127 14.1426 11.3728 13.1297 12.2328C13.0469 12.3028 12.9804 12.39 12.9346 12.4882C12.8888 12.5865 12.8648 12.6935 12.8643 12.8019L12.8503 15.9565L10.0537 17.5503C9.96015 17.6036 9.87916 17.6763 9.81623 17.7637C9.7533 17.8511 9.70992 17.9509 9.68903 18.0565C9.43309 19.3427 9.43309 20.6667 9.68903 21.9528C9.70992 22.0584 9.7533 22.1583 9.81623 22.2456C9.87916 22.333 9.96015 22.4058 10.0537 22.459L12.8503 24.0528L12.8615 27.2047C12.8619 27.3132 12.8858 27.4204 12.9316 27.5188C12.9774 27.6172 13.044 27.7045 13.1268 27.7747C14.1413 28.6328 15.3095 29.2904 16.5693 29.7125C16.6686 29.7461 16.7737 29.7585 16.878 29.749C16.9823 29.7394 17.0835 29.7082 17.175 29.6572L19.9987 28.0765L22.8225 29.6562C22.9342 29.7185 23.0602 29.7508 23.1881 29.75C23.27 29.75 23.3514 29.7367 23.429 29.7106C24.6878 29.286 25.8547 28.6265 26.8678 27.7672C26.9505 27.6971 27.017 27.61 27.0628 27.5117C27.1087 27.4135 27.1326 27.3065 27.1331 27.1981L27.1472 24.0434L29.9437 22.4497C30.0373 22.3964 30.1183 22.3236 30.1812 22.2363C30.2441 22.1489 30.2875 22.049 30.3084 21.9434C30.5629 20.6583 30.562 19.3357 30.3056 18.0509ZM28.8993 21.3237L26.2209 22.8472C26.1035 22.9139 26.0064 23.0111 25.9397 23.1284C25.8853 23.2222 25.8281 23.3215 25.77 23.4153C25.6956 23.5335 25.6559 23.6703 25.6556 23.81L25.6415 26.8334C24.9216 27.3988 24.1195 27.8509 23.2631 28.174L20.5612 26.6684C20.449 26.6064 20.3228 26.5741 20.1947 26.5747H20.1768C20.0634 26.5747 19.949 26.5747 19.8356 26.5747C19.7014 26.5713 19.5688 26.6037 19.4512 26.6684L16.7475 28.1778C15.8892 27.8571 15.0849 27.4072 14.3625 26.8437L14.3522 23.825C14.3517 23.685 14.3121 23.548 14.2378 23.4294C14.1797 23.3356 14.1225 23.2419 14.069 23.1425C14.0028 23.0233 13.9056 22.9242 13.7878 22.8556L11.1065 21.3284C10.9678 20.4507 10.9678 19.5567 11.1065 18.679L13.7803 17.1528C13.8976 17.0861 13.9948 16.9889 14.0615 16.8715C14.1159 16.7778 14.1731 16.6784 14.2312 16.5847C14.3056 16.4664 14.3453 16.3297 14.3456 16.19L14.3597 13.1665C15.0796 12.6012 15.8816 12.1491 16.7381 11.8259L19.4362 13.3315C19.5536 13.3966 19.6864 13.429 19.8206 13.4253C19.934 13.4253 20.0484 13.4253 20.1618 13.4253C20.296 13.4286 20.4287 13.3963 20.5462 13.3315L23.25 11.8222C24.1082 12.1429 24.9125 12.5927 25.635 13.1562L25.6453 16.175C25.6457 16.3149 25.6854 16.452 25.7597 16.5706C25.8178 16.6644 25.875 16.7581 25.9284 16.8575C25.9947 16.9767 26.0918 17.0758 26.2097 17.1444L28.8909 18.6715C29.0315 19.5499 29.0331 20.4449 28.8956 21.3237H28.8993Z"
          fill="currentColor"
        />
      </svg>
    </Link>
  );
};
