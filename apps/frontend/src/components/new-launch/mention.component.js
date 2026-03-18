'use client';
import { __awaiter } from "tslib";
import React, { useEffect, useImperativeHandle, useState } from 'react';
import { computePosition, flip, shift } from '@floating-ui/dom';
import { posToDOMRect, ReactRenderer } from '@tiptap/react';
// Debounce utility for TipTap
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve) => {
            timeout = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const result = yield func(...args);
                    resolve(result);
                }
                catch (error) {
                    console.error('Debounced function error:', error);
                    resolve([]);
                }
            }), wait);
        });
    };
};
const MentionList = (props) => {
    var _a, _b;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectItem = (index) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };
    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };
    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };
    const enterHandler = () => {
        selectItem(selectedIndex);
    };
    useEffect(() => setSelectedIndex(0), [props.items]);
    useImperativeHandle(props.ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }
            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }
            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }
            return false;
        },
    }));
    if (props === null || props === void 0 ? void 0 : props.stop) {
        return null;
    }
    return (<div className="dropdown-menu bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
      {((_a = props === null || props === void 0 ? void 0 : props.items) === null || _a === void 0 ? void 0 : _a.none) ? (<div className="flex items-center justify-center p-2 text-gray-500">
          We don't have autocomplete for this social media
        </div>) : (props === null || props === void 0 ? void 0 : props.loading) ? (<div className="flex items-center justify-center p-2 text-gray-500">
          Loading...
        </div>) : (props === null || props === void 0 ? void 0 : props.items) ? (props.items.length === 0 ? (<div className="p-2 text-gray-500 text-center">No results found</div>) : ((_b = props === null || props === void 0 ? void 0 : props.items) === null || _b === void 0 ? void 0 : _b.map((item, index) => (<button className={`flex gap-[10px] w-full p-2 text-start rounded hover:bg-gray-100 ${index === selectedIndex ? 'bg-blue-100' : ''}`} key={item.id || index} onClick={() => selectItem(index)}>
              <img src={item.image || '/no-picture.jpg'} alt={item.label} className="w-[30px] h-[30px] rounded-full object-cover"/>
              <div className="flex-1 text-gray-800">{item.label}</div>
            </button>)))) : (<div className="p-2 text-gray-500 text-center">Loading...</div>)}
    </div>);
};
const updatePosition = (editor, element) => {
    const virtualElement = {
        getBoundingClientRect: () => posToDOMRect(editor.view, editor.state.selection.from, editor.state.selection.to),
    };
    computePosition(virtualElement, element, {
        placement: 'bottom-start',
        strategy: 'absolute',
        middleware: [shift(), flip()],
    }).then(({ x, y, strategy }) => {
        element.style.width = 'max-content';
        element.style.position = strategy;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.zIndex = '1000';
    });
};
export const suggestion = (loadList) => {
    // Create debounced version of loadList once
    const debouncedLoadList = debounce(loadList, 500);
    let component;
    return {
        allowSpaces: true,
        items: (_a) => __awaiter(void 0, [_a], void 0, function* ({ query }) {
            if (!query || query.length < 2) {
                component.updateProps({ loading: true, stop: true });
                return [];
            }
            try {
                component.updateProps({ loading: true, stop: false });
                const result = yield debouncedLoadList(query);
                return result;
            }
            catch (error) {
                return [];
            }
        }),
        render: () => {
            let currentQuery = '';
            let isLoadingQuery = false;
            return {
                onBeforeStart: (props) => {
                    component = new ReactRenderer(MentionList, {
                        props: Object.assign(Object.assign({}, props), { loading: true }),
                        editor: props.editor,
                    });
                    component.updateProps(Object.assign(Object.assign({}, props), { loading: true, stop: false }));
                    updatePosition(props.editor, component.element);
                },
                onStart: (props) => {
                    currentQuery = props.query || '';
                    isLoadingQuery = currentQuery.length >= 2;
                    if (!props.clientRect) {
                        return;
                    }
                    component.element.style.position = 'absolute';
                    component.element.style.zIndex = '1000';
                    const container = document.querySelector('.mantine-Paper-root') || document.body;
                    container.appendChild(component.element);
                    updatePosition(props.editor, component.element);
                    component.updateProps(Object.assign(Object.assign({}, props), { loading: true }));
                },
                onUpdate(props) {
                    const newQuery = props.query || '';
                    const queryChanged = newQuery !== currentQuery;
                    currentQuery = newQuery;
                    // If query changed and is valid, we're loading until results come in
                    if (queryChanged && newQuery.length >= 2) {
                        isLoadingQuery = true;
                    }
                    // If we have results, we're no longer loading
                    if (props.items && props.items.length > 0) {
                        isLoadingQuery = false;
                    }
                    // Show loading if we have a valid query but no results yet
                    const shouldShowLoading = isLoadingQuery &&
                        newQuery.length >= 2 &&
                        (!props.items || props.items.length === 0);
                    component.updateProps(Object.assign(Object.assign({}, props), { loading: false, stop: false }));
                    if (!props.clientRect) {
                        return;
                    }
                    updatePosition(props.editor, component.element);
                },
                onKeyDown(props) {
                    var _a;
                    if (props.event.key === 'Escape') {
                        component.destroy();
                        return true;
                    }
                    return (_a = component.ref) === null || _a === void 0 ? void 0 : _a.onKeyDown(props);
                },
                onExit() {
                    component.element.remove();
                    component.destroy();
                },
            };
        },
    };
};
//# sourceMappingURL=mention.component.js.map