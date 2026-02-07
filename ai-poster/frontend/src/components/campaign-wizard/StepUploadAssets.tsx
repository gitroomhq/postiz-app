import React, { useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { Upload, Link, X, Image, Globe, Loader2 } from 'lucide-react';

interface UploadedAsset {
  id: string;
  type: 'image' | 'url';
  name?: string;
  url?: string;
  thumbnailPath?: string;
  status: 'pending' | 'uploaded' | 'processing' | 'done' | 'error';
}

interface StepUploadAssetsProps {
  assets: UploadedAsset[];
  onAddImages: (files: FileList) => void;
  onAddUrl: (url: string) => void;
  onRemoveAsset: (id: string) => void;
  additionalContext: string;
  onUpdateContext: (ctx: string) => void;
}

export const StepUploadAssets: React.FC<StepUploadAssetsProps> = ({
  assets,
  onAddImages,
  onAddUrl,
  onRemoveAsset,
  additionalContext,
  onUpdateContext,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onAddImages(e.dataTransfer.files);
      }
    },
    [onAddImages],
  );

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      onAddUrl(urlInput.trim());
      setUrlInput('');
    }
  };

  const imageAssets = assets.filter((a) => a.type === 'image');
  const urlAssets = assets.filter((a) => a.type === 'url');

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Upload your assets</h2>
      <p className="text-text-secondary mb-8">
        Provide images or URLs, and AI will create posts from them.
      </p>

      <div className="max-w-3xl space-y-8">
        {/* Image Upload Zone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
            <Image className="w-4 h-4" />
            Images
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={clsx(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
              isDragOver
                ? 'border-brand-500 bg-brand-50'
                : 'border-gray-300 hover:border-brand-400 bg-surface-secondary',
            )}
            onClick={() => document.getElementById('asset-file-input')?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-sm text-text-secondary mb-1">
              Drag and drop images here, or <span className="text-brand-600 font-medium">browse</span>
            </p>
            <p className="text-xs text-text-muted">PNG, JPG, GIF up to 30MB each</p>
            <input
              id="asset-file-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && onAddImages(e.target.files)}
            />
          </div>

          {imageAssets.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {imageAssets.map((asset) => (
                <div key={asset.id} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-tertiary">
                  {asset.thumbnailPath ? (
                    <img src={asset.thumbnailPath} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-text-muted" />
                    </div>
                  )}
                  {asset.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.id); }}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* URL Input */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
            <Globe className="w-4 h-4" />
            URLs
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="https://example.com/blog-post"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Link className="w-4 h-4" />
            </button>
          </div>

          {urlAssets.length > 0 && (
            <div className="space-y-2 mt-3">
              {urlAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                  <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
                  <span className="text-sm text-text-secondary flex-1 truncate">{asset.url}</span>
                  {asset.status === 'processing' && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
                  {asset.status === 'done' && <span className="text-xs text-green-600 font-medium">Extracted</span>}
                  {asset.status === 'error' && <span className="text-xs text-red-600 font-medium">Failed</span>}
                  <button onClick={() => onRemoveAsset(asset.id)} className="text-text-muted hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Additional Context (optional)
          </label>
          <textarea
            rows={3}
            value={additionalContext}
            onChange={(e) => onUpdateContext(e.target.value)}
            placeholder="Any specific instructions for the AI... e.g., 'Focus on the new dashboard feature and how it saves time'"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
};
