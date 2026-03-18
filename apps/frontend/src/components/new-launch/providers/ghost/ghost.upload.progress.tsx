'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

interface UploadProgress {
  id: string;
  url: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface ImageUploadProgressProps {
  uploads: UploadProgress[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

/**
 * Ghost Image Upload Progress Component
 * Shows progress for inline image uploads during post publishing
 */
export const GhostImageUploadProgress: FC<ImageUploadProgressProps> = ({
  uploads,
  onRetry,
  onDismiss,
}) => {
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const failedCount = uploads.filter(u => u.status === 'failed').length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  
  const allCompleted = uploads.length > 0 && uploads.every(u => u.status === 'completed');
  const hasFailures = failedCount > 0;

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[12px] p-[16px] bg-third rounded-[12px] border border-fifth">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          <div className="text-[14px] font-semibold text-white">
            Image Uploads
          </div>
          {allCompleted && (
            <span className="text-[12px] text-green-400">✓ All uploaded</span>
          )}
          {hasFailures && (
            <span className="text-[12px] text-red-400">
              {failedCount} failed
            </span>
          )}
        </div>
        <div className="text-[13px] text-customColor26">
          {completedCount}/{uploads.length} completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full h-[4px] bg-background rounded-[2px] overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-300',
            hasFailures ? 'bg-orange-500' : 'bg-customColor'
          )}
          style={{
            width: `${(completedCount / uploads.length) * 100}%`
          }}
        />
      </div>

      {/* Individual Upload Items (collapsed by default, expandable) */}
      <details className="group">
        <summary className="cursor-pointer text-[12px] text-customColor26 hover:text-white transition-colors">
          Show details ({uploadingCount} uploading, {pendingCount} pending)
        </summary>
        
        <div className="flex flex-col gap-[8px] mt-[8px]">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={clsx(
                'flex items-center gap-[8px] p-[8px] rounded-[8px]',
                upload.status === 'failed' && 'bg-red-500/10',
                upload.status === 'completed' && 'bg-green-500/10',
                upload.status === 'uploading' && 'bg-blue-500/10',
                upload.status === 'pending' && 'bg-white/5'
              )}
            >
              {/* Status Icon */}
              <div className="min-w-[20px] w-[20px] h-[20px] flex items-center justify-center">
                {upload.status === 'completed' && (
                  <svg className="w-[16px] h-[16px] text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {upload.status === 'failed' && (
                  <svg className="w-[16px] h-[16px] text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {upload.status === 'uploading' && (
                  <div className="w-[14px] h-[14px] border-2 border-customColor border-t-transparent rounded-full animate-spin" />
                )}
                {upload.status === 'pending' && (
                  <div className="w-[8px] h-[8px] rounded-full bg-customColor26" />
                )}
              </div>

              {/* URL Preview */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-white/80 truncate">
                  {upload.url.length > 50 
                    ? `...${upload.url.slice(-50)}`
                    : upload.url
                  }
                </div>
                {upload.error && (
                  <div className="text-[11px] text-red-400">{upload.error}</div>
                )}
              </div>

              {/* Progress Percentage */}
              {upload.status === 'uploading' && (
                <div className="text-[12px] text-customColor min-w-[40px] text-right">
                  {Math.round(upload.progress)}%
                </div>
              )}

              {/* Actions */}
              {upload.status === 'failed' && onRetry && (
                <button
                  onClick={() => onRetry(upload.id)}
                  className="text-[11px] px-[8px] py-[4px] rounded-[4px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              )}
              
              {(upload.status === 'completed' || upload.status === 'failed') && onDismiss && (
                <button
                  onClick={() => onDismiss(upload.id)}
                  className="text-[11px] px-[8px] py-[4px] rounded-[4px] bg-white/5 text-customColor26 hover:bg-white/10 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

/**
 * Hook to track inline image uploads for Ghost posts
 * Shows progress during post publishing when images need to be rehosted
 */
export const useGhostImageUploadProgress = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const startUpload = useCallback((id: string, url: string) => {
    setUploads(prev => [
      ...prev.filter(u => u.id !== id),
      { id, url, status: 'uploading', progress: 0 }
    ]);
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setUploads(prev =>
      prev.map(u => u.id === id ? { ...u, progress } : u)
    );
  }, []);

  const completeUpload = useCallback((id: string) => {
    setUploads(prev =>
      prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u)
    );
  }, []);

  const failUpload = useCallback((id: string, error: string) => {
    setUploads(prev =>
      prev.map(u => u.id === id ? { ...u, status: 'failed', error } : u)
    );
  }, []);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const dismissUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  return {
    uploads,
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    clearUploads,
    dismissUpload,
  };
};

export default GhostImageUploadProgress;
