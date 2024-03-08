import { SettingsComponent } from '@gitroom/frontend/components/settings/settings.component';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { redirect } from 'next/navigation';
import { RedirectType } from 'next/dist/client/components/redirect';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gitroom Settings',
  description: '',
};
export default async function Index({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  if (searchParams.code) {
    await internalFetch('/settings/github', {
      method: 'POST',
      body: JSON.stringify({ code: searchParams.code }),
    });

    return redirect('/settings', RedirectType.replace);
  }

  const { github } = await (await internalFetch('/settings/github')).json();
  if (!github) {
    return redirect('/');
  }
  const emptyOnes = github.find((p: { login: string }) => !p.login);
  const { organizations } = emptyOnes
    ? await (
        await internalFetch(`/settings/organizations/${emptyOnes.id}`)
      ).json()
    : { organizations: [] };

  return <SettingsComponent github={github} organizations={organizations} />;
}
