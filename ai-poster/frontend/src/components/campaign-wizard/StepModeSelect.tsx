import React from 'react';
import { clsx } from 'clsx';
import { Wand2, ImagePlus, PenTool } from 'lucide-react';

type CampaignMode = 'FULLY_AUTOMATED' | 'SEMI_AUTOMATED' | 'MANUAL';

interface StepModeSelectProps {
  selected: CampaignMode | null;
  onSelect: (mode: CampaignMode) => void;
}

const modes = [
  {
    id: 'FULLY_AUTOMATED' as CampaignMode,
    icon: Wand2,
    title: 'Fully Automated',
    description: 'AI generates everything - text, images, and schedule. You just review and approve.',
    features: [
      'AI generates complete posting plan',
      'Auto-generates images with DALL-E',
      'Optimizes posting times',
      'You only approve or regenerate',
    ],
    color: 'brand',
  },
  {
    id: 'SEMI_AUTOMATED' as CampaignMode,
    icon: ImagePlus,
    title: 'Semi-Automated',
    description: 'Upload your images or URLs, and AI creates perfectly crafted posts from them.',
    features: [
      'Upload images or paste URLs',
      'AI analyzes and creates captions',
      'Platform-specific formatting',
      'Edit and refine AI output',
    ],
    color: 'amber',
  },
  {
    id: 'MANUAL' as CampaignMode,
    icon: PenTool,
    title: 'Manual',
    description: 'Full creative control. Write your own posts with optional AI assistance.',
    features: [
      'Rich text editor',
      'Multi-channel posting',
      'Optional AI text improvement',
      'Full scheduling control',
    ],
    color: 'emerald',
  },
];

export const StepModeSelect: React.FC<StepModeSelectProps> = ({ selected, onSelect }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Choose your posting mode</h2>
      <p className="text-text-secondary mb-8">How much do you want AI to handle?</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modes.map((mode) => {
          const isSelected = selected === mode.id;
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={clsx(
                'p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                isSelected
                  ? 'border-brand-500 bg-brand-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div
                className={clsx(
                  'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                  isSelected ? 'bg-brand-100 text-brand-600' : 'bg-surface-tertiary text-text-muted',
                )}
              >
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-semibold text-text-primary mb-2">{mode.title}</h3>
              <p className="text-sm text-text-secondary mb-4">{mode.description}</p>

              <ul className="space-y-2">
                {mode.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-brand-500 mt-0.5">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-brand-200">
                  <span className="text-sm font-medium text-brand-600">Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
