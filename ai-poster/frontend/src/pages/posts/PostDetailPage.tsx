import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit3,
  ExternalLink,
  History,
  Save,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePost, usePostVersions } from '@/hooks/usePosts';
import { formatDateTime, getStatusLabel, truncate } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { post, isLoading, mutate } = usePost(id);
  const { versions, isLoading: versionsLoading } = usePostVersions(id);

  const [activeTab, setActiveTab] = useState('preview');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<'REJECTED' | 'REGENERATE' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const tabs = [
    { id: 'preview', label: 'Preview' },
    { id: 'edit', label: 'Edit', icon: <Edit3 className="h-4 w-4" /> },
    {
      id: 'versions',
      label: 'Versions',
      icon: <History className="h-4 w-4" />,
      count: versions.length,
    },
  ];

  if (isLoading) return <PageSpinner />;

  if (!post) {
    return (
      <EmptyState
        title="Post not found"
        description="The post you're looking for doesn't exist."
        actionLabel="Back to Dashboard"
        onAction={() => navigate('/dashboard')}
      />
    );
  }

  const handleStartEdit = () => {
    setEditContent(post.content);
    setEditing(true);
    setActiveTab('edit');
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await fetchApi(`/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editContent }),
      });
      toast.success('Post updated');
      setEditing(false);
      setActiveTab('preview');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApprovalAction = async (
    action: 'APPROVED' | 'REJECTED' | 'REGENERATE',
    feedbackText?: string
  ) => {
    setProcessing(true);
    try {
      await fetchApi(`/posts/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, feedback: feedbackText }),
      });
      const label =
        action === 'APPROVED'
          ? 'approved'
          : action === 'REJECTED'
            ? 'rejected'
            : 'sent for regeneration';
      toast.success(`Post ${label}`);
      setFeedbackModal(null);
      setFeedback('');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const isPending = post.state === 'PENDING_APPROVAL';

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-text-primary">Post Detail</h2>
              <Badge variant={statusToBadgeVariant(post.state)} dot>
                {getStatusLabel(post.state)}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              Created {formatDateTime(post.createdAt)}
              {post.publishDate && ` | Scheduled for ${formatDateTime(post.publishDate)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.platformUrl && (
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(post.platformUrl!, '_blank')}
            >
              View on Platform
            </Button>
          )}
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="h-4 w-4" />}
              onClick={handleStartEdit}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Approval actions bar */}
      {isPending && (
        <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-5 py-3">
          <p className="text-sm font-medium text-orange-800">
            This post is awaiting your approval.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<XCircle className="h-4 w-4" />}
              onClick={() => setFeedbackModal('REJECTED')}
              className="text-status-failed hover:text-status-failed"
            >
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setFeedbackModal('REGENERATE')}
            >
              Regenerate
            </Button>
            <Button
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => handleApprovalAction('APPROVED')}
              loading={processing}
            >
              Approve
            </Button>
          </div>
        </div>
      )}

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'preview' && (
        <Card>
          <CardBody>
            <div className="rounded-lg border border-gray-100 bg-surface-secondary p-5">
              <div
                className="prose prose-sm max-w-none text-text-primary"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {post.media && post.media.length > 0 && (
              <div className="mt-4 flex gap-3">
                {post.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.path}
                    alt={m.altText || 'Post media'}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
              <span>Source: {post.sourceType.replace(/_/g, ' ')}</span>
              {post.regenerationCount > 0 && (
                <span>Regenerated {post.regenerationCount} time(s)</span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'edit' && (
        <Card>
          <CardBody className="space-y-4">
            <Textarea
              label="Content (HTML)"
              value={editing ? editContent : post.content}
              onChange={(e) => setEditContent(e.target.value)}
              rows={12}
              showCount
              disabled={!editing}
            />
            {editing && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setActiveTab('preview');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  icon={<Save className="h-4 w-4" />}
                  onClick={handleSaveEdit}
                  loading={saving}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === 'versions' && (
        <div className="space-y-3">
          {versionsLoading ? (
            <PageSpinner />
          ) : versions.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No version history"
              description="Version history will appear after edits or regenerations."
            />
          ) : (
            versions.map((version, idx) => (
              <Card key={version.id}>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                        v{versions.length - idx}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatDateTime(version.createdAt)}
                      </span>
                    </div>
                    <Badge variant={statusToBadgeVariant(version.state)} dot>
                      {getStatusLabel(version.state)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {truncate(version.plainText || version.content, 200)}
                  </p>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Feedback Modal */}
      <Modal
        open={!!feedbackModal}
        onClose={() => {
          setFeedbackModal(null);
          setFeedback('');
        }}
        title={feedbackModal === 'REJECTED' ? 'Reject Post' : 'Regenerate Post'}
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
              variant={feedbackModal === 'REJECTED' ? 'danger' : 'primary'}
              onClick={() =>
                feedbackModal &&
                handleApprovalAction(feedbackModal, feedback)
              }
              loading={processing}
            >
              {feedbackModal === 'REJECTED' ? 'Reject' : 'Regenerate'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Feedback (optional)"
          placeholder={
            feedbackModal === 'REJECTED'
              ? 'Reason for rejection...'
              : 'What should change in the new version...'
          }
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />
      </Modal>
    </div>
  );
}
