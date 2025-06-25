'use client';

import { create } from 'zustand';
import dayjs from 'dayjs';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { createRef, RefObject } from 'react';

interface Values {
  id: string;
  content: string;
  media: { id: string; path: string }[];
}

interface Internal {
  integration: Integrations;
  integrationValue: Values[];
}

interface SelectedIntegrations {
  settings: any;
  integration: Integrations;
  ref?: RefObject<any>;
}

interface StoreState {
  date: dayjs.Dayjs;
  current: string;
  integrations: Integrations[];
  selectedIntegrations: SelectedIntegrations[];
  global: Values[];
  internal: Internal[];
  addGlobalValue: (index: number, value: Values[]) => void;
  addInternalValue: (
    index: number,
    integrationId: string,
    value: Values[]
  ) => void;
  deleteGlobalValue: (index: number) => void;
  deleteInternalValue: (integrationId: string, index: number) => void;
  addRemoveInternal: (integrationId: string) => void;
  changeOrderGlobal: (fromIndex: number, toIndex: number) => void;
  changeOrderInternal: (
    integrationId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  setGlobalValueText: (index: number, content: string) => void;
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
}

const initialState = {
  date: dayjs(),
  current: 'global',
  integrations: [] as Integrations[],
  selectedIntegrations: [] as SelectedIntegrations[],
  global: [] as Values[],
  internal: [] as Internal[],
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
      const existingIndex = state.selectedIntegrations.findIndex(
        (i) => i.integration.id === integration.id
      );

      if (existingIndex > -1) {
        return {
          selectedIntegrations: state.selectedIntegrations.filter(
            (_, index) => index !== existingIndex
          ),
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
          console.log(i, index);
          acc.push(item);
          if (i === index) {
            acc.push(...value);
          }
          return acc;
        }, []),
      };
    }),
  // Add value after index
  addInternalValue: (index: number, integrationId: string, value: Values[]) =>
    set((state) => {
      const newInternal = state.internal.map((i) => {
        if (i.integration.id === integrationId) {
          const newIntegrationValue = [...i.integrationValue];
          newIntegrationValue.splice(index + 1, 0, ...value);
          return { ...i, integrationValue: newIntegrationValue };
        }
        return i;
      });
      return { internal: newInternal };
    }),
  deleteGlobalValue: (index: number) =>
    set((state) => ({
      global: state.global.filter((_, i) => i !== index),
    })),
  deleteInternalValue: (integrationId: string, index: number) =>
    set((state) => {
      return {
        internal: state.internal.map((i) => {
          if (i.integration.id === integrationId) {
            return {
              ...i,
              integrationValue: i.integrationValue.filter(
                (_, idx) => idx !== index
              ),
            };
          }
          return i;
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
  changeOrderGlobal: (fromIndex: number, toIndex: number) =>
    set((state) => {
      const updatedGlobal = [...state.global];
      const [movedItem] = updatedGlobal.splice(fromIndex, 1);
      updatedGlobal.splice(toIndex, 0, movedItem);
      return { global: updatedGlobal };
    }),
  changeOrderInternal: (
    integrationId: string,
    fromIndex: number,
    toIndex: number
  ) =>
    set((state) => {
      const updatedInternal = state.internal.map((i) => {
        if (i.integration.id === integrationId) {
          const updatedValues = [...i.integrationValue];
          const [movedItem] = updatedValues.splice(fromIndex, 1);
          updatedValues.splice(toIndex, 0, movedItem);
          return { ...i, integrationValue: updatedValues };
        }
        return i;
      });
      return { internal: updatedInternal };
    }),
  setGlobalValueText: (index: number, content: string) =>
    set((state) => ({
      global: state.global.map((item, i) =>
        i === index ? { ...item, content } : item
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
  ) =>
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
    })),
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
}));
