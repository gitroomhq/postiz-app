import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  List,
  CheckCircle2,
  BarChart3,
  ArrowLeft,
  Clock,
  Play,
  Pause,
  Trash2,
  PenSquare,
  Eye,
  TrendingUp,
  MousePointerClick,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import { useCampaign } from '@/hooks/useCampaigns';
import { usePosts } from '@/hooks/usePosts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatDate, formatDateTime, getStatusLabel, truncate } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import type { PostDto } from '@ai-poster/shared';
import toast from 'react-hot-toast';

const TAB_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
  { id: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
];

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaign, isLoading, mutate } = useCampaign(id);
  const { posts, isLoading: postsLoading } = usePosts({ campaignId: id });
  const { overview } = useAnalytics({ campaignId: id });
  const [activeTab, setActiveTab] = useState('calendar');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const pendingPosts = posts.filter(
    (p) => p.state === 'PENDING_APPROVAL' || p.state === 'AI_GENERATED'
  );

  const handleSelectPost = useCallback(
    (post: PostDto) => {
      navigate(`/posts/${post.id}`);
    },
    [navigate]
  );

  const handleCreatePost = useCallback(
    (_date: Date) => {
      navigate('/posts/new');
    },
    [navigate]
  );

  const handleDropPost = useCallback(
    async (post: PostDto, newDate: Date) => {
      try {
        await fetchApi(`/posts/${post.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ publishDate: newDate.toISOString() }),
        });
        toast.success('Post rescheduled');
      } catch {
        toast.error('Failed to reschedule post');
      }
    },
    []
  );

  const handleApprovePost = useCallback(async (post: PostDto) => {
    try {
      await fetchApi(`/posts/${post.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action: 'APPROVED' }),
      });
      toast.success('Post approved');
    } catch {
      toast.error('Failed to approve post');
    }
  }, []);

  const handleDeletePost = useCallback(async (post: PostDto) => {
    try {
      await fetchApi(`/posts/${post.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  }, []);

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/campaigns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Campaign ${status.toLowerCase()}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    setActionLoading(true);
    try {
      await fetchApi(`/campaigns/${id}`, { method: 'DELETE' });
      toast.success('Campaign deleted');
      navigate('/campaigns');
    } catch {
      toast.error('Failed to delete campaign');
    } finally {
      setActionLoading(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading) return <PageSpinner />;

  if (!campaign) {
    return (
      <div className="page-container">
        <EmptyState
          title="Campaign not found"
          description="The campaign you are looking for does not exist."
          actionLabel="Back to Campaigns"
          onAction={() => navigate('/campaigns')}
        />
      </div>
    );
  }

  const tabItems = TAB_ITEMS.map((tab) => ({
    ...tab,
    count:
      tab.id === 'approvals'
        ? pendingPosts.length
        : tab.id === 'list'
          ? posts.length
          : undefined,
  }));

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/campaigns')}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-text-primary">
                {campaign.name}
              </h2>
              <Badge variant={statusToBadgeVariant(campaign.status)} dot>
                {getStatusLabel(campaign.status)}
              </Badge>
              <Badge variant="default">
                {getStatusLabel(campaign.mode)}
              </Badge>
            </div>
            {campaign.description && (
              <p className="mt-1 text-sm text-text-muted">{campaign.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
              </span>
              <span>{campaign.postsPerWeek} posts/week</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              icon={<Pause className="h-4 w-4" />}
              onClick={() => handleStatusChange('PAUSED')}
              loading={actionLoading}
            >
              Pause
            </Button>
          )}
          {(campaign.status === 'PAUSED' || campaign.status === 'DRAFT') && (
            <Button
              size="sm"
              icon={<Play className="h-4 w-4" />}
              onClick={() => handleStatusChange('ACTIVE')}
              loading={actionLoading}
            >
              {campaign.status === 'DRAFT' ? 'Activate' : 'Resume'}
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {campaign.postCount ?? 0}
            </p>
            <p className="text-xs text-text-muted">Total Posts</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-status-approved">
              {campaign.approvedCount ?? 0}
            </p>
            <p className="text-xs text-text-muted">Approved</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-status-posted">
              {campaign.postedCount ?? 0}
            </p>
            <p className="text-xs text-text-muted">Posted</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {overview?.totalImpressions?.toLocaleString() ?? '0'}
            </p>
            <p className="text-xs text-text-muted">Impressions</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

      {/* Tab content: Calendar */}
      {activeTab === 'calendar' && (
        <CalendarGrid
          posts={posts}
          onSelectPost={handleSelectPost}
          onCreatePost={handleCreatePost}
          onDropPost={handleDropPost}
          onApprovePost={handleApprovePost}
          onEditPost={(post) => navigate(`/posts/${post.id}`)}
          onDeletePost={handleDeletePost}
        />
      )}

      {/* Tab content: List */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {postsLoading ? (
            <PageSpinner />
          ) : posts.length === 0 ? (
            <EmptyState
              title="No posts generated yet"
              description="Posts will appear here once the campaign generates them."
            />
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                hoverable
                onClick={() => navigate(`/posts/${post.id}`)}
              >
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {truncate(post.plainText || 'Untitled post', 120)}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(post.publishDate || post.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={statusToBadgeVariant(post.state)} dot>
                      {getStatusLabel(post.state)}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab content: Approvals */}
      {activeTab === 'approvals' && (
        <div>
          {pendingPosts.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-7 w-7" />}
              title="All caught up!"
              description="No posts pending approval in this campaign."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingPosts.map((post) => (
                <Card key={post.id}>
                  <CardBody>
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant={statusToBadgeVariant(post.state)} dot>
                        {getStatusLabel(post.state)}
                      </Badge>
                      <span className="text-xs text-text-muted">
                        {formatDateTime(post.createdAt)}
                      </span>
                    </div>
                    <p
                      className="cursor-pointer text-sm text-text-primary line-clamp-3"
                      onClick={() => navigate(`/posts/${post.id}`)}
                    >
                      {post.plainText || 'Untitled post'}
                    </p>
                  </CardBody>
                  <div className="flex items-center gap-2 border-t border-gray-50 px-5 py-3">
                    <Button
                      size="sm"
                      onClick={() => handleApprovePost(post)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<PenSquare className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/posts/${post.id}`)}
                    >
                      Review
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab content: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                    <Eye className="h-5 w-5 text-status-publishing" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {overview?.totalImpressions?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-xs text-text-muted">Impressions</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                    <TrendingUp className="h-5 w-5 text-status-approved" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {overview?.totalEngagement?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-xs text-text-muted">Engagements</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <MousePointerClick className="h-5 w-5 text-status-scheduled" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {overview?.totalClicks?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-xs text-text-muted">Clicks</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader>Performance Trend</CardHeader>
            <CardBody>
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-text-muted">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">Engagement chart</p>
                  <p className="text-xs mt-1">
                    Trends will appear as data accumulates
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Campaign"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCampaign}
              loading={actionLoading}
            >
              Delete Campaign
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <strong>{campaign.name}</strong>? This
          will also remove all associated posts. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
