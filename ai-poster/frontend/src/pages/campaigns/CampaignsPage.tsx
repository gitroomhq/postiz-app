import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, Calendar, FileCheck } from 'lucide-react';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useCampaigns } from '@/hooks/useCampaigns';
import { formatDate, getStatusLabel } from '@/lib/utils';
import type { CampaignStatus } from '@ai-poster/shared';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function CampaignsPage() {
  const navigate = useNavigate();
  const { campaigns, isLoading } = useCampaigns();
  const [statusFilter, setStatusFilter] = useState('');

  const filteredCampaigns = statusFilter
    ? campaigns.filter((c) => c.status === statusFilter)
    : campaigns;

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Campaigns</h2>
          <p className="subtle-text mt-1">
            Manage your content campaigns and automate publishing.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/campaigns/new')}
        >
          New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        />
        <span className="text-sm text-text-muted">
          {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-7 w-7" />}
          title="No campaigns yet"
          description="Create your first campaign to start generating and scheduling posts automatically."
          actionLabel="Create Campaign"
          onAction={() => navigate('/campaigns/new')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              hoverable
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            >
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {campaign.name}
                    </h3>
                    {campaign.description && (
                      <p className="mt-1 text-sm text-text-muted line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusToBadgeVariant(campaign.status)} dot>
                    {getStatusLabel(campaign.status)}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                  </div>
                </div>

                <div className="mt-3">
                  <Badge variant="default">
                    {getStatusLabel(campaign.mode)}
                  </Badge>
                </div>
              </CardBody>
              <CardFooter className="justify-between text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <FileCheck className="h-3.5 w-3.5" />
                  {campaign.approvedCount ?? 0} / {campaign.postCount ?? 0} approved
                </div>
                <span>{campaign.postsPerWeek} posts/week</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
