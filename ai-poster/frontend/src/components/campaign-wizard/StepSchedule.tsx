import React from 'react';
import { clsx } from 'clsx';
import { Calendar, Clock, Plus, X } from 'lucide-react';

interface StepScheduleProps {
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  preferredTimes: string[];
  topics: string[];
  onUpdate: (data: Partial<StepScheduleProps>) => void;
}

export const StepSchedule: React.FC<StepScheduleProps> = ({
  startDate,
  endDate,
  postsPerWeek,
  preferredTimes,
  topics,
  onUpdate,
}) => {
  const addTime = () => {
    onUpdate({ preferredTimes: [...preferredTimes, '09:00'] });
  };

  const removeTime = (index: number) => {
    onUpdate({ preferredTimes: preferredTimes.filter((_, i) => i !== index) });
  };

  const updateTime = (index: number, value: string) => {
    const updated = [...preferredTimes];
    updated[index] = value;
    onUpdate({ preferredTimes: updated });
  };

  const addTopic = () => {
    onUpdate({ topics: [...topics, ''] });
  };

  const removeTopic = (index: number) => {
    onUpdate({ topics: topics.filter((_, i) => i !== index) });
  };

  const updateTopic = (index: number, value: string) => {
    const updated = [...topics];
    updated[index] = value;
    onUpdate({ topics: updated });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Set your schedule</h2>
      <p className="text-text-secondary mb-8">Define when and how often to post.</p>

      <div className="max-w-2xl space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              <Calendar className="w-4 h-4" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
              <Calendar className="w-4 h-4" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Posts per week: <span className="text-brand-600 font-bold">{postsPerWeek}</span>
          </label>
          <input
            type="range"
            min={1}
            max={21}
            value={postsPerWeek}
            onChange={(e) => onUpdate({ postsPerWeek: parseInt(e.target.value) })}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>1/week</span>
            <span>7/week</span>
            <span>14/week</span>
            <span>21/week</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
            <Clock className="w-4 h-4" />
            Preferred Posting Times
          </label>
          <div className="space-y-2">
            {preferredTimes.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  onClick={() => removeTime(index)}
                  className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addTime}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add time slot
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Topics (optional - AI will suggest if empty)
          </label>
          <div className="space-y-2">
            {topics.map((topic, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => updateTopic(index, e.target.value)}
                  placeholder="e.g., Productivity tips for developers"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  onClick={() => removeTopic(index)}
                  className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addTopic}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add topic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
