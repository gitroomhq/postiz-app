import React, { useState } from 'react';
import { cn, getStatusLabel } from '@/lib/utils';
import { Platform, PostState } from '@ai-poster/shared';
import { CampaignDto } from '@ai-poster/shared';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS, STATUS_DOT_COLORS } from '@/lib/constants';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface CalendarFiltersState {
  campaigns: string[];
  platforms: Platform[];
  statuses: PostState[];
  tags: string[];
}

export interface CalendarFiltersProps {
  filters: CalendarFiltersState;
  onChange: (filters: CalendarFiltersState) => void;
  campaigns: CampaignDto[];
  availableTags: { id: string; name: string; color: string }[];
  className?: string;
}

export default function CalendarFilters({
  filters,
  onChange,
  campaigns,
  availableTags,
  className,
}: CalendarFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    campaigns: true,
    platforms: true,
    statuses: true,
    tags: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCampaign = (id: string) => {
    const next = filters.campaigns.includes(id)
      ? filters.campaigns.filter((c) => c !== id)
      : [...filters.campaigns, id];
    onChange({ ...filters, campaigns: next });
  };

  const togglePlatform = (platform: Platform) => {
    const next = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    onChange({ ...filters, platforms: next });
  };

  const toggleStatus = (status: PostState) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  };

  const toggleTag = (tagId: string) => {
    const next = filters.tags.includes(tagId)
      ? filters.tags.filter((t) => t !== tagId)
      : [...filters.tags, tagId];
    onChange({ ...filters, tags: next });
  };

  const clearFilters = () => {
    onChange({ campaigns: [], platforms: [], statuses: [], tags: [] });
  };

  const hasActiveFilters =
    filters.campaigns.length > 0 ||
    filters.platforms.length > 0 ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0;

  const allPlatforms = Object.values(Platform);
  const allStatuses = Object.values(PostState);

  const SectionHeader = ({
    title,
    section,
    count,
  }: {
    title: string;
    section: string;
    count: number;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide"
    >
      <span className="flex items-center gap-1.5">
        {title}
        {count > 0 && (
          <span className="bg-brand-600 text-white rounded-full px-1.5 py-0.5 text-[9px] leading-none">
            {count}
          </span>
        )}
      </span>
      {expandedSections[section] ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      )}
    </button>
  );

  return (
    <div className={cn('w-64 bg-surface-primary p-4 space-y-1', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-semibold text-text-primary">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Campaigns */}
      <div className="border-t border-surface-tertiary pt-1">
        <SectionHeader
          title="Campaigns"
          section="campaigns"
          count={filters.campaigns.length}
        />
        {expandedSections.campaigns && (
          <div className="space-y-1 pb-2">
            {campaigns.map((campaign) => (
              <label
                key={campaign.id}
                className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-surface-secondary transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.campaigns.includes(campaign.id)}
                  onChange={() => toggleCampaign(campaign.id)}
                  className="w-3.5 h-3.5 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-text-primary truncate">
                  {campaign.name}
                </span>
              </label>
            ))}
            {campaigns.length === 0 && (
              <p className="text-xs text-text-muted px-1">No campaigns</p>
            )}
          </div>
        )}
      </div>

      {/* Platforms */}
      <div className="border-t border-surface-tertiary pt-1">
        <SectionHeader
          title="Platforms"
          section="platforms"
          count={filters.platforms.length}
        />
        {expandedSections.platforms && (
          <div className="space-y-1 pb-2">
            {allPlatforms.map((platform) => {
              const displayName =
                PLATFORM_DISPLAY_NAMES[platform] || platform;
              const iconColor = PLATFORM_ICON_COLORS[platform] || '#868e96';
              return (
                <label
                  key={platform}
                  className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="w-3.5 h-3.5 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: iconColor }}
                  />
                  <span className="text-sm text-text-primary truncate">
                    {displayName}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="border-t border-surface-tertiary pt-1">
        <SectionHeader
          title="Status"
          section="statuses"
          count={filters.statuses.length}
        />
        {expandedSections.statuses && (
          <div className="space-y-1 pb-2">
            {allStatuses.map((status) => {
              const dotColor = STATUS_DOT_COLORS[status] || 'bg-gray-400';
              return (
                <label
                  key={status}
                  className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-surface-secondary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="w-3.5 h-3.5 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
                  />
                  <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
                  <span className="text-sm text-text-primary">
                    {getStatusLabel(status)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="border-t border-surface-tertiary pt-1">
        <SectionHeader title="Tags" section="tags" count={filters.tags.length} />
        {expandedSections.tags && (
          <div className="space-y-1 pb-2">
            {availableTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 px-1 py-1 rounded cursor-pointer hover:bg-surface-secondary transition-colors"
              >
                <input
                  type="checkbox"
                  checked={filters.tags.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="w-3.5 h-3.5 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-text-primary">{tag.name}</span>
              </label>
            ))}
            {availableTags.length === 0 && (
              <p className="text-xs text-text-muted px-1">No tags</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
