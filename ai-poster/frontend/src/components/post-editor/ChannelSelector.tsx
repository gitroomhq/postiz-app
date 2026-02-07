import React from 'react';
import { cn } from '@/lib/utils';
import { Platform } from '@ai-poster/shared';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';

export interface ChannelOption {
  id: string;
  platform: Platform;
  name: string;
  avatar?: string;
}

export type EditorMode = 'global' | 'per-channel';

export interface ChannelSelectorProps {
  channels: ChannelOption[];
  selectedChannels: string[];
  onToggleChannel: (channelId: string) => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  activeChannelTab?: string;
  onChannelTabChange?: (channelId: string) => void;
}

export default function ChannelSelector({
  channels,
  selectedChannels,
  onToggleChannel,
  editorMode,
  onEditorModeChange,
  activeChannelTab,
  onChannelTabChange,
}: ChannelSelectorProps) {
  const selectedChannelObjects = channels.filter((c) =>
    selectedChannels.includes(c.id)
  );

  return (
    <div className="space-y-3">
      {/* Channel icons row */}
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id);
          const iconColor = PLATFORM_ICON_COLORS[channel.platform] || '#868e96';
          const displayName =
            channel.name ||
            PLATFORM_DISPLAY_NAMES[channel.platform] ||
            channel.platform;

          return (
            <button
              key={channel.id}
              onClick={() => onToggleChannel(channel.id)}
              title={displayName}
              className={cn(
                'relative w-10 h-10 rounded-full flex items-center justify-center',
                'border-2 transition-all',
                isSelected
                  ? 'border-current shadow-sm scale-105'
                  : 'border-surface-tertiary opacity-50 hover:opacity-80'
              )}
              style={isSelected ? { borderColor: iconColor } : undefined}
            >
              {channel.avatar ? (
                <img
                  src={channel.avatar}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: iconColor }}
                />
              )}

              {/* Tooltip on hover */}
              <span
                className={cn(
                  'absolute -bottom-6 left-1/2 -translate-x-1/2',
                  'text-[10px] text-text-muted whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 pointer-events-none'
                )}
              >
                {displayName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Editor mode toggle */}
      {selectedChannels.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-secondary rounded-lg p-0.5">
            <button
              onClick={() => onEditorModeChange('global')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                editorMode === 'global'
                  ? 'bg-surface-primary text-brand-600 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              Global
            </button>
            <button
              onClick={() => onEditorModeChange('per-channel')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                editorMode === 'per-channel'
                  ? 'bg-surface-primary text-brand-600 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              Per-Channel
            </button>
          </div>
          <span className="text-xs text-text-muted">
            {editorMode === 'global'
              ? 'Same content for all channels'
              : 'Customize per channel'}
          </span>
        </div>
      )}

      {/* Per-channel tabs */}
      {editorMode === 'per-channel' && selectedChannelObjects.length > 1 && (
        <div className="flex gap-1 border-b border-surface-tertiary">
          {selectedChannelObjects.map((channel) => {
            const iconColor = PLATFORM_ICON_COLORS[channel.platform] || '#868e96';
            const isActive = activeChannelTab === channel.id;
            const displayName =
              channel.name ||
              PLATFORM_DISPLAY_NAMES[channel.platform] ||
              channel.platform;

            return (
              <button
                key={channel.id}
                onClick={() => onChannelTabChange?.(channel.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-current text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                )}
                style={isActive ? { borderColor: iconColor } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: iconColor }}
                />
                {displayName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
