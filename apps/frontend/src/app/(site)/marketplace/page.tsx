import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Marketplace`,
  description: '',
};
export default async function Index({
  searchParams,
}: {
  searchParams: { code: string };
}) {
  const currentCookie = cookies()?.get('marketplace')?.value;
  return redirect(currentCookie === 'buyer' ? '/marketplace/buyer' : '/marketplace/seller');
}
