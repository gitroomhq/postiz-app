'use client';

import { useThirdParty } from '@gitroom/frontend/components/third-parties/third-party.media';
import {
  useThirdPartyFunctionSWR,
  useThirdPartySubmit,
} from '@gitroom/frontend/components/third-parties/third-party.function';
import { thirdPartyWrapper } from '@gitroom/frontend/components/third-parties/third-party.wrapper';
import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';

interface Account {
  id: string;
  handle: string;
  platform: 'tiktok' | 'instagram';
  niche: string;
  status: string;
  persona: {
    displayName: string | null;
    profilePicUrl: string | null;
  } | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#010101',
  instagram: '#E1306C',
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className="text-[10px] font-semibold px-[6px] py-[2px] rounded-full text-white uppercase tracking-wide"
      style={{ backgroundColor: PLATFORM_COLORS[platform] ?? '#555' }}
    >
      {platform}
    </span>
  );
}

function AccountAvatar({ handle, picUrl }: { handle: string; picUrl?: string | null }) {
  const initials = (handle.replace(/^@/, '').slice(0, 2) || 'SW').toUpperCase();
  const hue = handle.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  if (picUrl) {
    return (
      <img
        src={picUrl}
        alt={handle}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
    >
      {initials}
    </div>
  );
}

const SuperWarmProviderComponent = () => {
  const { data: postData, close } = useThirdParty();
  const submit = useThirdPartySubmit();
  const { data: accounts, isLoading, error } = useThirdPartyFunctionSWR(
    'LOAD_ONCE',
    'accounts'
  ) as { data: Account[] | undefined; isLoading: boolean; error: Error | undefined };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedId) return;

    // Gather content and media from the current post
    const content = postData?.[0]?.content ?? '';
    const mediaUrls = (postData?.[0]?.image ?? []).map((img: { url: string }) => img.url);

    setSubmitting(true);
    try {
      await submit({ jobId: selectedId, content, mediaUrls });
      close();
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, postData, submit, close]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-textColor/60 text-sm">
        Loading accounts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-textColor/60 text-sm">Could not load accounts. Check your SuperWarm API key.</p>
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-textColor/60 text-sm">No active warming accounts found.</p>
        <a
          href="https://superwarm.co/onboarding"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-400 hover:underline"
        >
          Set up your first campaign →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-w-[320px]">
      <p className="text-sm text-textColor/70">
        Select which warming account should receive this post:
      </p>

      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => setSelectedId(account.id)}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
              selectedId === account.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-tableBorder hover:border-blue-500/40 bg-fifth'
            )}
          >
            <AccountAvatar
              handle={account.handle}
              picUrl={account.persona?.profilePicUrl}
            />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-textColor truncate">
                  {account.persona?.displayName ?? account.handle}
                </span>
                <PlatformBadge platform={account.platform} />
              </div>
              {account.niche && (
                <span className="text-xs text-textColor/50 truncate">{account.niche}</span>
              )}
            </div>
            {selectedId === account.id && (
              <svg
                className="ml-auto flex-shrink-0 text-blue-500"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selectedId || submitting}
        className="w-full"
        loading={submitting}
      >
        {submitting ? 'Queuing post…' : 'Send to SuperWarm'}
      </Button>
    </div>
  );
};

export default thirdPartyWrapper('superwarm', SuperWarmProviderComponent);
