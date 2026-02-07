import React, { useState } from 'react';
import { clsx } from 'clsx';
import { FileText, Plus } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  tone: string;
  brandContext?: string;
}

interface StepBrandContextProps {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  inlineContext: {
    brandContext: string;
    targetAudience: string;
    tone: string;
    goals: string[];
  };
  onUpdateInlineContext: (ctx: Partial<StepBrandContextProps['inlineContext']>) => void;
}

const tones = ['CASUAL', 'PROFESSIONAL', 'WITTY', 'INSPIRATIONAL', 'BOLD', 'FRIENDLY', 'AUTHORITATIVE', 'CONVERSATIONAL'];
const goalOptions = ['Brand Awareness', 'Engagement', 'Traffic', 'Sales', 'Community', 'Education', 'Entertainment'];

export const StepBrandContext: React.FC<StepBrandContextProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  inlineContext,
  onUpdateInlineContext,
}) => {
  const [useTemplate, setUseTemplate] = useState(!!selectedTemplateId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Set your brand context</h2>
      <p className="text-text-secondary mb-8">Choose an existing template or define context inline.</p>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setUseTemplate(true); }}
          className={clsx(
            'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
            useTemplate ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-text-secondary border-gray-300 hover:border-brand-400',
          )}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Use Template
        </button>
        <button
          onClick={() => { setUseTemplate(false); onSelectTemplate(null); }}
          className={clsx(
            'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
            !useTemplate ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-text-secondary border-gray-300 hover:border-brand-400',
          )}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Define Inline
        </button>
      </div>

      {useTemplate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 && (
            <p className="text-text-muted col-span-2 py-8 text-center">No templates yet. Create one in Templates page or define context inline.</p>
          )}
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id)}
              className={clsx(
                'p-4 rounded-lg border-2 text-left transition-all',
                selectedTemplateId === tpl.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-text-primary">{tpl.name}</h3>
                <span className="text-xs px-2 py-1 bg-surface-tertiary rounded-full text-text-muted">{tpl.category}</span>
              </div>
              <p className="text-sm text-text-secondary">Tone: {tpl.tone}</p>
              {tpl.brandContext && (
                <p className="text-xs text-text-muted mt-2 line-clamp-2">{tpl.brandContext}</p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Brand Description</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Describe your brand, company, products, and voice..."
              value={inlineContext.brandContext}
              onChange={(e) => onUpdateInlineContext({ brandContext: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Target Audience</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="Who are you trying to reach? Demographics, interests, pain points..."
              value={inlineContext.targetAudience}
              onChange={(e) => onUpdateInlineContext({ targetAudience: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Tone</label>
            <div className="flex flex-wrap gap-2">
              {tones.map((tone) => (
                <button
                  key={tone}
                  onClick={() => onUpdateInlineContext({ tone })}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    inlineContext.tone === tone
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-text-secondary border-gray-300 hover:border-brand-400',
                  )}
                >
                  {tone.charAt(0) + tone.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Goals</label>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    const goals = inlineContext.goals.includes(goal)
                      ? inlineContext.goals.filter((g) => g !== goal)
                      : [...inlineContext.goals, goal];
                    onUpdateInlineContext({ goals });
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    inlineContext.goals.includes(goal)
                      ? 'bg-brand-100 text-brand-700 border-brand-300'
                      : 'bg-white text-text-secondary border-gray-300 hover:border-brand-400',
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
