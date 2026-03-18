'use client';
import { __rest } from "tslib";
import { create } from 'zustand';
import { createRef } from 'react';
import { PostComment } from "./providers/high.order.provider";
import { newDayjs } from "../layout/set.timezone";
const initialState = {
    editor: undefined,
    loaded: true,
    dummy: false,
    comments: true,
    activateExitButton: true,
    date: newDayjs(),
    postComment: PostComment.ALL,
    tags: [],
    totalChars: 0,
    tab: 0,
    isCreateSet: false,
    current: 'global',
    locked: false,
    hide: false,
    integrations: [],
    selectedIntegrations: [],
    global: [],
    internal: [],
    chars: {},
};
export const useLaunchStore = create()((set) => (Object.assign(Object.assign({}, initialState), { setCurrent: (current) => set((state) => ({
        current: current,
    })), addOrRemoveSelectedIntegration: (integration, settings) => {
        set((state) => {
            const existing = state.selectedIntegrations.find((i) => i.integration.id === integration.id);
            if (existing) {
                const selectedList = state.selectedIntegrations.filter((s, index) => s.integration.id !== existing.integration.id);
                return Object.assign(Object.assign(Object.assign({}, (existing.integration.id === state.current
                    ? { current: 'global' }
                    : {})), { loaded: false, selectedIntegrations: selectedList }), (selectedList.length === 0
                    ? {
                        current: 'global',
                        editor: 'normal',
                    }
                    : {}));
            }
            return {
                selectedIntegrations: [
                    ...state.selectedIntegrations,
                    { integration, settings, ref: createRef() },
                ],
            };
        });
    }, addGlobalValue: (index, value) => set((state) => {
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
    addInternalValue: (index, integrationId, value) => set((state) => {
        const integrationIndex = state.internal.findIndex((i) => i.integration.id === integrationId);
        if (integrationIndex === -1) {
            return {
                internal: [
                    ...state.internal,
                    {
                        integration: state.selectedIntegrations.find((i) => i.integration.id === integrationId).integration,
                        integrationValue: value,
                    },
                ],
            };
        }
        const updatedIntegration = state.internal[integrationIndex];
        const newValues = updatedIntegration.integrationValue.reduce((acc, item, i) => {
            acc.push(item);
            if (i === index) {
                acc.push(...value);
            }
            return acc;
        }, []);
        return {
            internal: state.internal.map((i, idx) => idx === integrationIndex ? Object.assign(Object.assign({}, i), { integrationValue: newValues }) : i),
        };
    }), deleteGlobalValue: (index) => set((state) => {
        // Preserve the IDs at their current positions
        const ids = state.global.map((item) => item.id);
        // Get remaining data (content, delay, media) after filtering out deleted index
        const remainingData = state.global
            .filter((_, i) => i !== index)
            .map((_a) => {
            var { id } = _a, rest = __rest(_a, ["id"]);
            return rest;
        });
        // Reconstruct with preserved IDs
        return {
            global: remainingData.map((data, i) => (Object.assign({ id: ids[i] }, data))),
        };
    }), deleteInternalValue: (integrationId, index) => set((state) => {
        return {
            internal: state.internal.map((item) => {
                if (item.integration.id === integrationId) {
                    // Preserve the IDs at their current positions
                    const ids = item.integrationValue.map((v) => v.id);
                    // Get remaining data after filtering out deleted index
                    const remainingData = item.integrationValue
                        .filter((_, idx) => idx !== index)
                        .map((_a) => {
                        var { id } = _a, rest = __rest(_a, ["id"]);
                        return rest;
                    });
                    return Object.assign(Object.assign({}, item), { integrationValue: remainingData.map((data, i) => (Object.assign({ id: ids[i] }, data))) });
                }
                return item;
            }),
        };
    }), addRemoveInternal: (integrationId) => set((state) => {
        const integration = state.selectedIntegrations.find((i) => i.integration.id === integrationId);
        const findIntegrationIndex = state.internal.findIndex((i) => i.integration.id === integrationId);
        if (findIntegrationIndex > -1) {
            return {
                internal: state.internal.filter((i) => i.integration.id !== integrationId),
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
    }), changeOrderGlobal: (index, direction) => set((state) => {
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
    }), changeOrderInternal: (integrationId, index, direction) => set((state) => {
        return {
            internal: state.internal.map((item) => {
                if (item.integration.id === integrationId) {
                    const targetIndex = direction === 'up' ? index - 1 : index + 1;
                    if (targetIndex < 0 || targetIndex >= item.integrationValue.length) {
                        return item;
                    }
                    const currentValue = item.integrationValue[index];
                    const targetValue = item.integrationValue[targetIndex];
                    return Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => {
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
                        }) });
                }
                return item;
            }),
        };
    }), setGlobalValueText: (index, content) => set((state) => ({
        global: state.global.map((item, i) => i === index ? Object.assign(Object.assign({}, item), { content }) : item),
    })), setInternalValueMedia: (integrationId, index, media) => {
        return set((state) => ({
            internal: state.internal.map((item) => item.integration.id === integrationId
                ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index ? Object.assign(Object.assign({}, v), { media }) : v) }) : item),
        }));
    }, setGlobalValueMedia: (index, media) => set((state) => ({
        global: state.global.map((item, i) => i === index ? Object.assign(Object.assign({}, item), { media }) : item),
    })), addGlobalValueMedia: (index, media) => set((state) => ({
        global: state.global.map((item, i) => i === index ? Object.assign(Object.assign({}, item), { media: [...item.media, ...media] }) : item),
    })), removeGlobalValueMedia: (index, mediaIndex) => set((state) => ({
        global: state.global.map((item, i) => i === index
            ? Object.assign(Object.assign({}, item), { media: item.media.filter((_, idx) => idx !== mediaIndex) }) : item),
    })), setInternalValueText: (integrationId, index, content) => {
        set((state) => ({
            internal: state.internal.map((item) => item.integration.id === integrationId
                ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index ? Object.assign(Object.assign({}, v), { content }) : v) }) : item),
        }));
    }, addInternalValueMedia: (integrationId, index, media) => set((state) => ({
        internal: state.internal.map((item) => item.integration.id === integrationId
            ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index ? Object.assign(Object.assign({}, v), { media: [...v.media, ...media] }) : v) }) : item),
    })), removeInternalValueMedia: (integrationId, index, mediaIndex) => set((state) => ({
        internal: state.internal.map((item) => item.integration.id === integrationId
            ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index
                    ? Object.assign(Object.assign({}, v), { media: v.media.filter((_, idx) => idx !== mediaIndex) }) : v) }) : item),
    })), reset: () => set((state) => (Object.assign(Object.assign({}, state), initialState))), setAllIntegrations: (integrations) => set((state) => ({
        integrations: integrations,
    })), setTab: (tab) => set((state) => ({
        tab: tab,
    })), setLocked: (locked) => set((state) => ({
        locked: locked,
    })), setHide: (hide) => set((state) => ({
        hide: hide,
    })), setDate: (date) => set((state) => ({
        date,
    })), setRepeater: (repeater) => set((state) => ({
        repeater,
    })), setTags: (tags) => set((state) => ({
        tags,
    })), setIsCreateSet: (isCreateSet) => set((state) => ({
        isCreateSet,
    })), setSelectedIntegrations: (params) => set((state) => ({
        selectedIntegrations: params.map((p) => ({
            integration: p.selectedIntegrations,
            settings: p.settings,
            ref: createRef(),
        })),
    })), setGlobalValue: (value) => set((state) => ({
        global: value,
    })), setInternalValue: (integrationId, value) => set((state) => ({
        internal: state.internal.map((item) => item.integration.id === integrationId
            ? Object.assign(Object.assign({}, item), { integrationValue: value }) : item),
    })), setTotalChars: (totalChars) => set((state) => ({
        totalChars,
    })), appendInternalValueMedia: (integrationId, index, media) => set((state) => ({
        internal: state.internal.map((item) => item.integration.id === integrationId
            ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index
                    ? Object.assign(Object.assign({}, v), { media: [...((v === null || v === void 0 ? void 0 : v.media) || []), ...media] }) : v) }) : item),
    })), appendGlobalValueMedia: (index, media) => set((state) => ({
        global: state.global.map((item, i) => i === index
            ? Object.assign(Object.assign({}, item), { media: [...((item === null || item === void 0 ? void 0 : item.media) || []), ...media] }) : item),
    })), setPostComment: (postComment) => set((state) => ({
        postComment,
    })), setActivateExitButton: (activateExitButton) => set((state) => ({
        activateExitButton,
    })), setDummy: (dummy) => set((state) => ({
        dummy,
    })), setEditor: (editor) => set((state) => ({
        editor,
    })), setLoaded: (loaded) => set((state) => ({
        loaded,
    })), setChars: (id, chars) => set((state) => ({
        chars: Object.assign(Object.assign({}, state.chars), { [id]: chars }),
    })), setComments: (comments) => set((state) => ({
        comments,
    })), setGlobalDelay: (index, minutes) => set((state) => ({
        global: state.global.map((item, i) => i === index ? Object.assign(Object.assign({}, item), { delay: minutes }) : item),
    })), setInternalDelay: (integrationId, index, minutes) => set((state) => ({
        internal: state.internal.map((item) => item.integration.id === integrationId
            ? Object.assign(Object.assign({}, item), { integrationValue: item.integrationValue.map((v, i) => i === index ? Object.assign(Object.assign({}, v), { delay: minutes }) : v) }) : item),
    })) })));
//# sourceMappingURL=store.js.map