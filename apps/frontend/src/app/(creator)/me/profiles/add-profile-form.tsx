'use client';

/**
 * Client island for /me/profiles. Renders the add-URL form, calls
 * POST /api/profiles, then on success calls POST /api/profiles/discover and
 * shows any cross-platform matches the user can claim.
 *
 * Behaviour:
 *  - Auto-detect platform from URL host (so the user doesn't have to pick).
 *  - 'high' bucket candidates (>=0.92) are pre-selected so a single "Add these"
 *    button accepts them in one go.
 *  - 'review' bucket candidates render with a per-row checkbox.
 *  - All claim acceptances run sequentially against /api/profiles/claim so a
 *    partial failure doesn't lose state.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Platform = 'instagram' | 'tiktok' | 'facebook' | 'rednote' | 'douyin';

interface DiscoveryCandidate {
  profile: {
    id: string;
    platform: Platform;
    handle: string | null;
    profile_url: string;
  };
  score: number;
  bucket: 'high' | 'review';
  matchedOn: string;
}

const HOST_TO_PLATFORM: Array<{ test: RegExp; platform: Platform }> = [
  { test: /(^|\.)instagram\.com$/i, platform: 'instagram' },
  { test: /(^|\.)tiktok\.com$/i, platform: 'tiktok' },
  { test: /(^|\.)(facebook|fb)\.com$/i, platform: 'facebook' },
  { test: /(^|\.)xiaohongshu\.com$/i, platform: 'rednote' },
  { test: /(^|\.)douyin\.com$/i, platform: 'douyin' },
];

function detectPlatform(input: string): Platform | null {
  try {
    const u = new URL(input.trim());
    for (const { test, platform } of HOST_TO_PLATFORM) {
      if (test.test(u.hostname)) return platform;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AddProfileForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<DiscoveryCandidate[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [discovering, setDiscovering] = useState(false);

  const detected = useMemo(() => detectPlatform(url), [url]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!detected) {
      setError('Could not detect platform from URL. Paste a profile URL from Instagram, TikTok, Facebook, RedNote, or Douyin.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform: detected, profile_url: url }),
      });
      const json = await res.json();
      if (!res.ok || json.ok !== true) {
        setError(json.error ?? `request failed (${res.status})`);
        return;
      }
      setUrl('');

      // Fire discovery for cross-platform matches now that we have at least
      // one claim. The endpoint is rate-limited so we don't hammer it.
      setDiscovering(true);
      const disco = await fetch('/api/profiles/discover', { method: 'POST' });
      const discoJson = await disco.json();
      if (disco.ok && discoJson.ok === true) {
        const list = (discoJson.candidates ?? []) as DiscoveryCandidate[];
        setCandidates(list);
        // Pre-select 'high' bucket so a single click takes them all.
        setAccepted(new Set(list.filter((c) => c.bucket === 'high').map((c) => c.profile.id)));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unexpected error');
    } finally {
      setSubmitting(false);
      setDiscovering(false);
    }
  }

  async function handleAcceptCandidates() {
    setSubmitting(true);
    setError(null);
    try {
      for (const profileId of accepted) {
        const res = await fetch('/api/profiles/claim', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId }),
        });
        const json = await res.json();
        if (!res.ok || json.ok !== true) {
          setError(`Claim failed for one profile: ${json.error ?? res.status}`);
        }
      }
      setCandidates([]);
      setAccepted(new Set());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCandidate(id: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="glass-elevated rounded-2xl p-6 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="profile_url" className="text-label text-fg">
          Add a profile URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="profile_url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/yourhandle"
            className="flex-1 px-4 py-2 rounded-md bg-glass-base border border-borderGlass text-fg placeholder:text-fgSubtle focus:outline-none focus:border-aurora-cta"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !url}
            className="px-5 py-2 rounded-md bg-aurora-cta text-bg disabled:opacity-50 disabled:cursor-not-allowed text-label"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
        <div className="text-caption text-fgSubtle">
          {detected ? `Detected platform: ${detected}` : 'Paste any profile URL — we detect the platform automatically.'}
        </div>
        {error && (
          <div className="text-caption text-red-400" role="alert">
            {error}
          </div>
        )}
      </form>

      {discovering && (
        <div className="text-caption text-fgMuted">Looking for matching profiles on other platforms…</div>
      )}

      {candidates.length > 0 && (
        <div className="border-t border-borderGlass pt-4 mt-2 flex flex-col gap-3">
          <div className="text-label text-fg">We think these are yours too</div>
          <ul className="flex flex-col gap-2">
            {candidates.map((c) => (
              <li
                key={c.profile.id}
                className="flex items-center gap-3 p-3 rounded-md bg-glass-base border border-borderGlass"
              >
                <input
                  type="checkbox"
                  checked={accepted.has(c.profile.id)}
                  onChange={() => toggleCandidate(c.profile.id)}
                  className="accent-aurora-cta"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-label text-fgMuted uppercase tracking-wide">{c.profile.platform}</div>
                  <div className="text-body text-fg truncate">{c.profile.handle ?? c.profile.profile_url}</div>
                </div>
                <div className="text-caption text-fgSubtle shrink-0">
                  {c.bucket === 'high' ? 'High match' : 'Possible match'} · {Math.round(c.score * 100)}%
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setCandidates([]);
                setAccepted(new Set());
              }}
              className="px-4 py-2 rounded-md text-fg hover:bg-white/[0.06] text-label"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleAcceptCandidates}
              disabled={submitting || accepted.size === 0}
              className="px-4 py-2 rounded-md bg-aurora-cta text-bg disabled:opacity-50 text-label"
            >
              Add selected ({accepted.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
