'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

const TERMINAL_STATES: ReviewStatus[] = [
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
];

function normalizeStatus(status?: string): ReviewStatus {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (status === 'REVOKED') return 'REVOKED';
  return 'PENDING';
}

async function parseResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getStatusBadgeClass(status: ReviewStatus) {
  if (status === 'APPROVED') {
    return 'bg-green-900/40 text-green-300 border border-green-700/60';
  }
  if (status === 'REJECTED') {
    return 'bg-red-900/40 text-red-300 border border-red-700/60';
  }
  if (status === 'EXPIRED') {
    return 'bg-gray-700/40 text-gray-300 border border-gray-600';
  }
  if (status === 'REVOKED') {
    return 'bg-gray-700/40 text-gray-300 border border-gray-600';
  }
  return 'bg-blue-900/30 text-blue-300 border border-blue-700/60';
}

export function PublicReviewActions({
  token,
  initialStatus,
  expiresAt,
  initialFeedback,
}: {
  token: string;
  initialStatus?: string;
  expiresAt?: string;
  initialFeedback?: string;
}) {
  const fetch = useFetch();
  const toast = useToaster();
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(initialFeedback || '');
  const [status, setStatus] = useState<ReviewStatus>(
    normalizeStatus(initialStatus)
  );

  const isTerminal = TERMINAL_STATES.includes(status);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!reviewerName.trim().length) {
      toast.show('Please add your name before submitting', 'warning');
      return;
    }

    if (decision === 'reject' && !feedback.trim().length) {
      toast.show('Please add feedback before rejecting', 'warning');
      return;
    }

    if (decision === 'approve') {
      setLoadingApprove(true);
    } else {
      setLoadingReject(true);
    }

    try {
      const response = await fetch(`/public/review/${token}/${decision}`, {
        method: 'POST',
        body:
          decision === 'reject'
            ? JSON.stringify({
                feedback: feedback.trim(),
                reviewerName: reviewerName.trim(),
                reviewerEmail: reviewerEmail.trim() || undefined,
              })
            : JSON.stringify({
                reviewerName: reviewerName.trim(),
                reviewerEmail: reviewerEmail.trim() || undefined,
              }),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        toast.show(
          data?.message || 'Could not save your decision. Please try again.',
          'warning'
        );
        return;
      }

      const nextStatus =
        decision === 'approve'
          ? 'APPROVED'
          : normalizeStatus(data?.status || 'REJECTED');

      setStatus(nextStatus);
      if (decision === 'reject') {
        setSavedFeedback(feedback.trim());
      }
      toast.show(
        decision === 'approve'
          ? 'Post approved successfully'
          : 'Feedback sent successfully',
        'success'
      );
    } finally {
      setLoadingApprove(false);
      setLoadingReject(false);
    }
  };

  return (
    <div className="bg-third border border-tableBorder p-4 rounded-[10px] flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-semibold text-white">Review Decision</h2>
        <div className="text-[13px] text-gray-400 mt-2 flex items-center gap-2">
          <span>Status:</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold ${getStatusBadgeClass(
              status
            )}`}
          >
            {status}
          </span>
        </div>
        {!!expiresAt && (
          <p className="text-[13px] text-gray-400">
            Expires: {dayjs(expiresAt).format('MMM D, YYYY h:mm A')}
          </p>
        )}
      </div>

      {isTerminal ? (
        <div
          className={`text-sm flex flex-col gap-2 p-3 rounded-[8px] ${
            status === 'APPROVED'
              ? 'bg-green-900/20 border border-green-800/50 text-green-200'
              : status === 'REJECTED'
              ? 'bg-red-900/20 border border-red-800/50 text-red-200'
              : 'bg-gray-700/20 border border-gray-600 text-gray-300'
          }`}
        >
          <div>This review link is closed. No additional action is needed.</div>
          {status === 'REJECTED' && !!savedFeedback && (
            <div className="p-3 rounded-[8px] bg-input border border-fifth text-inputText space-y-1">
              <div className="text-[12px] uppercase tracking-wide text-gray-400">
                Feedback
              </div>
              <div>{savedFeedback}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <input
            className="w-full p-3 rounded-[8px] bg-input border border-fifth outline-none text-inputText placeholder-inputText"
            placeholder="Your name (required)"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />
          <input
            className="w-full p-3 rounded-[8px] bg-input border border-fifth outline-none text-inputText placeholder-inputText"
            placeholder="Email (optional)"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
          />
          <textarea
            className="w-full min-h-[120px] p-3 rounded-[8px] bg-input border border-fifth outline-none text-inputText placeholder-inputText"
            placeholder="Feedback is required for rejection..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 !bg-green-700"
              loading={loadingApprove}
              onClick={() => decide('approve')}
            >
              Approve
            </Button>
            <Button
              className="flex-1 !bg-red-700"
              loading={loadingReject}
              onClick={() => decide('reject')}
            >
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
