import { create } from 'zustand';
import dayjs from 'dayjs';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

interface CalendarFilters {
  campaignId?: string;
  integrationId?: string;
  status?: string;
}

interface CalendarState {
  viewMode: CalendarViewMode;
  currentDate: string;
  filters: CalendarFilters;

  setViewMode: (mode: CalendarViewMode) => void;
  setCurrentDate: (date: string) => void;
  goToToday: () => void;
  goNext: () => void;
  goPrev: () => void;
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  viewMode: 'month',
  currentDate: dayjs().format('YYYY-MM-DD'),
  filters: {},

  setViewMode: (viewMode) => set({ viewMode }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  goToToday: () => set({ currentDate: dayjs().format('YYYY-MM-DD') }),
  goNext: () => {
    const { viewMode, currentDate } = get();
    const d = dayjs(currentDate);
    const unit = viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'day';
    set({ currentDate: d.add(1, unit).format('YYYY-MM-DD') });
  },
  goPrev: () => {
    const { viewMode, currentDate } = get();
    const d = dayjs(currentDate);
    const unit = viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'day';
    set({ currentDate: d.subtract(1, unit).format('YYYY-MM-DD') });
  },
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}));
