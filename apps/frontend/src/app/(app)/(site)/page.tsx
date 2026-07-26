import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// The home landing is the premium Dashboard.
export default async function Index() {
  redirect('/dashboard');
}
