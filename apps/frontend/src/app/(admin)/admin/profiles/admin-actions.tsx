'use client';

/**
 * Client wrappers for the admin mutation buttons.
 *
 * Each wraps a server action with useActionState so the button can show a
 * pending state and surface the returned {ok, message} instead of throwing
 * into an error boundary. Delete is gated behind an inline confirm step
 * (no portal/modal dependency) because it permanently cascades snapshots.
 *
 * On success the server action calls revalidatePath, so the affected row
 * disappears (claim resolved / profile removed) — no success toast needed;
 * only the failure message is rendered inline.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { approveClaim, rejectClaim, deleteProfile } from './actions';

// Yellow-mono: destructive intent reads from icon + label, not a red hue.
const APPROVE_CLS = 'px-3 py-1.5 rounded-md bg-aurora-cta text-brand-darker text-label disabled:opacity-50 disabled:pointer-events-none';
const REJECT_CLS = 'px-3 py-1.5 rounded-md text-fg hover:bg-white/[0.06] text-label border border-borderGlass disabled:opacity-50 disabled:pointer-events-none';
const DELETE_CLS = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-fgMuted hover:bg-white/[0.04] text-label border border-white/10';
const DELETE_CONFIRM_CLS = 'px-3 py-1.5 rounded-md text-fgMuted hover:bg-white/[0.04] text-label border border-white/10 disabled:opacity-50 disabled:pointer-events-none';
const CANCEL_CLS = 'px-3 py-1.5 rounded-md text-fgSubtle hover:text-fg text-label';

function SubmitButton({
  className,
  children,
  pendingLabel,
}: {
  className: string;
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ClaimActions({
  userId,
  profileId,
}: {
  userId: string;
  profileId: string;
}) {
  const [approveState, approveAction] = useActionState(approveClaim, null);
  const [rejectState, rejectAction] = useActionState(rejectClaim, null);
  const error =
    approveState && !approveState.ok
      ? approveState.message
      : rejectState && !rejectState.ok
        ? rejectState.message
        : null;

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="flex gap-2">
        <form action={approveAction}>
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="profile_id" value={profileId} />
          <SubmitButton className={APPROVE_CLS} pendingLabel="Approving…">
            Approve
          </SubmitButton>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="profile_id" value={profileId} />
          <SubmitButton className={REJECT_CLS} pendingLabel="Rejecting…">
            Reject
          </SubmitButton>
        </form>
      </div>
      {error && <span className="text-caption text-red-400 max-w-[220px] text-right">{error}</span>}
    </div>
  );
}

export function DeleteProfileButton({ profileId }: { profileId: string }) {
  const [state, action] = useActionState(deleteProfile, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {confirming ? (
        <form action={action} className="flex items-center gap-2">
          <input type="hidden" name="profile_id" value={profileId} />
          <span className="text-caption text-fgMuted">Delete &amp; all stats?</span>
          <SubmitButton className={DELETE_CONFIRM_CLS} pendingLabel="Deleting…">
            Confirm
          </SubmitButton>
          <button type="button" onClick={() => setConfirming(false)} className={CANCEL_CLS}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={DELETE_CLS}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18M8 6V4h8v2m-9 0v14a1 1 0 001 1h8a1 1 0 001-1V6" />
          </svg>
          Delete
        </button>
      )}
      {state && !state.ok && (
        <span className="text-caption text-red-400 max-w-[220px] text-right">{state.message}</span>
      )}
    </div>
  );
}
