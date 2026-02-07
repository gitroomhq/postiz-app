import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  Library,
  Sparkles,
  X,
  GripVertical,
  Image as ImageIcon,
} from 'lucide-react';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  altText?: string;
  name?: string;
}

export interface MediaAttachmentProps {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxItems?: number;
  onOpenLibrary: () => void;
  onAiGenerate: (prompt: string) => void;
  acceptTypes?: string;
  onUpload: (files: File[]) => void;
}

export default function MediaAttachment({
  items,
  onChange,
  maxItems = 4,
  onOpenLibrary,
  onAiGenerate,
  acceptTypes = 'image/*,video/*',
  onUpload,
}: MediaAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const removeItem = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange]
  );

  const updateAltText = useCallback(
    (id: string, altText: string) => {
      onChange(items.map((item) => (item.id === id ? { ...item, altText } : item)));
    },
    [items, onChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpload(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      setOverIndex(index);
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const updated = [...items];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      onChange(updated);
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, items, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleAiSubmit = useCallback(() => {
    if (aiPrompt.trim()) {
      onAiGenerate(aiPrompt.trim());
      setAiPrompt('');
      setShowAiPrompt(false);
    }
  }, [aiPrompt, onAiGenerate]);

  const canAddMore = items.length < maxItems;

  return (
    <div className="space-y-3">
      {/* Thumbnails grid */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'relative w-24 h-24 rounded-lg bg-surface-tertiary overflow-hidden group border-2',
                dragIndex === index && 'opacity-40',
                overIndex === index && dragIndex !== null
                  ? 'border-brand-400'
                  : 'border-transparent'
              )}
            >
              {/* Drag handle */}
              <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <GripVertical className="w-3.5 h-3.5 text-white drop-shadow cursor-grab active:cursor-grabbing" />
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>

              {/* Media preview */}
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.altText || ''}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setEditingAltId(item.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-dark text-white text-xs">
                  Video
                </div>
              )}

              {/* Alt text editor overlay */}
              {editingAltId === item.id && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-1.5 z-20">
                  <input
                    type="text"
                    value={item.altText || ''}
                    onChange={(e) => updateAltText(item.id, e.target.value)}
                    placeholder="Alt text..."
                    className="w-full text-[10px] text-white bg-transparent border border-white/30 rounded px-1.5 py-1 placeholder:text-white/50 focus:outline-none focus:border-white/60"
                    autoFocus
                    onBlur={() => setEditingAltId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingAltId(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Max items indicator */}
      <div className="text-[10px] text-text-muted">
        {items.length}/{maxItems} media
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canAddMore
              ? 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary'
              : 'bg-surface-secondary/50 text-text-muted cursor-not-allowed'
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>

        <button
          onClick={onOpenLibrary}
          disabled={!canAddMore}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canAddMore
              ? 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary'
              : 'bg-surface-secondary/50 text-text-muted cursor-not-allowed'
          )}
        >
          <Library className="w-3.5 h-3.5" />
          Library
        </button>

        <button
          onClick={() => setShowAiPrompt(!showAiPrompt)}
          disabled={!canAddMore}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            canAddMore
              ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
              : 'bg-brand-50/50 text-brand-400 cursor-not-allowed'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Generate
        </button>
      </div>

      {/* AI prompt input */}
      {showAiPrompt && (
        <div className="flex gap-2 animate-fade-in">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="flex-1 text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAiSubmit();
            }}
            autoFocus
          />
          <button
            onClick={handleAiSubmit}
            disabled={!aiPrompt.trim()}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              aiPrompt.trim()
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-brand-200 text-brand-400 cursor-not-allowed'
            )}
          >
            Generate
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
