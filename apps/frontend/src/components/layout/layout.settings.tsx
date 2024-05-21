'use client';

import { ReactNode, useCallback } from 'react';
import { Title } from '@gitroom/frontend/components/layout/title';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import Image from 'next/image';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import Link from 'next/link';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { SettingsComponent } from '@gitroom/frontend/components/layout/settings.component';
import { Onboarding } from '@gitroom/frontend/components/onboarding/onboarding';
import { Support } from '@gitroom/frontend/components/layout/support';

dayjs.extend(utc);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

export const LayoutSettings = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);

  const { data: user } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  return (
    <ContextWrapper user={user}>
      <MantineWrapper>
        <ToolTip />
        <ShowMediaBoxModal />
        <ShowLinkedinCompany />
        <Toaster />
        <ShowPostSelector />
        <Onboarding />
        <Support />
        <div className="min-h-[100vh] w-full max-w-[1440px] mx-auto bg-primary px-[12px] text-white flex flex-col">
          <div className="px-[23px] flex h-[80px] items-center justify-between z-[200] sticky top-0 bg-primary">
            <Link href="/" className="text-2xl flex items-center gap-[10px]">
              <div>
                <Image src="/logo.svg" width={55} height={53} alt="Logo" />
              </div>
              <div className="mt-[12px]">Gitroom</div>
            </Link>
            {user?.orgId ? <TopMenu /> : <div />}
            <div className="flex items-center gap-[8px]">
              <SettingsComponent />
              <NotificationComponent />
              <OrganizationSelector />
            </div>
          </div>
          <div className="flex-1 flex">
            <div className="flex-1 rounded-3xl px-[23px] py-[17px] flex flex-col">
              <Title />
              <div className="flex flex-1 flex-col">{children}</div>
            </div>
          </div>
        </div>
      </MantineWrapper>
    </ContextWrapper>
  );
};
