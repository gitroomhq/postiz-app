import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useMedia, type MediaDto } from '@/hooks/useMedia';
import { formatDate, cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';
import toast from 'react-hot-toast';

export function MediaPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { media, total, totalPages, isLoading, mutate } = useMedia(page, typeFilter);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaDto | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await fetchApi('/media/upload', {
            method: 'POST',
            body: formData,
          });
        }
        toast.success(
          `${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''} uploaded`
        );
        mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [mutate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: true,
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this media file?')) return;
    setDeleting(id);
    try {
      await fetchApi(`/media/${id}`, { method: 'DELETE' });
      toast.success('File deleted');
      setSelectedMedia(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading && page === 1) return <PageSpinner />;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Media Library</h2>
          <p className="subtle-text mt-1">
            {total} file{total !== 1 ? 's' : ''} in your library
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'mx-auto h-10 w-10',
            isDragActive ? 'text-brand-500' : 'text-text-muted'
          )}
        />
        <p className="mt-3 text-sm font-medium text-text-primary">
          {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          JPG, PNG, GIF, WebP, MP4, MOV, AVI
        </p>
        {uploading && (
          <p className="mt-3 text-sm font-medium text-brand-600">Uploading...</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          options={[
            { value: '', label: 'All Types' },
            { value: 'image', label: 'Images' },
            { value: 'video', label: 'Videos' },
          ]}
          value={typeFilter || ''}
          onChange={(e) => {
            setTypeFilter(e.target.value || undefined);
            setPage(1);
          }}
          className="w-40"
        />
      </div>

      {/* Media grid */}
      {media.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-7 w-7" />}
          title="No media files"
          description="Upload images or videos to use in your posts."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {media.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-md"
              >
                {item.type === 'image' ? (
                  <img
                    src={item.path}
                    alt={item.altText || item.filename}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-gray-100">
                    <Film className="h-8 w-8 text-text-muted" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="w-full p-2">
                    <p className="truncate text-xs font-medium text-white">
                      {item.filename}
                    </p>
                    <p className="text-xs text-gray-300">
                      {formatFileSize(item.sizeBytes)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Media detail modal */}
      <Modal
        open={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        title={selectedMedia?.filename || 'Media Detail'}
        size="lg"
        footer={
          selectedMedia ? (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => handleDelete(selectedMedia.id)}
              loading={deleting === selectedMedia.id}
            >
              Delete
            </Button>
          ) : undefined
        }
      >
        {selectedMedia && (
          <div className="space-y-4">
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.path}
                alt={selectedMedia.altText || selectedMedia.filename}
                className="max-h-96 w-full rounded-lg object-contain"
              />
            ) : (
              <video
                src={selectedMedia.path}
                controls
                className="max-h-96 w-full rounded-lg"
              />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Type</p>
                <p className="font-medium text-text-primary">
                  {selectedMedia.mimeType}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Size</p>
                <p className="font-medium text-text-primary">
                  {formatFileSize(selectedMedia.sizeBytes)}
                </p>
              </div>
              {selectedMedia.width && selectedMedia.height && (
                <div>
                  <p className="text-text-muted">Dimensions</p>
                  <p className="font-medium text-text-primary">
                    {selectedMedia.width} x {selectedMedia.height}
                  </p>
                </div>
              )}
              <div>
                <p className="text-text-muted">Uploaded</p>
                <p className="font-medium text-text-primary">
                  {formatDate(selectedMedia.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
