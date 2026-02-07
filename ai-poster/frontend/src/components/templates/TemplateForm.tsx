import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  TemplateCategory,
  Tone,
  HashtagStrategy,
  PostStructureType,
  EmojiUsage,
  ContentLength,
} from '@ai-poster/shared';
import { Plus, X, Globe, Image, Upload } from 'lucide-react';

export interface TemplateFormData {
  name: string;
  description: string;
  category: TemplateCategory;
  brandContext: string;
  targetAudience: string;
  tone: Tone;
  language: string;
  goals: string[];
  dos: string[];
  donts: string[];
  inspirationTexts: string[];
  referenceUrls: string[];
  examplePosts: string[];
  defaultHashtags: string[];
  hashtagStrategy: HashtagStrategy;
  ctaTemplate: string;
  postStructure: PostStructureType;
  emojiUsage: EmojiUsage;
  contentLength: ContentLength;
  imageStyle: string;
  preferUserImages: boolean;
  imageOverlayText: boolean;
  inspirationImages: { file?: File; url?: string; description: string }[];
}

export interface TemplateFormProps {
  initialData?: Partial<TemplateFormData>;
  onSave: (data: TemplateFormData) => void;
  onCancel: () => void;
  onUploadImage?: (file: File) => Promise<string>;
  onOpenMediaLibrary?: () => void;
  loading?: boolean;
}

const categories = Object.values(TemplateCategory);
const tones = Object.values(Tone);
const hashtagStrategies = Object.values(HashtagStrategy);
const postStructures = Object.values(PostStructureType);
const emojiOptions = Object.values(EmojiUsage);
const contentLengths = Object.values(ContentLength);

const DEFAULT_DATA: TemplateFormData = {
  name: '',
  description: '',
  category: TemplateCategory.CUSTOM,
  brandContext: '',
  targetAudience: '',
  tone: Tone.PROFESSIONAL,
  language: 'en',
  goals: [],
  dos: [],
  donts: [],
  inspirationTexts: [],
  referenceUrls: [],
  examplePosts: [],
  defaultHashtags: [],
  hashtagStrategy: HashtagStrategy.MODERATE,
  ctaTemplate: '',
  postStructure: PostStructureType.HOOK_BODY_CTA,
  emojiUsage: EmojiUsage.MINIMAL,
  contentLength: ContentLength.MEDIUM,
  imageStyle: '',
  preferUserImages: true,
  imageOverlayText: false,
  inspirationImages: [],
};

type Section = 'basic' | 'context' | 'style' | 'rules' | 'inspiration' | 'media';

function TagInput({
  tags,
  onChange,
  placeholder,
  color = 'brand',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  color?: 'brand' | 'green' | 'red';
}) {
  const [input, setInput] = useState('');
  const colorClasses = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  };

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-sm',
              colorClasses[color]
            )}
          >
            {tag}
            <button
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <button
          onClick={addTag}
          className="px-3 py-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TextListEditor({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      <div className="space-y-2 mb-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-2 bg-surface-tertiary rounded-lg text-sm"
          >
            <span className="flex-1 whitespace-pre-wrap text-text-primary">
              {item}
            </span>
            <button
              onClick={() => onRemove(i)}
              className="mt-0.5 text-text-muted hover:text-status-failed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <textarea
        rows={2}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm mb-2 bg-surface-secondary focus:outline-none focus:ring-1 focus:ring-brand-400"
      />
      <button
        onClick={() => {
          if (input.trim()) {
            onAdd(input.trim());
            setInput('');
          }
        }}
        className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
      >
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
  );
}

function formatEnum(val: string): string {
  return val
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function TemplateForm({
  initialData,
  onSave,
  onCancel,
  onUploadImage,
  onOpenMediaLibrary,
  loading,
}: TemplateFormProps) {
  const [data, setData] = useState<TemplateFormData>({
    ...DEFAULT_DATA,
    ...initialData,
  });
  const [section, setSection] = useState<Section>('basic');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<TemplateFormData>) =>
    setData((d) => ({ ...d, ...partial }));

  const addToList = (key: keyof TemplateFormData, value: string) => {
    if (value.trim() && Array.isArray(data[key])) {
      update({ [key]: [...(data[key] as string[]), value.trim()] });
    }
  };

  const removeFromList = (key: keyof TemplateFormData, index: number) => {
    if (Array.isArray(data[key])) {
      update({
        [key]: (data[key] as string[]).filter((_, i) => i !== index),
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      description: '',
    }));
    update({ inspirationImages: [...data.inspirationImages, ...newImages] });
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const sections: { id: Section; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'context', label: 'Brand Context' },
    { id: 'style', label: 'Tone & Style' },
    { id: 'rules', label: 'Rules (Dos/Donts)' },
    { id: 'inspiration', label: 'Inspiration' },
    { id: 'media', label: 'Media Prefs' },
  ];

  return (
    <div className="max-w-3xl">
      {/* Section Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-tertiary p-1 rounded-lg overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              section === s.id
                ? 'bg-surface-primary text-brand-600 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {section === 'basic' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g., Weekly Product Tips"
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Description
            </label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Brief description of what this template is for"
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => update({ category: cat })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    data.category === cat
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface-primary text-text-secondary border-surface-tertiary hover:border-brand-400'
                  )}
                >
                  {formatEnum(cat)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Language
            </label>
            <select
              value={data.language}
              onChange={(e) => update({ language: e.target.value })}
              className="px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
        </div>
      )}

      {/* Brand Context */}
      {section === 'context' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Brand Description
            </label>
            <textarea
              rows={5}
              value={data.brandContext}
              onChange={(e) => update({ brandContext: e.target.value })}
              placeholder="Describe your brand, company, products, values, and voice guidelines..."
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Target Audience
            </label>
            <textarea
              rows={3}
              value={data.targetAudience}
              onChange={(e) => update({ targetAudience: e.target.value })}
              placeholder="Who are you talking to? Demographics, interests, pain points, aspirations..."
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Goals
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Brand Awareness',
                'Engagement',
                'Traffic',
                'Sales',
                'Community',
                'Education',
                'Entertainment',
                'Thought Leadership',
              ].map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    const goals = data.goals.includes(goal)
                      ? data.goals.filter((g) => g !== goal)
                      : [...data.goals, goal];
                    update({ goals });
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    data.goals.includes(goal)
                      ? 'bg-brand-100 text-brand-700 border-brand-300'
                      : 'bg-surface-primary text-text-secondary border-surface-tertiary hover:border-brand-400'
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tone & Style */}
      {section === 'style' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {tones.map((tone) => (
                <button
                  key={tone}
                  onClick={() => update({ tone })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    data.tone === tone
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface-primary text-text-secondary border-surface-tertiary hover:border-brand-400'
                  )}
                >
                  {formatEnum(tone)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Post Structure
            </label>
            <div className="flex flex-wrap gap-2">
              {postStructures.map((s) => (
                <button
                  key={s}
                  onClick={() => update({ postStructure: s })}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border transition-colors',
                    data.postStructure === s
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-surface-primary text-text-secondary border-surface-tertiary hover:border-brand-400'
                  )}
                >
                  {formatEnum(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Emoji Usage
              </label>
              <select
                value={data.emojiUsage}
                onChange={(e) =>
                  update({ emojiUsage: e.target.value as EmojiUsage })
                }
                className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {emojiOptions.map((o) => (
                  <option key={o} value={o}>
                    {formatEnum(o)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Hashtag Strategy
              </label>
              <select
                value={data.hashtagStrategy}
                onChange={(e) =>
                  update({ hashtagStrategy: e.target.value as HashtagStrategy })
                }
                className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {hashtagStrategies.map((h) => (
                  <option key={h} value={h}>
                    {formatEnum(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Content Length
              </label>
              <select
                value={data.contentLength}
                onChange={(e) =>
                  update({ contentLength: e.target.value as ContentLength })
                }
                className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {contentLengths.map((l) => (
                  <option key={l} value={l}>
                    {formatEnum(l)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              CTA Template
            </label>
            <input
              type="text"
              value={data.ctaTemplate}
              onChange={(e) => update({ ctaTemplate: e.target.value })}
              placeholder='e.g., Visit our website for more: {url}'
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Default Hashtags
            </label>
            <TagInput
              tags={data.defaultHashtags}
              onChange={(tags) => update({ defaultHashtags: tags })}
              placeholder="Type a hashtag and press Enter"
              color="brand"
            />
          </div>
        </div>
      )}

      {/* Rules */}
      {section === 'rules' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Do&apos;s (things the AI should always do)
            </label>
            <TagInput
              tags={data.dos}
              onChange={(tags) => update({ dos: tags })}
              placeholder="e.g., Always mention our website URL"
              color="green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Don&apos;ts (things the AI should never do)
            </label>
            <TagInput
              tags={data.donts}
              onChange={(tags) => update({ donts: tags })}
              placeholder="e.g., Never use competitor brand names"
              color="red"
            />
          </div>
        </div>
      )}

      {/* Inspiration */}
      {section === 'inspiration' && (
        <div className="space-y-6">
          <TextListEditor
            label="Inspiration Texts (reference copy, slogans, key messages)"
            items={data.inspirationTexts}
            placeholder="Paste reference text here..."
            onAdd={(v) => addToList('inspirationTexts', v)}
            onRemove={(i) => removeFromList('inspirationTexts', i)}
          />

          {/* Inspiration images */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Inspiration Images
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {data.inspirationImages.map((img, i) => (
                <div
                  key={i}
                  className="relative w-28 group"
                >
                  <div className="w-28 h-28 rounded-lg bg-surface-tertiary overflow-hidden">
                    {img.url && (
                      <img
                        src={img.url}
                        alt={img.description || ''}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={img.description}
                    onChange={(e) => {
                      const updated = [...data.inspirationImages];
                      updated[i] = { ...updated[i], description: e.target.value };
                      update({ inspirationImages: updated });
                    }}
                    placeholder="Description..."
                    className="w-full mt-1 text-[10px] px-1.5 py-1 border border-surface-tertiary rounded text-text-primary bg-surface-secondary"
                  />
                  <button
                    onClick={() => {
                      update({
                        inspirationImages: data.inspirationImages.filter(
                          (_, idx) => idx !== i
                        ),
                      });
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg hover:bg-surface-tertiary transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              {onOpenMediaLibrary && (
                <button
                  onClick={onOpenMediaLibrary}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg hover:bg-surface-tertiary transition-colors"
                >
                  <Image className="w-3.5 h-3.5" />
                  Library
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Reference URLs
            </label>
            <TagInput
              tags={data.referenceUrls}
              onChange={(tags) => update({ referenceUrls: tags })}
              placeholder="https://example.com/reference-post"
            />
          </div>

          <TextListEditor
            label="Example Posts (past posts that performed well)"
            items={data.examplePosts}
            placeholder="Paste a great post you've written before..."
            onAdd={(v) => addToList('examplePosts', v)}
            onRemove={(i) => removeFromList('examplePosts', i)}
          />
        </div>
      )}

      {/* Media Preferences */}
      {section === 'media' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Image Style Preferences
            </label>
            <input
              type="text"
              value={data.imageStyle}
              onChange={(e) => update({ imageStyle: e.target.value })}
              placeholder="e.g., minimalist, pastel colors, flat design, clean photography"
              className="w-full px-3 py-2 border border-surface-tertiary rounded-lg text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.preferUserImages}
              onChange={(e) => update({ preferUserImages: e.target.checked })}
              className="w-4 h-4 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-text-primary">
              Prefer user-uploaded images over AI-generated
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.imageOverlayText}
              onChange={(e) => update({ imageOverlayText: e.target.checked })}
              className="w-4 h-4 rounded border-surface-tertiary text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-text-primary">
              Add text overlays on images
            </span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-surface-tertiary">
        <button
          onClick={() => onSave(data)}
          disabled={loading || !data.name}
          className={cn(
            'px-6 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors',
            loading || !data.name
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-brand-700'
          )}
        >
          {loading ? 'Saving...' : 'Save Template'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 text-text-secondary border border-surface-tertiary rounded-lg text-sm font-medium hover:bg-surface-tertiary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
