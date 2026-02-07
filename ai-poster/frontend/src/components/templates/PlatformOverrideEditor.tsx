import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Platform,
  Tone,
  ContentLength,
  PlatformOverrideDto,
} from '@ai-poster/shared';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

export interface PlatformOverrideEditorProps {
  overrides: PlatformOverrideDto[];
  onChange: (overrides: PlatformOverrideDto[]) => void;
}

const allPlatforms = Object.values(Platform);
const tones = Object.values(Tone);
const contentLengths = Object.values(ContentLength);

const POST_TYPES: Record<string, string[]> = {
  TWITTER: ['single', 'thread'],
  INSTAGRAM: ['feed', 'carousel', 'reel', 'story'],
  LINKEDIN: ['post', 'carousel'],
  LINKEDIN_PAGE: ['post', 'carousel'],
  YOUTUBE: ['video', 'short'],
  TIKTOK: ['video', 'photo'],
  REDDIT: ['text', 'link', 'image', 'video'],
  PINTEREST: ['pin', 'idea-pin'],
};

function formatEnum(val: string): string {
  return val
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PlatformOverrideEditor({
  overrides,
  onChange,
}: PlatformOverrideEditorProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hashInputs, setHashInputs] = useState<Record<string, string>>({});

  const existingPlatforms = overrides.map((o) => o.platform);
  const availablePlatforms = allPlatforms.filter(
    (p) => !existingPlatforms.includes(p)
  );

  const addOverride = (platform: Platform) => {
    onChange([
      ...overrides,
      { platform, hashtagOverride: [] },
    ]);
    setExpanded(platform);
  };

  const removeOverride = (platform: Platform) => {
    onChange(overrides.filter((o) => o.platform !== platform));
    if (expanded === platform) setExpanded(null);
  };

  const updateOverride = (
    platform: Platform,
    update: Partial<PlatformOverrideDto>
  ) => {
    onChange(
      overrides.map((o) =>
        o.platform === platform ? { ...o, ...update } : o
      )
    );
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Platform Overrides
      </h3>
      <p className="text-sm text-text-secondary mb-6">
        Customize tone, hashtags, and instructions per platform. These override
        the template defaults.
      </p>

      <div className="space-y-2 mb-4">
        {overrides.map((override) => {
          const isExpanded = expanded === override.platform;
          const types = POST_TYPES[override.platform] || [];
          const platformName =
            PLATFORM_DISPLAY_NAMES[override.platform] || override.platform;
          const platformColor =
            PLATFORM_ICON_COLORS[override.platform] || '#868e96';

          return (
            <div
              key={override.platform}
              className="border border-surface-tertiary rounded-lg overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : override.platform)
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-primary hover:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platformColor }}
                  />
                  <span className="font-medium text-sm text-text-primary">
                    {platformName}
                  </span>
                  {override.toneOverride && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted">
                      {formatEnum(override.toneOverride)}
                    </span>
                  )}
                  {override.hashtagOverride.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">
                      {override.hashtagOverride.length} hashtag
                      {override.hashtagOverride.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOverride(override.platform);
                    }}
                    className="text-text-muted hover:text-status-failed transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 py-4 border-t border-surface-tertiary bg-surface-secondary/30 space-y-4 animate-fade-in">
                  {/* Tone */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Tone Override
                    </label>
                    <select
                      value={override.toneOverride || ''}
                      onChange={(e) =>
                        updateOverride(override.platform, {
                          toneOverride: (e.target.value as Tone) || undefined,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="">Use template default</option>
                      {tones.map((t) => (
                        <option key={t} value={t}>
                          {formatEnum(t)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Content length */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Content Length Override
                    </label>
                    <select
                      value={override.contentLengthOverride || ''}
                      onChange={(e) =>
                        updateOverride(override.platform, {
                          contentLengthOverride:
                            (e.target.value as ContentLength) || undefined,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    >
                      <option value="">Use template default</option>
                      {contentLengths.map((l) => (
                        <option key={l} value={l}>
                          {formatEnum(l)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Post type */}
                  {types.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Post Type Preference
                      </label>
                      <select
                        value={override.postTypePreference || ''}
                        onChange={(e) =>
                          updateOverride(override.platform, {
                            postTypePreference: e.target.value || undefined,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                      >
                        <option value="">No preference</option>
                        {types.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Hashtags */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Platform-Specific Hashtags
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {override.hashtagOverride.map((tag, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs"
                        >
                          #{tag}
                          <button
                            onClick={() =>
                              updateOverride(override.platform, {
                                hashtagOverride:
                                  override.hashtagOverride.filter(
                                    (_, idx) => idx !== i
                                  ),
                              })
                            }
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={hashInputs[override.platform] || ''}
                      onChange={(e) =>
                        setHashInputs({
                          ...hashInputs,
                          [override.platform]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === 'Enter' &&
                          hashInputs[override.platform]?.trim()
                        ) {
                          updateOverride(override.platform, {
                            hashtagOverride: [
                              ...override.hashtagOverride,
                              hashInputs[override.platform].trim(),
                            ],
                          });
                          setHashInputs({
                            ...hashInputs,
                            [override.platform]: '',
                          });
                        }
                      }}
                      placeholder="Type and press Enter"
                      className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>

                  {/* Additional instructions */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Additional Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={override.additionalInstructions || ''}
                      onChange={(e) =>
                        updateOverride(override.platform, {
                          additionalInstructions: e.target.value,
                        })
                      }
                      placeholder="e.g., For LinkedIn, be more formal and use industry jargon"
                      className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>

                  {/* Custom CTA */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Custom CTA
                    </label>
                    <input
                      type="text"
                      value={override.customCta || ''}
                      onChange={(e) =>
                        updateOverride(override.platform, {
                          customCta: e.target.value,
                        })
                      }
                      placeholder="e.g., Follow for more tips!"
                      className="w-full px-3 py-1.5 border border-surface-tertiary rounded-md text-sm bg-surface-primary focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add override */}
      {availablePlatforms.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            id="add-platform-override-select"
            className="px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_DISPLAY_NAMES[p] || p}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById(
                'add-platform-override-select'
              ) as HTMLSelectElement;
              if (select?.value) addOverride(select.value as Platform);
            }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> Add Override
          </button>
        </div>
      )}
    </div>
  );
}
