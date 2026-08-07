import { LifetimeDeal } from '@gitroom/frontend/components/billing/lifetime.deal';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Lifetime deal',
};
export default async function Page() {
  // Same page chrome as /billing — the prototype's billing column is
  // `padding:24px 28px 48px` / `max-width:1080px`, and this route is the
  // founding-member surface of that screen, not a bare fragment.
  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-pqInner p-[24px_28px_48px]">
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-[24px]">
        <LifetimeDeal />
      </div>
    </div>
  );
}
