import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Calendar',
};

// The app home is the Calendar (Launches), the primary scheduling workspace;
// the Agent is one click away in the rail. proxy.ts already sends "/" to
// /launches for general deployments — this keeps the fallback aligned.
export default async function Page() {
  return redirect('/launches');
}
