import React, { FC, useEffect, useImperativeHandle, useState } from 'react';
import { computePosition, flip, shift } from '@floating-ui/dom';
import { posToDOMRect, ReactRenderer } from '@tiptap/react';
import { timer } from '@gitroom/helpers/utils/timer';

// Debounce utility for TipTap
const debounce = <T extends any[]>(
  func: (...args: any[]) => Promise<T>,
  wait: number
) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]): Promise<T> => {
    clearTimeout(timeout);
    return new Promise((resolve) => {
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          console.error('Debounced function error:', error);
          resolve([] as T);
        }
      }, wait);
    });
  };
};

const MentionList: FC = (props: any) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(props.ref, () => ({
    onKeyDown: ({ event }: { event: any }) => {
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

  if (props?.stop) {
    return null;
  }

  return (
    <div className="dropdown-menu bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
      {props?.items?.none ? (
        <div className="flex items-center justify-center p-2 text-gray-500">
          We don't have autocomplete for this social media
        </div>
      ) : props?.loading ? (
        <div className="flex items-center justify-center p-2 text-gray-500">
          Loading...
        </div>
      ) : props?.items ? (
        props.items.length === 0 ? (
          <div className="p-2 text-gray-500 text-center">No results found</div>
        ) : (
          props.items.map((item: any, index: any) => (
            <button
              className={`flex gap-[10px] w-full p-2 text-left rounded hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
              key={index}
              onClick={() => selectItem(index)}
            >
              <img
                src={item.image}
                alt={item.label}
                className="w-[30px] h-[30px] rounded-full object-cover"
              />
              <div className="flex-1 text-gray-800">{item.label}</div>
            </button>
          ))
        )
      ) : (
        <div className="p-2 text-gray-500 text-center">Loading...</div>
      )}
    </div>
  );
};

const updatePosition = (editor: any, element: any) => {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
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

export const suggestion = (
  loadList: (
    query: string
  ) => Promise<{ image: string; label: string; id: string }[]>
) => {
  // Create debounced version of loadList once
  const debouncedLoadList = debounce(loadList, 500);
  let component: any;

  return {
    items: async ({ query }: { query: string }) => {
      if (!query || query.length < 2) {
        component.updateProps({ loading: true, stop: true });
        return [];
      }

      try {
        component.updateProps({ loading: true, stop: false });
        const result = await debouncedLoadList(query);
        console.log(result);
        return result;
      } catch (error) {
        console.error('Error in suggestion items:', error);
        return [];
      }
    },

    render: () => {
      let currentQuery = '';
      let isLoadingQuery = false;

      return {
        onBeforeStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props: {
              ...props,
              loading: true,
            },
            editor: props.editor,
          });
          component.updateProps({ ...props, loading: true, stop: false });
          updatePosition(props.editor, component.element);
        },
        onStart: (props: any) => {
          currentQuery = props.query || '';
          isLoadingQuery = currentQuery.length >= 2;

          if (!props.clientRect) {
            return;
          }

          component.element.style.position = 'absolute';
          component.element.style.zIndex = '1000';

          const container =
            document.querySelector('.mantine-Paper-root') || document.body;
          container.appendChild(component.element);

          updatePosition(props.editor, component.element);
          component.updateProps({ ...props, loading: true });
        },

        onUpdate(props: any) {
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
          const shouldShowLoading =
            isLoadingQuery &&
            newQuery.length >= 2 &&
            (!props.items || props.items.length === 0);

          component.updateProps({ ...props, loading: false, stop: false });

          if (!props.clientRect) {
            return;
          }

          updatePosition(props.editor, component.element);
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            component.destroy();

            return true;
          }

          return component.ref?.onKeyDown(props);
        },

        onExit() {
          component.element.remove();
          component.destroy();
        },
      };
    },
  };
};
