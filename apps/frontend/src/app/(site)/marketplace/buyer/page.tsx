import { Buyer } from '@gitroom/frontend/components/marketplace/buyer';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneral } from '@gitroom/react/helpers/is.general';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Marketplace`,
  description: '',
};
export default async function Index({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  return <Buyer />;
}
