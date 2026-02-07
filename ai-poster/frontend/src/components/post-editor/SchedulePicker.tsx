import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { cn, formatDateTime } from '@/lib/utils';
import { Calendar, Clock, Send, FileText, Star } from 'lucide-react';

export interface SuggestedTime {
  time: Date;
  label: string;
  score: number; // 0-100 engagement score
}

export interface SchedulePickerProps {
  selectedDate?: Date | null;
  onChange: (date: Date | null) => void;
  onPostNow: () => void;
  onSaveDraft: () => void;
  suggestedTimes?: SuggestedTime[];
  className?: string;
}

export default function SchedulePicker({
  selectedDate,
  onChange,
  onPostNow,
  onSaveDraft,
  suggestedTimes = [],
  className,
}: SchedulePickerProps) {
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs());

  const dateInputValue = selectedDate
    ? dayjs(selectedDate).format('YYYY-MM-DD')
    : '';
  const timeInputValue = selectedDate
    ? dayjs(selectedDate).format('HH:mm')
    : '';

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) {
      onChange(null);
      return;
    }
    const current = selectedDate ? dayjs(selectedDate) : dayjs();
    const newDate = dayjs(dateStr)
      .hour(current.hour())
      .minute(current.minute())
      .toDate();
    onChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!timeStr) return;
    const [h, m] = timeStr.split(':').map(Number);
    const current = selectedDate ? dayjs(selectedDate) : dayjs();
    const newDate = current.hour(h).minute(m).second(0).toDate();
    onChange(newDate);
  };

  const handleSuggestedTime = (time: Date) => {
    onChange(time);
  };

  // Mini calendar generation
  const miniCalendarDays = useMemo(() => {
    const start = calendarMonth.startOf('month');
    const startDayOfWeek = start.day() === 0 ? 6 : start.day() - 1;
    const gridStart = start.subtract(startDayOfWeek, 'day');
    const days: dayjs.Dayjs[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(gridStart.add(i, 'day'));
    }
    return days;
  }, [calendarMonth.toString()]);

  const today = dayjs().format('YYYY-MM-DD');
  const selectedDateStr = selectedDate
    ? dayjs(selectedDate).format('YYYY-MM-DD')
    : '';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Schedule for later */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Schedule for later
        </h4>

        <div className="flex gap-2">
          {/* Date input */}
          <div className="flex-1">
            <label className="block text-[10px] text-text-muted mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateInputValue}
              onChange={handleDateChange}
              min={dayjs().format('YYYY-MM-DD')}
              className="w-full text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          {/* Time input */}
          <div className="w-28">
            <label className="block text-[10px] text-text-muted mb-1">
              Time
            </label>
            <input
              type="time"
              value={timeInputValue}
              onChange={handleTimeChange}
              className="w-full text-sm text-text-primary bg-surface-secondary border border-surface-tertiary rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        </div>

        {/* Mini calendar toggle */}
        <button
          onClick={() => setShowMiniCalendar(!showMiniCalendar)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {showMiniCalendar ? 'Hide calendar' : 'Show calendar'}
        </button>

        {/* Mini calendar */}
        {showMiniCalendar && (
          <div className="border border-surface-tertiary rounded-lg p-3 animate-fade-in">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setCalendarMonth(calendarMonth.subtract(1, 'month'))}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Prev
              </button>
              <span className="text-xs font-semibold text-text-primary">
                {calendarMonth.format('MMMM YYYY')}
              </span>
              <button
                onClick={() => setCalendarMonth(calendarMonth.add(1, 'month'))}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Next
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] text-text-muted font-medium py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0">
              {miniCalendarDays.map((day) => {
                const key = day.format('YYYY-MM-DD');
                const isCurrentMonth =
                  day.month() === calendarMonth.month();
                const isToday = key === today;
                const isSelected = key === selectedDateStr;
                const isPast = day.isBefore(dayjs(), 'day');

                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isPast) return;
                      const current = selectedDate
                        ? dayjs(selectedDate)
                        : dayjs();
                      const newDate = day
                        .hour(current.hour())
                        .minute(current.minute())
                        .toDate();
                      onChange(newDate);
                    }}
                    disabled={isPast}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-full text-xs',
                      !isCurrentMonth && 'text-text-muted/40',
                      isCurrentMonth && !isPast && 'text-text-primary hover:bg-surface-secondary',
                      isPast && 'text-text-muted/30 cursor-not-allowed',
                      isToday && !isSelected && 'ring-1 ring-brand-300',
                      isSelected && 'bg-brand-600 text-white hover:bg-brand-700'
                    )}
                  >
                    {day.date()}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected schedule summary */}
        {selectedDate && (
          <div className="flex items-center gap-1.5 text-sm text-text-primary bg-brand-50 rounded-lg px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Scheduled for {formatDateTime(selectedDate)}</span>
          </div>
        )}
      </div>

      {/* Suggested times */}
      {suggestedTimes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" />
            Suggested times
          </h4>
          <div className="space-y-1">
            {suggestedTimes.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedTime(suggestion.time)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs',
                  'border border-surface-tertiary hover:bg-surface-secondary transition-colors'
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span className="text-text-primary font-medium">
                    {formatDateTime(suggestion.time)}
                  </span>
                  <span className="text-text-muted">{suggestion.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-approved rounded-full"
                      style={{ width: `${suggestion.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">{suggestion.score}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 pt-2 border-t border-surface-tertiary">
        <button
          onClick={onPostNow}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-brand-600 text-white hover:bg-brand-700'
          )}
        >
          <Send className="w-3.5 h-3.5" />
          Post Now
        </button>
        <button
          onClick={onSaveDraft}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg',
            'text-sm font-medium transition-colors',
            'bg-surface-secondary text-text-primary hover:bg-surface-tertiary'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Save as Draft
        </button>
      </div>
    </div>
  );
}
