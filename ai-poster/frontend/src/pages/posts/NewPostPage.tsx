import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Clock,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { usePostEditorStore } from '@/store/post-editor.store';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useTemplates } from '@/hooks/useTemplates';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import { cn, truncate } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CreatePostDto } from '@ai-poster/shared';

export function NewPostPage() {
  const navigate = useNavigate();
  const { integrations } = useIntegrations();
  const { templates } = useTemplates();

  const {
    content,
    title,
    selectedIntegrationIds,
    scheduledDate,
    templateId,
    mode,
    threadPosts,
    setContent,
    setTitle,
    setSelectedIntegrations,
    toggleIntegration,
    setScheduledDate,
    setTemplateId,
    setMode,
    addThreadPost,
    updateThreadPost,
    removeThreadPost,
    reset,
  } = usePostEditorStore();

  useEffect(() => {
    return () => {
      // Do not reset on unmount; user may navigate away briefly
    };
  }, []);

  const [submitting, setSubmitting] = React.useState(false);
  const [aiGenerating, setAiGenerating] = React.useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Post content is required');
      return;
    }
    if (selectedIntegrationIds.length === 0) {
      toast.error('Select at least one channel');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreatePostDto = {
        integrationIds: selectedIntegrationIds,
        content,
        templateId: templateId || undefined,
        publishDate: scheduledDate || undefined,
        state: scheduledDate ? 'SCHEDULED' as any : undefined,
      };
      await fetchApi('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Post created!');
      reset();
      navigate('/posts/pending');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiGenerate = async () => {
    if (selectedIntegrationIds.length === 0) {
      toast.error('Select at least one channel first');
      return;
    }
    setAiGenerating(true);
    try {
      const result = await fetchApi<{ content: string }>('/ai/generate-post', {
        method: 'POST',
        body: JSON.stringify({
          integrationIds: selectedIntegrationIds,
          templateId: templateId || undefined,
          existingContent: content || undefined,
        }),
      });
      setContent(result.content);
      toast.success('AI content generated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Editor */}
        <div className="space-y-5 lg:col-span-3">
          {/* Channel selector */}
          <Card>
            <CardHeader>Select Channels</CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {integrations.map((integration) => {
                  const selected = selectedIntegrationIds.includes(integration.id);
                  return (
                    <button
                      key={integration.id}
                      onClick={() => toggleIntegration(integration.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-text-muted hover:border-gray-300'
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            PLATFORM_ICON_COLORS[integration.platform] || '#6b7280',
                        }}
                      />
                      {integration.displayName || integration.accountName}
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* Content editor */}
          <Card>
            <CardHeader
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={handleAiGenerate}
                  loading={aiGenerating}
                >
                  AI Generate
                </Button>
              }
            >
              Post Content
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Template (optional)"
                options={[
                  { value: '', label: 'No template' },
                  ...templates.map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={templateId || ''}
                onChange={(e) => setTemplateId(e.target.value || null)}
              />

              <Textarea
                label="Content"
                placeholder="Write your post content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                showCount
                maxChars={3000}
              />

              {/* Thread posts */}
              {threadPosts.map((tp, idx) => (
                <div key={tp.id} className="relative">
                  <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-brand-200" />
                  <div className="flex items-start gap-2">
                    <Textarea
                      label={`Thread ${idx + 2}`}
                      placeholder="Continue your thread..."
                      value={tp.content}
                      onChange={(e) => updateThreadPost(tp.id, e.target.value)}
                      rows={3}
                      showCount
                    />
                    <button
                      onClick={() => removeThreadPost(tp.id)}
                      className="mt-7 rounded-lg p-1.5 text-text-muted hover:bg-red-50 hover:text-status-failed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={addThreadPost}
              >
                Add Thread Post
              </Button>
            </CardBody>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>Schedule</CardHeader>
            <CardBody>
              <Input
                label="Publish Date & Time"
                type="datetime-local"
                value={scheduledDate || ''}
                onChange={(e) => setScheduledDate(e.target.value || null)}
                hint="Leave empty to save as draft"
                icon={<Clock className="h-4 w-4" />}
              />
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { reset(); navigate(-1); }}>
              Cancel
            </Button>
            <Button
              icon={<Send className="h-4 w-4" />}
              onClick={handleSubmit}
              loading={submitting}
            >
              {scheduledDate ? 'Schedule Post' : 'Save as Draft'}
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <Card>
              <CardHeader>Live Preview</CardHeader>
              <CardBody>
                {content ? (
                  <div className="space-y-4">
                    {selectedIntegrationIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedIntegrationIds.map((id) => {
                          const integration = integrations.find((i) => i.id === id);
                          if (!integration) return null;
                          return (
                            <Badge key={id} variant="default">
                              {PLATFORM_DISPLAY_NAMES[integration.platform]}
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    <div className="rounded-lg border border-gray-100 bg-surface-secondary p-4">
                      <p className="whitespace-pre-wrap text-sm text-text-primary">
                        {content}
                      </p>
                    </div>

                    {threadPosts.filter((t) => t.content).length > 0 && (
                      <div className="space-y-2 border-l-2 border-brand-200 pl-4">
                        {threadPosts
                          .filter((t) => t.content)
                          .map((tp, idx) => (
                            <div
                              key={tp.id}
                              className="rounded-lg border border-gray-100 bg-surface-secondary p-3"
                            >
                              <p className="text-xs font-medium text-text-muted">
                                Thread {idx + 2}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                                {tp.content}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}

                    {scheduledDate && (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="h-3.5 w-3.5" />
                        Scheduled for{' '}
                        {new Date(scheduledDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-text-muted">
                      Start writing to see a preview
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
