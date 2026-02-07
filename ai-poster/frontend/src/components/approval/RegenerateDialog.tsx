import React, { useState, useRef, useEffect } from 'react';
import { cn, truncate } from '@/lib/utils';
import { Tone } from '@ai-poster/shared';
import { RefreshCw, X, Loader2 } from 'lucide-react';

export interface RegenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (feedback: string, tone?: Tone) => Promise<void>;
  currentContent: string;
  isLoading?: boolean;
}

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: Tone.CASUAL, label: 'Casual' },
  { value: Tone.PROFESSIONAL, label: 'Professional' },
  { value: Tone.WITTY, label: 'Witty' },
  { value: Tone.INSPIRATIONAL, label: 'Inspirational' },
  { value: Tone.BOLD, label: 'Bold' },
  { value: Tone.FRIENDLY, label: 'Friendly' },
  { value: Tone.AUTHORITATIVE, label: 'Authoritative' },
  { value: Tone.CONVERSATIONAL, label: 'Conversational' },
];

export default function RegenerateDialog({
  isOpen,
  onClose,
  onRegenerate,
  currentContent,
  isLoading = false,
}: RegenerateDialogProps) {
  const [feedback, setFeedback] = useState('');
  const [selectedTone, setSelectedTone] = useState<Tone | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onRegenerate(feedback, selectedTone);
    setFeedback('');
    setSelectedTone(undefined);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className={cn(
            'w-full max-w-lg bg-surface-primary rounded-xl shadow-2xl',
            'animate-scale-in'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-tertiary">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-status-generated" />
              <h3 className="text-base font-semibold text-text-primary">
                Regenerate Post
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-4">
            {/* Current content reference */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                Current Content
              </label>
              <div className="bg-surface-secondary rounded-lg p-3 text-sm text-text-secondary leading-relaxed max-h-32 overflow-y-auto">
                {truncate(currentContent, 500)}
              </div>
            </div>

            {/* Feedback textarea */}
            <div>
              <label
                htmlFor="regenerate-feedback"
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
              >
                Instructions / Feedback
              </label>
              <textarea
                id="regenerate-feedback"
                ref={textareaRef}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder='e.g., "Make it more casual", "Focus on the product benefits", "Add a question at the end"...'
                rows={4}
                className={cn(
                  'w-full text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2',
                  'placeholder:text-text-muted resize-none',
                  'focus:outline-none focus:ring-1 focus:ring-brand-400'
                )}
              />
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                Tone (optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TONE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setSelectedTone(selectedTone === value ? undefined : value)
                    }
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      selectedTone === value
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-tertiary">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isLoading
                  ? 'bg-status-generated/50 text-white cursor-not-allowed'
                  : 'bg-status-generated text-white hover:bg-status-generated/90'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
