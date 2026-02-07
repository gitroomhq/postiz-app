import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface WizardProgressProps {
  steps: Step[];
  currentStep: number;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ steps, currentStep }) => {
  return (
    <nav className="mb-8">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <li
              key={index}
              className={clsx('flex items-center', index < steps.length - 1 && 'flex-1')}
            >
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                    isCompleted && 'bg-brand-600 border-brand-600 text-white',
                    isCurrent && 'bg-white border-brand-600 text-brand-600',
                    isUpcoming && 'bg-surface-tertiary border-gray-300 text-text-muted',
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span
                  className={clsx(
                    'mt-2 text-xs font-medium text-center whitespace-nowrap',
                    isCurrent ? 'text-brand-600' : isCompleted ? 'text-text-primary' : 'text-text-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    'flex-1 h-0.5 mx-4 mt-[-1.5rem]',
                    isCompleted ? 'bg-brand-600' : 'bg-gray-300',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
