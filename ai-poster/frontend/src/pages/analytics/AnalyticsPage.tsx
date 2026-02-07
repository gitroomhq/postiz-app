import React, { useState } from 'react';
import {
  Eye,
  TrendingUp,
  MousePointerClick,
  MessageSquare,
  BarChart3,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCampaigns } from '@/hooks/useCampaigns';
import dayjs from 'dayjs';

export function AnalyticsPage() {
  const { campaigns } = useCampaigns();
  const [campaignId, setCampaignId] = useState('');
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, 'day').format('YYYY-MM-DD')
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { overview, topPosts, engagementTrend, isLoading } = useAnalytics({
    campaignId: campaignId || undefined,
    startDate,
    endDate,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-container space-y-6">
      <div>
        <h2 className="section-title">Analytics</h2>
        <p className="subtle-text mt-1">
          Track performance across your social channels.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Campaign"
          options={[
            { value: '', label: 'All Campaigns' },
            ...campaigns.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-52"
        />
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-44"
        />
        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Overview Cards */}
      {overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Impressions</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {overview.totalImpressions.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Eye className="h-5 w-5 text-status-publishing" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Engagement</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {overview.totalEngagement.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <TrendingUp className="h-5 w-5 text-status-approved" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Clicks</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {overview.totalClicks.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <MousePointerClick className="h-5 w-5 text-status-scheduled" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Engagement Rate</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {overview.engagementRate.toFixed(2)}%
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <ArrowUpRight className="h-5 w-5 text-status-generated" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No analytics data"
          description="Analytics will appear once your posts start getting engagement."
        />
      )}

      {/* Engagement Trend Chart Placeholder */}
      <Card>
        <CardHeader>Engagement Trend</CardHeader>
        <CardBody>
          {engagementTrend.length > 0 ? (
            <div className="space-y-3">
              {/* Simple bar chart representation */}
              <div className="flex items-end gap-1" style={{ height: 200 }}>
                {engagementTrend.map((point, idx) => {
                  const maxEngagement = Math.max(
                    ...engagementTrend.map((p) => p.engagement),
                    1
                  );
                  const height = (point.engagement / maxEngagement) * 100;
                  return (
                    <div
                      key={idx}
                      className="group relative flex-1"
                      style={{ height: '100%' }}
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-brand-400 transition-colors group-hover:bg-brand-600"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                        {point.engagement} engagement
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>{dayjs(engagementTrend[0]?.date).format('MMM D')}</span>
                <span>
                  {dayjs(
                    engagementTrend[engagementTrend.length - 1]?.date
                  ).format('MMM D')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-text-muted">
                No trend data available for this period
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Top Posts */}
      <Card>
        <CardHeader>Top Performing Posts</CardHeader>
        <CardBody>
          {topPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No post performance data yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topPosts.map((postAnalytics, idx) => (
                <div
                  key={postAnalytics.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-50 p-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-center text-xs">
                    <div>
                      <p className="font-medium text-text-primary">
                        {postAnalytics.impressions.toLocaleString()}
                      </p>
                      <p className="text-text-muted">Impressions</p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {postAnalytics.likes.toLocaleString()}
                      </p>
                      <p className="text-text-muted">Likes</p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {postAnalytics.comments.toLocaleString()}
                      </p>
                      <p className="text-text-muted">Comments</p>
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {postAnalytics.shares.toLocaleString()}
                      </p>
                      <p className="text-text-muted">Shares</p>
                    </div>
                  </div>
                  {postAnalytics.platformUrl && (
                    <a
                      href={postAnalytics.platformUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-muted hover:text-brand-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
