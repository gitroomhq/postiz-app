import { Metadata } from 'next';
import { ApprovedAppsComponent } from '@gitroom/frontend/components/approved-apps/approved-apps.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} ${t('settings', 'Settings')} - ${t('approved_apps', 'Approved Apps')}`,
    description: t('approved_apps_description', 'Manage third-party apps connected to your account'),
  };
}
export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <div className="w-full mx-auto gap-[24px] flex flex-col relative rounded-[4px]">
        <div>
          <ApprovedAppsComponent />
        </div>
      </div>
    </div>
  );
}
