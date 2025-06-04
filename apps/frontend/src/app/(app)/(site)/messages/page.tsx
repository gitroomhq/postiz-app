import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Messages`,
  description: '',
};
export default async function Index() {
  const t = await getT();

  return (
    <div className="bg-customColor3 h-[951px] flex flex-col rounded-[4px] border border-customColor6">
      <div className="bg-customColor8 h-[64px]" />
      <div className="flex-1 flex justify-center items-center text-[20px]">
        {t(
          'select_a_conversation_and_chat_away',
          'Select a conversation and chat away.'
        )}
      </div>
    </div>
  );
}
