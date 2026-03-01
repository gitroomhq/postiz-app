'use client';

import { create } from 'zustand';
import dayjs from 'dayjs';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { createRef, RefObject } from 'react';
import { PostComment } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

interface Values {
  id: string;
  content: string;
  delay: number;
  media: { id: string; path: string; thumbnail?: string }[];
}

export interface Internal {
  integration: Integrations;
  integrationValue: Values[];
}

export interface SelectedIntegrations {
  settings: any;
  integration: Integrations;
  ref?: RefObject<any>;
}

interface StoreState {
  editor: undefined | 'none' | 'normal' | 'markdown' | 'html';
  loaded: boolean;
  date: dayjs.Dayjs;
  postComment: PostComment;
  dummy: boolean;
  repeater?: number;
  isCreateSet: boolean;
  totalChars: number;
  activateExitButton: boolean;
  tags: { label: string; value: string }[];
  tab: 0 | 1;
  current: string;
  comments: boolean | 'no-media';
  locked: boolean;
  hide: boolean;
  setLocked: (locked: boolean) => void;
  integrations: Integrations[];
  selectedIntegrations: SelectedIntegrations[];
  global: Values[];
  internal: Internal[];
  addGlobalValue: (index: number, value: Values[]) => void;
  setGlobalDelay: (index: number, minutes: number) => void;
  setInternalDelay: (
    integrationId: string,
    index: number,
    minutes: number
  ) => void;
  addInternalValue: (
    index: number,
    integrationId: string,
    value: Values[]
  ) => void;
  setGlobalValue: (value: Values[]) => void;
  setInternalValue: (integrationId: string, value: Values[]) => void;
  deleteGlobalValue: (index: number) => void;
  deleteInternalValue: (integrationId: string, index: number) => void;
  addRemoveInternal: (integrationId: string) => void;
  changeOrderGlobal: (index: number, direction: 'up' | 'down') => void;
  changeOrderInternal: (
    integrationId: string,
    index: number,
    direction: 'up' | 'down'
  ) => void;
  setGlobalValueText: (index: number, content: string) => void;
  setGlobalValueMedia: (
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  setInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  addGlobalValueMedia: (
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  removeGlobalValueMedia: (index: number, mediaIndex: number) => void;
  setInternalValueText: (
    integrationId: string,
    index: number,
    content: string
  ) => void;
  addInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  removeInternalValueMedia: (
    integrationId: string,
    index: number,
    mediaIndex: number
  ) => void;
  setAllIntegrations: (integrations: Integrations[]) => void;
  setCurrent: (current: string) => void;
  addOrRemoveSelectedIntegration: (
    integration: Integrations,
    settings: any
  ) => void;
  reset: () => void;
  setSelectedIntegrations: (
    params: { selectedIntegrations: Integrations; settings: any }[]
  ) => void;
  setTab: (tab: 0 | 1) => void;
  setHide: (hide: boolean) => void;
  setDate: (date: dayjs.Dayjs) => void;
  setRepeater: (repeater: number) => void;
  setTags: (tags: { label: string; value: string }[]) => void;
  setIsCreateSet: (isCreateSet: boolean) => void;
  setTotalChars?: (totalChars: number) => void;
  appendInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  appendGlobalValueMedia: (
    index: number,
    media: { id: string; path: string }[]
  ) => void;
  setPostComment: (postComment: PostComment) => void;
  setActivateExitButton?: (activateExitButton: boolean) => void;
  setDummy: (dummy: boolean) => void;
  setEditor: (editor: 'none' | 'normal' | 'markdown' | 'html') => void;
  setLoaded?: (loaded: boolean) => void;
  setChars: (id: string, chars: number) => void;
  chars: Record<string, number>;
  setComments: (comments: boolean | 'no-media') => void;
}

const initialState = {
  editor: undefined as undefined,
  loaded: true,
  dummy: false,
  comments: true,
  activateExitButton: true,
  date: newDayjs(),
  postComment: PostComment.ALL,
  tags: [] as { label: string; value: string }[],
  totalChars: 0,
  tab: 0 as 0,
  isCreateSet: false,
  current: 'global',
  locked: false,
  hide: false,
  integrations: [] as Integrations[],
  selectedIntegrations: [] as SelectedIntegrations[],
  global: [] as Values[],
  internal: [] as Internal[],
  chars: {},
};

export const useLaunchStore = create<StoreState>()((set) => ({
  ...initialState,
  setCurrent: (current: string) =>
    set((state) => ({
      current: current,
    })),
  addOrRemoveSelectedIntegration: (
    integration: Integrations,
    settings: any
  ) => {
    set((state) => {
      const existing = state.selectedIntegrations.find(
        (i) => i.integration.id === integration.id
      );

      if (existing) {
        const selectedList = state.selectedIntegrations.filter(
          (s, index) => s.integration.id !== existing.integration.id
        );

        return {
          ...(existing.integration.id === state.current
            ? { current: 'global' }
            : {}),
          loaded: false,
          selectedIntegrations: selectedList,
          ...(selectedList.length === 0
            ? {
                current: 'global',
                editor: 'normal',
              }
            : {}),
        };
      }

      return {
        selectedIntegrations: [
          ...state.selectedIntegrations,
          { integration, settings, ref: createRef() },
        ],
      };
    });
  },
  addGlobalValue: (index: number, value: Values[]) =>
    set((state) => {
      if (!state.global.length) {
        return { global: value };
      }

      return {
        global: state.global.reduce((acc, item, i) => {
          acc.push(item);
          if (i === index) {
            acc.push(...value);
          }
          return acc;
        }, []),
      };
    }),
  // Add value after index, similar to addGlobalValue, but for a speciic integration (index starts from 0)
  addInternalValue: (index: number, integrationId: string, value: Values[]) =>
    set((state) => {
      const integrationIndex = state.internal.findIndex(
        (i) => i.integration.id === integrationId
      );

      if (integrationIndex === -1) {
        return {
          internal: [
            ...state.internal,
            {
              integration: state.selectedIntegrations.find(
                (i) => i.integration.id === integrationId
              )!.integration,
              integrationValue: value,
            },
          ],
        };
      }

      const updatedIntegration = state.internal[integrationIndex];
      const newValues = updatedIntegration.integrationValue.reduce(
        (acc, item, i) => {
          acc.push(item);
          if (i === index) {
            acc.push(...value);
          }
          return acc;
        },
        [] as Values[]
      );

      return {
        internal: state.internal.map((i, idx) =>
          idx === integrationIndex ? { ...i, integrationValue: newValues } : i
        ),
      };
    }),
  deleteGlobalValue: (index: number) =>
    set((state) => {
      // Preserve the IDs at their current positions
      const ids = state.global.map((item) => item.id);

      // Get remaining data (content, delay, media) after filtering out deleted index
      const remainingData = state.global
        .filter((_, i) => i !== index)
        .map(({ id, ...rest }) => rest);

      // Reconstruct with preserved IDs
      return {
        global: remainingData.map((data, i) => ({
          id: ids[i],
          ...data,
        })),
      };
    }),
  deleteInternalValue: (integrationId: string, index: number) =>
    set((state) => {
      return {
        internal: state.internal.map((item) => {
          if (item.integration.id === integrationId) {
            // Preserve the IDs at their current positions
            const ids = item.integrationValue.map((v) => v.id);

            // Get remaining data after filtering out deleted index
            const remainingData = item.integrationValue
              .filter((_, idx) => idx !== index)
              .map(({ id, ...rest }) => rest);

            return {
              ...item,
              integrationValue: remainingData.map((data, i) => ({
                id: ids[i],
                ...data,
              })),
            };
          }
          return item;
        }),
      };
    }),
  addRemoveInternal: (integrationId: string) =>
    set((state) => {
      const integration = state.selectedIntegrations.find(
        (i) => i.integration.id === integrationId
      );
      const findIntegrationIndex = state.internal.findIndex(
        (i) => i.integration.id === integrationId
      );

      if (findIntegrationIndex > -1) {
        return {
          internal: state.internal.filter(
            (i) => i.integration.id !== integrationId
          ),
        };
      }

      return {
        internal: [
          ...state.internal,
          {
            integration: integration.integration,
            integrationValue: state.global.slice(0).map((p) => p),
          },
        ],
      };
    }),
  changeOrderGlobal: (index: number, direction: 'up' | 'down') =>
    set((state) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= state.global.length) {
        return { global: state.global };
      }

      const currentItem = state.global[index];
      const targetItem = state.global[targetIndex];

      return {
        global: state.global.map((item, i) => {
          if (i === index) {
            return {
              id: item.id,
              content: targetItem.content,
              delay: targetItem.delay,
              media: targetItem.media,
            };
          }
          if (i === targetIndex) {
            return {
              id: item.id,
              content: currentItem.content,
              delay: currentItem.delay,
              media: currentItem.media,
            };
          }
          return item;
        }),
      };
    }),
  changeOrderInternal: (
    integrationId: string,
    index: number,
    direction: 'up' | 'down'
  ) =>
    set((state) => {
      return {
        internal: state.internal.map((item) => {
          if (item.integration.id === integrationId) {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;

            if (targetIndex < 0 || targetIndex >= item.integrationValue.length) {
              return item;
            }

            const currentValue = item.integrationValue[index];
            const targetValue = item.integrationValue[targetIndex];

            return {
              ...item,
              integrationValue: item.integrationValue.map((v, i) => {
                if (i === index) {
                  return {
                    id: v.id,
                    content: targetValue.content,
                    delay: targetValue.delay,
                    media: targetValue.media,
                  };
                }
                if (i === targetIndex) {
                  return {
                    id: v.id,
                    content: currentValue.content,
                    delay: currentValue.delay,
                    media: currentValue.media,
                  };
                }
                return v;
              }),
            };
          }

          return item;
        }),
      };
    }),
  setGlobalValueText: (index: number, content: string) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index ? { ...item, content } : item
      ),
    })),
  setInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) => {
    return set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index ? { ...v, media } : v
              ),
            }
          : item
      ),
    }));
  },
  setGlobalValueMedia: (index: number, media: { id: string; path: string }[]) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index ? { ...item, media } : item
      ),
    })),
  addGlobalValueMedia: (index: number, media: { id: string; path: string }[]) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index ? { ...item, media: [...item.media, ...media] } : item
      ),
    })),
  removeGlobalValueMedia: (index: number, mediaIndex: number) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index
          ? {
              ...item,
              media: item.media.filter((_, idx) => idx !== mediaIndex),
            }
          : item
      ),
    })),
  setInternalValueText: (
    integrationId: string,
    index: number,
    content: string
  ) => {
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index ? { ...v, content } : v
              ),
            }
          : item
      ),
    }));
  },
  addInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) =>
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index ? { ...v, media: [...v.media, ...media] } : v
              ),
            }
          : item
      ),
    })),
  removeInternalValueMedia: (
    integrationId: string,
    index: number,
    mediaIndex: number
  ) =>
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index
                  ? {
                      ...v,
                      media: v.media.filter((_, idx) => idx !== mediaIndex),
                    }
                  : v
              ),
            }
          : item
      ),
    })),
  reset: () =>
    set((state) => ({
      ...state,
      ...initialState,
    })),
  setAllIntegrations: (integrations: Integrations[]) =>
    set((state) => ({
      integrations: integrations,
    })),
  setTab: (tab: 0 | 1) =>
    set((state) => ({
      tab: tab,
    })),
  setLocked: (locked: boolean) =>
    set((state) => ({
      locked: locked,
    })),
  setHide: (hide: boolean) =>
    set((state) => ({
      hide: hide,
    })),
  setDate: (date: dayjs.Dayjs) =>
    set((state) => ({
      date,
    })),
  setRepeater: (repeater: number) =>
    set((state) => ({
      repeater,
    })),
  setTags: (tags: { label: string; value: string }[]) =>
    set((state) => ({
      tags,
    })),
  setIsCreateSet: (isCreateSet: boolean) =>
    set((state) => ({
      isCreateSet,
    })),
  setSelectedIntegrations: (
    params: { selectedIntegrations: Integrations; settings: any }[]
  ) =>
    set((state) => ({
      selectedIntegrations: params.map((p) => ({
        integration: p.selectedIntegrations,
        settings: p.settings,
        ref: createRef(),
      })),
    })),
  setGlobalValue: (value: Values[]) =>
    set((state) => ({
      global: value,
    })),
  setInternalValue: (integrationId: string, value: Values[]) =>
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? { ...item, integrationValue: value }
          : item
      ),
    })),
  setTotalChars: (totalChars: number) =>
    set((state) => ({
      totalChars,
    })),
  appendInternalValueMedia: (
    integrationId: string,
    index: number,
    media: { id: string; path: string }[]
  ) =>
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index
                  ? { ...v, media: [...(v?.media || []), ...media] }
                  : v
              ),
            }
          : item
      ),
    })),
  appendGlobalValueMedia: (
    index: number,
    media: { id: string; path: string }[]
  ) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index
          ? { ...item, media: [...(item?.media || []), ...media] }
          : item
      ),
    })),
  setPostComment: (postComment: PostComment) =>
    set((state) => ({
      postComment,
    })),
  setActivateExitButton: (activateExitButton: boolean) =>
    set((state) => ({
      activateExitButton,
    })),
  setDummy: (dummy: boolean) =>
    set((state) => ({
      dummy,
    })),
  setEditor: (editor: 'none' | 'normal' | 'markdown' | 'html') =>
    set((state) => ({
      editor,
    })),
  setLoaded: (loaded: boolean) =>
    set((state) => ({
      loaded,
    })),
  setChars: (id: string, chars: number) =>
    set((state) => ({
      chars: {
        ...state.chars,
        [id]: chars,
      },
    })),
  setComments: (comments: boolean | 'no-media') =>
    set((state) => ({
      comments,
    })),
  setGlobalDelay: (index: number, minutes: number) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index ? { ...item, delay: minutes } : item
      ),
    })),
  setInternalDelay: (integrationId: string, index: number, minutes: number) =>
    set((state) => ({
      internal: state.internal.map((item) =>
        item.integration.id === integrationId
          ? {
              ...item,
              integrationValue: item.integrationValue.map((v, i) =>
                i === index ? { ...v, delay: minutes } : v
              ),
            }
          : item
      ),
    })),
}));
