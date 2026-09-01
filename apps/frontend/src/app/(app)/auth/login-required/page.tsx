import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} - ${t('login_required', 'Login Required')}`,
    description: t('login_required_description', 'Please login to continue'),
  };
}

export default async function LoginRequiredPage() {
  return (
    <div className="fixed left-0 top-0 w-full h-full bg-[#121212] z-[100] flex justify-center items-center text-4xl">
      Login to use the wizard to generate API code
    </div>
  );
}
