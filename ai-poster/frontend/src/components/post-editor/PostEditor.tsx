import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Platform, ValidationError, PLATFORM_LIMITS } from '@ai-poster/shared';
import ChannelSelector, { ChannelOption, EditorMode } from './ChannelSelector';
import RichTextEditor from './RichTextEditor';
import MediaAttachment, { MediaItem } from './MediaAttachment';
import PostPreview from './PostPreview';
import SchedulePicker, { SuggestedTime } from './SchedulePicker';
import AiAssistBar from './AiAssistBar';
import ThreadBuilder, { ThreadPost } from './ThreadBuilder';

export interface PostEditorState {
  selectedChannels: string[];
  editorMode: EditorMode;
  activeChannelTab: string;
  globalContent: string;
  globalPlainText: string;
  channelContent: Record<string, { html: string; plain: string }>;
  media: MediaItem[];
  scheduledDate: Date | null;
  threadPosts: ThreadPost[];
  isThread: boolean;
}

export interface PostEditorProps {
  channels: ChannelOption[];
  initialState?: Partial<PostEditorState>;
  suggestedTimes?: SuggestedTime[];
  onSave: (state: PostEditorState) => void;
  onPostNow: (state: PostEditorState) => void;
  onSaveDraft: (state: PostEditorState) => void;
  onImproveWithAi: (instruction: string) => Promise<string>;
  onGenerateImage: (prompt: string) => Promise<string>;
  onSuggestHashtags: (content: string) => Promise<string[]>;
  onBestTime: () => Promise<{ time: string; reason: string }[]>;
  onUploadMedia: (files: File[]) => void;
  onOpenMediaLibrary: () => void;
  onAiGenerateMedia: (prompt: string) => void;
  className?: string;
}

function getDefaultState(initial?: Partial<PostEditorState>): PostEditorState {
  return {
    selectedChannels: initial?.selectedChannels || [],
    editorMode: initial?.editorMode || 'global',
    activeChannelTab: initial?.activeChannelTab || '',
    globalContent: initial?.globalContent || '',
    globalPlainText: initial?.globalPlainText || '',
    channelContent: initial?.channelContent || {},
    media: initial?.media || [],
    scheduledDate: initial?.scheduledDate || null,
    threadPosts: initial?.threadPosts || [
      { id: 'thread-1', content: '', plainText: '', delay: 0, mediaIds: [] },
    ],
    isThread: initial?.isThread || false,
  };
}

export default function PostEditor({
  channels,
  initialState,
  suggestedTimes,
  onSave,
  onPostNow,
  onSaveDraft,
  onImproveWithAi,
  onGenerateImage,
  onSuggestHashtags,
  onBestTime,
  onUploadMedia,
  onOpenMediaLibrary,
  onAiGenerateMedia,
  className,
}: PostEditorProps) {
  const [state, setState] = useState<PostEditorState>(
    getDefaultState(initialState)
  );

  const updateState = useCallback(
    (updates: Partial<PostEditorState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Get the active platform for preview
  const activeChannel = useMemo(() => {
    const channelId = state.activeChannelTab || state.selectedChannels[0];
    return channels.find((c) => c.id === channelId);
  }, [channels, state.activeChannelTab, state.selectedChannels]);

  const activePlatform = activeChannel?.platform || Platform.TWITTER;
  const activeLimits = PLATFORM_LIMITS[activePlatform];

  // Check if active platform supports threads
  const supportsThreads = activeLimits?.supportsThreads || false;

  // Current content based on editor mode
  const currentContent =
    state.editorMode === 'per-channel' && state.activeChannelTab
      ? state.channelContent[state.activeChannelTab]?.html || ''
      : state.globalContent;

  const currentPlainText =
    state.editorMode === 'per-channel' && state.activeChannelTab
      ? state.channelContent[state.activeChannelTab]?.plain || ''
      : state.globalPlainText;

  // Validation
  const validationErrors = useMemo((): ValidationError[] => {
    const errors: ValidationError[] = [];
    const text = currentPlainText;

    if (activeLimits) {
      if (text.length > activeLimits.maxChars) {
        errors.push({
          field: 'content',
          message: `Content exceeds ${activeLimits.maxChars} character limit for ${activeLimits.displayName}`,
          severity: 'error',
        });
      }
      if (text.length > activeLimits.maxChars * 0.9 && text.length <= activeLimits.maxChars) {
        errors.push({
          field: 'content',
          message: `Content is approaching ${activeLimits.maxChars} character limit`,
          severity: 'warning',
        });
      }
      if (activeLimits.requiresMedia && state.media.length === 0) {
        errors.push({
          field: 'media',
          message: `${activeLimits.displayName} requires at least one media attachment`,
          severity: 'error',
        });
      }
      if (state.media.length > activeLimits.maxImages) {
        errors.push({
          field: 'media',
          message: `Too many images. ${activeLimits.displayName} allows max ${activeLimits.maxImages}`,
          severity: 'error',
        });
      }
    }

    if (state.selectedChannels.length === 0) {
      errors.push({
        field: 'channels',
        message: 'Select at least one channel',
        severity: 'error',
      });
    }

    return errors;
  }, [currentPlainText, activeLimits, state.media, state.selectedChannels]);

  const handleContentChange = useCallback(
    (html: string, plain: string) => {
      if (state.editorMode === 'per-channel' && state.activeChannelTab) {
        updateState({
          channelContent: {
            ...state.channelContent,
            [state.activeChannelTab]: { html, plain },
          },
        });
      } else {
        updateState({ globalContent: html, globalPlainText: plain });
      }
    },
    [state.editorMode, state.activeChannelTab, state.channelContent, updateState]
  );

  const handleToggleChannel = useCallback(
    (channelId: string) => {
      const isSelected = state.selectedChannels.includes(channelId);
      const next = isSelected
        ? state.selectedChannels.filter((id) => id !== channelId)
        : [...state.selectedChannels, channelId];
      const updates: Partial<PostEditorState> = { selectedChannels: next };

      if (!isSelected && next.length === 1) {
        updates.activeChannelTab = channelId;
      }
      if (isSelected && state.activeChannelTab === channelId && next.length > 0) {
        updates.activeChannelTab = next[0];
      }
      updateState(updates);
    },
    [state.selectedChannels, state.activeChannelTab, updateState]
  );

  return (
    <div className={cn('flex gap-4 h-full', className)}>
      {/* Left panel: Editor (70%) */}
      <div className="w-[70%] flex flex-col space-y-4 overflow-y-auto p-4">
        {/* Channel selector */}
        <ChannelSelector
          channels={channels}
          selectedChannels={state.selectedChannels}
          onToggleChannel={handleToggleChannel}
          editorMode={state.editorMode}
          onEditorModeChange={(mode) => updateState({ editorMode: mode })}
          activeChannelTab={state.activeChannelTab}
          onChannelTabChange={(id) => updateState({ activeChannelTab: id })}
        />

        {/* Thread toggle for supported platforms */}
        {supportsThreads && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.isThread}
                onChange={(e) => updateState({ isThread: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-text-secondary">
                Create as thread
              </span>
            </label>
          </div>
        )}

        {/* Editor area */}
        {state.isThread && supportsThreads ? (
          <ThreadBuilder
            posts={state.threadPosts}
            onChange={(posts) => updateState({ threadPosts: posts })}
            maxChars={activeLimits?.maxChars}
            platformName={activeLimits?.displayName}
          />
        ) : (
          <RichTextEditor
            content={currentContent}
            onChange={handleContentChange}
            maxChars={activeLimits?.maxChars}
            placeholder={`Write your ${activeLimits?.displayName || ''} post...`}
          />
        )}

        {/* Media attachment */}
        <MediaAttachment
          items={state.media}
          onChange={(media) => updateState({ media })}
          maxItems={activeLimits?.maxImages || 4}
          onOpenLibrary={onOpenMediaLibrary}
          onAiGenerate={onAiGenerateMedia}
          onUpload={onUploadMedia}
        />

        {/* Schedule picker */}
        <SchedulePicker
          selectedDate={state.scheduledDate}
          onChange={(date) => updateState({ scheduledDate: date })}
          onPostNow={() => onPostNow(state)}
          onSaveDraft={() => onSaveDraft(state)}
          suggestedTimes={suggestedTimes}
        />

        {/* AI Assist bar - fixed at bottom */}
        <div className="sticky bottom-0 pt-2">
          <AiAssistBar
            onImprove={onImproveWithAi}
            onGenerateImage={onGenerateImage}
            onSuggestHashtags={onSuggestHashtags}
            onBestTime={onBestTime}
            currentContent={currentPlainText}
          />
        </div>
      </div>

      {/* Right panel: Preview (30%) */}
      <div className="w-[30%] border-l border-surface-tertiary p-4 overflow-y-auto bg-surface-secondary/30">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-4">
          Live Preview
        </h3>
        <PostPreview
          platform={activePlatform}
          content={currentContent}
          plainText={currentPlainText}
          images={state.media
            .filter((m) => m.type === 'image')
            .map((m) => ({ url: m.url, altText: m.altText }))}
          limits={activeLimits}
          validationErrors={validationErrors}
        />
      </div>
    </div>
  );
}
