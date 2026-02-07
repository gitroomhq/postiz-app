import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePosts } from '@/hooks/usePosts';
import { formatDateTime, truncate } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { ApprovalAction } from '@ai-poster/shared';

export function PendingApprovalsPage() {
  const navigate = useNavigate();
  const { posts, isLoading, mutate } = usePosts({ state: 'PENDING_APPROVAL' });
  const [feedbackModal, setFeedbackModal] = useState<{
    postId: string;
    action: ApprovalAction['action'];
  } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (postId: string, action: ApprovalAction['action'], feedbackText?: string) => {
    setProcessing(postId);
    try {
      await fetchApi(`/posts/${postId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, feedback: feedbackText } as ApprovalAction),
      });
      const label =
        action === 'APPROVED'
          ? 'approved'
          : action === 'REJECTED'
            ? 'rejected'
            : 'sent for regeneration';
      toast.success(`Post ${label}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(null);
      setFeedbackModal(null);
      setFeedback('');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h2 className="section-title">Pending Approvals</h2>
        <p className="subtle-text mt-1">
          Review AI-generated posts before they get scheduled.
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="All caught up!"
          description="There are no posts waiting for approval right now."
          actionLabel="Create New Post"
          onAction={() => navigate('/posts/new')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardBody>
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="pending" dot>
                    Pending Approval
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(post.createdAt)}
                  </span>
                </div>

                <div
                  className="cursor-pointer rounded-lg border border-gray-100 bg-surface-secondary p-3 transition-colors hover:border-gray-200"
                  onClick={() => navigate(`/posts/${post.id}`)}
                >
                  <p className="whitespace-pre-wrap text-sm text-text-primary">
                    {truncate(post.plainText || post.content, 280)}
                  </p>
                </div>

                {post.media && post.media.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {post.media.map((m) => (
                      <img
                        key={m.id}
                        src={m.path}
                        alt={m.altText || 'Post media'}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-muted"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </CardBody>
              <CardFooter className="justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<XCircle className="h-4 w-4" />}
                  onClick={() =>
                    setFeedbackModal({ postId: post.id, action: 'REJECTED' })
                  }
                  disabled={processing === post.id}
                  className="text-status-failed hover:text-status-failed"
                >
                  Reject
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className="h-4 w-4" />}
                    onClick={() =>
                      setFeedbackModal({ postId: post.id, action: 'REGENERATE' })
                    }
                    disabled={processing === post.id}
                    loading={processing === post.id}
                  >
                    Regen
                  </Button>
                  <Button
                    size="sm"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => handleAction(post.id, 'APPROVED')}
                    disabled={processing === post.id}
                    loading={processing === post.id}
                  >
                    Approve
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      <Modal
        open={!!feedbackModal}
        onClose={() => {
          setFeedbackModal(null);
          setFeedback('');
        }}
        title={
          feedbackModal?.action === 'REJECTED'
            ? 'Reject Post'
            : 'Regenerate Post'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackModal(null);
                setFeedback('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={feedbackModal?.action === 'REJECTED' ? 'danger' : 'primary'}
              onClick={() =>
                feedbackModal &&
                handleAction(feedbackModal.postId, feedbackModal.action, feedback)
              }
              loading={!!processing}
            >
              {feedbackModal?.action === 'REJECTED' ? 'Reject' : 'Regenerate'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Feedback (optional)"
          placeholder={
            feedbackModal?.action === 'REJECTED'
              ? 'Why is this post being rejected?'
              : 'What should be different in the regenerated version?'
          }
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />
      </Modal>
    </div>
  );
}
