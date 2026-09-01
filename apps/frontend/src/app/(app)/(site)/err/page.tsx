import { Metadata } from 'next';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('error', 'Error'),
    description: t('error_description', 'Something went wrong'),
  };
}
export default async function Page() {
  const t = await getT();
  return (
    <div>
      {t(
        'we_are_experiencing_some_difficulty_try_to_refresh_the_page',
        'We are experiencing some difficulty, try to refresh the page'
      )}
    </div>
  );
}
