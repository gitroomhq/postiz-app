'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

const TERMINAL_STATES: ReviewStatus[] = ['APPROVED', 'REJECTED', 'EXPIRED'];

function normalizeStatus(status?: string): ReviewStatus {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'EXPIRED') return 'EXPIRED';
  return 'PENDING';
}

async function parseResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function PublicReviewActions({
  token,
  initialStatus,
  expiresAt,
}: {
  token: string;
  initialStatus?: string;
  expiresAt?: string;
}) {
  const fetch = useFetch();
  const toast = useToaster();
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<ReviewStatus>(
    normalizeStatus(initialStatus)
  );

  const isTerminal = TERMINAL_STATES.includes(status);

  const decide = async (decision: 'approve' | 'reject') => {
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
            ? JSON.stringify({ feedback: feedback.trim() })
            : JSON.stringify({}),
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
        <p className="text-[13px] text-gray-400 mt-1">
          Status: <span className="text-white">{status}</span>
        </p>
        {!!expiresAt && (
          <p className="text-[13px] text-gray-400">
            Expires: {dayjs(expiresAt).format('MMM D, YYYY h:mm A')}
          </p>
        )}
      </div>

      {isTerminal ? (
        <div className="text-sm text-gray-300">
          This review link is closed. No additional action is needed.
        </div>
      ) : (
        <>
          <textarea
            className="w-full min-h-[120px] p-3 rounded-[8px] bg-input border border-fifth outline-none text-inputText placeholder-inputText"
            placeholder="Optional feedback for rejection..."
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
