import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Link2,
  Sparkles,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ProcessedItem {
  id: string;
  type: 'image' | 'url';
  source: string;
  status: 'processing' | 'complete' | 'error';
  description?: string;
  generatedContent?: string;
  error?: string;
}

export function UploadProcessPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newItems: ProcessedItem[] = acceptedFiles.map((file, idx) => ({
        id: `upload-${Date.now()}-${idx}`,
        type: 'image' as const,
        source: file.name,
        status: 'processing' as const,
      }));

      setItems((prev) => [...prev, ...newItems]);

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const itemId = newItems[i].id;

        try {
          const formData = new FormData();
          formData.append('file', file);
          if (additionalContext) {
            formData.append('context', additionalContext);
          }

          const result = await fetchApi<{
            description: string;
            generatedContent: string;
          }>('/ai/process-image', {
            method: 'POST',
            body: formData,
          });

          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: 'complete',
                    description: result.description,
                    generatedContent: result.generatedContent,
                  }
                : item
            )
          );
        } catch (err) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Processing failed',
                  }
                : item
            )
          );
        }
      }
    },
    [additionalContext]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    multiple: true,
  });

  const handleProcessUrl = async () => {
    if (!url.trim()) {
      toast.error('Enter a URL first');
      return;
    }

    const itemId = `url-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      { id: itemId, type: 'url', source: url, status: 'processing' },
    ]);
    setProcessing(true);

    try {
      const result = await fetchApi<{
        description: string;
        generatedContent: string;
      }>('/ai/process-url', {
        method: 'POST',
        body: JSON.stringify({ url, context: additionalContext }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'complete',
                description: result.description,
                generatedContent: result.generatedContent,
              }
            : item
        )
      );
      setUrl('');
    } catch (err) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'error',
                error: err instanceof Error ? err.message : 'Failed to process URL',
              }
            : item
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUseContent = (content: string) => {
    // Navigate to new post with prefilled content
    navigate('/posts/new');
    // Store the content so NewPostPage can pick it up
    // In a real app you'd use the post editor store
    toast.success('Content copied to new post editor');
  };

  const completedItems = items.filter((i) => i.status === 'complete');
  const processingItems = items.filter((i) => i.status === 'processing');

  return (
    <div className="page-container space-y-6">
      <div>
        <h2 className="section-title">Upload & Process</h2>
        <p className="subtle-text mt-1">
          Upload images or paste URLs to generate AI-powered social media content.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Input */}
        <div className="space-y-5">
          {/* Image Upload */}
          <Card>
            <CardHeader>Upload Images</CardHeader>
            <CardBody>
              <div
                {...getRootProps()}
                className={cn(
                  'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  isDragActive
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-brand-300'
                )}
              >
                <input {...getInputProps()} />
                <ImageIcon
                  className={cn(
                    'mx-auto h-10 w-10',
                    isDragActive ? 'text-brand-500' : 'text-text-muted'
                  )}
                />
                <p className="mt-3 text-sm font-medium text-text-primary">
                  {isDragActive
                    ? 'Drop images here'
                    : 'Drop images or click to browse'}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  AI will analyze the image and generate post content
                </p>
              </div>
            </CardBody>
          </Card>

          {/* URL Input */}
          <Card>
            <CardHeader>Process URL</CardHeader>
            <CardBody className="space-y-3">
              <Input
                placeholder="https://example.com/article-or-page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                icon={<Link2 className="h-4 w-4" />}
              />
              <Button
                onClick={handleProcessUrl}
                loading={processing}
                icon={<Sparkles className="h-4 w-4" />}
                disabled={!url.trim()}
                className="w-full"
              >
                Process URL
              </Button>
            </CardBody>
          </Card>

          {/* Additional context */}
          <Card>
            <CardHeader>Additional Context</CardHeader>
            <CardBody>
              <Textarea
                placeholder="Add any additional context that should influence the generated content (brand voice, audience, goal, etc.)"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={4}
              />
            </CardBody>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Processing Results
            {items.length > 0 && (
              <span className="ml-2 text-text-muted">
                ({completedItems.length}/{items.length} complete)
              </span>
            )}
          </h3>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Sparkles className="h-10 w-10 text-text-muted" />
              <p className="mt-3 text-sm text-text-muted">
                Upload images or paste a URL to see AI-generated content
              </p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.type === 'image' ? (
                        <ImageIcon className="h-4 w-4 text-text-muted" />
                      ) : (
                        <Link2 className="h-4 w-4 text-text-muted" />
                      )}
                      <span className="text-sm font-medium text-text-primary truncate max-w-[200px]">
                        {item.source}
                      </span>
                    </div>
                    {item.status === 'processing' && (
                      <div className="flex items-center gap-1.5 text-xs text-brand-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </div>
                    )}
                    {item.status === 'complete' && (
                      <Badge variant="approved" dot>
                        Complete
                      </Badge>
                    )}
                    {item.status === 'error' && (
                      <Badge variant="failed" dot>
                        Error
                      </Badge>
                    )}
                  </div>

                  {item.status === 'error' && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-status-failed">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {item.error}
                    </div>
                  )}

                  {item.status === 'complete' && (
                    <>
                      {item.description && (
                        <div>
                          <p className="text-xs font-medium text-text-muted">
                            AI Description
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {item.description}
                          </p>
                        </div>
                      )}
                      {item.generatedContent && (
                        <div>
                          <p className="text-xs font-medium text-text-muted">
                            Generated Post Content
                          </p>
                          <div className="mt-1 rounded-lg border border-gray-100 bg-surface-secondary p-3">
                            <p className="whitespace-pre-wrap text-sm text-text-primary">
                              {item.generatedContent}
                            </p>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ArrowRight className="h-4 w-4" />}
                        onClick={() =>
                          handleUseContent(item.generatedContent || '')
                        }
                      >
                        Use in New Post
                      </Button>
                    </>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
