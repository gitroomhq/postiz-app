import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import WizardProgress from '@/components/campaign-wizard/WizardProgress';
import StepModeSelect from '@/components/campaign-wizard/StepModeSelect';
import StepBrandContext from '@/components/campaign-wizard/StepBrandContext';
import StepChannels from '@/components/campaign-wizard/StepChannels';
import StepSchedule from '@/components/campaign-wizard/StepSchedule';
import StepUploadAssets from '@/components/campaign-wizard/StepUploadAssets';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTemplates } from '@/hooks/useTemplates';
import { useIntegrations } from '@/hooks/useIntegrations';
import { PLATFORM_DISPLAY_NAMES } from '@/lib/constants';
import { fetchApi } from '@/lib/api';
import { CampaignMode } from '@ai-poster/shared';
import toast from 'react-hot-toast';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['Mode', 'Brand Context', 'Channels', 'Schedule', 'Review'];

export function NewCampaignPage() {
  const navigate = useNavigate();
  const { templates } = useTemplates();
  const { integrations } = useIntegrations();

  const [step, setStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<CampaignMode | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [brandContext, setBrandContext] = useState('');
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [postsPerWeek, setPostsPerWeek] = useState('3');
  const [topics, setTopics] = useState('');
  const [uploadedAssets, setUploadedAssets] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleIntegration = (id: string) => {
    setSelectedIntegrationIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return mode !== null;
      case 2:
        return name.trim().length > 0 && (!!templateId || brandContext.trim().length > 0);
      case 3:
        return selectedIntegrationIds.length > 0;
      case 4:
        if (mode === CampaignMode.SEMI_AUTOMATED) {
          return !!startDate && !!endDate;
        }
        return !!startDate && !!endDate && parseInt(postsPerWeek) > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        mode,
        templateId: templateId || undefined,
        startDate,
        endDate,
        postsPerWeek: parseInt(postsPerWeek),
        preferredTimes: [9, 12, 17],
        integrationIds: selectedIntegrationIds,
        topics: topics
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const result = await fetchApi<{ id: string }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (mode === CampaignMode.SEMI_AUTOMATED && uploadedAssets.length > 0) {
        const formData = new FormData();
        uploadedAssets.forEach((file) => formData.append('files', file));
        await fetchApi(`/campaigns/${result.id}/assets`, {
          method: 'POST',
          body: formData,
        });
      }

      toast.success('Campaign created successfully!');
      navigate(`/campaigns/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepLabels = () => {
    if (mode === CampaignMode.SEMI_AUTOMATED) {
      return ['Mode', 'Brand Context', 'Channels', 'Upload Assets', 'Review'];
    }
    return STEP_LABELS;
  };

  return (
    <div className="page-container max-w-3xl space-y-6">
      {/* Step indicator */}
      <WizardProgress
        steps={getStepLabels()}
        currentStep={step}
      />

      {/* Step 1: Mode Selection */}
      {step === 1 && (
        <StepModeSelect
          selectedMode={mode}
          onSelectMode={setMode}
        />
      )}

      {/* Step 2: Brand Context */}
      {step === 2 && (
        <StepBrandContext
          name={name}
          onNameChange={setName}
          description={description}
          onDescriptionChange={setDescription}
          templateId={templateId}
          onTemplateIdChange={setTemplateId}
          brandContext={brandContext}
          onBrandContextChange={setBrandContext}
          templates={templates}
        />
      )}

      {/* Step 3: Channel Selection */}
      {step === 3 && (
        <StepChannels
          integrations={integrations}
          selectedIds={selectedIntegrationIds}
          onToggle={toggleIntegration}
        />
      )}

      {/* Step 4: Schedule (auto) or Upload Assets (semi-auto) */}
      {step === 4 && mode === CampaignMode.SEMI_AUTOMATED && (
        <StepUploadAssets
          assets={uploadedAssets}
          onAssetsChange={setUploadedAssets}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
        />
      )}

      {step === 4 && mode !== CampaignMode.SEMI_AUTOMATED && (
        <StepSchedule
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          postsPerWeek={postsPerWeek}
          onPostsPerWeekChange={setPostsPerWeek}
          topics={topics}
          onTopicsChange={setTopics}
          showTopics={mode === CampaignMode.FULLY_AUTOMATED}
        />
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Review Campaign</h2>
            <p className="mt-1 text-sm text-text-muted">
              Confirm the details before creating your campaign.
            </p>
          </div>
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Campaign Name
                </p>
                <p className="mt-1 text-sm font-medium text-text-primary">{name}</p>
                {description && (
                  <p className="mt-0.5 text-sm text-text-muted">{description}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Mode
                </p>
                <div className="mt-1">
                  <Badge variant="default">
                    {mode === CampaignMode.FULLY_AUTOMATED
                      ? 'Full Auto'
                      : mode === CampaignMode.SEMI_AUTOMATED
                        ? 'Semi Auto'
                        : 'Manual'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Channels
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedIntegrationIds.map((id) => {
                    const integration = integrations.find((i) => i.id === id);
                    return integration ? (
                      <span
                        key={id}
                        className="rounded-full bg-surface-tertiary px-3 py-1 text-xs text-text-secondary"
                      >
                        {integration.displayName ||
                          integration.accountName ||
                          PLATFORM_DISPLAY_NAMES[integration.platform]}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Schedule
                </p>
                <p className="mt-1 text-sm text-text-primary">
                  {startDate} to {endDate} &middot; {postsPerWeek} posts/week
                </p>
              </div>
              {mode === CampaignMode.SEMI_AUTOMATED && uploadedAssets.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Uploaded Assets
                  </p>
                  <p className="mt-1 text-sm text-text-primary">
                    {uploadedAssets.length} file{uploadedAssets.length !== 1 ? 's' : ''} ready
                  </p>
                </div>
              )}
              {topics.trim() && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Topics
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {topics
                      .split('\n')
                      .filter(Boolean)
                      .map((topic, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700"
                        >
                          {topic.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => {
            if (step === 1) navigate('/campaigns');
            else setStep((s) => (s - 1) as WizardStep);
          }}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 5 ? (
          <Button
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={() => setStep((s) => (s + 1) as WizardStep)}
            disabled={!canProceed()}
          >
            Continue
          </Button>
        ) : (
          <Button
            icon={<Sparkles className="h-4 w-4" />}
            onClick={handleSubmit}
            loading={submitting}
          >
            Create Campaign
          </Button>
        )}
      </div>
    </div>
  );
}
