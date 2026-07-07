import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ComposerMediaStatus = 'uploading' | 'uploaded' | 'failed';

export type ComposerMedia = {
  localId: string;
  status: ComposerMediaStatus;
  uri: string;
  name: string;
  mimeType: string;
  serverId?: string;
  path?: string;
  thumbnail?: string;
};

type ComposerState = {
  content: string;
  channelOverrides: Record<string, string>;
  channelSettings: Record<string, Record<string, unknown>>;
  selectedIntegrationIds: string[];
  media: ComposerMedia[];
  date: string;
  setContent: (content: string) => void;
  setChannelOverride: (integrationId: string, content: string) => void;
  clearChannelOverride: (integrationId: string) => void;
  setChannelSetting: (integrationId: string, key: string, value: unknown) => void;
  setChannelSettings: (integrationId: string, settings: Record<string, unknown>) => void;
  clearChannelSettings: (integrationId: string) => void;
  toggleIntegration: (integrationId: string) => void;
  addMedia: (media: ComposerMedia) => void;
  updateMedia: (localId: string, patch: Partial<ComposerMedia>) => void;
  removeMedia: (localId: string) => void;
  setDate: (date: string) => void;
  reset: () => void;
};

export function defaultComposerDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString();
}

export const useComposerStore = create<ComposerState>()(
  persist(
    (set) => ({
      content: '',
      channelOverrides: {},
      channelSettings: {},
      selectedIntegrationIds: [],
      media: [],
      date: defaultComposerDate(),
      setContent(content) {
        set({ content });
      },
      setChannelOverride(integrationId, content) {
        set((state) => ({
          channelOverrides: { ...state.channelOverrides, [integrationId]: content },
        }));
      },
      clearChannelOverride(integrationId) {
        set((state) => {
          const { [integrationId]: removed, ...channelOverrides } = state.channelOverrides;

          return { channelOverrides };
        });
      },
      setChannelSetting(integrationId, key, value) {
        set((state) => ({
          channelSettings: {
            ...state.channelSettings,
            [integrationId]: {
              ...(state.channelSettings[integrationId] ?? {}),
              [key]: value,
            },
          },
        }));
      },
      setChannelSettings(integrationId, settings) {
        set((state) => ({
          channelSettings: {
            ...state.channelSettings,
            [integrationId]: settings,
          },
        }));
      },
      clearChannelSettings(integrationId) {
        set((state) => {
          const { [integrationId]: removed, ...channelSettings } = state.channelSettings;

          return { channelSettings };
        });
      },
      toggleIntegration(integrationId) {
        set((state) => ({
          selectedIntegrationIds: state.selectedIntegrationIds.includes(integrationId)
            ? state.selectedIntegrationIds.filter((id) => id !== integrationId)
            : [...state.selectedIntegrationIds, integrationId],
        }));
      },
      addMedia(media) {
        set((state) => ({ media: [...state.media, media] }));
      },
      updateMedia(localId, patch) {
        set((state) => ({
          media: state.media.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
        }));
      },
      removeMedia(localId) {
        set((state) => ({ media: state.media.filter((item) => item.localId !== localId) }));
      },
      setDate(date) {
        set({ date });
      },
      reset() {
        set({
          content: '',
          channelOverrides: {},
          channelSettings: {},
          selectedIntegrationIds: [],
          media: [],
          date: defaultComposerDate(),
        });
      },
    }),
    {
      name: 'postiz.composer.draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        content: state.content,
        channelOverrides: state.channelOverrides,
        channelSettings: state.channelSettings,
        selectedIntegrationIds: state.selectedIntegrationIds,
        media: state.media.filter((item) => item.status === 'uploaded'),
        date: state.date,
      }),
    }
  )
);
