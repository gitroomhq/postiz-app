import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'D3 Creator - Agent',
  description: '',
};

export default async function Page() {
  return redirect('/agents/new');
}
