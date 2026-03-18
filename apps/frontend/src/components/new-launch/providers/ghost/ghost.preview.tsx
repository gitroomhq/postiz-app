'use client';

import { FC, useMemo } from 'react';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import clsx from 'clsx';
import Image from 'next/image';

/**
 * Ghost Preview Component
 * Renders HTML content in a styled preview that mimics Ghost's blog post layout
 */
export const GhostPreviewComponent: FC<{
  maximumCharacters?: number;
}> = () => {
  const { value: topValue, integration } = useIntegration();
  const current = useLaunchStore((state) => state.current);
  const form = useSettings();

  // Get settings from form
  const title = form.watch('title') || '';
  const featureImage = form.watch('feature_image');
  const featureImageCaption = form.watch('feature_image_caption');
  const visibility = form.watch('visibility') || 'public';
  const tags = form.watch('tags') || [];
  const excerpt = form.watch('custom_excerpt') || '';

  // Build the HTML content for the preview
  const previewHtml = useMemo(() => {
    const content = topValue[0]?.content || '';
    
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
            color: #15171a;
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
            color: #15171a;
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
          
          .placeholder-content {
            color: var(--color-secondary);
            font-style: italic;
          }
          
          .no-content-message {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 150px;
            color: var(--color-secondary);
            font-style: italic;
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
              <span class="visibility-badge visibility-${visibility}">
                ${visibility === 'public' ? '🔓 Public' : visibility === 'members' ? '👥 Members' : '💎 Paid'}
              </span>
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
          
          <div class="post-content">
            ${content ? content : `
              <div class="no-content-message">
                Start writing your post to see a preview...
              </div>
            `}
          </div>
        </article>
      </body>
      </html>
    `;
  }, [topValue, title, featureImage, featureImageCaption, visibility, tags, excerpt, form]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
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
        <div className="flex gap-[8px]">
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
      
      <iframe
        srcDoc={previewHtml}
        className="w-full h-full min-h-[400px] border-0 rounded-[8px]"
        sandbox="allow-same-origin"
        title="Ghost Post Preview"
      />
    </div>
  );
};
