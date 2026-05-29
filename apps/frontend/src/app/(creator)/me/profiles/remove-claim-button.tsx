'use client';

/**
 * RemoveClaimButton — inline confirm + pending + error for un-tracking a
 * profile. Mirrors the admin DeleteProfileButton pattern: first click reveals
 * a Cancel/Remove pair (no browser confirm()), the form submit runs the
 * removeClaim server action via useActionState, and failures render inline.
 * On success revalidatePath drops the row.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { removeClaim } from './actions';

const REMOVE_CLS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-fgMuted border border-white/10 hover:bg-white/[0.04] text-label transition-colors';
const CONFIRM_CLS =
  'px-3 py-1.5 rounded-md text-fgMuted border border-white/10 hover:bg-white/[0.04] text-label disabled:opacity-50 disabled:pointer-events-none';
const CANCEL_CLS =
  'px-3 py-1.5 rounded-md text-fgSubtle hover:text-fg text-label transition-colors';

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={CONFIRM_CLS} aria-busy={pending}>
      {pending ? 'Removing…' : 'Remove'}
    </button>
  );
}

export function RemoveClaimButton({ profileId }: { profileId: string }) {
  const [state, action] = useActionState(removeClaim, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      {confirming ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="profile_id" value={profileId} />
          <span className="text-caption text-fgMuted">Stop tracking?</span>
          <ConfirmButton />
          <button type="button" onClick={() => setConfirming(false)} className={CANCEL_CLS}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={REMOVE_CLS}>
          <XIcon />
          Remove
        </button>
      )}
      {state && !state.ok && (
        <p className="text-caption text-fgMuted mt-1 max-w-[220px] text-right">⚠ {state.error}</p>
      )}
    </div>
  );
}
