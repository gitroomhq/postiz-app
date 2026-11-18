import { ConnectLink } from '@gitroom/frontend/components/launches/connect.link';

export const dynamic = 'force-dynamic';

// The person who opens a connect link may have no Postiz account
export default async function Page(props: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = await props.params;
  return <ConnectLink token={token} />;
}
