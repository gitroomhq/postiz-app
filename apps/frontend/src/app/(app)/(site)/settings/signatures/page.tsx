import { Metadata } from 'next';
import { SignaturesComponent } from '@gitroom/frontend/components/settings/signatures.component';
import { SettingsTabGate } from '@gitroom/frontend/components/settings/settings-tab-gate.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} ${t('settings', 'Settings')} - ${t('signatures', 'Signatures')}`,
    description: t('signatures_description', 'Add a signature to the end of your posts'),
  };
}
export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <div className="w-full mx-auto gap-[24px] flex flex-col relative rounded-[4px]">
        <SettingsTabGate tab="signatures">
          <div>
            <SignaturesComponent />
          </div>
        </SettingsTabGate>
      </div>
    </div>
  );
}
