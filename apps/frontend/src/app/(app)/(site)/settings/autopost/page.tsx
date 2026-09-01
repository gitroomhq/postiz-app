import { Metadata } from 'next';
import { Autopost } from '@gitroom/frontend/components/autopost/autopost';
import { SettingsTabGate } from '@gitroom/frontend/components/settings/settings-tab-gate.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} ${t('settings', 'Settings')} - ${t('auto_post', 'Auto Post')}`,
    description: t('autopost_description', 'Automatically repost your best performing content'),
  };
}
export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <div className="w-full mx-auto gap-[24px] flex flex-col relative rounded-[4px]">
        <SettingsTabGate tab="autopost">
          <div>
            <Autopost />
          </div>
        </SettingsTabGate>
      </div>
    </div>
  );
}
