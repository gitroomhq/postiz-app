import { create } from 'zustand';
import type { PostMediaDto } from '@ai-poster/shared';

export type EditorMode = 'global' | 'per-channel';

interface ThreadPost {
  id: string;
  content: string;
  media: PostMediaDto[];
}

interface PostEditorState {
  content: string;
  selectedIntegrationIds: string[];
  media: PostMediaDto[];
  scheduledDate: string | null;
  templateId: string | null;
  mode: EditorMode;
  threadPosts: ThreadPost[];
  title: string;
  tags: string[];
  platformSettings: Record<string, Record<string, unknown>>;

  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  setSelectedIntegrations: (ids: string[]) => void;
  toggleIntegration: (id: string) => void;
  setMedia: (media: PostMediaDto[]) => void;
  addMedia: (item: PostMediaDto) => void;
  removeMedia: (id: string) => void;
  setScheduledDate: (date: string | null) => void;
  setTemplateId: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setTags: (tags: string[]) => void;
  addThreadPost: () => void;
  updateThreadPost: (id: string, content: string) => void;
  removeThreadPost: (id: string) => void;
  setPlatformSettings: (
    integrationId: string,
    settings: Record<string, unknown>
  ) => void;
  reset: () => void;
}

const initialState = {
  content: '',
  title: '',
  selectedIntegrationIds: [] as string[],
  media: [] as PostMediaDto[],
  scheduledDate: null as string | null,
  templateId: null as string | null,
  mode: 'global' as EditorMode,
  threadPosts: [] as ThreadPost[],
  tags: [] as string[],
  platformSettings: {} as Record<string, Record<string, unknown>>,
};

let threadCounter = 0;

export const usePostEditorStore = create<PostEditorState>((set) => ({
  ...initialState,

  setContent: (content) => set({ content }),
  setTitle: (title) => set({ title }),
  setSelectedIntegrations: (ids) => set({ selectedIntegrationIds: ids }),
  toggleIntegration: (id) =>
    set((state) => ({
      selectedIntegrationIds: state.selectedIntegrationIds.includes(id)
        ? state.selectedIntegrationIds.filter((i) => i !== id)
        : [...state.selectedIntegrationIds, id],
    })),
  setMedia: (media) => set({ media }),
  addMedia: (item) => set((state) => ({ media: [...state.media, item] })),
  removeMedia: (id) =>
    set((state) => ({ media: state.media.filter((m) => m.id !== id) })),
  setScheduledDate: (date) => set({ scheduledDate: date }),
  setTemplateId: (id) => set({ templateId: id }),
  setMode: (mode) => set({ mode }),
  setTags: (tags) => set({ tags }),
  addThreadPost: () =>
    set((state) => ({
      threadPosts: [
        ...state.threadPosts,
        { id: `thread-${++threadCounter}`, content: '', media: [] },
      ],
    })),
  updateThreadPost: (id, content) =>
    set((state) => ({
      threadPosts: state.threadPosts.map((t) =>
        t.id === id ? { ...t, content } : t
      ),
    })),
  removeThreadPost: (id) =>
    set((state) => ({
      threadPosts: state.threadPosts.filter((t) => t.id !== id),
    })),
  setPlatformSettings: (integrationId, settings) =>
    set((state) => ({
      platformSettings: { ...state.platformSettings, [integrationId]: settings },
    })),
  reset: () => set(initialState),
}));
