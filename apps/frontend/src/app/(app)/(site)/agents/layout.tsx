import { Metadata } from 'next';
import { Agent } from '@gitroom/frontend/components/agents/agent';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getT } from '@gitroom/react/translation/get.translation.service.backend';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} - ${t('agent', 'Agent')}`,
    description: t('agent_description', 'Chat with your Postiz AI agent'),
  };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Agent>{children}</Agent>;
}
