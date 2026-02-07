import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface Integration {
  id: string;
  platform: string;
  name: string;
  profilePicture?: string;
}

interface StepChannelsProps {
  integrations: Integration[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const platformIcons: Record<string, { color: string; label: string }> = {
  TWITTER: { color: '#000000', label: 'X' },
  LINKEDIN: { color: '#0A66C2', label: 'LI' },
  LINKEDIN_PAGE: { color: '#0A66C2', label: 'LP' },
  FACEBOOK: { color: '#1877F2', label: 'FB' },
  INSTAGRAM: { color: '#E4405F', label: 'IG' },
  YOUTUBE: { color: '#FF0000', label: 'YT' },
  TIKTOK: { color: '#000000', label: 'TK' },
  REDDIT: { color: '#FF4500', label: 'RD' },
  PINTEREST: { color: '#E60023', label: 'PI' },
  THREADS: { color: '#000000', label: 'TH' },
  DISCORD: { color: '#5865F2', label: 'DC' },
  SLACK: { color: '#4A154B', label: 'SL' },
  MASTODON: { color: '#6364FF', label: 'MA' },
  BLUESKY: { color: '#0085FF', label: 'BS' },
  DRIBBBLE: { color: '#EA4C89', label: 'DR' },
};

export const StepChannels: React.FC<StepChannelsProps> = ({ integrations, selectedIds, onToggle }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Select channels</h2>
      <p className="text-text-secondary mb-8">Choose which social media channels to post to.</p>

      {integrations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted mb-4">No channels connected yet.</p>
          <a href="/integrations" className="text-brand-600 hover:text-brand-700 font-medium">
            Connect your first channel
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {integrations.map((integration) => {
            const isSelected = selectedIds.includes(integration.id);
            const platform = platformIcons[integration.platform] || { color: '#6b7280', label: '?' };

            return (
              <button
                key={integration.id}
                onClick={() => onToggle(integration.id)}
                className={clsx(
                  'relative p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {integration.profilePicture ? (
                    <img
                      src={integration.profilePicture}
                      alt={integration.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.label}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{integration.name}</p>
                    <p className="text-xs text-text-muted">{integration.platform.replace('_', ' ')}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-sm text-text-muted">
        {selectedIds.length} channel{selectedIds.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
};
