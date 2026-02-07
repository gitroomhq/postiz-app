import React from 'react';
import { cn } from '@/lib/utils';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 border-b border-gray-200',
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeId === item.id
              ? 'text-brand-600'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                activeId === item.id
                  ? 'bg-brand-50 text-brand-600'
                  : 'bg-gray-100 text-text-muted'
              )}
            >
              {item.count}
            </span>
          )}
          {activeId === item.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600" />
          )}
        </button>
      ))}
    </div>
  );
}
