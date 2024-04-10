import { Seller } from '@gitroom/frontend/components/marketplace/seller';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gitroom Marketplace',
  description: '',
};
export default async function Index({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  return <Seller />;
}
