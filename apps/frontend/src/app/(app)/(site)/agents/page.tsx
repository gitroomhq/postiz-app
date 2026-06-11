import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Vocaccio',
  description: '',
};

export default async function Page() {
  return redirect('/agents/new');
}
