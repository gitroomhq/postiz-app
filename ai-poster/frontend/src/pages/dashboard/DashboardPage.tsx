import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CalendarDays,
  BarChart3,
  Megaphone,
  PenSquare,
  Upload,
  ArrowRight,
  TrendingUp,
  Eye,
  MousePointerClick,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { usePosts } from '@/hooks/usePosts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatDateTime, getStatusLabel } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { posts: pendingPosts, isLoading: pendingLoading } = usePosts({
    state: 'PENDING_APPROVAL',
    limit: 5,
  });
  const { posts: upcomingPosts, isLoading: upcomingLoading } = usePosts({
    state: 'SCHEDULED',
    limit: 5,
  });
  const { overview, isLoading: analyticsLoading } = useAnalytics();

  const isLoading = pendingLoading || upcomingLoading || analyticsLoading;

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div className="page-container space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          icon={<Megaphone className="h-4 w-4" />}
          onClick={() => navigate('/campaigns/new')}
        >
          New Campaign
        </Button>
        <Button
          variant="secondary"
          icon={<PenSquare className="h-4 w-4" />}
          onClick={() => navigate('/posts/new')}
        >
          New Post
        </Button>
        <Button
          variant="secondary"
          icon={<Upload className="h-4 w-4" />}
          onClick={() => navigate('/upload-process')}
        >
          Upload Images
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Pending Approvals</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">
                  {overview?.pendingApprovals ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                <Clock className="h-6 w-6 text-status-pending" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Posts This Week</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">
                  {overview?.postsThisWeek ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <CalendarDays className="h-6 w-6 text-status-scheduled" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Impressions</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">
                  {overview?.totalImpressions
                    ? overview.totalImpressions.toLocaleString()
                    : '0'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                <Eye className="h-6 w-6 text-status-publishing" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Engagement Rate</p>
                <p className="mt-1 text-3xl font-bold text-text-primary">
                  {overview?.engagementRate
                    ? `${overview.engagementRate.toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                <TrendingUp className="h-6 w-6 text-status-approved" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
          <CardHeader
            action={
              <button
                onClick={() => navigate('/posts/pending')}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                View all <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            Pending Approvals
          </CardHeader>
          <CardBody className="space-y-3">
            {pendingPosts.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                No pending approvals
              </p>
            ) : (
              pendingPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-50 p-3 transition-colors hover:bg-surface-secondary"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {post.plainText || 'Untitled post'}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDateTime(post.publishDate || post.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusToBadgeVariant(post.state)} dot>
                    {getStatusLabel(post.state)}
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader
            action={
              <button
                onClick={() => navigate('/calendar')}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                View calendar <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            Upcoming Posts
          </CardHeader>
          <CardBody className="space-y-3">
            {upcomingPosts.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                No upcoming posts scheduled
              </p>
            ) : (
              upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-50 p-3 transition-colors hover:bg-surface-secondary"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {post.plainText || 'Untitled post'}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDateTime(post.publishDate)}
                    </p>
                  </div>
                  <Badge variant="scheduled" dot>
                    Scheduled
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Analytics Preview */}
      <Card>
        <CardHeader
          action={
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
            >
              Full analytics <ArrowRight className="h-4 w-4" />
            </button>
          }
        >
          Recent Performance
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">Total Impressions</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview?.totalImpressions?.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">Total Engagement</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview?.totalEngagement?.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <MousePointerClick className="h-5 w-5 text-text-muted" />
                <span className="text-sm text-text-muted">Total Clicks</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview?.totalClicks?.toLocaleString() ?? '0'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
