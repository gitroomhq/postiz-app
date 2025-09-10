import { Integration, Post, State, Tags } from '@prisma/client';
import { Dayjs } from 'dayjs';
import { Integrations } from '../calendar.context';

export interface CalendarItemProps {
    date: Dayjs;
    isBeforeNow: boolean;
    editPost: () => void;
    duplicatePost: () => void;
    deletePost: () => void;
    statistics: () => void;
    integrations: Integrations[];
    state: State;
    display: 'day' | 'week' | 'month';
    post: Post & {
        integration: Integration;
        tags: {
            tag: Tags;
        }[];
    };
}

export interface SetSelectionModalProps {
    sets: any[];
    onSelect: (set: any) => void;
    onContinueWithoutSet: () => void;
}
