import React from 'react';
import { cn, truncate } from '@/lib/utils';
import { Platform, ValidationError, PlatformLimits } from '@ai-poster/shared';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export interface PostPreviewProps {
  platform: Platform;
  content: string;
  plainText: string;
  images: { url: string; altText?: string }[];
  limits: PlatformLimits;
  validationErrors: ValidationError[];
  className?: string;
}

function ImageGrid({ images }: { images: { url: string; altText?: string }[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="rounded-lg overflow-hidden mt-2">
        <img
          src={images[0].url}
          alt={images[0].altText || ''}
          className="w-full h-48 object-cover"
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden mt-2">
        {images.map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.altText || ''}
            className="w-full h-36 object-cover"
          />
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden mt-2">
        <img
          src={images[0].url}
          alt={images[0].altText || ''}
          className="w-full h-36 object-cover row-span-2"
        />
        <img
          src={images[1].url}
          alt={images[1].altText || ''}
          className="w-full h-[4.4375rem] object-cover"
        />
        <img
          src={images[2].url}
          alt={images[2].altText || ''}
          className="w-full h-[4.4375rem] object-cover"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden mt-2">
      {images.slice(0, 4).map((img, i) => (
        <div key={i} className="relative">
          <img
            src={img.url}
            alt={img.altText || ''}
            className="w-full h-28 object-cover"
          />
          {i === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-semibold">
              +{images.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostPreview({
  platform,
  content,
  plainText,
  images,
  limits,
  validationErrors,
  className,
}: PostPreviewProps) {
  const platformName = PLATFORM_DISPLAY_NAMES[platform] || platform;
  const platformColor = PLATFORM_ICON_COLORS[platform] || '#868e96';
  const charCount = plainText.length;
  const maxChars = limits.maxChars;
  const charPercentage = (charCount / maxChars) * 100;

  const errors = validationErrors.filter((v) => v.severity === 'error');
  const warnings = validationErrors.filter((v) => v.severity === 'warning');

  return (
    <div className={cn('w-full', className)}>
      {/* Preview card */}
      <div className="border border-surface-tertiary rounded-xl overflow-hidden bg-surface-primary">
        {/* Platform header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-tertiary bg-surface-secondary/30">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: platformColor }}
          >
            <span className="text-white text-xs font-bold">
              {platformName.charAt(0)}
            </span>
          </span>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Your Name
            </div>
            <div className="text-[10px] text-text-muted">{platformName}</div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {content ? (
            <div
              className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-sm text-text-muted italic">No content yet...</p>
          )}
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div className="px-4 pb-3">
            <ImageGrid images={images} />
          </div>
        )}

        {/* Character count bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                'text-xs font-mono',
                charPercentage < 80 && 'text-text-muted',
                charPercentage >= 80 && charPercentage < 100 && 'text-status-generated',
                charPercentage >= 100 && 'text-status-failed font-semibold'
              )}
            >
              {charCount} / {maxChars}
            </span>
            {charPercentage >= 100 && (
              <span className="text-[10px] text-status-failed">
                Over limit by {charCount - maxChars}
              </span>
            )}
          </div>
          <div className="w-full h-1 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                charPercentage < 80 && 'bg-status-approved',
                charPercentage >= 80 && charPercentage < 100 && 'bg-status-generated',
                charPercentage >= 100 && 'bg-status-failed'
              )}
              style={{ width: `${Math.min(charPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation messages */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="mt-3 space-y-1.5">
          {errors.map((err, i) => (
            <div
              key={`err-${i}`}
              className="flex items-start gap-1.5 text-xs text-status-failed"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{err.message}</span>
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div
              key={`warn-${i}`}
              className="flex items-start gap-1.5 text-xs text-status-generated"
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{warn.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
