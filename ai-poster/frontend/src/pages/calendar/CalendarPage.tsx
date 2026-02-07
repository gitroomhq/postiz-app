import React, { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarFilters, {
  type CalendarFiltersState,
} from '@/components/calendar/CalendarFilters';
import CalendarSidePanel from '@/components/calendar/CalendarSidePanel';
import { useCalendar } from '@/hooks/useCalendar';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useCalendarStore } from '@/store/calendar.store';
import { fetchApi } from '@/lib/api';
import type { PostDto } from '@ai-poster/shared';
import toast from 'react-hot-toast';

export function CalendarPage() {
  const navigate = useNavigate();
  const { currentDate, filters, setFilters } = useCalendarStore();
  const { campaigns } = useCampaigns();
  const { integrations } = useIntegrations();

  const [selectedPost, setSelectedPost] = useState<PostDto | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const [calendarFilters, setCalendarFilters] = useState<CalendarFiltersState>({
    campaigns: filters.campaignId ? [filters.campaignId] : [],
    platforms: [],
    statuses: [],
    tags: [],
  });

  const dateRange = useMemo(() => {
    const d = dayjs(currentDate);
    return {
      start: d.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'),
      end: d.endOf('month').add(7, 'day').format('YYYY-MM-DD'),
    };
  }, [currentDate]);

  const apiFilters = useMemo(() => {
    const f: { campaignId?: string; integrationId?: string; status?: string } = {};
    if (calendarFilters.campaigns.length === 1) {
      f.campaignId = calendarFilters.campaigns[0];
    }
    if (calendarFilters.statuses.length === 1) {
      f.status = calendarFilters.statuses[0];
    }
    return f;
  }, [calendarFilters]);

  const { posts, isLoading, mutate } = useCalendar(
    dateRange.start,
    dateRange.end,
    apiFilters
  );

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (calendarFilters.campaigns.length > 1) {
      result = result.filter(
        (p) => p.campaignId && calendarFilters.campaigns.includes(p.campaignId)
      );
    }
    if (calendarFilters.platforms.length > 0) {
      result = result.filter((p) => {
        const platform = p.platformSettings?.platform as string | undefined;
        return platform && calendarFilters.platforms.includes(platform as any);
      });
    }
    if (calendarFilters.statuses.length > 1) {
      result = result.filter((p) =>
        calendarFilters.statuses.includes(p.state as any)
      );
    }
    return result;
  }, [posts, calendarFilters]);

  const handleSelectPost = useCallback((post: PostDto) => {
    setSelectedPost(post);
    setSidePanelOpen(true);
  }, []);

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
        mutate();
      } catch {
        toast.error('Failed to reschedule post');
      }
    },
    [mutate]
  );

  const handleApprovePost = useCallback(
    async (post: PostDto) => {
      try {
        await fetchApi(`/posts/${post.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ action: 'APPROVED' }),
        });
        toast.success('Post approved');
        mutate();
      } catch {
        toast.error('Failed to approve post');
      }
    },
    [mutate]
  );

  const handleRejectPost = useCallback(
    async (post: PostDto) => {
      try {
        await fetchApi(`/posts/${post.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ action: 'REJECTED' }),
        });
        toast.success('Post rejected');
        mutate();
        setSidePanelOpen(false);
      } catch {
        toast.error('Failed to reject post');
      }
    },
    [mutate]
  );

  const handleRegeneratePost = useCallback(
    async (post: PostDto) => {
      try {
        await fetchApi(`/posts/${post.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ action: 'REGENERATE' }),
        });
        toast.success('Post sent for regeneration');
        mutate();
        setSidePanelOpen(false);
      } catch {
        toast.error('Failed to regenerate post');
      }
    },
    [mutate]
  );

  const handleDeletePost = useCallback(
    async (post: PostDto) => {
      try {
        await fetchApi(`/posts/${post.id}`, { method: 'DELETE' });
        toast.success('Post deleted');
        mutate();
        setSidePanelOpen(false);
      } catch {
        toast.error('Failed to delete post');
      }
    },
    [mutate]
  );

  const handleFiltersChange = useCallback(
    (newFilters: CalendarFiltersState) => {
      setCalendarFilters(newFilters);
      if (newFilters.campaigns.length === 1) {
        setFilters({ ...filters, campaignId: newFilters.campaigns[0] });
      } else {
        setFilters({ ...filters, campaignId: undefined });
      }
    },
    [filters, setFilters]
  );

  if (isLoading && posts.length === 0) return <PageSpinner />;

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      {showFilters && (
        <div className="hidden border-r border-gray-100 lg:block">
          <CalendarFilters
            filters={calendarFilters}
            onChange={handleFiltersChange}
            campaigns={campaigns}
            availableTags={[]}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="section-title">Calendar</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="hidden text-xs text-brand-600 hover:text-brand-700 font-medium lg:block"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/posts/new')}
          >
            New Post
          </Button>
        </div>

        {/* Calendar Grid */}
        <CalendarGrid
          posts={filteredPosts}
          onSelectPost={handleSelectPost}
          onCreatePost={handleCreatePost}
          onDropPost={handleDropPost}
          onApprovePost={handleApprovePost}
          onEditPost={(post) => navigate(`/posts/${post.id}`)}
          onDeletePost={handleDeletePost}
        />
      </div>

      {/* Side Panel for post preview */}
      <CalendarSidePanel
        post={selectedPost}
        isOpen={sidePanelOpen}
        onClose={() => {
          setSidePanelOpen(false);
          setSelectedPost(null);
        }}
        onApprove={handleApprovePost}
        onReject={handleRejectPost}
        onEdit={(post) => navigate(`/posts/${post.id}`)}
        onRegenerate={handleRegeneratePost}
        onDelete={handleDeletePost}
      />
    </div>
  );
}
