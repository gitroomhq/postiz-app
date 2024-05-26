import { Seller } from '@gitroom/frontend/components/marketplace/seller';

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
  return <Seller />;
}
