import React from 'react';
import { cn } from '@/lib/utils';
import { TemplateDto } from '@ai-poster/shared';
import { Copy, Trash2, ChevronRight, FileText, Palette, Globe } from 'lucide-react';

export interface TemplateCardProps {
  template: TemplateDto;
  onClick: (template: TemplateDto) => void;
  onDuplicate: (template: TemplateDto) => void;
  onDelete: (template: TemplateDto) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  BRAND: 'bg-blue-100 text-blue-700',
  PRODUCT: 'bg-green-100 text-green-700',
  EVENT: 'bg-purple-100 text-purple-700',
  EDUCATIONAL: 'bg-amber-100 text-amber-700',
  PROMOTIONAL: 'bg-red-100 text-red-700',
  CUSTOM: 'bg-gray-100 text-gray-700',
};

export default function TemplateCard({
  template,
  onClick,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const overrideCount = template.platformOverrides?.length || 0;
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.CUSTOM;

  return (
    <div
      className={cn(
        'bg-surface-primary border border-surface-tertiary rounded-xl overflow-hidden',
        'cursor-pointer hover:shadow-md hover:border-brand-300 transition-all group'
      )}
      onClick={() => onClick(template)}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary group-hover:text-brand-600 transition-colors truncate">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                {template.description}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand-500 transition-colors flex-shrink-0 ml-2" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              categoryColor
            )}
          >
            {template.category.charAt(0) + template.category.slice(1).toLowerCase()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-tertiary text-text-muted font-medium">
            {template.tone.charAt(0) + template.tone.slice(1).toLowerCase()}
          </span>
          {overrideCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
              <Palette className="w-3 h-3" />
              {overrideCount} override{overrideCount !== 1 ? 's' : ''}
            </span>
          )}
          {template.isGlobal && (
            <span className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-status-approved/10 text-status-approved font-medium">
              <Globe className="w-3 h-3" />
              Global
            </span>
          )}
        </div>

        {/* Brand context preview */}
        {template.brandContext && (
          <div className="flex items-start gap-1.5 mb-3">
            <FileText className="w-3.5 h-3.5 text-text-muted mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
              {template.brandContext}
            </p>
          </div>
        )}

        {/* Default hashtags preview */}
        {template.defaultHashtags && template.defaultHashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.defaultHashtags.slice(0, 5).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] text-brand-600 bg-brand-50 rounded px-1.5 py-0.5"
              >
                #{tag}
              </span>
            ))}
            {template.defaultHashtags.length > 5 && (
              <span className="text-[10px] text-text-muted">
                +{template.defaultHashtags.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-tertiary bg-surface-secondary/30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(template);
          }}
          className="p-1.5 text-text-muted hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(template);
          }}
          className="p-1.5 text-text-muted hover:text-status-failed hover:bg-status-failed/10 rounded-md transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
