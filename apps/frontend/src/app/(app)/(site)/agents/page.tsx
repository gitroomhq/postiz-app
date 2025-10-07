import { Metadata } from 'next';
import { Agent } from '@gitroom/frontend/components/agents/agent';
export const metadata: Metadata = {
  title: 'Agent',
  description: '',
};
export default async function Page() {
  return (
    <Agent />
  );
}
