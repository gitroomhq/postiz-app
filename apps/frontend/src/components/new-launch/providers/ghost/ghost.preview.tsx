'use client';

import { FC, useMemo, useState, useEffect, useCallback } from 'react';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import clsx from 'clsx';
import Image from 'next/image';

type PreviewMode = 'static' | 'live' | 'member';
type MemberStatus = 'public' | 'members' | 'paid';

interface PreviewSettings {
  member_status?: MemberStatus;
  include?: Array<'tags' | 'authors' | 'tiers'>;
}

// Ghost Theme Variables fetched from API
interface ThemeVariables {
  [key: string]: string;
}

// Theme colors by Ghost theme type
const THEME_PRESETS: Record<string, ThemeVariables> = {
  casper: {
    '--ghost-accent-color': '#15171a',
    '--color-primary': '#15171a',
    '--color-secondary': '#738a94',
  },
  'casper-dark': {
    '--ghost-accent-color': '#f0f0f0',
    '--color-primary': '#f0f0f0',
    '--color-secondary': '#a0a0a0',
  },
  edition: {
    '--ghost-accent-color': '#1e90ff',
    '--color-primary': '#1a1a1a',
    '--color-secondary': '#666',
  },
  'liebling-journal': {
    '--ghost-accent-color': '#008000',
    '--color-primary': '#000',
    '--color-secondary': '#999',
  },
};

/**
 * Ghost Preview Component
 * Supports three preview modes:
 * - Static: Local HTML preview (fastest, no API call)
 * - Live: Ghost iframe preview from actual Ghost site
 * - Member: Ghost iframe with member_status parameter to test visibility
 */
export const GhostPreviewComponent: FC<{
  maximumCharacters?: number;
}> = () => {
  const { value: topValue, integration } = useIntegration();
  const current = useLaunchStore((state) => state.current);
  const form = useSettings();
  
  // Preview mode state
  const [previewMode, setPreviewMode] = useState<PreviewMode>('static');
  const [memberStatus, setMemberStatus] = useState<MemberStatus>('public');
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [themeVariables, setThemeVariables] = useState<ThemeVariables>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Get settings from form
  const title = form.watch('title') || '';
  const featureImage = form.watch('feature_image');
  const featureImageCaption = form.watch('feature_image_caption');
  const visibility = form.watch('visibility') || 'public';
  const tags = form.watch('tags') || [];
  const excerpt = form.watch('custom_excerpt') || '';

  // Fetch live preview from Ghost API
  const fetchLivePreview = useCallback(async (memberStatus: MemberStatus) => {
    if (!integration?.id) return;
    
    setIsLoading(true);
    setPreviewError(null);
    
    try {
      const content = topValue[0]?.content || '';
      
      // Call Postiz API to trigger Ghost preview tool
      const response = await fetch('/api/integration-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId: integration.id,
          provider: 'ghost',
          action: 'preview',
          data: {
            title: title || 'Untitled',
            html: content,
            member_status: memberStatus,
            include: ['tags', 'authors'],
            custom_excerpt: excerpt,
            visibility,
            feature_image: featureImage?.path,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Set the live preview URL (with member_status param for member mode)
      if (previewMode === 'member') {
        setLivePreviewUrl(result.previewUrlWithParams || result.previewUrl);
      } else {
        setLivePreviewUrl(result.previewUrl);
      }

      // Apply theme variables if returned
      if (result.themeVariables) {
        setThemeVariables(result.themeVariables);
      }
    } catch (err: any) {
      console.error('Live preview fetch error:', err);
      setPreviewError(err?.message || 'Failed to fetch live preview');
    } finally {
      setIsLoading(false);
    }
  }, [integration?.id, topValue, title, excerpt, visibility, featureImage, previewMode]);

  // Fetch live preview when mode changes
  useEffect(() => {
    if (previewMode === 'member' && integration?.id) {
      fetchLivePreview(memberStatus);
    } else if (previewMode === 'live' && integration?.id) {
      fetchLivePreview('public');
    }
  }, [previewMode, memberStatus, integration?.id]);

  // Build the HTML content for static preview
  const previewHtml = useMemo(() => {
    const content = topValue[0]?.content || '';
    
    // Merge theme variables (API-provided > preset > default)
    const themeVars = {
      ...THEME_PRESETS['casper'],
      ...themeVariables,
    };
    
    // Create CSS variables string
    const cssVars = Object.entries(themeVars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n          ');
    
    // Build visibility badges based on member status
    const getVisibilityBadge = () => {
      if (previewMode === 'member') {
        return `<span class="visibility-badge visibility-${memberStatus}">
          ${memberStatus === 'public' ? '🔓 Public View' : memberStatus === 'members' ? '👥 Member View' : '💎 Paid View'}
        </span>`;
      }
      return `<span class="visibility-badge visibility-${visibility}">
        ${visibility === 'public' ? '🔓 Public' : visibility === 'members' ? '👥 Members' : '💎 Paid'}
      </span>`;
    };
    
    // Create a styled HTML document that mimics Ghost's Casper theme
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          :root {
            --ghost-accent-color: #15171a;
            --color-primary: #15171a;
            --color-secondary: #738a94;
            --font-sans: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;
            --font-serif: Georgia,Times,serif;
            ${cssVars}
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: var(--font-sans);
            font-size: 16px;
            line-height: 1.7;
            color: var(--color-primary);
            background: #f4f8fb;
          }
          
          .post-container {
            max-width: 720px;
            margin: 0 auto;
            padding: 32px 20px;
            background: white;
            min-height: 100vh;
          }
          
          .post-header {
            margin-bottom: 32px;
          }
          
          .post-title {
            font-family: var(--font-serif);
            font-size: 36px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 16px;
            color: #0d0d0d;
          }
          
          .post-excerpt {
            font-size: 18px;
            line-height: 1.5;
            color: var(--color-secondary);
            margin-bottom: 16px;
          }
          
          .post-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            font-size: 14px;
            color: var(--color-secondary);
          }
          
          .post-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
          }
          
          .post-tag {
            background: #e4e8eb;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 13px;
            color: #3c484e;
          }
          
          .visibility-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .visibility-public {
            background: #e0f2fe;
            color: #0369a1;
          }
          
          .visibility-members {
            background: #fef3c7;
            color: #92400e;
          }
          
          .visibility-paid {
            background: #fce7f3;
            color: #9d174d;
          }
          
          .feature-image {
            width: 100%;
            margin-bottom: 32px;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .feature-image img {
            width: 100%;
            height: auto;
            display: block;
          }
          
          .feature-image figcaption {
            text-align: center;
            font-size: 14px;
            color: var(--color-secondary);
            margin-top: 8px;
            padding: 0 16px;
          }
          
          .post-content {
            font-family: var(--font-serif);
            font-size: 18px;
            line-height: 1.75;
            color: var(--color-primary);
          }
          
          .post-content h1, .post-content h2, .post-content h3 {
            font-family: var(--font-sans);
            margin-top: 32px;
            margin-bottom: 16px;
          }
          
          .post-content h2 {
            font-size: 28px;
            font-weight: 700;
          }
          
          .post-content h3 {
            font-size: 22px;
            font-weight: 600;
          }
          
          .post-content p {
            margin-bottom: 24px;
          }
          
          .post-content a {
            color: var(--ghost-accent-color);
            text-decoration: underline;
          }
          
          .post-content img {
            max-width: 100%;
            margin: 32px auto;
            display: block;
            border-radius: 4px;
          }
          
          .post-content ul, .post-content ol {
            margin-bottom: 24px;
            padding-left: 28px;
          }
          
          .post-content li {
            margin-bottom: 8px;
          }
          
          .post-content blockquote {
            margin: 32px 0;
            padding: 12px 24px;
            border-left: 4px solid var(--ghost-accent-color);
            background: #f4f8fb;
            font-style: italic;
          }
          
          .post-content code {
            background: #f4f8fb;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 15px;
          }
          
          .post-content pre {
            background: #15171a;
            color: #a0aec0;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 24px 0;
          }
          
          .post-content pre code {
            background: none;
            padding: 0;
          }
          
          .post-content hr {
            border: none;
            border-top: 2px solid #e4e8eb;
            margin: 40px 0;
          }
          
          .member-content-overlay {
            position: relative;
          }
          
          .member-content-overlay::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(transparent 50%, white 100%);
            pointer-events: none;
          }
          
          .member-upsell-card {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            background: var(--ghost-accent-color);
            color: white;
            padding: 24px 48px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .member-upsell-card h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
          }
          
          .member-upsell-card p {
            margin: 0 0 16px 0;
            font-size: 14px;
            opacity: 0.9;
          }
          
          .member-upsell-card button {
            background: white;
            color: var(--ghost-accent-color);
            border: none;
            padding: 8px 24px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
          }
          
          .no-content-message {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 150px;
            color: var(--color-secondary);
            font-style: italic;
          }
          
          /* Preview mode indicator */
          .preview-mode-indicator {
            position: fixed;
            top: 8px;
            right: 8px;
            background: var(--ghost-accent-color);
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <article class="post-container">
          <header class="post-header">
            ${tags && tags.length > 0 ? `
              <div class="post-tags">
                ${(Array.isArray(tags) ? tags : []).map((tag: string) => `<span class="post-tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
            
            ${title ? `<h1 class="post-title">${title}</h1>` : ''}
            
            <div class="post-meta">
              ${getVisibilityBadge()}
              <span>•</span>
              <span>Draft Preview</span>
            </div>
            
            ${excerpt ? `<p class="post-excerpt">${excerpt}</p>` : ''}
          </header>
          
          ${featureImage?.path ? `
            <figure class="feature-image">
              <img src="${featureImage.path}" alt="${form.watch('feature_image_alt') || ''}" />
              ${featureImageCaption ? `<figcaption>${featureImageCaption}</figcaption>` : ''}
            </figure>
          ` : ''}
          
          <div class="post-content ${memberStatus !== 'public' && visibility !== 'public' ? 'member-content-overlay' : ''}">
            ${content ? content : `
              <div class="no-content-message">
                Start writing your post to see a preview...
              </div>
            `}
          </div>
          
          ${memberStatus !== 'public' && visibility !== 'public' ? `
            <div class="member-upsell-card">
              <h3>Member-only content</h3>
              <p>Subscribe to continue reading</p>
              <button>Subscribe now</button>
            </div>
          ` : ''}
          
          ${previewMode !== 'static' ? `<div class="preview-mode-indicator">${previewMode === 'live' ? '🔗 Live Preview' : `👤 Member View: ${memberStatus}`}</div>` : ''}
        </article>
      </body>
      </html>
    `;
  }, [topValue, title, featureImage, featureImageCaption, visibility, tags, excerpt, form, memberStatus, previewMode, themeVariables]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Preview Mode Controls */}
      <div className="absolute top-[8px] left-[8px] right-[8px] flex justify-between items-center z-10">
        <div className="flex items-center gap-[8px]">
          <div className="relative">
            <img
              src={current === 'global' ? '/no-picture.jpg' : integration?.picture || '/no-picture.jpg'}
              alt="profile"
              className="rounded-full min-w-[32px] min-h-[32px] w-[32px] h-[32px]"
            />
            {current !== 'global' && (
              <Image
                src="/icons/platforms/ghost.png"
                alt="Ghost"
                width={16}
                height={16}
                className="absolute -bottom-1 -right-1 rounded-full border-2 border-white"
              />
            )}
          </div>
          <div className="text-[14px] font-semibold text-white">
            {current === 'global' ? 'Global Edit' : integration?.name || 'Ghost'}
          </div>
        </div>
        
        <div className="flex gap-[8px] items-center">
          {/* Preview Mode Selector */}
          <select
            value={previewMode}
            onChange={(e) => setPreviewMode(e.target.value as PreviewMode)}
            className="px-[8px] py-[4px] rounded-[4px] text-[12px] bg-white/90 text-black border border-gray-300"
          >
            <option value="static">📝 Static</option>
            <option value="live">🔗 Live</option>
            <option value="member">👤 Member View</option>
          </select>
          
          {/* Member Status Selector (only for member mode) */}
          {previewMode === 'member' && (
            <select
              value={memberStatus}
              onChange={(e) => setMemberStatus(e.target.value as MemberStatus)}
              className="px-[8px] py-[4px] rounded-[4px] text-[12px] bg-white/90 text-black border border-gray-300"
            >
              <option value="public">🔓 Public</option>
              <option value="members">👥 Free Member</option>
              <option value="paid">💎 Paid Member</option>
            </select>
          )}
          
          {/* Visibility Badge */}
          <span className={clsx(
            'px-[8px] py-[4px] rounded-full text-[11px] font-medium',
            visibility === 'public' && 'bg-blue-500/20 text-blue-300',
            visibility === 'members' && 'bg-yellow-500/20 text-yellow-300',
            visibility === 'paid' && 'bg-pink-500/20 text-pink-300'
          )}>
            {visibility === 'public' ? '🔓 Public' : visibility === 'members' ? '👥 Members' : '💎 Paid'}
          </span>
        </div>
      </div>
      
      {/* Loading/Error States */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-[14px] text-gray-600">Loading preview...</div>
        </div>
      )}
      
      {previewError && (
        <div className="absolute top-[48px] left-[8px] right-[8px] bg-red-100 border border-red-300 rounded-[4px] p-[8px] text-[12px] text-red-700 z-20">
          {previewError}
        </div>
      )}
      
      {/* Preview Iframe */}
      {previewMode === 'static' ? (
        <iframe
          srcDoc={previewHtml}
          className="w-full h-full min-h-[400px] border-0 rounded-[8px]"
          sandbox="allow-same-origin"
          title="Ghost Post Preview (Static)"
        />
      ) : livePreviewUrl ? (
        <iframe
          src={livePreviewUrl}
          className="w-full h-full min-h-[400px] border-0 rounded-[8px]"
          sandbox="allow-same-origin allow-scripts"
          title={`Ghost Post Preview (${previewMode})`}
        />
      ) : (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-[8px]">
          <div className="text-[14px] text-gray-500">
            {previewMode === 'member' ? 'Loading member preview...' : 'Connecting to Ghost...'}
          </div>
        </div>
      )}
    </div>
  );
};