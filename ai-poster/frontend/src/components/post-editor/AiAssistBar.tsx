import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Image, Hash, Clock, X, Loader2 } from 'lucide-react';

export interface AiAssistResult {
  type: 'improve' | 'image' | 'hashtags' | 'bestTime';
  data: unknown;
}

export interface AiAssistBarProps {
  onImprove: (instruction: string) => Promise<string>;
  onGenerateImage: (prompt: string) => Promise<string>;
  onSuggestHashtags: (content: string) => Promise<string[]>;
  onBestTime: () => Promise<{ time: string; reason: string }[]>;
  currentContent: string;
  className?: string;
}

type ActiveDialog = 'improve' | 'image' | 'hashtags' | 'bestTime' | null;

interface DialogProps {
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Popover({ onClose, children, title }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        'absolute bottom-full mb-2 left-0 right-0 max-w-md mx-auto',
        'bg-surface-primary border border-surface-tertiary rounded-xl shadow-lg',
        'animate-scale-in p-4'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5 text-text-muted" />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function AiAssistBar({
  onImprove,
  onGenerateImage,
  onSuggestHashtags,
  onBestTime,
  currentContent,
  className,
}: AiAssistBarProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');

  // Result states
  const [improveResult, setImproveResult] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [hashtagResult, setHashtagResult] = useState<string[] | null>(null);
  const [bestTimeResult, setBestTimeResult] = useState<
    { time: string; reason: string }[] | null
  >(null);

  const closeDialog = () => {
    setActiveDialog(null);
    setInput('');
    setImproveResult(null);
    setImageResult(null);
    setHashtagResult(null);
    setBestTimeResult(null);
  };

  const handleImprove = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await onImprove(input.trim());
      setImproveResult(result);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await onGenerateImage(input.trim());
      setImageResult(result);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestHashtags = async () => {
    setLoading(true);
    try {
      const result = await onSuggestHashtags(currentContent);
      setHashtagResult(result);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleBestTime = async () => {
    setLoading(true);
    try {
      const result = await onBestTime();
      setBestTimeResult(result);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const buttons = [
    {
      key: 'improve' as const,
      label: 'Improve with AI',
      icon: Sparkles,
      color: 'text-brand-600',
      bg: 'hover:bg-brand-50',
    },
    {
      key: 'image' as const,
      label: 'Generate Image',
      icon: Image,
      color: 'text-status-approved',
      bg: 'hover:bg-green-50',
    },
    {
      key: 'hashtags' as const,
      label: 'Suggest Hashtags',
      icon: Hash,
      color: 'text-status-scheduled',
      bg: 'hover:bg-blue-50',
    },
    {
      key: 'bestTime' as const,
      label: 'Best Time',
      icon: Clock,
      color: 'text-status-generated',
      bg: 'hover:bg-yellow-50',
    },
  ];

  return (
    <div className={cn('relative', className)}>
      {/* Dialogs */}
      {activeDialog === 'improve' && (
        <Popover onClose={closeDialog} title="Improve with AI">
          <div className="space-y-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Make it more casual, Add a call to action..."
              className="w-full text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImprove();
              }}
              autoFocus
            />
            <button
              onClick={handleImprove}
              disabled={loading || !input.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                loading || !input.trim()
                  ? 'bg-brand-200 text-brand-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Improve
            </button>
            {improveResult && (
              <div className="bg-surface-secondary rounded-lg p-3 text-sm text-text-primary whitespace-pre-wrap max-h-40 overflow-y-auto">
                {improveResult}
              </div>
            )}
          </div>
        </Popover>
      )}

      {activeDialog === 'image' && (
        <Popover onClose={closeDialog} title="Generate Image">
          <div className="space-y-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the image you want..."
              className="w-full text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerateImage();
              }}
              autoFocus
            />
            <button
              onClick={handleGenerateImage}
              disabled={loading || !input.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                loading || !input.trim()
                  ? 'bg-green-200 text-green-400 cursor-not-allowed'
                  : 'bg-status-approved text-white hover:bg-status-approved/90'
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Image className="w-3.5 h-3.5" />
              )}
              Generate
            </button>
            {imageResult && (
              <div className="rounded-lg overflow-hidden">
                <img src={imageResult} alt="Generated" className="w-full" />
              </div>
            )}
          </div>
        </Popover>
      )}

      {activeDialog === 'hashtags' && (
        <Popover onClose={closeDialog} title="Suggest Hashtags">
          <div className="space-y-3">
            {!hashtagResult && (
              <button
                onClick={handleSuggestHashtags}
                disabled={loading}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  loading
                    ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                    : 'bg-status-scheduled text-white hover:bg-status-scheduled/90'
                )}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Hash className="w-3.5 h-3.5" />
                )}
                Analyze & Suggest
              </button>
            )}
            {hashtagResult && (
              <div className="flex flex-wrap gap-1.5">
                {hashtagResult.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-status-scheduled/10 text-status-scheduled cursor-pointer hover:bg-status-scheduled/20 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Popover>
      )}

      {activeDialog === 'bestTime' && (
        <Popover onClose={closeDialog} title="Best Time to Post">
          <div className="space-y-3">
            {!bestTimeResult && (
              <button
                onClick={handleBestTime}
                disabled={loading}
                className={cn(
                  'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  loading
                    ? 'bg-yellow-200 text-yellow-500 cursor-not-allowed'
                    : 'bg-status-generated text-white hover:bg-status-generated/90'
                )}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                Analyze
              </button>
            )}
            {bestTimeResult && (
              <div className="space-y-2">
                {bestTimeResult.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-lg bg-surface-secondary"
                  >
                    <Clock className="w-3.5 h-3.5 text-status-generated mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {item.time}
                      </div>
                      <div className="text-xs text-text-muted">{item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Popover>
      )}

      {/* Floating bar */}
      <div
        className={cn(
          'flex items-center justify-center gap-1 p-1.5',
          'bg-surface-primary border border-surface-tertiary rounded-xl shadow-lg'
        )}
      >
        {buttons.map(({ key, label, icon: Icon, color, bg }) => (
          <button
            key={key}
            onClick={() => setActiveDialog(activeDialog === key ? null : key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              color,
              bg,
              activeDialog === key && 'bg-surface-secondary'
            )}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
